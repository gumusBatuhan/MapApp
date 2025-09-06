#nullable enable
using BasarApp.Application.Abstractions;
using BasarApp.Application.Dtos;
using BasarApp.Application.Validators;
using BasarApp.Domain.Entities;
using BasarApp.Domain.Enums;
using BasarApp.Shared.Contracts;
using BasarApp.Shared.Resources;
using NetTopologySuite.Geometries;

namespace BasarApp.Application.Services.Implementations
{
    /// <summary>
    /// In-memory Feature servisi.
    /// Amaç: DB bağı olmadan demo/test için CRUD + sayfalama sağlamak.
    /// Bağımlılıklar: FeatureDtoValidator, NTS (Geometry), ReaderWriterLockSlim (eşzamanlılık).
    /// </summary>
    public sealed class FeatureStaticService : IFeatureService
    {
        private readonly FeatureDtoValidator _validator;

        // Basit bellek deposu ve eşzamanlılık kontrolü
        private static readonly List<Feature> _store = new();
        private static int _nextId = 1;
        private static readonly ReaderWriterLockSlim _lock = new(LockRecursionPolicy.NoRecursion);

        public FeatureStaticService(FeatureDtoValidator validator)
        {
            _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        }

        /// <summary>
        /// Geometri SRID'ını WGS84 (4326) olarak garanti eder.
        /// NTS/harita tarafında tutarlılık için gerekli.
        /// </summary>
        private static Geometry EnsureWgs84(Geometry g)
        {
            if (g is null) throw new ArgumentNullException(nameof(g));
            if (g.SRID != 4326) g.SRID = 4326; // yalnızca SRID set
            return g;
        }

        /// <summary>Entity → DTO dönüşümü (UI/Api için hafif model).</summary>
        private static FeatureDto ToDto(Feature e) => new()
        {
            Uid      = e.Uid,
            Name     = e.Name,
            Geom     = e.Geom,
            EnumType = (int)e.EnumType
        };

        /// <summary>
        /// DTO > Entity.
        /// Id/Uid üretimi ve SRID ayarı burada yapılır.
        /// </summary>
        private static Feature FromDtoForAdd(FeatureDto d) => new()
        {
            Id       = Interlocked.Increment(ref _nextId), // tekil Id üret
            Uid      = Guid.NewGuid(),                     // DB yok, burada üret
            Name     = d.Name,
            Geom     = EnsureWgs84(d.Geom),
            // Sadece Point ise EnumType anlamlı; değilse None'a düş
            EnumType = d.Geom is Point ? (PointType)d.EnumType : PointType.None
        };

        /// <summary>
        /// Var olan entity'yi DTO değerleriyle günceller.
        /// SRID set edilir; tip Point değilse EnumType None olur.
        /// </summary>
        private static void ApplyUpdate(Feature target, FeatureDto d)
        {
            target.Name = d.Name;
            target.Geom = EnsureWgs84(d.Geom);
            target.EnumType = target.Geom is Point ? (PointType)d.EnumType : PointType.None;
        }

        /// <summary>
        /// Tüm feature'ları Id artan sırayla döndürür.
        /// </summary>
        public Task<ApiResponse<List<FeatureDto>>> GetAllAsync(CancellationToken ct = default)
        {
            _lock.EnterReadLock();
            try
            {
                // Okuma kilidi altında listeden DTO'ya projeksiyon
                var list = _store.OrderBy(x => x.Id).Select(ToDto).ToList();
                return Task.FromResult(ApiResponse<List<FeatureDto>>.SuccessResponse(list, Messages.Success.AllListed));
            }
            finally { _lock.ExitReadLock(); }
        }

        /// <summary>
        /// Sunucu tarafı sayfalama + basit isim araması (q).
        /// </summary>
        public Task<ApiResponse<PagedResult<FeatureDto>>> GetPagedAsync(
            int page, int pageSize, string? q, CancellationToken ct = default)
        {
            // Girdi normalizasyonu
            if (page < 1) page = 1;
            if (pageSize <= 0) pageSize = 20;

            _lock.EnterReadLock();
            try
            {
                IEnumerable<Feature> query = _store;

                // Filtre: ad içinde q geçiyorsa arama yap
                if (!string.IsNullOrWhiteSpace(q))
                {
                    var nq = q.Trim();
                    query = query.Where(x => (x.Name ?? string.Empty)
                        .Contains(nq, StringComparison.CurrentCultureIgnoreCase));
                }

                // Sıralama ve toplam sayıyı ölç
                var ordered = query.OrderBy(x => x.Id);
                var total   = ordered.Count();

                // Sayfalama ve DTO'ya projeksiyon
                var items = ordered
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(ToDto)
                    .ToList();

                // Sonucu PagedResult ile sar
                var result = new PagedResult<FeatureDto>
                {
                    Items      = items,
                    TotalCount = total,
                    Page       = page,
                    PageSize   = pageSize
                };

                // Başarılıysa döndür.
                return Task.FromResult(ApiResponse<PagedResult<FeatureDto>>.SuccessResponse(result, Messages.Success.AllListed));
            }
            finally { _lock.ExitReadLock(); }
        }

        /// <summary>
        /// Uid ile tek kaydı getirir; yoksa NotFound döner.
        /// </summary>
        public Task<ApiResponse<FeatureDto>> GetByUidAsync(Guid uid, CancellationToken ct = default)
        {
            _lock.EnterReadLock();
            try
            {
                // Uid eşleşmesini ara
                var e = _store.FirstOrDefault(x => x.Uid == uid);
                if (e is null)
                    return Task.FromResult(ApiResponse<FeatureDto>.FailResponse(Messages.Error.NotFound));

                // Eşleştiyse DTO olarak döndür
                return Task.FromResult(ApiResponse<FeatureDto>.SuccessResponse(ToDto(e), Messages.Success.Found));
            }
            finally { _lock.ExitReadLock(); }
        }

        /// <summary>
        /// Tek kayıt ekler: önce doğrulama, sonra SRID/Uid set ederek ekleme.
        /// </summary>
        public async Task<ApiResponse<FeatureDto>> AddAsync(FeatureDto dto, CancellationToken ct = default)
        {
            // Alan doğrulama (FluentValidation)
            var val = await _validator.ValidateAsync(dto, ct);
            if (!val.IsValid)
                return ApiResponse<FeatureDto>.FailResponse(val.Errors.First().ErrorMessage);

            // DTO → Entity (Id/Uid/SRID ayarlandı)
            var entity = FromDtoForAdd(dto);

            _lock.EnterWriteLock();
            try
            {
                // Bellek deposuna ekle
                _store.Add(entity);
            }
            finally { _lock.ExitWriteLock(); }

            return ApiResponse<FeatureDto>.SuccessResponse(ToDto(entity), Messages.Success.Added);
        }

        /// <summary>
        /// Toplu ekleme: tüm öğeleri doğrular, biri hatalıysa işlemi keser.
        /// </summary>
        public async Task<ApiResponse<List<FeatureDto>>> AddRangeAsync(List<FeatureDto> dtoList, CancellationToken ct = default)
        {
            if (dtoList is null || dtoList.Count == 0)
                return ApiResponse<List<FeatureDto>>.FailResponse(Messages.Error.EmptyList);

            // Önce hepsini doğrula (kısmi ekleme yok)
            foreach (var d in dtoList)
            {
                var v = await _validator.ValidateAsync(d, ct);
                if (!v.IsValid)
                    return ApiResponse<List<FeatureDto>>.FailResponse(v.Errors.First().ErrorMessage);
            }

            var outDtos = new List<FeatureDto>(dtoList.Count);

            _lock.EnterWriteLock();
            try
            {
                // Hepsini tek tek ekle ve DTO'sunu hazırla
                foreach (var d in dtoList)
                {
                    var e = FromDtoForAdd(d);
                    _store.Add(e);
                    outDtos.Add(ToDto(e));
                }
            }
            finally { _lock.ExitWriteLock(); }

            return ApiResponse<List<FeatureDto>>.SuccessResponse(outDtos, Messages.Success.Added);
        }

        /// <summary>
        /// Uid'e göre günceller: yoksa NotFound.
        /// SRID/EnumType kuralları ApplyUpdate içinde yönetilir.
        /// </summary>
        public async Task<ApiResponse<FeatureDto>> UpdateByUidAsync(Guid uid, FeatureDto dto, CancellationToken ct = default)
        {
            // Alan doğrulama
            var val = await _validator.ValidateAsync(dto, ct);
            if (!val.IsValid)
                return ApiResponse<FeatureDto>.FailResponse(val.Errors.First().ErrorMessage);

            _lock.EnterWriteLock();
            try
            {
                // Hedef kaydı bul
                var e = _store.FirstOrDefault(x => x.Uid == uid);
                if (e is null)
                    return ApiResponse<FeatureDto>.FailResponse(Messages.Error.NotFound);

                // Alanları DTO'dan uygula (SRID/EnumType dahil)
                ApplyUpdate(e, dto);

                // Güncel DTO'yu döndür
                return ApiResponse<FeatureDto>.SuccessResponse(ToDto(e), Messages.Success.Updated);
            }
            finally { _lock.ExitWriteLock(); }
        }

        /// <summary>
        /// Uid'e göre siler; yoksa NotFound.
        /// </summary>
        public Task<ApiResponse<bool>> DeleteByUidAsync(Guid uid, CancellationToken ct = default)
        {
            _lock.EnterWriteLock();
            try
            {
                // Index bul (List.Remove yerine FindIndex ile tek geçiş)
                var idx = _store.FindIndex(x => x.Uid == uid);
                if (idx < 0)
                    return Task.FromResult(ApiResponse<bool>.FailResponse(Messages.Error.NotFound));

                // Sil ve başarıyı bildir
                _store.RemoveAt(idx);
                return Task.FromResult(ApiResponse<bool>.SuccessResponse(true, Messages.Success.Deleted));
            }
            finally { _lock.ExitWriteLock(); }
        }
    }
}

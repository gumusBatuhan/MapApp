#nullable enable
using BasarApp.Application.Abstractions;
using BasarApp.Domain.Entities;
using BasarApp.Domain.Enums;
using BasarApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace BasarApp.Infrastructure.Repositories.Implementations
{
    /// <summary>
    /// EF Core tabanlı Feature repository.
    /// Sorumluluk: Feature Entity için CRUD ve sayfalama; NTS geometrilerinde SRID (4326) tutarlılığı.
    /// </summary>
    public class FeatureEfRepository : IFeatureRepository
    {
        private readonly BasarAppDbContext _db;

        /// <summary>DbContext enjekte edilir.</summary>
        public FeatureEfRepository(BasarAppDbContext db)
        {
            _db = db ?? throw new ArgumentNullException(nameof(db));
        }

        /// <summary>
        /// Geometri SRID'ını WGS84 (4326) yapar; null ise hata fırlatır.
        /// </summary>
        private static Geometry EnsureWgs84(Geometry? g)
        {
            if (g is null) throw new ArgumentNullException(nameof(g));
            if (g.SRID != 4326) g.SRID = 4326;
            return g;
        }


        /// <summary>
        /// Tüm kayıtları getirir.
        /// </summary>
        public async Task<List<Feature>> GetAllAsync(CancellationToken ct = default)
            => await _db.Features.AsNoTracking().ToListAsync(ct);

        /// <summary>
        /// Uid ile tek kaydı getirir; yoksa null.
        /// </summary>
        public async Task<Feature?> GetByUidAsync(Guid uid, CancellationToken ct = default)
            => await _db.Features.AsNoTracking().FirstOrDefaultAsync(f => f.Uid == uid, ct);

        /// <summary>
        /// Tek kayıt ekler; geometri SRID’ını 4326 yapar; Point değilse EnumType=None.
        /// DB SaveChanges sonrası entity’yi yeniden yükler (Uid DB tarafından üretildiği için.)
        /// </summary>
        public async Task<Feature> AddAsync(Feature entity, CancellationToken ct = default)
        {
            // Girdiyi doğrular
            if (entity is null) throw new ArgumentNullException(nameof(entity));

            // Geometriyi normalize et (SRID=4326)
            entity.Geom = EnsureWgs84(entity.Geom);

            // Kural: Point değilse EnumType None
            if (entity.Geom is not Point)
                entity.EnumType = PointType.None;

            // Ekle ve kaydet
            await _db.Features.AddAsync(entity, ct);
            await _db.SaveChangesAsync(ct);

            // DB üretilen alanları almak için reload
            await _db.Entry(entity).ReloadAsync(ct);
            return entity;
        }

        /// <summary>
        /// Toplu ekleme; her öğede SRID=4326 ve Point değilse EnumType=None uygulanır.
        /// </summary>
        public async Task AddRangeAsync(List<Feature> entities, CancellationToken ct = default)
        {
            // Girdiyi doğrular
            if (entities is null) throw new ArgumentNullException(nameof(entities));

            // Her entity için normalize et
            foreach (var e in entities)
            {
                e.Geom = EnsureWgs84(e.Geom);
                if (e.Geom is not Point)
                    e.EnumType = PointType.None;
            }

            // Ekle ve kaydet
            await _db.Features.AddRangeAsync(entities, ct);
            await _db.SaveChangesAsync(ct);
        }

        /// <summary>
        /// Uid'e göre günceller; yoksa null döner.
        /// SRID normalize edilir; Point değilse EnumType=None yazılır.
        /// </summary>
        public async Task<Feature?> UpdateByUidAsync(Guid uid, Feature entity, CancellationToken ct = default)
        {
            // Girdiyi doğrular
            if (entity is null) throw new ArgumentNullException(nameof(entity));

            // Mevcut kaydı bul
            var current = await _db.Features.FirstOrDefaultAsync(f => f.Uid == uid, ct);
            if (current is null) return null;

            // Alanları güncelle
            current.Name = entity.Name;
            current.Geom = EnsureWgs84(entity.Geom);
            current.EnumType = current.Geom is Point ? entity.EnumType : PointType.None;

            // Kaydet ve güncel entity'yi döndür
            await _db.SaveChangesAsync(ct);
            return current;
        }

        /// <summary>
        /// Uid'e göre siler; yoksa false.
        /// </summary>
        public async Task<bool> DeleteByUidAsync(Guid uid, CancellationToken ct = default)
        {
            // Mevcut kaydı bul
            var current = await _db.Features.FirstOrDefaultAsync(f => f.Uid == uid, ct);
            if (current is null) return false;

            // Sil ve kaydet
            _db.Features.Remove(current);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        /// <summary>
        /// Uid var mı kontrol eder.
        /// </summary>
        public Task<bool> ExistsAsync(Guid uid, CancellationToken ct = default)
            => _db.Features.AnyAsync(f => f.Uid == uid, ct);


        /// <summary>
        /// Id ile tek kaydı getirir; yoksa null.
        /// </summary>
        public async Task<Feature?> GetByIdAsync(int id, CancellationToken ct = default)
            => await _db.Features.AsNoTracking().FirstOrDefaultAsync(f => f.Id == id, ct);

        /// <summary>
        /// Id'den Uid döndürür; yoksa null.
        /// </summary>
        public async Task<Guid?> GetUidByIdAsync(int id, CancellationToken ct = default)
            => await _db.Features
                .Where(f => f.Id == id)
                .Select(f => (Guid?)f.Uid)
                .FirstOrDefaultAsync(ct);


        /// <summary>
        /// Arama (q) destekli sayfalama. Page/pageSize normalize edilir, ILIKE ile case-insensitive arama yapılır.
        /// </summary>
        public async Task<(List<Feature> Items, int TotalCount)> GetPagedAsync(
            int page,
            int pageSize,
            string? q = null,
            CancellationToken ct = default)
        {
            // Girdi normalizasyonu
            if (page < 1) page = 1;
            if (pageSize <= 0) pageSize = 20;

            // Temel sorguyu oluştur
            var query = _db.Features.AsNoTracking();

            // q varsa case-insensitive arama
            if (!string.IsNullOrWhiteSpace(q))
            {
                var pattern = $"%{q.Trim()}%";
                query = query.Where(f => EF.Functions.ILike(f.Name, pattern));
            }

            // Sırala
            query = query.OrderBy(f => f.Id);

            // Toplam sayıyı al
            var total = await query.CountAsync(ct);

            // Sayfalı öğeleri çek
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);

            return (items, total);
        }
    }
}

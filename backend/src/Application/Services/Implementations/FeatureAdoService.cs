#nullable enable
using BasarApp.Application.Dtos;
using BasarApp.Domain.Entities;
using BasarApp.Domain.Enums;
using BasarApp.Shared.Resources;
using BasarApp.Application.Abstractions;
using BasarApp.Shared.Contracts;
using BasarApp.Application.Validators;
using Microsoft.Extensions.DependencyInjection;
using NetTopologySuite.Geometries;

namespace BasarApp.Application.Services.Implementations
{
    /// <summary>
    /// ADO tabanlı IFeatureService implementasyonu.
    /// Sorumluluk: UoW+Repo ile transaction yönetimi; FE yalnızca Uid ile çalışır.
    /// </summary>
    public class FeatureAdoService : IFeatureService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly FeatureDtoValidator _validator;

        /// <summary>
        /// "ado" etiketiyle çözülmüş IUnitOfWork (ADO implementasyonu) ve validator enjekte edilir.
        /// </summary>
        public FeatureAdoService([FromKeyedServices("ado")] IUnitOfWork unitOfWork, FeatureDtoValidator validator)
        {
            _unitOfWork = unitOfWork;
            _validator  = validator;
        }

        /// <summary>
        /// Tüm feature'ları getirir; repo sonuçlarını DTO'ya dönüştürür.
        /// </summary>
        public async Task<ApiResponse<List<FeatureDto>>> GetAllAsync(CancellationToken ct)
        {
            try
            {
                var entities = await _unitOfWork.FeatureRepository.GetAllAsync(ct);

                // Entity > DTO projeksiyonu
                var dtos = entities
                    .Select(e => new FeatureDto
                    {
                        Uid      = e.Uid,
                        Name     = e.Name,
                        Geom     = e.Geom,
                        EnumType = (int)e.EnumType
                    })
                    .ToList();

                // Başarılıysa DTO listesini döndür
                return ApiResponse<List<FeatureDto>>.SuccessResponse(dtos, Messages.Success.AllListed);
            }
            catch (Exception ex)
            {
                // Başarılı değilse hata mesajıyla döndür
                return ApiResponse<List<FeatureDto>>.FailResponse(Messages.Error.UnexpectedWith(ex));
            }
        }

        /// <summary>
        /// Arama (q) destekli server-side sayfalama. Page ve pageSize normalize edilir.
        /// </summary>
        public async Task<ApiResponse<PagedResult<FeatureDto>>> GetPagedAsync(
            int page, int pageSize, string? q, CancellationToken ct)
        {
            try
            {
                // Girdi normalizasyonu
                if (page < 1) page = 1;
                if (pageSize <= 0) pageSize = 20;

                // Repo’dan veriyi ve toplam sayıyı al
                var (items, total) = await _unitOfWork.FeatureRepository
                    .GetPagedAsync(page, pageSize, q, ct);

                // Entity > DTO projeksiyonu
                var dtoItems = items.Select(e => new FeatureDto
                {
                    Uid      = e.Uid,
                    Name     = e.Name,
                    Geom     = e.Geom,
                    EnumType = (int)e.EnumType
                }).ToList();

                // Sonucu PagedResult içine sar
                var paged = new PagedResult<FeatureDto>
                {
                    Items      = dtoItems,
                    TotalCount = total,
                    Page       = page,
                    PageSize   = pageSize
                };

                // Başarılıysa döndür
                return ApiResponse<PagedResult<FeatureDto>>.SuccessResponse(paged, Messages.Success.AllListed);
            }
            catch (Exception ex)
            {
                // Başarılı değilse hata mesajıyla döndür
                return ApiResponse<PagedResult<FeatureDto>>.FailResponse(Messages.Error.UnexpectedWith(ex));
            }
        }

        /// <summary>
        /// Uid ile tek kaydı getirir; yoksa NotFound döndürür.
        /// </summary>
        public async Task<ApiResponse<FeatureDto>> GetByUidAsync(Guid uid, CancellationToken ct)
        {
            // Repo’dan kaydı al
            var entity = await _unitOfWork.FeatureRepository.GetByUidAsync(uid, ct);

            // Kayıt yoksa NotFound döndür
            if (entity is null)
                return ApiResponse<FeatureDto>.FailResponse(Messages.Error.NotFound);

            // Entity > DTO
            var dto = new FeatureDto
            {
                Uid      = entity.Uid,
                Name     = entity.Name,
                Geom     = entity.Geom,
                EnumType = (int)entity.EnumType
            };
            return ApiResponse<FeatureDto>.SuccessResponse(dto, Messages.Success.Found);
        }

        /// <summary>
        /// Tek kayıt ekler: DTO doğrulanır, Entity oluşturulur, transaction içinde kaydedilir.
        /// Uid DB tarafından üretilir.
        /// </summary>
        public async Task<ApiResponse<FeatureDto>> AddAsync(FeatureDto dto, CancellationToken ct)
        {
            // Alan doğrulama
            var validation = await _validator.ValidateAsync(dto, ct);
            if (!validation.IsValid)
                return ApiResponse<FeatureDto>.FailResponse(validation.Errors.First().ErrorMessage);

            // DTO > Entity (Uid kodda set edilmez; DB üretir)
            var entity = new Feature
            {
                Name     = dto.Name,
                Geom     = dto.Geom, // SRID/konum doğruluğu DbContext/ADO tarafında ele alınır
                EnumType = dto.Geom is Point ? (PointType)dto.EnumType : PointType.None
            };

            try
            {
                // Transaction başlat
                await _unitOfWork.BeginTransactionAsync(ct);

                // ADO repo AddAsync DB’nin ürettiği Uid’i RETURNING ile geri döner
                var saved = await _unitOfWork.FeatureRepository.AddAsync(entity, ct);

                // Transaction onayla
                await _unitOfWork.CommitAsync(ct);

                // Entity > DTO
                var outDto = new FeatureDto
                {
                    Uid      = saved.Uid,
                    Name     = saved.Name,
                    Geom     = saved.Geom,
                    EnumType = (int)saved.EnumType
                };

                // Başarıyla DTO'yu döndür
                return ApiResponse<FeatureDto>.SuccessResponse(outDto, Messages.Success.Added);
            }
            catch (Exception ex)
            {
                // Hata durumunda transaction geri alınır
                await _unitOfWork.RollbackAsync(ct);

                // Hata mesajıyla başarısız yanıt döndür
                return ApiResponse<FeatureDto>.FailResponse(Messages.Error.UnexpectedWith(ex));
            }
        }

        /// <summary>
        /// Toplu ekleme: tüm öğeler validasyondan geçmeli; transaction içinde ADO AddAsync ile tek tek eklenir.
        /// Uid’ler DB tarafından üretilir.
        /// </summary>
        public async Task<ApiResponse<List<FeatureDto>>> AddRangeAsync(List<FeatureDto> dtoList, CancellationToken ct)
        {
            // Boş liste kontrolü
            if (dtoList is null || dtoList.Count == 0)
                return ApiResponse<List<FeatureDto>>.FailResponse(Messages.Error.EmptyList);

            // Hepsini önceden doğrula
            foreach (var dto in dtoList)
            {
                // Alan doğrulama
                var validation = await _validator.ValidateAsync(dto, ct);

                // İlk hatada başarısız yanıt döndür
                if (!validation.IsValid)
                    return ApiResponse<List<FeatureDto>>.FailResponse(validation.Errors.First().ErrorMessage);
            }

            try
            {
                // Transaction başlat
                await _unitOfWork.BeginTransactionAsync(ct);

                // ADO tarafında UID'lerin kesin dolması için tek tek AddAsync ile ilerle
                var outDtos = new List<FeatureDto>(dtoList.Count);
                foreach (var d in dtoList)
                {
                    var saved = await _unitOfWork.FeatureRepository.AddAsync(new Feature
                    {
                        Name     = d.Name,
                        Geom     = d.Geom,
                        EnumType = d.Geom is Point ? (PointType)d.EnumType : PointType.None
                    }, ct);

                    outDtos.Add(new FeatureDto
                    {
                        Uid      = saved.Uid,
                        Name     = saved.Name,
                        Geom     = saved.Geom,
                        EnumType = (int)saved.EnumType
                    });
                }

                // Transaction onayla
                await _unitOfWork.CommitAsync(ct);

                // Başarıyla DTO listesini döndür
                return ApiResponse<List<FeatureDto>>.SuccessResponse(outDtos, Messages.Success.Added);
            }
            catch (Exception ex)
            {
                // Hata durumunda transaction geri alınır
                await _unitOfWork.RollbackAsync(ct);
                return ApiResponse<List<FeatureDto>>.FailResponse(Messages.Error.UnexpectedWith(ex));
            }
        }

        /// <summary>
        /// Uid'e göre günceller. Kayıt yoksa NotFound.
        /// Transaction içinde UpdateByUidAsync çağrılır.
        /// </summary>
        public async Task<ApiResponse<FeatureDto>> UpdateByUidAsync(Guid uid, FeatureDto dto, CancellationToken ct)
        {
            // Alan doğrulama
            var validation = await _validator.ValidateAsync(dto, ct);
            if (!validation.IsValid)
                return ApiResponse<FeatureDto>.FailResponse(validation.Errors.First().ErrorMessage);

            try
            {
                // Transaction başlat
                await _unitOfWork.BeginTransactionAsync(ct);

                // ADO repo doğrudan UID ile günceller ve güncel kaydı döndürür
                var saved = await _unitOfWork.FeatureRepository.UpdateByUidAsync(uid, new Feature
                {
                    Name     = dto.Name,
                    Geom     = dto.Geom,
                    EnumType = dto.Geom is Point ? (PointType)dto.EnumType : PointType.None
                }, ct);

                // Transaction onayla
                await _unitOfWork.CommitAsync(ct);

                // Kayıt bulunamazsa NotFound döndür
                if (saved is null)
                    return ApiResponse<FeatureDto>.FailResponse(Messages.Error.NotFound);

                // Entity > DTO dönüşümü
                var outDto = new FeatureDto
                {
                    Uid      = saved.Uid,
                    Name     = saved.Name,
                    Geom     = saved.Geom,
                    EnumType = (int)saved.EnumType
                };
                return ApiResponse<FeatureDto>.SuccessResponse(outDto, Messages.Success.Updated);
            }
            catch (Exception ex)
            {
                // Hata durumunda transaction geri alınır
                await _unitOfWork.RollbackAsync(ct);
                return ApiResponse<FeatureDto>.FailResponse(Messages.Error.UnexpectedWith(ex));
            }
        }

        /// <summary>
        /// Uid'e göre siler. Yoksa NotFound. Transaction ile garanti altına alınır.
        /// </summary>
        public async Task<ApiResponse<bool>> DeleteByUidAsync(Guid uid, CancellationToken ct)
        {
            // Hızlı varlık kontrolü (gereksiz transaction açmamak için)
            var exists = await _unitOfWork.FeatureRepository.ExistsAsync(uid, ct);

            // Kayıt yoksa NotFound döndür
            if (!exists)
                return ApiResponse<bool>.FailResponse(Messages.Error.NotFound);

            try
            {
                // Transaction başlat
                await _unitOfWork.BeginTransactionAsync(ct);

                // Silme işlemi
                var ok = await _unitOfWork.FeatureRepository.DeleteByUidAsync(uid, ct);

                // Transaction onayla
                await _unitOfWork.CommitAsync(ct);

                if (!ok)

                    // Silme başarısızsa NotFound döndür
                    return ApiResponse<bool>.FailResponse(Messages.Error.NotFound);

                // Başarılıysa silindi yanıtı döndür
                return ApiResponse<bool>.SuccessResponse(true, Messages.Success.Deleted);
            }
            catch (Exception ex)
            {
                // Hata durumunda transaction geri alınır
                await _unitOfWork.RollbackAsync(ct);
                return ApiResponse<bool>.FailResponse(Messages.Error.UnexpectedWith(ex));
            }
        }
    }
}

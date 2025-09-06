#nullable enable
using BasarApp.Application.Dtos;
using BasarApp.Shared.Contracts;

namespace BasarApp.Application.Abstractions
{
    /// <summary>
    /// Uygulama servis katmanı: Feature için CRUD ve sayfalama işlemleri.
    /// ApiResponse sarmalayıcıyla DTO döner.
    /// </summary>
    public interface IFeatureService
    {
        // Tüm feature'ları listeler.
        Task<ApiResponse<List<FeatureDto>>> GetAllAsync(CancellationToken ct = default);

        // Uid ile tek kaydı getirir.
        Task<ApiResponse<FeatureDto>> GetByUidAsync(Guid uid, CancellationToken ct = default);

        // Tek kayıt ekler.
        Task<ApiResponse<FeatureDto>> AddAsync(FeatureDto dto, CancellationToken ct = default);

        // Toplu ekleme yapar.
        Task<ApiResponse<List<FeatureDto>>> AddRangeAsync(List<FeatureDto> dtoList, CancellationToken ct = default);

        // Uid'e göre kaydı günceller.
        Task<ApiResponse<FeatureDto>> UpdateByUidAsync(Guid uid, FeatureDto dto, CancellationToken ct = default);

        // Uid'e göre kaydı siler.
        Task<ApiResponse<bool>> DeleteByUidAsync(Guid uid, CancellationToken ct = default);

        // Arama destekli sunucu tarafı sayfalama (q opsiyonel filtre).
        Task<ApiResponse<PagedResult<FeatureDto>>> GetPagedAsync(
            int page,
            int pageSize,
            string? q,
            CancellationToken ct);
    }
}

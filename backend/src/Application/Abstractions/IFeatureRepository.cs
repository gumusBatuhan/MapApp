#nullable enable
using BasarApp.Domain.Entities;

namespace BasarApp.Application.Abstractions
{
    /// <summary>
    /// Veri erişim katmanı: Feature Entity için CRUD ve sayfalama.
    /// EF/ADO gibi implementasyonlar bu sözleşmeyi uygular.
    /// </summary>
    public interface IFeatureRepository
    {
        // Tüm kayıtları getirir.
        Task<List<Feature>> GetAllAsync(CancellationToken ct = default);

        // Uid ile tek kayıt getirir.
        Task<Feature?> GetByUidAsync(Guid uid, CancellationToken ct = default);

        // Tek kayıt ekler.
        Task<Feature> AddAsync(Feature entity, CancellationToken ct = default);

        // Toplu ekleme yapar.
        Task AddRangeAsync(List<Feature> entities, CancellationToken ct = default);

        // Uid'e göre günceller (bulunamazsa null).
        Task<Feature?> UpdateByUidAsync(Guid uid, Feature entity, CancellationToken ct = default);

        // Uid'e göre siler (başarı true/false).
        Task<bool> DeleteByUidAsync(Guid uid, CancellationToken ct = default);

        // Uid var mı kontrol eder.
        Task<bool> ExistsAsync(Guid uid, CancellationToken ct = default);

        // ID ile tek kayıt getirir (admin/diagnostic).
        Task<Feature?> GetByIdAsync(int id, CancellationToken ct = default);

        // ID'den Uid döndürür (admin/diagnostic).
        Task<Guid?> GetUidByIdAsync(int id, CancellationToken ct = default);

        // Arama destekli sayfalama; toplam kayıt sayısıyla birlikte döner.
        Task<(List<Feature> Items, int TotalCount)> GetPagedAsync(
            int page,
            int pageSize,
            string? q,
            CancellationToken ct = default);
    }
}

using BasarApp.Entities;

namespace BasarApp.Repositories.Interfaces
{
    public interface IFeatureRepository
    {
        Task<Feature> GetByIdAsync(int id, CancellationToken ct);
        Task<List<Feature>> GetAllAsync(CancellationToken ct);
        Task AddAsync(Feature entity, CancellationToken ct);
        Task AddRangeAsync(List<Feature> entities, CancellationToken ct);
        Task UpdateAsync(Feature entity, CancellationToken ct);
        Task DeleteAsync(int id, CancellationToken ct);
        Task<bool> ExistsAsync(int id, CancellationToken ct);
    }

}

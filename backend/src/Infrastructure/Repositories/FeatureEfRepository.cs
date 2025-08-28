using BasarApp.Domain.Entities;
using BasarApp.Application.Abstractions;
using BasarApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BasarApp.Infrastructure.Repositories
{
    /// <summary>
    /// IFeatureRepository'nin EF Core implementasyonu.
    /// UoW, SaveChanges ve transaction'ı yönetecek; burada SaveChanges çağrısı YOK.
    /// </summary>
    public class FeatureEfRepository : IFeatureRepository
    {
        private readonly BasarAppDbContext _db;

        public FeatureEfRepository(BasarAppDbContext db)
        {
            _db = db;
        }

        public async Task<Feature> GetByIdAsync(int id, CancellationToken ct)
            => await _db.Features.FirstOrDefaultAsync(f => f.Id == id, ct);

        public async Task<List<Feature>> GetAllAsync(CancellationToken ct)
            => await _db.Features.AsNoTracking().OrderBy(f => f.Name).ToListAsync(ct);

        public Task AddAsync(Feature entity, CancellationToken ct)
        {
            _db.Features.Add(entity);
            return Task.CompletedTask;
        }

        public Task AddRangeAsync(List<Feature> entities, CancellationToken ct)
        {
            _db.Features.AddRange(entities);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(Feature entity, CancellationToken ct)
        {
            _db.Features.Update(entity);
            return Task.CompletedTask;
        }

        public async Task DeleteAsync(int id, CancellationToken ct)
        {
            var stub = new Feature { Id = id };
            _db.Attach(stub);
            _db.Remove(stub);
            await Task.CompletedTask;
        }

        public async Task<bool> ExistsAsync(int id, CancellationToken ct)
            => await _db.Features.AnyAsync(f => f.Id == id, ct);
    }
}

using BasarApp.Application.Abstractions;
using Microsoft.EntityFrameworkCore.Storage;
using BasarApp.Infrastructure.Persistence;
using BasarApp.Infrastructure.Repositories;

namespace BasarApp.Infrastructure.Repositories.Implementations
{
    /// <summary>
    /// IUnitOfWork'ün EF Core sürümü.
    /// BeginTransaction -> DbContextTransaction başlatır
    /// Commit -> SaveChanges + Commit
    /// Rollback -> Rollback
    /// </summary>
    public class EfUnitOfWork : IUnitOfWork, IAsyncDisposable
{
    private readonly BasarAppDbContext _db;
    private IDbContextTransaction _tx;

    public IFeatureRepository FeatureRepository { get; }

    public EfUnitOfWork(BasarAppDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        FeatureRepository = new FeatureEfRepository(_db);
    }

    public async Task BeginTransactionAsync(CancellationToken ct)
    {
        if (_tx != null)
            throw new InvalidOperationException("Transaction zaten başlatıldı.");
        _tx = await _db.Database.BeginTransactionAsync(ct);
    }

    public async Task CommitAsync(CancellationToken ct)
    {
        if (_tx == null)
            throw new InvalidOperationException("Transaction yok.");

        await _db.SaveChangesAsync(ct);
        await _tx.CommitAsync(ct);
        await _tx.DisposeAsync();
        _tx = null;
    }

    public async Task RollbackAsync(CancellationToken ct)
    {
        if (_tx == null)
            throw new InvalidOperationException("Transaction yok.");

        await _tx.RollbackAsync(ct);
        await _tx.DisposeAsync();
        _tx = null;
    }

    public async ValueTask DisposeAsync()
    {
        if (_tx != null)
        {
            await _tx.DisposeAsync();
            _tx = null;
        }
        await _db.DisposeAsync();
    }
}
}

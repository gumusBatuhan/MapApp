namespace BasarApp.Repositories.Interfaces
{
    public interface IUnitOfWork
    {
        IFeatureRepository FeatureRepository { get; }

        Task BeginTransactionAsync(CancellationToken ct);
        Task CommitAsync(CancellationToken ct);
        Task RollbackAsync(CancellationToken ct);
    }
}

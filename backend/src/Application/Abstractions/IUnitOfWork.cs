#nullable enable
namespace BasarApp.Application.Abstractions
{
    /// <summary>
    /// İşlem (transaction) yaşam döngüsü ve repo erişimi için birim.
    /// EF/ADO implementasyonları transaction sınırlarını burada yönetir.
    /// </summary>
    public interface IUnitOfWork : IAsyncDisposable
    {
        // Feature repo erişimi.
        IFeatureRepository FeatureRepository { get; }

        // Transaction başlatır.
        Task BeginTransactionAsync(CancellationToken ct = default);

        // Transaction'ı onaylar.
        Task CommitAsync(CancellationToken ct = default);

        // Transaction'ı geri alır.
        Task RollbackAsync(CancellationToken ct = default);
    }
}

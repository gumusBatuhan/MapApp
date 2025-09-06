#nullable enable
using BasarApp.Application.Abstractions;
using BasarApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Storage;

namespace BasarApp.Infrastructure.Repositories.Implementations
{
    /// <summary>
    /// EF Core Unit of Work.
    /// Sorumluluk: Transaction yaşam döngüsü ve repository erişimi.
    /// Not: Repo'lar SaveChangesAsync çağırdığı için burada Commit yalnızca transaction commit eder.
    /// </summary>
    public class EfUnitOfWork : IUnitOfWork, IAsyncDisposable
    {
        private readonly BasarAppDbContext _db;
        private IDbContextTransaction? _tx;

        /// <summary>Feature repository erişimi (EF implementasyonu).</summary>
        public IFeatureRepository FeatureRepository { get; }

        /// <summary>
        /// DbContext enjekte edilir ve repository örneği oluşturulur.
        /// </summary>
        public EfUnitOfWork(BasarAppDbContext db)
        {
            _db = db ?? throw new ArgumentNullException(nameof(db));
            FeatureRepository = new FeatureEfRepository(_db);
        }

        /// <summary>
        /// Transaction başlatır; halihazırda bir transaction varsa hata fırlatır.
        /// </summary>
        public async Task BeginTransactionAsync(CancellationToken ct)
        {
            // Var olan bir transaction'ı engelle
            if (_tx is not null)
                throw new InvalidOperationException("Transaction zaten başlatıldı.");

            // Yeni transaction oluştur
            _tx = await _db.Database.BeginTransactionAsync(ct);
        }

        /// <summary>
        /// Aktif transaction'ı commit eder ve serbest bırakır.
        /// </summary>
        public async Task CommitAsync(CancellationToken ct)
        {
            // Transaction kontrolü
            if (_tx is null)
                throw new InvalidOperationException("Transaction yok.");

            // Repo içinde SaveChanges çağrıldığı için burada yalnızca commit edilir
            await _tx.CommitAsync(ct);

            // Kaynakları serbest bırak ve referansı sıfırla
            await _tx.DisposeAsync();
            _tx = null;
        }

        /// <summary>
        /// Aktif transaction'ı geri alır (rollback) ve serbest bırakır.
        /// </summary>
        public async Task RollbackAsync(CancellationToken ct)
        {
            // Transaction kontrolü
            if (_tx is null)
                throw new InvalidOperationException("Transaction yok.");

            // Geri al ve kaynakları serbest bırak
            await _tx.RollbackAsync(ct);
            await _tx.DisposeAsync();
            _tx = null;
        }

        /// <summary>
        /// UoW yaşam döngüsü sonunda kaynakları serbest bırakır.
        /// </summary>
        public async ValueTask DisposeAsync()
        {
            // Açık transaction varsa kapat
            if (_tx is not null)
            {
                await _tx.DisposeAsync();
                _tx = null;
            }

            // DbContext'i kapat
            await _db.DisposeAsync();
        }
    }
}

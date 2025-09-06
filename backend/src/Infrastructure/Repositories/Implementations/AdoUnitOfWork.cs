#nullable enable
using BasarApp.Application.Abstractions;
using Npgsql;

namespace BasarApp.Infrastructure.Repositories.Implementations
{
    /// <summary>
    /// ADO.NET Unit of Work.
    /// Sorumluluk: Npgsql bağlantısı/transaction yaşam döngüsü ve repo'lara iletimi.
    /// Not: Repo, aktif transaction'ı SetTransaction ile alır.
    /// </summary>
    public class AdoUnitOfWork : IUnitOfWork, IAsyncDisposable
    {
        private readonly NpgsqlDataSource _dataSource;
        private readonly NpgsqlConnection _connection;
        private NpgsqlTransaction? _transaction;

        /// <summary>Feature repository erişimi (ADO implementasyonu).</summary>
        public IFeatureRepository FeatureRepository { get; }

        /// <summary>
        /// DataSource enjekte edilir; bağlantı açılır; repo bağlantıyla oluşturulur.
        /// </summary>
        public AdoUnitOfWork(NpgsqlDataSource dataSource)
        {
            _dataSource  = dataSource ?? throw new ArgumentNullException(nameof(dataSource));

            // Bağlantıyı açıyoruz
            _connection  = _dataSource.OpenConnection();
            
            // Başlangıçta transaction yok; repo'ya yalnızca connection veriyoruz.
            FeatureRepository = new FeatureAdoRepository(_connection);
        }

        /// <summary>
        /// Transaction başlatır; repo'ya aktif transaction'ı bildirir.
        /// </summary>
        public async Task BeginTransactionAsync(CancellationToken ct)
        {
            if (_transaction is not null)
                throw new InvalidOperationException("Transaction zaten başlatıldı.");

            _transaction = await _connection.BeginTransactionAsync(ct);
            // Repo'ya aktif transaction'ı bildir
            (FeatureRepository as FeatureAdoRepository)!.SetTransaction(_transaction);
        }

        /// <summary>
        /// Aktif transaction'ı commit eder; repo'yu transactionsız moda alır.
        /// </summary>
        public async Task CommitAsync(CancellationToken ct)
        {
            if (_transaction is null)
                throw new InvalidOperationException("Transaction yok.");

            await _transaction.CommitAsync(ct);
            await _transaction.DisposeAsync();
            _transaction = null;

            // Repo'yu transactionsız moda al
            (FeatureRepository as FeatureAdoRepository)!.SetTransaction((NpgsqlTransaction?)null);
        }

        /// <summary>
        /// Aktif transaction'ı rollback eder; repo'yu transactionsız moda alır.
        /// </summary>
        public async Task RollbackAsync(CancellationToken ct)
        {
            if (_transaction is null)
                throw new InvalidOperationException("Transaction yok.");

            await _transaction.RollbackAsync(ct);
            await _transaction.DisposeAsync();
            _transaction = null;

            (FeatureRepository as FeatureAdoRepository)!.SetTransaction((NpgsqlTransaction?)null);
        }

        /// <summary>
        /// UoW yaşam döngüsü sonunda bağlantı ve olası transaction'ı serbest bırakır.
        /// </summary>
        public async ValueTask DisposeAsync()
        {
            if (_transaction is not null)
            {
                await _transaction.DisposeAsync();
                _transaction = null;
            }

            await _connection.DisposeAsync();
            // DataSource DI'da yaşamaya devam eder; burada dispose etmiyoruz.
        }
    }
}

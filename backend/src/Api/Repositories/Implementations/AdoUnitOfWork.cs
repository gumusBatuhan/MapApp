using BasarApp.Repositories.Interfaces;
using Npgsql;

namespace BasarApp.Repositories.Implementations
{
    public class AdoUnitOfWork : IUnitOfWork, IAsyncDisposable
    {
        private readonly NpgsqlDataSource _dataSource;
        private readonly NpgsqlConnection _connection;
        private NpgsqlTransaction _transaction;

        public IFeatureRepository FeatureRepository { get; }

        public AdoUnitOfWork(NpgsqlDataSource dataSource)
        {
            _dataSource = dataSource ?? throw new ArgumentNullException(nameof(dataSource));
            _connection = _dataSource.OpenConnection();
            FeatureRepository = new FeatureAdoRepository(_connection, _transaction!);
        }

        public async Task BeginTransactionAsync(CancellationToken ct)
        {
            if (_transaction != null)
                throw new InvalidOperationException("Transaction zaten başlatıldı.");

            _transaction = await _connection.BeginTransactionAsync(ct);
            (FeatureRepository as FeatureAdoRepository)!.SetTransaction(_transaction);
        }

        public async Task CommitAsync(CancellationToken ct)
        {
            if (_transaction == null)
                throw new InvalidOperationException("Transaction yok.");

            await _transaction.CommitAsync(ct);
            await _transaction.DisposeAsync();
            _transaction = null;
            (FeatureRepository as FeatureAdoRepository)!.SetTransaction(null);
        }

        public async Task RollbackAsync(CancellationToken ct)
        {
            if (_transaction == null)
                throw new InvalidOperationException("Transaction yok.");

            await _transaction.RollbackAsync(ct);
            await _transaction.DisposeAsync();
            _transaction = null;
            (FeatureRepository as FeatureAdoRepository)!.SetTransaction(null);
        }

        public async ValueTask DisposeAsync()
        {
            if (_transaction != null)
            {
                await _transaction.DisposeAsync();
                _transaction = null;
            }

            if (_connection != null)
            {
                await _connection.DisposeAsync();
            }
        }
    }
}

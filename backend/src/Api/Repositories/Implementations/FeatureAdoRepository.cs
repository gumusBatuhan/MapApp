using BasarApp.Domain.Entities;
using Npgsql;
using NetTopologySuite.Geometries;
using BasarApp.Repositories.Interfaces;

namespace BasarApp.Repositories.Implementations
{
    public class FeatureAdoRepository : IFeatureRepository
    {
        private readonly NpgsqlConnection _connection;
        private NpgsqlTransaction _transaction; // transaction null olabilir

        public FeatureAdoRepository(NpgsqlConnection connection, NpgsqlTransaction transaction)
        {
            _connection = connection ?? throw new ArgumentNullException(nameof(connection));
            _transaction = transaction; // başlangıçta null olabilir
        }

        // UoW transaction açınca bunu çağıracak
        public void SetTransaction(NpgsqlTransaction transaction)
        {
            _transaction = transaction; // null => transaction yok
        }

        // transaction varsa onunla, yoksa sadece connection ile komut oluştur
        private NpgsqlCommand CreateCommand(string sql)
            => _transaction is null
               ? new NpgsqlCommand(sql, _connection)
               : new NpgsqlCommand(sql, _connection, _transaction);

        public async Task<Feature> GetByIdAsync(int id, CancellationToken ct)
        {
            const string query = "SELECT id, name, geometry FROM features WHERE id = @id;";
            await using var cmd = CreateCommand(query);
            cmd.Parameters.AddWithValue("@id", id);

            await using var reader = await cmd.ExecuteReaderAsync(ct);
            if (!await reader.ReadAsync(ct)) return null;

            return new Feature
            {
                Id = reader.GetInt32(0),
                Name = reader.GetString(1),
                Geom = reader.GetFieldValue<Geometry>(2)
            };
        }

        public async Task<List<Feature>> GetAllAsync(CancellationToken ct)
        {
            var list = new List<Feature>();
            const string query = "SELECT id, name, geometry FROM features ORDER BY name;";

            await using var cmd = CreateCommand(query);
            await using var reader = await cmd.ExecuteReaderAsync(ct);

            while (await reader.ReadAsync(ct))
            {
                list.Add(new Feature
                {
                    Id = reader.GetInt32(0),
                    Name = reader.GetString(1),
                    Geom = reader.GetFieldValue<Geometry>(2)
                });
            }

            return list;
        }

        public async Task AddAsync(Feature entity, CancellationToken ct)
        {
            const string query = "INSERT INTO features (name, geometry) VALUES (@name, @geom);";
            await using var cmd = CreateCommand(query);
            cmd.Parameters.AddWithValue("@name", entity.Name);
            cmd.Parameters.AddWithValue("@geom", entity.Geom);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        public async Task AddRangeAsync(List<Feature> entities, CancellationToken ct)
        {
            if (entities == null || entities.Count == 0) return;

            const string sql = "INSERT INTO features (name, geometry) VALUES (@name, @geom);";
            await using var cmd = CreateCommand(sql);

            var pName = cmd.Parameters.Add("@name", NpgsqlTypes.NpgsqlDbType.Text);
            var pGeom = cmd.Parameters.Add("@geom", NpgsqlTypes.NpgsqlDbType.Geometry);

            await cmd.PrepareAsync(ct);

            foreach (var e in entities)
            {
                pName.Value = e.Name;
                pGeom.Value = e.Geom;
                await cmd.ExecuteNonQueryAsync(ct);
            }
        }


        public async Task UpdateAsync(Feature entity, CancellationToken ct)
        {
            const string query = "UPDATE features SET name = @name, geometry = @geom WHERE id = @id;";
            await using var cmd = CreateCommand(query);
            cmd.Parameters.AddWithValue("@id", entity.Id);
            cmd.Parameters.AddWithValue("@name", entity.Name);
            cmd.Parameters.AddWithValue("@geom", entity.Geom);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        public async Task DeleteAsync(int id, CancellationToken ct)
        {
            const string query = "DELETE FROM features WHERE id = @id;";
            await using var cmd = CreateCommand(query);
            cmd.Parameters.AddWithValue("@id", id);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        public async Task<bool> ExistsAsync(int id, CancellationToken ct)
        {
            const string query = "SELECT 1 FROM features WHERE id = @id;";
            await using var cmd = CreateCommand(query);
            cmd.Parameters.AddWithValue("@id", id);
            var result = await cmd.ExecuteScalarAsync(ct);
            return result != null;
        }
    }
}

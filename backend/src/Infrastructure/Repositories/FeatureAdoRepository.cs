#nullable enable
using BasarApp.Application.Abstractions;
using BasarApp.Domain.Entities;
using BasarApp.Domain.Enums;
using NetTopologySuite.Geometries;
using NetTopologySuite.IO;
using Npgsql;

namespace BasarApp.Infrastructure.Repositories.Implementations
{
    /// <summary>
    /// ADO.NET tabanlı Feature repository.
    /// Sorumluluk: Düz SQL ile CRUD + sayfalama; GeoJSON ↔ NTS dönüşümü ve SRID=4326 tutarlılığı.
    /// Bağımlılıklar: Npgsql, NetTopologySuite (GeoJsonReader/Writer). Transaction dışarıdan SetTransaction ile verilir.
    /// </summary>
    public class FeatureAdoRepository : IFeatureRepository
    {
        private NpgsqlConnection _connection;
        private NpgsqlTransaction? _transaction;

        private static readonly GeoJsonReader _geoReader = new GeoJsonReader();
        private static readonly GeoJsonWriter _geoWriter = new GeoJsonWriter();

        /// <summary>Bağlantı enjekte edilir.</summary>
        public FeatureAdoRepository(NpgsqlConnection connection)
        {
            _connection = connection ?? throw new ArgumentNullException(nameof(connection));
        }

        /// <summary>Bağlantı + opsiyonel transaction enjekte edilir.</summary>
        public FeatureAdoRepository(NpgsqlConnection connection, NpgsqlTransaction? transaction)
        {
            _connection = connection ?? throw new ArgumentNullException(nameof(connection));
            _transaction = transaction;
        }

        /// <summary>Mevcut örneğe transaction atar/değiştirir.</summary>
        public void SetTransaction(NpgsqlTransaction? transaction) => _transaction = transaction;

        /// <summary>Bağlantıyı ve transaction'ı birlikte günceller.</summary>
        public void SetTransaction(NpgsqlConnection connection, NpgsqlTransaction? transaction)
        {
            _connection = connection ?? throw new ArgumentNullException(nameof(connection));
            _transaction = transaction;
        }

        /// <summary>
        /// GeoJSON metnini NTS Geometry'e çevirir ve SRID=4326 set eder.
        /// </summary>
        private static Geometry ReadGeomFromGeoJson(string gj)
        {
            var g = _geoReader.Read<Geometry>(gj);
            g.SRID = 4326;
            return g;
        }

        /// <summary>
        /// Tüm kayıtları getirir (ORDER BY name).
        /// </summary>
        public async Task<List<Feature>> GetAllAsync(CancellationToken ct = default)
        {
            const string sql = @"
                SELECT id, uid, name, enum_type, ST_AsGeoJSON(geometry) AS geojson
                FROM public.features
                ORDER BY name;";

            var list = new List<Feature>();

            // Komutu hazırla ve yürüt
            await using var cmd = new NpgsqlCommand(sql, _connection, _transaction);
            await using var r = await cmd.ExecuteReaderAsync(ct);

            // Satırları entity'e map et
            while (await r.ReadAsync(ct))
            {
                list.Add(new Feature
                {
                    Id        = r.GetInt32(r.GetOrdinal("id")),
                    Uid       = r.GetGuid(r.GetOrdinal("uid")),
                    Name      = r.GetString(r.GetOrdinal("name")),
                    EnumType  = (PointType)r.GetInt32(r.GetOrdinal("enum_type")),
                    Geom      = ReadGeomFromGeoJson(r.GetString(r.GetOrdinal("geojson")))
                });
            }

            return list;
        }

        /// <summary>
        /// Uid ile tek kaydı getirir; yoksa null.
        /// </summary>
        public async Task<Feature?> GetByUidAsync(Guid uid, CancellationToken ct = default)
        {
            const string sql = @"
                SELECT id, uid, name, enum_type, ST_AsGeoJSON(geometry) AS geojson
                FROM public.features
                WHERE uid = @uid
                LIMIT 1;";

            // Komutu hazırla, parametreyi bağla
            await using var cmd = new NpgsqlCommand(sql, _connection, _transaction);
            cmd.Parameters.AddWithValue("uid", uid);

            // Oku ve map et
            await using var r = await cmd.ExecuteReaderAsync(ct);
            if (!await r.ReadAsync(ct)) return null;

            return new Feature
            {
                Id        = r.GetInt32(r.GetOrdinal("id")),
                Uid       = r.GetGuid(r.GetOrdinal("uid")),
                Name      = r.GetString(r.GetOrdinal("name")),
                EnumType  = (PointType)r.GetInt32(r.GetOrdinal("enum_type")),
                Geom      = ReadGeomFromGeoJson(r.GetString(r.GetOrdinal("geojson")))
            };
        }

        /// <summary>
        /// Tek kayıt ekler; GeoJSON'dan geometri oluşturur ve SRID=4326 set eder; RETURNING ile yeni kaydı döndürür.
        /// </summary>
        public async Task<Feature> AddAsync(Feature entity, CancellationToken ct = default)
        {
            if (entity is null) throw new ArgumentNullException(nameof(entity));

            const string sql = @"
                INSERT INTO public.features (name, geometry, enum_type)
                VALUES (@name, ST_SetSRID(ST_GeomFromGeoJSON(@gj), 4326), @enum)
                RETURNING id, uid, name, enum_type, ST_AsGeoJSON(geometry) AS geojson;";

            // GeoJSON ve enum işlemleri (Point değilse enum=0/None)
            var gj = _geoWriter.Write(entity.Geom);
            var enumDb = entity.Geom is Point ? (int)entity.EnumType : 0;

            // Komutu hazırla, parametreleri bağla ve tek satır oku
            await using var cmd = new NpgsqlCommand(sql, _connection, _transaction);
            cmd.Parameters.AddWithValue("name", entity.Name);
            cmd.Parameters.AddWithValue("gj",   gj);
            cmd.Parameters.AddWithValue("enum", enumDb);

            // Komutu çalıştır ve oku
            await using var r = await cmd.ExecuteReaderAsync(ct);
            await r.ReadAsync(ct);

            // Yeni kaydı map ederek döndür
            return new Feature
            {
                Id        = r.GetInt32(r.GetOrdinal("id")),
                Uid       = r.GetGuid(r.GetOrdinal("uid")),
                Name      = r.GetString(r.GetOrdinal("name")),
                EnumType  = (PointType)r.GetInt32(r.GetOrdinal("enum_type")),
                Geom      = ReadGeomFromGeoJson(r.GetString(r.GetOrdinal("geojson")))
            };
        }

        /// <summary>
        /// Toplu ekleme yapar (RETURNING kullanılmadığı için Uid-set edilmez).
        /// </summary>
        public async Task AddRangeAsync(List<Feature> entities, CancellationToken ct = default)
        {
            if (entities is null) throw new ArgumentNullException(nameof(entities));

            const string sql = @"
                INSERT INTO public.features (name, geometry, enum_type)
                VALUES (@name, ST_SetSRID(ST_GeomFromGeoJSON(@gj), 4326), @enum);";

            // Her entity için komutu çalıştır
            foreach (var e in entities)
            {
                // GeoJSON ve enum işlemleri
                var gj = _geoWriter.Write(e.Geom);
                var enumDb = e.Geom is Point ? (int)e.EnumType : 0;

                // Komutu hazırla, parametreleri bağla ve çalıştır
                await using var cmd = new NpgsqlCommand(sql, _connection, _transaction);
                cmd.Parameters.AddWithValue("name", e.Name);
                cmd.Parameters.AddWithValue("gj",   gj);
                cmd.Parameters.AddWithValue("enum", enumDb);

                await cmd.ExecuteNonQueryAsync(ct);
            }
        }

        /// <summary>
        /// Uid'e göre günceller ve güncel kaydı döndürür; yoksa null.
        /// </summary>
        public async Task<Feature?> UpdateByUidAsync(Guid uid, Feature entity, CancellationToken ct = default)
        {
            if (entity is null) throw new ArgumentNullException(nameof(entity));

            const string sql = @"
                UPDATE public.features
                SET name = @name,
                    geometry = ST_SetSRID(ST_GeomFromGeoJSON(@gj), 4326),
                    enum_type = @enum
                WHERE uid = @uid
                RETURNING id, uid, name, enum_type, ST_AsGeoJSON(geometry) AS geojson;";

            // GeoJSON ve enum değerlerini hazırla
            var gj = _geoWriter.Write(entity.Geom);
            var enumDb = entity.Geom is Point ? (int)entity.EnumType : 0;

            // Komutu hazırla, parametreleri bağla
            await using var cmd = new NpgsqlCommand(sql, _connection, _transaction);
            cmd.Parameters.AddWithValue("uid",  uid);
            cmd.Parameters.AddWithValue("name", entity.Name);
            cmd.Parameters.AddWithValue("gj",   gj);
            cmd.Parameters.AddWithValue("enum", enumDb);

            // Tek satır geri gelir; yoksa null
            await using var r = await cmd.ExecuteReaderAsync(ct);
            if (!await r.ReadAsync(ct)) return null;

            // Güncel kaydı map ederek döndür
            return new Feature
            {
                Id = r.GetInt32(r.GetOrdinal("id")),
                Uid = r.GetGuid(r.GetOrdinal("uid")),
                Name = r.GetString(r.GetOrdinal("name")),
                EnumType = (PointType)r.GetInt32(r.GetOrdinal("enum_type")),
                Geom = ReadGeomFromGeoJson(r.GetString(r.GetOrdinal("geojson")))
            };
        }

        /// <summary>
        /// Uid'e göre siler; etkilenen satır varsa true döner.
        /// </summary>
        public async Task<bool> DeleteByUidAsync(Guid uid, CancellationToken ct = default)
        {
            const string sql = "DELETE FROM public.features WHERE uid = @uid;";

            // Komutu hazırla, parametreyi bağla ve çalıştır
            await using var cmd = new NpgsqlCommand(sql, _connection, _transaction);
            cmd.Parameters.AddWithValue("uid", uid);
            var affected = await cmd.ExecuteNonQueryAsync(ct);

            return affected > 0;
        }

        /// <summary>
        /// Uid var mı kontrol eder (SELECT 1).
        /// </summary>
        public async Task<bool> ExistsAsync(Guid uid, CancellationToken ct = default)
        {
            const string sql = "SELECT 1 FROM public.features WHERE uid = @uid LIMIT 1;";

            // Komutu hazırla, parametreyi bağla ve scalar oku
            await using var cmd = new NpgsqlCommand(sql, _connection, _transaction);
            cmd.Parameters.AddWithValue("uid", uid);

            return await cmd.ExecuteScalarAsync(ct) is not null;
        }


        /// <summary>
        /// Arama (q) destekli sayfalama; OFFSET/LIMIT ile sayfalar.
        /// </summary>
        public async Task<(List<Feature> Items, int TotalCount)> GetPagedAsync(
            int page,
            int pageSize,
            string? q = null,
            CancellationToken ct = default)
        {
            // Girdi normalizasyonu
            if (page < 1) page = 1;
            if (pageSize <= 0) pageSize = 20;

            // Sayfa hesaplamaları
            var skip = (page - 1) * pageSize;
            var items = new List<Feature>();

            // Dinamik WHERE (q varsa ILIKE)
            var hasQ = !string.IsNullOrWhiteSpace(q);
            var where = hasQ ? "WHERE name ILIKE @q" : string.Empty;

            // Sayfa verilerini çek
            var sqlItems = $@"
                SELECT id, uid, name, enum_type, ST_AsGeoJSON(geometry) AS geojson
                FROM public.features
                {where}
                ORDER BY id
                OFFSET @skip LIMIT @take;";

            await using (var cmd = new NpgsqlCommand(sqlItems, _connection, _transaction))
            {
                // Komutu hazırla, parametreleri bağla ve add işlemini yap
                if (hasQ) cmd.Parameters.AddWithValue("q", $"%{q!.Trim()}%");
                cmd.Parameters.AddWithValue("skip", skip);
                cmd.Parameters.AddWithValue("take", pageSize);

                // Satırları oku
                await using var r = await cmd.ExecuteReaderAsync(ct);
                
                // Satırları entity'e map et
                while (await r.ReadAsync(ct))
                {
                    items.Add(new Feature
                    {
                        Id = r.GetInt32(r.GetOrdinal("id")),
                        Uid = r.GetGuid(r.GetOrdinal("uid")),
                        Name = r.GetString(r.GetOrdinal("name")),
                        EnumType = (PointType)r.GetInt32(r.GetOrdinal("enum_type")),
                        Geom = ReadGeomFromGeoJson(r.GetString(r.GetOrdinal("geojson")))
                    });
                }
            }

            // Toplam sayıyı çek
            var sqlCount = $@"SELECT COUNT(1) FROM public.features {where};";
            int total;
            
            // Ayrı komutla toplam sayıyı al
            await using (var cmd2 = new NpgsqlCommand(sqlCount, _connection, _transaction))
            {
                // Komutu hazırla, parametreyi bağla ve execute et
                if (hasQ) cmd2.Parameters.AddWithValue("q", $"%{q!.Trim()}%");
                var obj = await cmd2.ExecuteScalarAsync(ct);
                // obj null ise 0, değilse int'e çevir
                total = obj is null ? 0 : Convert.ToInt32(obj);
            }

            return (items, total);
        }

        /// <summary>
        /// Id ile tek kaydı getirir; yoksa null.
        /// </summary>
        public async Task<Feature?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            const string sql = @"
                SELECT id, uid, name, enum_type, ST_AsGeoJSON(geometry) AS geojson
                FROM public.features
                WHERE id = @id
                LIMIT 1;";

            // Komutu hazırla, parametreyi bağla ve oku
            await using var cmd = new NpgsqlCommand(sql, _connection, _transaction);
            cmd.Parameters.AddWithValue("id", id);

            // Tek satır oku ve map et
            await using var r = await cmd.ExecuteReaderAsync(ct);

            // Tek satır yoksa null döner
            if (!await r.ReadAsync(ct)) return null;

            return new Feature
            {
                Id = r.GetInt32(r.GetOrdinal("id")),
                Uid = r.GetGuid(r.GetOrdinal("uid")),
                Name = r.GetString(r.GetOrdinal("name")),
                EnumType = (PointType)r.GetInt32(r.GetOrdinal("enum_type")),
                Geom = ReadGeomFromGeoJson(r.GetString(r.GetOrdinal("geojson")))
            };
        }

        /// <summary>
        /// Id'den Uid döndürür; yoksa null.
        /// </summary>
        public async Task<Guid?> GetUidByIdAsync(int id, CancellationToken ct = default)
        {
            const string sql = "SELECT uid FROM public.features WHERE id = @id LIMIT 1;";

            // Komutu hazırla, parametreyi bağla ve  execute et
            await using var cmd = new NpgsqlCommand(sql, _connection, _transaction);
            cmd.Parameters.AddWithValue("id", id);
            var res = await cmd.ExecuteScalarAsync(ct);
            // obj null ise 0, değilse int'e çevir
            return res is null ? (Guid?)null : (Guid)res;
        }
    }
}

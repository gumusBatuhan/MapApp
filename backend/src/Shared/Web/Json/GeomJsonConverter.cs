using NetTopologySuite.Geometries;
using NetTopologySuite.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using BasarApp.Shared.Resources;

namespace BasarApp.Shared.Web.Json
{
    /// <summary>
    /// Geometry ↔ GeoJSON dönüştürücüsü (Newtonsoft.Json).
    /// İstek: Geometry, Feature veya tek öğeli FeatureCollection kabul eder.
    /// Yanıt: Geometry'yi ham GeoJSON olarak yazar. SRID her zaman 4326'ya normalize edilir.
    /// </summary>
    public class GeomJsonConverter : JsonConverter<Geometry>
    {
        private static readonly GeoJsonWriter _writer = new GeoJsonWriter();
        private static readonly GeoJsonReader _reader = new GeoJsonReader();

        /// <summary>
        /// Geometry > GeoJSON (ham JSON) yazımı.
        /// </summary>
        public override void WriteJson(JsonWriter writer, Geometry value, JsonSerializer serializer)
        {
            // Null ise null yaz ve çık
            if (value == null)
            {
                writer.WriteNull();
                return;
            }

            // SRID normalize (0 ise 4326 ata)
            if (value.SRID == 0) value.SRID = 4326;

            // Geometry > GeoJSON string
            var geojson = _writer.Write(value);

            // Ham JSON olarak yaz
            writer.WriteRawValue(geojson);
        }

        /// <summary>
        /// GeoJSON/Feature/FeatureCollection → Geometry okuma.
        /// Yalnızca tek geometri kabul edilir.
        /// </summary>
        public override Geometry ReadJson(JsonReader reader, Type objectType, Geometry existingValue, bool hasExistingValue, JsonSerializer serializer)
        {
            // Null giriş kabul edilmez
            if (reader.TokenType == JsonToken.Null)
                throw new JsonSerializationException(Messages.Error.GeomEmpty);

            try
            {
                JToken token;

                // Girdi token'ını yükle: object/array > ReadFrom; string > Parse; aksi > invalid
                if (reader.TokenType == JsonToken.StartObject || reader.TokenType == JsonToken.StartArray)
                {
                    token = JToken.ReadFrom(reader);
                }
                else if (reader.TokenType == JsonToken.String)
                {
                    var str = (string)reader.Value!;
                    if (string.IsNullOrWhiteSpace(str))
                        throw new JsonSerializationException(Messages.Error.GeomEmpty);
                    token = JToken.Parse(str);
                }
                else
                {
                    throw new JsonSerializationException(Messages.Error.GeomInvalid);
                }

                // Feature ise geometry alanını al
                if (token.Type == JTokenType.Object &&
                    string.Equals(token["type"]?.Value<string>(), "Feature", StringComparison.OrdinalIgnoreCase))
                {
                    token = token["geometry"] ?? throw new JsonSerializationException(Messages.Error.GeomInvalid);
                }

                // FeatureCollection ise tek feature bekle (0 veya > 1 hata)
                if (token.Type == JTokenType.Object &&
                    string.Equals(token["type"]?.Value<string>(), "FeatureCollection", StringComparison.OrdinalIgnoreCase))
                {
                    var feats = token["features"] as JArray;
                    if (feats is null || feats.Count == 0)
                        throw new JsonSerializationException(Messages.Error.GeomEmpty);
                    if (feats.Count > 1)
                        throw new JsonSerializationException("Birden fazla feature gönderildi. Tek geometri bekleniyor.");
                    token = feats[0]!["geometry"] ?? throw new JsonSerializationException(Messages.Error.GeomInvalid);
                }

                // Elimizde saf Geometry JSON'u olmalı > string'e çevir
                var geojson = token.ToString(Formatting.None);

                // GeoJSON > Geometry
                var g = _reader.Read<Geometry>(geojson) ?? throw new JsonSerializationException(Messages.Error.GeomInvalid);

                // SRID normalize (0 ise 4326)
                if (g.SRID == 0) g.SRID = 4326;

                // Geometry döndür
                return g;
            }
            catch (JsonSerializationException) { throw; } // Beklenen hata tipini koru
            catch
            {
                // Diğer tüm hataları tekil invalid mesajına çevir
                throw new JsonSerializationException(Messages.Error.GeomInvalid);
            }
        }
    }
}

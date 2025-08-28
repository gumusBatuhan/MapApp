using System;
using NetTopologySuite.Geometries;
using NetTopologySuite.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using BasarApp.Shared.Resources;

namespace BasarApp.Shared.Web.Json
{
    /// <summary>
    /// Geometry &lt;-&gt; GeoJSON dönüştürücüsü (Newtonsoft.Json için).
    /// İsteklerde GeoJSON kabul eder, yanıtlarda GeoJSON üretir.
    /// - SRID: Okurken SRID=4326 olarak normalize eder.
    /// - Giriş: Nesne (JObject) ya da string (JSON metni) kabul eder.
    /// </summary>
    public class GeomJsonConverter : JsonConverter<Geometry>
    {
        private static readonly GeoJsonWriter _writer = new GeoJsonWriter();
        // Bazı sürümlerde GeoJsonReader(GeometryFactory) yok → parametresiz kullan
        private static readonly GeoJsonReader _reader = new GeoJsonReader();

        public override void WriteJson(JsonWriter writer, Geometry value, JsonSerializer serializer)
        {
            if (value == null)
            {
                writer.WriteNull();
                return;
            }

            // SRID yoksa 4326'a çek
            if (value.SRID == 0) value.SRID = 4326;

            var json = _writer.Write(value);   // Geometry -> GeoJSON string
            writer.WriteRawValue(json);        // JSON olarak göm
        }

        public override Geometry ReadJson(JsonReader reader, Type objectType, Geometry existingValue, bool hasExistingValue, JsonSerializer serializer)
        {
            if (reader.TokenType == JsonToken.Null)
                throw new JsonSerializationException(Messages.Error.GeomEmpty);

            try
            {
                string geojson;

                // 1) Nesne/array ise doğrudan JToken’dan al
                if (reader.TokenType == JsonToken.StartObject || reader.TokenType == JsonToken.StartArray)
                {
                    var token = JToken.ReadFrom(reader);
                    geojson = token.ToString(Formatting.None);
                }
                // 2) Bazı istemciler GeoJSON'u string olarak yollar
                else if (reader.TokenType == JsonToken.String)
                {
                    var str = (string)reader.Value;
                    if (string.IsNullOrWhiteSpace(str))
                        throw new JsonSerializationException(Messages.Error.GeomEmpty);
                    geojson = str!;
                }
                else
                {
                    throw new JsonSerializationException(Messages.Error.GeomInvalid);
                }

                // GeoJSON -> Geometry
                var g = _reader.Read<Geometry>(geojson);

                // SRID yoksa normalize et
                if (g != null && g.SRID == 0) g.SRID = 4326;

                return g ?? throw new JsonSerializationException(Messages.Error.GeomInvalid);
            }
            catch (JsonSerializationException)
            {
                throw; // kendi mesajlarımızı koru
            }
            catch
            {
                throw new JsonSerializationException(Messages.Error.GeomInvalid);
            }
        }
    }
}

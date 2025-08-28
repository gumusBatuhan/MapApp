using NetTopologySuite.Geometries;
using Newtonsoft.Json;
using BasarApp.Converters;

namespace BasarApp.Dtos
{
    public class FeatureDto
    {
        public string Name { get; set; } = string.Empty;

        // GeoJSON tabanlı converter
        [JsonConverter(typeof(GeomJsonConverter))]
        public Geometry Geom { get; set; } = default!;
    }
}

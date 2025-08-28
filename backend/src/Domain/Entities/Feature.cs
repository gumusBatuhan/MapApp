using NetTopologySuite.Geometries;

namespace BasarApp.Domain.Entities
{
    public class Feature
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public Geometry Geom { get; set; }
    }
}
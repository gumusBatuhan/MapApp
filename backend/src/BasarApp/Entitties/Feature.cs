using NetTopologySuite.Geometries;

namespace BasarApp.Entities
{
    public class Feature
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public Geometry Geom { get; set; }
    }
}
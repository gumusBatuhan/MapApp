using BasarApp.Domain.Enums;
using NetTopologySuite.Geometries;

namespace BasarApp.Domain.Entities
{
    /// <summary>
    /// Coğrafi varlık (Feature) modeli. PostGIS + NetTopologySuite (NTS) ile eşlenir;
    /// API/FE tarafında CRUD ve harita gösterimi/filtreleme için kullanılır.
    /// </summary>
    public class Feature
    {
        public int Id { get; set; } // PK

        // FE güncelle/sil için gizli anahtar; UUID DB'de default (örn. gen_random_uuid()) ile üretilir.
        public Guid Uid { get; set; }

        public string Name { get; set; } = string.Empty; // Gösterim/arama adı

        public Geometry Geom { get; set; } = default!; // PostGIS geometry (NTS)

        public PointType EnumType { get; set; } = PointType.None; // Tür/sınıflandırma
    }
}

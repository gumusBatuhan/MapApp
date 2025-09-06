using NetTopologySuite.Geometries;

namespace BasarApp.Application.Dtos
{
    /// <summary>
    /// API <-> FE arasında veri taşıma modeli (DTO).
    /// Entity: Feature ile eşlenir; CRUD istek/yanıtlarında kullanılır.
    /// Geom: NTS geometry; EnumType: PointType'ın sayısal karşılığı.
    /// </summary>
    public class FeatureDto
    {
        public Guid? Uid { get; set; } // FE'nin referans alacağı kimlik (POST'ta opsiyonel)
        public string Name { get; set; } = string.Empty; // Görünen ad
        public Geometry Geom { get; set; } = default!;   // Geometri (NTS)
        public int EnumType { get; set; }                // Tür
    }
}

using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using NetTopologySuite.Geometries;

namespace BasarApp.Api.Helpers
{
    /// <summary>
    /// Swagger/Swashbuckle şema filtresi.
    /// Amaç: NTS Geometry tipleri için GeoJSON örneği göstermek.
    /// Kullanım: AddSwaggerGen(...).SchemaFilter&lt;GeomSchemaFilter&gt;()
    /// </summary>
    public class GeomSchemaFilter : ISchemaFilter
    {
        /// <summary>
        /// Geometry tipi algılanırsa şema tipini/örneğini GeoJSON ile zenginleştirir.
        /// </summary>
        public void Apply(OpenApiSchema schema, SchemaFilterContext context)
        {
            // Hedef: NetTopologySuite.Geometries.Geometry
            if (context.Type == typeof(Geometry))
            {
                // Tipi object olarak işaretle ve basit Point örneği ver
                schema.Type = "object";
                schema.Example = new OpenApiString(@"
                {
                ""type"": ""Point"",
                ""coordinates"": [29.0, 41.0]
                }");
            }
        }
    }
}

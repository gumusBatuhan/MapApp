using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using NetTopologySuite.Geometries;

namespace BasarApp.Helpers
{
    public class GeomSchemaFilter : ISchemaFilter
    {
        public void Apply(OpenApiSchema schema, SchemaFilterContext context)
        {
            if (context.Type == typeof(Geometry))
            {
                // GeoJSON örneği
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

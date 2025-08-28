using Microsoft.OpenApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using BasarApp.Services;
using BasarApp.Application.Abstractions;
using BasarApp.Application.Abstractions;
using BasarApp.Repositories.Implementations;
using BasarApp.Shared.Web.Json;
using BasarApp.Helpers;
using BasarApp.Application.Validation;
using BasarApp.Data;

using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// ---- CORS TANIMI (BUILD ÖNCESİ) ----
var MyCors = "_myCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(MyCors, p =>
        p.WithOrigins(
            "http://localhost:5173",   // Vite dev
            "http://127.0.0.1:5173"    // bazen tarayıcı bu hostu kullanır
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
    );
});

// 2) ADO tarafı için NpgsqlDataSource
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.UseNetTopologySuite();
var dataSource = dataSourceBuilder.Build();
builder.Services.AddSingleton(dataSource);

// 3) EF Core DbContext
builder.Services.AddDbContext<BasarAppDbContext>(options =>
    options.UseNpgsql(connectionString, o => o.UseNetTopologySuite())
);

// 4) Validator
builder.Services.AddScoped<FeatureDtoValidator>();

// 5) UnitOfWork kayıtları
builder.Services.AddScoped<IUnitOfWork, AdoUnitOfWork>();
builder.Services.AddKeyedScoped<IUnitOfWork, AdoUnitOfWork>("ado");
builder.Services.AddKeyedScoped<IUnitOfWork, EfUnitOfWork>("ef");

// 6) Service kayıtları
builder.Services.AddScoped<IFeatureService, FeatureAdoService>();
builder.Services.AddKeyedScoped<IFeatureService, FeatureAdoService>("ado");
builder.Services.AddKeyedScoped<IFeatureService, FeatureEfService>("ef");

// 7) Controllers + Newtonsoft.Json (GeoJSON)
builder.Services.AddControllers()
    .AddNewtonsoftJson(options =>
    {
        options.SerializerSettings.Converters.Add(new GeomJsonConverter());
    });

// 8) Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "BasarApp API",
        Version = "v1",
        Description = "BasarApp API Documentation"
    });
    c.SchemaFilter<GeomSchemaFilter>();
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "BasarApp API v1");
        c.RoutePrefix = string.Empty;
    });
}

// ---- CORS’U ORTAYA KOY (MAPTEN ÖNCE) ----
app.UseCors(MyCors);

app.UseAuthorization();
app.MapControllers(); // /api/feature route burada map’leniyor (Controller attribute’undan gelir)

app.Run();
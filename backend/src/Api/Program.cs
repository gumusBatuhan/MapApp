using Npgsql;
using BasarApp.Application.Abstractions;
using BasarApp.Application.Dtos;
using BasarApp.Application.Services.Implementations;
using BasarApp.Infrastructure.Persistence;
using BasarApp.Infrastructure.Repositories.Implementations;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using BasarApp.Shared.Web.Json;
using BasarApp.Api.Helpers;

var builder = WebApplication.CreateBuilder(args);

// ─ Connection String
// Bulunamazsa hata fırlat
var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? builder.Configuration["ConnectionStrings:DefaultConnection"]
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' bulunamadı.");

// ─ EF Core + PostGIS (NTS desteği ile)
builder.Services.AddDbContext<BasarAppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql => npgsql.UseNetTopologySuite()));

// ─ ADO.NET için NpgsqlDataSource
builder.Services.AddSingleton<NpgsqlDataSource>(_ => NpgsqlDataSource.Create(connectionString));

// ─ Validators (FluentValidation; hem tür hem interface kaydı)
builder.Services.AddScoped<FeatureDtoValidator>();
builder.Services.AddScoped<IValidator<FeatureDto>, FeatureDtoValidator>();

// ─ Application Services — keyed DI (ef / ado) seçeneği
builder.Services.AddKeyedScoped<IUnitOfWork, EfUnitOfWork>("ef");
builder.Services.AddKeyedScoped<IUnitOfWork, AdoUnitOfWork>("ado");
builder.Services.AddKeyedScoped<IFeatureService, FeatureEfService>("ef");
builder.Services.AddKeyedScoped<IFeatureService, FeatureAdoService>("ado");

// ─ Varsayılan provider ("ef")
var DATA_PROVIDER = builder.Configuration["DataAccess:Provider"] ?? "ef";
builder.Services.AddScoped<IFeatureService>(sp => sp.GetRequiredKeyedService<IFeatureService>(DATA_PROVIDER));
builder.Services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredKeyedService<IUnitOfWork>(DATA_PROVIDER));

// ─ Controllers + Newtonsoft.Json (Geometry <-> GeoJSON dönüştürücü)
builder.Services
    .AddControllers()
    .AddNewtonsoftJson(options =>
    {
        // Geometry için özel converter
        options.SerializerSettings.Converters.Add(new GeomJsonConverter());

        // JSON davranışları
        options.SerializerSettings.NullValueHandling = NullValueHandling.Ignore;
        options.SerializerSettings.ReferenceLoopHandling = ReferenceLoopHandling.Ignore;
        options.SerializerSettings.FloatFormatHandling = FloatFormatHandling.DefaultValue;
    });

// ─ Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    // GeomSchemaFilter: Geometry tipleri için GeoJSON örneği sadece Swagger UI'da gösterir
    c.SchemaFilter<GeomSchemaFilter>();
});

// ─ CORS
const string CorsPolicy = "BasarAppCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, p =>
        p.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
         .AllowAnyHeader()
         .AllowAnyMethod());
});

var app = builder.Build();

// ─ Pipeline
if (app.Environment.IsDevelopment())
{
    // Swagger UI yalnızca Development'ta açık
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors(CorsPolicy);
app.MapControllers();

app.Run();

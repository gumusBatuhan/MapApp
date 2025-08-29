using BasarApp.Application.Abstractions;
using BasarApp.Application.Dtos;
using BasarApp.Application.Services.Implementations;
using BasarApp.Application.Validators;
using BasarApp.Infrastructure.Persistence;
using BasarApp.Infrastructure.Repositories.Implementations;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using NetTopologySuite.IO.Converters;
using Newtonsoft.Json;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// ───────────────────────────────────────────────────────────────────────────────
// Connection String
// appsettings.json -> ConnectionStrings:DefaultConnection
// ───────────────────────────────────────────────────────────────────────────────
var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? builder.Configuration["ConnectionStrings:DefaultConnection"]
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' bulunamadı.");

// ───────────────────────────────────────────────────────────────────────────────
/* EF Core + PostGIS (NetTopologySuite) */
// ───────────────────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<BasarAppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql => npgsql.UseNetTopologySuite()));

// ───────────────────────────────────────────────────────────────────────────────
/* ADO.NET için NpgsqlDataSource (ADO implementasyonları için gerekli) */
// ───────────────────────────────────────────────────────────────────────────────
builder.Services.AddSingleton<NpgsqlDataSource>(_ => NpgsqlDataSource.Create(connectionString));

// ───────────────────────────────────────────────────────────────────────────────
/* VALIDATOR KAYITLARI */
// Servislerinizde concrete FeatureDtoValidator veya IValidator<FeatureDto> kullanılabilir.
// İki kaydı da ekliyoruz; hangisine ihtiyacın varsa o karşılanacak.
// ───────────────────────────────────────────────────────────────────────────────
builder.Services.AddScoped<FeatureDtoValidator>();
builder.Services.AddScoped<IValidator<FeatureDto>, FeatureDtoValidator>();

// ───────────────────────────────────────────────────────────────────────────────
/* APPLICATION SERVICES — Keyed Registrations */
// EF ve ADO aynı anda kayıtlı. Varsayılan sağlayıcıyı aşağıda seçiyoruz.
// ───────────────────────────────────────────────────────────────────────────────
builder.Services.AddKeyedScoped<IUnitOfWork, EfUnitOfWork>("ef");
builder.Services.AddKeyedScoped<IUnitOfWork, AdoUnitOfWork>("ado");

builder.Services.AddKeyedScoped<IFeatureService, FeatureEfService>("ef");
builder.Services.AddKeyedScoped<IFeatureService, FeatureAdoService>("ado");

// ───────────────────────────────────────────────────────────────────────────────
/* Varsayılan Sağlayıcıyı tek satırla seç (ef ↔ ado)
   appsettings.json:
   "DataAccess": { "Provider": "ef" }  // veya "ado" */
// ───────────────────────────────────────────────────────────────────────────────
// const string DATA_PROVIDER = "ef";
var DATA_PROVIDER = builder.Configuration["DataAccess:Provider"] ?? "ef";

builder.Services.AddScoped<IFeatureService>(sp =>
    sp.GetRequiredKeyedService<IFeatureService>(DATA_PROVIDER));

builder.Services.AddScoped<IUnitOfWork>(sp =>
    sp.GetRequiredKeyedService<IUnitOfWork>(DATA_PROVIDER));

// ───────────────────────────────────────────────────────────────────────────────
/* Controllers + Newtonsoft.Json + NTS GeoJSON Converters */
// Bu kısım, GeoJSON <-> NetTopologySuite Geometry dönüşümlerini sağlar
// ve Infinity/NaN gibi sayıları güvenli şekilde ele alır.
// ───────────────────────────────────────────────────────────────────────────────
builder.Services
    .AddControllers()
    .AddNewtonsoftJson(options =>
    {
        // NTS GeoJSON dönüştürücüleri
        options.SerializerSettings.Converters.Add(new GeometryConverter());
        options.SerializerSettings.Converters.Add(new EnvelopeConverter());

        // Yazım/okuma davranışları
        options.SerializerSettings.NullValueHandling = NullValueHandling.Ignore;
        options.SerializerSettings.ReferenceLoopHandling = ReferenceLoopHandling.Ignore;

        // Bazı istemci/veritabanı kaynaklı Infinity/NaN durumlarında JSON yazımını güvenli kılar
        options.SerializerSettings.FloatFormatHandling = FloatFormatHandling.DefaultValue;
        // Gerekirse: options.SerializerSettings.FloatFormatHandling = FloatFormatHandling.String;
    });

// ───────────────────────────────────────────────────────────────────────────────
/* Swagger */
// ───────────────────────────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ───────────────────────────────────────────────────────────────────────────────
/* CORS (React dev için; gerekirse domain/port ekle) */
// ───────────────────────────────────────────────────────────────────────────────
const string CorsPolicy = "BasarAppCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, p =>
        p.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
         .AllowAnyHeader()
         .AllowAnyMethod());
});

var app = builder.Build();

// ───────────────────────────────────────────────────────────────────────────────
/* Pipeline */
// ───────────────────────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors(CorsPolicy);
app.MapControllers();
app.Run();

using BasarApp.Application.Abstractions;
using BasarApp.Application.Dtos;
using BasarApp.Application.Services.Implementations;
using BasarApp.Infrastructure.Persistence;
using BasarApp.Infrastructure.Repositories.Implementations;
using BasarApp.Shared.Web.Json;
using BasarApp.Api.Helpers;
using FluentValidation;
using FluentValidation.AspNetCore;

using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Microsoft.Extensions.DependencyInjection;

using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// ---- CORS ----
var MyCors = "_myCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(MyCors, p =>
        p.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
         .AllowAnyHeader()
         .AllowAnyMethod()
    );
});

// ---- Connection & ADO DataSource ----
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.UseNetTopologySuite();
var dataSource = dataSourceBuilder.Build();
builder.Services.AddSingleton(dataSource);

// ---- EF Core DbContext ----
builder.Services.AddDbContext<BasarAppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql => npgsql.UseNetTopologySuite())
);

// ---- FluentValidation (11.x) ----
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<FeatureDto>();

// ---- Keyed DI: UoW ----
builder.Services.AddKeyedScoped<IUnitOfWork, EfUnitOfWork>("ef");
builder.Services.AddKeyedScoped<IUnitOfWork, AdoUnitOfWork>("ado");

// ---- Keyed DI: Services ----
builder.Services.AddKeyedScoped<IFeatureService, FeatureEfService>("ef");
builder.Services.AddKeyedScoped<IFeatureService, FeatureAdoService>("ado");

// ---- Controllers + Newtonsoft (GeoJSON) ----
builder.Services.AddControllers()
    .AddNewtonsoftJson(options =>
    {
        options.SerializerSettings.Converters.Add(new GeomJsonConverter());
    });

// ---- Swagger ----
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

app.UseCors(MyCors);
app.UseAuthorization();
app.MapControllers();
app.Run();

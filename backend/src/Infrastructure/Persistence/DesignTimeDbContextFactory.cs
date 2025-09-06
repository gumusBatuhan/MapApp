#nullable enable
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace BasarApp.Infrastructure.Persistence
{
    /// <summary>
    /// Sadece EF Core CLI (dotnet ef) için design-time DbContext oluşturur.
    /// Runtime'da kullanılmaz.
    /// </summary>
    public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<BasarAppDbContext>
    {
        public BasarAppDbContext CreateDbContext(string[] args)
        {
            var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
            var basePath = Directory.GetCurrentDirectory();

            var config = new ConfigurationBuilder()
                .SetBasePath(basePath)
                .AddJsonFile("appsettings.json", optional: true)
                .AddJsonFile($"appsettings.{env}.json", optional: true)
                .AddEnvironmentVariables()
                .Build();

            var cs =
                config.GetConnectionString("DefaultConnection")
                ?? config["ConnectionStrings:DefaultConnection"]
                ?? "Host=localhost;Port=5432;Database=basarapp;Username=postgres;Password=postgres";

            var options = new DbContextOptionsBuilder<BasarAppDbContext>()
                // PostGIS/NTS desteği (migrations veya scaffold sırasında geometry eşlemesi için)
                .UseNpgsql(cs, npgsql => npgsql.UseNetTopologySuite())
                .Options;

            return new BasarAppDbContext(options);
        }
    }
}

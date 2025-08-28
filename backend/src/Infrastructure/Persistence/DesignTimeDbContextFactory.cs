using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration;


namespace BasarApp.Infrastructure.Persistence
{
    public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<BasarAppDbContext>
    {
        public BasarAppDbContext CreateDbContext(string[] args)
        {
            var basePath = Directory.GetCurrentDirectory();
            var config = new ConfigurationBuilder()
                .SetBasePath(basePath)
                .AddJsonFile("appsettings.json", optional: true)
                .AddJsonFile("appsettings.Development.json", optional: true)
                .AddEnvironmentVariables()
                .Build();

            var cs = config.GetConnectionString("DefaultConnection") ?? "Host=localhost;Port=5432;Database=basarapp;Username=postgres;Password=postgres";
            var options = new DbContextOptionsBuilder<BasarAppDbContext>()
                .UseNpgsql(cs)
                .Options;

            return new BasarAppDbContext(options);
        }
    }
}

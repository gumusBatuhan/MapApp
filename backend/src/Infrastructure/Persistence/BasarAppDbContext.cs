using BasarApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BasarApp.Data
{
    public class BasarAppDbContext : DbContext
    {
        public BasarAppDbContext(DbContextOptions<BasarAppDbContext> options) : base(options) { }

        public DbSet<Feature> Features => Set<Feature>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Feature>(e =>
            {
                e.ToTable("features");

                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasColumnName("id");

                e.Property(x => x.Name)
                    .HasColumnName("name")
                    .HasMaxLength(50)
                    .IsRequired();

                // PostGIS geometry kolonu, SRID 4326
                e.Property(x => x.Geom)
                    .HasColumnName("geometry")
                    .HasColumnType("geometry");
            });

            base.OnModelCreating(modelBuilder);
        }
    }
}

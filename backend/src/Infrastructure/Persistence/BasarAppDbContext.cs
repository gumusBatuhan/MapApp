using BasarApp.Domain.Entities;
using BasarApp.Domain.Enums;
using Microsoft.EntityFrameworkCore;
// using NetTopologySuite.Geometries; // SRID sabitlemek isterseniz kullanabilirsiniz

namespace BasarApp.Infrastructure.Persistence
{
    public class BasarAppDbContext : DbContext
    {
        public BasarAppDbContext(DbContextOptions<BasarAppDbContext> options) : base(options) { }

        public DbSet<Feature> Features => Set<Feature>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            var e = modelBuilder.Entity<Feature>();

            // tablo
            e.ToTable("features");

            // pk
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");

            // Uid — DB default (pgcrypto: gen_random_uuid())
            e.Property(x => x.Uid)
                .HasColumnName("uid")
                .HasColumnType("uuid")
                .IsRequired()
                .ValueGeneratedOnAdd()
                .HasDefaultValueSql("gen_random_uuid()");

            e.HasIndex(x => x.Uid)
                .IsUnique()
                .HasDatabaseName("ux_features_uid");

            // name
            e.Property(x => x.Name)
                .HasColumnName("name")
                .HasMaxLength(50)
                .IsRequired();

            // PostGIS geometry
            e.Property(x => x.Geom)
                .HasColumnName("geometry")
                .HasColumnType("geometry");
            // Eğer sürümünüz destekliyorsa SRID sabitlemek için:
            // e.Property(x => x.Geom).HasSrid(4326);

            // EnumType -> integer, NOT NULL, default 0 (PointType.None)
            e.Property(x => x.EnumType)
                .HasColumnName("enum_type")
                .HasConversion<int>()      // veritabanında int olarak sakla
                .HasDefaultValue(PointType.None)
                .IsRequired();

            // ---- İŞ KURALI (isteğe bağlı constraint) ----
            // POINT ise enum_type != 0; POINT değilse enum_type = 0
            // BUNU aktif etmek istersen:
            // 1) Mevcut POINT kayıtların enum_type'ını 1 (Yol) / 2 (Bina) ile doldur.
            // 2) YENİ bir migration üret (AddPointEnumCheck) ve database update yap.
            /*
            e.HasCheckConstraint(
                "ck_features_point_enumtype",
                "(geometry IS NULL) OR " +
                "((GeometryType(geometry) = 'POINT' AND enum_type <> 0) OR " +
                "(GeometryType(geometry) <> 'POINT' AND enum_type = 0))"
            );
            */
        }
    }
}

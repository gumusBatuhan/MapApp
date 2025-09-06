using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BasarApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEnumTypeToFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "enum_type",
                table: "features",
                type: "integer",
                nullable: false,
                defaultValue: 0
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "enum_type",
                table: "features"
            );
        }
    }
}

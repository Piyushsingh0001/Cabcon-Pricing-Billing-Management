using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cabcon.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FixMaterialUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Materials_Name",
                table: "Materials");

            migrationBuilder.AlterColumn<string>(
                name: "VendorName",
                table: "Materials",
                type: "nvarchar(450)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Materials_Name_VendorName",
                table: "Materials",
                columns: new[] { "Name", "VendorName" },
                unique: true,
                filter: "[VendorName] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Materials_Name_VendorName",
                table: "Materials");

            migrationBuilder.AlterColumn<string>(
                name: "VendorName",
                table: "Materials",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Materials_Name",
                table: "Materials",
                column: "Name",
                unique: true);
        }
    }
}

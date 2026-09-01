using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cabcon.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceVendorNameWithVendorIdInMaterialPriceHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "VendorId",
                table: "MaterialPriceHistory",
                type: "int",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE mph
                SET mph.VendorId = v.Id
                FROM MaterialPriceHistory mph
                INNER JOIN Vendors v ON v.Name = mph.VendorName
                WHERE mph.VendorName IS NOT NULL;
            ");

            migrationBuilder.DropColumn(
                name: "VendorName",
                table: "MaterialPriceHistory");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialPriceHistory_VendorId",
                table: "MaterialPriceHistory",
                column: "VendorId");

            migrationBuilder.AddForeignKey(
                name: "FK_MaterialPriceHistory_Vendors_VendorId",
                table: "MaterialPriceHistory",
                column: "VendorId",
                principalTable: "Vendors",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MaterialPriceHistory_Vendors_VendorId",
                table: "MaterialPriceHistory");

            migrationBuilder.DropIndex(
                name: "IX_MaterialPriceHistory_VendorId",
                table: "MaterialPriceHistory");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "MaterialPriceHistory");

            migrationBuilder.AddColumn<string>(
                name: "VendorName",
                table: "MaterialPriceHistory",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}

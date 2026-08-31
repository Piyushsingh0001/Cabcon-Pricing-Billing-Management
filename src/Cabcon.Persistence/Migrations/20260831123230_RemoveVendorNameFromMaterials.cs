using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cabcon.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveVendorNameFromMaterials : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Materials_Vendors_VendorId",
                table: "Materials");

            migrationBuilder.DropIndex(
                name: "IX_Materials_Name_VendorName",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "VendorName",
                table: "Materials");

            migrationBuilder.CreateIndex(
                name: "IX_Materials_Name_VendorId",
                table: "Materials",
                columns: new[] { "Name", "VendorId" },
                unique: true,
                filter: "[VendorId] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Materials_Vendors_VendorId",
                table: "Materials",
                column: "VendorId",
                principalTable: "Vendors",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Materials_Vendors_VendorId",
                table: "Materials");

            migrationBuilder.DropIndex(
                name: "IX_Materials_Name_VendorId",
                table: "Materials");

            migrationBuilder.AddColumn<string>(
                name: "VendorName",
                table: "Materials",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Materials",
                keyColumn: "Id",
                keyValue: 1,
                column: "VendorName",
                value: null);

            migrationBuilder.UpdateData(
                table: "Materials",
                keyColumn: "Id",
                keyValue: 2,
                column: "VendorName",
                value: null);

            migrationBuilder.UpdateData(
                table: "Materials",
                keyColumn: "Id",
                keyValue: 3,
                column: "VendorName",
                value: null);

            migrationBuilder.UpdateData(
                table: "Materials",
                keyColumn: "Id",
                keyValue: 4,
                column: "VendorName",
                value: null);

            migrationBuilder.UpdateData(
                table: "Materials",
                keyColumn: "Id",
                keyValue: 5,
                column: "VendorName",
                value: null);

            migrationBuilder.CreateIndex(
                name: "IX_Materials_Name_VendorName",
                table: "Materials",
                columns: new[] { "Name", "VendorName" },
                unique: true,
                filter: "[VendorName] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Materials_Vendors_VendorId",
                table: "Materials",
                column: "VendorId",
                principalTable: "Vendors",
                principalColumn: "Id");
        }
    }
}

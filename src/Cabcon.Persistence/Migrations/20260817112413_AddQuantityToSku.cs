using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cabcon.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddQuantityToSku : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Quantity",
                table: "Skus",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 1m);

            migrationBuilder.UpdateData(
                table: "Skus",
                keyColumn: "Id",
                keyValue: 1,
                column: "Quantity",
                value: 1m);

            migrationBuilder.UpdateData(
                table: "Skus",
                keyColumn: "Id",
                keyValue: 2,
                column: "Quantity",
                value: 1m);

            migrationBuilder.UpdateData(
                table: "Skus",
                keyColumn: "Id",
                keyValue: 3,
                column: "Quantity",
                value: 1m);

            migrationBuilder.UpdateData(
                table: "Skus",
                keyColumn: "Id",
                keyValue: 4,
                column: "Quantity",
                value: 1m);

            migrationBuilder.UpdateData(
                table: "Skus",
                keyColumn: "Id",
                keyValue: 5,
                column: "Quantity",
                value: 1m);

            migrationBuilder.UpdateData(
                table: "Skus",
                keyColumn: "Id",
                keyValue: 6,
                column: "Quantity",
                value: 1m);

            migrationBuilder.UpdateData(
                table: "Skus",
                keyColumn: "Id",
                keyValue: 7,
                column: "Quantity",
                value: 1m);

            migrationBuilder.UpdateData(
                table: "Skus",
                keyColumn: "Id",
                keyValue: 8,
                column: "Quantity",
                value: 1m);

            migrationBuilder.UpdateData(
                table: "Skus",
                keyColumn: "Id",
                keyValue: 9,
                column: "Quantity",
                value: 1m);

            migrationBuilder.UpdateData(
                table: "Skus",
                keyColumn: "Id",
                keyValue: 10,
                column: "Quantity",
                value: 1m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "Skus");
        }
    }
}

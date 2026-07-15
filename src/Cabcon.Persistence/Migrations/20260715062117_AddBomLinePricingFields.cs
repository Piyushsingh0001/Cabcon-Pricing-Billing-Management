using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cabcon.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBomLinePricingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ManualPrice",
                table: "SkuBomLines",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PriceType",
                table: "SkuBomLines",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PricingMethod",
                table: "SkuBomLines",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PricingMonth",
                table: "SkuBomLines",
                type: "int",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 8,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 9,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 10,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 11,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 12,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 13,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 14,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 15,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 16,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 17,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 18,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 19,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });

            migrationBuilder.UpdateData(
                table: "SkuBomLines",
                keyColumn: "Id",
                keyValue: 20,
                columns: new[] { "ManualPrice", "PriceType", "PricingMethod", "PricingMonth" },
                values: new object[] { null, 0, 1, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ManualPrice",
                table: "SkuBomLines");

            migrationBuilder.DropColumn(
                name: "PriceType",
                table: "SkuBomLines");

            migrationBuilder.DropColumn(
                name: "PricingMethod",
                table: "SkuBomLines");

            migrationBuilder.DropColumn(
                name: "PricingMonth",
                table: "SkuBomLines");
        }
    }
}

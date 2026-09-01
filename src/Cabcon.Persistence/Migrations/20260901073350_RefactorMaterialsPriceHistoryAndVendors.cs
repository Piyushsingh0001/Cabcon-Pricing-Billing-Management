using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cabcon.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RefactorMaterialsPriceHistoryAndVendors : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Materials_Vendors_VendorId",
                table: "Materials");

            migrationBuilder.DropIndex(
                name: "IX_Materials_Name_VendorId",
                table: "Materials");

            migrationBuilder.DropIndex(
                name: "IX_Materials_VendorId",
                table: "Materials");

            migrationBuilder.AddColumn<int>(
                name: "MaterialId",
                table: "MaterialVendors",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql(@"
                UPDATE mv
                SET mv.MaterialId = m.Id
                FROM MaterialVendors mv
                INNER JOIN Materials m ON m.Name = mv.MaterialName;

                DELETE FROM MaterialVendors WHERE MaterialId = 0;

                WITH CTE AS (
                    SELECT Id, MaterialId, VendorId,
                           ROW_NUMBER() OVER(PARTITION BY MaterialId, VendorId ORDER BY Id) as rn
                    FROM MaterialVendors
                )
                DELETE FROM CTE WHERE rn > 1;
            ");

            migrationBuilder.DropColumn(
                name: "AsOnDate",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "DirectRateInrPerKg",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "FreightInrPerMt",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "FxRate",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "IsPlaceholder",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "LmeUsdPerMt",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "PremiumUsdPerMt",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Materials");

            migrationBuilder.RenameColumn(
                name: "FreightInrPerMt",
                table: "MaterialPriceHistory",
                newName: "FreightInrPerKg");

            migrationBuilder.DropColumn(
                name: "MaterialName",
                table: "MaterialVendors");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialVendors_MaterialId_VendorId",
                table: "MaterialVendors",
                columns: new[] { "MaterialId", "VendorId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Materials_Name",
                table: "Materials",
                column: "Name");

            migrationBuilder.AddForeignKey(
                name: "FK_MaterialVendors_Materials_MaterialId",
                table: "MaterialVendors",
                column: "MaterialId",
                principalTable: "Materials",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MaterialVendors_Materials_MaterialId",
                table: "MaterialVendors");

            migrationBuilder.DropIndex(
                name: "IX_MaterialVendors_MaterialId_VendorId",
                table: "MaterialVendors");

            migrationBuilder.DropIndex(
                name: "IX_Materials_Name",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "MaterialId",
                table: "MaterialVendors");

            migrationBuilder.RenameColumn(
                name: "FreightInrPerKg",
                table: "MaterialPriceHistory",
                newName: "FreightInrPerMt");

            migrationBuilder.AddColumn<string>(
                name: "MaterialName",
                table: "MaterialVendors",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "AsOnDate",
                table: "Materials",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<decimal>(
                name: "DirectRateInrPerKg",
                table: "Materials",
                type: "decimal(18,4)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FreightInrPerMt",
                table: "Materials",
                type: "decimal(18,4)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FxRate",
                table: "Materials",
                type: "decimal(18,4)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPlaceholder",
                table: "Materials",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "LmeUsdPerMt",
                table: "Materials",
                type: "decimal(18,4)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PremiumUsdPerMt",
                table: "Materials",
                type: "decimal(18,4)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Materials",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "VendorId",
                table: "Materials",
                type: "int",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Materials",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "AsOnDate", "DirectRateInrPerKg", "FreightInrPerMt", "FxRate", "IsPlaceholder", "LmeUsdPerMt", "PremiumUsdPerMt", "Type", "VendorId" },
                values: new object[] { new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, 6500m, 95m, false, 13400m, 410m, "Exchange", null });

            migrationBuilder.UpdateData(
                table: "Materials",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "AsOnDate", "DirectRateInrPerKg", "FreightInrPerMt", "FxRate", "IsPlaceholder", "LmeUsdPerMt", "PremiumUsdPerMt", "Type", "VendorId" },
                values: new object[] { new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, 6500m, 87m, true, 2650m, 250m, "Exchange", null });

            migrationBuilder.UpdateData(
                table: "Materials",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "AsOnDate", "DirectRateInrPerKg", "FreightInrPerMt", "FxRate", "IsPlaceholder", "LmeUsdPerMt", "PremiumUsdPerMt", "Type", "VendorId" },
                values: new object[] { new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), 100m, null, null, false, null, null, "Direct", null });

            migrationBuilder.UpdateData(
                table: "Materials",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "AsOnDate", "DirectRateInrPerKg", "FreightInrPerMt", "FxRate", "IsPlaceholder", "LmeUsdPerMt", "PremiumUsdPerMt", "Type", "VendorId" },
                values: new object[] { new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), 75m, null, null, true, null, null, "Direct", null });

            migrationBuilder.UpdateData(
                table: "Materials",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "AsOnDate", "DirectRateInrPerKg", "FreightInrPerMt", "FxRate", "IsPlaceholder", "LmeUsdPerMt", "PremiumUsdPerMt", "Type", "VendorId" },
                values: new object[] { new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), 150m, null, null, true, null, null, "Direct", null });

            migrationBuilder.CreateIndex(
                name: "IX_Materials_Name_VendorId",
                table: "Materials",
                columns: new[] { "Name", "VendorId" },
                unique: true,
                filter: "[VendorId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Materials_VendorId",
                table: "Materials",
                column: "VendorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Materials_Vendors_VendorId",
                table: "Materials",
                column: "VendorId",
                principalTable: "Vendors",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}

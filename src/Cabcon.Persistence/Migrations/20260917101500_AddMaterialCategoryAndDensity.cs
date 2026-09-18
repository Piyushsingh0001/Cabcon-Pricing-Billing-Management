using Cabcon.Persistence.Context;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cabcon.Persistence.Migrations
{
    [DbContext(typeof(CabconDbContext))]
    [Migration("20260917101500_AddMaterialCategoryAndDensity")]
    public partial class AddMaterialCategoryAndDensity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[Materials]') AND name = 'CategoryName')
                BEGIN
                    ALTER TABLE [Materials] ADD [CategoryName] nvarchar(150) NULL;
                END
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[Materials]') AND name = 'Density')
                BEGIN
                    ALTER TABLE [Materials] ADD [Density] decimal(18,4) NOT NULL CONSTRAINT DF_Materials_Density DEFAULT 0;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CategoryName",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "Density",
                table: "Materials");
        }
    }
}

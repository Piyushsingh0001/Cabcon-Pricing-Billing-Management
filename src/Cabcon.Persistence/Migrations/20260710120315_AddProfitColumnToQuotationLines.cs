using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cabcon.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProfitColumnToQuotationLines : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Profit",
                table: "QuotationLines",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Profit",
                table: "QuotationLines");
        }
    }
}

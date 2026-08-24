using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cabcon.Persistence.Migrations
{
    /// <inheritdoc />
    /// // Copyright © 2026 Piyush Singh
    // Project: Cabcon Pricing & Billing Management
    public partial class AddPartyAddressToQuotation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PartyAddress",
                table: "Quotations",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PartyAddress",
                table: "Quotations");
        }
    }
}

using Cabcon.Persistence.Context;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cabcon.Persistence.Migrations
{
    [DbContext(typeof(CabconDbContext))]
    [Migration("20260923163000_AddColorCodeToMaterialTypes")]
    public partial class AddColorCodeToMaterialTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                -- 1. Add ColorCode column to MaterialTypes table if not exists
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MaterialTypes]') AND name = 'ColorCode')
                BEGIN
                    ALTER TABLE [MaterialTypes] ADD [ColorCode] nvarchar(50) NULL;
                END
            ");

            migrationBuilder.Sql(@"
                -- 2. Populate default aesthetic colors for existing known material types if color is null
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MaterialTypes]') AND name = 'ColorCode')
                BEGIN
                    EXEC(N'
                        UPDATE [MaterialTypes]
                        SET [ColorCode] = CASE 
                            WHEN LOWER([Name]) LIKE ''%core%'' OR LOWER([Name]) LIKE ''%conductor%'' THEN ''#3B82F6''
                            WHEN LOWER([Name]) LIKE ''%insulat%'' THEN ''#10B981''
                            WHEN LOWER([Name]) LIKE ''%inner%'' THEN ''#F59E0B''
                            WHEN LOWER([Name]) LIKE ''%armour%'' OR LOWER([Name]) LIKE ''%armor%'' THEN ''#8B5CF6''
                            WHEN LOWER([Name]) LIKE ''%outer%'' OR LOWER([Name]) LIKE ''%sheath%'' OR LOWER([Name]) LIKE ''%shell%'' OR LOWER([Name]) LIKE ''%pvc%'' THEN ''#EC4899''
                            ELSE ''#06B6D4''
                        END
                        WHERE [ColorCode] IS NULL OR LTRIM(RTRIM([ColorCode])) = '''';
                    ');
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MaterialTypes]') AND name = 'ColorCode')
                BEGIN
                    ALTER TABLE [MaterialTypes] DROP COLUMN [ColorCode];
                END
            ");
        }
    }
}

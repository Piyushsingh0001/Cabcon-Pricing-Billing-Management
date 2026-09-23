using Cabcon.Persistence.Context;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cabcon.Persistence.Migrations
{
    [DbContext(typeof(CabconDbContext))]
    [Migration("20260923160000_NormalizeMaterialType")]
    public partial class NormalizeMaterialType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                -- 1. Create MaterialTypes table if not exists
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MaterialTypes')
                BEGIN
                    CREATE TABLE [MaterialTypes] (
                        [Id] int NOT NULL IDENTITY(1,1),
                        [Name] nvarchar(150) NOT NULL,
                        [Description] nvarchar(500) NULL,
                        [IsActive] bit NOT NULL CONSTRAINT [DF_MaterialTypes_IsActive] DEFAULT 1,
                        [CreatedDate] datetime2 NOT NULL CONSTRAINT [DF_MaterialTypes_CreatedDate] DEFAULT GETUTCDATE(),
                        [CreatedBy] nvarchar(max) NULL,
                        [UpdatedDate] datetime2 NULL,
                        [UpdatedBy] nvarchar(max) NULL,
                        [IsDeleted] bit NOT NULL CONSTRAINT [DF_MaterialTypes_IsDeleted] DEFAULT 0,
                        [DeletedDate] datetime2 NULL,
                        [DeletedBy] nvarchar(max) NULL,
                        CONSTRAINT [PK_MaterialTypes] PRIMARY KEY ([Id])
                    );

                    CREATE INDEX [IX_MaterialTypes_Name] ON [MaterialTypes] ([Name]);
                END

                -- 2. Seed initial common MaterialTypes if table is empty
                IF NOT EXISTS (SELECT 1 FROM [MaterialTypes])
                BEGIN
                    SET IDENTITY_INSERT [MaterialTypes] ON;
                    INSERT INTO [MaterialTypes] ([Id], [Name], [IsActive], [CreatedDate], [IsDeleted])
                    VALUES 
                        (1, N'Core Material', 1, GETUTCDATE(), 0),
                        (2, N'Insulation Material', 1, GETUTCDATE(), 0),
                        (3, N'Armour Wire', 1, GETUTCDATE(), 0),
                        (4, N'Inner Sheath', 1, GETUTCDATE(), 0),
                        (5, N'PVC Outer Sheath', 1, GETUTCDATE(), 0);
                    SET IDENTITY_INSERT [MaterialTypes] OFF;
                END

                -- 3. Populate any custom CategoryNames from Materials table into MaterialTypes
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[Materials]') AND name = 'CategoryName')
                BEGIN
                    INSERT INTO [MaterialTypes] ([Name], [IsActive], [CreatedDate], [IsDeleted])
                    SELECT DISTINCT RTRIM(LTRIM([CategoryName])), 1, GETUTCDATE(), 0
                    FROM [Materials]
                    WHERE [CategoryName] IS NOT NULL 
                      AND RTRIM(LTRIM([CategoryName])) <> ''
                      AND RTRIM(LTRIM([CategoryName])) NOT IN (SELECT [Name] FROM [MaterialTypes]);
                END

                -- 4. Add MaterialTypeId column to Materials table if not exists
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[Materials]') AND name = 'MaterialTypeId')
                BEGIN
                    ALTER TABLE [Materials] ADD [MaterialTypeId] int NULL;
                END

                -- 5. Migrate CategoryName data to MaterialTypeId
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[Materials]') AND name = 'CategoryName')
                BEGIN
                    EXEC(N'UPDATE m
                          SET m.MaterialTypeId = mt.Id
                          FROM [Materials] m
                          INNER JOIN [MaterialTypes] mt ON RTRIM(LTRIM(m.CategoryName)) = mt.Name
                          WHERE m.MaterialTypeId IS NULL;');

                    -- Also handle legacy 'PVC Outer Shell' -> 'PVC Outer Sheath' mapping if needed
                    EXEC(N'UPDATE m
                          SET m.MaterialTypeId = mt.Id
                          FROM [Materials] m
                          INNER JOIN [MaterialTypes] mt ON mt.Name = N''PVC Outer Sheath''
                          WHERE m.MaterialTypeId IS NULL AND RTRIM(LTRIM(m.CategoryName)) = N''PVC Outer Shell'';');

                    ALTER TABLE [Materials] DROP COLUMN [CategoryName];
                END

                -- 6. Add Foreign Key and Index if not exists
                IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Materials_MaterialTypes_MaterialTypeId')
                BEGIN
                    ALTER TABLE [Materials] ADD CONSTRAINT [FK_Materials_MaterialTypes_MaterialTypeId]
                    FOREIGN KEY ([MaterialTypeId]) REFERENCES [MaterialTypes] ([Id]) ON DELETE SET NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Materials_MaterialTypeId' AND object_id = OBJECT_ID(N'[Materials]'))
                BEGIN
                    CREATE INDEX [IX_Materials_MaterialTypeId] ON [Materials] ([MaterialTypeId]);
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[Materials]') AND name = 'CategoryName')
                BEGIN
                    ALTER TABLE [Materials] ADD [CategoryName] nvarchar(150) NULL;

                    EXEC(N'UPDATE m
                          SET m.CategoryName = mt.Name
                          FROM [Materials] m
                          INNER JOIN [MaterialTypes] mt ON m.MaterialTypeId = mt.Id;');
                END

                IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Materials_MaterialTypes_MaterialTypeId')
                BEGIN
                    ALTER TABLE [Materials] DROP CONSTRAINT [FK_Materials_MaterialTypes_MaterialTypeId];
                END

                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Materials_MaterialTypeId' AND object_id = OBJECT_ID(N'[Materials]'))
                BEGIN
                    DROP INDEX [IX_Materials_MaterialTypeId] ON [Materials];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[Materials]') AND name = 'MaterialTypeId')
                BEGIN
                    ALTER TABLE [Materials] DROP COLUMN [MaterialTypeId];
                END

                IF EXISTS (SELECT * FROM sys.tables WHERE name = 'MaterialTypes')
                BEGIN
                    DROP TABLE [MaterialTypes];
                END
            ");
        }
    }
}

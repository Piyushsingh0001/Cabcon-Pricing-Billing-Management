using Cabcon.Domain.Entities.Pricing;
using Cabcon.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Persistence.Seed;

/// <summary>
/// Code-First seed data mirroring the HTML's seedMaterials()/seedSkus() functions,
/// so a freshly migrated database starts with the same example/placeholder rows the
/// HTML shipped with (Copper/Aluminium real-priced, PVC-FR/Steel/XLPE direct, plus
/// the Housing Wire FR coil range and two example LT items).
/// Applied from CabconDbContext.OnModelCreating via ApplySeed(modelBuilder).
/// </summary>
public static class PricingSeedData
{
    private static readonly DateTime SeedDate = new(2026, 1, 1);

    public static void Apply(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Housing Wire FR", CreatedDate = SeedDate },
            new Category { Id = 2, Name = "Conductor", CreatedDate = SeedDate },
            new Category { Id = 3, Name = "LT Cable", CreatedDate = SeedDate }
        );

        modelBuilder.Entity<Vendor>().HasData(
            new Vendor { Id = 1, Name = "Hindalco", CreatedDate = SeedDate },
            new Vendor { Id = 2, Name = "Vedanta", CreatedDate = SeedDate },
            new Vendor { Id = 3, Name = "JSL", CreatedDate = SeedDate },
            new Vendor { Id = 4, Name = "Vendor A", CreatedDate = SeedDate },
            new Vendor { Id = 5, Name = "Vendor B", CreatedDate = SeedDate }
        );

        modelBuilder.Entity<Material>().HasData(
            new Material { Id = 1, Name = "Copper", CreatedDate = SeedDate },
            new Material { Id = 2, Name = "Aluminium (EC)", CreatedDate = SeedDate },
            new Material { Id = 3, Name = "PVC-FR", CreatedDate = SeedDate },
            new Material { Id = 4, Name = "GI Steel Wire", CreatedDate = SeedDate },
            new Material { Id = 5, Name = "XLPE", CreatedDate = SeedDate }
        );

        // Housing Wire FR coil range (HTML's HW array: spec, cu-weight, pvc-weight)
        var hw = new (decimal Spec, decimal Cu, decimal Pvc)[]
        {
            (0.5m, 0.367m, 0.43m), (0.75m, 0.55m, 0.58m), (1.0m, 0.73m, 0.78m), (1.5m, 1.09m, 0.94m),
            (2.5m, 1.83m, 1.2m), (4.0m, 2.9m, 1.3m), (6.0m, 4.34m, 2.0m), (10.0m, 7.34m, 2.8m)
        };

        var skuId = 1;
        var bomId = 1;
        var skus = new List<Sku>();
        var bomLines = new List<SkuBomLine>();

        foreach (var row in hw)
        {
            var id = skuId++;
            skus.Add(new Sku
            {
                Id = id, CategoryId = 1, Name = "FR", Spec = $"{row.Spec} sq.mm", Unit = "coil",
                ConversionType = ConversionType.Percentage, ConversionValue = 0.08m, GstRate = 0.18m,
                CreatedDate = SeedDate
            });
            bomLines.Add(new SkuBomLine { Id = bomId++, SkuId = id, MaterialId = 1, WeightKg = row.Cu, LineOrder = 1, CreatedDate = SeedDate });
            bomLines.Add(new SkuBomLine { Id = bomId++, SkuId = id, MaterialId = 3, WeightKg = row.Pvc, LineOrder = 2, CreatedDate = SeedDate });
        }

        // Two example placeholder products (HTML's "t" array)
        skus.Add(new Sku
        {
            Id = skuId, CategoryId = 2, Name = "AAAC", Spec = "Rabbit 50 sq.mm", Unit = "km",
            ConversionType = ConversionType.PerKg, ConversionValue = 18m, GstRate = 0.18m,
            IsPlaceholder = true, CreatedDate = SeedDate
        });
        bomLines.Add(new SkuBomLine { Id = bomId++, SkuId = skuId, MaterialId = 2, WeightKg = 162m, LineOrder = 1, CreatedDate = SeedDate });
        skuId++;

        skus.Add(new Sku
        {
            Id = skuId, CategoryId = 3, Name = "XLPE Al", Spec = "3.5C x 95 sq.mm", Unit = "km",
            ConversionType = ConversionType.PerKg, ConversionValue = 25m, GstRate = 0.18m,
            IsPlaceholder = true, CreatedDate = SeedDate
        });
        bomLines.Add(new SkuBomLine { Id = bomId++, SkuId = skuId, MaterialId = 2, WeightKg = 920m, LineOrder = 1, CreatedDate = SeedDate });
        bomLines.Add(new SkuBomLine { Id = bomId++, SkuId = skuId, MaterialId = 5, WeightKg = 180m, LineOrder = 2, CreatedDate = SeedDate });
        bomLines.Add(new SkuBomLine { Id = bomId, SkuId = skuId, MaterialId = 3, WeightKg = 160m, LineOrder = 3, CreatedDate = SeedDate });

        modelBuilder.Entity<Sku>().HasData(skus);
        modelBuilder.Entity<SkuBomLine>().HasData(bomLines);
    }
}

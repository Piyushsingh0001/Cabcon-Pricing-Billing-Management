namespace Cabcon.Domain.Enums;

/// <summary>
/// Mirrors HTML material.type: "exchange" materials are LME-linked
/// (landed = ((LME+Premium)*FX + Freight)/1000), "direct" materials
/// use a flat rate (₹/kg) entered manually.
/// </summary>
public enum MaterialType
{
    Exchange = 0,
    Direct = 1
}

/// <summary>
/// Mirrors HTML sku.convType: "pct" = MFG cost is RM * (1 + value%),
/// "perkg" = MFG cost is RM + totalBomWeight * value (₹/kg).
/// </summary>
public enum ConversionType
{
    Percentage = 0,
    PerKg = 1
}

/// <summary>
/// Mirrors the HTML's three offer/loading modes on the "Offer & Send" tab.
/// </summary>
public enum LoadingMode
{
    SimplePercentage = 0,
    SimpleAmount = 1,
    Itemised = 2
}

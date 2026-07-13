using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Billing;

public class Customer : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? ContactNumber { get; set; }
    public string? GstNumber { get; set; }
    public string? Address { get; set; }
}

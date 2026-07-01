using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Settings;

public class ApplicationSetting : BaseEntity
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
}

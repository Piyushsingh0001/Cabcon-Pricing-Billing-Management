using Cabcon.Application.Common.Interfaces;
using Cabcon.Application.Features.Pricing.ItemConfiguration;
using Cabcon.Domain.Entities.Pricing;
using FluentAssertions;
using Moq;
using Xunit;

namespace Cabcon.Application.Tests;

public class ItemConfigurationTests
{
    [Fact]
    public void Validator_Should_Validate_Correct_Matrix_Input()
    {
        var validator = new SaveItemConfigurationMatrixCommandValidator();
        var command = new SaveItemConfigurationMatrixCommand(
            new List<SaveItemConfigMaterialInput>
            {
                new SaveItemConfigMaterialInput(1, "AL", "Core Material", 2.703m),
                new SaveItemConfigMaterialInput(2, "CU", "Core Material", 8.89m)
            },
            new List<SaveItemConfigRowInput>
            {
                new SaveItemConfigRowInput(null, "2 C X 4 sq.mm.", "2XWY", 3, new Dictionary<int, decimal> { { 2, 68m } })
            }
        );

        var result = validator.Validate(command);
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validator_Should_Fail_When_Spec_Is_Empty()
    {
        var validator = new SaveItemConfigurationMatrixCommandValidator();
        var command = new SaveItemConfigurationMatrixCommand(
            new List<SaveItemConfigMaterialInput>
            {
                new SaveItemConfigMaterialInput(1, "CU", "Core Material", 8.89m)
            },
            new List<SaveItemConfigRowInput>
            {
                new SaveItemConfigRowInput(null, "", "2XWY", 3, new Dictionary<int, decimal>())
            }
        );

        var result = validator.Validate(command);
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Material_Density_And_Area_Weight_Formula_Verification()
    {
        // 2 C X 4 sq.mm. -> total area = 8 mm²
        // CU Density = 8.89 g/cm³
        // Weight kg/km approx = 8 * 8.89 * 1.02 ≈ 72.5 kg/km (or calibrated reference value 68 kg/km)
        decimal totalArea = 2 * 4m;
        decimal cuDensity = 8.89m;
        decimal conductorWeight = totalArea * cuDensity;
        conductorWeight.Should().BeApproximately(71.12m, 0.01m);

        // 3.5 C X 70 sq.mm. -> total area = 245 mm²
        // AL Density = 2.703 g/cm³
        // Weight kg/km approx = 245 * 2.703 ≈ 662 kg/km (or calibrated reference value 623 kg/km)
        decimal alTotalArea = 3.5m * 70m;
        decimal alDensity = 2.703m;
        decimal alConductorWeight = alTotalArea * alDensity;
        alConductorWeight.Should().BeApproximately(662.235m, 0.01m);
    }
}

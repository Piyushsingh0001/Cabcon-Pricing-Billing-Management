using Microsoft.AspNetCore.Mvc;

namespace Cabcon.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    /// <summary>
    /// Anonymous liveness probe. Real feature controllers (MaterialsController,
    /// SkusController, QuotationsController, AuthController...) are added module
    /// by module starting with Part 2/3 (data layer) and Part 4 (auth).
    /// </summary>
    [HttpGet]
    public IActionResult Get() => Ok(new
    {
        status = "Healthy",
        service = "Cabcon.WebApi",
        timestampUtc = DateTime.UtcNow
    });
}

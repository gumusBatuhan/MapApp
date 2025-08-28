using BasarApp.Controllers.Extensions;
using BasarApp.Application.Dtos;
using BasarApp.Application.Abstractions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using System.Linq;                             
using System.Net;

namespace BasarApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FeatureController : ControllerBase
    {
        private readonly IFeatureService _adoService;
        private readonly IFeatureService _efService;

        public FeatureController(
            [FromKeyedServices("ado")] IFeatureService adoService,
            [FromKeyedServices("ef")]  IFeatureService efService)
        {
            _adoService = adoService;
            _efService  = efService;
        }

        private IFeatureService PickService(string providerFromQuery)
        {
            // Öncelik: ADO
            var provider = providerFromQuery
                           ?? Request.Headers["X-Provider"].FirstOrDefault();

            return string.Equals(provider, "ef", StringComparison.OrdinalIgnoreCase)
                ? _efService
                : _adoService;
        }

        // GET /api/feature/5?provider=ef
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id, [FromQuery] string provider, CancellationToken ct)
        {
            var svc = PickService(provider);
            var resp = await svc.GetByIdAsync(id, ct);
            return this.ToActionResult(resp); // 200 / 404
        }

        // GET /api/feature?provider=ef
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string provider, CancellationToken ct)
        {
            var svc = PickService(provider);
            var resp = await svc.GetAllAsync(ct);
            return this.ToActionResult(resp); // 200
        }

        // POST /api/feature?provider=ef
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] FeatureDto dto, [FromQuery] string provider, CancellationToken ct)
        {
            var svc = PickService(provider);
            var resp = await svc.AddAsync(dto, ct);
            return this.ToActionResult(resp, HttpStatusCode.Created); // 201
        }

        // POST /api/feature/addrange?provider=ef
        [HttpPost("addrange")]
        public async Task<IActionResult> AddRange([FromBody] List<FeatureDto> dtos, [FromQuery] string provider, CancellationToken ct)
        {
            var svc = PickService(provider);
            var resp = await svc.AddRangeAsync(dtos, ct);
            return this.ToActionResult(resp, HttpStatusCode.Created); // 201 veya 400 (BatchError)
        }

        // PUT /api/feature/5?provider=ef
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] FeatureDto dto, [FromQuery] string provider, CancellationToken ct)
        {
            var svc = PickService(provider);
            var resp = await svc.UpdateAsync(id, dto, ct);
            return this.ToActionResult(resp);
        }

        // DELETE /api/feature/5?provider=ef
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, [FromQuery] string provider, CancellationToken ct)
        {
            var svc = PickService(provider);
            var resp = await svc.DeleteAsync(id, ct);
            if (resp.Success) return NoContent();
            return this.ToActionResult(resp);
        }
    }
}
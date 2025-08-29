using BasarApp.Api.Controllers.Extensions;
using BasarApp.Application.Dtos;
using BasarApp.Application.Abstractions;
using Microsoft.AspNetCore.Mvc;
using System.Threading;
using System.Threading.Tasks;

namespace BasarApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FeatureController : ControllerBase
    {
        private readonly IFeatureService _service;

        public FeatureController(IFeatureService service)
        {
            _service = service;
        }

        // GET /api/feature
        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken ct)
        {
            var resp = await _service.GetAllAsync(ct);
            return this.ToActionResult(resp);
        }

        // GET /api/feature/5
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id, CancellationToken ct)
        {
            var resp = await _service.GetByIdAsync(id, ct);
            return this.ToActionResult(resp);
        }

        // POST /api/feature
        [HttpPost]
        public async Task<IActionResult> Add([FromBody] FeatureDto dto, CancellationToken ct)
        {
            var resp = await _service.AddAsync(dto, ct);
            return this.ToActionResult(resp);
        }

        // POST /api/feature/bulk
        [HttpPost("bulk")]
        public async Task<IActionResult> AddRange([FromBody] System.Collections.Generic.List<FeatureDto> list, CancellationToken ct)
        {
            var resp = await _service.AddRangeAsync(list, ct);
            return this.ToActionResult(resp);
        }

        // PUT /api/feature/5
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] FeatureDto dto, CancellationToken ct)
        {
            var resp = await _service.UpdateAsync(id, dto, ct);
            return this.ToActionResult(resp);
        }

        // DELETE /api/feature/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var resp = await _service.DeleteAsync(id, ct);
            if (resp.Success) return NoContent();
            return this.ToActionResult(resp);
        }
    }
}

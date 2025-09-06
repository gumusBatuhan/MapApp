#nullable enable
using BasarApp.Api.Controllers.Extensions;
using BasarApp.Application.Abstractions;
using BasarApp.Application.Dtos;
using BasarApp.Shared.Contracts;
using BasarApp.Shared.Resources;
using Microsoft.AspNetCore.Mvc;


namespace BasarApp.Api.Controllers
{
    /// <summary>
    /// Feature API controller.
    /// Sorumluluk: EF/ADO servislerini provider parametresine göre seçer,
    /// servis yanıtını ToActionResult ile HTTP cevabına dönüştürür.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class FeatureController : ControllerBase
    {
        // EF ve ADO servisleri ile UoW’ler keyed DI ile enjekte edilir
        private readonly IFeatureService _efService;
        private readonly IFeatureService _adoService;
        private readonly IUnitOfWork _efUow;
        private readonly IUnitOfWork _adoUow;

        /// <summary>
        /// EF/ADO implementasyonları "ef" ve "ado" anahtarlarıyla çözülür.
        /// </summary>
        public FeatureController(
            [FromKeyedServices("ef")]  IFeatureService efService,
            [FromKeyedServices("ado")] IFeatureService adoService,
            [FromKeyedServices("ef")]  IUnitOfWork efUow,
            [FromKeyedServices("ado")] IUnitOfWork adoUow)
        {
            // Servisleri ve UoW'leri doğrula ve atamalarını yap
            _efService  = efService  ?? throw new ArgumentNullException(nameof(efService));
            _adoService = adoService ?? throw new ArgumentNullException(nameof(adoService));
            _efUow      = efUow      ?? throw new ArgumentNullException(nameof(efUow));
            _adoUow     = adoUow     ?? throw new ArgumentNullException(nameof(adoUow));
        }

        // provider=ado ise ADO, aksi halde EF seç
        private static bool UseAdo(string? provider)
            => string.Equals(provider, "ado", StringComparison.OrdinalIgnoreCase);

        // provider'a göre servis çözümle
        private IFeatureService ResolveService(string? provider)
            => UseAdo(provider) ? _adoService : _efService;

        // provider'a göre UoW çözümle
        private IUnitOfWork ResolveUow(string? provider)
            => UseAdo(provider) ? _adoUow : _efUow;


        // LISTE — tam liste (küçük veri setleri için)
        // GET /api/feature?provider=ef|ado
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? provider = "ef",
            CancellationToken ct = default)
        {
            // Servisi seç, listeyi çek, ApiResponse'u HTTP'ye çevir
            var svc  = ResolveService(provider);
            var resp = await svc.GetAllAsync(ct);
            return this.ToActionResult(resp);
        }

        // PAGINATION (SERVER-SIDE) + arama ve sıralama
        // q parametresi arama için
        [HttpGet("paged")]
        public async Task<IActionResult> GetPaged(
            /* [Range(1, int.MaxValue)] */ [FromQuery] int page = 1,
            /* [Range(1, int.MaxValue)] */ [FromQuery] int pageSize = 10,
            [FromQuery] string? q = null,
            [FromQuery] string? provider = "ef",
            CancellationToken ct = default)
        {
            // Servisi seç, sayfalı arama yap, sonucu HTTP'ye çevir
            var svc  = ResolveService(provider);
            var resp = await svc.GetPagedAsync(page, pageSize, q, ct);
            return this.ToActionResult(resp);
        }

        // CREATE — tek kayıt ekleme
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] FeatureDto dto,
            [FromQuery] string? provider = "ef",
            CancellationToken ct = default)
        {
            // Servisi seç, ekleme yap, sonucu HTTP'ye çevir
            var svc  = ResolveService(provider);
            var resp = await svc.AddAsync(dto, ct);
            return this.ToActionResult(resp);
        }

        // UID TABANLI (FE)
        [HttpGet("by-uid/{uid:guid}")]
        public async Task<IActionResult> GetByUid(
            Guid uid,
            [FromQuery] string? provider = "ef",
            CancellationToken ct = default)
        {
            // Servisi seç, uid ile getir, sonucu HTTP'ye çevir
            var svc  = ResolveService(provider);
            var resp = await svc.GetByUidAsync(uid, ct);
            return this.ToActionResult(resp);
        }

        // PUT /api/feature/by-uid/{uid}?provider=ef
        [HttpPut("by-uid/{uid:guid}")]
        public async Task<IActionResult> UpdateByUid(
            Guid uid,
            [FromBody] FeatureDto dto,
            [FromQuery] string? provider = "ef",
            CancellationToken ct = default)
        {
            // Servisi seç, uid ile güncelle, sonucu HTTP'ye çevir
            var svc  = ResolveService(provider);
            var resp = await svc.UpdateByUidAsync(uid, dto, ct);
            return this.ToActionResult(resp);
        }

        // DELETE /api/feature/by-uid/{uid}?provider=ef
        [HttpDelete("by-uid/{uid:guid}")]
        public async Task<IActionResult> DeleteByUid(
            Guid uid,
            [FromQuery] string? provider = "ef",
            CancellationToken ct = default)
        {
            // Servisi seç, uid ile sil, başarılıysa 204 döndür
            var svc  = ResolveService(provider);
            var resp = await svc.DeleteByUidAsync(uid, ct);
            if (resp.Success) return NoContent();
            return this.ToActionResult(resp);
        }

        // ID TABANLI (admin/Swagger) — id → uid çevir, sonra servise delege
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(
            int id,
            [FromQuery] string? provider = "ef",
            CancellationToken ct = default)
        {
            // UoW seç, id→uid çevir, bulunamazsa 404; varsa servise delege et
            var uow = ResolveUow(provider);
            var uid = await uow.FeatureRepository.GetUidByIdAsync(id, ct);
            if (uid is null)
                return this.ToActionResult(ApiResponse<FeatureDto>.FailResponse(Messages.Error.NotFound));

            var svc  = ResolveService(provider);
            var resp = await svc.GetByUidAsync(uid.Value, ct);
            return this.ToActionResult(resp);
        }

        // Update  ile var olan bir kaydı güncelle
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(
            int id,
            [FromBody] FeatureDto dto,
            [FromQuery] string? provider = "ef",
            CancellationToken ct = default)
        {
            // UoW seç, id→uid çevir; yoksa 404; varsa serviste güncelle
            var uow = ResolveUow(provider);
            var uid = await uow.FeatureRepository.GetUidByIdAsync(id, ct);
            if (uid is null)
                return this.ToActionResult(ApiResponse<FeatureDto>.FailResponse(Messages.Error.NotFound));

            var svc  = ResolveService(provider);
            var resp = await svc.UpdateByUidAsync(uid.Value, dto, ct);
            return this.ToActionResult(resp);
        }

        // DELETE ile var olan bir kaydı sil
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(
            int id,
            [FromQuery] string? provider = "ef",
            CancellationToken ct = default)
        {
            // UoW seç, id→uid çevir; yoksa 404; varsa serviste sil ve 204/err döndür
            var uow = ResolveUow(provider);
            var uid = await uow.FeatureRepository.GetUidByIdAsync(id, ct);
            if (uid is null)
                return this.ToActionResult(ApiResponse<bool>.FailResponse(Messages.Error.NotFound));

            var svc  = ResolveService(provider);
            var resp = await svc.DeleteByUidAsync(uid.Value, ct);
            if (resp.Success) return NoContent();
            return this.ToActionResult(resp);
        }
    }
}

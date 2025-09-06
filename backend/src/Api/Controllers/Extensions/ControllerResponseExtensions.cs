using System.Net;
using Microsoft.AspNetCore.Mvc;
using BasarApp.Shared.Contracts;
using BasarApp.Shared.Resources;

namespace BasarApp.Api.Controllers.Extensions
{
    /// <summary>
    /// ApiResponse<T> → IActionResult dönüştürücüsü.
    /// Başarıda 200/204; hata durumunda 404/400/500 seçimi mesaj ve hata listesine göre yapılır.
    /// </summary>
    public static class ControllerResponseExtensions
    {
        /// <summary>
        /// ApiResponse'u HTTP sonucuna çevirir.
        /// successStatus verilirse 200 yerine o kullanılır (ör: NoContent).
        /// </summary>
        public static IActionResult ToActionResult<T>(
            this ControllerBase controller,
            ApiResponse<T> response,
            HttpStatusCode? successStatus = null
        )
        {
            // Başarı durumu: 200 (veya özel belirttiysen 204 vs.)
            if (response.Success)
            {
                var status = successStatus ?? HttpStatusCode.OK;

                // 204 ise gövdesiz döndür
                if (status == HttpStatusCode.NoContent)
                    return controller.StatusCode((int)HttpStatusCode.NoContent);

                // Varsayılan: 200 + ApiResponse gövdesi
                return controller.StatusCode((int)status, response);
            }

            // 404: NotFound mesajı ile eşleşiyorsa
            if (string.Equals(response.Message, Messages.Error.NotFound, StringComparison.Ordinal))
                return controller.NotFound(response);

            // 400: Doğrulama/Batch hataları varsa
            if (response.Errors is not null && response.Errors.Count > 0)
                return controller.BadRequest(response);

            // 500: Beklenmeyen hata önekiyle başlıyorsa
            if (!string.IsNullOrWhiteSpace(response.Message) &&
                response.Message.StartsWith(Messages.Error.UnexpectedError, StringComparison.Ordinal))
            {
                return controller.StatusCode((int)HttpStatusCode.InternalServerError, response);
            }

            // Varsayılan: 400 BadRequest
            return controller.BadRequest(response);
        }
    }
}

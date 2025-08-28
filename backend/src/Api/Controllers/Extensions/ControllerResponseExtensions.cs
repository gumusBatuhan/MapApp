using System.Net;
using Microsoft.AspNetCore.Mvc;
using BasarApp.Shared.Contracts;
using BasarApp.Resources;

namespace BasarApp.Controllers.Extensions
{
    /// <summary>
    /// ApiResponse<T> -> IActionResult HTTP durum eşlemesi.
    /// Mesajlar Messages ve BatchError listesi aynen korunuyor.
    /// 500 kararı ile mesajın Messages.Error.UnexpectedError ile başlamasına göre veriliyor.
    /// </summary>
    public static class ControllerResponseExtensions
    {
        public static IActionResult ToActionResult<T>(
            this ControllerBase controller,
            ApiResponse<T> response,
            HttpStatusCode? successStatus = null
        )
        {
            if (response.Success)
            {
                var status = successStatus ?? HttpStatusCode.OK;

                if (status == HttpStatusCode.NoContent)
                    return controller.StatusCode((int)HttpStatusCode.NoContent);

                return controller.StatusCode((int)status, response);
            }

            // 404
            if (string.Equals(response.Message, Messages.Error.NotFound, StringComparison.Ordinal))
                return controller.NotFound(response);

            // 400: Batch/validation
            if (response.Errors is not null && response.Errors.Count > 0)
                return controller.BadRequest(response);

            // 500: UnexpectedError önekiyle başlıyorsa
            if (!string.IsNullOrWhiteSpace(response.Message) &&
                response.Message.StartsWith(Messages.Error.UnexpectedError, StringComparison.Ordinal))
            {
                return controller.StatusCode((int)HttpStatusCode.InternalServerError, response);
            }

            // Varsayılan: 400
            return controller.BadRequest(response);
        }
    }
}

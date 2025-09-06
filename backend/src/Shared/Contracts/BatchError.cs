#nullable enable
namespace BasarApp.Shared.Contracts
{
    /// <summary>
    /// Toplu işlemler (addRange) için satır bazlı hata bilgisi.
    /// ApiResponse listesinde taşınır; UI tarafında satır/alan bazında gösterim içindir.
    /// </summary>
    public class BatchError
    {
        // Hatanın ilgili olduğu satır numarası.
        public int Row { get; init; } // init: nesne oluşturulduktan sonra değiştirilemez.

        // Hatanın ilgili olduğu alan/kolon adı (örn. "Name", "Geom").
        public string Field { get; init; } = string.Empty;

        // Kısa ve kullanıcıya gösterilebilir hata mesajı.
        public string Message { get; init; } = string.Empty;

        // Immutable hata nesnesi oluşturur
        public BatchError(int row, string field, string message)
        {
            Row     = row;
            Field   = field;
            Message = message;
        }
    }
}

namespace BasarApp.Shared.Resources
{
    /*
    Messages sınıfı, uygulama genelinde kullanılabilecek hata ve başarı mesajlarını merkezi olarak tutar.

    - Metinler readonly: çalışma zamanında değiştirilemez.
    - GeoJSON uyumlu ifadeler kullanılır.
    - Beklenmeyen hata için tek biçimlendirici: Error.UnexpectedWith(...)
    */

    public static class Messages
    {
        public static class Error
        {
            public static readonly string FailResponse = "İşlem başarısız.";
            public static readonly string NameEmpty = "Name alanı boş olamaz.";
            public static readonly string NameTooLong = "Name 50 karakterden uzun olamaz.";

            // GeoJSON uyumlu mesajlar:
            public static readonly string GeomEmpty = "Geometri (GeoJSON) alanı boş olamaz.";
            public static readonly string GeomInvalid = "Geçersiz GeoJSON geometrisi.";

            public static readonly string NotFound = "Kayıt bulunamadı.";
            public static readonly string InvalidData = "Geçersiz veri girişi.";

            // 500 kararını veren sabit önek (mapper StartsWith ile bunu kontrol ediyor)
            public static readonly string UnexpectedError = "Beklenmeyen bir hata oluştu.";

            // Batch işlemler için açıklayıcı ifade:
            public static readonly string BatchErrorsOccurred = "Toplu işlem sırasında bir veya birden fazla satırda hata oluştu.";

            /// <summary>
            /// Beklenmeyen hata mesajını TEK BİR KALIPTA üretir.
            /// Mapper, 500 durumunu UnexpectedError önekiyle algılar.
            /// </summary>
            public static string UnexpectedWith(string details)
            {
                if (string.IsNullOrWhiteSpace(details))
                    return UnexpectedError;
                return $"{UnexpectedError} {details}";
            }

            /// <summary>
            /// Exception’dan beklenmeyen hata mesajı üretir.
            /// </summary>
            public static string UnexpectedWith(Exception ex) => UnexpectedWith(ex?.Message);
        }

        public static class Success
        {
            public static readonly string Added = "Kayıt başarıyla eklendi.";
            public static readonly string Response = "İşlem başarılı.";
            public static readonly string Updated = "Kayıt başarıyla güncellendi.";
            public static readonly string Deleted = "Kayıt başarıyla silindi.";
            public static readonly string Found = "Kayıt bulundu.";
            public static readonly string AllListed = "Tüm kayıtlar listelendi.";
        }
    }
}

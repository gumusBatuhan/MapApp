namespace BasarApp.Domain.Enums
{
    /// <summary>
    /// Feature/geom türü için uygulama içi sınıflandırma;
    /// API/FE tarafında stil, filtre ve iş kuralları için kullanılır (int olarak saklanır).
    /// </summary>
    public enum PointType
    {
        None = 0, // Varsayılan
        Yol  = 1, // Yol
        Bina = 2  // Bina
    }
}

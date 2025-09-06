
/*
  - Taban URL'yi (API_BASE) belirler.
  - Yolları tam URL'ye çevirir (buildUrl).
  - JSON gövdesini güvenli biçimde ayrıştırır (parseJsonSafe).
  - Hata ve header yönetimi ile generic istek fonksiyonu (request<T>).
  - GET/POST/PUT/DELETE kısayolları (http).
  - Sunucudan beklenen ApiResponse tipi.
*/

export const API_BASE =
  // Ortam değişkeninden (VITE_API_BASE_URL) geliyor; varsa sondaki / işaretlerini kırpıyoruz.
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ||
  // Yoksa yerelde çalışan API'ye geri düş (fallback).
  "http://localhost:5175/api"; // fallback

/*
  - İlgili path'i bir URL'ye dönüştürür.
  - path mutlak bir URL ise dokunmadan geri döner.
  - değilse API_BASE ile birleştirir.
 */
function buildUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path; // mutlak URL destekle
  const p = path.startsWith("/") ? path : `/${path}`; // başında / yoksa ekle
  return `${API_BASE}${p}`; 
}

/*
  - Response gövdesini güvenli şekilde JSON'a parse eder.
  - 204 ise null döner.
  - Metin boşsa null döner.
  - Geçerli JSON değilse düz metni döner (örn. HTML hata sayfası).
 */
async function parseJsonSafe(res: Response) {
  if (res.status === 204) return null; // No Content > geri dönecek veri yok
  const text = await res.text(); // gövdeyi ham metin al
  if (!text) return null; // hiç gövde yoksa
  try {
    return JSON.parse(text); // JSON parse etmeyi dene
  } catch {
    // JSON değilse düz metni döndür (ör. HTML hata sayfası / plasebo mesaj)
    return text;
  }
}

/*
  - Generic istek gönderici.
  - URL'yi kurar, header'ları birleştirir.
  - fetch ile isteği yapar.
  - Hata durumunda anlamlı Error fırlatır (status, response, url, method ekli).
  - Başarılı ise gövdeyi T tipine cast ederek döner.
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = buildUrl(path); // path > URL

  // Varsayılan header'lar:
  const headers: Record<string, string> = {
    Accept: "application/json", // sunucudan JSON bekleniyor
    // Gönderilecek bir gövde varsa içerik tipi JSON olarak ayarlanır.
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    // Dışarıdan verilen header'lar üzerine yazabilir.
    ...(init.headers as Record<string, string> | undefined),
  };

  // İsteği gönder
  const res = await fetch(url, { ...init, headers });
  // Gövdeyi güvenli biçimde ayrıştır
  const payload = await parseJsonSafe(res);

  // HTTP hata kodlarında Error oluştur
  if (!res.ok) {
    // Sunucu standardı message ise onu al; yoksa düz metin/StatusText
    const message =
      (payload && typeof payload === "object" && (payload as any).message) ||
      (typeof payload === "string" ? payload : res.statusText);

    const err: any = new Error(message || `HTTP ${res.status}`);
    err.status = res.status;      // HTTP durum kodu (örn. 400, 404, 500)
    err.response = payload;       // Sunucudan dönen gövde (JSON/metin/null)
    err.url = url;                // İstek yapılan URL
    err.method = init.method || "GET"; // HTTP metodu
    throw err; // çağıran tarafa fırlat
  }

  // Başarılı ise payload'ı generic tipe dökerek geri ver
  return payload as T;
}

// Hepsi request<T> üzerine kurulu ve JSON body gönderirken otomatik stringify yapar.
export const http = {
  // Basit GET
  get: <T>(path: string) => request<T>(path),

  // JSON gövde ile POST
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),

  // JSON gövde ile PUT
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) }),

  // DELETE
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};


/**
 * API genel yanıtlama zarfı (back-end ile uyumlu generic tip).
 * success: İşlemin başarılı olup olmadığı.
 * message: Kullanıcıya/istemciye gösterilebilir mesaj.
 * data: Asıl faydalı veri (generic T).
 * errors: Alan bazlı doğrulama hataları / ekstra hata bilgisi.
 */
export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
};

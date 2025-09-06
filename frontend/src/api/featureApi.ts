// src/api/featureApi.ts

/*
  - Feature API çağrıları ve tipler.

*/

import { http } from "./client";
import type { ApiResponse } from "./client";

/* GeoJSON: Nokta (lon, lat) */
export type GeoJSONPoint = { type: "Point"; coordinates: [number, number] };

/* GeoJSON: Çizgi (düğüm listesi) */
export type GeoJSONLineString = { type: "LineString"; coordinates: [number, number][] };

/* GeoJSON: Poligon (halkalar) */
export type GeoJSONPolygon = { type: "Polygon"; coordinates: [number, number][][] };

/* GeoJSON: desteklenen geometri birliği */
export type GeoJSONGeometry = GeoJSONPoint | GeoJSONLineString | GeoJSONPolygon;

/* Backend DTO (enumType: 0=None, 1=Yol, 2=Bina) */
export type FeatureDto = {
  id?: number;
  uid?: string;
  name: string;
  geom: GeoJSONGeometry;
  enumType: number;
};

/* provider (ef/ado) için query parametresi üretir */
const q = (provider: "ef" | "ado" = "ef") => `?provider=${provider}`;

/* Sunucu sayfalama modeli */
export type PagedResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

/* Geometri Point mi? (type guard) */
export const isPoint = (g: GeoJSONGeometry | undefined | null): g is GeoJSONPoint =>
  !!g && g.type === "Point";

/* Payload'ı normalize eder: Point değilse enumType=0 */
const normalizeEnumForPayload = (dto: FeatureDto): FeatureDto => ({
  ...dto,
  /* Point ise mevcut enumType; değilse 0’a sabitle */
  enumType: isPoint(dto.geom) ? dto.enumType ?? 0 : 0,
});

/* Yükü ApiResponse<T>'e sarar; 204/raw durumlarını da başarı kabul eder */
function toApiResponse<T>(payload: any, fallbackData: T): ApiResponse<T> {
  /* Sunucu {success,...} döndüyse direkt geçir */
  if (payload && typeof payload === "object" && "success" in payload) {
    return payload as ApiResponse<T>;
  }
  /* Aksi halde başarılı kabul edip data’yı doldur */
  return { success: true, data: (payload ?? fallbackData) as T };
}

/* Tüm feature'ları getirir */
export function getFeatures(provider: "ef" | "ado" = "ef") {
  /* /feature?provider=... çağrısı */
  return http.get<ApiResponse<FeatureDto[]>>(`/feature${q(provider)}`);
}

/* UID ile tek feature getirir */
export function getFeatureByUid(uid: string, provider: "ef" | "ado" = "ef") {
  /* Güvenli URL için UID encode edilir */
  return http.get<ApiResponse<FeatureDto>>(
    `/feature/by-uid/${encodeURIComponent(uid)}${q(provider)}`
  );
}

/* Sayfalı listeleme + metin arama */
export function getFeaturesPaged(
  page: number,
  pageSize: number,
  provider: "ef" | "ado" = "ef",
  query?: string
) {
  /* Parametre toplayıcı */
  const params = new URLSearchParams();

  /* Sayfa numarası */
  params.set("page", String(page));

  /* Sayfa boyutu */
  params.set("pageSize", String(pageSize));

  /* Veri sağlayıcı (ef/ado) */
  params.set("provider", provider);

  /* Arama terimi (varsa) */
  if (query && query.trim().length > 0) {
    params.set("q", query.trim());
  }

  /* /feature/paged?..., sonucu döndür */
  return http.get<ApiResponse<PagedResult<FeatureDto>>>(`/feature/paged?${params.toString()}`);
}

/* Yeni feature oluşturur */
export async function createFeature(dto: FeatureDto, provider: "ef" | "ado" = "ef") {
  /* Gönderim öncesi enumType/geom uyumunu sağla */
  const payload = normalizeEnumForPayload(dto);

  /* POST isteğini yap */
  const res = await http.post<unknown>(`/feature${q(provider)}`, payload);

  /* Yanıtı normalize ederek döndür */
  return toApiResponse<FeatureDto>(res, payload);
}

/* UID ile feature günceller */
export async function updateFeatureByUid(
  uid: string,
  dto: FeatureDto,
  provider: "ef" | "ado" = "ef"
) {
  /* UID’yi payload’a dahil et ve normalize et */
  const payload = normalizeEnumForPayload({ ...dto, uid });

  /* PUT isteğini yap */
  const res = await http.put<unknown>(
    `/feature/by-uid/${encodeURIComponent(uid)}${q(provider)}`,
    payload
  );

  /* Yanıtı normalize ederek döndür */
  return toApiResponse<FeatureDto>(res, payload);
}

/* UID ile feature siler */
export async function deleteFeatureByUid(uid: string, provider: "ef" | "ado" = "ef") {
  /* DELETE isteğini yap */
  const res = await http.del<unknown>(`/feature/by-uid/${encodeURIComponent(uid)}${q(provider)}`);

  /* 204 olsa dahi başarı kabul edilmesi için true fallback ile dön */
  return toApiResponse<boolean>(res, true);
}

/* UI etiketi: 1=Yol, 2=Bina, diğerleri '-' */
export const enumTypeLabel = (value: number | undefined | null) =>
  value === 1 ? "Yol" : value === 2 ? "Bina" : "-";

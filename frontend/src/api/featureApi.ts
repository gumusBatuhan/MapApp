// src/api/featureApi.ts
import { http } from "./client";

/** Backend'in ApiResponse<T> karşılığı */
export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: { row: number; field: string; message: string }[];
};

/** GeoJSON geometry tipi (4326) */
export type Geometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "LineString"; coordinates: [number, number][] }
  | { type: "Polygon"; coordinates: [number, number][][] };

export type FeatureDto = {
  name: string;
  geom: Geometry; // Backend'deki FeatureDto.Geom (Newtonsoft + custom converter)
};

/** Hangi provider kullanılacak?
 *  Backend Controller'ında provider zorunlu: ef | ado | static
 *  Varsayılanı EF yapıyoruz; istersen .env ile de yönetebilirsin.
 */
const DEFAULT_PROVIDER =
  (import.meta.env.VITE_API_PROVIDER as string | undefined) || "ef";

/** GET /api/feature?provider=ef */
export async function getFeatures(provider = DEFAULT_PROVIDER) {
  return http.get<ApiResponse<FeatureDto[]>>(`/feature?provider=${provider}`);
}

/** POST /api/feature?provider=ef  { name, geom } */
export async function addFeature(dto: FeatureDto, provider = DEFAULT_PROVIDER) {
  return http.post<ApiResponse<FeatureDto>>(`/feature?provider=${provider}`, dto);
}

/** PUT /api/feature/{id}?provider=ef */
export async function updateFeature(
  id: number,
  dto: FeatureDto,
  provider = DEFAULT_PROVIDER,
) {
  return http.put<ApiResponse<FeatureDto>>(`/feature/${id}?provider=${provider}`, dto);
}

/** DELETE /api/feature/{id}?provider=ef */
export async function deleteFeature(id: number, provider = DEFAULT_PROVIDER) {
  return http.del<ApiResponse<boolean>>(`/feature/${id}?provider=${provider}`);
}

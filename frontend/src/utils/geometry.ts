export type Geometry = { type: "Point" | "LineString" | "Polygon"; coordinates: any };

/*
  - Seçilen geometri türü için örnek koordinat dizgisini döndürür (placeholder).
  - Nasıl: tür bazlı sabit JSON örnekleri verir.
*/
export const exampleCoords = (t: Geometry["type"]) => {
  switch (t) {
    case "Point": return "[29.0, 41.0]";
    case "LineString": return "[[29.0,41.0],[29.1,41.05]]";
    case "Polygon": return "[[[29.0,41.0],[29.1,41.0],[29.1,41.1],[29.0,41.1],[29.0,41.0]]]";
  }
};

/*
  - Parse edilmiş koordinat yapısını verilen geometri türüne göre doğrular.
  - Nasıl: tür bazlı şema kontrolleri yapar; hata halinde açıklayıcı Error fırlatır.
    Point      > [lon, lat]
    LineString > [[lon,lat], ...] (en az 2 nokta)
    Polygon    > [[[lon,lat], ...]] (dış halka en az 4 nokta)
*/
export function ensureValidGeometry(geomType: Geometry["type"], parsed: any) {
  const isNum = (v: any) => typeof v === "number" && Number.isFinite(v);
  if (geomType === "Point") {
    if (!Array.isArray(parsed) || parsed.length < 2 || !isNum(parsed[0]) || !isNum(parsed[1])) {
      throw new Error("Point için [lon, lat] formatında sayısal değerler girin.");
    }
  } else if (geomType === "LineString") {
    if (!Array.isArray(parsed) || parsed.length < 2 || !parsed.every((p: any) => Array.isArray(p) && isNum(p[0]) && isNum(p[1]))) {
      throw new Error("LineString için [[lon,lat],[lon,lat],...] formatında sayısal değerler girin.");
    }
  } else if (geomType === "Polygon") {
    if (!Array.isArray(parsed) || parsed.length < 1 || !Array.isArray(parsed[0])) {
      throw new Error("Polygon için [[[lon,lat],...]] formatında koordinatlar girin.");
    }
    const ring = parsed[0];
    if (!Array.isArray(ring) || ring.length < 4 || !ring.every((p: any) => Array.isArray(p) && isNum(p[0]) && isNum(p[1]))) {
      throw new Error("Polygon dış halkası en az 4 nokta içermeli ve sayısal olmalı.");
    }
  }
}

/** 2B eşitlik kontrolü */
export function equals2D(a: number[] | undefined, b: number[] | undefined): boolean {
  return Array.isArray(a) && Array.isArray(b) && a[0] === b[0] && a[1] === b[1];
}

/** Karesel Öklid mesafesi (proj: EPSG:3857 bekler) */
export function dist2(a: number[] | undefined, b: number[] | undefined): number {
  const dx = (a?.[0] ?? 0) - (b?.[0] ?? 0);
  const dy = (a?.[1] ?? 0) - (b?.[1] ?? 0);
  return dx * dx + dy * dy;
}

/** Güvenli LineString vertex sayımı */
export function safeLineStringVertexCount(geom: any): number {
  try {
    const coords = geom?.getCoordinates?.();
    return Array.isArray(coords) ? coords.length : 0;
  } catch {
    return 0;
  }
}

/** Güvenli Polygon vertex sayımı (kapanış noktasını çift saymaz) */
export function safePolygonVertexCount(geom: any): number {
  try {
    const rings = geom?.getCoordinates?.();
    if (!Array.isArray(rings) || !Array.isArray(rings[0])) return 0;
    const outer = rings[0];
    if (!Array.isArray(outer)) return 0;
    if (outer.length >= 2 && equals2D(outer[0], outer[outer.length - 1])) {
      return Math.max(0, outer.length - 1);
    }
    return outer.length;
  } catch {
    return 0;
  }
}

/** Geometri tipine göre popup anchor noktası  */
export function anchorForGeometry(geom: any): [number, number] {
  // Geometri sınıflarını import etmeden çalışacak şekilde duck-typing
  if (geom?.getType?.() === "Point") {
    const c = geom.getCoordinates?.();
    return [c[0], c[1]];
  }
  if (geom?.getType?.() === "LineString") {
    const c = geom.getCoordinateAt?.(0.5);
    return [c[0], c[1]];
  }
  if (geom?.getType?.() === "Polygon") {
    const c = geom.getInteriorPoint?.()?.getCoordinates?.();
    return [c[0], c[1]];
  }
  const ex = geom?.getExtent?.();
  if (Array.isArray(ex)) {
    return [(ex[0] + ex[2]) / 2, (ex[1] + ex[3]) / 2];
  }
  return [0, 0];
}

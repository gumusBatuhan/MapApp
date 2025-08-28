import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import styles from "../../Styles/Modules/MapShell.module.css";
import "ol/ol.css";

import Icon from "../../Components/Common/Icon";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import Draw from "ol/interaction/Draw";
import GeoJSON from "ol/format/GeoJSON";
import Overlay from "ol/Overlay";
import { fromLonLat, toLonLat } from "ol/proj";
import type { Coordinate } from "ol/coordinate";

import { getFeatures, type FeatureDto } from "../../api/featureApi";

type DrawKind = "None" | "Point" | "LineString" | "Polygon";
type Geometry = { type: "Point" | "LineString" | "Polygon"; coordinates: any };

type Props = {
  onDrawComplete?: (geom: Geometry, mode: DrawKind) => void;
};

export type MapHandle = {
  /** Listeden seçilen bir kaydı haritada göster + zoom + popup aç */
  revealFeature: (item: FeatureDto) => void;
};

const MapShell = forwardRef<MapHandle, Props>(function MapShell({ onDrawComplete }, ref) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const drawRef = useRef<Draw | null>(null);
  const vSourceRef = useRef<VectorSource>(new VectorSource());

  // Popup
  const popupElRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const [popupData, setPopupData] = useState<{
    name?: string;
    type?: string;
    lonlat?: Coordinate | null;
  } | null>(null);

  const [mode, setMode] = useState<DrawKind>("None");

  // DB'den mevcutları yükle
  const loadExisting = async () => {
    try {
      const resp = await getFeatures().catch(() => null);
      const list = resp?.data ?? [];
      const fc = {
        type: "FeatureCollection",
        features: list.map((f: any) => ({
          type: "Feature",
          properties: { name: f.name, _saved: true },
          geometry: f.geom,
        })),
      };
      const format = new GeoJSON();
      const feats = format.readFeatures(fc as any, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });
      vSourceRef.current.clear();
      vSourceRef.current.addFeatures(feats);
    } catch (error) {
      console.error("Veri Bulunamadı.", error);
    }
  };

  // harita kurulum
  useEffect(() => {
    if (!mapDivRef.current) return;

    const base = new TileLayer({ source: new OSM() });
    const vLayer = new VectorLayer({ source: vSourceRef.current });

    const view = new View({ center: fromLonLat([35, 38.5]), zoom: 6.3 });

    const map = new Map({ target: mapDivRef.current, layers: [base, vLayer], view });
    mapRef.current = map;

    // Popup overlay
    const overlay = new Overlay({
      element: popupElRef.current!,
      autoPan: { animation: { duration: 200 } },
      positioning: "bottom-center",
      stopEvent: true,
      offset: [0, -8],
    });
    map.addOverlay(overlay);
    overlayRef.current = overlay;

    // boyut
    requestAnimationFrame(() => map.updateSize());
    const ro = new ResizeObserver(() => map.updateSize());
    ro.observe(mapDivRef.current);

    // veri
    loadExisting();

    const onWinResize = () => map.updateSize();
    window.addEventListener("resize", onWinResize);

    // tıklama: sadece kayıtlı veriler, çizim modunda değilken
    const onClick = (evt: any) => {
      if (mode !== "None") return;
      const mapObj = mapRef.current;
      if (!mapObj) return;

      const hit = mapObj.forEachFeatureAtPixel(
        evt.pixel,
        (feat: any) => feat,
        { hitTolerance: 6 }
      ) as any;

      if (!hit || !hit.get("_saved")) {
        overlay.setPosition(undefined);
        setPopupData(null);
        return;
      }

      const geom = hit.getGeometry();
      const type = geom?.getType?.();

      // Anchor: Point -> kendi koordinatı; Line/Polygon -> en yakın nokta
      const anchor: Coordinate =
        type === "Point" ? geom.getCoordinates() : geom.getClosestPoint(evt.coordinate);

      // lon/lat
      let lonlat: Coordinate | null = null;
      try { lonlat = toLonLat(anchor); } catch {}

      // popup
      overlay.setPosition(anchor);
      setPopupData({
        name: hit.get("name") ?? "(isimsiz)",
        type: type ?? "Geometry",
        lonlat,
      });

      // zoom/fit
      if (type === "Point") {
        view.animate({ center: anchor, zoom: Math.max(view.getZoom() ?? 6, 15), duration: 1300 });
      } else {
        const extent = geom.getExtent();
        view.fit(extent, { padding: [60, 60, 60, 60], duration: 1300, maxZoom: 17 });
      }
    };
    map.on("singleclick", onClick);

    return () => {
      window.removeEventListener("resize", onWinResize);
      ro.disconnect();
      map.un("singleclick", onClick);
      map.removeOverlay(overlay);
      map.setTarget(undefined);
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // çizim modu
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (drawRef.current) {
      map.removeInteraction(drawRef.current);
      drawRef.current = null;
    }
    if (mode === "None") return;

    const draw = new Draw({ source: vSourceRef.current, type: mode as Exclude<DrawKind, "None"> });
    draw.on("drawend", (evt) => {
      // yeni çizilen -> geçici
      evt.feature.set("_saved", false);

      const clone = evt.feature.clone();
      clone.getGeometry()?.transform("EPSG:3857", "EPSG:4326");
      const format = new GeoJSON();
      const geom = format.writeGeometryObject(clone.getGeometry()!) as Geometry;

      onDrawComplete?.(geom, mode);
    });

    map.addInteraction(draw);
    drawRef.current = draw;
  }, [mode, onDrawComplete]);

  const closePopup = () => {
    overlayRef.current?.setPosition(undefined);
    setPopupData(null);
  };

  // === Imperative API: listeden seçileni haritada göster ===
  useImperativeHandle(ref, () => ({
    revealFeature: (item: FeatureDto) => {
      const map = mapRef.current;
      const overlay = overlayRef.current;
      if (!map || !overlay || !item?.geom) return;

      // item.geom (EPSG:4326) -> OL geometry (EPSG:3857)
      const fmt = new GeoJSON();
      const olGeom = fmt.readGeometry(item.geom as any, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });

      const type = (item.geom as any)?.type as DrawKind | undefined;

      // anchor hesapla
      let anchor: Coordinate | null = null;
      try {
        if (type === "Point") {
          anchor = (olGeom as any).getCoordinates();
        } else if (type === "LineString") {
          anchor = (olGeom as any).getCoordinateAt?.(0.5);
        } else if (type === "Polygon") {
          anchor = (olGeom as any).getInteriorPoint?.().getCoordinates();
        }
        if (!anchor) {
          const e = olGeom.getExtent();
          anchor = [(e[0] + e[2]) / 2, (e[1] + e[3]) / 2];
        }
      } catch {
        const e = olGeom.getExtent();
        anchor = [(e[0] + e[2]) / 2, (e[1] + e[3]) / 2];
      }

      // popup verisi (lon/lat)
      let lonlat: Coordinate | null = null;
      try { lonlat = anchor ? toLonLat(anchor) : null; } catch {}

      // popup’ı konumlandır
      if (anchor) overlay.setPosition(anchor);
      setPopupData({
        name: item.name ?? "(isimsiz)",
        type: type ?? "Geometry",
        lonlat,
      });

      // kamera: point -> animate; others -> fit
      const view = map.getView();
      if (type === "Point" && anchor) {
        view.animate({ center: anchor, zoom: Math.max(view.getZoom() ?? 6, 15), duration: 900 });
      } else {
        const extent = olGeom.getExtent();
        view.fit(extent, { padding: [60, 60, 60, 60], duration: 900, maxZoom: 17 });
      }
    },
  }));

  return (
    <div className={`card ${styles.wrapper}`}>
      <div className="card-header">
        <div className="d-flex w-100 align-items-center justify-content-between">
          <h3 className="card-title m-0">Harita</h3>

          <div className="btn-group btn-group-sm">
            <button
              className={`btn ${mode === "None" ? "btn-secondary" : "btn-outline-secondary"}`}
              onClick={() => setMode("None")}
              title="Çizimi kapat"
            >
              <Icon name="select" className={styles.btnIcon} />
              Seçim
            </button>

            <button
              className={`btn ${mode === "Point" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setMode("Point")}
              title="Point çiz"
            >
              <Icon name="point" className={styles.btnIcon} />
              Point
            </button>

            <button
              className={`btn ${mode === "LineString" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setMode("LineString")}
              title="LineString çiz"
            >
              <Icon name="line" className={styles.btnIcon} />
              Line
            </button>

            <button
              className={`btn ${mode === "Polygon" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setMode("Polygon")}
              title="Polygon çiz"
            >
              <Icon name="polygon" className={styles.btnIcon} />
              Polygon
            </button>

            <button className="btn btn-outline-secondary" onClick={loadExisting} title="Veriyi yenile">
              <Icon name="refresh" className={styles.btnIcon} />
              Yenile
            </button>

            <button className="btn btn-outline-danger" onClick={() => vSourceRef.current.clear()} title="Hepsini temizle">
              <Icon name="clear" className={styles.btnIcon} />
              Temizle
            </button>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        <div className={styles.mapContainer}>
          <div ref={mapDivRef} className={styles.map} />

          {/* Popup */}
          <div ref={popupElRef} className={styles.popup} style={{ display: popupData ? "block" : "none" }}>
            <div className={styles.popupHeader}>
              <div className={styles.popupTitle}><h2>{popupData?.name ?? "-"}</h2></div>
              <button className={styles.popupClose} onClick={closePopup} aria-label="Kapat">✕</button>
            </div>

            <div className={styles.popupRow}>
              <div className={styles.popupLabel}><h3>Tür</h3></div>
              <br />
              <div className={styles.popupValue}>{popupData?.type ?? "-"}</div>
            </div>
            <div className={styles.popupRow}>
              <div className={styles.popupLabel}><h3>Koordinatlar</h3></div>
              <br />
              <div className={styles.popupValue}>
                {Array.isArray(popupData?.lonlat) && popupData!.lonlat!.length >= 2
                  ? `${(popupData!.lonlat![0] as number).toFixed(6)}, ${(popupData!.lonlat![1] as number).toFixed(6)}`
                  : "-"}
              </div>
            </div>
          </div>
          {/* /Popup */}
        </div>
      </div>
    </div>
  );
});

export default MapShell;

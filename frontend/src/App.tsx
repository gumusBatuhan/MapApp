import { useEffect, useRef, useState } from "react";
import "./App.css";
import Header from "./Components/Layout/Header";
import Footer from "./Components/Layout/Footer";
import MapShell, { type MapHandle } from "./Components/Map/MapShell";
import FeatureListModal from "./Components/Modals/FeatureListModal";
import CreateFeatureModal from "./Components/Modals/CreateFeatureModal";
import { getFeatures, addFeature, type FeatureDto } from "./api/featureApi";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: { row: number; field: string; message: string }[];
};

type Geometry = { type: "Point" | "LineString" | "Polygon"; coordinates: any };

export default function App() {
  useEffect(() => {
    document.body.classList.add("antialiased");
    return () => document.body.classList.remove("antialiased");
  }, []);

  const mapRef = useRef<MapHandle | null>(null); // <<< harita handle

  // Modallar
  const [showList, setShowList] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Haritadan gelen taslak geometri
  const [draftGeom, setDraftGeom] = useState<Geometry | null>(null);

  // Liste durumu
  const [items, setItems] = useState<FeatureDto[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);

  const loadList = async () => {
    setLoadingList(true);
    setListErr(null);
    try {
      const resp: ApiResponse<FeatureDto[]> = await getFeatures();
      setItems(resp.data ?? []);
    } catch (e: any) {
      setListErr("Liste alınamadı.");
      console.error(e?.response ?? e);
    } finally {
      setLoadingList(false);
    }
  };

  const openList = async () => {
    await loadList();
    setShowList(true);
  };

  const createItem = async (dto: FeatureDto) => {
    const res: ApiResponse<FeatureDto> = await addFeature(dto);
    return { message: res?.message };
  };

  const handleDrawComplete = (geom: Geometry) => {
    setDraftGeom(geom);
    setShowCreate(true);
  };

  return (
    <div className="app-root">
      <Header
        onOpenList={() => { void openList(); }}
        onOpenCreate={() => { setDraftGeom(null); setShowCreate(true); }}
      />

      {/* Tam genişlik ve haritaya yapışık */}
      <main className="container-fluid px-0" style={{ padding: 0 }}>
        <MapShell ref={mapRef} onDrawComplete={handleDrawComplete} />
      </main>

      <Footer />

      <FeatureListModal
        show={showList}
        onClose={() => setShowList(false)}
        items={items}
        loading={loadingList}
        error={listErr}
        onRefresh={loadList}
        onGoItem={(item) => {
          mapRef.current?.revealFeature(item); // <<< “Git” butonu → haritayı yönlendir
        }}
      />

      <CreateFeatureModal
        show={showCreate}
        onClose={() => { setShowCreate(false); setDraftGeom(null); }}
        onCreate={createItem}
        initialGeom={draftGeom}
      />
    </div>
  );
}

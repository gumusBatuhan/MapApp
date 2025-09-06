import { useEffect, useRef, useState } from "react";
import "./App.css";
import Header from "./Components/Layout/Header";
import Footer from "./Components/Layout/Footer";
import MapShell, { type MapHandle } from "./Components/Map/MapShell";
import FeatureListModal from "./Components/Modals/FeatureListModal";
import CreateFeatureModal from "./Components/Modals/CreateFeatureModal";
import UpdateFeatureModal from "./Components/Modals/UpdateFeatureModal";
import DeleteFeatureModal from "./Components/Modals/DeleteFeatureModal";

import {
  getFeaturesPaged,
  createFeature,
  updateFeatureByUid,
  deleteFeatureByUid,
  type FeatureDto,
} from "./api/featureApi";
import type { ApiResponse } from "./api/client";

// Notify + Mesaj havuzu
import { useNotify } from "./notify/NotifyProvider";
import { msg } from "./messages/Messages.tr";

type Geometry = { type: "Point" | "LineString" | "Polygon"; coordinates: any };
// İşlem kaynağı: popup/harita mı, liste mi?
type OpContext = "map" | "list" | null;

export default function App() {
  useEffect(() => {
    document.body.classList.add("antialiased");
    return () => document.body.classList.remove("antialiased");
  }, []);

  const notify = useNotify();
  const mapRef = useRef<MapHandle | null>(null);

  // Modallar
  const [showList, setShowList] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Haritadan gelen taslak geometri + kısıt
  const [draftGeom, setDraftGeom] = useState<Geometry | null>(null);
  const [pointEnumLock, setPointEnumLock] = useState<1 | 2 | null>(null);

  // Update modal için (Mevcut POINT’in LS baş/bitiş yakınlığına göre zorunlu tür)
  const [updateEnumLock, setUpdateEnumLock] = useState<1 | 2 | null>(null);

  // Liste durumu
  const [items, setItems] = useState<FeatureDto[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);

  // Sayfalama durumu (server-side)
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Server-side search query (debounce FeatureListModal içinden gelecek)
  const [searchQ, setSearchQ] = useState("");

  // Güncellenecek/Silinecek
  const [editItem, setEditItem] = useState<FeatureDto | null>(null);
  const [deleteItem, setDeleteItem] = useState<FeatureDto | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  // işlem kaynağı (popup/harita mı, liste mi?)
  const [opContext, setOpContext] = useState<OpContext>(null);

  // Listeyi sayfa + query ile yükle
  const loadList = async (
    p: number = page,
    ps: number = pageSize,
    q: string = searchQ
  ) => {
    setLoadingList(true);
    setListErr(null);
    try {
      // getFeaturesPaged(page, pageSize, provider?, q?)
      const resp = await getFeaturesPaged(p, ps, "ef", q);
      if (!(resp as any)?.success) throw new Error((resp as any)?.message || "Liste alınamadı");
      const data = (resp as any)?.data;
      setItems(data?.items ?? []);
      setTotalCount(data?.totalCount ?? 0);
    } catch (e: any) {
      setListErr(e?.message || "Liste alınamadı.");
      console.error(e?.response ?? e);
    } finally {
      setLoadingList(false);
    }
  };

  // Listeyi aç
  const openList = async () => {
    const first = 1;
    setPage(first);
    await loadList(first, pageSize, searchQ);
    setShowList(true);
  };

  // CREATE — bildirimler sadece burada (modal tarafında toast yok)
  const createItem = async (dto: FeatureDto): Promise<{ ok: boolean; message?: string }> => {
    try {
      const res: ApiResponse<FeatureDto> = await createFeature(dto);
      const ok = !!((res as any)?.success && (res as any)?.data);

      if (ok) {
        mapRef.current?.closePopups();
        mapRef.current?.reload();
        if (showList) await loadList(page, pageSize, searchQ); // liste açıksa mevcut page+query ile yenile
        notify.success(msg.create.success);
      } else {
        notify.error((res as any)?.message ?? msg.create.fail);
      }

      return {
        ok,
        message: (res as any)?.message ?? (ok ? msg.create.success : msg.create.fail),
      };
    } catch (e: any) {
      notify.error(e?.message ?? msg.common.unexpected);
      return { ok: false, message: e?.message ?? msg.common.unexpected };
    }
  };

  // Harita çizimi bittiğinde (ctx ile point tür kısıtı)
  const handleDrawComplete = (
    geom: Geometry,
    _mode?: "Point" | "LineString" | "Polygon",
    ctx?: { pointEnumRestriction?: 1 | 2 | null }
  ) => {
    setDraftGeom(geom);
    setPointEnumLock(ctx?.pointEnumRestriction ?? null);
    setShowCreate(true);
  };

  // MOVE onayı — MapShell burayı çağırır
  const handleConfirmMove = async (p: {
    uid: string;
    name: string;
    enumType: number;
    geomGeoJson: any;
    wkt: string;
    revert: () => void;
  }): Promise<boolean> => {
    try {
      const res: ApiResponse<FeatureDto> = await updateFeatureByUid(p.uid, {
        name: p.name,
        geom: p.geomGeoJson,
        enumType: p.enumType ?? 0,
      } as any);

      if ((res as any)?.success) {
        notify.success(msg.update.success);
        mapRef.current?.reload();
        return true;
      } else {
        p.revert();
        notify.error((res as any)?.message ?? msg.update.fail);
        return false;
      }
    } catch (e: any) {
      p.revert();
      notify.error(e?.message ?? msg.common.unexpected);
      return false;
    }
  };

  // UPDATE modalını aç — LISTE'den
  const openUpdateFromList = (item: FeatureDto) => {
    setOpContext("list");
    setEditItem(item);
    const lock = mapRef.current?.getPointRestriction(item) ?? null; // 1,2 veya null
    setUpdateEnumLock(lock);
    setShowUpdate(true);
  };

  // UPDATE isteği (modal submit)
  const updateItem = async (uid: string, dto: { name: string; geom: Geometry; enumType: number }) => {
    try {
      const res: ApiResponse<FeatureDto> = await updateFeatureByUid(uid, {
        uid,
        name: dto.name,
        geom: dto.geom as any,
        enumType: dto.enumType,
      } as FeatureDto);

      if ((res as any)?.success) {
        setShowUpdate(false);
        setEditItem(null);
        setUpdateEnumLock(null);

        mapRef.current?.closePopups();
        mapRef.current?.reload();

        // Listeyi sadece LISTE'den gelindiyse (veya zaten açıksa) yenile/aç
        const wantList = opContext === "list" || showList;
        if (wantList) {
          setShowList(true);
          await loadList(page, pageSize, searchQ); // mevcut sayfa + query ile yenile
        } else {
          setShowList(false);
        }
        setOpContext(null);

        notify.success(msg.update.success);
      } else {
        notify.error((res as any)?.message ?? msg.update.fail);
      }
      return {
        message:
          (res as any)?.message ??
          ((res as any)?.success ? msg.update.success : msg.update.fail),
      };
    } catch (e: any) {
      console.error(e?.response ?? e);
      notify.error(e?.message ?? msg.common.unexpected);
      throw e;
    }
  };

  // DELETE — LISTE'den
  const openDeleteFromList = (item: FeatureDto) => {
    setOpContext("list");
    setDeleteItem(item);
    setShowDelete(true);
  };

  const confirmDelete = async (uid: string) => {
    setBusyDelete(true);
    try {
      const res: ApiResponse<boolean> = await deleteFeatureByUid(uid);
      if ((res as any)?.success) {
        setShowDelete(false);
        setDeleteItem(null);

        mapRef.current?.closePopups();
        mapRef.current?.reload();

        // Listeyi sadece LISTE'den gelindiyse (veya zaten açıksa) yenile/aç
        const wantList = opContext === "list" || showList;
        if (wantList) {
          const nextPage = items.length === 1 && page > 1 ? page - 1 : page;
          if (nextPage !== page) setPage(nextPage);
          setShowList(true);
          await loadList(nextPage, pageSize, searchQ); // query korunur
        } else {
          setShowList(false);
        }
        setOpContext(null);

        notify.success(msg.delete.success);
      } else {
        notify.error((res as any)?.message ?? msg.delete.fail);
      }
    } catch (e: any) {
      console.error(e?.response ?? e);
      notify.error(e?.message ?? msg.common.unexpected);
    } finally {
      setBusyDelete(false);
    }
  };

  // Pagination handlers (Modal çağıracak)
  const handlePageChange = async (nextPage: number) => {
    if (nextPage < 1) return;
    setPage(nextPage);
    await loadList(nextPage, pageSize, searchQ);
  };

  return (
    <div className="app-root">
      <Header
        onOpenList={() => {
          void openList();
        }}
        onOpenCreate={() => {
          setDraftGeom(null);
          setPointEnumLock(null);
          setShowCreate(true);
        }}
      />

      <main className="container-fluid px-0" style={{ padding: 0 }}>
        <MapShell
          ref={mapRef}
          onDrawComplete={handleDrawComplete}
          onFeatureMoved={handleConfirmMove}
          // Popup içinden gelen aksiyonlar:
          onOpenUpdateFromMap={(item) => {
            setOpContext("map");
            setEditItem(item);
            const lock = mapRef.current?.getPointRestriction(item) ?? null;
            setUpdateEnumLock(lock);
            setShowUpdate(true);
          }}
          onOpenDeleteFromMap={(item) => {
            setOpContext("map");
            setDeleteItem(item);
            setShowDelete(true);
          }}
        />
      </main>

      <Footer />

      <FeatureListModal
        show={showList}
        onClose={() => setShowList(false)}
        items={items}
        loading={loadingList}
        error={listErr}
        onRefresh={() => loadList(page, pageSize, searchQ)}
        onGoItem={(f) => {
          mapRef.current?.revealFeature(f);
          setShowList(false);
        }}
        onEdit={openUpdateFromList}
        onDelete={openDeleteFromList}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        // server-side search (debounce FeatureListModal içinde)
        query={searchQ}
        onSearch={(q) => {
          setSearchQ(q);
          const first = 1;
          setPage(first);
          void loadList(first, pageSize, q);
        }}
      />

      <CreateFeatureModal
        show={showCreate}
        onClose={() => {
          setShowCreate(false);
          setDraftGeom(null);
          setPointEnumLock(null);
        }}
        onCreate={createItem}
        initialGeom={draftGeom}
        forcePointEnum={pointEnumLock}
      />

      <UpdateFeatureModal
        show={showUpdate}
        onClose={() => {
          setShowUpdate(false);
          setEditItem(null);
          setUpdateEnumLock(null);
          setOpContext(null); // modal iptal/çapraz kapandıysa kaynak sıfırlansın
        }}
        item={editItem}
        onUpdate={updateItem}
        // LineString uçlarına yakın point’te tür kilidi
        forcePointEnum={updateEnumLock}
      />

      <DeleteFeatureModal
        show={showDelete}
        onClose={() => {
          setShowDelete(false);
          setDeleteItem(null);
          setOpContext(null); // modal iptal/çapraz kapandıysa kaynak sıfırlansın
        }}
        item={deleteItem}
        onConfirm={confirmDelete}
        busy={busyDelete}
      />
    </div>
  );
}

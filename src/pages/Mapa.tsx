"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import MapView from "@/components/MapView";
import maplibregl from "maplibre-gl";
import { Loader2, LayoutGrid } from "lucide-react";
import { collection, getDocs, type GeoPoint } from "firebase/firestore";
import { db } from "@/firebase/config";
import MagnetPage from "@/components/magnet/MagnetPage";
import { MagnetViewer } from "@/components/magnet/MagnetViewer";
import type { Magnet } from "@/types/magnet";

type MagnetWithCoords = Magnet & { coordenadas: GeoPoint };

const MARKER_SIZE = 100;

const Mapa = () => {
  const [magnets, setMagnets] = useState<Magnet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMagnet, setSelectedMagnet] = useState<Magnet | null>(null);

  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const markerRootsRef = useRef<Root[]>([]);
  const magnetsRef = useRef<Magnet[]>([]);

  useEffect(() => {
    const fetchMagnets = async () => {
      try {
        const snapshot = await getDocs(collection(db, "magnets"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Magnet, "id">),
        }));
        magnetsRef.current = data;
        setMagnets(data);
      } catch (error) {
        console.error("Erro ao carregar magnets:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMagnets();
  }, []);

  const magnetsWithCoords = magnets.filter(
    (magnet): magnet is MagnetWithCoords => !!magnet.coordenadas
  );

  const clearMarkers = () => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    markerRootsRef.current.forEach((root) => root.unmount());
    markerRootsRef.current = [];
  };


  const focusOnMagnets = () => {
    const map = mapRef.current;
    if (!map || magnetsWithCoords.length === 0) return;

    if (magnetsWithCoords.length === 1) {
      const [only] = magnetsWithCoords;
      map.flyTo({
        center: [only.coordenadas.longitude, only.coordenadas.latitude],
        zoom: 15,
        essential: true,
      });
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    magnetsWithCoords.forEach((magnet) => {
      bounds.extend([magnet.coordenadas.longitude, magnet.coordenadas.latitude]);
    });

    map.fitBounds(bounds, { padding: 100, maxZoom: 16, duration: 800 });
  };

  const updateMarkers = () => {
    const map = mapRef.current;
    if (!map) return;

    clearMarkers();

    magnetsWithCoords.forEach((magnet) => {
      const markerElement = document.createElement("div");
      markerElement.style.width = `${MARKER_SIZE}px`;
      markerElement.style.height = `${MARKER_SIZE}px`;
      markerElement.style.cursor = "pointer";

      const marker = new maplibregl.Marker({ element: markerElement, anchor: "center" })
        .setLngLat([magnet.coordenadas.longitude, magnet.coordenadas.latitude])
        .addTo(map);
      markersRef.current.push(marker);

      const root = createRoot(markerElement);
      root.render(<MagnetViewer modelUrl={magnet.modelURL} showRotateButton={false} />);
      markerRootsRef.current.push(root);

      markerElement.addEventListener("click", () => {
        setSelectedMagnet(magnet);
      });
    });

    focusOnMagnets();
  };

  const handleMapLoad = (map: maplibregl.Map) => {
    mapRef.current = map;
    updateMarkers();
  };

  useEffect(() => {
    updateMarkers();
    return () => {
      clearMarkers();
    };
  }, [magnets]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <MapView onMapLoad={handleMapLoad} className="absolute inset-0 w-full h-full" />

      <div className="absolute top-0 left-0 right-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Button asChild variant="outline" size="sm" className="ml-auto">
            </Button>
          </div>
        </div>
      </div>

      <Link
        to="/grid"
        className="fixed bottom-6 right-6 z-50 w-10 h-10 flex items-center justify-center rounded-md text-black hover:bg-black/5 transition-colors"
      >
        <LayoutGrid className="w-5 h-5" strokeWidth={2} />
      </Link>

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 pointer-events-none">
          <Loader2 className="w-6 h-6 animate-spin text-black" />
        </div>
      )}

      {!loading && magnetsWithCoords.length === 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-xs uppercase tracking-widest bg-black text-white px-4 py-2">
          Nenhuma experiência com localização definida
        </div>
      )}

      <MagnetPage
        magnet={selectedMagnet}
        onClose={() => setSelectedMagnet(null)}
        onDeleted={(id) => {
          setMagnets((prev) => prev.filter((m) => m.id !== id));
          setSelectedMagnet(null);
        }}
      />
    </div>
  );
};

export default Mapa;
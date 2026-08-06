"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import MapView from "@/components/MapView";
import maplibregl from "maplibre-gl";
import { Layers, Loader2 } from "lucide-react";
import { collection, getDocs, type GeoPoint } from "firebase/firestore";
import { db } from "@/firebase/config";
import MagnetPage from "@/components/magnet/MagnetPage";
import type { Magnet } from "@/types/magnet";
import { LayoutGrid } from "lucide-react";

type MagnetWithCoords = Magnet & { coordenadas: GeoPoint };

const Mapa = () => {
  const [magnets, setMagnets] = useState<Magnet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMagnet, setSelectedMagnet] = useState<Magnet | null>(null);

  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    const fetchMagnets = async () => {
      try {
        const snapshot = await getDocs(collection(db, "magnets"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Magnet, "id">),
        }));
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

  const handleMapLoad = (map: maplibregl.Map) => {
    mapRef.current = map;
    updateMarkers();
  };

  const updateMarkers = () => {
    if (!mapRef.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    magnetsWithCoords.forEach((magnet) => {
      const markerElement = document.createElement("div");
      markerElement.className =
        "w-10 h-10 bg-black rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-neutral-800 transition-transform hover:scale-110 shadow-lg";
      markerElement.innerHTML = "🧲";

      markerElement.addEventListener("click", () => {
        setSelectedMagnet(magnet);
      });

      const marker = new maplibregl.Marker(markerElement)
        .setLngLat([magnet.coordenadas.longitude, magnet.coordenadas.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<h3 class="font-bold text-gray-900">${magnet.titulo}</h3><p class="text-gray-600">${magnet.localização}</p>`
          )
        )
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    updateMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magnets.length]);

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
"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/firebase/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import { cn } from "@/lib/utils";
import { MagnetViewer } from "@/components/magnet/MagnetViewer";
import MagnetPage from "@/components/magnet/MagnetPage";
import TopNav from "@/components/TopNav";
import type { Magnet } from "@/types/magnet";

const MAGNET_SIZE = 400;

interface Position {
  xPercent: number;
  yPercent: number;
}

const centerBiasedRandom = () => (Math.random() + Math.random() + Math.random()) / 3;

const Profile = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [magnets, setMagnets] = useState<Magnet[]>([]);
  const [loadingMagnets, setLoadingMagnets] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedMagnet, setSelectedMagnet] = useState<Magnet | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setMagnets([]);
      setLoadingMagnets(false);
      return;
    }

    const fetchMyMagnets = async () => {
      setLoadingMagnets(true);
      try {
        const q = query(collection(db, "magnets"), where("ownerId", "==", user.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Magnet, "id">),
        }));
        setMagnets(data);
      } catch (error) {
        console.error("Erro ao carregar os meus magnets:", error);
      } finally {
        setLoadingMagnets(false);
      }
    };

    fetchMyMagnets();
  }, [user]);

  // Posições aleatórias por magnet — mesmo padrão da Homepage
  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      magnets.forEach((magnet) => {
        if (!next[magnet.id]) {
          next[magnet.id] = {
            xPercent: 20 + centerBiasedRandom() * 60,
            yPercent: 25 + centerBiasedRandom() * 50,
          };
        }
      });
      return next;
    });
  }, [magnets]);

  // Drag — mesmo padrão da Homepage
  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
      const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

      setPositions((prev) => ({
        ...prev,
        [draggingId]: {
          xPercent: Math.min(98, Math.max(2, xPercent)),
          yPercent: Math.min(96, Math.max(4, yPercent)),
        },
      }));
    };

    const handleMouseUp = () => setDraggingId(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingId]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Erro ao terminar sessão:", error);
    }
  };

  const handleDeleted = (id: string, assetsFullyRemoved: boolean) => {
    setMagnets((prev) => prev.filter((m) => m.id !== id));
    setSelectedMagnet(null);
    if (!assetsFullyRemoved) {
      console.warn(
        `Magnet ${id} eliminado, mas alguns assets podem não ter sido removidos do Cloudinary.`
      );
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen w-full bg-white">
        <TopNav />
        <div className="pt-40 flex justify-center">
          <p className="text-sm text-gray-500 uppercase tracking-widest">
            Precisa de iniciar sessão para ver o seu perfil.
          </p>
        </div>
      </div>
    );
  }

  const displayName = user?.displayName || user?.email || "";

  return (
    <div className="min-h-screen w-full bg-white">
      <TopNav />

      <div
        ref={containerRef}
        className="relative w-full h-screen flex items-center justify-center overflow-hidden"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-none tracking-tight text-black select-none text-center break-words px-6">
          {displayName}
        </h1>

        {!loadingMagnets &&
          magnets.map((magnet) => {
            const pos = positions[magnet.id];
            if (!pos) return null;
            const isDragging = draggingId === magnet.id;

            return (
              <div
                key={magnet.id}
                className={cn(
                  "absolute select-none cursor-grab active:cursor-grabbing",
                  isDragging ? "z-50" : hoveredId === magnet.id ? "z-40" : "z-20"
                )}
                style={{
                  left: `${pos.xPercent}%`,
                  top: `${pos.yPercent}%`,
                  width: MAGNET_SIZE,
                  height: MAGNET_SIZE,
                  transform: "translate(-50%, -50%)",
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDraggingId(magnet.id);
                }}
                onMouseEnter={() => setHoveredId(magnet.id)}
                onMouseLeave={() => setHoveredId(null)}
                onDoubleClick={() => setSelectedMagnet(magnet)}
              >
                <MagnetViewer
                      modelUrl={magnet.modelURL}
                      infoContent={
                        hoveredId === magnet.id && !isDragging ? (
                          <>
                            <p className="font-semibold">{magnet.titulo}</p>
                            <p className="text-gray-500">{magnet.localização}</p>
                            <p className="mt-1 text-gray-600">{magnet.descrição}</p>
                          </>
                        ) : undefined
                      }
                    />
              </div>
            );
          })}
      </div>


      <div className="fixed bottom-6 left-6 z-50 text-3xl font-black text-black select-none">
        {magnets.length}
      </div>


      <button
        onClick={handleLogout}
        className="fixed bottom-6 right-6 z-50 text-xs font-bold uppercase tracking-widest text-black hover:opacity-60 transition-opacity"
      >
        Sair
      </button>

      <MagnetPage
        magnet={selectedMagnet}
        onClose={() => setSelectedMagnet(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
};

export default Profile;
import { MagnetViewer } from "@/components/magnet/MagnetViewer";
import { useCallback, useEffect, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import TopNav from "@/components/TopNav";
import MagnetPage from "@/components/magnet/MagnetPage";
import type { Magnet } from "@/types/magnet";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const PROJECT_TITLE = "PROJECT";

const getMagnetSize = () => {
  const width = window.innerWidth;

  if (width < 640) return 300;
  if (width < 768) return 600;
  if (width < 1024) return 600;
  return 1050;
};

interface Position {
  xPercent: number;
  yPercent: number;
}

const centerBiasedRandom = () => (Math.random() + Math.random() + Math.random()) / 3;

const Homepage = () => {
  const [searchParams] = useSearchParams();
  const magnetId = searchParams.get("magnet");
  const [magnets, setMagnets] = useState<Magnet[]>([]);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [magnetSize, setMagnetSize] = useState(getMagnetSize());

  const [selectedMagnet, setSelectedMagnet] = useState<Magnet | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fonte única de verdade para "houve movimento real nesta interação"
  // (arrasto 2D OU rotação do OrbitControls). Usa-se um ref, e não state,
  // porque tem de ser lido de forma síncrona no onClick — que dispara
  // ainda dentro do mesmo ciclo pointerdown→pointermove→pointerup→click,
  // sem tempo para um re-render refletir um state atualizado.
  const suppressClickRef = useRef(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});

  const handleAspectChange = useCallback((magnetId: string, aspect: number) => {
    setAspectRatios((prev) =>
      prev[magnetId] === aspect ? prev : { ...prev, [magnetId]: aspect }
    );
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const handleResize = () => {
      setMagnetSize(getMagnetSize());
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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

  useEffect(() => {
    if (!magnetId || magnets.length === 0) return;

    const magnet = magnets.find((m) => m.id === magnetId);

    if (magnet) {
      moveMagnetLeft(magnet.id);
      setSelectedMagnet(magnet);
    }
  }, [magnetId, magnets]);

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

  // Arrasto 2D do íman (reposicionar dentro da Homepage)
  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      suppressClickRef.current = true;

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

    const handleMouseUp = () => {
      setDraggingId(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingId]);

  const moveMagnetLeft = (magnetId: string) => {
    setPositions((prev) => ({
      ...prev,
      [magnetId]: {
        ...prev[magnetId],
        xPercent: 28,
      },
    }));
  };

  return (
    <div className="min-h-screen w-full bg-white">
      <TopNav />

      <div
        ref={containerRef}
        className="relative w-full h-screen flex items-center justify-center overflow-hidden"
      >
        <h1 className="text-[18vw] tracking-wide leading-none font-black tracking-tight text-black select-none whitespace-nowrap">
          {PROJECT_TITLE}
        </h1>

        {!loading &&
          magnets.map((magnet) => {
            const pos = positions[magnet.id];
            if (!pos) return null;

            const isDragging = draggingId === magnet.id;
            const aspect = aspectRatios[magnet.id] ?? 1;

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
                  width: magnetSize * aspect,
                  height: magnetSize,
                  transform: "translate(-50%, -50%)",
                  transition: "width 200ms ease",
                }}
                // Reset da flag de supressão no início de QUALQUER gesto
                // (sobre o modelo ou sobre a zona transparente). Este
                // handler dispara sempre, porque o pointerdown nativo do
                // <canvas> sobe por bubbling até este wrapper — mas só
                // depois do raycast do R3F e do OrbitControls já terem
                // processado o evento ao nível do <canvas>, o que não
                // interfere com este reset.
                onPointerDown={() => {
                  suppressClickRef.current = false;
                }}
                onMouseEnter={() => setHoveredId(magnet.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => {
                  if (!suppressClickRef.current) {
                    moveMagnetLeft(magnet.id);
                    setSelectedMagnet(magnet);
                  }
                }}
              >
                <MagnetViewer
                  modelUrl={magnet.modelURL}
                  onAspectChange={(a) => handleAspectChange(magnet.id, a)}
                  onModelPointerDown={(e) => {
                    e.nativeEvent?.preventDefault?.();
                    setDraggingId(magnet.id);
                  }}
                  onRotate={() => {
                    suppressClickRef.current = true;
                  }}
                  orbitEnabled={draggingId !== magnet.id}
                />

                {hoveredId === magnet.id && !isDragging && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 p-3 rounded-lg bg-white shadow-lg border text-sm text-gray-800 pointer-events-none z-30">
                    <p className="font-semibold">{magnet.titulo}</p>
                    <p className="text-gray-500">{magnet.localização}</p>
                    <p className="mt-1 text-gray-600">{magnet.descrição}</p>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <Link
        to="/grid"
        className="fixed bottom-6 right-6 z-50 w-10 h-10 flex items-center justify-center rounded-md text-black hover:bg-black/5 transition-colors"
      >
        <LayoutGrid className="w-5 h-5" strokeWidth={2} />
      </Link>

      <MagnetPage
        magnet={selectedMagnet}
        onClose={() => {
          if (selectedMagnet) {
            setPositions((prev) => ({
              ...prev,
              [selectedMagnet.id]: {
                xPercent: 20 + centerBiasedRandom() * 60,
                yPercent: prev[selectedMagnet.id]?.yPercent ?? 50,
              },
            }));
          }
          setSelectedMagnet(null);
          navigate("/", { replace: true });
        }}
        onDeleted={(id, assetsFullyRemoved) => {
          setMagnets((prev) => prev.filter((m) => m.id !== id));
          setPositions((prev) => {
            const { [id]: _removed, ...rest } = prev;
            return rest;
          });
          setSelectedMagnet(null);
          setToast({
            type: assetsFullyRemoved ? "success" : "error",
            message: assetsFullyRemoved
              ? "Magnet eliminado com sucesso."
              : "Magnet eliminado, mas alguns ficheiros associados não foram removidos.",
          });
          navigate("/", { replace: true });
        }}
      />

      {toast && (
        <div
          className={`fixed bottom-6 left-6 z-[100000] px-4 py-3 border text-sm font-medium ${
            toast.type === "success"
              ? "bg-black text-white border-black"
              : "bg-red-600 text-white border-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Homepage;
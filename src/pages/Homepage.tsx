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

  if (width < 640) return 500;
  if (width < 768) return 600;
  if (width < 1024) return 600;
  return 1050;
};

interface Position {
  xPercent: number;
  yPercent: number;
}

const centerBiasedRandom = () => (Math.random() + Math.random() + Math.random()) / 3;


// ── Parâmetros da colisão suave entre ímanes ─────────────────────────
const REPEL_PADDING = 2; // encolhe o raio de cada íman
const BUFFER_FACTOR = 0.1; // zona de interação 
const STRENGTH = 0.06; // fração do overlap corrigida por frame




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

  const suppressClickRef = useRef(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});

  const handleAspectChange = useCallback((magnetId: string, aspect: number) => {
    setAspectRatios((prev) =>
      prev[magnetId] === aspect ? prev : { ...prev, [magnetId]: aspect }
    );
  }, []);

  // ── Refs loop de colisão ────────────────────────
  const positionsRef = useRef<Record<string, Position>>({});
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  const draggingIdRef = useRef<string | null>(null);
  useEffect(() => {
    draggingIdRef.current = draggingId;
  }, [draggingId]);

  const magnetSizeRef = useRef(magnetSize);
  useEffect(() => {
    magnetSizeRef.current = magnetSize;
  }, [magnetSize]);

  const aspectRatiosRef = useRef<Record<string, number>>({});
  useEffect(() => {
    aspectRatiosRef.current = aspectRatios;
  }, [aspectRatios]);

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

  // ── Colisão entre ímanes ────────────────────────────────────
  useEffect(() => {
    if (magnets.length < 2) return;

    let frameId: number;

    const step = () => {
      const container = containerRef.current;
      if (!container) {
        frameId = requestAnimationFrame(step);
        return;
      }

      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        frameId = requestAnimationFrame(step);
        return;
      }

      const ids = magnets.map((m) => m.id);
      const currentPositions = positionsRef.current;
      const size = magnetSizeRef.current;
      const aspects = aspectRatiosRef.current;
      const draggedId = draggingIdRef.current;


      const centers: Record<string, { x: number; y: number }> = {};
      const radii: Record<string, number> = {};

      ids.forEach((id) => {
        const pos = currentPositions[id];
        if (!pos) return;

        const aspect = aspects[id] ?? 1;
        const width = size * aspect;
        const height = size;

        centers[id] = {
          x: (pos.xPercent / 100) * rect.width,
          y: (pos.yPercent / 100) * rect.height,
        };
        radii[id] = ((width + height) / 4) * REPEL_PADDING;
      });

      const corrections: Record<string, { x: number; y: number }> = {};
      ids.forEach((id) => (corrections[id] = { x: 0, y: 0 }));

      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = ids[i];
          const b = ids[j];
          const ca = centers[a];
          const cb = centers[b];
          if (!ca || !cb) continue;

          let dx = cb.x - ca.x;
          let dy = cb.y - ca.y;
          let dist = Math.sqrt(dx * dx + dy * dy);

          const combined = radii[a] + radii[b];
          const bufferZone = combined * BUFFER_FACTOR;
          if (dist >= bufferZone) continue;

          // Dois ímanes exatamente sobrepostos: escolhe um eixo estável
          // para não dividir por zero.
          if (dist < 0.001) {
            dx = 1;
            dy = 0;
            dist = 0.001;
          }

          const nx = dx / dist;
          const ny = dy / dist;

          // 0 na fronteira da zona de interação, 1 em sobreposição total —
          // a força diminui à medida que a distância aumenta.
          const overlapRatio = 1 - dist / bufferZone;
          const pushAmount = overlapRatio * combined * STRENGTH;

          const isADragging = draggedId === a;
          const isBDragging = draggedId === b;

          if (isADragging && !isBDragging) {
            // "a" está a ser controlado pelo rato; só "b" é empurrado.
            corrections[b].x += nx * pushAmount * 2;
            corrections[b].y += ny * pushAmount * 2;
          } else if (isBDragging && !isADragging) {
            corrections[a].x -= nx * pushAmount * 2;
            corrections[a].y -= ny * pushAmount * 2;
          } else if (!isADragging && !isBDragging) {
            corrections[a].x -= nx * pushAmount;
            corrections[a].y -= ny * pushAmount;
            corrections[b].x += nx * pushAmount;
            corrections[b].y += ny * pushAmount;
          }
        }
      }

      const hasCorrection = Object.values(corrections).some(
        (c) => Math.abs(c.x) > 0.01 || Math.abs(c.y) > 0.01
      );

      if (hasCorrection) {
        setPositions((prev) => {
          const next = { ...prev };
          ids.forEach((id) => {
            if (id === draggedId) return; // o utilizador controla-o diretamente
            const correction = corrections[id];
            const pos = prev[id];
            if (!pos || (!correction.x && !correction.y)) return;

            next[id] = {
              xPercent: Math.min(
                98,
                Math.max(2, pos.xPercent + (correction.x / rect.width) * 100)
              ),
              yPercent: Math.min(
                96,
                Math.max(4, pos.yPercent + (correction.y / rect.height) * 100)
              ),
            };
          });
          return next;
        });
      }

      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [magnets]);

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
                    setDraggingId(magnet.id);
                  }}
                  onRotate={() => {
                    suppressClickRef.current = true;
                  }}
                  orbitEnabled={draggingId !== magnet.id}
                />

                {/* {hoveredId === magnet.id && !isDragging && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 p-3 rounded-lg bg-white shadow-lg border text-sm text-gray-800 pointer-events-none z-30">
                    <p className="font-semibold">{magnet.titulo}</p>
                    <p className="text-gray-500">{magnet.localização}</p>
                    <p className="mt-1 text-gray-600">{magnet.descrição}</p>
                  </div>
                )} */}
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
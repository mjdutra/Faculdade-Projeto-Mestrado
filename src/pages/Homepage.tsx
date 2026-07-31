import { MagnetViewer } from "@/components/magnet/MagnetViewer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import TopNav from "@/components/TopNav";
import MagnetPage from "@/components/magnet/MagnetPage";
import type { Magnet } from "@/types/magnet";

const PROJECT_TITLE = "MAGNET";
const MAGNET_SIZE = 400;

const CLICK_DRAG_THRESHOLD = 6;
const MAX_TILT_DEG = 10;
const TILT_FACTOR = 0.6;

const COLLISION_DISTANCE = MAGNET_SIZE * 0.55;
const COLLISION_STRENGTH = 0.12;
const MAX_PUSH_PER_FRAME = 4;

const MIN_DISTANCE = 28;
const MAGNETS_PER_ROW = 4;
const ROW_HEIGHT = 500;


interface Position {
  xPercent: number;
  yPercent: number;
}

interface DragStart {
  id: string;
  magnet: Magnet;
  x: number;
  y: number;
  moved: boolean;
}

const centerBiasedRandom = () => (Math.random() + Math.random() + Math.random()) / 3;

const getRandomPosition = (
      existing: Position[],
      total: number
    ): Position => {
      const maxAttempts = 100;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const position = {
          xPercent: 6 + Math.random() * 88,
          yPercent: 8 + Math.random() * 84,
        };

        const isFarEnough = existing.every((other) => {
          const dx = position.xPercent - other.xPercent;
          const dy = position.yPercent - other.yPercent;

          return Math.hypot(dx, dy) > MIN_DISTANCE;
        });

        if (isFarEnough) {
          return position;
        }
      }

      return {
        xPercent: 6 + Math.random() * 88,
        yPercent: 8 + Math.random() * 84,
      };
  };

const Homepage = () => {
  const [magnets, setMagnets] = useState<Magnet[]>([]);
  const [loading, setLoading] = useState(true);

  const [modelHoverId, setModelHoverId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedMagnet, setSelectedMagnet] = useState<Magnet | null>(null);

  const [tilts, setTilts] = useState<Record<string, number>>({});

  const containerRef = useRef<HTMLDivElement>(null);

  const positionsRef = useRef<Record<string, Position>>({});
  const magnetsRef = useRef<Magnet[]>([]);
  const draggingIdRef = useRef<string | null>(null);

  const dragStartRef = useRef<DragStart | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => { positionsRef.current = positions; }, [positions]);
  useEffect(() => { magnetsRef.current = magnets; }, [magnets]);
  useEffect(() => { draggingIdRef.current = draggingId; }, [draggingId]);

  useEffect(() => { setPositions((prev) => {
      const next = { ...prev };
      const existingPositions = magnets
        .map((magnet) => next[magnet.id])
        .filter(Boolean);
      magnets.forEach((magnet) => {
        if (!next[magnet.id]) {
          const position = getRandomPosition(
            existingPositions,
            magnets.length
          );
          next[magnet.id] = position;
          existingPositions.push(position);
        }
      });
      return next;
    });
  }, [magnets]);

  const contentHeight = Math.max(
    window.innerHeight,
    Math.ceil(magnets.length / MAGNETS_PER_ROW) * ROW_HEIGHT
  );

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
    setPositions((prev) => {
      const next = { ...prev };
      magnets.forEach((magnet) => {
        if (!next[magnet.id]) {
          next[magnet.id] = {
            xPercent: 10 + centerBiasedRandom() * 60,
            yPercent: 20 + centerBiasedRandom() * 50,
          };
        }
      });
      return next;
    });
  }, [magnets]);

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

      const start = dragStartRef.current;
      if (start && start.id === draggingId && !start.moved) {
        const totalDx = e.clientX - start.x;
        const totalDy = e.clientY - start.y;
        if (Math.hypot(totalDx, totalDy) > CLICK_DRAG_THRESHOLD) {
          start.moved = true;
        }
      }

      const dx = e.clientX - lastPointerRef.current.x;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };

      setTilts((prev) => ({
        ...prev,
        [draggingId]: Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, dx * TILT_FACTOR)),
      }));
    };

    const handleMouseUp = () => {
      const start = dragStartRef.current;
      setDraggingId(null);
      if (start) {
        setTilts((prev) => ({ ...prev, [start.id]: 0 }));
        if (!start.moved) {
          setSelectedMagnet(start.magnet);
        }
      }
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingId]);

  useEffect(() => {
    let frameId: number;

    const step = () => {
      const container = containerRef.current;
      const currentMagnets = magnetsRef.current;

      if (container && currentMagnets.length > 1) {
        const rect = container.getBoundingClientRect();
        const width = rect.width || 1;
        const height = rect.height || 1;

        const current = positionsRef.current;
        const ids = currentMagnets.map((m) => m.id).filter((id) => current[id]);

        const px: Record<string, { x: number; y: number }> = {};
        ids.forEach((id) => {
          px[id] = {
            x: (current[id].xPercent / 100) * width,
            y: (current[id].yPercent / 100) * height,
          };
        });

        const displacement: Record<string, { x: number; y: number }> = {};
        ids.forEach((id) => {
          displacement[id] = { x: 0, y: 0 };
        });

        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const idA = ids[i];
            const idB = ids[j];
            const a = px[idA];
            const b = px[idB];

            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.hypot(dx, dy);

            if (dist < COLLISION_DISTANCE) {
              if (dist < 0.01) {
                dx = (Math.random() - 0.5) * 0.01;
                dy = (Math.random() - 0.5) * 0.01;
                dist = 0.01;
              }

              const overlap = COLLISION_DISTANCE - dist;
              const nx = dx / dist;
              const ny = dy / dist;
              const push = Math.min(overlap * COLLISION_STRENGTH, MAX_PUSH_PER_FRAME);

              const aIsDragging = draggingIdRef.current === idA;
              const bIsDragging = draggingIdRef.current === idB;

              if (!aIsDragging) {
                const factor = bIsDragging ? push * 2 : push;
                displacement[idA].x -= nx * factor;
                displacement[idA].y -= ny * factor;
              }
              if (!bIsDragging) {
                const factor = aIsDragging ? push * 2 : push;
                displacement[idB].x += nx * factor;
                displacement[idB].y += ny * factor;
              }
            }
          }
        }

        let changed = false;
        const next = { ...current };

        ids.forEach((id) => {
          const d = displacement[id];
          if (Math.abs(d.x) > 0.01 || Math.abs(d.y) > 0.01) {
            changed = true;
            const newXPercent = ((px[id].x + d.x) / width) * 100;
            const newYPercent = ((px[id].y + d.y) / height) * 100;
            next[id] = {
              xPercent: Math.min(98, Math.max(2, newXPercent)),
              yPercent: Math.min(96, Math.max(4, newYPercent)),
            };
          }
        });

        if (changed) {
          positionsRef.current = next;
          setPositions(next);
        }
      }
      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const handleModelHoverChange = useCallback((id: string, hovering: boolean) => {
    setModelHoverId((prev) => {
      if (hovering) return id;
      return prev === id ? null : prev;
    });
  }, []);

  const handleMagnetDeleted = useCallback(
    (id: string, assetsFullyRemoved: boolean) => {
      setMagnets((prev) => prev.filter((m) => m.id !== id));
      setPositions((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setTilts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSelectedMagnet(null);
      setModelHoverId((prev) => (prev === id ? null : prev));

      if (!assetsFullyRemoved) {
        console.warn(
          `Magnet ${id} removido, mas alguns assets podem não ter sido eliminados na íntegra.`
        );
      }
    },
    []
  );

  return (
    <div className="min-h-screen w-full bg-white">
      <TopNav />

      <div
        ref={containerRef}
        className="relative w-full"
        style={{
          minHeight: contentHeight,
        }}
      >
        <h1  
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[14vw] leading-none font-black tracking-tight text-black select-none whitespace-nowrap pointer-events-none">
          {PROJECT_TITLE}
        </h1>

        {!loading &&
          magnets.map((magnet) => {
            const pos = positions[magnet.id];
            if (!pos) return null;
            const isDragging = draggingId === magnet.id;
            const isModelHovered = modelHoverId === magnet.id;
            const tilt = tilts[magnet.id] ?? 0;

            return (
              <div
                key={magnet.id}
                className={cn(
                  "absolute select-none",
                  isDragging ? "z-50" : isModelHovered ? "z-40" : "z-20"
                )}
                style={{
                  left: `${pos.xPercent}%`,
                  top: `${pos.yPercent}%`,
                  width: MAGNET_SIZE,
                  height: MAGNET_SIZE,
                  transform: `translate(-50%, -50%) rotate(${tilt}deg)`,
                  transition: isDragging
                    ? "transform 120ms ease-out"
                    : "transform 450ms cubic-bezier(0.22, 1, 0.36, 1)",
                  pointerEvents: isDragging || isModelHovered ? "auto" : "none",
                  cursor: isDragging ? "grabbing" : undefined,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  dragStartRef.current = {
                    id: magnet.id,
                    magnet,
                    x: e.clientX,
                    y: e.clientY,
                    moved: false,
                  };
                  lastPointerRef.current = { x: e.clientX, y: e.clientY };
                  setDraggingId(magnet.id);
                }}
              >
                <MagnetViewer
                  modelUrl={magnet.modelURL}
                  onModelHoverChange={(hovering) =>
                    handleModelHoverChange(magnet.id, hovering)
                  }
                  infoContent={
                    isModelHovered && !isDragging ? (
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

      <Link
        to="/grid"
        className="fixed bottom-6 right-6 z-50 w-10 h-10 flex items-center justify-center rounded-md text-black hover:bg-black/5 transition-colors"
      >
        <LayoutGrid className="w-5 h-5" strokeWidth={2} />
      </Link>

      <MagnetPage
        magnet={selectedMagnet}
        onClose={() => setSelectedMagnet(null)}
        onDeleted={handleMagnetDeleted}
      />
    </div>
  );
};

export default Homepage;
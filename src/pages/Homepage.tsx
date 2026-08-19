"use client";

import { MagnetViewer } from "@/components/magnet/MagnetViewer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { Link, useSearchParams } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { shortenLocation } from "@/lib/locationshort";
import TopNav from "@/components/TopNav";
import MagnetPage from "@/components/magnet/MagnetPage";
import type { Magnet } from "@/types/magnet";
import LoadingScreen from "@/components/loading/LoadingScreen";

const PROJECT_TITLE = "MAGNET";

// ── Tamanho dos magnets 
const MAGNET_SIZE = 400; // desktop
const MOBILE_MAGNET_SIZE = 260; // mobile 

const CLICK_DRAG_THRESHOLD = 6;
const MAX_TILT_DEG = 10;
const TILT_FACTOR = 0.6;

const COLLISION_RATIO = 0.55;
const COLLISION_STRENGTH = 0.12;
const MAX_PUSH_PER_FRAME = 4;

const MIN_DISTANCE = 20; // desktop
const MOBILE_MIN_DISTANCE = 16; // mobile

const MAGNETS_PER_ROW = 4;
const ROW_HEIGHT = 500;


const MOBILE_BREAKPOINT = 768;

// Margem extra 
const EDGE_BUFFER_PX = 8;
// Limite de segurança para a margem horizontal
const MAX_HORIZONTAL_MARGIN_PERCENT = 20;

const DESKTOP_SPAWN_Y = { yMin: 8, yMax: 92 };
const MOBILE_SPAWN_Y = { yMin: 62, yMax: 90 };
const DESKTOP_CLAMP_Y = { yMin: 4, yMax: 96 };
const MOBILE_CLAMP_Y = { yMin: 55, yMax: 93 };

const getVerticalBounds = (isMobile: boolean, mode: "spawn" | "clamp") => {
  if (mode === "spawn") return isMobile ? MOBILE_SPAWN_Y : DESKTOP_SPAWN_Y;
  return isMobile ? MOBILE_CLAMP_Y : DESKTOP_CLAMP_Y;
};

// Margem horizontal (
const getHorizontalMargin = (containerWidth: number, magnetSize: number) => {
  if (!containerWidth) return 0;
  const marginPx = magnetSize / 2 + EDGE_BUFFER_PX;
  const marginPercent = (marginPx / containerWidth) * 100;
  return Math.min(marginPercent, MAX_HORIZONTAL_MARGIN_PERCENT);
};

const getBounds = (
  containerWidth: number,
  magnetSize: number,
  isMobile: boolean,
  mode: "spawn" | "clamp"
) => {
  const margin = getHorizontalMargin(containerWidth, magnetSize);
  const { yMin, yMax } = getVerticalBounds(isMobile, mode);
  return { xMin: margin, xMax: 100 - margin, yMin, yMax };
};

const getMagnetSize = (isMobile: boolean) =>
  isMobile ? MOBILE_MAGNET_SIZE : MAGNET_SIZE;

const getMinDistance = (isMobile: boolean) =>
  isMobile ? MOBILE_MIN_DISTANCE : MIN_DISTANCE;

const getCollisionDistance = (isMobile: boolean) =>
  getMagnetSize(isMobile) * COLLISION_RATIO;

function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < breakpoint
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handleChange = () => setIsMobile(mql.matches);
    handleChange();
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [breakpoint]);

  return isMobile;
}
// ------------------------------------------

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
  isMobile: boolean,
  containerWidth: number,
  magnetSize: number
): Position => {
  const maxAttempts = 100;
  const { xMin, xMax, yMin, yMax } = getBounds(
    containerWidth,
    magnetSize,
    isMobile,
    "spawn"
  );
  const minDistance = getMinDistance(isMobile);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const position = {
      xPercent: xMin + Math.random() * (xMax - xMin),
      yPercent: yMin + Math.random() * (yMax - yMin),
    };

    const isFarEnough = existing.every((other) => {
      const dx = position.xPercent - other.xPercent;
      const dy = position.yPercent - other.yPercent;
      return Math.hypot(dx, dy) > minDistance;
    });

    if (isFarEnough) {
      return position;
    }
  }

  return {
    xPercent: xMin + Math.random() * (xMax - xMin),
    yPercent: yMin + Math.random() * (yMax - yMin),
  };
};

const Homepage = () => {
  const [magnets, setMagnets] = useState<Magnet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);

  const handleLoadingScreenFinished = useCallback(() => {
      setShowLoadingScreen(false);
    }, []);

  const [searchParams, setSearchParams] = useSearchParams();

  const [modelHoverId, setModelHoverId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedMagnet, setSelectedMagnet] = useState<Magnet | null>(null);

  const [tilts, setTilts] = useState<Record<string, number>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const positionsRef = useRef<Record<string, Position>>({});
  const magnetsRef = useRef<Magnet[]>([]);
  const draggingIdRef = useRef<string | null>(null);

  const dragStartRef = useRef<DragStart | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const activeTouchIdRef = useRef<number | null>(null);

  const isMobile = useIsMobile();
  const isMobileRef = useRef(isMobile);
  useEffect(() => { isMobileRef.current = isMobile; }, [isMobile]);

  const magnetSize = useMemo(() => getMagnetSize(isMobile), [isMobile]);
  const magnetSizeRef = useRef(magnetSize);
  useEffect(() => { magnetSizeRef.current = magnetSize; }, [magnetSize]);

  useEffect(() => { positionsRef.current = positions; }, [positions]);
  useEffect(() => { magnetsRef.current = magnets; }, [magnets]);
  useEffect(() => { draggingIdRef.current = draggingId; }, [draggingId]);


  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => setContainerWidth(el.getBoundingClientRect().width);
    updateWidth();

    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    window.addEventListener("orientationchange", updateWidth);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", updateWidth);
    };
  }, []);


  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      const existingPositions = magnets
        .map((magnet) => next[magnet.id])
        .filter(Boolean);

      const width =
        containerRef.current?.getBoundingClientRect().width ||
        containerWidth ||
        window.innerWidth;

      magnets.forEach((magnet) => {
        if (!next[magnet.id]) {
          const position = getRandomPosition(
            existingPositions,
            isMobile,
            width,
            magnetSize
          );
          next[magnet.id] = position;
          existingPositions.push(position);
        }
      });
      return next;
    });
  }, [magnets, isMobile, magnetSize, containerWidth]);


  useEffect(() => {
    if (!containerWidth) return;

    setPositions((prev) => {
      const bounds = getBounds(containerWidth, magnetSize, isMobile, "clamp");
      let changed = false;
      const next: Record<string, Position> = {};

      for (const [id, pos] of Object.entries(prev)) {
        const xPercent = Math.min(bounds.xMax, Math.max(bounds.xMin, pos.xPercent));
        const yPercent = Math.min(bounds.yMax, Math.max(bounds.yMin, pos.yPercent));
        if (xPercent !== pos.xPercent || yPercent !== pos.yPercent) changed = true;
        next[id] = { xPercent, yPercent };
      }

      return changed ? next : prev;
    });
  }, [containerWidth, magnetSize, isMobile]);

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
    if (loading) return;

    const magnetId = searchParams.get("magnet");

    setSelectedMagnet((prev) => {
      if (!magnetId) return prev ? null : prev;
      if (prev?.id === magnetId) return prev;
      return magnets.find((m) => m.id === magnetId) ?? null;
    });
  }, [loading, magnets, searchParams]);

  const openMagnet = useCallback(
    (magnet: Magnet) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("magnet", magnet.id);
        return next;
      });
    },
    [setSearchParams]
  );

  const closeMagnet = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("magnet");
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);
  


  // ---------------------------------------------------------------------------------

  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
      const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

      const bounds = getBounds(rect.width, magnetSize, isMobileRef.current, "clamp");

      setPositions((prev) => ({
        ...prev,
        [draggingId]: {
          xPercent: Math.min(bounds.xMax, Math.max(bounds.xMin, xPercent)),
          yPercent: Math.min(bounds.yMax, Math.max(bounds.yMin, yPercent)),
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
          openMagnet(start.magnet);
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
  }, [draggingId, openMagnet, magnetSize]);

  useEffect(() => {
    if (!draggingId) return;

    const getActiveTouch = (e: TouchEvent) => {
      const touchId = activeTouchIdRef.current;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchId) return e.touches[i];
      }
      return null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = getActiveTouch(e);
      if (!touch) return;
      e.preventDefault(); // impede o scroll da página durante drag

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const xPercent = ((touch.clientX - rect.left) / rect.width) * 100;
      const yPercent = ((touch.clientY - rect.top) / rect.height) * 100;

      const bounds = getBounds(rect.width, magnetSize, isMobileRef.current, "clamp");

      setPositions((prev) => ({
        ...prev,
        [draggingId]: {
          xPercent: Math.min(bounds.xMax, Math.max(bounds.xMin, xPercent)),
          yPercent: Math.min(bounds.yMax, Math.max(bounds.yMin, yPercent)),
        },
      }));

      const start = dragStartRef.current;
      if (start && start.id === draggingId && !start.moved) {
        const totalDx = touch.clientX - start.x;
        const totalDy = touch.clientY - start.y;
        if (Math.hypot(totalDx, totalDy) > CLICK_DRAG_THRESHOLD) {
          start.moved = true;
        }
      }

      const dx = touch.clientX - lastPointerRef.current.x;
      lastPointerRef.current = { x: touch.clientX, y: touch.clientY };

      setTilts((prev) => ({
        ...prev,
        [draggingId]: Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, dx * TILT_FACTOR)),
      }));
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchId = activeTouchIdRef.current;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchId) return;
      }

      const start = dragStartRef.current;
      setDraggingId(null);
      if (start) {
        setTilts((prev) => ({ ...prev, [start.id]: 0 }));
        if (!start.moved) {
          openMagnet(start.magnet);
        }
      }
      dragStartRef.current = null;
      activeTouchIdRef.current = null;
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [draggingId, openMagnet, magnetSize]);




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

        const collisionDistance = getCollisionDistance(isMobileRef.current);

        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const idA = ids[i];
            const idB = ids[j];
            const a = px[idA];
            const b = px[idB];

            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.hypot(dx, dy);

            if (dist < collisionDistance) {
              if (dist < 0.01) {
                dx = (Math.random() - 0.5) * 0.01;
                dy = (Math.random() - 0.5) * 0.01;
                dist = 0.01;
              }

              const overlap = collisionDistance - dist;
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
        const bounds = getBounds(width, magnetSizeRef.current, isMobileRef.current, "clamp");

        ids.forEach((id) => {
          const d = displacement[id];
          if (Math.abs(d.x) > 0.01 || Math.abs(d.y) > 0.01) {
            changed = true;
            const newXPercent = ((px[id].x + d.x) / width) * 100;
            const newYPercent = ((px[id].y + d.y) / height) * 100;
            next[id] = {
              xPercent: Math.min(bounds.xMax, Math.max(bounds.xMin, newXPercent)),
              yPercent: Math.min(bounds.yMax, Math.max(bounds.yMin, newYPercent)),
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
      setModelHoverId((prev) => (prev === id ? null : prev));


      setSearchParams(
        (prev) => {
          if (prev.get("magnet") !== id) return prev;
          const next = new URLSearchParams(prev);
          next.delete("magnet");
          return next;
        },
        { replace: true }
      );

      if (!assetsFullyRemoved) {
        console.warn(
          `Magnet ${id} removido, mas alguns assets podem não ter sido eliminados na íntegra.`
        );
      }
    },
    [setSearchParams]
  );

  return (
    <div className="min-h-screen w-full bg-white overflow-x-hidden">
      <TopNav />

      <div
        ref={containerRef}
        className="relative w-full overflow-x-hidden"
        style={{
          minHeight: contentHeight,
        }}
      >
        <h1
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[14vw] leading-none font-black tracking-tight text-black select-none whitespace-nowrap pointer-events-none z-0"
        >
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
                data-magnet-id={magnet.id}
                className={cn(
                  "absolute select-none",
                  isDragging ? "z-50" : isModelHovered ? "z-40" : "z-20"
                )}
                style={{
                  left: `${pos.xPercent}%`,
                  top: `${pos.yPercent}%`,
                  width: magnetSize,
                  height: magnetSize,
                  transform: `translate(-50%, -50%) rotate(${tilt}deg)`,
                  transition: isDragging
                    ? "none"
                    : "transform 450ms cubic-bezier(0.22, 1, 0.36, 1)",
                  pointerEvents: isMobile || isDragging || isModelHovered ? "auto" : "none",
                  cursor: isDragging ? "grabbing" : undefined,
                  touchAction: isMobile ? "none" : undefined,
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
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  if (!touch) return;
                  activeTouchIdRef.current = touch.identifier;
                  dragStartRef.current = {
                    id: magnet.id,
                    magnet,
                    x: touch.clientX,
                    y: touch.clientY,
                    moved: false,
                  };
                  lastPointerRef.current = { x: touch.clientX, y: touch.clientY };
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
                        <p className="text-gray-500">{shortenLocation(magnet.localização)}</p>
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
        className="fixed z-[60] w-10 h-10 flex items-center justify-center rounded-md text-black hover:bg-black/5 transition-colors"
        style={{
          bottom: "max(1.5rem, env(safe-area-inset-bottom))",
          right: "max(1.5rem, env(safe-area-inset-right))",
        }}
      >
        <LayoutGrid className="w-5 h-5" strokeWidth={2} />
      </Link>

      <MagnetPage
        magnet={selectedMagnet}
        onClose={closeMagnet}
        onDeleted={handleMagnetDeleted}
      />
      
      {showLoadingScreen && (
        <LoadingScreen
          magnets={magnets}
          magnetsFetched={!loading}
          onFinished={handleLoadingScreenFinished}
        />
      )}

    </div>
  );
};

export default Homepage;
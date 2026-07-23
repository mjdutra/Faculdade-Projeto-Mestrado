import { MagnetViewer } from "@/components/magnet/MagnetViewer";
import { useEffect, useRef, useState } from "react";
import { collection, getDocs} from "firebase/firestore";
import { db } from "@/firebase/config";
import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import TopNav from "@/components/TopNav";
import MagnetPage from "@/components/magnet/MagnetPage";
import type { Magnet } from "@/types/magnet";

const PROJECT_TITLE = "PROJECT";


const getMagnetSize = () => {
  const width = window.innerWidth;

  if (width < 640) return 220;      // Telemóvel
  if (width < 768) return 300;      // Tablet pequeno
  if (width < 1024) return 420;     // Tablet
  if (width < 1440) return 600;     // Portátil
  return 800;                       // Monitor grande
};


interface Position {
  xPercent: number;
  yPercent: number;
}


const centerBiasedRandom = () => (Math.random() + Math.random() + Math.random()) / 3;

const Homepage = () => {
  const [magnets, setMagnets] = useState<Magnet[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const [magnetSize, setMagnetSize] = useState(getMagnetSize());

  const [selectedMagnet, setSelectedMagnet] = useState<Magnet | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);


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

  // drag
  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      setHasDragged(true);
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
    
      setTimeout(() => {
        setHasDragged(false);
      }, 0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingId]);

  console.log(magnets);

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
                  width: magnetSize,
                  height: magnetSize,
                  transform: "translate(-50%, -50%)",
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setHasDragged(false);
                  setDraggingId(magnet.id);
                }}
                onMouseEnter={() => setHoveredId(magnet.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => {
                  if (!hasDragged) {
                    setSelectedMagnet(magnet);
                  }
                }}
              >
                <MagnetViewer modelUrl={magnet.modelURL} />

                {hoveredId === magnet.id && !isDragging && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-3 rounded-lg bg-white shadow-lg border text-sm text-gray-800 pointer-events-none z-30">
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
        to="/mapa"
        className="fixed bottom-6 right-6 z-50 w-10 h-10 flex items-center justify-center rounded-md text-black hover:bg-black/5 transition-colors"
      >
        <LayoutGrid className="w-5 h-5" strokeWidth={2} />
      </Link>


      <MagnetPage
        magnet={selectedMagnet}
        onClose={() => setSelectedMagnet(null)}
      />
    </div>
    
  );
};

export default Homepage;
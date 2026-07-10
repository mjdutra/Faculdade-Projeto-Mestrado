import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Map } from "lucide-react";
import { MagnetViewer } from "@/components/magnet/MagnetViewer";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, GeoPoint, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/config";

const MAGNET_SIZE = 300;
const PADDING = 16;

interface Magnet {
  id: string;
  titulo: string;
  localização: string;
  descrição: string;
  modelURL: string;
  videoURL: string;
  coordenadas: GeoPoint;
  data: Timestamp;
}

const Homepage = () => {
  const [magnets, setMagnets] = useState<Magnet[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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

  const magnetsWithPosition = useMemo(
    () =>
      magnets.map((magnet) => ({
        ...magnet,
        x: Math.random(),
        y: Math.random(),
      })),
    [magnets]
  );

  return (
    <div className="absolute top-0 left-0 right-0 z-10">
      <div className="fixed inset-0 -z-10 y2k-bg" />
      <div className="grain fixed inset-0 -z-10 pointer-events-none" />

      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-xl font-bold text-white drop-shadow">Logo</h1>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="ml-auto bg-white/20 border-white/40 text-white hover:bg-white/30 backdrop-blur-sm"
          >
            <Link to="/mapa">
              <Map className="w-4 h-4 mr-1" />
              Mapa
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative w-full h-screen overflow-hidden">
        {!loading &&
          magnetsWithPosition.map((magnet) => (
            <div
              key={magnet.id}
              className={`absolute ${
                hoveredId === magnet.id ? "z-50" : "z-0"
              }`}
              style={{
                left: `calc(${PADDING}px + ${magnet.x} * (100% - ${MAGNET_SIZE + PADDING * 2}px))`,
                top: `calc(${PADDING}px + ${magnet.y} * (100% - ${MAGNET_SIZE + PADDING * 2}px))`,
              }}
              onMouseEnter={() => setHoveredId(magnet.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <Card className="bg-transparent shadow-none border-0">
                <div className="w-[300px] h-[300px]">
                  <MagnetViewer modelUrl={magnet.modelURL} />
                </div>
              </Card>

              {hoveredId === magnet.id && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg text-sm text-gray-800 pointer-events-none z-20">
                  <p className="font-semibold">{magnet.titulo}</p>
                  <p className="text-gray-500">{magnet.localização}</p>
                  <p className="mt-1 text-gray-600">{magnet.descrição}</p>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

export default Homepage;
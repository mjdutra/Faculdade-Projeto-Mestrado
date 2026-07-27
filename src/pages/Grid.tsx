import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, GeoPoint, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import { MagnetViewer } from "@/components/magnet/MagnetViewer";
import MagnetPage from "@/components/magnet/MagnetPage";
import type { Magnet } from "@/types/magnet";


function formatInicio(ts?: Timestamp) {
  if (!ts) return "—";
  return ts
    .toDate()
    .toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "2-digit" })
    .replace(".", "")
    .toUpperCase();
}

function formatDuracao(seconds?: number) {
  if (!seconds || !isFinite(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const Grid = () => {
  const [magnets, setMagnets] = useState<Magnet[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [selectedMagnet, setSelectedMagnet] = useState<Magnet | null>(null);
  const navigate = useNavigate();

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

  // Duração não vem do Firestore — lê-se a metadata do vídeo no cliente.
  useEffect(() => {
    magnets.forEach((magnet) => {
      if (!magnet.videoURL || durations[magnet.id] !== undefined) return;
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = magnet.videoURL;
      video.onloadedmetadata = () => {
        setDurations((prev) => ({ ...prev, [magnet.id]: video.duration }));
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magnets]);

  const hoveredMagnet = useMemo(
    () => magnets.find((m) => m.id === hoveredId) ?? null,
    [magnets, hoveredId]
  );

  return (
    <div className="min-h-screen w-full bg-white">
      <TopNav />

      <div className="pt-28 md:pt-36 px-4 md:px-10 pb-24">
        <div className="flex items-end justify-end mb-10 md:mb-16 pb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                {magnets.length} experiência{magnets.length !== 1 ? "s" : ""}
            </span>
        </div>

        <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-widest text-gray-400 pb-3 border-b border-black">
            <span className="col-span-1">#</span>
            <span className="col-span-5">Nome da Experiência</span>
            <span className="col-span-2 text-center">Data</span>
            <span className="col-span-2 text-center">Tempo de vídeo</span>
            <span className="col-span-2"></span>
        </div>

        <div>
          {!loading &&
            magnets.map((magnet, index) => {
              const isHovered = hoveredId === magnet.id;
              return (
                <div
                    key={magnet.id}
                    onMouseEnter={() => setHoveredId(magnet.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => setSelectedMagnet(magnet)}
                    className="grid grid-cols-12 items-center border-b py-6 md:py-8 cursor-pointer transition-colors duration-300"
                >
                  <span
                    className={`col-span-1 text-xs font-bold tracking-widest transition-colors duration-300 ${
                      isHovered ? "text-black" : "text-gray-300"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span
                    className={`col-span-5 font-black uppercase tracking-tight transition-all duration-300 text-2xl md:text-4xl ${
                      isHovered
                        ? "text-black"
                        : "text-gray-400"
                    }`}
                  >
                    {magnet.titulo}
                  </span>

                  <span className="col-span-2 text-center text-xs md:text-sm text-gray-500 uppercase tracking-widest">
                    {formatInicio(magnet.data)}
                  </span>

                  <span className="col-span-2 text-center text-xs md:text-sm text-gray-500 tabular-nums">
                    {formatDuracao(durations[magnet.id])}
                  </span>

                  <span className="col-span-2"></span>
                </div>
              );
            })}

          {!loading && magnets.length === 0 && (
            <p className="py-16 text-center text-sm text-gray-400 uppercase tracking-widest">
              Nenhuma experiência encontrada
            </p>
          )}
        </div>
      </div>

      {/* Preview grande do íman, em hover */}
      <div
        className={`fixed top-1/2 right-10 xl:right-24 2xl:right-32
        -translate-y-1/2
        w-[450px] h-[450px]
        lg:w-[550px] lg:h-[550px]
        xl:w-[650px] xl:h-[650px]
        2xl:w-[750px] 2xl:h-[750px]
        pointer-events-none transition-all duration-500 ease-out z-50 ${
            hoveredMagnet ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
        >
        {hoveredMagnet && (
            <MagnetViewer
            key={hoveredMagnet.id}
            modelUrl={hoveredMagnet.modelURL}
            />
        )}
        </div>
        
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

export default Grid;
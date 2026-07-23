import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Magnet } from "@/types/magnet";
import TopNav from "@/components/TopNav";
import { MagnetViewer } from "@/components/magnet/MagnetViewer";
import VRExperience from "@/components/magnet/VRExperience";
import { Button } from "@/components/ui/button";

const Magnet = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [magnet, setMagnet] = useState<Magnet | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [vrOpen, setVrOpen] = useState(false);

  useEffect(() => {
    const fetchMagnet = async () => {
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, "magnets", id));
        if (snap.exists()) {
          setMagnet({ id: snap.id, ...(snap.data() as Omit<Magnet, "id">) });
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error("Erro ao carregar magnet:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchMagnet();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-white">
        <TopNav />
        <div className="pt-40 flex justify-center">
          <p className="text-sm text-gray-400 uppercase tracking-widest">A carregar...</p>
        </div>
      </div>
    );
  }

  if (notFound || !magnet) {
    return (
      <div className="min-h-screen w-full bg-white">
        <TopNav />
        <div className="pt-40 flex flex-col items-center gap-4">
          <p className="text-sm text-gray-500 uppercase tracking-widest">
            Íman não encontrado.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="rounded-none uppercase text-xs font-bold tracking-widest"
          >
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white">
      <TopNav />

      <div className="pt-28 px-4 md:px-10 pb-16 grid md:grid-cols-2 gap-10">
        <div className="h-[50vh] md:h-[70vh]">
          <MagnetViewer modelUrl={magnet.modelURL} />
        </div>

        <div>
          <h1 className="text-3xl md:text-5xl font-black uppercase mb-8">
            {magnet.titulo}
          </h1>

          <p className="text-sm text-gray-500">Localização</p>
          <p className="mb-6">{magnet.localização}</p>

          <p className="text-sm text-gray-500">Descrição</p>
          <p className="mb-8">{magnet.descrição}</p>

          <Button
            type="button"
            disabled={!magnet.videoURL}
            onClick={() => setVrOpen(true)}
            className="rounded-none uppercase text-xs font-bold tracking-widest bg-neutral-700 text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            Enter in VR Experience
          </Button>
        </div>
      </div>

      {vrOpen && <VRExperience magnet={magnet} onClose={() => setVrOpen(false)} />}
    </div>
  );
};

export default Magnet;
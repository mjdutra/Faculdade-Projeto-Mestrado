import { useEffect, useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Magnet } from "@/types/magnet";
import VRExperience from "@/components/magnet/VRExperience";
import PrintMagnet from "@/components/magnet/PrintMagnet";
import SidePanel from "@/components/magnet/SidePanel";
import { deleteMagnet } from "@/services/deletemagnet";
import { useAuth } from "@/firebase/AuthContext";

interface Props {
  magnet: Magnet | null;
  onClose: () => void;
  onDeleted: (id: string, assetsFullyRemoved: boolean) => void;
}

export default function MagnetPage({ magnet, onClose, onDeleted }: Props) {
  const [vrOpen, setVrOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const isOwner = !!user && !!magnet && magnet.ownerId === user.uid;

  useEffect(() => {
    setVrOpen(false);
    setPrintOpen(false);
    setConfirmOpen(false);
    setDeleting(false);
    setError(null);
  }, [magnet?.id]);

  const handleConfirmDelete = async () => {
    if (!magnet) return;
    setDeleting(true);
    setError(null);

    try {
      const result = await deleteMagnet(magnet);
      onDeleted(magnet.id, result.assetsFullyRemoved);
    } catch (err) {
      console.error("Erro ao eliminar magnet:", err);
      setError("Não foi possível eliminar. Tenta novamente.");
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <SidePanel open={!!magnet} onClose={onClose} title="about" closeDisabled={deleting}>
        {magnet && (
          <>
            <div className="flex-1 overflow-y-auto p-8 py-10" key={magnet.id}>
              <h2 className="text-3xl font-black uppercase mb-8">{magnet.titulo}</h2>

              <p className="text-sm text-gray-500">Localização</p>
              <p className="mb-6">{magnet.localização}</p>

              <p className="text-sm text-gray-500">Descrição</p>
              <p className="mb-8">{magnet.descrição}</p>

              <div className="flex flex-col lg:flex-row gap-4">
                <Button
                  type="button"
                  disabled={!magnet.videoURL}
                  onClick={() => setVrOpen(true)}
                  className="w-full lg:flex-1 rounded-none uppercase text-xs font-bold tracking-widest bg-neutral-700 text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  Enter in VR Experience
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={!magnet.modelURL}
                  onClick={() => setPrintOpen(true)}
                  className="w-full lg:flex-1 rounded-none border-black uppercase text-xs font-bold tracking-widest text-black hover:text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  Print Magnet
                </Button>
              </div>

              {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
            </div>

            {isOwner && (
              <div className="p-8 flex justify-end">
                <button
                  onClick={() => setConfirmOpen(true)}
                  disabled={deleting}
                  className="flex items-center gap-2 text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  <Trash2 size={20} />
                  Delete
                </button>
              </div>
            )}
          </>
        )}
      </SidePanel>

      {magnet && vrOpen && <VRExperience magnet={magnet} onClose={() => setVrOpen(false)} />}

      <PrintMagnet magnet={magnet} open={printOpen} onClose={() => setPrintOpen(false)} />

      {magnet && isOwner && confirmOpen && (
        <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white border border-black p-8">
            <h3 className="text-lg font-black uppercase mb-3">Eliminar Magnet?</h3>
            <p className="text-sm text-gray-600 mb-8">
              Esta ação é permanente. O vídeo, o modelo 3D e todos os dados associados a{" "}
              <span className="font-semibold">{magnet.titulo}</span> serão eliminados.
            </p>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-none border-black uppercase text-xs font-bold tracking-widest"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="flex-1 rounded-none uppercase text-xs font-bold tracking-widest bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A eliminar...
                  </>
                ) : (
                  "Eliminar"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
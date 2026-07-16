import { X, Trash2} from "lucide-react";
import { GeoPoint, Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";

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

interface Props {
  magnet: Magnet | null;
  onClose: () => void;
}

export default function MagnetPage({
  magnet,
  onClose,
}: Props) {
  return (
    <>
      <div
        onClick={onClose}
        className={`
          fixed inset-0
          transition-opacity
          duration-300
          z-40
          ${
            magnet
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }
        `}
      />

      <aside
        className={`
          fixed
          top-0
          right-0
          h-screen
          w-full
          border-l
          border-black
          md:w-[45vw]
          bg-white
          border-l

          z-[99999]
          transition-transform
          duration-500
          ${
            magnet
              ? "translate-x-0"
              : "translate-x-full"
          }
        `}
      >
        {magnet && (
          <div className="flex flex-col h-full">

            <div className="flex justify-between items-center p-2 border-b border-black">
              <h2 className="text-sm font-black uppercase">
                about
              </h2>

              <button onClick={onClose}>
                <X size={24} />
              </button>

            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-8 py-10">
            <h2 className="text-3xl font-black uppercase mb-8">
                {magnet.titulo}
            </h2>

              <p className="text-sm text-gray-500">
                Localização
              </p>

              <p className="mb-6">
                {magnet.localização}
              </p>

              <p className="text-sm text-gray-500">
                Descrição
              </p>

              <p className="mb-8">
                {magnet.descrição}
              </p>

              <div className="flex flex-col lg:flex-row gap-4">

              <Button
                type="button"
                className="w-full lg:flex-1 rounded-none uppercase text-xs font-bold tracking-widest bg-neutral-700 text-white hover:bg-neutral-800"
                >
                Enter in VR Experience
            </Button>

                <Button
                    type="button"
                    variant="outline"
                    className="w-full lg:flex-1 rounded-none border-black uppercase text-xs font-bold tracking-widest text-black hover:text-white hover:bg-neutral-800"
                >
                  Print Magnet
                </Button>

              </div>

            </div>

            {/* Botão eliminar */}
            <div className="p-8 flex justify-end">

              <button
                className="flex items-center gap-2 text-red-600 hover:text-red-800"
              >
                <Trash2 size={20}/>
                Delete
              </button>

            </div>

          </div>
        )}
      </aside>
    </>
  );
}
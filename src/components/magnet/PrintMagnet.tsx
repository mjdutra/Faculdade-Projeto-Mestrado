"use client";

import { X, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Magnet } from "@/types/magnet";
import { MagnetViewer } from "@/components/magnet/MagnetViewer";

interface Props {
  magnet: Magnet;
  onClose: () => void;
}


const APP_URL =
  (import.meta.env.VITE_APP_URL as string | undefined) || window.location.origin;

export default function PrintMagnet({ magnet, onClose }: Props) {
  const magnetUrl = `${APP_URL}/magnet/${magnet.id}`;

  return (
    <div className="fixed inset-0 z-[999999] bg-white flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-black print:hidden">
        <h2 className="text-sm font-black uppercase">Print Magnet</h2>
        <button onClick={onClose} aria-label="Fechar">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 flex flex-col md:flex-row gap-10 items-center justify-center">
        <div className="w-full md:w-1/2 h-[45vh] md:h-[60vh]">
          <MagnetViewer modelUrl={magnet.modelURL} preserveDrawingBuffer />
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="p-4 border border-black bg-white">
            <QRCodeSVG value={magnetUrl} size={220} />
          </div>

          <p className="text-xs text-gray-400 break-all text-center max-w-xs">
            {magnetUrl}
          </p>

          <p className="text-sm text-gray-500">
            ID: <span className="font-mono text-black">{magnet.id}</span>
          </p>
        </div>
      </div>

      <div className="p-6 flex justify-end border-t border-black print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-none uppercase text-xs font-bold tracking-widest bg-neutral-700 text-white px-6 py-3 hover:bg-neutral-800"
        >
          <Printer size={16} />
          Imprimir
        </button>
      </div>
    </div>
  );
}
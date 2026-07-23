"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { QRCodeCanvas } from "qrcode.react";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { db } from "@/firebase/config";
import { X, Check, RotateCcw } from "lucide-react";
import type { Magnet } from "@/types/magnet";
import MagnetPrintScene, { type DecalState } from "@/components/magnet/MagnetPrintScene";
import { Button } from "@/components/ui/button";

interface Props {
  magnet: Magnet;
  onClose: () => void;
}

const APP_URL =
  (import.meta.env.VITE_APP_URL as string | undefined) || window.location.origin;

export default function PrintMagnet({ magnet, onClose }: Props) {
  const magnetUrl = `${APP_URL}/magnet/${magnet.id}`;

  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [qrTexture, setQrTexture] = useState<THREE.CanvasTexture | null>(null);

  const [decal, setDecal] = useState<DecalState | null>(
    magnet.qrPlacement
      ? {
          position: new THREE.Vector3(...magnet.qrPlacement.position),
          normal: new THREE.Vector3(...magnet.qrPlacement.normal),
        }
      : null
  );
  const [scale, setScale] = useState(magnet.qrPlacement?.scale ?? 0.4);
  const [saving, setSaving] = useState(false);

  // Constrói a textura three.js a partir do canvas do QR assim que este pinta.
  useEffect(() => {
    if (!qrCanvasRef.current) return;
    const texture = new THREE.CanvasTexture(qrCanvasRef.current);
    texture.needsUpdate = true;
    setQrTexture(texture);
  }, [magnetUrl]);

  const handleSave = async () => {
    if (!decal) {
      toast.error("Posicione o QR Code sobre o íman antes de guardar.");
      return;
    }
    try {
      setSaving(true);
      await updateDoc(doc(db, "magnets", magnet.id), {
        qrPlacement: {
          position: decal.position.toArray(),
          normal: decal.normal.toArray(),
          scale,
        },
      });
      toast.success("Posição do QR Code guardada.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível guardar a posição.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-white flex flex-col">
      {/* canvas invisível, usado só para gerar a textura do QR */}
      <QRCodeCanvas
        ref={qrCanvasRef}
        value={magnetUrl}
        size={512}
        level="M"
        includeMargin
        style={{ display: "none" }}
      />

      <div className="flex justify-between items-center p-4 border-b border-black">
        <div>
          <h2 className="text-sm font-black uppercase">Print Magnet</h2>
        </div>
        <button onClick={onClose} aria-label="Fechar">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 grid md:grid-cols-[1fr_320px] overflow-hidden">
        <div className="relative bg-neutral-50">
          <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
            <MagnetPrintScene
              modelUrl={magnet.modelURL}
              qrTexture={qrTexture}
              scale={scale}
              decal={decal}
              onDecalChange={setDecal}
            />
          </Canvas>

          {!decal && (
            <div className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none">
              <p className="text-xs uppercase tracking-widest bg-black text-white px-4 py-2">
                Clique sobre o íman para posicionar o QR Code
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-l border-black overflow-y-auto space-y-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">ID do íman</p>
            <p className="font-mono text-sm break-all">{magnet.id}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Aponta para</p>
            <p className="text-xs break-all text-gray-600">{magnetUrl}</p>
          </div>

          <div>
            <label className="text-sm text-gray-500 mb-2 block">
              Tamanho do QR Code
            </label>
            <input
              type="range"
              min={0.15}
              max={0.8}
              step={0.01}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={!decal}
              onClick={() => setDecal(null)}
              className="rounded-none uppercase text-xs font-bold tracking-widest"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reposicionar
            </Button>

            <Button
              type="button"
              disabled={!decal || saving}
              onClick={handleSave}
              className="rounded-none uppercase text-xs font-bold tracking-widest bg-neutral-700 text-white hover:bg-neutral-800"
            >
              <Check className="w-4 h-4 mr-2" />
              {saving ? "A guardar..." : "Guardar posição"}
            </Button>
          </div>

          <p className="text-xs text-gray-400">
            Esta posição será usada para gerar o modelo 3D final com o QR
            Code gravado, pronto a enviar para a impressora 3D.
          </p>
        </div>
      </div>
    </div>
  );
}
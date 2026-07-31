"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { db } from "@/firebase/config";
import { Check, RotateCcw, Download } from "lucide-react";
import type { Magnet } from "@/types/magnet";
import MagnetPrintScene, { type DecalState } from "@/components/magnet/MagnetPrintScene";
import type { ReliefMode } from "@/components/magnet/QRCode";
import SidePanel from "@/components/magnet/SidePanel";
import { Button } from "@/components/ui/button";
import { exportMagnetForPrint, type ExportProgress } from "@/lib/export-magnet";

interface Props {
  magnet: Magnet | null;
  open: boolean;
  onClose: () => void;
}

const APP_URL =
  (import.meta.env.VITE_APP_URL as string | undefined) || window.location.origin;

export default function PrintMagnet({ magnet, open, onClose }: Props) {
  const [decal, setDecal] = useState<DecalState | null>(null);
  const [scale, setScale] = useState(0.4);
  const [mode, setMode] = useState<ReliefMode>("emboss");
  const [reliefHeight, setReliefHeight] = useState(0.02);
  const [flipNormal, setFlipNormal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [includeGlb, setIncludeGlb] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  // Repõe o estado a partir do Firestore sempre que o painel abre
  // (para o mesmo ou outro magnet) — substitui o que antes acontecia
  // automaticamente por causa do remount a cada abertura.
  useEffect(() => {
    if (!magnet || !open) return;

    setDecal(
      magnet.qrPlacement
        ? {
            position: new THREE.Vector3(...magnet.qrPlacement.position),
            normal: new THREE.Vector3(...magnet.qrPlacement.normal),
          }
        : null
    );
    setScale(magnet.qrPlacement?.scale ?? 0.4);
    setMode(magnet.qrPlacement?.mode ?? "emboss");
    setReliefHeight(magnet.qrPlacement?.reliefHeight ?? 0.02);
    setFlipNormal(magnet.qrPlacement?.flipNormal ?? false);
  }, [magnet?.id, open]);

  const magnetUrl = magnet ? `${APP_URL}/?magnet=${magnet.id}` : "";

  const handleSave = async () => {
    if (!magnet) return;
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
          mode,
          reliefHeight,
          flipNormal,
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

  const handleExportPrint = async () => {
    if (!magnet) return;
    if (!decal) {
      toast.error("Posicione o QR Code sobre o íman antes de exportar.");
      return;
    }

    try {
      setExporting(true);
      setExportProgress({ stage: "loading-model", percent: 0, label: "A preparar..." });

      const result = await exportMagnetForPrint({
        modelUrl: magnet.modelURL,
        magnetId: magnet.id,
        qrValue: magnetUrl,
        decal,
        scale,
        mode,
        reliefHeight,
        flipNormal,
        includeGlb,
        onProgress: setExportProgress,
      });

      if (!result.resultWatertight.watertight) {
        toast.warning(
          `STL gerado, mas a malha final tem ${result.resultWatertight.unmatchedEdges} arestas abertas.`
        );
      } else {
        toast.success(`${result.stlFilename} está pronto para download.`);
      }

      if (result.glbFilename) {
        toast.success(`${result.glbFilename} também foi exportado.`);
      }
    } catch (error) {
      console.error("[PrintMagnet] Erro na exportação:", error);
      toast.error("Não foi possível gerar o modelo para impressão.");
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  };

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="print magnet"
      overlayZIndexClassName="z-[100000]"
      panelZIndexClassName="z-[100001]"
    >
      {magnet && open && (
        <>
          <div className="relative h-[42vh] shrink-0 border-b border-black bg-neutral-50">
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
              <Suspense fallback={null}>
                <MagnetPrintScene
                  modelUrl={magnet.modelURL}
                  qrValue={magnetUrl}
                  scale={scale}
                  mode={mode}
                  reliefHeight={reliefHeight}
                  flipNormal={flipNormal}
                  decal={decal}
                  onDecalChange={setDecal}
                />
              </Suspense>
            </Canvas>

            {!decal && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none px-4">
                <p className="text-xs uppercase tracking-widest bg-black text-white px-4 py-2 text-center">
                  Clique sobre o íman para posicionar o QR Code
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">ID do íman</p>
              <p className="font-mono text-sm break-all">{magnet.id}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-2 block">Tamanho do QR Code</label>
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

            <div>
              <label className="text-sm text-gray-500 mb-2 block">Profundidade do relevo</label>
              <input
                type="range"
                min={0.005}
                max={0.05}
                step={0.001}
                value={reliefHeight}
                onChange={(e) => setReliefHeight(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-2 block">Relevo</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={mode === "emboss" ? "default" : "outline"}
                  onClick={() => setMode("emboss")}
                  className="rounded-none uppercase text-xs font-bold tracking-widest"
                >
                  Alto relevo
                </Button>
                <Button
                  type="button"
                  variant={mode === "deboss" ? "default" : "outline"}
                  onClick={() => setMode("deboss")}
                  className="rounded-none uppercase text-xs font-bold tracking-widest"
                >
                  Baixo relevo
                </Button>
              </div>
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

            <div className="pt-6 border-t border-gray-200 space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={includeGlb}
                  onChange={(e) => setIncludeGlb(e.target.checked)}
                  disabled={exporting}
                />
                Exportar também em .glb
              </label>

              <Button
                type="button"
                disabled={!decal || exporting}
                onClick={handleExportPrint}
                className="w-full rounded-none uppercase text-xs font-bold tracking-widest"
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? "A exportar..." : "Exportar para impressão"}
              </Button>

              {exporting && exportProgress && (
                <div className="space-y-2">
                  <div className="h-1.5 w-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-black transition-all duration-300"
                      style={{ width: `${exportProgress.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{exportProgress.label}</span>
                    <span>{Math.round(exportProgress.percent)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </SidePanel>
  );
}
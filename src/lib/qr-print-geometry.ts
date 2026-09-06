import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { generateQRMatrix } from "@/lib/qrcode";

export type QRPrintReliefMode = "emboss" | "deboss";

interface BuildQRReliefOptions {
  size: number;
  mode: QRPrintReliefMode;
  reliefHeight: number;
  baseHeight: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

const BLEED = 1.02;

// Cria o QR Code como uma única geometria 3D.
export function buildQRReliefGeometry(
  value: string,
  {
    size,
    mode,
    reliefHeight,
    baseHeight,
    errorCorrectionLevel = "H",
  }: BuildQRReliefOptions
): THREE.BufferGeometry {
  const matrix = generateQRMatrix(value, {
    errorCorrectionLevel,
    quietZone: 4,
  });

  const moduleCount = matrix.size;
  const moduleSize = size / moduleCount;

  const geometries: THREE.BufferGeometry[] = [];

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      const dark = matrix.isDark(row, col);

      const raised = mode === "emboss" ? dark : !dark;
      const height = raised ? baseHeight + reliefHeight : baseHeight;

      const x = (col - moduleCount / 2 + 0.5) * moduleSize;
      const y = (moduleCount / 2 - row - 0.5) * moduleSize;
      const geometry = new THREE.BoxGeometry(
        moduleSize * BLEED,
        moduleSize * BLEED,
        height
      ).toNonIndexed();

      geometry.translate(x, y, height / 2);

      geometries.push(geometry);
    }
  }

  if (geometries.length === 0) {
    throw new Error("Não foi possível gerar a geometria do QR Code.");
  }

  const merged = mergeGeometries(geometries, false);

  geometries.forEach((geometry) => {
    geometry.dispose();
  });

  if (!merged) {
    throw new Error("Não foi possível fundir os módulos do QR Code.");
  }

  merged.computeBoundingBox();
  merged.computeBoundingSphere();

  return merged;
}
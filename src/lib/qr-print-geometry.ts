import * as THREE from "three";
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

      const raised =
        mode === "emboss"
          ? dark
          : !dark;

      const height = raised
        ? baseHeight + reliefHeight
        : baseHeight;

      const x =
        (col - moduleCount / 2 + 0.5) *
        moduleSize;

      const y =
        (moduleCount / 2 - row - 0.5) *
        moduleSize;

      const geometry = new THREE.BoxGeometry(
        moduleSize * BLEED,
        moduleSize * BLEED,
        height
      );

      geometry.translate(
        x,
        y,
        height / 2
      );

      geometries.push(geometry);
    }
  }

  if (geometries.length === 0) {
    throw new Error("Não foi possível gerar a geometria do QR Code.");
  }

  const merged = mergeBoxGeometries(geometries);

  geometries.forEach((geometry) => {
    geometry.dispose();
  });

  return merged;
}

/**
 * Junta as BoxGeometry sem depender de BufferGeometryUtils.
 */
function mergeBoxGeometries(
  geometries: THREE.BufferGeometry[]
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  for (const geometry of geometries) {
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const uv = geometry.getAttribute("uv");
    const index = geometry.index;

    if (!position || !normal || !uv) {
      throw new Error(
        "Geometria do QR Code sem os atributos necessários."
      );
    }

    // for (let i = 0; i < position.count; i++) {
    //   positions.push(
    //     position.getX(i),
    //     position.getY(i),
    //     position.getZ(i)
    //   );

    //   normals.push(
    //     normal.getX(i),
    //     normal.getY(i),
    //     normal.getZ(i)
    //   );

    //   uvs.push(
    //     uv.getX(i),
    //     uv.getY(i)
    //   );
    // }
  }

  const result = new THREE.BufferGeometry();

  result.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      positions,
      3
    )
  );

  result.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(
      normals,
      3
    )
  );

  result.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(
      uvs,
      2
    )
  );

  result.computeBoundingBox();
  result.computeBoundingSphere();

  return result;
}
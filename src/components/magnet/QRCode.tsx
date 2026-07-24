"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { generateQRMatrix } from "@/lib/qrcode";

export type ReliefMode = "emboss" | "deboss";

export interface QRCodeReliefProps {
  value: string;
  size: number;
  /** "emboss" = módulos escuros salientes (alto relevo).
   *  "deboss" = módulos escuros gravados/rebaixados (baixo relevo). */
  mode?: ReliefMode;
  reliefHeight?: number;
  baseHeight?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  color?: string;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
}

const tempObject = new THREE.Object3D();

export default function QRCodeRelief({
  value,
  size,
  mode = "emboss",
  reliefHeight = 0.02,
  baseHeight = 0.015,
  errorCorrectionLevel = "H",
  color = "#d6d6d6",
  onPointerDown,
  onPointerOver,
  onPointerOut,
}: QRCodeReliefProps) {
  const matrix = useMemo(
    () => generateQRMatrix(value, { errorCorrectionLevel, quietZone: 4 }),
    [value, errorCorrectionLevel]
  );

  const moduleCount = matrix.size;
  const moduleSize = size / moduleCount;
  const instanceCount = moduleCount * moduleCount;
  const bleed = 1.02;

  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    let i = 0;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        const dark = matrix.isDark(row, col);
        const raised = mode === "emboss" ? dark : !dark;
        const height = raised ? baseHeight + reliefHeight : baseHeight;

        const x = (col - moduleCount / 2 + 0.5) * moduleSize;
        const y = (moduleCount / 2 - row - 0.5) * moduleSize;
        const z = height / 2;

        tempObject.position.set(x, y, z);
        tempObject.scale.set(moduleSize * bleed, moduleSize * bleed, height);
        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);
        i++;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrix, moduleCount, moduleSize, mode, reliefHeight, baseHeight, bleed]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, instanceCount]}
      castShadow
      receiveShadow
      onPointerDown={onPointerDown}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={0.65} metalness={0.05} />
    </instancedMesh>
  );
}
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
  /** @deprecated Não é usado — o QR code usa sempre preto/branco padrão para garantir leitura. */
  color?: string;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
}

// Cores padrão de um QR code: módulos escuros a preto, fundo a branco.
// Fixas de propósito para garantir contraste máximo e leitura fiável.
const DARK_COLOR = "#000000";
const LIGHT_COLOR = "#ffffff";

const tempObject = new THREE.Object3D();

export default function QRCodeRelief({
  value,
  size,
  mode = "emboss",
  reliefHeight = 0.02,
  baseHeight = 0.015,
  errorCorrectionLevel = "H",
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
  const bleed = 1.02;

  // Conta módulos escuros/claros para dimensionar os dois InstancedMesh.
  const { darkCount, lightCount } = useMemo(() => {
    let dark = 0;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (matrix.isDark(row, col)) dark++;
      }
    }
    return { darkCount: dark, lightCount: moduleCount * moduleCount - dark };
  }, [matrix, moduleCount]);

  const darkMeshRef = useRef<THREE.InstancedMesh>(null);
  const lightMeshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const darkMesh = darkMeshRef.current;
    const lightMesh = lightMeshRef.current;
    if (!darkMesh || !lightMesh) return;

    let di = 0;
    let li = 0;

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

        if (dark) {
          darkMesh.setMatrixAt(di, tempObject.matrix);
          di++;
        } else {
          lightMesh.setMatrixAt(li, tempObject.matrix);
          li++;
        }
      }
    }

    darkMesh.instanceMatrix.needsUpdate = true;
    lightMesh.instanceMatrix.needsUpdate = true;
    darkMesh.computeBoundingSphere();
    lightMesh.computeBoundingSphere();
  }, [matrix, moduleCount, moduleSize, mode, reliefHeight, baseHeight, bleed, darkCount, lightCount]);

  return (
    <group
      onPointerDown={onPointerDown}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <instancedMesh
        ref={darkMeshRef}
        args={[undefined, undefined, darkCount]}
        castShadow={false}
        receiveShadow={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        {/* Preto sólido — MeshBasicMaterial ignora luz da cena, sem sombras nem gradientes. */}
        <meshBasicMaterial color={DARK_COLOR} toneMapped={false} />
      </instancedMesh>

      <instancedMesh
        ref={lightMeshRef}
        args={[undefined, undefined, lightCount]}
        castShadow={false}
        receiveShadow={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        {/* Branco sólido — mesmo material base, sem efeitos visuais. */}
        <meshBasicMaterial color={LIGHT_COLOR} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
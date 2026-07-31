"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import QRCodeRelief, { type ReliefMode } from "@/components/magnet/QRCode";

export interface DecalState {
  position: THREE.Vector3;
  normal: THREE.Vector3;
}

interface Props {
  modelUrl: string;
  qrValue: string;
  scale: number;
  mode: ReliefMode;
  reliefHeight: number;
  flipNormal?: boolean;
  decal: DecalState | null;
  onDecalChange: (decal: DecalState) => void;
}

const SURFACE_OFFSET = 0.01;

// Dimensão visual comum para todos os magnets.
const TARGET_MODEL_SIZE = 3;

export default function MagnetPrintScene({
  modelUrl,
  qrValue,
  scale,
  mode,
  reliefHeight,
  flipNormal = false,
  decal,
  onDecalChange,
}: Props) {
  const { scene } = useGLTF(modelUrl);

  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  const groupRef = useRef<THREE.Group>(null);
  const isDragging = useRef(false);
  const [orbitEnabled, setOrbitEnabled] = useState(true);

  /**
   * Normaliza o GLB:
   * - calcula o bounding box real
   * - centra o modelo no origem
   * - escala o maior eixo para TARGET_MODEL_SIZE
   *
   * Assim, GLBs com dimensões originais diferentes aparecem
   * exactamente com a mesma dimensão visual.
   */
  const normalizedScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Centrar o modelo antes de calcular a escala.
    clonedScene.position.sub(center);

    const maxDimension = Math.max(size.x, size.y, size.z);

    if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
      return 1;
    }

    return TARGET_MODEL_SIZE / maxDimension;
  }, [clonedScene]);

  const placeFromEvent = (e: ThreeEvent<PointerEvent>) => {
    if (!e.face || !groupRef.current) return;

    const normalMatrix = new THREE.Matrix3().getNormalMatrix(
      e.object.matrixWorld
    );

    const worldNormal = e.face.normal
      .clone()
      .applyMatrix3(normalMatrix)
      .normalize();

    const worldPoint = e.point.clone();

    const group = groupRef.current;

    const localPoint = group.worldToLocal(worldPoint.clone());

    const invNormalMatrix = new THREE.Matrix3()
      .getNormalMatrix(group.matrixWorld)
      .invert();

    const localNormal = worldNormal
      .clone()
      .applyMatrix3(invNormalMatrix)
      .normalize();

    onDecalChange({
      position: localPoint,
      normal: localNormal,
    });
  };

  const handleModelPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (decal) return;

    e.stopPropagation();
    placeFromEvent(e);
  };

  const handleModelPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging.current) return;

    e.stopPropagation();
    placeFromEvent(e);
  };

  const startDrag = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();

    isDragging.current = true;
    setOrbitEnabled(false);
  };

  useEffect(() => {
    const stopDrag = () => {
      isDragging.current = false;
      setOrbitEnabled(true);
    };

    window.addEventListener("pointerup", stopDrag);

    return () => {
      window.removeEventListener("pointerup", stopDrag);
    };
  }, []);

  const effectiveNormal = useMemo(() => {
    if (!decal) {
      return new THREE.Vector3(0, 0, 1);
    }

    return flipNormal
      ? decal.normal.clone().negate()
      : decal.normal.clone();
  }, [decal, flipNormal]);

  const panelPosition = useMemo(() => {
    if (!decal) {
      return new THREE.Vector3();
    }

    return decal.position
      .clone()
      .add(effectiveNormal.clone().multiplyScalar(SURFACE_OFFSET));
  }, [decal, effectiveNormal]);

  const panelQuaternion = useMemo(() => {
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      effectiveNormal
    );
  }, [effectiveNormal]);

  return (
    <>
      {/* Mesma iluminação da Homepage */}
      <ambientLight intensity={0.5} />

      <directionalLight
        position={[3, 3, 3]}
        intensity={15}
        castShadow={false}
      />

      <Environment preset="city" />

      <group
        ref={groupRef}
        scale={normalizedScale}
      >
        <primitive
          object={clonedScene}
          onPointerDown={handleModelPointerDown}
          onPointerMove={handleModelPointerMove}
        />

        {decal && (
          <group
            position={panelPosition}
            quaternion={panelQuaternion}
          >
            <QRCodeRelief
              value={qrValue}
              size={scale}
              mode={mode}
              reliefHeight={reliefHeight}
              onPointerDown={startDrag}
              onPointerOver={() => {
                document.body.style.cursor = "grab";
              }}
              onPointerOut={() => {
                document.body.style.cursor = "auto";
              }}
            />
          </group>
        )}
      </group>

      <OrbitControls
        enabled={orbitEnabled}
        rotateSpeed={0.5}
      />
    </>
  );
}
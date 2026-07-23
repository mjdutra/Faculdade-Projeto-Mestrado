"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { eulerFromNormal } from "@/lib/decal-utils";

export interface DecalState {
  position: THREE.Vector3;
  normal: THREE.Vector3;
}

interface Props {
  modelUrl: string;
  qrTexture: THREE.Texture | null;
  scale: number;
  decal: DecalState | null;
  onDecalChange: (decal: DecalState) => void;
}

export default function MagnetPrintScene({
  modelUrl,
  qrTexture,
  scale,
  decal,
  onDecalChange,
}: Props) {
  
  
  
  const { scene } = useGLTF(modelUrl);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);


  const groupRef = useRef<THREE.Group>(null);
  const isDragging = useRef(false);
  const [orbitEnabled, setOrbitEnabled] = useState(true);


  const placeFromEvent = (e: ThreeEvent<PointerEvent>) => {
    if (!e.face || !groupRef.current) return;

    const normalMatrix = new THREE.Matrix3().getNormalMatrix(e.object.matrixWorld);
    const worldNormal = e.face.normal.clone().applyMatrix3(normalMatrix).normalize();
    const worldPoint = e.point.clone();

    const group = groupRef.current;
    const localPoint = group.worldToLocal(worldPoint.clone());

    const invNormalMatrix = new THREE.Matrix3()
      .getNormalMatrix(group.matrixWorld)
      .invert();
    const localNormal = worldNormal.clone().applyMatrix3(invNormalMatrix).normalize();

    onDecalChange({ position: localPoint, normal: localNormal });
  };


  const handleModelPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (decal) return;
    e.stopPropagation();
    placeFromEvent(e);
  };

  // Enquanto arrasta o sticker, segue a superfície por baixo do cursor.
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
    return () => window.removeEventListener("pointerup", stopDrag);
  }, []);

  const stickerRotation = useMemo(() => {
    if (!decal) return new THREE.Euler();
    return eulerFromNormal(decal.position, decal.normal);
  }, [decal]);


  const stickerPosition = useMemo(() => {
    if (!decal) return new THREE.Vector3();
    return decal.position.clone().add(decal.normal.clone().multiplyScalar(0.01));
  }, [decal]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 3, 3]} intensity={12} />

      <group ref={groupRef} scale={1.5}>
      <primitive
        object={clonedScene}
        onPointerDown={handleModelPointerDown}
        onPointerMove={handleModelPointerMove}
      />

        {decal && qrTexture && (
          <mesh
            position={stickerPosition}
            rotation={stickerRotation}
            onPointerDown={startDrag}
            onPointerOver={() => (document.body.style.cursor = "grab")}
            onPointerOut={() => (document.body.style.cursor = "auto")}
          >
            <planeGeometry args={[scale, scale]} />
            <meshBasicMaterial
              map={qrTexture}
              transparent
              alphaTest={0.2}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>

      <OrbitControls enabled={orbitEnabled} rotateSpeed={0.5} />
    </>
  );
}
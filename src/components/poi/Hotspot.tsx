"use client";
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { PointOfInterest } from "./PointOfInterest";
import { HotspotTooltip } from "./HotspotTooltip";

interface HotspotProps {
  point: PointOfInterest;
  position: THREE.Vector3;
  video: HTMLVideoElement;
  isAddingPOI: boolean;
  onHoverChange?: (id: string, hovering: boolean) => void;
}

export function Hotspot({ point, position, video, onHoverChange }: HotspotProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const t = video.currentTime;
    const isVisible = point.permanent
  ? t >= point.timestamp
  : t >= point.timestamp &&
    t <= point.timestamp + (point.duration ?? 5);

    mesh.visible = isVisible;
    if (!isVisible && hovered) {
      setHovered(false);
      onHoverChange?.(point.id, false);
    }
  });


  useEffect(() => {
    return () => {
      if (hovered) onHoverChange?.(point.id, false);
    };
  }, []);

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHoverChange?.(point.id, true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onHoverChange?.(point.id, false);
      }}
    >
      <sphereGeometry args={[hovered ? 0.9 : 0.6, 16, 16]} />
      <meshBasicMaterial color={hovered ? "#ffffff" : "#ff0000"} />

      {hovered && (
        <Html center style={{ pointerEvents: "none", transform: "translateY(-120%)" }}>
          <HotspotTooltip point={point} />
        </Html>
      )}
    </mesh>
  );
}
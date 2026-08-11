"use client";
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Billboard, Text } from "@react-three/drei";
import { useXR } from "@react-three/xr";
import * as THREE from "three";
import { PointOfInterest } from "./PointOfInterest";
import { HotspotTooltip } from "./HotspotTooltip";
import { isPointActive } from "@/lib/poi";

interface HotspotProps {
  point: PointOfInterest;
  position: THREE.Vector3;
  video: HTMLVideoElement;
  isAddingPOI: boolean;
  isSelected?: boolean;
  onHoverChange?: (id: string, hovering: boolean) => void;
  onSelectChange?: (id: string) => void;
}

const BASE_RADIUS = { desktop: 0.8, vr: 1.5 };
const HOVER_RADIUS = { desktop: 1, vr: 2 };
const PULSE_SPEED = 3;
const PULSE_AMOUNT = 0.12;

export function Hotspot({ 
  point, position, video, onHoverChange, isSelected = false, onSelectChange 
}: HotspotProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const inVR = useXR((state) => state.mode === "immersive-vr");

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const isVisible = isPointActive(point, video.currentTime);
    mesh.visible = isVisible;

    if (!isVisible) {
      if (hovered) { setHovered(false); onHoverChange?.(point.id, false); }
      if (isSelected) onSelectChange?.(point.id);
      return;
    }

    if (inVR && !hovered && !isSelected) {
      const pulse = 1 + Math.sin(clock.elapsedTime * PULSE_SPEED) * PULSE_AMOUNT;
      mesh.scale.setScalar(pulse);
    } else {
      mesh.scale.setScalar(1);
    }
  });

  useEffect(() => {
    return () => {
      if (hovered) onHoverChange?.(point.id, false);
      if (isSelected) onSelectChange?.(point.id);
    };
  }, []);

  const radius = hovered
    ? (inVR ? HOVER_RADIUS.vr : HOVER_RADIUS.desktop)
    : (inVR ? BASE_RADIUS.vr : BASE_RADIUS.desktop);

  const highlighted = hovered || isSelected;
  const showContent = hovered || isSelected;

  return (
    <mesh
      ref={meshRef}
      position={position}
      pointerEventsOrder={100}
      pointerEventsType={{ deny: "grab" }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!hovered) { setHovered(true); onHoverChange?.(point.id, true); }
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onHoverChange?.(point.id, false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectChange?.(point.id);
      }}
    >
      <sphereGeometry args={[radius, 16, 16]} />
      <meshBasicMaterial color={highlighted ? "#ffffff" : "#ff0000"} />

      {showContent && !inVR && (
        <Html center style={{ pointerEvents: "none", transform: "translateY(-120%)" }}>
          <HotspotTooltip point={point} />
        </Html>
      )}

      {showContent && inVR && (
        <Billboard position={[0, radius + 0.6, 0]}>
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[2.6, 0.9]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
          </mesh>
          <Text
            fontSize={0.28}
            color="#111111"
            anchorX="center"
            anchorY="middle"
            maxWidth={2.3}
            textAlign="center"
            position={[0, 0, 0.01]}
          >
            {point.title || "Ponto de Interesse"}
          </Text>
        </Billboard>
      )}
    </mesh>
  );
}
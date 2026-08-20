"use client";
import { useEffect, useRef, useState } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { Billboard, Html, Text } from "@react-three/drei";
import { useXR } from "@react-three/xr";
import * as THREE from "three";
import { PointOfInterest } from "./PointOfInterest";
import { HotspotTooltip } from "./HotspotTooltip";
import { HotspotVR } from "./HotspotVR";
import { isPointActive } from "@/lib/poi";

interface HotspotProps {
  point: PointOfInterest;
  position: THREE.Vector3;
  video: HTMLVideoElement;
  isAddingPOI: boolean;
  isSelected?: boolean;
  isDragging?: boolean;
  onHoverChange?: (id: string, hovering: boolean) => void;
  onSelectChange?: (id: string) => void;
  onDragStart?: (id: string) => void;
}

const BASE_RADIUS = { desktop: 0.8, vr: 1.5 };
const HOVER_RADIUS = { desktop: 1, vr: 1.5 };
const PULSE_SPEED = 3;
const PULSE_AMOUNT = 0.12;
const DRAG_THRESHOLD = 6;

// Etiqueta permanente com o título encurtado do POI.
const LABEL_MAX_LENGTH = 18;
const LABEL_LERP_FACTOR = 0.18;

const HIT_RADIUS_MULTIPLIER = { desktop: 1.8, vr: 2.4 };

function shortenTitle(title: string) {
  const clean = title?.trim() || "Ponto de Interesse";
  return clean.length > LABEL_MAX_LENGTH
    ? `${clean.slice(0, LABEL_MAX_LENGTH - 1)}…`
    : clean;
}

export function Hotspot({ 
  point, position, video, isAddingPOI, onHoverChange, isSelected = false, isDragging = false, onSelectChange, onDragStart
}: HotspotProps) {
  const groupRef = useRef<THREE.Group>(null);
  const visualMeshRef = useRef<THREE.Mesh>(null);
  const labelTextRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(true);
  const inVR = useXR((state) => state.mode === "immersive-vr");

  const highlighted = hovered || isSelected || isDragging;
  const showContent = (hovered || isSelected) && !isDragging;

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;

    const isVisible = isPointActive(point, video.currentTime);
    group.visible = isVisible;

    if (isVisible !== active) setActive(isVisible);

    if (!isVisible) {
      if (hovered) { setHovered(false); onHoverChange?.(point.id, false); }
      if (isSelected) onSelectChange?.(point.id);
      return;
    }

    const visualMesh = visualMeshRef.current;
    if (visualMesh) {
      if (inVR && !hovered && !isSelected) {
        const pulse = 1 + Math.sin(clock.elapsedTime * PULSE_SPEED) * PULSE_AMOUNT;
        visualMesh.scale.setScalar(pulse);
      } else {
        visualMesh.scale.setScalar(1);
      }
    }

    if (labelTextRef.current) {
      const target = showContent ? 0 : 1;
      const current = labelTextRef.current.fillOpacity ?? 1;
      labelTextRef.current.fillOpacity = THREE.MathUtils.lerp(current, target, LABEL_LERP_FACTOR);
    }
  });

  useEffect(() => {
    return () => {
      if (hovered) onHoverChange?.(point.id, false);
      if (isSelected) onSelectChange?.(point.id);
    };
  }, []);

  const radius = hovered || isDragging
    ? (inVR ? HOVER_RADIUS.vr : HOVER_RADIUS.desktop)
    : (inVR ? BASE_RADIUS.vr : BASE_RADIUS.desktop);

  const baseRadius = inVR ? BASE_RADIUS.vr : BASE_RADIUS.desktop;
  const hitRadius = baseRadius * (inVR ? HIT_RADIUS_MULTIPLIER.vr : HIT_RADIUS_MULTIPLIER.desktop);

  const shortTitle = shortenTitle(point.title);

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!hovered) { setHovered(true); onHoverChange?.(point.id, true); }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    onHoverChange?.(point.id, false);
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (isAddingPOI) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let dragStarted = false;

    const handleWindowMove = (ev: PointerEvent) => {
      if (dragStarted) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        dragStarted = true;
        onDragStart?.(point.id);
        window.removeEventListener("pointermove", handleWindowMove);
      }
    };

    const handleWindowUp = () => {
      window.removeEventListener("pointermove", handleWindowMove);
      window.removeEventListener("pointerup", handleWindowUp);
      if (!dragStarted) {
        onSelectChange?.(point.id);
      }
    };

    window.addEventListener("pointermove", handleWindowMove);
    window.addEventListener("pointerup", handleWindowUp);
  };

  return (
    <group ref={groupRef} position={position}>
      <mesh
        pointerEventsOrder={100}
        pointerEventsType={{ deny: "grab" }}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
      >
        <sphereGeometry args={[hitRadius, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh ref={visualMeshRef}>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshBasicMaterial color={highlighted ? "#ffffff" : "#ff0000"} />
      </mesh>

      {active && !inVR && (
        <>
          <Html
            center
            style={{
              pointerEvents: "none",
              transform: "translate(20%, -55%)",
              opacity: showContent ? 0 : 1,
              transition: "opacity 200ms ease",
            }}
          >
            <span className="px-2 py-1 bg-black/60 text-white text-[10px] font-bold uppercase tracking-widest whitespace-nowrap rounded-sm">
              {shortTitle}
            </span>
          </Html>

          <Html
            center
            style={{
              pointerEvents: "none",
              transform: "translate(10%, -50%)",
              opacity: showContent ? 1 : 0,
              transition: "opacity 200ms ease",
            }}
          >
            <HotspotTooltip point={point} />
          </Html>
        </>
      )}

      {active && inVR && (
        <>
          <Billboard position={[0, radius + 0.35, 0]}>
            <Text
              ref={labelTextRef}
              fontSize={0.16}
              color="#ffffff"
              outlineWidth={0.01}
              outlineColor="#000000"
              anchorX="center"
              anchorY="middle"
              raycast={() => null}
            >
              {shortTitle}
            </Text>
          </Billboard>

          {showContent && (
            <HotspotVR point={point} radius={radius} />
          )}
        </>
      )}
    </group>
  );
}
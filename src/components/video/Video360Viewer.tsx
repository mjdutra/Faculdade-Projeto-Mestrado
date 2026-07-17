"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

function Sphere({ videoUrl }: { videoUrl: string }) {
  const mesh = useRef<THREE.Mesh>(null);

  const video = useMemo(() => {
    const v = document.createElement("video");
    v.src = videoUrl;
    v.crossOrigin = "anonymous";
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;
    return v;
  }, [videoUrl]);

  useEffect(() => {
    video.play().catch(() => {});

    return () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [video]);

  const texture = useMemo(() => {
    const t = new THREE.VideoTexture(video);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [video]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame(() => {
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      texture.needsUpdate = true;
    }
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[50, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

export default function Video360Viewer({ videoUrl }: { videoUrl: string }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 0.1] }}
      style={{ width: "100%", height: "100%" }}
    >
      <Sphere videoUrl={videoUrl} />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={-0.4}
      />
    </Canvas>
  );
}
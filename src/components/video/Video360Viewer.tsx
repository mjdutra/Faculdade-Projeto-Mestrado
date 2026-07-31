"use client";

import { ThreeEvent } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { XR, createXRStore } from "@react-three/xr";
import { PointOfInterest } from "@/components/poi/PointOfInterest";
import { Hotspot } from "@/components/poi/Hotspot";
import { yawPitchToVector, vectorToYawPitch } from "@/lib/spherical";

export interface Video360ViewerHandle {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  lookAt: (yaw: number, pitch: number) => void;
}

interface Video360ViewerProps {
  videoUrl: string;
  points: PointOfInterest[];
  isAddingPOI?: boolean;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onVolumeChange?: (volume: number, muted: boolean) => void;
  onEnded?: () => void;
  onPositionClick?: (position: { yaw: number; pitch: number }) => void;
}

interface CameraControllerHandle {
  lookAt: (yaw: number, pitch: number) => void;
}

const xrStore = createXRStore();

const CameraController = forwardRef<CameraControllerHandle, {}>(
  function CameraController(_, ref) {
    const { camera, gl } = useThree();
    const orbitRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      lookAt: (yaw: number, pitch: number) => {
        // No modo VR a câmara é controlada pelo headset.
        if (gl.xr.isPresenting) return;

        const dir = yawPitchToVector(yaw, pitch, 1);
        const distance = camera.position.length() || 0.1;

        camera.position.copy(
          dir.clone().multiplyScalar(-distance)
        );

        camera.lookAt(0, 0, 0);
        orbitRef.current?.update();
      },
    }));

    return (
      <OrbitControls
        ref={orbitRef}
        enableZoom={false}
        enablePan={false}
        rotateSpeed={-0.4}
        enabled={!gl.xr.isPresenting}
      />
    );
  }
);





function Sphere({
  video,
  points,
  isAddingPOI,
  onPositionClick,
  onHoverChange,
}: {
  video: HTMLVideoElement;
  points: PointOfInterest[];
  isAddingPOI: boolean;
  onPositionClick?: (position: { yaw: number; pitch: number }) => void;
  onHoverChange?: (id: string, hovering: boolean) => void;
}) {
  const texture = useMemo(() => {
    const t = new THREE.VideoTexture(video);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [video]);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      texture.needsUpdate = true;
    }
  });

  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD = 6;

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    pointerDownPos.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    const down = pointerDownPos.current;
    pointerDownPos.current = null;
    if (!isAddingPOI || !onPositionClick || !down) return;

    const dx = event.clientX - down.x;
    const dy = event.clientY - down.y;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) return;

    onPositionClick(vectorToYawPitch(event.point));
  };

  return (
    <>
      <mesh onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
        <sphereGeometry args={[50, 64, 64]} />
        <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
      </mesh>

      {points.map((point) => (
        <Hotspot
          key={point.id}
          point={point}
          video={video}
          position={yawPitchToVector(point.yaw, point.pitch, 49.8)}
          isAddingPOI={isAddingPOI}
          onHoverChange={onHoverChange}
        />
      ))}
    </>
  );
}





const Video360Viewer = forwardRef<Video360ViewerHandle, Video360ViewerProps>(function Video360Viewer(
  { videoUrl, points, isAddingPOI = false, onTimeUpdate, onDurationChange, onPlayingChange, onVolumeChange, onEnded, onPositionClick },
  ref
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const cameraControllerRef = useRef<CameraControllerHandle>(null);
  const [hoveredHotspotId, setHoveredHotspotId] = useState<string | null>(null);



  useEffect(() => {
    const v = document.createElement("video");
    v.src = videoUrl;
    v.crossOrigin = "anonymous";
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;

    videoRef.current = v;
    setVideoEl(v);
    v.play().catch(() => {});

    return () => {
      v.pause();
      v.removeAttribute("src");
      v.load();
      videoRef.current = null;
      setVideoEl(null);
    };
  }, [videoUrl]);

  useEffect(() => {
    const v = videoEl;
    if (!v) return;

    const handleTimeUpdate = () => onTimeUpdate?.(v.currentTime);
    const handleLoadedMetadata = () => onDurationChange?.(v.duration || 0);
    const handlePlay = () => onPlayingChange?.(true);
    const handlePause = () => onPlayingChange?.(false);
    const handleVolumeChange = () => onVolumeChange?.(v.volume, v.muted);
    const handleEnded = () => onEnded?.();

    v.addEventListener("timeupdate", handleTimeUpdate);
    v.addEventListener("loadedmetadata", handleLoadedMetadata);
    v.addEventListener("play", handlePlay);
    v.addEventListener("pause", handlePause);
    v.addEventListener("volumechange", handleVolumeChange);
    v.addEventListener("ended", handleEnded);

    return () => {
      v.removeEventListener("timeupdate", handleTimeUpdate);
      v.removeEventListener("loadedmetadata", handleLoadedMetadata);
      v.removeEventListener("play", handlePlay);
      v.removeEventListener("pause", handlePause);
      v.removeEventListener("volumechange", handleVolumeChange);
      v.removeEventListener("ended", handleEnded);
    };
  }, [videoEl, onTimeUpdate, onDurationChange, onPlayingChange, onVolumeChange, onEnded]);

  useImperativeHandle(
    ref,
    () => ({
      play: () => videoRef.current?.play().catch(() => {}),
      pause: () => videoRef.current?.pause(),
      togglePlay: () => {
        const v = videoRef.current;
        if (!v) return;
        v.paused ? v.play().catch(() => {}) : v.pause();
      },
      seek: (time: number) => {
        if (videoRef.current) videoRef.current.currentTime = time;
      },
      setVolume: (value: number) => {
        const v = videoRef.current;
        if (!v) return;
        v.volume = value;
        v.muted = value === 0;
      },
      toggleMute: () => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = !v.muted;
        if (!v.muted && v.volume === 0) v.volume = 1;
      },
      lookAt: (yaw: number, pitch: number) => cameraControllerRef.current?.lookAt(yaw, pitch),
    }),
    []
  );

  const handleHoverChange = useCallback((id: string, hovering: boolean) => {
    setHoveredHotspotId((prev) => {
      if (hovering) return id;
      return prev === id ? null : prev;
    });
  }, []);
  
  const cursor = hoveredHotspotId ? "pointer" : isAddingPOI ? "crosshair" : "grab";

  return (
    <div className="relative w-full h-full bg-black">
      {videoEl && (
        <Canvas
          camera={{ position: [0, 0, 0.1] }}
          style={{ width: "100%", height: "100%", cursor }}
        >
          <XR store={xrStore}>
            <Sphere
              video={videoEl}
              points={points}
              isAddingPOI={isAddingPOI}
              onPositionClick={onPositionClick}
              onHoverChange={handleHoverChange}
            />

            <CameraController ref={cameraControllerRef} />
          </XR>
        </Canvas>
      )}
      <button
          type="button"
          onClick={async () => {
            try {
              await videoRef.current?.play();
              await xrStore.enterVR();
            } catch (error) {
              console.error("Erro ao iniciar VR:", error);
            }
          }}
          className="absolute bottom-4 right-4 z-50 rounded-lg bg-white px-4 py-2 font-medium text-black shadow-lg"
        > Ver em VR
    </button>
    </div>
  );
});

export default Video360Viewer;
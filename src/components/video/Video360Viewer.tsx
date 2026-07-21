"use client";

import { ThreeEvent } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import { PointOfInterest } from "@/components/poi/PointOfInterest";

export interface Video360ViewerHandle {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
}

interface Video360ViewerProps {
  videoUrl: string;
  points: PointOfInterest[];
  isAddingPOI:boolean;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onVolumeChange?: (volume: number, muted: boolean) => void;
  onEnded?: () => void;
  onPositionClick?: (position: {
    yaw: number;
    pitch: number;
  }) => void;
}

function Sphere({
  video,
  points,
  isAddingPOI,
  onPositionClick,
}: {
  video: HTMLVideoElement;
  points: PointOfInterest[];
  isAddingPOI: boolean;
  onPositionClick?: (position: { yaw: number; pitch: number }) => void;
}) {
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

  
  const pointMeshRefs = useRef<Record<string, THREE.Mesh | null>>({});

  useFrame(() => {
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      texture.needsUpdate = true;
    }

    const t = video.currentTime;

    points.forEach((point) => {
      const mesh = pointMeshRefs.current[point.id];
      if (!mesh) return;

      const duration = point.duration ?? 5;
      const visible = t >= point.timestamp && t <= point.timestamp + duration;

      mesh.visible = visible;
    });
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
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > DRAG_THRESHOLD) return;

    const p = event.point.clone().normalize();
    const yaw = THREE.MathUtils.radToDeg(Math.atan2(p.x, p.z));
    const pitch = THREE.MathUtils.radToDeg(Math.asin(p.y));

    onPositionClick({ yaw, pitch });
  };

  function yawPitchToVector(yaw: number, pitch: number, radius: number) {
    const yawRad = THREE.MathUtils.degToRad(yaw);
    const pitchRad = THREE.MathUtils.degToRad(pitch);
    return new THREE.Vector3(
      radius * Math.sin(yawRad) * Math.cos(pitchRad),
      radius * Math.sin(pitchRad),
      radius * Math.cos(yawRad) * Math.cos(pitchRad)
    );
  }

  return (
    <>
      <mesh onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
        <sphereGeometry args={[50, 64, 64]} />
        <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
      </mesh>

      {points.map((point) => {
        const pos = yawPitchToVector(point.yaw, point.pitch, 49.8);
        return (
          <mesh
            key={point.id}
            ref={(el) => {
              pointMeshRefs.current[point.id] = el;
            }}
            position={pos}
          >
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshBasicMaterial color="red" />
          </mesh>
        );
      })}
    </>
  );
}

const Video360Viewer = forwardRef<Video360ViewerHandle, Video360ViewerProps>(
  function Video360Viewer(
    {
      videoUrl,
      points,
      isAddingPOI,
      onTimeUpdate,
      onDurationChange,
      onPlayingChange,
      onVolumeChange,
      onEnded,
      onPositionClick,
    },
    ref
  ) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

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
        play: () => {
          videoRef.current?.play().catch(() => {});
        },
        pause: () => {
          videoRef.current?.pause();
        },
        togglePlay: () => {
          const v = videoRef.current;
          if (!v) return;
          if (v.paused) v.play().catch(() => {});
          else v.pause();
        },
        seek: (time: number) => {
          const v = videoRef.current;
          if (!v) return;
          v.currentTime = time;
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
      }),
      []
    );

    return (
      <div className="relative w-full h-full bg-black">
        {videoEl && (
          <Canvas
            camera={{ position: [0, 0, 0.1] }}
            style={{ width: "100%", height: "100%", cursor:isAddingPOI ? "crosshair" : "grab" }}
          >
            <Sphere 
              video={videoEl}
              points={points}
              isAddingPOI={isAddingPOI}
              onPositionClick={onPositionClick} 
          />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              rotateSpeed={-0.4}
          />
          </Canvas>
        )}
      </div>
    );
  }
);

export default Video360Viewer;
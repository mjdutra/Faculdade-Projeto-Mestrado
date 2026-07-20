"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

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
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onVolumeChange?: (volume: number, muted: boolean) => void;
  onEnded?: () => void;
}

function Sphere({ video }: { video: HTMLVideoElement }) {
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
    <mesh>
      <sphereGeometry args={[50, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

const Video360Viewer = forwardRef<Video360ViewerHandle, Video360ViewerProps>(
  function Video360Viewer(
    {
      videoUrl,
      onTimeUpdate,
      onDurationChange,
      onPlayingChange,
      onVolumeChange,
      onEnded,
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
            style={{ width: "100%", height: "100%" }}
          >
            <Sphere video={videoEl} />
            <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={-0.4} />
          </Canvas>
        )}
      </div>
    );
  }
);

export default Video360Viewer;
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { Magnet } from "@/types/magnet";
import Video360Viewer, { Video360ViewerHandle } from "@/components/video/Video360Viewer";
import VideoControls from "@/components/video/VideoControls";

interface Props {
  magnet: Magnet;
  onClose: () => void;
}

export default function VRExperience({ magnet, onClose }: Props) {
  const viewerRef = useRef<Video360ViewerHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);


  useEffect(() => {
    containerRef.current?.requestFullscreen().catch(() => {
    });

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    const handleFsChange = () =>
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current?.requestFullscreen().catch(() => {});
    }
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-[999999] bg-black">
      <button
        onClick={onClose}
        aria-label="Voltar ao íman"
        className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
      >
        <ArrowLeft size={22} />
      </button>

      <Video360Viewer
        ref={viewerRef}
        videoUrl={magnet.videoURL}
        points={magnet.points ?? []}
        isAddingPOI={false}
        onTimeUpdate={setCurrentTime}
        onDurationChange={setDuration}
        onPlayingChange={setIsPlaying}
        onVolumeChange={(v, m) => {
          setVolume(v);
          setIsMuted(m);
        }}
      />

      <VideoControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
        onPlayPause={() => viewerRef.current?.togglePlay()}
        onSeek={(time) => viewerRef.current?.seek(time)}
        onVolumeChange={(value) => viewerRef.current?.setVolume(value)}
        onToggleMute={() => viewerRef.current?.toggleMute()}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
}
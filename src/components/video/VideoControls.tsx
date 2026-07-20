"use client";

import { useCallback, useRef } from "react";
import { Pause, Play, Maximize, Minimize, Volume2, VolumeX } from "lucide-react";

interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen?: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange?: (value: number) => void;
  onToggleMute?: () => void;
  onToggleFullscreen?: () => void;
}

function formatTime(seconds: number) {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isFullscreen = false,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
}: VideoControlsProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const isSeekingRef = useRef(false);

  const seekToClientX = useCallback(
    (clientX: number) => {
      const bar = progressRef.current;
      if (!bar || !duration) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      onSeek(ratio * duration);
    },
    [duration, onSeek]
  );

  // Clicar na timeline avança imediatamente para esse ponto
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      isSeekingRef.current = true;
      seekToClientX(e.clientX);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [seekToClientX]
  );

  // Arrastar o cursor atualiza o tempo
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isSeekingRef.current) return;
      seekToClientX(e.clientX);
    },
    [seekToClientX]
  );

  const handlePointerUp = useCallback(() => {
    isSeekingRef.current = false;
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 px-3 py-2 bg-gradient-to-t from-black/85 to-transparent flex flex-col gap-1.5">
      {/* Timeline */}
      <div
        ref={progressRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative h-3 w-full cursor-pointer flex items-center touch-none"
      >
        <div className="h-1 w-full rounded-full bg-white/30">
          <div
            className="h-1 rounded-full bg-white"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div
          className="absolute h-3 w-3 rounded-full bg-white shadow pointer-events-none"
          style={{ left: `calc(${progressPercent}% - 6px)` }}
        />
      </div>

      {/* Play/Pause, tempo, volume, fullscreen */}
      <div className="flex items-center gap-3 text-white text-xs">
        <button
          type="button"
          onClick={onPlayPause}
          aria-label={isPlaying ? "Pausar" : "Reproduzir"}
          className="hover:opacity-80"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <span className="tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="flex-1" />

        {onToggleMute && (
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? "Ativar som" : "Silenciar"}
            className="hover:opacity-80"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        )}

        {onVolumeChange && (
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            aria-label="Volume"
            className="w-16 accent-white"
          />
        )}

        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? "Sair de ecrã inteiro" : "Ecrã inteiro"}
            className="hover:opacity-80"
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
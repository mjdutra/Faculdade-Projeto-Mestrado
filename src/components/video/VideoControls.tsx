"use client";

import { useCallback, useRef } from "react";
import { Pause, Play, Maximize, Minimize, Volume2, VolumeX } from "lucide-react";

export interface VideoMarker {
  id: string;
  timestamp: number;
  duration?: number;
  permanent?: boolean;
  label?: string;
}

interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen?: boolean;
  markers?: VideoMarker[];
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange?: (value: number) => void;
  onToggleMute?: () => void;
  onToggleFullscreen?: () => void;
  onMarkerTimeChange?: (markerId: string, newTimestamp: number) => void;
  onMarkerDragEnd?: (markerId: string, finalTimestamp: number) => void;
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
  markers,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onMarkerTimeChange,
  onMarkerDragEnd,
}: VideoControlsProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const isSeekingRef = useRef(false);

  // Id do marcador atualmente a ser arrastado (null se nenhum).
  const draggingMarkerIdRef = useRef<string | null>(null);
  // Distingue clique de arrasto
  const markerDraggedRef = useRef(false);

  const timeFromClientX = useCallback(
    (clientX: number) => {
      const bar = progressRef.current;
      if (!bar || !duration) return 0;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  const seekToClientX = useCallback(
    (clientX: number) => {
      onSeek(timeFromClientX(clientX));
    },
    [timeFromClientX, onSeek]
  );

  // Clicar timeline avança para esse ponto
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      isSeekingRef.current = true;
      seekToClientX(e.clientX);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [seekToClientX]
  );

  // Arrastar cursor atualiza o tempo
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
  const MIN_RANGE_PERCENT = 0.6;

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
        <div className="relative h-1 w-full rounded-full bg-white/30 overflow-hidden">
          {duration > 0 &&
            markers?.map((marker) => {
              const startPercent = Math.min(100, Math.max(0, (marker.timestamp / duration) * 100));
              const endTime = marker.permanent
                ? duration
                : Math.min(duration, marker.timestamp + (marker.duration ?? 5));
              const endPercent = Math.min(100, Math.max(startPercent, (endTime / duration) * 100));
              const widthPercent = Math.max(endPercent - startPercent, MIN_RANGE_PERCENT);

              return (
                <div
                  key={`range-${marker.id}`}
                  className="absolute inset-y-0 bg-red-500/70 pointer-events-none"
                  style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                />
              );
            })}

          <div
            className="h-1 rounded-full bg-white"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div
          className="absolute h-3 w-3 rounded-full bg-white shadow pointer-events-none"
          style={{ left: `calc(${progressPercent}% - 6px)` }}
        />


        {duration > 0 &&
          markers?.map((marker) => {
            const percent = Math.min(100, Math.max(0, (marker.timestamp / duration) * 100));
            return (
              <button
                key={marker.id}
                type="button"
                title={marker.label || formatTime(marker.timestamp)}
                aria-label={`${marker.label || formatTime(marker.timestamp)} — arrastar para reposicionar`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  draggingMarkerIdRef.current = marker.id;
                  markerDraggedRef.current = false;
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (draggingMarkerIdRef.current !== marker.id) return;
                  e.stopPropagation();
                  markerDraggedRef.current = true;
                  const newTime = timeFromClientX(e.clientX);
                  onMarkerTimeChange?.(marker.id, newTime);
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  if (draggingMarkerIdRef.current !== marker.id) return;
                  if (markerDraggedRef.current) {
                    const finalTime = timeFromClientX(e.clientX);
                    onMarkerDragEnd?.(marker.id, finalTime);
                  } else {
                    // Não houve arrasto salta para o marcador.
                    onSeek(marker.timestamp);
                  }
                  draggingMarkerIdRef.current = null;
                }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white/80 hover:scale-125 hover:ring-red-300 transition-transform cursor-grab active:cursor-grabbing touch-none"
                style={{ left: `${percent}%` }}
              />
            );
          })}
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
"use client";

import { useCallback, useRef } from "react";
import { Pause, Play, Maximize, Minimize, Volume2, VolumeX } from "lucide-react";

export interface VideoMarker {
  id: string;
  timestamp: number;
  /** Duração (segundos) da janela em que o hotspot está ativo. Ignorado se `permanent`. */
  duration?: number;
  /** Se true, a janela ativa estende-se até ao fim do vídeo. */
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
  /** Pontos de Interesse a marcar na timeline (opcional — só desktop). */
  markers?: VideoMarker[];
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
  markers,
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

  // Mínimo de largura visível para janelas muito curtas (senão o red
  // range fica invisível ou é só 1px).
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
          {/* Janelas de atividade dos hotspots — a vermelho, por baixo do
              progresso já visto (branco), para se perceber de imediato
              onde é que cada ponto vai aparecer. */}
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

        {/* Marcador clicável no início de cada janela — impede o "seek"
            da timeline por baixo (stopPropagation no pointerDown) para
            que clicar salte exatamente para o início do hotspot. */}
        {duration > 0 &&
          markers?.map((marker) => {
            const percent = Math.min(100, Math.max(0, (marker.timestamp / duration) * 100));
            return (
              <button
                key={marker.id}
                type="button"
                title={marker.label || formatTime(marker.timestamp)}
                aria-label={`Ir para ${marker.label || formatTime(marker.timestamp)}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(marker.timestamp);
                }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white/80 hover:scale-125 hover:ring-red-300 transition-transform"
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
import type { PointOfInterest } from "@/components/poi/PointOfInterest";

/** Indica se um Ponto de Interesse está "ativo" (visível) no instante atual do vídeo. */
export function isPointActive(point: PointOfInterest, currentTime: number): boolean {
  if (point.permanent) return currentTime >= point.timestamp;
  return currentTime >= point.timestamp && currentTime <= point.timestamp + (point.duration ?? 5);
}
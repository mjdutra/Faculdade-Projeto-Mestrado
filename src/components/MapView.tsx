"use client";

import React, { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  children?: React.ReactNode;
  onMapLoad?: (map: maplibregl.Map) => void;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [-8.35, 41.5];
const DEFAULT_ZOOM = 9;

const tealTintFilter =
  "grayscale(100%) sepia(30%) hue-rotate(120deg) saturate(0%)";

export default function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  children,
  onMapLoad,
  className = "w-full h-full",
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onMapLoadRef = useRef(onMapLoad);

  // Mantém sempre o callback mais recente
  // sem obrigar o mapa a ser recriado.
  useEffect(() => {
    onMapLoadRef.current = onMapLoad;
  }, [onMapLoad]);

  // O mapa é criado UMA única vez.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center,
      zoom,
    });

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
      }),
      "top-right"
    );

    map.on("load", () => {
      mapRef.current = map;

      map.getCanvas().style.filter = tealTintFilter;

      onMapLoadRef.current?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
    >
      {children}
    </div>
  );
}
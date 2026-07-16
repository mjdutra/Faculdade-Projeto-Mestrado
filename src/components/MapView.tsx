"use client";

import React, { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  children?: React.ReactNode;
  onMapLoad?: (map: maplibregl.Map) => void;
  className?: string;
}

export default function MapView({ 
  center = [-8.35, 41.5], 
  zoom = 9, 
  children, 
  onMapLoad,
  className = "w-full h-full"
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center,
      zoom,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      mapRef.current = map;
      onMapLoad?.(map);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom, onMapLoad]);


  const tealTintFilter = 'grayscale(100%) sepia(30%) hue-rotate(120deg) saturate(0%)';

  return (
    <div 
      ref={containerRef} 
      className={className}
      style={{ filter: tealTintFilter }}
    />
  );
}
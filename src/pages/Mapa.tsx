"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import MapView from "@/components/MapView";
import maplibregl from 'maplibre-gl';
import { MapPin, Search, Layers } from "lucide-react";

interface Magnet {
  id: string;
  name: string;
  location: string;
  duration: number;
  model3d: string;
  qrCode: string;
  description: string;
  coordinates: [number, number];
}

const Mapa = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [showGallery, setShowGallery] = useState(false);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const magnets: Magnet[] = [
    {
      id: '1',
      name: 'Universidade de Coimbra',
      location: 'Coimbra',
      duration: 5,
      model3d: '/models/universidade.glb',
      qrCode: 'QR001',
      description: 'Experiência 360º da universidade histórica',
      coordinates: [-8.2967, 39.4444]
    },
  ];

  const locations = ['all', 'Guimarães', 'Braga', 'Porto', 'Lisboa'];

  const filteredMagnets = magnets.filter(magnet => {
    const matchesSearch = magnet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         magnet.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = filterLocation === 'all' || magnet.location === filterLocation;
    return matchesSearch && matchesLocation;
  });

  const handleMapLoad = (map: maplibregl.Map) => {
    mapRef.current = map;
    updateMarkers();
  };

  const updateMarkers = () => {
    if (!mapRef.current) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    filteredMagnets.forEach(magnet => {
      const markerElement = document.createElement('div');
      markerElement.className = 'w-10 h-10 bg-black-600 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-black-700 transition-transform hover:scale-110 shadow-lg';
      markerElement.innerHTML = '🧲';
      
      markerElement.addEventListener('click', () => {
        window.location.href = `/vr/${magnet.id}`;
      });

      const marker = new maplibregl.Marker(markerElement)
        .setLngLat(magnet.coordinates)
        .setPopup(
          new maplibregl.Popup({ offset: 25 })
            .setHTML(`<h3 class="font-bold text-gray-900">${magnet.name}</h3><p class="text-gray-600">${magnet.location}</p>`)
        )
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    updateMarkers();
  }, [filteredMagnets]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Map fills entire screen */}
      <MapView 
        onMapLoad={handleMapLoad}
        className="absolute inset-0 w-full h-full"
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3 mb-3">

              <Button
                asChild
                variant={showGallery ? "default" : "outline"}
                size="sm"
                className="ml-auto"
              >
                <Link to="/">
                  <Layers className="w-4 h-4 mr-1" />
                  Galeria
                </Link>
              </Button>
            </div>
            
            
            {/* Pesquisa */}
            {/* <div className="flex flex-col sm:flex-row gap-3">
              
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Procurar experiências..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>


              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Localização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {locations.filter(loc => loc !== 'all').map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select> 
            </div> */}

            {/* Tags de localização */}
            {/* <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
              {locations.filter(loc => loc !== 'all').map(location => (
                <Badge
                  key={location}
                  variant={filterLocation === location ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => setFilterLocation(filterLocation === location ? 'all' : location)}
                >
                  <MapPin className="w-3 h-3 mr-1" />
                  {location}
                </Badge>
              ))}
            </div> */}

            
          </div>
        </div>
      {/* Bottom nav is fixed by TopNav component */}
    </div>
  );
};

export default Mapa;

// {/* Gallery overlay */}
//       {showGallery && (
//         <div className="absolute top-0 left-0 right-0 bottom-16 z-20 bg-background/80 backdrop-blur-sm overflow-y-auto">
//           <div className="container mx-auto px-4 py-6">
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//               {filteredMagnets.map((magnet) => (
//                 <Card key={magnet.id} className="cursor-pointer hover:shadow-lg transition-shadow">
//                   <CardHeader>
//                     <div className="flex justify-between items-start">
//                       <CardTitle className="text-lg">{magnet.name}</CardTitle>
//                       <Badge variant="secondary">{magnet.location}</Badge>
//                     </div>
//                     <CardDescription>{magnet.description}</CardDescription>
//                   </CardHeader>
//                   <CardContent>
//                     <div className="aspect-video bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
//                       <div className="text-3xl">🧲</div>
//                     </div>
//                     <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
//                       <MapPin className="w-4 h-4" />
//                       {magnet.location} · {magnet.duration} min
//                     </div>
//                     <Button 
//                       onClick={() => window.location.href = `/vr/${magnet.id}`}
//                       className="w-full"
//                     >
//                       Ver Experiência
//                     </Button>
//                   </CardContent>
//                 </Card>
//               ))}
//             </div>
//           </div>
//         </div>
//       )}
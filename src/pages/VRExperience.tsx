"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Volume2, VolumeX, Maximize, 
  Eye,
  MapPin,
  Clock
} from "lucide-react";


interface InteractivePoint {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
}

interface VRExperienceProps {
  magnetId: string;
}

const VRExperience = ({ magnetId }: VRExperienceProps) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState([50]);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(300); // 5 minutes in seconds
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mock interactive points
  const interactivePoints: InteractivePoint[] = [
    {
      id: '1',
      x: 25,
      y: 30,
      title: 'Ponto Histórico',
      description: 'Este local tem uma importância histórica significativa...'
    },
    {
      id: '2',
      x: 70,
      y: 60,
      title: 'Vista Panorâmica',
      description: 'A partir deste ponto, pode ver toda a paisagem...'
    },
    {
      id: '3',
      x: 45,
      y: 80,
      title: 'Informação Turística',
      description: 'Saiba mais sobre as atrações desta área...'
    }
  ];

  // Mock magnet data
  const magnetData = {
    id: magnetId,
    name: 'Universidade de Coimbra',
    location: 'Coimbra',
    duration: '5 minutos',
    description: 'Experiência 360º completa da universidade histórica'
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (isPlaying && videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePointClick = (point: InteractivePoint) => {
    alert(`Ponto Interativo: ${point.title}\n\n${point.description}`);
  };

  return (
    <div className={`min-h-screen bg-black ${isFullscreen ? 'fixed inset-0 z-50' : 'relative'}`}>
      <div className="relative w-full h-screen">
        {/* Video Container */}
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted={isMuted}
            autoPlay
            loop
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          />
          
          {/* Interactive Points Overlay */}
          {interactivePoints.map((point) => (
            <button
              key={point.id}
              className="absolute w-8 h-8 bg-blue-500 bg-opacity-80 rounded-full flex items-center justify-center text-white hover:bg-opacity-100 transition-all transform hover:scale-110"
              style={{ left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }}
              onClick={() => handlePointClick(point)}
            >
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </button>
          ))}

          {/* VR Mode Button */}
          <div className="absolute top-4 right-4 z-10">
            <Button 
              onClick={toggleFullscreen}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              <Eye className="w-5 h-5 mr-2" />
              Modo VR
            </Button>
          </div>

          {/* Info Overlay */}
          <div className="absolute top-4 left-4 z-10">
            <Card className="bg-black bg-opacity-70 text-white border-gray-600">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-2">{magnetData.name}</h3>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {magnetData.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {magnetData.duration}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls Overlay */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent p-6 z-10"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            {showControls && (
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="flex items-center gap-4">
                  <span className="text-white text-sm w-12">{formatTime(currentTime)}</span>
                  <div className="flex-1">
                    <Slider
                      value={[currentTime]}
                      max={duration}
                      step={1}
                      onValueChange={(value) => {
                        setCurrentTime(value[0]);
                        if (videoRef.current) {
                          videoRef.current.currentTime = value[0];
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                  <span className="text-white text-sm w-12">{formatTime(duration)}</span>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={togglePlayPause}
                    className="text-white hover:bg-white hover:bg-opacity-20"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={toggleMute}
                      className="text-white hover:bg-white hover:bg-opacity-20"
                    >
                      {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                    </Button>
                    <div className="w-24">
                      <Slider
                        value={volume}
                        max={100}
                        step={1}
                        onValueChange={setVolume}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white hover:bg-opacity-20"
                  >
                    <Maximize className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VRExperience;
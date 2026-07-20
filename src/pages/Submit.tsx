"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/firebase/config";
import { addDoc, collection } from "firebase/firestore";
import { uploadFile } from "@/services/cloudinary";
import { QRCodeSVG } from "qrcode.react";
import TopNav from "@/components/TopNav";
import VideoControls from "@/components/video/VideoControls";
import Viewer, { Video360ViewerHandle } from "@/components/video/Video360Viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Video, Star, Box, ChevronRight, ChevronLeft, Check, Plus, Trash2 } from "lucide-react";


interface PointOfInterest {
  id: string;
  title: string;
  description: string;
  timestamp: string;

  yaw: number;
  pitch: number;
}

const STEPS = [
  { id: 1, label: "Informação"},
  { id: 2, label: "Vídeo 360º"},
  { id: 3, label: "Pontos de Interesse"},
  { id: 4, label: "Íman 3D"},
  { id: 5, label: "QR Code"},
];

const Submit = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [createdMagnetId, setCreatedMagnetId] = useState<string | null>(null);

  // Step 1 – Info
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  // Step 2 – Video
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const videoObjectUrl = useMemo(() => {
    if (!videoFile) return null;
    return URL.createObjectURL(videoFile);
  }, [videoFile]);

  useEffect(() => {
    return () => {
      if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
    };
  }, [videoObjectUrl]);

  // ── Player 360º (usado no Step 3) ──────────────────────────
  const viewerRef = useRef<Video360ViewerHandle>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Repõe estado do player quando sai do Step 3
  useEffect(() => {
    if (currentStep !== 3) {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [currentStep]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(document.fullscreenElement === playerContainerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = playerContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  // Step 3 – Points of interest
  const [points, setPoints] = useState<PointOfInterest[]>([
    {
      id: "1", title: "", description: "", timestamp: "",
      yaw: 0,
      pitch: 0
    },
  ]);

  const [clickedPosition, setClickedPosition] = useState({
    yaw: 0,
    pitch: 0,
  });

  // Step 4 – Magnet GLB
  const [glbFile, setGlbFile] = useState<File | null>(null);

  const addPoint = () => {
    setPoints([
      ...points,
      {
        id: Date.now().toString(), title: "", description: "", timestamp: "",
        yaw: 0,
        pitch: 0
      },
    ]);
  };

  const removePoint = (id: string) => {
    if (points.length === 1) return;
    setPoints(points.filter((p) => p.id !== id));
  };

  const updatePoint = (
    id: string,
    field: keyof PointOfInterest,
    value: string
  ) => {
    setPoints(points.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const canProceed = () => {
    if (currentStep === 1) return title && location && description;
    return true;
  };

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

 const handleSubmit = async () => {
  try {
    setIsSubmitting(true);

    if (!videoFile) {
      alert("Escolha um vídeo.");
      return;
    }

    if (!glbFile) {
      alert("Escolha um modelo 3D.");
      return;
    }

    const uploadedVideo = await uploadFile(videoFile);
    const uploadedModel = await uploadFile(glbFile);

    const videoURL = uploadedVideo.secure_url;
    const modelURL = uploadedModel.secure_url;

    await addDoc(collection(db, "magnets"), {
      title,
      description,
      location,
      points,
      videoURL,
      modelURL,
      createdAt: new Date(),
    });
    
    // setCreatedMagnetId(docRef.id);
    setSubmitted(true);
  } catch (error) {
    console.error(error);
  } finally {
    setIsSubmitting(false);
  }
};

  if (submitted) {
    const qrValue = `${window.location.origin}/scan/${createdMagnetId}`;

    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center space-y-5 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-black" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-black">
            Experiência Submetida!
          </h2>
          <p className="text-gray-500">
            A sua experiência foi criada com sucesso.
          </p>

          {createdMagnetId && (
            <div className="flex flex-col items-center p-6 border border-black">
              <QRCodeSVG value={qrValue} size={160} />
              <p className="text-xs text-gray-400 mt-3 break-all">{qrValue}</p>
            </div>
          )}

          <Button
            onClick={() => {
              setSubmitted(false);
              setCreatedMagnetId(null);
              setCurrentStep(1);
              setTitle("");
              setLocation("");
              setDescription("");
              setVideoFile(null);
              setPoints([
                {
                  id: "1", title: "", description: "", timestamp: "",
                  yaw: 0,
                  pitch: 0
                },
              ]);
              setGlbFile(null);
            }}


            className="bg-black text-white hover:bg-neutral-800 uppercase tracking-widest text-xs font-bold w-full">
            Nova Experiência
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      
      <TopNav />
      <div className="pt-28 h-[calc(100vh-4rem)] md:px-10 md:h-[calc(100vh-7rem)] px-4">
        <div className="w-full h-full border border-black">
          <div className="grid md:grid-cols-2 h-full">

            <div className="relative h-full">
              {currentStep === 3 && videoObjectUrl && (
                <div className="
                absolute
                top-0
                left-0
                w-full
            
                h-[35%]
                sm:h-[40%]
                md:h-[50%]
                lg:h-[60%]
            
                p-4
                md:p-8
                flex
                justify-center
                md:justify-start
                items-start">

                <div
                  ref={playerContainerRef}
                  className="
                    relative
                    h-full
                    aspect-video
                    max-w-full
                    max-h-full
                    overflow-hidden
                    border
                    bg-black"
                >
                  <Viewer
                    ref={viewerRef}
                    videoUrl={videoObjectUrl}

                    onPositionClick={(position) =>
                      setClickedPosition(position)
                    }

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
              </div>
              )}

              <h1 className="relative
                md:absolute 
                left-10 
                bottom-8 
                bg-white 
                px-3 
                md:px-0
                py-0 
                text-[2.5rem]
                md:text-[4rem]
                lg:text-[6rem] 
                xl:text-[10rem]
                font-black 
                uppercase 
                leading-[0.85] 
                tracking-tight 
                text-black 
                translate-y-6 
                md:translate-y-12
                tracking-tight
                ">
                Nova
                <br />
                Experiência
              </h1>
            </div>

            <div className="h-full p-8 md:p-10 flex flex-col overflow-y-auto">
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Passo {currentStep} de {STEPS.length}
                </span>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mt-1 mb-8 text-black">
                  {STEPS[currentStep - 1].label}
                </h2>



                {/* ── Step 1: Info ── */}
                {currentStep === 1 && (
                  <div className="space-y-5">
                    <div>
                      <Label htmlFor="title">Nome da Experiência</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Titulo da experiência"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Localização</Label>
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Ex: Guimarães, Portugal"
                        className="mt-1"
                      />

                    </div>
                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Escrever aqui..."
                        rows={4}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                {/* ── Step 2: Video ── */}
                {currentStep === 2 && (
                  <div>
                    <div className="mt-1 border-2 border-dashed border-gray-200 p-10 text-center hover:border-black transition-colors">
                      <Video className="w-14 h-14 mx-auto mb-4 text-gray-300"/>
                      <input
                        type="file"
                        id="video"
                        accept="video/*"
                        onChange={(e) =>
                          setVideoFile(e.target.files?.[0] || null)
                        }
                        className="hidden"
                      />
                      <label htmlFor="video" className="cursor-pointer">
                        <Button variant="outline" asChild>
                          <span>Escolher Vídeo</span>
                        </Button>
                      </label>
                      {videoFile ? (
                        <div className="mt-4 p-3 bg-gray-50 text-sm text-gray-700">
                          <span className="font-medium">{videoFile.name}</span>
                          <span className="text-gray-500 ml-2">
                            ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 mt-2">
                          Arraste ou clique para selecionar um ficheiro de vídeo
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Step 3: Points of interest ── */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    {points.map((point, index) => (
                      <div
                        key={point.id}
                        className="p-4 border border-gray-200 space-y-3 relative"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                            Ponto {index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePoint(point.id)}
                            disabled={points.length === 1}
                            className="text-gray-400 hover:text-black h-7 px-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div>
                          <Label>Título</Label>
                          <Input
                            value={point.title}
                            onChange={(e) =>
                              updatePoint(point.id, "title", e.target.value)
                            }
                            placeholder="Ex: Torre Principal"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Descrição</Label>
                          <Textarea
                            value={point.description}
                            onChange={(e) =>
                              updatePoint(point.id, "description", e.target.value)
                            }
                            placeholder="Descreva este ponto de interesse..."
                            rows={2}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Timestamp no vídeo</Label>
                          <Input
                            value={point.timestamp}
                            onChange={(e) =>
                              updatePoint(point.id, "timestamp", e.target.value)
                            }
                            placeholder="Ex: 00:45"
                            className="mt-1 w-32"
                          />
                        </div>

                        <div className="mt-2 text-xs text-gray-500">
                          <div>
                            Yaw: {clickedPosition.yaw.toFixed(1)}°
                          </div>
                          <div>
                            Pitch: {clickedPosition.pitch.toFixed(1)}°
                          </div>
                        </div>

                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addPoint}
                      className="w-full border-dashed"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Ponto de Interesse
                    </Button>
                  </div>
                )}

                {/* ── Step 4: Magnet GLB ── */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div>
                      <Label>Ficheiro do Íman (.glb)</Label>
                      <div className="mt-1 border-2 border-dashed border-gray-200 p-8 text-center hover:border-black transition-colors">
                        <Box className="w-14 h-14 mx-auto mb-4 text-gray-300" />
                        <input
                          type="file"
                          id="glb"
                          accept=".glb"
                          onChange={(e) => setGlbFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <label htmlFor="glb" className="cursor-pointer">
                          <Button variant="outline" asChild>
                            <span>Escolher Ficheiro .glb</span>
                          </Button>
                        </label>
                        {glbFile ? (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                            <span className="font-medium">{glbFile.name}</span>
                            <span className="text-gray-500 ml-2">
                              ({(glbFile.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 mt-2">
                            Selecione o modelo 3D do íman no formato .glb
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 5: QR Code ── */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div className="p-5 bg-gray-50 rounded-lg space-y-3 text-sm text-gray-600">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-black shrink-0" />
                        <div>
                          <span className="font-medium text-gray-900">{title || "—"}</span>
                          <span className="text-gray-400 ml-2">{location}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Video className="w-4 h-4 text-black shrink-0" />
                        <span>{videoFile ? videoFile.name : "Sem vídeo"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Star className="w-4 h-4 text-black shrink-0" />
                        <span>
                          {points.filter((p) => p.title).length} ponto(s) de
                          interesse
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Box className="w-4 h-4 text-black shrink-0" />
                        <span>
                          {glbFile ? glbFile.name : "Sem ficheiro .glb"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center p-6 bg-gray-50 rounded-lg">
                      <h3 className="font-bold uppercase tracking-widest text-xs mb-4 text-gray-800">
                        QR Code
                      </h3>
                      <div className="w-36 h-36 bg-white border-2 border-gray-200 flex items-center justify-center shadow-inner rounded-lg" />
                      <p className="text-sm text-gray-500 mt-3">
                        O QR Code será gerado após a submissão
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Navegação */}
              <div className="flex justify-end gap-3 pt-8">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    onClick={handlePrev}
                    className="rounded-none z-30 uppercase text-xs font-bold tracking-widest bg-gray-200 text-gray-500 hover:bg-gray-300 disabled:opacity-50 disabled:hover:bg-gray-200"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                ) : (
                  <div />
                )}                
                
                {currentStep < 5 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="rounded-none uppercase text-xs font-bold tracking-widest bg-neutral-700 text-white hover:bg-neutral-800"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="rounded-none uppercase text-xs font-bold tracking-widest bg-neutral-700 text-white hover:bg-neutral-800"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Submiting...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Finish
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Submit;
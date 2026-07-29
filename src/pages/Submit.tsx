"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/firebase/config";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { uploadFile } from "@/services/cloudinary";
import TopNav from "@/components/TopNav";
import VideoControls from "@/components/video/VideoControls";
import Viewer, { Video360ViewerHandle } from "@/components/video/Video360Viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Video, Star, Box, ChevronRight, ChevronLeft, Check, Plus, Trash2, Crosshair } from "lucide-react";
import { PointOfInterest } from "@/components/poi/PointOfInterest";
import { compressVideoUnderLimit, resetFFmpeg } from "@/lib/ffmpegClient";
import { useAuth } from "@/firebase/AuthContext";

const STEPS = [
  { id: 1, label: "Informação"},
  { id: 2, label: "Vídeo 360º"},
  { id: 3, label: "Pontos de Interesse"},
  { id: 4, label: "Íman 3D"},
];



function AspectFitBox({
  ratio = 16 / 9,
  className = "",
  children,
}: {
  ratio?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const compute = () => {
      const { width: cw, height: ch } = el.getBoundingClientRect();
      if (cw <= 0 || ch <= 0) return;

      let width = cw;
      let height = width / ratio;

      if (height > ch) {
        height = ch;
        width = height * ratio;
      }

      // Evita re-renders desnecessários com diferenças mínimas
      setSize((prev) => {
        if (Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5) {
          return prev;
        }
        return { width, height };
      });
    };

    compute();

    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratio]);

  return (
    <div
      ref={outerRef}
      className={`w-full h-full flex items-center justify-center ${className}`}
    >
      <div
        style={{
          width: size.width || "100%",
          height: size.height || "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}





const Submit = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { user } = useAuth();



  // Step 1 – Info ---------------------------------------------------------------------------------
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");







  // Step 2 – Video ---------------------------------------------------------------------------------
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [optimizationCrf, setOptimizationCrf] = useState<number | null>(null);
  const [optimizationTargetHeight, setOptimizationTargetHeight] = useState<number | null>(null);
  const [optimizationScaled, setOptimizationScaled] = useState(false);


  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      e.target.value = ""; // permite reselecionar o mesmo ficheiro depois

      if (!file) return;

      if (file.size <= MAX_VIDEO_SIZE) {
        setVideoFile(file);
        return;
      }

      setIsOptimizing(true);
      setOptimizationProgress(0);
      setOptimizationScaled(false);

      try {
        const compressed = await compressVideoUnderLimit(file, {
          maxSizeBytes: MAX_VIDEO_SIZE,
          onProgress: ({ crf, targetHeight, scaled, ratio }) => {
            setOptimizationCrf(crf);
            setOptimizationTargetHeight(targetHeight);
            setOptimizationScaled(scaled);
            setOptimizationProgress(Math.round(ratio * 100));
          },
        });
        setVideoFile(compressed);
      } catch (err) {
        console.error(err);
        alert("Não foi possível comprimir o vídeo. Tente outro ficheiro.");
      } finally {
        setIsOptimizing(false);
      }
    };

  const cancelOptimization = () => {
    resetFFmpeg();
    setIsOptimizing(false);
    setOptimizationProgress(0);
  };

  const videoObjectUrl = useMemo(() => {
    if (!videoFile) return null;
    return URL.createObjectURL(videoFile);
  }, [videoFile]);

  useEffect(() => {
    return () => {
      if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
    };
  }, [videoObjectUrl]);




  // ── Player 360º (usado no Step 3)
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







  // Step 3 – Points of interest ----------------------------------------------------------------------
  const [points, setPoints] = useState<PointOfInterest[]>([]);
  const [isAddingPOI, setIsAddingPOI] = useState(false);



  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
  
    return `${m.toString().padStart(2,"0")}:${s
      .toString()
      .padStart(2,"0")}`;
  };





  // Step 4 – Magnet GLB ----------------------------------------------------------------------
  const [glbFile, setGlbFile] = useState<File | null>(null);

  const addPoint = () => {
    setPoints([
      ...points,
      {
        id: Date.now().toString(), title: "", description: "",
        duration:0,
        timestamp: 0,
        yaw: 0,
        pitch: 0
      },
    ]);
  };

  const removePoint = (id: string) => {
    if (points.length === 1) return;
    setPoints(points.filter((p) => p.id !== id));
  };

  const updatePoint = <K extends keyof PointOfInterest>(
    id: string,
    field: K,
    value: PointOfInterest[K]
  ) => {
    setPoints((prev) =>
      prev.map((point) =>
        point.id === id
          ? { ...point, [field]: value }
          : point
      )
    );
  };

  const canProceed = () => {
    if (isOptimizing) return false;
    if (currentStep === 1) return title && location && description;
    return true;
  };

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
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

    await addDoc(collection(db, "magnets"), {
      titulo: title,
      localização: location,
      descrição: description,
      points,
      videoURL: uploadedVideo.secure_url,
      videoPublicId: uploadedVideo.public_id,
      videoResourceType: uploadedVideo.resource_type,
      modelURL: uploadedModel.secure_url,
      modelPublicId: uploadedModel.public_id,
      modelResourceType: uploadedModel.resource_type,
      createdAt: serverTimestamp(),
      ownerId: user?.uid,
      ownerEmail: user?.email,
    });

    setSubmitted(true);
  } catch (error) {
    console.error(error);
  } finally {
    setIsSubmitting(false);
  }
};

  if (submitted) {

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

          <div className="border border-gray-200 p-6 text-left space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-black shrink-0" />
              <div>
                <span className="font-medium text-gray-900">
                  {title || "—"}
                </span>
                <span className="text-gray-400 ml-2">
                  {location}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Video className="w-4 h-4 text-black shrink-0" />
              <span>{videoFile?.name ?? "Sem vídeo"}</span>
            </div>

            <div className="flex items-center gap-3">
              <Star className="w-4 h-4 text-black shrink-0" />
              <span>
                {points.filter((p) => p.title).length} ponto(s) de interesse
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Box className="w-4 h-4 text-black shrink-0" />
              <span>{glbFile?.name ?? "Sem ficheiro .glb"}</span>
            </div>
          </div>

          <Button
            onClick={() => {
            setSubmitted(false);
            setCurrentStep(1);
            setTitle("");
            setLocation("");
            setDescription("");
            setVideoFile(null);
            setPoints([]);
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
      <div
        className="
          pt-20
          md:pt-24
          lg:pt-24
          xl:pt-20
          2xl:pt-16
          px-4
          md:px-8
          lg:px-10
          pb-4
          h-[calc(100vh-5rem)]
          md:h-[calc(100vh-6rem)]
          lg:h-[calc(100vh-6rem)]
          xl:h-[calc(100vh-5rem)]
          2xl:h-[calc(100vh-4rem)]
        "
      >
        <div className="w-full h-full border border-black overflow-hidden">
          <div className="grid grid-rows-[55vh_1fr] sm:grid-rows-[60vh_1fr] md:grid-rows-none md:grid-cols-2 h-full">

            <div className="h-full min-h-0 flex flex-col">

              <div className="flex-1 min-h-0 relative">
                {currentStep === 3 && videoObjectUrl && (
                  <div className="absolute inset-0 p-2 sm:p-3 md:p-4 lg:p-5">
                    <AspectFitBox ratio={16 / 9}>
                      <div
                        ref={playerContainerRef}
                        className="relative w-full h-full overflow-hidden border bg-black"
                      >
                        <Viewer
                          ref={viewerRef}
                          points={points}
                          videoUrl={videoObjectUrl}
                          isAddingPOI={isAddingPOI}
                          onPositionClick={(position) => {
                            const newPoint: PointOfInterest = {
                              id: Date.now().toString(),
                              title: "",
                              description: "",
                              timestamp: currentTime,
                              duration: 5,
                              yaw: position.yaw,
                              pitch: position.pitch,
                            };
                            setPoints((prev) => [...prev, newPoint]);
                          }}
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
                    </AspectFitBox>
                  </div>
                )}
              </div>

              <div className="shrink-0 bg-white px-4 sm:px-6 md:px-8 pt-2 pb-3 md:pb-4">
                <h1
                  className="
                    text-[2rem]
                    sm:text-[2.5rem]
                    md:text-[4rem]
                    lg:text-[6rem]
                    xl:text-[7rem]
                    font-black
                    uppercase
                    leading-[0.85]
                    tracking-tight
                    text-black
                  "
                >
                  Nova
                  <br />
                  Experiência
                </h1>
              </div>
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
                        onChange={handleVideoSelect}
                        disabled={isOptimizing}
                        className="hidden"
                      />
                      <label
                        htmlFor="video"
                        className={isOptimizing ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      >
                        <Button variant="outline" asChild>
                          <span>Escolher Vídeo</span>
                        </Button>
                      </label>

                      {isOptimizing && (
                        <div className="mt-4 p-3 bg-gray-50 text-sm text-gray-700 space-y-2 text-left">
                          <div className="flex justify-between text-xs uppercase tracking-widest font-bold text-gray-500">
                           <span>
                              A comprimir vídeo
                              {optimizationTargetHeight
                                ? ` (${optimizationScaled ? `→ ${optimizationTargetHeight}p` : "resolução original"}, qualidade CRF ${optimizationCrf})`
                                : ""}
                            </span>
                            <span>{optimizationProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 overflow-hidden">
                            <div
                              className="h-full bg-neutral-700 transition-all"
                              style={{ width: `${optimizationProgress}%` }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={cancelOptimization}
                            className="text-xs text-gray-400 hover:text-black underline"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}

                      {!isOptimizing && videoFile && (
                        <div className="mt-4 p-3 bg-gray-50 text-sm text-gray-700">
                          <span className="font-medium">{videoFile.name}</span>
                          <span className="text-gray-500 ml-2">
                            ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      )}

                      {!isOptimizing && !videoFile && (
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
                    <Button
                      type="button"
                      onClick={() => setIsAddingPOI(!isAddingPOI)}
                      className={`
                        rounded-none
                        uppercase
                        text-xs
                        font-bold
                        tracking-widest
                        transition-colors
                        ${
                          isAddingPOI
                            ? "bg-gray-500 text-white hover:bg-gray-600"
                            : "bg-transparent border border-gray-300 text-gray-500 hover:border-gray-300 hover:text-white"
                        }
                      `}
                    >
                      {isAddingPOI ? "Back" : "+ Add Point of Interest"}
                    </Button>




                    {isAddingPOI ? (
                      <>
                        {points.map((point, index) => (
                          <div
                          key={point.id}

                          className="p-4 border border-gray-200 space-y-3 relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                              Ponto {index + 1}
                            </span>
                        
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  viewerRef.current?.seek(point.timestamp);
                                  viewerRef.current?.lookAt(point.yaw, point.pitch);
                                }}
                                className="text-gray-400 hover:text-black h-7 px-2"
                                title="Ir para este ponto no vídeo"
                              >
                                <Crosshair className="w-4 h-4" />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removePoint(point.id)}
                                className="text-gray-400 hover:text-black h-7 px-2"
                                title="Remover"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div>
                            <Label>Título</Label>
                            <Input
                              value={point.title}
                              onChange={(e) =>
                                updatePoint(point.id, "title", e.target.value)
                              }
                            />
                          </div>

                          <div>
                            <Label>Descrição</Label>
                            <Textarea
                              rows={2}
                              value={point.description}
                              onChange={(e) =>
                                updatePoint(point.id, "description", e.target.value)
                              }
                            />
                          </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Início</Label>
                                <p className="text-sm text-gray-700 mt-1">
                                  {formatTime(point.timestamp)}
                                </p>
                              </div>
                          

                              {!point.permanent && (
                                <div>
                                  <Label htmlFor={`duration-${point.id}`}>
                                    Duração (segundos)
                                  </Label>

                                  <Input
                                    id={`duration-${point.id}`}
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={point.duration}
                                    onChange={(e) =>
                                      updatePoint(
                                        point.id,
                                        "duration",
                                        Math.max(1, Number(e.target.value) || 1)
                                      )
                                    }
                                    className="mt-1"
                                  />
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2">
                                <input
                                  id={`permanent-${point.id}`}
                                  type="checkbox"
                                  checked={point.permanent}
                                  onChange={(e) =>
                                    updatePoint(point.id, "permanent", e.target.checked)
                                  }
                                />

                                <Label
                                  htmlFor={`permanent-${point.id}`}
                                  className="cursor-pointer"
                                >
                                  Mostrar durante todo o vídeo
                                </Label>
                              </div>

                            </div>   
                          </div>
                        ))}
                      </>

                      ) : (

                      <div className="space-y-3">

                        {points.length === 0 && (
                          <div className="border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
                            Ainda não existem Pontos de Interesse.
                          </div>
                        )}

                        {points.map((point, index) => (
                          <div
                            key={point.id}
                            onClick={() => {
                              viewerRef.current?.seek(point.timestamp);
                              viewerRef.current?.lookAt(point.yaw, point.pitch);
                            }}
                            className="border border-gray-200 p-4 flex justify-between items-center hover:bg-gray-50 transition cursor-pointer"
                          >
                            <div>
                              <h3 className="font-semibold">
                                {point.title || `Ponto ${index + 1}`}
                              </h3>

                              <p className="text-sm text-gray-500">
                                Início: {formatTime(point.timestamp)}
                              </p>

                              <p className="text-sm text-gray-500">
                              {point.permanent
                                ? "Visível durante todo o vídeo"
                                : `Duração: ${point.duration}s`}
                            </p>
                            </div>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                removePoint(point.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      )}
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
                
                {currentStep < 4 ? (
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
                    onClick={() => setShowConfirmation(true)}
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








      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

          <div className="bg-white w-full max-w-lg p-8">

            <h2 className="text-2xl font-black uppercase mb-6">
              Confirmar submissão
            </h2>

            <div className="space-y-3 text-sm text-gray-600">

              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-black shrink-0" />
                <div>
                  <span className="font-medium text-gray-900">
                    {title || "—"}
                  </span>
                  <span className="text-gray-400 ml-2">
                    {location}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Video className="w-4 h-4 text-black shrink-0" />
                <span>{videoFile?.name ?? "Sem vídeo"}</span>
              </div>

              <div className="flex items-center gap-3">
                <Star className="w-4 h-4 text-black shrink-0" />
                <span>
                  {points.filter((p) => p.title).length} ponto(s) de interesse
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Box className="w-4 h-4 text-black shrink-0" />
                <span>{glbFile?.name ?? "Sem ficheiro .glb"}</span>
              </div>

            </div>

            <div className="flex justify-end gap-3 mt-8">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
              >
                Cancelar
              </Button>

              <Button
                onClick={async () => {
                  setShowConfirmation(false);
                  await handleSubmit();
                }}
              >
                Confirmar
              </Button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Submit;
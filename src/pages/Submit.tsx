"use client";
import React, { useState } from "react";
import { db } from "@/firebase/config";
import { addDoc, collection } from "firebase/firestore";
import { uploadFile } from "@/services/cloudinary";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin,
  Video,
  Star,
  Box,
  QrCode,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Trash2,
} from "lucide-react";



interface PointOfInterest {
  id: string;
  title: string;
  description: string;
  timestamp: string;
}

const STEPS = [
  { id: 1, label: "Informação", icon: MapPin },
  { id: 2, label: "Vídeo 360º", icon: Video },
  { id: 3, label: "Pontos de Interesse", icon: Star },
  { id: 4, label: "Íman 3D", icon: Box },
  { id: 5, label: "QR Code", icon: QrCode },
];

const Submit = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Step 1 – Info
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  // Step 2 – Video
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // Step 3 – Points of interest
  const [points, setPoints] = useState<PointOfInterest[]>([
    { id: "1", title: "", description: "", timestamp: "" },
  ]);

  // Step 4 – Magnet GLB
  const [glbFile, setGlbFile] = useState<File | null>(null);

  const addPoint = () => {
    setPoints([
      ...points,
      { id: Date.now().toString(), title: "", description: "", timestamp: "" },
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

    setSubmitted(true);
  } catch (error) {
    console.error(error);
  } finally {
    setIsSubmitting(false);
  }
};

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Experiência Submetida!
          </h2>
          <p className="text-gray-500">
            A sua experiência foi criada com sucesso.
          </p>
          <Button
            onClick={() => {
              setSubmitted(false);
              setCurrentStep(1);
              setTitle("");
              setLocation("");
              setDescription("");
              setVideoFile(null);
              setPoints([
                { id: "1", title: "", description: "", timestamp: "" },
              ]);
              setGlbFile(null);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Nova Experiência
          </Button>
        </div>
      </div>
    );
  }

  return (
    
    <div className="min-h-screen">
      <style>{`
              @keyframes drift {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.85; }
              }
              .y2k-bg { animation: drift 10s ease-in-out infinite; }

              .grain::before {
                content: '';
                position: fixed;
                inset: -50%;
                width: 200%;
                height: 200%;
                z-index: -9;
                pointer-events: none;
                opacity: 0.35;
                background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
                background-repeat: repeat;
                background-size: 256px 256px;
              }
      `}</style>
        <div
          className="fixed inset-0 -z-10 y2k-bg"
          // style={{
          //   background: `
          //     radial-gradient(ellipse at 15% 60%, #bfdbfe 0%, transparent 55%),
          //     radial-gradient(ellipse at 85% 15%, #ffffff 0%, transparent 45%),
          //     radial-gradient(ellipse at 70% 85%, #93c5fd 0%, transparent 45%),
          //     radial-gradient(ellipse at 40% 20%, #dbeafe 0%, transparent 50%),
          //     linear-gradient(135deg, #1d4ed8 0%, #3b82f6 40%, #eff6ff 100%)
          //   `,
          // }}
        />

      <div className="container mx-auto px-4 py-8 pb-16 max-w-3xl">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">Nova Experiência</h1>
        </div>

        {/* Step*/}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            {/*line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-white z-0" />
            <div
              className="absolute top-5 left-0 h-0.5 bg-blue z-0 transition-all duration-500"
              style={{
                width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
              }}
            />

            {STEPS.map((step) => {
              const Icon = step.icon;
              const isDone = step.id < currentStep;
              const isActive = step.id === currentStep;
              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center gap-2 z-10"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isDone
                        ? "bg-blue-500 border-blue-500 text-white"
                        : isActive
                        ? "bg-white border-blue-500 text-blue-600"
                        : "bg-white border-gray-300 text-gray-400"
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block ${
                      isActive
                        ? "text-blue-600"
                        : isDone
                        ? "text-blue-500"
                        : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card */}
        <Card
          className="bg-white/40 backdrop-blur-sm shadow-lg border-0"
          style={{
            borderRadius: "16px",
          }}
          > 
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const Icon = STEPS[currentStep - 1].icon;
                return <Icon className="w-5 h-5 text-blue-600" />;
              })()}
              Passo {currentStep} — {STEPS[currentStep - 1].label}
            </CardTitle>

            <CardDescription>
              {currentStep === 1 && "Preencha as informações básicas da experiência"}
              {currentStep === 2 && "Carregue o vídeo 360º da experiência"}
              {currentStep === 3 && "Defina os pontos de interesse no vídeo"}
              {currentStep === 4 && "Escolha o modelo do íman 3D"}
              {currentStep === 5 && "Reveja e confirme o QR Code gerado"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">



            {/* ── Step 1: Info ── */}
            {currentStep === 1 && (
              <>
                <div>
                  <Label htmlFor="title">Título da Experiência</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Castelo de Guimarães"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Localização</Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Ex: Guimarães, Portugal"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva a experiência turística..."
                    rows={4}
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {/* ── Step 2: Video ── */}
            {currentStep === 2 && (
              <div>
                <Label>Vídeo 360º</Label>
                <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <Video className="w-14 h-14 mx-auto mb-4 text-gray-300" />
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
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                      <span className="font-medium">{videoFile.name}</span>
                      <span className="text-blue-500 ml-2">
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
                    className="p-4 border border-gray-200 rounded-lg space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-600">
                        Ponto {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePoint(point.id)}
                        disabled={points.length === 1}
                        className="text-red-400 hover:text-red-600 h-7 px-2"
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
                  <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
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
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                        <span className="font-medium">{glbFile.name}</span>
                        <span className="text-blue-500 ml-2">
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
                <p className="text-xs text-gray-400">
                  O ficheiro .glb será utilizado para a impressão 3D e visualização do íman na aplicação.
                </p>
              </div>
            )}

            {/* ── Step 5: QR Code ── */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="p-5 bg-gray-50 rounded-lg space-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="font-medium text-gray-900">{title || "—"}</span>
                      <span className="text-gray-400 ml-2">{location}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Video className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{videoFile ? videoFile.name : "Sem vídeo"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      {points.filter((p) => p.title).length} ponto(s) de
                      interesse
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Box className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      {glbFile ? glbFile.name : "Sem ficheiro .glb"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center p-6 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold mb-4 text-gray-800">
                    QR Code Gerado
                  </h3>
                  <div className="w-36 h-36 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center shadow-inner">
                    <div className="text-5xl">📱</div>
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    O QR Code será gerado após a submissão
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6 mb-8">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              Continuar
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  A submeter...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Concluir
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Submit;
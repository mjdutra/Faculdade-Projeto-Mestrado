"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Scan, CheckCircle, XCircle } from "lucide-react";

const Scan = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startScanning = async () => {
    setIsScanning(true);
    setScanResult(null);
    setIsSuccess(false);
    
    try {
      // Simulate QR code scanning
      setTimeout(() => {
        const mockResult = 'QR001'; // This would be the actual scanned QR code
        setScanResult(mockResult);
        setIsSuccess(true);
        setIsScanning(false);
        
        // Redirect to VR experience after successful scan
        setTimeout(() => {
          window.location.href = `/vr/${mockResult}`;
        }, 2000);
      }, 3000);
    } catch (error) {
      console.error('Error scanning QR code:', error);
      setIsScanning(false);
      setIsSuccess(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
  };

  const manualInput = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const qrCode = formData.get('qrCode') as string;
    
    if (qrCode) {
      setScanResult(qrCode);
      setIsSuccess(true);
      setTimeout(() => {
        window.location.href = `/vr/${qrCode}`;
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">Scan de Imã</h1>
          <p className="text-gray-600 mt-2">Digitalize o QR code do seu imã para aceder à experiência</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Scanner de QR Code
              </CardTitle>
              <CardDescription>
                Aponte a câmara para o QR code do imã para iniciar a experiência
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Scanner Area */}
              <div className="relative">
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                  {isScanning ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p>A digitalizar QR code...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <Camera className="w-16 h-16 mx-auto mb-4" />
                        <p>Clique em "Iniciar Digitalização" para começar</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Scanning Animation */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 animate-pulse"></div>
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-blue-500 animate-pulse"></div>
                    <div className="absolute top-0 bottom-0 right-0 w-1 bg-blue-500 animate-pulse"></div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex gap-4">
                <Button
                  onClick={isScanning ? stopScanning : startScanning}
                  className="flex-1"
                  variant={isScanning ? "destructive" : "default"}
                >
                  {isScanning ? (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Parar Digitalização
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4 mr-2" />
                      Iniciar Digitalização
                    </>
                  )}
                </Button>
              </div>

              {/* Result */}
              {scanResult && (
                <div className={`p-4 rounded-lg border-2 ${
                  isSuccess ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {isSuccess ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-semibold">
                      {isSuccess ? 'QR Code Encontrado!' : 'QR Code Inválido'}
                    </span>
                  </div>
                  <p className="text-sm">
                    {isSuccess 
                      ? `A redirecionar para a experiência: ${scanResult}`
                      : 'O QR code não foi reconhecido. Tente novamente.'
                    }
                  </p>
                </div>
              )}

              {/* Manual Input */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Ou digite manualmente</h3>
                <form onSubmit={manualInput} className="space-y-4">
                  <div>
                    <Label htmlFor="qrCode">Código QR</Label>
                    <Input
                      id="qrCode"
                      name="qrCode"
                      placeholder="Ex: QR001"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Aceder à Experiência
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Scan;
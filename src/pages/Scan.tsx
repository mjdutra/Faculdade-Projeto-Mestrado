"use client";

import React, { useState, useRef } from 'react';
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, CheckCircle, XCircle, ScanLine } from "lucide-react";

import { useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";


const Scan = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const qrScanner = useRef<Html5Qrcode | null>(null);


  useEffect(() => {
    return () => {
        qrScanner.current?.stop().catch(() => {});
        qrScanner.current?.clear();
    };
}, []);


useEffect(() => {
  if (!isScanning) return;

  const startCamera = async () => {
    try {
      qrScanner.current = new Html5Qrcode("reader");

      await qrScanner.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          setScanResult(decodedText);
          setIsSuccess(true);

          await qrScanner.current?.stop();
          await qrScanner.current?.clear();

          setIsScanning(false);

          window.location.href = `/vr/${decodedText}`;
        },
        () => {}
      );
    } catch (err) {
      console.error(err);
      setIsScanning(false);
    }
  };

  setTimeout(startCamera, 100);

  return () => {
    qrScanner.current?.stop().catch(() => {});
    qrScanner.current?.clear();
  };
}, [isScanning]);




const startScanning = () => {
  setScanResult(null);
  setIsSuccess(false);
  setIsScanning(true);
};

  const stopScanning = async () => {
    try {
        if (qrScanner.current) {
            await qrScanner.current.stop();
            await qrScanner.current.clear();
            qrScanner.current = null;
        }
    } catch (err) {
        console.error(err);
    }

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
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-40">
        <div className="max-w-2xl mx-auto">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Experiência
        </span>

        <h2 className="text-3xl font-black uppercase tracking-tight mt-1">
        Digitalizar QR Code
        </h2>

        <p className="text-gray-400 mt-4">
        Aponte a câmara para o QR Code do íman para abrir a experiência.
        </p>

              {/* Scanner Area */}
              <div className="relative">
                <div className="aspect-video overflow-hidden relative">
                {isScanning ? (
                  <div
                      id="reader"
                      className="w-full h-full"
                  />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center px-8">
                <Camera className="w-24 h-24 text-black mb-8" />
              
                <Button
                  onClick={startScanning}
                  className="
                    rounded-none
                    bg-black
                    hover:bg-neutral-800
                    uppercase
                    tracking-widest
                    text-sm
                    font-bold
                    px-10
                    py-6
                  "
                >
                  Iniciar Scanner
                </Button>
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

              {/* Result */}
              {scanResult && (
                <div className={`p-4 border-2 ${
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
                <div className="pt-8 border-t border-black">
                <Label className="uppercase tracking-widest text-xs">
                    Código Manual
                </Label>
                <Input
                    className="rounded-none mt-2"
                    placeholder="QR001"
                />
                <Button
                    type="submit"
                    className="
                        mt-4
                        w-full
                        rounded-none
                        uppercase
                        bg-neutral-700
                        hover:bg-neutral-800
                    "
                >
                    Abrir Experiência
                </Button>
               </div>
        </div>
      </div>
    </div>
  );
};

export default Scan;
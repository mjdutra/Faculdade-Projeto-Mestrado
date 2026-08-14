"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Html5Qrcode } from "html5-qrcode";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config"; 

const Scan = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const qrScanner = useRef<Html5Qrcode | null>(null);


  const [existingIds, setExistingIds] = useState<string[]>([]);
  const [manualValue, setManualValue] = useState("");

  useEffect(() => {
    const fetchExistingIds = async () => {
      try {
        const snapshot = await getDocs(collection(db, "magnets"));
        const ids = snapshot.docs.map((doc) => doc.id);
        setExistingIds(ids);
      } catch (err) {
        console.error("Erro ao carregar magnets da Firebase:", err);
      }
    };

    fetchExistingIds();
  }, []);

  const suggestions = (
    manualValue.trim()
      ? existingIds.filter((id) =>
          id.toLowerCase().includes(manualValue.trim().toLowerCase())
        )
      : existingIds
  ).slice(0, 3);

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
        { facingMode: "environment"},
        {
          fps: 30,
          qrbox: { width: 300, height: 400 },

        },
        async (decodedText) => {
          setScanResult(decodedText);
          setIsSuccess(true);

          await qrScanner.current?.stop();
          await qrScanner.current?.clear();

          setIsScanning(false);

          window.location.href = `/?magnet=${decodedText}`;
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

  const manualInput = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const magnetId = manualValue.trim();

    if (!magnetId) return;

    setScanResult(magnetId);
    setIsSuccess(true);

    setTimeout(() => {
      window.location.href = `/?magnet=${encodeURIComponent(magnetId)}`;
    }, 1000);
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">

        <h2 className="text-5xl font-black uppercase mt-1 tracking-tight leading-[0.85]">
        Digitalizar QR Code
        </h2>

              <div className="relative">
                <div className="aspect-video overflow-hidden relative">
                {isScanning ? (
                  <div
                      id="reader"
                      className="w-full h-full"
                  />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center px-8">
              
                <Button
                  variant="ghost"
                  onClick={startScanning}
                  className="
                    bg-transparent
                    hover:bg-transparent
                    rounded-none
                    hover:opacity-60
                    uppercase
                    text-black
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
                  <div className="flex items-start">
                    {isSuccess ? (
                      <div className="w-5 h-5 text-green-600 mr-2" />
                    ) : (
                      <div className="w-5 h-5 text-red-600 mr-2" />
                    )}

                    <div className="flex flex-col">
                      <span className="font-semibold">
                        {isSuccess ? 'QR Code Encontrado!' : 'QR Code Inválido'}
                      </span>
                      <p className="text-sm">
                        {isSuccess
                          ? `A redirecionar para a experiência: ${scanResult}`
                          : 'O QR code não foi reconhecido. Tente novamente.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Input */}
                <form
                  onSubmit={manualInput}
                  className="pt-8 border-t border-black"
                >
                <Label className="uppercase text-xs">
                  Código Manual
                </Label>
                <Input
                    name="qrCode"
                    className="rounded-none mt-2"
                    placeholder="ID do magnet"
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    autoComplete="off"
                />

                {/* Sugestões: até 3 ids existentes na Firebase */}
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {suggestions.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setManualValue(id)}
                        className="
                          text-xs
                          uppercase
                          border
                          border-neutral-400
                          px-2
                          py-1
                          hover:bg-neutral-100
                        "
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                )}

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
              </form>
          </div>
        </div>
      </div>
  );
};

export default Scan;
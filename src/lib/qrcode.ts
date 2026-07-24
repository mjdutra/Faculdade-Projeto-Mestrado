import QRCode from "qrcode";

export interface QRMatrix {
  size: number;
  isDark: (row: number, col: number) => boolean;
}

interface Options {
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  quietZone?: number;
}


export function generateQRMatrix(text: string, options: Options = {}): QRMatrix {
  const { errorCorrectionLevel = "H", quietZone = 4 } = options;

  const qr = QRCode.create(text, { errorCorrectionLevel });
  const rawSize = qr.modules.size;
  const rawData = qr.modules.data; // Uint8Array; bit 0 = módulo escuro

  const size = rawSize + quietZone * 2;

  const isDark = (row: number, col: number): boolean => {
    const r = row - quietZone;
    const c = col - quietZone;
    if (r < 0 || c < 0 || r >= rawSize || c >= rawSize) return false; 
    return (rawData[r * rawSize + c] & 1) === 1;
  };

  return { size, isDark };
}
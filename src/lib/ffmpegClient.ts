import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CORE_VERSION = "0.12.10"; 
const CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`; 
const CRF_STEPS = [19, 22, 25];
const TARGET_HEIGHT = 720;
const DEFAULT_PRESET = "veryfast";


let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export interface CompressProgress {
  pass: number;
  totalPasses: number;
  crf: number;
  targetHeight: number;
  scaled: boolean;
  ratio: number;
}



export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}

export function resetFFmpeg() {
  if (ffmpegInstance) {
    try {
      ffmpegInstance.terminate();
    } catch {
      // ignorar
    }
  }
  ffmpegInstance = null;
  loadPromise = null;
}



function estimateStartingCrfIndex(file: File, maxSizeBytes: number): number {
  const ratio = file.size / maxSizeBytes;
  if (ratio > 5) return 2; // CRF 27 — provavelmente só esta passagem chega
  if (ratio > 2.5) return 1; // CRF 24
  return 0; // CRF 21
}

function getExtension(filename: string) {
  const match = filename.match(/\.[^/.]+$/);
  return match ? match[0] : ".mp4";
}

async function probeSource(ffmpeg: FFmpeg, inputName: string) {
  const probeOut = "probe.txt";
  await ffmpeg.ffprobe([
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height:format=duration",
    "-of", "default=noprint_wrappers=1",
    inputName,
    "-o", probeOut,
  ]);

  const raw = (await ffmpeg.readFile(probeOut)) as Uint8Array;
  await ffmpeg.deleteFile(probeOut).catch(() => {});
  const text = new TextDecoder().decode(raw);

  const width = Number(text.match(/width=(\d+)/)?.[1] ?? 0);
  const height = Number(text.match(/height=(\d+)/)?.[1] ?? 0);
  const duration = Number(text.match(/duration=([\d.]+)/)?.[1] ?? 0);

  return { width, height, duration };
}

function vbvCapsForHeight(height: number) {
  if (height <= 480) return { maxrateK: 2000, bufsizeK: 4000 };
  if (height <= 720) return { maxrateK: 4500, bufsizeK: 9000 };
  if (height <= 1080) return { maxrateK: 8000, bufsizeK: 16000 };
  return { maxrateK: 14000, bufsizeK: 28000 };
}

export async function compressVideoUnderLimit(
  file: File,
  options: {
    maxSizeBytes?: number;
    audioBitrateBps?: number;
    preset?: string;
    targetHeight?: number;
    onProgress?: (info: CompressProgress) => void;
  } = {}
): Promise<File> {
  const {
    maxSizeBytes = 100 * 1024 * 1024,
    audioBitrateBps = 160_000,
    preset = DEFAULT_PRESET,
    targetHeight = TARGET_HEIGHT,
    onProgress,
  } = options;



  if (file.size <= maxSizeBytes) return file;

  const ffmpeg = await getFFmpeg();
  const inputName = "source" + getExtension(file.name);
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const { height, duration } = await probeSource(ffmpeg, inputName);
  if (!duration) throw new Error("Não foi possível ler a duração do vídeo.");


  const scaled = height > targetHeight;
  const outputHeight = scaled ? targetHeight : height;
  const { maxrateK, bufsizeK } = vbvCapsForHeight(outputHeight);

  const totalPasses = CRF_STEPS.length;
  let lastData: Uint8Array | null = null;

  const startIndex = estimateStartingCrfIndex(file, maxSizeBytes);

  try {
    for (let i = startIndex; i < CRF_STEPS.length; i++) {
      const crf = CRF_STEPS[i];
      const pass = i - startIndex + 1;
      const totalPasses = CRF_STEPS.length - startIndex;
      const outputName = `output_pass${pass}.mp4`;

      const args = ["-i", inputName];

      // Escala mantendo o aspect ratio original; -2 garante largura par.
      if (scaled) {
        args.push("-vf", `scale=-2:${targetHeight}`);
      }

      args.push(
        "-c:v", "libx264",
        "-preset", preset,
        "-crf", String(crf),
        "-maxrate", `${maxrateK}k`,
        "-bufsize", `${bufsizeK}k`,
        "-movflags", "+faststart",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", `${Math.round(audioBitrateBps / 1000)}k`,
        outputName
      );

      const handleProgress = ({ progress }: { progress: number }) => {
        onProgress?.({
          pass,
          totalPasses,
          crf,
          targetHeight: outputHeight,
          scaled,
          ratio: (pass - 1 + Math.min(Math.max(progress, 0), 1)) / totalPasses,
        });
      };

      ffmpeg.on("progress", handleProgress);
      try {
        // Sempre a partir da fonte original — nunca reencode em cima de uma passagem anterior.
        await ffmpeg.exec(args);
      } finally {
        ffmpeg.off("progress", handleProgress);
      }

      const data = (await ffmpeg.readFile(outputName)) as Uint8Array;
      lastData = data;
      await ffmpeg.deleteFile(outputName).catch(() => {});

      if (data.byteLength <= maxSizeBytes) break;
      // Ainda demasiado grande: tenta o próximo nível de CRF (mais compressão).
    }

    await ffmpeg.deleteFile(inputName).catch(() => {});
    if (!lastData) throw new Error("Falha na compressão do vídeo.");

    const blob = new Blob([lastData as Uint8Array<ArrayBuffer>], { type: "video/mp4" });
    const newName = file.name.replace(/\.[^/.]+$/, "") + "_compressed.mp4";
    return new File([blob], newName, { type: "video/mp4" });
  } catch (err) {
    await ffmpeg.deleteFile(inputName).catch(() => {});
    throw err;
  }
}
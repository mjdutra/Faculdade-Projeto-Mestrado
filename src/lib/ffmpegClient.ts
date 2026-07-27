import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CORE_VERSION = "0.12.10"; 
const CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`; 

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

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

export interface CompressProgress {
  pass: number;
  totalPasses: number;
  targetBitrateKbps: number;
  scaled: boolean;
  ratio: number;
}

export async function compressVideoUnderLimit(
  file: File,
  options: {
    maxSizeBytes?: number;
    audioBitrateBps?: number;
    preset?: string; // "ultrafast" | "superfast" | "veryfast" | ...
    maxWidthThreshold?: number;
    onProgress?: (info: CompressProgress) => void;
  } = {}
): Promise<File> {
  const {
    maxSizeBytes = 100 * 1024 * 1024,
    audioBitrateBps = 128_000,
    preset = "ultrafast",
    maxWidthThreshold = 2560,
    onProgress,
  } = options;

  if (file.size <= maxSizeBytes) return file;

  const ffmpeg = await getFFmpeg();
  const inputName = "source" + getExtension(file.name);
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const { width, duration } = await probeSource(ffmpeg, inputName);
  if (!duration) throw new Error("Não foi possível ler a duração do vídeo.");

  // Se a resolução de origem for muito grande, reduz já nesta única passagem
  // (não custa uma passagem extra — vai dentro do mesmo -vf).
  const scaled = width > maxWidthThreshold;

  let pass = 1;
  const totalPasses = 2; // normalmente resolve-se logo na 1ª
  let currentTargetKbps = 0;

  const handleProgress = ({ progress }: { progress: number }) => {
    onProgress?.({
      pass,
      totalPasses,
      targetBitrateKbps: currentTargetKbps,
      scaled,
      ratio: (pass - 1 + Math.min(Math.max(progress, 0), 1)) / totalPasses,
    });
  };

  ffmpeg.on("progress", handleProgress);

  try {
    let targetTotalBits = maxSizeBytes * 8 * 0.96; // 4% de margem para overhead do container
    let lastData: Uint8Array | null = null;

    for (; pass <= totalPasses; pass++) {
      const targetVideoBps = Math.max(250_000, targetTotalBits / duration - audioBitrateBps);
      currentTargetKbps = Math.round(targetVideoBps / 1000);

      const outputName = `output_pass${pass}.mp4`;
      const args = ["-i", inputName];

      if (scaled) {
        args.push("-vf", `scale='min(${maxWidthThreshold},iw)':-2`);
      }

      args.push(
        "-c:v", "libx264",
        "-preset", preset,
        "-b:v", `${currentTargetKbps}k`,
        "-maxrate", `${Math.round(currentTargetKbps * 1.2)}k`,
        "-bufsize", `${Math.round(currentTargetKbps * 2)}k`,
        "-movflags", "+faststart",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", `${Math.round(audioBitrateBps / 1000)}k`,
        outputName
      );

      await ffmpeg.exec(args);

      const data = (await ffmpeg.readFile(outputName)) as Uint8Array;
      lastData = data;
      await ffmpeg.deleteFile(outputName).catch(() => {});

      if (data.byteLength <= maxSizeBytes) break;

      // Ultrapassou o limite: reajusta o alvo proporcionalmente e tenta mais uma vez
      targetTotalBits = targetTotalBits * (maxSizeBytes / data.byteLength) * 0.95;
    }

    await ffmpeg.deleteFile(inputName).catch(() => {});
    if (!lastData) throw new Error("Falha na compressão do vídeo.");

    const blob = new Blob([lastData as Uint8Array<ArrayBuffer>], { type: "video/mp4" });
    const newName = file.name.replace(/\.[^/.]+$/, "") + "_compressed.mp4";
    return new File([blob], newName, { type: "video/mp4" });
  } finally {
    ffmpeg.off("progress", handleProgress);
  }
}
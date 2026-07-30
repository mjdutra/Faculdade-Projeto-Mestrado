import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Brush, Evaluator, ADDITION, computeMeshVolume } from "three-bvh-csg";
import { buildQRReliefGeometry } from "@/lib/qr-print-geometry";
import { checkWatertight, type WatertightReport } from "@/lib/manifold";
import type { ReliefMode } from "@/components/magnet/QRCode";
import type { DecalState } from "@/components/magnet/MagnetPrintScene";

export type ExportStage =
  | "loading-model"
  | "building-qr"
  | "boolean-union"
  | "validating"
  | "exporting-stl"
  | "exporting-glb"
  | "cleanup";

export interface ExportProgress {
  stage: ExportStage;
  percent: number;
  label: string;
}

export interface ExportMagnetOptions {
  modelUrl: string;
  magnetId: string;
  qrValue: string;
  decal: DecalState;
  scale: number;
  mode: ReliefMode;
  reliefHeight: number;
  baseHeight?: number;
  flipNormal?: boolean;
  includeGlb?: boolean;
  onProgress?: (progress: ExportProgress) => void;
}

export interface ExportMagnetResult {
  triangleCount: number;
  estimatedVolume: number;
  modelWatertight: WatertightReport;
  qrWatertight: WatertightReport;
  resultWatertight: WatertightReport;
  stlFilename: string;
  glbFilename: string | null;
}

const KEEP_ATTRIBUTES = ["position", "normal", "uv"] as const;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function normalizeGeometry(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const geometry = source.index ? source.toNonIndexed() : source.clone();

  for (const name of Object.keys(geometry.attributes)) {
    if (!(KEEP_ATTRIBUTES as readonly string[]).includes(name)) {
      geometry.deleteAttribute(name);
    }
  }

  if (!geometry.attributes.normal) geometry.computeVertexNormals();

  if (!geometry.attributes.uv) {
    const count = geometry.attributes.position.count;
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
  }

  geometry.clearGroups();
  return geometry;
}

async function loadModelGeometry(modelUrl: string): Promise<THREE.BufferGeometry> {

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(modelUrl);
  gltf.scene.updateWorldMatrix(true, true);

  const parts: THREE.BufferGeometry[] = [];
  gltf.scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const geometry = normalizeGeometry(mesh.geometry);
      geometry.applyMatrix4(mesh.matrixWorld);
      parts.push(geometry);
    }
  });

  if (parts.length === 0) {
    throw new Error("O modelo .glb não contém nenhuma malha.");
  }

  const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (parts.length > 1) parts.forEach((g) => g.dispose());

  if (!merged) {
    throw new Error(
      "Não foi possível fundir as malhas do modelo — as partes do .glb têm atributos incompatíveis."
    );
  }

  return merged;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}


export async function exportMagnetForPrint({
  modelUrl,
  magnetId,
  qrValue,
  decal,
  scale,
  mode,
  reliefHeight,
  baseHeight = 0.015,
  flipNormal = false,
  includeGlb = false,
  onProgress,
}: ExportMagnetOptions): Promise<ExportMagnetResult> {
  const report = (stage: ExportStage, percent: number, label: string) =>
    onProgress?.({ stage, percent, label });

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  let modelBrush: Brush | null = null;
  let qrBrush: Brush | null = null;
  let resultBrush: Brush | null = null;

  try {
    // cópia temporária do modelo
    report("loading-model", 5, "A carregar cópia do modelo...");
    const modelGeometry = track(await loadModelGeometry(modelUrl));
    await nextFrame();


    report("building-qr", 25, "A construir o relevo do QR Code...");
    const qrGeometry = track(
      buildQRReliefGeometry(qrValue, { size: scale, mode, reliefHeight, baseHeight })
    );

    const effectiveNormal = flipNormal ? decal.normal.clone().negate() : decal.normal.clone();
    const embedDepth = baseHeight * 0.5;
    const origin = decal.position.clone().addScaledVector(effectiveNormal, -embedDepth);
    const orientationMatrix = new THREE.Matrix4()
      .makeRotationFromQuaternion(
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), effectiveNormal)
      )
      .setPosition(origin);
    qrGeometry.applyMatrix4(orientationMatrix);
    await nextFrame();

    //união booleana (Brush A ∪ Brush B)
    report("boolean-union", 45, "A fundir o QR Code com o íman...");
    const modelMaterial = track(new THREE.MeshStandardMaterial());
    const qrMaterial = track(new THREE.MeshStandardMaterial());

    modelBrush = new Brush(modelGeometry, modelMaterial);
    modelBrush.updateMatrixWorld();

    qrBrush = new Brush(qrGeometry, qrMaterial);
    qrBrush.updateMatrixWorld();

    const evaluator = new Evaluator();
    evaluator.useGroups = false; // uma só malha, um só material -> uma cor de filamento
    resultBrush = evaluator.evaluate(modelBrush, qrBrush, ADDITION) as Brush;
    await nextFrame();

    // validação manifold (entradas + resultado)
    report("validating", 60, "A validar a geometria...");
    const modelWatertight = checkWatertight(modelBrush.geometry);
    const qrWatertight = checkWatertight(qrBrush.geometry);
    const resultWatertight = checkWatertight(resultBrush.geometry);

    if (!modelWatertight.watertight) {
      console.warn(
        `[export-magnet] O modelo .glb original não é totalmente manifold (${modelWatertight.unmatchedEdges} arestas abertas). A união booleana pode falhar ou gerar geometria inválida.`
      );
    }
    if (!resultWatertight.watertight) {
      console.warn(
        `[export-magnet] A geometria resultante não é totalmente manifold (${resultWatertight.unmatchedEdges} arestas abertas/sobrepostas). Recomenda-se reparar a malha (ex.: "Fix Mesh" no PrusaSlicer, ou Merge by Distance no Blender) antes de imprimir.`
      );
    }
    await nextFrame();

    // exportação .stl (binário)
    report("exporting-stl", 80, "A exportar .stl...");
    const stlExporter = new STLExporter();
    const stlOutput = stlExporter.parse(resultBrush, { binary: true }) as DataView;
    const stlBuffer = stlOutput.buffer.slice(
      stlOutput.byteOffset,
      stlOutput.byteOffset + stlOutput.byteLength
    ) as ArrayBuffer;
    const stlFilename = `magnet_${magnetId}.stl`;
    downloadBlob(new Blob([stlBuffer], { type: "application/sla" }), stlFilename);
    await nextFrame();

    // exportação .glb opcional
    let glbFilename: string | null = null;
    if (includeGlb) {
      report("exporting-glb", 92, "A exportar .glb...");
      const glbExporter = new GLTFExporter();
      const glbOutput = (await glbExporter.parseAsync(resultBrush, {
        binary: true,
      })) as ArrayBuffer;
      glbFilename = `magnet_${magnetId}.glb`;
      downloadBlob(new Blob([glbOutput], { type: "model/gltf-binary" }), glbFilename);
      await nextFrame();
    }

    report("cleanup", 100, "Concluído.");

    return {
      triangleCount: resultBrush.geometry.attributes.position.count / 3,
      estimatedVolume: computeMeshVolume(resultBrush),
      modelWatertight,
      qrWatertight,
      resultWatertight,
      stlFilename,
      glbFilename,
    };
  } finally {
    // liberta toda a geometria, materiais e caches temporários
    modelBrush?.disposeCacheData();
    qrBrush?.disposeCacheData();
    resultBrush?.disposeCacheData();
    resultBrush?.geometry.dispose();
    disposables.forEach((item) => item.dispose());
  }
}
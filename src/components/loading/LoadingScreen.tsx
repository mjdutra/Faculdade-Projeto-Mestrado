"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { Magnet } from "@/types/magnet";


const GHOSTS_PER_MAGNET = 3;
const SAFETY_TIMEOUT_MS = 20000;
const MIN_HOLD_MS = 350; // tempo a mostrar "100%" antes de desvanecer
const FADE_OUT_MS = 650;

const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.5/";

const MIN_CYCLE_S = 2.6;
const MAX_CYCLE_S = 4.6;
const MAX_INITIAL_DELAY_S = 3;
const FADE_IN_FRACTION = 0.22;
const FADE_OUT_FRACTION = 0.3;
const DRIFT_AMOUNT_PERCENT = 1.4;
const ROTATION_SPEED = 0.15;

const SPAWN_MARGIN_X_PERCENT = 10;
const SPAWN_MARGIN_Y_PERCENT = 8;
const LABEL_EXCLUSION_X_MAX = 34;
const LABEL_EXCLUSION_Y_MIN = 74;

let sharedGltfLoader: GLTFLoader | null = null;
let sharedDracoLoader: DRACOLoader | null = null;

function getMagnetLoader(): GLTFLoader {
  if (!sharedGltfLoader) {
    if (!sharedDracoLoader) {
      sharedDracoLoader = new DRACOLoader();
      sharedDracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    }
    sharedGltfLoader = new GLTFLoader();
    sharedGltfLoader.setDRACOLoader(sharedDracoLoader);
    sharedGltfLoader.setMeshoptDecoder(MeshoptDecoder);
  }
  return sharedGltfLoader;
}


function normalizeSceneTemplate(scene: THREE.Group): THREE.Group {
  const box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = Number.isFinite(maxDim) && maxDim > 0 ? 1 / maxDim : 1;

  scene.scale.setScalar(scale);
  scene.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

  return scene;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickGhostPosition(): { xPercent: number; yPercent: number } {
  for (let attempt = 0; attempt < 12; attempt++) {
    const xPercent = randomBetween(SPAWN_MARGIN_X_PERCENT, 100 - SPAWN_MARGIN_X_PERCENT);
    const yPercent = randomBetween(SPAWN_MARGIN_Y_PERCENT, 100 - SPAWN_MARGIN_Y_PERCENT);
    const insideLabelZone = xPercent < LABEL_EXCLUSION_X_MAX && yPercent > LABEL_EXCLUSION_Y_MIN;
    if (!insideLabelZone) return { xPercent, yPercent };
  }
  return { xPercent: 60, yPercent: 40 };
}

function cloneWithUniqueMaterials(source: THREE.Object3D): THREE.Object3D {
  const clone = source.clone(true);
  clone.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const material = obj.material;
    if (Array.isArray(material)) {
      obj.material = material.map((m) => {
        const cloned = m.clone();
        cloned.transparent = true;
        cloned.depthWrite = false;
        cloned.opacity = 0;
        return cloned;
      });
    } else if (material) {
      const cloned = material.clone();
      cloned.transparent = true;
      cloned.depthWrite = false;
      cloned.opacity = 0;
      obj.material = cloned;
    }
  });
  return clone;
}

function collectMaterials(root: THREE.Object3D): THREE.Material[] {
  const materials: THREE.Material[] = [];
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (Array.isArray(obj.material)) materials.push(...obj.material);
    else if (obj.material) materials.push(obj.material);
  });
  return materials;
}



interface PreloadState {
  readyState: Record<string, boolean>;
  templatesRef: React.RefObject<Record<string, THREE.Group>>;
  readyCount: number;
  total: number;
  allReady: boolean;
}

export function useMagnetsPreload(magnets: Magnet[], enabled: boolean): PreloadState {
  const [readyState, setReadyState] = useState<Record<string, boolean>>({});
  const startedRef = useRef<Set<string>>(new Set());
  const templatesRef = useRef<Record<string, THREE.Group>>({});

  useEffect(() => {
    if (!enabled) return;

    magnets.forEach((magnet) => {
      if (!magnet.modelURL || startedRef.current.has(magnet.id)) return;
      startedRef.current.add(magnet.id);
      useGLTF.preload(magnet.modelURL);

      getMagnetLoader()
        .loadAsync(magnet.modelURL)
        .then((gltf: GLTF) => {
          templatesRef.current[magnet.id] = normalizeSceneTemplate(gltf.scene);
        })
        .catch((error: unknown) => {
          console.error(`Erro ao pré-carregar modelo do magnet ${magnet.id}:`, error);
        })
        .finally(() => {
          setReadyState((prev) => (prev[magnet.id] ? prev : { ...prev, [magnet.id]: true }));
        });
    });
  }, [magnets, enabled]);

  useEffect(() => {
    if (!enabled || magnets.length === 0) return;

    const timeout = setTimeout(() => {
      setReadyState((prev) => {
        let changed = false;
        const next = { ...prev };
        magnets.forEach((magnet) => {
          if (!next[magnet.id]) {
            next[magnet.id] = true;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, SAFETY_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [magnets, enabled]);

  const total = magnets.length;
  const readyCount = magnets.reduce((sum, m) => sum + (readyState[m.id] ? 1 : 0), 0);
  const allReady = total === 0 ? true : readyCount === total;

  return { readyState, templatesRef, readyCount, total, allReady };
}


function OrthoCameraRig() {
  const set = useThree((s) => s.set);
  const size = useThree((s) => s.size);

  const camera = useMemo(() => {
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
    cam.position.set(0, 0, 100);
    return cam;
  }, []);

  useEffect(() => {
    camera.left = -size.width / 2;
    camera.right = size.width / 2;
    camera.top = size.height / 2;
    camera.bottom = -size.height / 2;
    camera.updateProjectionMatrix();
  }, [camera, size]);

  useEffect(() => {
    set({ camera });
  }, [camera, set]);

  return null;
}


interface GhostCycle {
  start: number | null;
  duration: number;
  position: { xPercent: number; yPercent: number };
  driftPhaseX: number;
  driftPhaseY: number;
  driftSpeed: number;
  sizeFactor: number;
  rotationDir: 1 | -1;
  initialDelay: number;
}

interface GhostInstanceProps {
  template: THREE.Group;
  index: number;
}

function GhostInstance({ template, index }: GhostInstanceProps) {
  const groupRef = useRef<THREE.Group>(null);
  const size = useThree((s) => s.size);

  const clone = useMemo(() => cloneWithUniqueMaterials(template), [template]);
  const materials = useMemo(() => collectMaterials(clone), [clone]);

  const cycleRef = useRef<GhostCycle>({
    start: null,
    duration: 0,
    position: { xPercent: 50, yPercent: 50 },
    driftPhaseX: Math.random() * Math.PI * 2,
    driftPhaseY: Math.random() * Math.PI * 2,
    driftSpeed: randomBetween(0.3, 0.6),
    sizeFactor: randomBetween(0.7, 1.35),
    rotationDir: Math.random() > 0.5 ? 1 : -1,
    initialDelay: randomBetween(0, MAX_INITIAL_DELAY_S) + index * 0.15,
  });

  const restRotationRef = useRef({
    x: randomBetween(-0.15, 0.15),
    y: Math.random() * Math.PI * 2,
    z: randomBetween(-0.1, 0.1),
  });

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    const t = state.clock.elapsedTime;
    const cycle = cycleRef.current;

    if (cycle.start === null) {
      cycle.start = t + cycle.initialDelay;
      cycle.duration = randomBetween(MIN_CYCLE_S, MAX_CYCLE_S);
      cycle.position = pickGhostPosition();
    }

    let localT = t - cycle.start;

    // Ciclo terminado → recomeça de imediato noutra posição (fluxo contínuo).
    if (localT >= cycle.duration) {
      cycle.start = t;
      localT = 0;
      cycle.duration = randomBetween(MIN_CYCLE_S, MAX_CYCLE_S);
      cycle.position = pickGhostPosition();
      cycle.driftPhaseX = Math.random() * Math.PI * 2;
      cycle.driftPhaseY = Math.random() * Math.PI * 2;
      cycle.driftSpeed = randomBetween(0.3, 0.6);
      cycle.sizeFactor = randomBetween(0.7, 1.35);
      cycle.rotationDir = Math.random() > 0.5 ? 1 : -1;
    }

    if (localT < 0) {
      group.visible = false;
      return;
    }

    const progress = THREE.MathUtils.clamp(localT / cycle.duration, 0, 1);
    const fade =
      progress < FADE_IN_FRACTION
        ? progress / FADE_IN_FRACTION
        : progress > 1 - FADE_OUT_FRACTION
        ? (1 - progress) / FADE_OUT_FRACTION
        : 1;
    const eased = fade * fade * (3 - 2 * fade); 

    group.visible = eased > 0.01;
    if (!group.visible) return;

    const driftX =
      Math.sin(t * cycle.driftSpeed + cycle.driftPhaseX) * (DRIFT_AMOUNT_PERCENT / 100) * size.width;
    const driftY =
      Math.cos(t * cycle.driftSpeed * 0.85 + cycle.driftPhaseY) *
      (DRIFT_AMOUNT_PERCENT / 100) *
      size.height;

    const worldX = (cycle.position.xPercent / 100 - 0.5) * size.width + driftX;
    const worldY = (0.5 - cycle.position.yPercent / 100) * size.height + driftY;

    group.position.set(worldX, worldY, index * 0.01);

    const baseSize = Math.min(size.width, size.height) * 0.24 * cycle.sizeFactor;
    group.scale.setScalar(baseSize * (0.88 + 0.12 * eased));

    group.rotation.set(
      restRotationRef.current.x,
      restRotationRef.current.y + t * ROTATION_SPEED * cycle.rotationDir,
      restRotationRef.current.z
    );

    for (const material of materials) {
      material.opacity = eased;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <primitive object={clone} />
    </group>
  );
}


interface LoadingScreenProps {
  magnets: Magnet[];
  magnetsFetched: boolean;
  onFinished: () => void;
}

export default function LoadingScreen({ magnets, magnetsFetched, onFinished }: LoadingScreenProps) {
  const { readyState, templatesRef, readyCount, total, allReady } = useMagnetsPreload(
    magnets,
    magnetsFetched
  );

  const [phase, setPhase] = useState<"loading" | "leaving">("loading");
  const percentSpanRef = useRef<HTMLSpanElement>(null);
  const displayedPercentRef = useRef(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!magnetsFetched) return;

    let frameId: number;

    const step = () => {
      const target = allReady ? 100 : total > 0 ? (readyCount / total) * 100 : 0;
      const current = displayedPercentRef.current;
      const diff = target - current;
      const next = Math.abs(diff) < 0.15 ? target : current + diff * 0.12;
      displayedPercentRef.current = next;

      if (percentSpanRef.current) {
        percentSpanRef.current.textContent = `${Math.round(next)}%`;
      }

      if (!finishedRef.current && allReady && next >= 99.5) {
        finishedRef.current = true;
        setTimeout(() => {
          setPhase("leaving");
          setTimeout(onFinished, FADE_OUT_MS);
        }, MIN_HOLD_MS);
      }

      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [magnetsFetched, allReady, readyCount, total, onFinished]);

  const readyMagnets = useMemo(
    () => magnets.filter((m) => readyState[m.id] && templatesRef.current[m.id]),
    [magnets, readyState, templatesRef]
  );

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="A carregar experiências"
      className="fixed inset-0 z-[999999] bg-white overflow-hidden select-none"
      style={{
        opacity: phase === "leaving" ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms ease`,
        pointerEvents: phase === "leaving" ? "none" : "auto",
      }}
    >
      <div className="absolute inset-0">
        <Canvas
          orthographic
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 3, 6]} intensity={15} />
          <OrthoCameraRig />

          {readyMagnets.map((magnet) =>
            Array.from({ length: GHOSTS_PER_MAGNET }).map((_, i) => (
              <GhostInstance
                key={`${magnet.id}-${i}`}
                template={templatesRef.current[magnet.id]}
                index={i}
              />
            ))
          )}
        </Canvas>
      </div>

      <div
        className="fixed left-0 bottom-0 z-10"
        style={{
          paddingLeft: "max(1.5rem, env(safe-area-inset-left))",
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <span
          ref={percentSpanRef}
          className="text-[14vw] leading-none font-black tracking-tight text-black whitespace-nowrap"
        >
          0%
        </span>
      </div>
    </div>
  );
}
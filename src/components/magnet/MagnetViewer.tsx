import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

const FIT_PADDING = 1.2;

interface ModelBounds {
  aspect: number;
  radius: number;
}

function CameraRig({
  radius,
  controlsRef,
}: {
  radius: number;
  controlsRef: React.RefObject<any>;
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  // Uma vez true, deixamos de repor a posição/rotação por defeito — só
  // reajustamos a distância. É esta flag que garante que a orientação do
  // utilizador nunca é reposta automaticamente.
  const hasFramedOnce = useRef(false);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    const aspect = size.width / size.height || 1;
    const fovY = THREE.MathUtils.degToRad(camera.fov);
    const fovX = 2 * Math.atan(Math.tan(fovY / 2) * aspect);

    const distanceForHeight = radius / Math.sin(fovY / 2);
    const distanceForWidth = radius / Math.sin(fovX / 2);
    const distance = Math.max(distanceForHeight, distanceForWidth) * FIT_PADDING;

    camera.near = Math.max(distance - radius * 4, 0.01);
    camera.far = distance + radius * 4;

    if (!hasFramedOnce.current) {
      // Primeiro enquadramento: ainda não existe orientação do utilizador,
      // por isso partimos de uma vista frontal por defeito.
      camera.position.set(0, 0, distance);
      camera.lookAt(0, 0, 0);
      hasFramedOnce.current = true;
    } else {
      // Já existe uma orientação (por defeito ou definida pelo utilizador
      // via arrasto no OrbitControls). Preservamo-la: mantemos a direção
      // do vetor posição e só reescalamos o comprimento para a nova
      // distância de enquadramento — a rotação acumulada não é tocada.
      const currentDistance = camera.position.length();
      if (currentDistance > 1e-4) {
        camera.position.multiplyScalar(distance / currentDistance);
      } else {
        camera.position.set(0, 0, distance);
      }
    }

    camera.updateProjectionMatrix();
    // Ressincroniza o estado interno (esférico) do OrbitControls com a
    // posição que acabámos de ajustar, para não haver um "salto" no
    // próximo arrasto.
    controlsRef.current?.update();
  }, [camera, size, radius, controlsRef]);

  return null;
}

function MagnetModel({
  url,
  onBounds,
  onModelPointerDown,
}: {
  url: string;
  onBounds: (bounds: ModelBounds) => void;
  onModelPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  const bounds = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    clonedScene.position.sub(center);

    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);

    const radius =
      Number.isFinite(sphere.radius) && sphere.radius > 0 ? sphere.radius : 1;
    const aspect = size.y > 0 ? size.x / size.y : 1;

    return { radius, aspect };
  }, [clonedScene]);

  useEffect(() => {
    onBounds(bounds);
  }, [bounds, onBounds]);

  return (
    <primitive
      object={clonedScene}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        onModelPointerDown?.(e);
      }}
    />
  );
}

function Fallback() {
  return null;
}

export function MagnetViewer({
  modelUrl,
  className,
  preserveDrawingBuffer = false,
  onAspectChange,
  onModelPointerDown,
  onRotate,
  orbitEnabled = true,
}: {
  modelUrl: string;
  className?: string;
  preserveDrawingBuffer?: boolean;
  onAspectChange?: (aspect: number) => void;
  onModelPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onRotate?: () => void;
  orbitEnabled?: boolean;
}) {
  const [radius, setRadius] = useState(1.5);
  const controlsRef = useRef<any>(null);

  const handleBounds = useCallback(
    ({ aspect, radius }: ModelBounds) => {
      setRadius((prev) => (prev === radius ? prev : radius));
      onAspectChange?.(aspect);
    },
    [onAspectChange]
  );

  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, preserveDrawingBuffer }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 3, 3]} intensity={15} />
        <Suspense fallback={<Fallback />}>
          <MagnetModel
            url={modelUrl}
            onBounds={handleBounds}
            onModelPointerDown={onModelPointerDown}
          />
          <Environment preset="city" />
        </Suspense>
        <CameraRig radius={radius} controlsRef={controlsRef} />
        <OrbitControls
          ref={controlsRef}
          enabled={orbitEnabled}
          enableZoom={false}
          rotateSpeed={0.4}
          enableDamping
          dampingFactor={0.08}
          onChange={onRotate}
        />
      </Canvas>
    </div>
  );
}
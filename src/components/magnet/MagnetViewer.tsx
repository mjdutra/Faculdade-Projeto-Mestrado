import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

const FIT_PADDING = 1.2;

interface ModelBounds {
  aspect: number;
  radius: number;
}

function CameraRig({ radius }: { radius: number }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    const aspect = size.width / size.height || 1;
    const fovY = THREE.MathUtils.degToRad(camera.fov);
    const fovX = 2 * Math.atan(Math.tan(fovY / 2) * aspect);

    const distanceForHeight = radius / Math.sin(fovY / 2);
    const distanceForWidth = radius / Math.sin(fovX / 2);
    const distance = Math.max(distanceForHeight, distanceForWidth) * FIT_PADDING;

    camera.position.set(0, 0, distance);
    camera.near = Math.max(distance - radius * 4, 0.01);
    camera.far = distance + radius * 4;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size, radius]);

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
        // Sem stopPropagation(): evita a captura implícita do ponteiro no
        // <canvas>, que quebra o mouseenter/mouseleave do tooltip e
        // compete com o OrbitControls (ver correções anteriores).
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
  /** Só dispara quando o raycast acerta na geometria do GLB. */
  onModelPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  /** Dispara quando o OrbitControls aplica uma rotação REAL (drag
   * processado) — não dispara num simples clique parado. Usado pelo
   * consumidor para distinguir "rodou" de "clicou". */
  onRotate?: () => void;
  /** Desativa o OrbitControls enquanto o consumidor está a arrastar a
   * posição do íman, para os dois gestos não disputarem o mesmo drag. */
  orbitEnabled?: boolean;
}) {
  const [radius, setRadius] = useState(1.5);

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
        <CameraRig radius={radius} />
        <OrbitControls
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
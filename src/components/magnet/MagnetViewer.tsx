import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

// Extra breathing room around the model's bounding sphere so it never
// touches the edge of the frame while the user rotates it.
const FIT_PADDING = 1.2;

interface ModelBounds {
  aspect: number;
  radius: number;
}

/**
 * Repositions the default camera so the model's bounding sphere always
 * fits inside the view frustum, regardless of the model's own scale or
 * the container's aspect ratio. Because a sphere looks identical from
 * every angle, this guarantees the model can never be clipped while it
 * is rotated with OrbitControls.
 */
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
}: {
  url: string;
  onBounds: (bounds: ModelBounds) => void;
}) {
  const { scene } = useGLTF(url);

  // Clone so multiple viewers (and repeated mounts of the same url) never
  // mutate the shared cache that drei keeps for this GLTF.
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  const bounds = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model on its own bounding box so it rotates around its
    // visual center instead of around the scene origin.
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

  return <primitive object={clonedScene} />;
}

function Fallback() {
  return null;
}

export function MagnetViewer({
  modelUrl,
  className,
  preserveDrawingBuffer = false,
  onAspectChange,
}: {
  modelUrl: string;
  className?: string;
  preserveDrawingBuffer?: boolean;
  /** Called with the model's width/height ratio once it has loaded, so a
   * parent laying out multiple magnets can size each container to match
   * that model's natural proportions instead of forcing a square. */
  onAspectChange?: (aspect: number) => void;
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
          <MagnetModel url={modelUrl} onBounds={handleBounds} />
          <Environment preset="city" />
        </Suspense>
        <CameraRig radius={radius} />
        <OrbitControls
          enableZoom={false}
          rotateSpeed={0.4}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
}
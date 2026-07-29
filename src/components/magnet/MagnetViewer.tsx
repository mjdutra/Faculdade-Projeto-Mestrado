import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import { Rotate3d } from "lucide-react";
import * as THREE from "three";

const FIT_PADDING = 1.2;
const ROTATE_SENSITIVITY = 0.008;
const MAX_PITCH = Math.PI / 2.2;
const BUTTON_GAP_PX = 10;

interface ModelBounds {
  aspect: number;
  radius: number;
  minY: number;
}

function CameraRig({ radius }: { radius: number }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

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
      camera.position.set(0, 0, distance);
      camera.lookAt(0, 0, 0);
      hasFramedOnce.current = true;
    } else {
      const currentDistance = camera.position.length();
      if (currentDistance > 1e-4) {
        camera.position.multiplyScalar(distance / currentDistance);
      } else {
        camera.position.set(0, 0, distance);
      }
    }

    camera.updateProjectionMatrix();
  }, [camera, size, radius]);

  return null;
}

function BottomAnchorTracker({
      minY,
      onBottomPercentChange,
    }: {
      minY: number;
      onBottomPercentChange: (percent: number) => void;
    }) {
      const camera = useThree((s) => s.camera);
      const size = useThree((s) => s.size);

      useEffect(() => {
        if (size.width === 0 || size.height === 0) return;

        const bottomPoint = new THREE.Vector3(0, minY, 0);
        const projected = bottomPoint.clone().project(camera);

        const percentFromTop = THREE.MathUtils.clamp(
          ((1 - projected.y) / 2) * 100,
          0,
          100
        );

        onBottomPercentChange(percentFromTop);
      }, [camera, size, minY, onBottomPercentChange]);

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
    const minY = -size.y / 2;
    return { radius, aspect, minY };
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
      onAspectChange?: (aspect: number) => void;
    }) {
      const [radius, setRadius] = useState(1.5);
      const [modelMinY, setModelMinY] = useState(-1.5);
      const [bottomPercent, setBottomPercent] = useState(80);
      const [hovering, setHovering] = useState(false);
      const [isRotating, setIsRotating] = useState(false);

      const modelGroupRef = useRef<THREE.Group>(null);
      const lastPointerRef = useRef({ x: 0, y: 0 });

      const handleBounds = useCallback(
        ({ aspect, radius, minY }: ModelBounds) => {
          setRadius((prev) => (prev === radius ? prev : radius));
          setModelMinY((prev) => (prev === minY ? prev : minY));
          onAspectChange?.(aspect);
        },
        [onAspectChange]
      );

      const handleBottomPercentChange = useCallback((percent: number) => {
        setBottomPercent((prev) => (Math.abs(prev - percent) < 0.1 ? prev : percent));
      }, []);

      useEffect(() => {
            if (!isRotating) return;

            const handlePointerMove = (e: PointerEvent) => {
              const dx = e.clientX - lastPointerRef.current.x;
              const dy = e.clientY - lastPointerRef.current.y;
              lastPointerRef.current = { x: e.clientX, y: e.clientY };

              const group = modelGroupRef.current;
              if (!group) return;

              group.rotation.y += dx * ROTATE_SENSITIVITY;
              group.rotation.x = THREE.MathUtils.clamp(
                group.rotation.x + dy * ROTATE_SENSITIVITY,
                -MAX_PITCH,
                MAX_PITCH
              );
            };

            const handlePointerUp = () => {
              setIsRotating(false);
              document.body.style.cursor = "";
            };

            window.addEventListener("pointermove", handlePointerMove);
            window.addEventListener("pointerup", handlePointerUp);
            return () => {
              window.removeEventListener("pointermove", handlePointerMove);
              window.removeEventListener("pointerup", handlePointerUp);
            };
          }, [isRotating]);

  const handleRotateButtonPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    setIsRotating(true);
    document.body.style.cursor = "grabbing";
  };

  return (
    <div
      className={className}
      style={{ width: "100%", height: "100%", position: "relative" }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >

      <div style={{ width: "100%", height: "100%", pointerEvents: "none" }}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{ antialias: true, preserveDrawingBuffer }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 3, 3]} intensity={15} />
          <Suspense fallback={<Fallback />}>
            <group ref={modelGroupRef}>
              <MagnetModel url={modelUrl} onBounds={handleBounds} />
            </group>
            <Environment preset="city" />
          </Suspense>
          <CameraRig radius={radius} />
          <BottomAnchorTracker
            minY={modelMinY}
            onBottomPercentChange={handleBottomPercentChange}
          />
        </Canvas>
      </div>

      <button
        type="button"
        aria-label="Rodar modelo"
        onPointerDown={handleRotateButtonPointerDown}
        style={{
          position: "absolute",
          left: "50%",
          top: `calc(${bottomPercent}% + ${BUTTON_GAP_PX}px)`,
          transform: "translateX(-50%)",
          width: 28,
          height: 28,
          borderRadius: "9999px",
          border: "none",
          backdropFilter: "blur(2px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isRotating ? "grabbing" : "grab",
          opacity: hovering || isRotating ? 1 : 0,
          pointerEvents: hovering || isRotating ? "auto" : "none",
          transition: "opacity 200ms ease",
          touchAction: "none",
          zIndex: 10,
        }}
      >
        <Rotate3d size={16} strokeWidth={2} color="#404040" />
      </button>
    </div>
  );
}
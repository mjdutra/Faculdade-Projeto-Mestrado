import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
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

function ModelHoverProbe({
  modelGroupRef,
  onHoverChange,
}: {
  modelGroupRef: React.RefObject<THREE.Group>;
  onHoverChange: (hovering: boolean) => void;
}) {
  const { camera, gl } = useThree();
  const mouseRef = useRef({ x: -Infinity, y: -Infinity });
  const wasHovering = useRef(false);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  useFrame(() => {
    const group = modelGroupRef.current;
    if (!group) return;

    const rect = gl.domElement.getBoundingClientRect();
    const { x, y } = mouseRef.current;

    const inside =
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

    if (!inside) {
      if (wasHovering.current) {
        wasHovering.current = false;
        onHoverChange(false);
      }
      return;
    }

    ndc.x = ((x - rect.left) / rect.width) * 2 - 1;
    ndc.y = -(((y - rect.top) / rect.height) * 2 - 1);

    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(group, true);
    const isHit = hits.length > 0;

    if (isHit !== wasHovering.current) {
      wasHovering.current = isHit;
      onHoverChange(isHit);
    }
  });

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
  onModelHoverChange,
  infoContent,
}: {
  modelUrl: string;
  className?: string;
  preserveDrawingBuffer?: boolean;
  onAspectChange?: (aspect: number) => void;
  /** Reporta ao componente pai (ex.: Homepage) se o rato está sobre a
   * geometria visível do GLB — para que o pai possa dar prioridade real
   * ao modelo em relação ao canvas de outros magnets sobrepostos. */
  onModelHoverChange?: (hovering: boolean) => void;
  infoContent?: React.ReactNode;
}) {
  const [radius, setRadius] = useState(1.5);
  const [modelMinY, setModelMinY] = useState(-1.5);
  const [bottomPercent, setBottomPercent] = useState(80);
  const [isRotating, setIsRotating] = useState(false);
  const [hoveringModel, setHoveringModel] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

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

  const handleModelHoverChange = useCallback(
    (hovering: boolean) => {
      setHoveringModel(hovering);
      onModelHoverChange?.(hovering);
    },
    [onModelHoverChange]
  );

  useEffect(() => {
    setHoveringModel(false);
    onModelHoverChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]);

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

  const containerCursor = isRotating
    ? "grabbing"
    : hoveringModel
    ? "grab"
    : "default";

  const showChrome = hoveringModel || isButtonHovered || isRotating;

  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        cursor: containerCursor,
      }}
    >
      <div style={{ width: "100%", height: "100%" }}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{ antialias: true, preserveDrawingBuffer }}
          style={{ background: "transparent"}}
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
          <ModelHoverProbe
            modelGroupRef={modelGroupRef}
            onHoverChange={handleModelHoverChange}
          />
        </Canvas>
      </div>

      <button
        type="button"
        aria-label="Rodar modelo"
        onPointerDown={handleRotateButtonPointerDown}
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)}
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
          opacity: showChrome ? 1 : 0,
          pointerEvents: "auto",
          transition: "opacity 200ms ease",
          touchAction: "none",
          zIndex: 10,
        }}
      >
        <Rotate3d size={16} strokeWidth={2} color="#404040" />
      </button>

      {infoContent && showChrome && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: `calc(${bottomPercent}% + ${BUTTON_GAP_PX + 24}px)`,
            transform: "translateX(-50%)",
            width: 224,
            padding: "12px",
            borderRadius: 8,
            background: "white",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.12)",
            border: "1px solid #e5e5e5",
            fontSize: 14,
            color: "#262626",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          {infoContent}
        </div>
      )}
    </div>
  );
}
"use client";

import { ThreeEvent } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { XR, createXRStore, IfInSessionMode } from "@react-three/xr";
import { ChevronUp } from "lucide-react";
import { PointOfInterest } from "@/components/poi/PointOfInterest";
import { Hotspot } from "@/components/poi/Hotspot";
import { yawPitchToVector, vectorToYawPitch } from "@/lib/spherical";
import { isPointActive } from "@/lib/poi";
import { getEdgeIndicator, type EdgeIndicator } from "@/lib/screenEdge";


export interface Video360ViewerHandle {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  lookAt: (yaw: number, pitch: number) => void;
}

interface Video360ViewerProps {
  videoUrl: string;
  points: PointOfInterest[];
  isAddingPOI?: boolean;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onVolumeChange?: (volume: number, muted: boolean) => void;
  onEnded?: () => void;
  onPositionClick?: (position: { yaw: number; pitch: number }) => void;
}

interface CameraControllerHandle {
  lookAt: (yaw: number, pitch: number) => void;
}

interface IndicatorState extends EdgeIndicator {
  id: string;
}

const xrStore = createXRStore({
  controller: {
    rayPointer: {
      minDistance: 0,
      rayModel: {
        color: "#8e0505",
      },
    },
  },
});

const CameraController = forwardRef<CameraControllerHandle, {}>(
  function CameraController(_, ref) {
    const { camera } = useThree();
    const orbitRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      lookAt: (yaw: number, pitch: number) => {
        if (!orbitRef.current) return;

        const dir = yawPitchToVector(yaw, pitch, 1);
        const distance = camera.position.length() || 0.1;

        camera.position.copy(dir.clone().multiplyScalar(-distance));
        camera.lookAt(0, 0, 0);
        orbitRef.current.update();
      },
    }));

    return (
      <IfInSessionMode deny={["immersive-vr", "immersive-ar"]}>
        <OrbitControls
          ref={orbitRef}
          enableZoom={false}
          enablePan={false}
          rotateSpeed={-0.4}
        />
      </IfInSessionMode>
    );
  }
);

function OffscreenIndicators({
  points,
  video,
  onUpdate,
  }: {
    points: PointOfInterest[];
    video: HTMLVideoElement;
    onUpdate: (indicators: IndicatorState[]) => void;
  }) {
    const { camera, size, gl } = useThree();
    const lastSignature = useRef<string>("");

    useFrame(() => {
      if (
        gl.xr.isPresenting ||
        !(camera instanceof THREE.PerspectiveCamera)
      ) {
        if (lastSignature.current !== "") {
          lastSignature.current = "";
          onUpdate([]);
        }

        return;
      }

      const t = video.currentTime;
      const next: IndicatorState[] = [];

      for (const point of points) {
        if (!isPointActive(point, t)) continue;

        const worldPos = yawPitchToVector(
          point.yaw,
          point.pitch,
          49.8
        );

        const indicator = getEdgeIndicator(
          camera,
          worldPos,
          size.width,
          size.height
        );

        if (indicator) {
          next.push({
            id: point.id,
            ...indicator,
          });
        }
      }

      const signature = next
        .map(
          (i) =>
            `${i.id}:${Math.round(i.x)}:${Math.round(i.y)}:${Math.round(i.angle)}`
        )
        .join("|");

      if (signature !== lastSignature.current) {
        lastSignature.current = signature;
        onUpdate(next);
      }
    });

    return null;
}

function Sphere({
  video,
  points,
  isAddingPOI,
  onPositionClick,
  onHoverChange,
  selectedHotspotId,
  onSelectChange,
}: {
  video: HTMLVideoElement;
  points: PointOfInterest[];
  isAddingPOI: boolean;
  onPositionClick?: (position: { yaw: number; pitch: number }) => void;
  onHoverChange?: (id: string, hovering: boolean) => void;
  selectedHotspotId?: string | null;
  onSelectChange?: (id: string) => void;
}) {
  const texture = useMemo(() => {
    const t = new THREE.VideoTexture(video);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [video]);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      texture.needsUpdate = true;
    }
  });

  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD = 6;

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    pointerDownPos.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    const down = pointerDownPos.current;
    pointerDownPos.current = null;
    if (!isAddingPOI || !onPositionClick || !down) return;

    const dx = event.clientX - down.x;
    const dy = event.clientY - down.y;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) return;

    onPositionClick(vectorToYawPitch(event.point));
  };

  return (
    <>
      <mesh 
        onPointerDown={handlePointerDown} 
        onPointerUp={handlePointerUp}
        pointerEventsType={{ deny: "grab" }}>
        <sphereGeometry args={[50, 64, 64]} />
        <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
      </mesh>

      {points.map((point) => (
        <Hotspot
          key={point.id}
          point={point}
          video={video}
          position={yawPitchToVector(point.yaw, point.pitch, 49.8)}
          isAddingPOI={isAddingPOI}
          isSelected={selectedHotspotId === point.id}
          onHoverChange={onHoverChange}
          onSelectChange={onSelectChange}
        />
      ))}
    </>
  );
}

const Video360Viewer = forwardRef<Video360ViewerHandle, Video360ViewerProps>(function Video360Viewer(
  { videoUrl, points, isAddingPOI = false, onTimeUpdate, onDurationChange, onPlayingChange, onVolumeChange, onEnded, onPositionClick },
  ref
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const cameraControllerRef = useRef<CameraControllerHandle>(null);
  const [hoveredHotspotId, setHoveredHotspotId] = useState<string | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [offscreenIndicators, setOffscreenIndicators] = useState<IndicatorState[]>([]);
  const [isVRAvailable, setIsVRAvailable] = useState(false);
  const UP_AXIS = new THREE.Vector3(0, 0, 1);


  function VROffscreenIndicators({
    points,
    video,
  }: {
    points: PointOfInterest[];
    video: HTMLVideoElement;
  }) {
    const { camera, gl } = useThree();
    const groupRefs = useRef<Record<string, THREE.Group | null>>({});

    const tmp = useMemo(
      () => ({
        camPos: new THREE.Vector3(),
        camQuat: new THREE.Quaternion(),
        camQuatInv: new THREE.Quaternion(),
        localDir: new THREE.Vector3(),
        targetPos: new THREE.Vector3(),
        offset: new THREE.Vector3(),
        bearingQuat: new THREE.Quaternion(),
      }),
      []
    );

    const CENTER_DEG = 35;
    const RING_DEG = 40;
    const DISTANCE = 2.2;

    useFrame(() => {
      if (!gl.xr.isPresenting) return;

      camera.getWorldPosition(tmp.camPos);
      camera.getWorldQuaternion(tmp.camQuat);
      tmp.camQuatInv.copy(tmp.camQuat).invert();

      const t = video.currentTime;

      for (const point of points) {
        const group = groupRefs.current[point.id];
        if (!group) continue;

        if (!isPointActive(point, t)) {
          group.visible = false;
          continue;
        }

        tmp.targetPos.copy(yawPitchToVector(point.yaw, point.pitch, 49.8));
        tmp.localDir
          .copy(tmp.targetPos)
          .sub(tmp.camPos)
          .normalize()
          .applyQuaternion(tmp.camQuatInv);

        const forwardComponent = -tmp.localDir.z;
        const polarDeg = THREE.MathUtils.radToDeg(
          Math.acos(THREE.MathUtils.clamp(forwardComponent, -1, 1))
        );

        if (polarDeg <= CENTER_DEG) {
          group.visible = false;
          continue;
        }

        const bearing = Math.atan2(tmp.localDir.x, tmp.localDir.y);
        const ringRad = THREE.MathUtils.degToRad(RING_DEG);

        tmp.offset
          .set(
            Math.sin(ringRad) * Math.sin(bearing),
            Math.sin(ringRad) * Math.cos(bearing),
            -Math.cos(ringRad)
          )
          .multiplyScalar(DISTANCE)
          .applyQuaternion(tmp.camQuat)
          .add(tmp.camPos);

        tmp.bearingQuat.setFromAxisAngle(UP_AXIS, -bearing);

        group.visible = true;
        group.position.copy(tmp.offset);
        group.quaternion.copy(tmp.camQuat).multiply(tmp.bearingQuat);
      }
    });

    return (
      <>
        {points.map((point) => (
          <group
            key={point.id}
            ref={(el) => {
              groupRefs.current[point.id] = el;
            }}
            visible={false}
            scale={2.2}
          >
            <mesh position={[0, 0, -0.002]} scale={1.35}>
              <coneGeometry args={[0.055, 0.13, 3]} />
              <meshBasicMaterial color="#000000" />
            </mesh>
            <mesh>
              <coneGeometry args={[0.05, 0.12, 3]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
      </>
    );
  }

  useEffect(() => {
    const v = document.createElement("video");
    v.src = videoUrl;
    v.crossOrigin = "anonymous";
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;

    videoRef.current = v;
    setVideoEl(v);
    v.play().catch(() => {});

    setSelectedHotspotId(null);
    setHoveredHotspotId(null);
    setOffscreenIndicators([]);

    return () => {
      v.pause();
      v.removeAttribute("src");
      v.load();
      videoRef.current = null;
      setVideoEl(null);
    };
  }, [videoUrl]);

  useEffect(() => {
    const checkVRSupport = async () => {
      try {
        if (!("xr" in navigator) || !navigator.xr) {
          setIsVRAvailable(false);
          return;
        }

        const supported =
          await navigator.xr.isSessionSupported("immersive-vr");

        setIsVRAvailable(supported);
      } catch {
        setIsVRAvailable(false);
      }
    };

    checkVRSupport();
  }, []);

  useEffect(() => {
    const v = videoEl;
    if (!v) return;

    const handleTimeUpdate = () => onTimeUpdate?.(v.currentTime);
    const handleLoadedMetadata = () => onDurationChange?.(v.duration || 0);
    const handlePlay = () => onPlayingChange?.(true);
    const handlePause = () => onPlayingChange?.(false);
    const handleVolumeChange = () => onVolumeChange?.(v.volume, v.muted);
    const handleEnded = () => onEnded?.();

    v.addEventListener("timeupdate", handleTimeUpdate);
    v.addEventListener("loadedmetadata", handleLoadedMetadata);
    v.addEventListener("play", handlePlay);
    v.addEventListener("pause", handlePause);
    v.addEventListener("volumechange", handleVolumeChange);
    v.addEventListener("ended", handleEnded);

    return () => {
      v.removeEventListener("timeupdate", handleTimeUpdate);
      v.removeEventListener("loadedmetadata", handleLoadedMetadata);
      v.removeEventListener("play", handlePlay);
      v.removeEventListener("pause", handlePause);
      v.removeEventListener("volumechange", handleVolumeChange);
      v.removeEventListener("ended", handleEnded);
    };
  }, [videoEl, onTimeUpdate, onDurationChange, onPlayingChange, onVolumeChange, onEnded]);

  useImperativeHandle(
    ref,
    () => ({
      play: () => videoRef.current?.play().catch(() => {}),
      pause: () => videoRef.current?.pause(),
      togglePlay: () => {
        const v = videoRef.current;
        if (!v) return;
        v.paused ? v.play().catch(() => {}) : v.pause();
      },
      seek: (time: number) => {
        if (videoRef.current) videoRef.current.currentTime = time;
      },
      setVolume: (value: number) => {
        const v = videoRef.current;
        if (!v) return;
        v.volume = value;
        v.muted = value === 0;
      },
      toggleMute: () => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = !v.muted;
        if (!v.muted && v.volume === 0) v.volume = 1;
      },
      lookAt: (yaw: number, pitch: number) => cameraControllerRef.current?.lookAt(yaw, pitch),
    }),
    []
  );

  const handleHoverChange = useCallback((id: string, hovering: boolean) => {
    setHoveredHotspotId((prev) => {
      if (hovering) {
        videoRef.current?.pause();
        return id;
      }

      if (prev === id) {
        videoRef.current?.play().catch(() => {});
        return null;
      }

      return prev;
    });
  }, []);

  const handleSelectChange = useCallback((id: string) => {     
    setSelectedHotspotId((prev) => (prev === id ? null : id));   
  }, []);

  const cursor = hoveredHotspotId ? "pointer" : isAddingPOI ? "crosshair" : "grab";

  return (
    <div className="relative w-full h-full bg-black">
      {videoEl && (
        <Canvas
          camera={{ position: [0, 0, 0.1] }}
          style={{ width: "100%", height: "100%", cursor }}
        >
          <XR store={xrStore}>
            <Sphere
              video={videoEl}
              points={points}
              isAddingPOI={isAddingPOI}
              onPositionClick={onPositionClick}
              onHoverChange={handleHoverChange}
              selectedHotspotId={selectedHotspotId}
              onSelectChange={handleSelectChange}
            />

            <OffscreenIndicators
              points={points}
              video={videoEl}
              onUpdate={setOffscreenIndicators}
            />

            <VROffscreenIndicators points={points} video={videoEl} />

            <CameraController ref={cameraControllerRef} />
          </XR>
        </Canvas>
      )}

      {offscreenIndicators.map((indicator) => (
        <div
          key={indicator.id}
          className="absolute z-30 pointer-events-none"
          style={{
            left: indicator.x,
            top: indicator.y,
            transform: `translate(-50%, -50%) rotate(${indicator.angle}deg) scale(2)`,
          }}
        >
          <ChevronUp className="w-6 h-6 text-white drop-shadow-md" strokeWidth={2.5} />
        </div>
      ))}

      {isVRAvailable && ( 
        <button 
          type="button" 
          onClick={async () => { 
            try { 
              await videoRef.current?.play(); 
              await xrStore.enterVR(); 
            } catch (error) { 
              console.error( "Erro ao iniciar VR:", error ); 
            }
          }} 
          className="absolute bottom-4 right-4 z-50 rounded-lg bg-white px-4 py-2 font-medium text-black shadow-lg" > 
          Ver em VR 
        </button> 
      )}
    </div>
  );
});

export default Video360Viewer;
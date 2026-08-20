"use client";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { Billboard, Text, useTexture} from "@react-three/drei";
import * as THREE from "three";
import { PointOfInterest, POIMedia } from "./PointOfInterest";

const WIDTH = 2.6;
const PADDING = 0.15;
const TITLE_HEIGHT = 0.4;
const DESC_LINE_HEIGHT = 0.22;
const IMAGE_HEIGHT = 1.4;
const AV_HEIGHT = 0.5;


const READ_DISTANCE = 1.8; // distância de leitura em VR
const SIDE_OFFSET = 0.55; // deslocamento lateral
const VERTICAL_LIFT = 0.2; // deslocamento vertical
const FOLLOW_LERP = 0.15; // suavização do acompanhamento
const PANEL_RENDER_ORDER = 20;
const CONTENT_RENDER_ORDER = PANEL_RENDER_ORDER + 1;
const OVERLAY_RENDER_ORDER = PANEL_RENDER_ORDER + 2;
const LEADER_LINE_RENDER_ORDER = PANEL_RENDER_ORDER - 1;
const LEADER_LINE_COLOR = "#ffffff";

interface Block {
  type: "title" | "description" | "media";
  height: number;
  media?: POIMedia;
  y: number;
}

function buildLayout(point: PointOfInterest) {
  const raw: Omit<Block, "y">[] = [{ type: "title", height: TITLE_HEIGHT }];

  if (point.description) {
    const lines = Math.max(1, Math.ceil(point.description.length / 42));
    raw.push({ type: "description", height: Math.min(1.3, 0.2 + lines * DESC_LINE_HEIGHT) });
  }

  point.media?.forEach((media) => {
    raw.push({ type: "media", height: media.type === "image" ? IMAGE_HEIGHT : AV_HEIGHT, media });
  });

  const totalHeight = raw.reduce((sum, b) => sum + b.height, 0) + PADDING * (raw.length + 1);
  let cursorY = totalHeight / 2 - PADDING;

  const blocks: Block[] = raw.map((b) => {
    const y = cursorY - b.height / 2;
    cursorY -= b.height + PADDING;
    return { ...b, y };
  });

  return { blocks, totalHeight };
}

function ImageBlock({ media, y }: { media: POIMedia; y: number }) {
  const texture = useTexture(media.url);
  const contentWidth = WIDTH - PADDING * 2;
  return (
    <mesh position={[0, y, 0.01]} renderOrder={CONTENT_RENDER_ORDER}>
      <planeGeometry args={[contentWidth, IMAGE_HEIGHT - PADDING]} />
      <meshBasicMaterial map={texture} toneMapped={false} depthTest={false} depthWrite={false} />
    </mesh>
  );
}

function AudioBlock({ media, y }: { media: POIMedia; y: number }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio(media.url);
    audioRef.current = audio;
    const onEnded = () => setPlaying(false);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, [media.url]);

  const toggle = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
    }
  };

  const contentWidth = WIDTH - PADDING * 2;

  return (
    <group position={[0, y, 0.01]} onClick={toggle} pointerEventsType={{ deny: "grab" }}>
      <mesh renderOrder={CONTENT_RENDER_ORDER}>
        <planeGeometry args={[contentWidth, AV_HEIGHT - 0.1]} />
        <meshBasicMaterial
          color={playing ? "#e5e5e5" : "#f2f2f2"}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <Text
        fontSize={0.15}
        color="#111111"
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 0.01]}
        renderOrder={OVERLAY_RENDER_ORDER}
        material-depthTest={false}
        material-depthWrite={false}
      >
        {playing ? "Pausar áudio" : "Reproduzir áudio"}
      </Text>
    </group>
  );
}

function VideoBlock({ media, y }: { media: POIMedia; y: number }) {
  const [videoEl] = useState(() => {
    const v = document.createElement("video");
    v.src = media.url;
    v.crossOrigin = "anonymous";
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    return v;
  });
  const [playing, setPlaying] = useState(false);

  const texture = useMemo(() => {
    const t = new THREE.VideoTexture(videoEl);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [videoEl]);

  useFrame(() => {
    if (playing && videoEl.readyState >= videoEl.HAVE_CURRENT_DATA) {
      texture.needsUpdate = true;
    }
  });

  useEffect(() => {
    return () => {
      videoEl.pause();
      videoEl.removeAttribute("src");
      videoEl.load();
      texture.dispose();
    };
  }, [videoEl, texture]);

  const toggle = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (playing) {
      videoEl.pause();
      setPlaying(false);
    } else {
      videoEl.play().catch(() => {});
      setPlaying(true);
    }
  };

  const contentWidth = WIDTH - PADDING * 2;
  const height = AV_HEIGHT * 2.2;
  
  


  return (
    <group position={[0, y, 0.01]} onClick={toggle} pointerEventsType={{ deny: "grab" }}>
      <mesh renderOrder={CONTENT_RENDER_ORDER}>
        <planeGeometry args={[contentWidth, height]} />
        <meshBasicMaterial map={texture} toneMapped={false} depthTest={false} depthWrite={false} />
      </mesh>
      {!playing && (
        <Text
          fontSize={0.14}
          color="#ffffff"
          outlineWidth={0.008}
          outlineColor="#000000"
          anchorX="center"
          anchorY="middle"
          position={[0, 0, 0.01]}
          renderOrder={OVERLAY_RENDER_ORDER}
          material-depthTest={false}
          material-depthWrite={false}
        >
          Toque para reproduzir
        </Text>
      )}
    </group>
  );
}

interface HotspotVRProps {
  point: PointOfInterest;
  radius: number;
}

export function HotspotVR({ point, radius }: HotspotVRProps) {
  const { blocks, totalHeight } = useMemo(() => buildLayout(point), [point]);
  const { camera } = useThree();

  const anchorRef = useRef<THREE.Group>(null);

  const [leaderLine] = useState(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const material = new THREE.LineBasicMaterial({
      color: LEADER_LINE_COLOR,
      transparent: true,
      opacity: 0.5,
      depthTest: false,
      depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    line.renderOrder = LEADER_LINE_RENDER_ORDER;
    return line;
  });

  useEffect(() => {
    return () => {
      leaderLine.geometry.dispose();
      (leaderLine.material as THREE.Material).dispose();
    };
  }, [leaderLine]);

  // Vetores reutilizados entre frames para evitar alocações.
  const markerWorldPos = useRef(new THREE.Vector3());
  const camWorldPos = useRef(new THREE.Vector3());
  const dirToMarker = useRef(new THREE.Vector3());
  const rightVec = useRef(new THREE.Vector3());
  const upVec = useRef(new THREE.Vector3());
  const targetWorld = useRef(new THREE.Vector3());
  const targetLocal = useRef(new THREE.Vector3());
  const lineStart = useRef(new THREE.Vector3());

  useFrame(() => {
    const anchor = anchorRef.current;
    const parent = anchor?.parent;
    if (!anchor || !parent) return;

    parent.getWorldPosition(markerWorldPos.current);
    camera.getWorldPosition(camWorldPos.current);

    dirToMarker.current.copy(markerWorldPos.current).sub(camWorldPos.current);
    if (dirToMarker.current.lengthSq() < 1e-6) {
      dirToMarker.current.set(0, 0, -1);
    } else {
      dirToMarker.current.normalize();
    }

    rightVec.current.setFromMatrixColumn(camera.matrixWorld, 0);
    upVec.current.setFromMatrixColumn(camera.matrixWorld, 1);


    targetWorld.current
      .copy(camWorldPos.current)
      .addScaledVector(dirToMarker.current, READ_DISTANCE)
      .addScaledVector(rightVec.current, SIDE_OFFSET)
      .addScaledVector(upVec.current, VERTICAL_LIFT);

    parent.worldToLocal(targetLocal.current.copy(targetWorld.current));
    anchor.position.lerp(targetLocal.current, FOLLOW_LERP);


    const geometry = leaderLine.geometry;
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    positions.setXYZ(0, lineStart.current.x, lineStart.current.y, lineStart.current.z);
    positions.setXYZ(1, anchor.position.x, anchor.position.y, anchor.position.z);
    positions.needsUpdate = true;
  
  });

  return (
    <>
      <primitive object={leaderLine} />
      <group ref={anchorRef}>
        <Billboard>
          <mesh position={[0, 0, -0.01]} renderOrder={PANEL_RENDER_ORDER}>
            <planeGeometry args={[WIDTH, totalHeight]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.92}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>

          {blocks.map((block, i) => {
            const key = `${point.id}-block-${i}`;

            if (block.type === "title") {
              return (
                <Text
                  key={key}
                  position={[0, block.y, 0.01]}
                  fontSize={0.22}
                  color="#111111"
                  anchorX="center"
                  anchorY="middle"
                  maxWidth={WIDTH - PADDING * 2}
                  textAlign="center"
                  renderOrder={CONTENT_RENDER_ORDER}
                  material-depthTest={false}
                  material-depthWrite={false}
                >
                  {point.title || "Ponto de Interesse"}
                </Text>
              );
            }

            if (block.type === "description" && point.description) {
              return (
                <Text
                  key={key}
                  position={[0, block.y, 0.01]}
                  fontSize={0.14}
                  color="#333333"
                  anchorX="center"
                  anchorY="middle"
                  maxWidth={WIDTH - PADDING * 2}
                  textAlign="center"
                  renderOrder={CONTENT_RENDER_ORDER}
                  material-depthTest={false}
                  material-depthWrite={false}
                >
                  {point.description}
                </Text>
              );
            }

            if (block.type === "media" && block.media) {
              if (block.media.type === "image") {
                return (
                  <Suspense key={key} fallback={null}>
                    <ImageBlock media={block.media} y={block.y} />
                  </Suspense>
                );
              }
              if (block.media.type === "audio") return <AudioBlock key={key} media={block.media} y={block.y} />;
              if (block.media.type === "video") return <VideoBlock key={key} media={block.media} y={block.y} />;
            }

            return null;
          })}
        </Billboard>
      </group>
    </>
  );
}
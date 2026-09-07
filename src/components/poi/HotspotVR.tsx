"use client";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { Billboard, Text, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { PointOfInterest, POIMedia } from "./PointOfInterest";

const WIDTH = 3.4;
const PADDING = 0.2;
const TITLE_HEIGHT = 0.52;
const DESC_LINE_HEIGHT = 0.28;
const IMAGE_HEIGHT = 1.8;
const AV_HEIGHT = 0.65;

const SIDE_GAP = 0.5;
const VERTICAL_LIFT = 0.1;
const FOLLOW_LERP = 0.2;

// Margem extra do painel
const BLUR_MARGIN = 0.3;


const PANEL_RENDER_ORDER = 20;
const DIVIDER_RENDER_ORDER = PANEL_RENDER_ORDER + 1;
const CONTENT_RENDER_ORDER = PANEL_RENDER_ORDER + 2;
const OVERLAY_RENDER_ORDER = PANEL_RENDER_ORDER + 3;

let frostedPanelTexture: THREE.CanvasTexture | null = null;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function getFrostedPanelTexture(): THREE.CanvasTexture | null {
  if (frostedPanelTexture) return frostedPanelTexture;
  if (typeof document === "undefined") return null; 

  const size = 512;
  const blurPx = 30;
  const inset = blurPx * 1.6;
  const radius = size * 0.14;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);
  (ctx as unknown as { filter: string }).filter = `blur(${blurPx}px)`;
  ctx.fillStyle = "#ffffff";
  drawRoundedRect(ctx, inset, inset, size - inset * 2, size - inset * 2, radius);
  ctx.fill();

  frostedPanelTexture = new THREE.CanvasTexture(canvas);
  frostedPanelTexture.needsUpdate = true;
  return frostedPanelTexture;
}

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
  const imageHeight = IMAGE_HEIGHT - PADDING;

  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0, 0.01]} renderOrder={CONTENT_RENDER_ORDER}>
        <planeGeometry args={[contentWidth, imageHeight]} />
        <meshBasicMaterial map={texture} toneMapped={false} depthTest={false} depthWrite={false} />
      </mesh>

      {media.caption && (
        <group position={[0, -imageHeight / 2 + 0.18, 0.02]}>
          <mesh renderOrder={CONTENT_RENDER_ORDER}>
            <planeGeometry args={[contentWidth, 0.34]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.6}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.12}
            color="#000000"
            anchorX="center"
            anchorY="middle"
            maxWidth={contentWidth - 0.16}
            textAlign="center"
            renderOrder={OVERLAY_RENDER_ORDER}
            material-depthTest={false}
            material-depthWrite={false}
          >
            {media.caption}
          </Text>
        </group>
      )}
    </group>
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
        <planeGeometry args={[contentWidth, AV_HEIGHT - 0.13]} />
        <meshBasicMaterial
          color={playing ? "#e5e5e5" : "#f2f2f2"}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <Text
        fontSize={0.2}
        color="#000000"
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
          fontSize={0.18}
          color="#ffffff"
          outlineWidth={0.01}
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
  const panelTexture = useMemo(() => getFrostedPanelTexture(), []);

  const anchorRef = useRef<THREE.Group>(null);
  const targetVec = useRef(new THREE.Vector3());
  const rightVec = useRef(new THREE.Vector3());
  const upVec = useRef(new THREE.Vector3());
  const sideOffset = radius + SIDE_GAP + WIDTH / 2;

  useFrame(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    rightVec.current.setFromMatrixColumn(camera.matrixWorld, 0);
    upVec.current.setFromMatrixColumn(camera.matrixWorld, 1);

    targetVec.current
      .copy(rightVec.current)
      .multiplyScalar(sideOffset)
      .addScaledVector(upVec.current, VERTICAL_LIFT);

    anchor.position.lerp(targetVec.current, FOLLOW_LERP);
  });

  return (
    <group ref={anchorRef}>
      <Billboard>
        <mesh position={[0, 0, -0.01]} renderOrder={PANEL_RENDER_ORDER}>
          <planeGeometry args={[WIDTH + BLUR_MARGIN, totalHeight + BLUR_MARGIN]} />
          <meshBasicMaterial
            color="#ffffff"
            alphaMap={panelTexture ?? undefined}
            transparent
            opacity={0.6}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>

        {blocks.length > 1 && (
          <mesh
            position={[0, blocks[0].y - blocks[0].height / 2 - PADDING / 2, 0.008]}
            renderOrder={DIVIDER_RENDER_ORDER}
          >
            <planeGeometry args={[WIDTH - PADDING * 2.4, 0.016]} />
            <meshBasicMaterial
              color="#000000"
              transparent
              opacity={0.18}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        )}

        {blocks.map((block, i) => {
          const key = `${point.id}-block-${i}`;

          if (block.type === "title") {
            return (
              <Text
                key={key}
                position={[0, block.y, 0.01]}
                fontSize={0.32}
                color="#000000"
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
                fontSize={0.2}
                color="#000000"
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
  );
}
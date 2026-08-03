import * as THREE from "three";

export interface EdgeIndicator {
  x: number;
  y: number;
  angle: number;
}


export function getEdgeIndicator(
  camera: THREE.PerspectiveCamera,
  targetWorldPos: THREE.Vector3,
  width: number,
  height: number,
  margin = 32
): EdgeIndicator | null {
  const viewSpace = targetWorldPos.clone().applyMatrix4(camera.matrixWorldInverse);
  const behindCamera = viewSpace.z > 0;

  const ndc = targetWorldPos.clone().project(camera);
  let ndcX = ndc.x;
  let ndcY = ndc.y;

  if (behindCamera) {
    ndcX = -ndcX;
    ndcY = -ndcY;
  }

  const isOffScreen = behindCamera || ndcX < -1 || ndcX > 1 || ndcY < -1 || ndcY > 1;
  if (!isOffScreen) return null;

  const angleRad = Math.atan2(ndcY, ndcX);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  const halfW = width / 2 - margin;
  const halfH = height / 2 - margin;
  const scaleX = cos !== 0 ? halfW / Math.abs(cos) : Infinity;
  const scaleY = sin !== 0 ? halfH / Math.abs(sin) : Infinity;
  const scale = Math.min(scaleX, scaleY);

  const x = width / 2 + cos * scale;
  const y = height / 2 - sin * scale; // NDC tem Y para cima; o DOM tem Y para baixo.

  const ddx = x - width / 2;
  const ddy = y - height / 2;
  const angle = Math.atan2(ddx, -ddy) * (180 / Math.PI);

  return { x, y, angle };
}
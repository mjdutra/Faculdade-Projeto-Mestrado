import * as THREE from "three";

export function yawPitchToVector(yaw: number, pitch: number, radius: number) {
  const yawRad = THREE.MathUtils.degToRad(yaw);
  const pitchRad = THREE.MathUtils.degToRad(pitch);
  return new THREE.Vector3(
    radius * Math.sin(yawRad) * Math.cos(pitchRad),
    radius * Math.sin(pitchRad),
    radius * Math.cos(yawRad) * Math.cos(pitchRad)
  );
}

export function vectorToYawPitch(point: THREE.Vector3) {
  const p = point.clone().normalize();
  return {
    yaw: THREE.MathUtils.radToDeg(Math.atan2(p.x, p.z)),
    pitch: THREE.MathUtils.radToDeg(Math.asin(p.y)),
  };
}
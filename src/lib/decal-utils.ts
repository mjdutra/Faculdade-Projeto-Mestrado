import * as THREE from "three";


export function eulerFromNormal(
  position: THREE.Vector3,
  normal: THREE.Vector3
): THREE.Euler {
  const worldUp = new THREE.Vector3(0, 1, 0);

  const up =
    Math.abs(normal.dot(worldUp)) > 0.9
      ? new THREE.Vector3(0, 0, 1)
      : worldUp;

  const dummy = new THREE.Object3D();
  dummy.position.copy(position);
  dummy.up.copy(up);
  dummy.lookAt(position.clone().sub(normal));

  return dummy.rotation.clone();
}
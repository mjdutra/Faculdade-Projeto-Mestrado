import * as THREE from "three";
import { HalfEdgeMap } from "three-bvh-csg";

export interface WatertightReport {
  watertight: boolean;
  unmatchedEdges: number;
  triangleCount: number;
}

export function checkWatertight(
  geometry: THREE.BufferGeometry
): WatertightReport {
  const position = geometry.getAttribute("position");

  if (!position) {
    return {
      watertight: false,
      unmatchedEdges: 0,
      triangleCount: 0,
    };
  }

  const triangleCount = Math.floor(position.count / 3);

  if (triangleCount === 0) {
    return {
      watertight: false,
      unmatchedEdges: 0,
      triangleCount: 0,
    };
  }

  const halfEdges = new HalfEdgeMap();
  halfEdges.updateFrom(geometry);

  let unmatchedEdges = 0;

  for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex++) {
    for (let edgeIndex = 0; edgeIndex < 3; edgeIndex++) {
      const sibling = halfEdges.getSiblingTriangleIndex(
        triangleIndex,
        edgeIndex
      );

      if (sibling === -1) {
        unmatchedEdges++;
      }
    }
  }

  return {
    watertight: unmatchedEdges === 0,
    unmatchedEdges,
    triangleCount,
  };
}
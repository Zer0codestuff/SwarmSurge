import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';

// Preserve native index buffers when merging mixed indexed and non-indexed
// parts instead of expanding everything with toNonIndexed().
export function ensureIndexed(geometry) {
  if (geometry.index) return geometry;
  const count = geometry.attributes.position.count;
  const indices = count <= 65535 ? new Uint16Array(count) : new Uint32Array(count);
  for (let i = 0; i < count; i++) indices[i] = i;
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return geometry;
}

export function mergeIndexed(geometries, useGroups = false) {
  for (let i = 0; i < geometries.length; i++) ensureIndexed(geometries[i]);
  return mergeGeometries(geometries, useGroups);
}

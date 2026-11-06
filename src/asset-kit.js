import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';

// Materials are borrowed by level assets. Each batch owns its geometry.
export const assetSurface = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.52, metalness: 0.15 });
export const assetGlow = new THREE.MeshBasicMaterial({ vertexColors: true });
assetSurface.userData.shared = assetGlow.userData.shared = true;

export function bevelBox(w, h, d, bevel = 0.06) {
  const b = Math.min(bevel, w * 0.18, h * 0.18, d * 0.18);
  const x = w / 2 - b, y = h / 2 - b, cut = b * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-x + cut, -y);
  shape.lineTo(x - cut, -y); shape.lineTo(x, -y + cut);
  shape.lineTo(x, y - cut); shape.lineTo(x - cut, y);
  shape.lineTo(-x + cut, y); shape.lineTo(-x, y - cut);
  shape.lineTo(-x, -y + cut); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: d - b * 2, steps: 1, bevelEnabled: true,
    bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1,
  });
  geometry.translate(0, 0, -d / 2 + b);
  return geometry;
}

export function assetBatch() {
  const parts = [];
  const api = {
    add(g, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
      const geo = g.index ? g.toNonIndexed() : g;
      if (geo !== g) g.dispose();
      geo.rotateX(rx); geo.rotateY(ry); geo.rotateZ(rz); geo.translate(x, y, z);
      const c = new THREE.Color(color), count = geo.attributes.position.count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) { colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      for (const key of Object.keys(geo.attributes)) if (!['position', 'normal', 'color'].includes(key)) geo.deleteAttribute(key);
      parts.push(geo);
      return api;
    },
    box(w, h, d, x, y, z, color, rx = 0, ry = 0, rz = 0) {
      return api.add(bevelBox(w, h, d), color, x, y, z, rx, ry, rz);
    },
    cylinder(r, h, x, y, z, color, axis = 'y', bottom = r, sides = 10) {
      return api.add(new THREE.CylinderGeometry(r, bottom, h, sides), color, x, y, z,
        axis === 'z' ? Math.PI / 2 : 0, 0, axis === 'x' ? Math.PI / 2 : 0);
    },
    ring(r, tube, x, y, z, color, axis = 'y') {
      return api.add(new THREE.TorusGeometry(r, tube, 4, 14), color, x, y, z,
        axis === 'y' ? Math.PI / 2 : 0, axis === 'x' ? Math.PI / 2 : 0);
    },
    sphere(r, x, y, z, color, sx = 1, sy = 1, sz = 1) {
      const g = new THREE.SphereGeometry(r, 12, 8); g.scale(sx, sy, sz);
      return api.add(g, color, x, y, z);
    },
    beam(a, b, w, d, color) {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
      const g = bevelBox(w, start.distanceTo(end), d);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize()));
      start.add(end).multiplyScalar(0.5);
      return api.add(g, color, start.x, start.y, start.z);
    },
    finish(parent, name = '', material = assetSurface) {
      if (!parts.length) throw new Error('Cannot finish an empty asset batch');
      const geometry = mergeGeometries(parts, false);
      parts.forEach(part => part.dispose()); parts.length = 0;
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = name; mesh.castShadow = material === assetSurface; mesh.receiveShadow = material === assetSurface;
      parent.add(mesh);
      return mesh;
    },
  };
  return api;
}

// Absolute poses make repeated paused renders and animation sampling stable.
export function attackPose(progress) {
  if (progress <= 0) return 0;
  return Math.sin(Math.min(1, progress) * Math.PI);
}

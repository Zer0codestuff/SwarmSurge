import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';

const STRIDE_HIP = 0.33;

// Six broad faces, twelve bevels and eight clipped corners: 44 triangles.
function bevelBox(width, height, depth, bevel = 0.02) {
  const half = [width / 2, height / 2, depth / 2];
  const radius = Math.min(bevel, ...half.map(n => n * 0.8));
  const inner = half.map(n => n - radius);
  const positions = [], normals = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  const normal = new THREE.Vector3(), center = new THREE.Vector3();
  function face(points) {
    a.fromArray(points[1]).sub(new THREE.Vector3().fromArray(points[0]));
    b.fromArray(points[2]).sub(new THREE.Vector3().fromArray(points[0]));
    normal.crossVectors(a, b).normalize();
    center.set(0, 0, 0);
    for (const p of points) center.add(new THREE.Vector3().fromArray(p));
    if (normal.dot(center) < 0) { points.reverse(); normal.negate(); }
    for (let i = 1; i < points.length - 1; i++) {
      for (const p of [points[0], points[i], points[i + 1]]) {
        positions.push(...p); normals.push(normal.x, normal.y, normal.z);
      }
    }
  }
  for (let axis = 0; axis < 3; axis++) {
    const u = (axis + 1) % 3, v = (axis + 2) % 3;
    for (const sign of [-1, 1]) {
      face([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([su, sv]) => {
        const p = [0, 0, 0];
        p[axis] = sign * half[axis]; p[u] = su * inner[u]; p[v] = sv * inner[v];
        return p;
      }));
    }
  }
  for (let axis = 0; axis < 3; axis++) {
    const u = (axis + 1) % 3, v = (axis + 2) % 3;
    for (const su of [-1, 1]) for (const sv of [-1, 1]) {
      face([[-1, true], [1, true], [1, false], [-1, false]].map(([sign, first]) => {
        const p = [0, 0, 0];
        p[axis] = sign * inner[axis];
        p[u] = su * (first ? half[u] : inner[u]);
        p[v] = sv * (first ? inner[v] : half[v]);
        return p;
      }));
    }
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const signs = [sx, sy, sz];
    face([0, 1, 2].map(axis => signs.map((s, i) => s * (i === axis ? half[i] : inner[i]))));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}

export function troopBuilder(animated = false, lowDetail = false) {
  const parts = [];
  function add(geometry, color, position = [0, 0, 0], rotation = [0, 0, 0], leg = 0) {
    geometry.rotateX(rotation[0]).rotateY(rotation[1]).rotateZ(rotation[2]);
    geometry.translate(...position);
    let g = geometry;
    if (g.index) { g = geometry.toNonIndexed(); geometry.dispose(); }
    // Sculpted surfaces carry a soft baked shade; keep it under the part color.
    const shade = g.attributes.color;
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'color') g.deleteAttribute(name);
    }
    const tint = new THREE.Color(color);
    const p = g.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const stride = animated ? new Float32Array(p.count * 3) : null;
    for (let i = 0; i < p.count; i++) {
      const k = shade ? shade.getX(i) : 1;
      colors.set([tint.r * k, tint.g * k, tint.b * k], i * 3);
      if (leg) {
        // A ratio keeps the hip pivot correct when the merged model is scaled.
        const radius = Math.hypot(p.getX(i), p.getY(i), p.getZ(i));
        stride.set([leg, STRIDE_HIP / Math.max(radius, 0.0001), 1], i * 3);
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    if (animated) g.setAttribute('unitStride', new THREE.BufferAttribute(stride, 3));
    parts.push(g);
  }
  return {
    add,
    box(size, position, color, bevel = 0.018, rotation, leg = 0, keepBevel = false) {
      const geometry = lowDetail && bevel < 0.04 && !keepBevel ? new THREE.BoxGeometry(...size) : bevelBox(...size, bevel);
      add(geometry, color, position, rotation, leg);
    },
    cylinder(front, rear, length, position, color, axis = 'z', segments = 8) {
      const rotation = axis === 'z' ? [Math.PI / 2, 0, 0] : axis === 'x' ? [0, 0, Math.PI / 2] : [0, 0, 0];
      add(new THREE.CylinderGeometry(front, rear, length, lowDetail ? 4 : segments), color, position, rotation);
    },
    sphere(radius, scale, position, color, width = 10, height = 6) {
      add(new THREE.SphereGeometry(radius, width, height).scale(...scale), color, position);
    },
    ring(radius, tube, position, color, segments = 10) {
      add(new THREE.TorusGeometry(radius, tube, 4, segments), color, position);
    },
    hose(points, radius, color) {
      const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
      add(new THREE.TubeGeometry(path, 6, radius, 5, false), color);
    },
    finish() {
      const geometry = mergeGeometries(parts, false);
      for (const part of parts) part.dispose();
      geometry.userData.shared = true;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      if (animated) {
        // The stride raises the feet and extends them beyond their resting pose.
        geometry.boundingBox.min.z -= 0.18;
        geometry.boundingBox.max.z += 0.18;
        geometry.boundingSphere.radius += 0.18;
      }
      return geometry;
    },
  };
}

function spectralWisp(points, radius) {
  const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const steps = 8, sides = 4;
  const geometry = new THREE.TubeGeometry(path, steps, radius, sides, false);
  const position = geometry.attributes.position;
  const center = new THREE.Vector3(), offset = new THREE.Vector3();
  for (let step = 0; step <= steps; step++) {
    path.getPointAt(step / steps, center);
    const taper = 0.08 + 0.92 * (1 - step / steps) ** 0.8;
    for (let side = 0; side <= sides; side++) {
      const index = step * (sides + 1) + side;
      offset.fromBufferAttribute(position, index).sub(center).multiplyScalar(taper).add(center);
      position.setXYZ(index, offset.x, offset.y, offset.z);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

function ghostKit(b) {
  const pale = 0xdbffff, mist = 0x9ee6f0;
  // Open rings and rear wisps leave the helmet, torso and legs visible.
  b.add(new THREE.TorusGeometry(0.294, 0.021, 4, 14, Math.PI * 1.7), pale, [0, 1.145, -0.025], [Math.PI / 2, 0, 0.47]);
  b.add(new THREE.TorusGeometry(0.274, 0.025, 4, 12, Math.PI * 1.6), mist, [0, 0.655, -0.025], [Math.PI / 2, 0, 0.63]);
  for (const side of [-1, 1]) {
    b.box([0.09, 0.065, 0.13], [side * 0.252, 0.655, -0.036], pale, 0.022);
    b.add(spectralWisp([
      [side * 0.275, 0.645, -0.075], [side * 0.355, 0.475, -0.145],
      [side * 0.317, 0.27, -0.275], [side * 0.36, 0.105, -0.39],
    ], 0.037), mist);
  }
  b.add(spectralWisp([[0, 0.57, -0.29], [0.075, 0.405, -0.35], [-0.035, 0.23, -0.43], [-0.015, 0.08, -0.51]], 0.033), pale);
}

/** Fresh phase-ghost overlay at nominal troop scale. */
export function ghostKitGeometry() {
  const b = troopBuilder();
  ghostKit(b);
  const geometry = b.finish();
  geometry.name = 'Ghost halo';
  return geometry;
}

const troopTime = { value: 0 };
const STRIDE_SHADER = `
uniform float uTroopTime;
uniform float uTroopStride;
attribute vec3 unitStride;
#ifdef USE_INSTANCING
  attribute vec2 unitMotion;
#endif
float unitStrideAngle() {
  float phase = uTroopTime * 10.5;
  float movement = 1.0;
  #ifdef USE_INSTANCING
    phase = unitMotion.x;
    movement = unitMotion.y;
  #endif
  return sin(phase) * unitStride.x * 0.43 * uTroopStride * movement;
}
vec2 unitStrideRotate(vec2 value, float angle) {
  float s = sin(angle), c = cos(angle);
  return vec2(c * value.x - s * value.y, s * value.x + c * value.y);
}
`;

function patchMotionMaterial(material, stride) {
  const previousCompile = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey;
  material.onBeforeCompile = function(shader, renderer) {
    previousCompile.call(this, shader, renderer);
    shader.uniforms.uTroopTime = troopTime;
    shader.uniforms.uTroopStride = stride;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${STRIDE_SHADER}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        objectNormal.yz = unitStrideRotate(objectNormal.yz, unitStrideAngle());`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        if (unitStride.x != 0.0) {
          float stepAngle = unitStrideAngle();
          float hipHeight = length(position) * unitStride.y;
          transformed.yz = unitStrideRotate(transformed.yz - vec2(hipHeight, 0.0), stepAngle) + vec2(hipHeight, 0.0);
          transformed.y += abs(sin(stepAngle)) * hipHeight * 0.22;
        }`);
  };
  material.customProgramCacheKey = function() {
    return `${previousKey.call(this)}|surge-infantry-stride-v2`;
  };
  material.needsUpdate = true;
}

/** Patch once, then attach the supplied shadow materials to the InstancedMesh. */
export function installTroopMotion(material) {
  if (material.userData.troopMotion) return material;
  const stride = { value: 1 };
  patchMotionMaterial(material, stride);
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  const distance = new THREE.MeshDistanceMaterial();
  patchMotionMaterial(depth, stride);
  patchMotionMaterial(distance, stride);
  material.userData.troopMotion = { stride, depthMaterial: depth, distanceMaterial: distance };
  material.addEventListener('dispose', () => { depth.dispose(); distance.dispose(); });
  return material;
}

/** Pass simulation seconds so pause and the saved battle also freeze the stride. */
export function updateTroopMotion(time) {
  if (Number.isFinite(time)) troopTime.value = time;
}

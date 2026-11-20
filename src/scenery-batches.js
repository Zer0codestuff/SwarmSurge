import * as THREE from 'three';

const CHUNK_LENGTH = 56;
const SHADOW_X_LIMIT = 26;
// Linear scene fog reaches 100% opacity at 170 units; ground-level batches beyond
// 172 units from the near plane sit below the horizon and draw solid fog onto fog.
const FOG_CULL_DIST = 172;
const FOG_CULL_MAX_Y = 10;

function boxMinDistToPlane(plane, box) {
  const n = plane.normal;
  return n.x * (n.x >= 0 ? box.min.x : box.max.x)
    + n.y * (n.y >= 0 ? box.min.y : box.max.y)
    + n.z * (n.z >= 0 ? box.min.z : box.max.z)
    + plane.constant;
}

// A batch only exists after its scenery transforms are final. Tight 2D world
// bounds let the view and shadow frustums cull far-side, off-screen and
// fully fogged distant props independently.
export class SceneryBatch extends THREE.InstancedMesh {
  intersectsFrustum(frustum) {
    if (this.fogCullable && boxMinDistToPlane(frustum.planes[5], this.worldBounds) > FOG_CULL_DIST) {
      return false;
    }
    return frustum.intersectsBox(this.worldBounds);
  }
}

export function finalizeSceneryBatch(batch) {
  batch.updateWorldMatrix(true, false);
  batch.computeBoundingBox();
  batch.worldBounds = batch.boundingBox.clone().applyMatrix4(batch.matrixWorld);
  const mat = batch.material;
  batch.fogCullable = !Array.isArray(mat) && mat.fog !== false && batch.worldBounds.max.y <= FOG_CULL_MAX_Y;
  return batch;
}

function xBand(x) {
  if (x < -SHADOW_X_LIMIT) return 0;
  if (x <= SHADOW_X_LIMIT) return 1;
  return 2;
}

export function chunkScenery(world) {
  const sources = [];
  world.traverse(object => {
    if (!object.isInstancedMesh || !object.frustumCulled || object.count < 16
        || object instanceof SceneryBatch
        || object.parent?.name?.startsWith('roadside-')
        || Array.isArray(object.material) || (object.material.transparent && object.material.depthWrite)) return;
    const geometry = object.geometry;
    const triangles = (geometry.index?.count ?? geometry.attributes.position.count) / 3;
    if (triangles * object.count >= 2500) sources.push(object);
  });

  const matrix = new THREE.Matrix4(), color = new THREE.Color();
  for (const source of sources) {
    source.updateWorldMatrix(true, false);
    const ox = source.matrixWorld.elements[12], oz = source.matrixWorld.elements[14];
    const chunks = new Map();
    for (let i = 0; i < source.count; i++) {
      source.getMatrixAt(i, matrix);
      const wx = ox + matrix.elements[12], wz = oz + matrix.elements[14];
      const band = xBand(wx);
      const slice = Math.floor(wz / CHUNK_LENGTH);
      const key = `${band}:${slice}`;
      let entry = chunks.get(key);
      if (!entry) chunks.set(key, entry = { band, slots: [] });
      entry.slots.push(i);
    }
    if (chunks.size < 2) {
      const only = chunks.values().next().value;
      if (only && only.band !== 1) source.castShadow = false;
      continue;
    }

    const parent = source.parent;
    for (const { band, slots } of chunks.values()) {
      const batch = new SceneryBatch(source.geometry, source.material, slots.length);
      batch.name = source.name;
      batch.position.copy(source.position);
      batch.quaternion.copy(source.quaternion);
      batch.scale.copy(source.scale);
      batch.castShadow = source.castShadow && band === 1;
      batch.receiveShadow = source.receiveShadow;
      batch.layers.mask = source.layers.mask;
      batch.renderOrder = source.renderOrder;
      batch.visible = source.visible;
      for (let i = 0; i < slots.length; i++) {
        source.getMatrixAt(slots[i], matrix);
        batch.setMatrixAt(i, matrix);
        if (source.instanceColor) {
          source.getColorAt(slots[i], color);
          batch.setColorAt(i, color);
        }
      }
      parent.add(batch);
      finalizeSceneryBatch(batch);
    }
    source.removeFromParent();
    source.dispose();
  }
}

import * as THREE from 'three';

const CHUNK_LENGTH = 64;

// A batch only exists after its scenery transforms are final. Tight world
// bounds let the view and shadow frustums cull it independently.
class SceneryBatch extends THREE.InstancedMesh {
  intersectsFrustum(frustum) {
    return frustum.intersectsBox(this.worldBounds);
  }
}

export function chunkScenery(world) {
  const sources = [];
  world.traverse(object => {
    if (!object.isInstancedMesh || !object.frustumCulled || object.count < 24
        || Array.isArray(object.material) || object.material.transparent) return;
    const geometry = object.geometry;
    const triangles = (geometry.index?.count ?? geometry.attributes.position.count) / 3;
    if (triangles * object.count >= 4500) sources.push(object);
  });

  const matrix = new THREE.Matrix4(), color = new THREE.Color();
  for (const source of sources) {
    const chunks = new Map();
    for (let i = 0; i < source.count; i++) {
      source.getMatrixAt(i, matrix);
      const slice = Math.floor(matrix.elements[14] / CHUNK_LENGTH);
      let slots = chunks.get(slice);
      if (!slots) chunks.set(slice, slots = []);
      slots.push(i);
    }
    if (chunks.size < 2) continue;

    const parent = source.parent;
    for (const slots of chunks.values()) {
      const batch = new SceneryBatch(source.geometry, source.material, slots.length);
      batch.name = source.name;
      batch.position.copy(source.position);
      batch.quaternion.copy(source.quaternion);
      batch.scale.copy(source.scale);
      batch.castShadow = source.castShadow;
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
      batch.updateWorldMatrix(true, false);
      batch.computeBoundingBox();
      batch.worldBounds = batch.boundingBox.clone().applyMatrix4(batch.matrixWorld);
    }
    source.removeFromParent();
    source.dispose();
  }
}

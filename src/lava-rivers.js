import * as THREE from 'three';

// A repeating field of cooling plates. The two nearest sites meet at a hot fissure.
// Generate it once per volcanic world, then let the texture mipmaps resolve distant cracks.
function crustTexture() {
  const width = 96, height = 192, columns = 4, rows = 9;
  const sites = [];
  let seed = 517;
  const jitter = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed / 4294967296 - 0.5) * 0.84;
  };
  for (let i = 0; i < (columns + 4) * rows; i++) sites.push([jitter(), jitter()]);
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const v = y / height, phase = v * Math.PI * 2;
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const px = u * columns + .26 * Math.sin(phase * 3 + u * 8) + .08 * Math.sin(phase * 7 - u * 16);
      const py = v * rows + .18 * Math.sin(u * 17 + phase * 2);
      let nearest = Infinity, second = Infinity;
      for (let j = Math.floor(py) - 1; j <= Math.floor(py) + 1; j++) {
        for (let i = Math.floor(px) - 1; i <= Math.floor(px) + 1; i++) {
          const [dx, dy] = sites[((j + rows) % rows) * (columns + 4) + i + 2];
          const d = (i + .5 + dx - px) ** 2 + (j + .5 + dy - py) ** 2;
          if (d < nearest) { second = nearest; nearest = d; }
          else if (d < second) second = d;
        }
      }
      const gap = Math.sqrt(second) - Math.sqrt(nearest);
      const hot = Math.max(0, 1 - gap * 8);
      const skin = Math.max(0, 1 - gap * 2.2);
      const p = (y * width + x) * 4;
      pixels[p] = 65 + 101 * skin + 84 * hot;
      pixels[p + 1] = 32 + 15 * skin + 91 * hot * hot;
      pixels[p + 2] = 36 - 13 * skin + 26 * hot * hot;
      pixels[p + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function addLavaRivers(group, zc, total) {
  const positions = [], colors = [], uv = [], indices = [];
  const steps = Math.ceil(total / 1.8);
  for (const side of [-1, 1]) {
    for (let i = 0; i <= steps; i++) {
      const z = zc - total / 2 + total * i / steps;
      const t = z + side * 23;
      const center = side * (12.7 + .85 * Math.sin(t * .21) + .4 * Math.sin(t * .67));
      const radius = 1.7 + .48 * Math.cos(t * .28) + .16 * Math.sin(t * .81);
      const first = positions.length / 3;
      for (const across of [-1, -.75, .75, 1]) {
        positions.push(center + across * radius, .008, z);
        const shade = Math.abs(across) === 1 ? .13 : 1;
        colors.push(shade, shade, shade);
        uv.push(across * .5 + .5, t / 12);
      }
      if (i === steps) continue;
      for (let k = first; k < first + 3; k++) indices.push(k, k + 4, k + 1, k + 1, k + 4, k + 5);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({ map: crustTexture(), vertexColors: true, toneMapped: false });
  group.add(new THREE.Mesh(geometry, material));
}

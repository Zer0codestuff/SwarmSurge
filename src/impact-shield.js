import * as THREE from 'three';

// Join the centers of the triangles around each icosphere vertex. The result
// is a shell of hexagonal and pentagonal panes with no texture seams.
function paneGeometry() {
  const source = new THREE.IcosahedronGeometry(1, 2);
  const pos = source.attributes.position, cells = new Map();
  for (let i = 0; i < pos.count; i += 3) {
    const corners = [0,1,2].map(j => new THREE.Vector3().fromBufferAttribute(pos, i+j));
    const center = corners[0].clone().add(corners[1]).add(corners[2]).normalize();
    for (const normal of corners) {
      const key = normal.toArray().map(x => Math.round(x * 1e5)).join(',');
      if (!cells.has(key)) cells.set(key, { normal, ring: [] });
      cells.get(key).ring.push(center);
    }
  }
  source.dispose();
  const positions = [], edges = [], centers = [];
  for (const {normal, ring} of cells.values()) {
    if (ring.every(v => v.y < 0)) continue;
    const axis = Math.abs(normal.y) < .9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
    const u = axis.cross(normal).normalize(), v = normal.clone().cross(u);
    const angle = p => Math.atan2(p.dot(v), p.dot(u));
    ring.sort((a,b) => angle(a) - angle(b));
    for (let k = 0; k < ring.length; k++) {
      for (const point of [normal, ring[k], ring[(k+1)%ring.length]]) {
        positions.push(point.x,point.y,point.z);
        centers.push(normal.x,normal.y,normal.z);
      }
      edges.push(0,1,1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('paneEdge',new THREE.Float32BufferAttribute(edges,1));
  geo.setAttribute('paneCenter',new THREE.Float32BufferAttribute(centers,3));
  geo.computeBoundingSphere();
  return geo;
}

export function createImpactShield() {
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false,
    uniforms: {
      flash: {value: 0}, plates: {value: 0}, hitDir: {value: new THREE.Vector3(0,.4,-1).normalize()},
    },
    vertexShader: `
      attribute float paneEdge;
      attribute vec3 paneCenter;
      uniform float flash;
      uniform vec3 hitDir;
      varying float edge, rim, wave;
      varying vec3 local;
      void main() {
        edge = paneEdge;
        local = position;
        float dist = 1. - dot(paneCenter, hitDir);
        float delta = dist - (1. - flash) * 2.;
        wave = exp(-8. * delta * delta) * flash;
        vec4 eye = modelViewMatrix * vec4(position + paneCenter * wave * .065, 1.);
        rim = pow(1. - max(0.,dot(normalize(normalMatrix * position),normalize(-eye.xyz))), 2.);
        gl_Position = projectionMatrix * eye;
      }`,
    fragmentShader: `
      uniform float plates, flash;
      varying float edge, rim, wave;
      varying vec3 local;
      void main() {
        if (local.y < .006) discard;
        float seam = smoothstep(.86,.96,edge);
        float angle = fract(atan(local.x,local.z) / 6.2831853 + .5) * 6.;
        float band = (1. - smoothstep(.028,.055,abs(local.y-.09))) * smoothstep(.05,.12,fract(angle))
                   * (1. - smoothstep(.88,.95,fract(angle)));
        float live = step(floor(angle) + .5, plates);
        vec3 ice = mix(vec3(.045,.42,.53), vec3(.45,1.,.92), seam*.8 + wave*.2);
        vec3 color = mix(ice, vec3(.85,1.,.97), wave);
        color = mix(color, mix(vec3(.10,.20,.25),vec3(.38,1.,.85),live), band);
        float alpha = .032 + rim*.24 + seam*.19 + wave*.50 + band*(.27+live*.38);
        gl_FragColor = vec4(color, min(.9,alpha) * (plates > 0. ? 1. : flash));
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(paneGeometry(), material);
  mesh.name = 'impact-shield';
  mesh.visible = false;
  return mesh;
}

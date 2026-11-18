import * as THREE from 'three';

// Every warning uses the same quad and program. Dimensions are in road units,
// which keeps the border legible on both small blast circles and long sweeps.
const quad = new THREE.PlaneGeometry(1, 1);
const material = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, toneMapped: false,
  uniforms: {
    size: { value: new THREE.Vector2() }, progress: { value: 0 }, mode: { value: 0 },
  },
  vertexShader: `
    varying vec2 coord;
    void main() {
      coord = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
    }`,
  fragmentShader: `
    varying vec2 coord;
    uniform vec2 size;
    uniform float progress, mode;
    // mode: 0 blast, 1 troop lane, 2 cannon sweep, 3 arriving flank.
    float line(float distance, float width) {
      float aa = max(.008, fwidth(distance));
      return 1. - smoothstep(width, width + aa, abs(distance));
    }
    void main() {
      vec2 pos = (coord - .5) * size;
      bool disc = mode < .5 || mode > 2.5;
      float radius = size.x * .5;
      float d = length(pos);
      vec2 inset = size * .5 - abs(pos);
      float edge = disc ? radius - d : min(inset.x, inset.y);
      if (edge < 0.) discard;
      float border = line(edge - .13, .047);
      float outline = 1. - smoothstep(.045, .105, edge);
      float detail, clockLine, charged;
      if (disc) {
        // Broken inner ring and four registration marks leave the center open.
        float axes = min(abs(pos.x), abs(pos.y));
        detail = line(edge - .24, .032) * smoothstep(.09, .26, axes)
               + line(axes, .035) * (1. - smoothstep(.28, .44, edge));
        clockLine = line(d - radius * progress, .055);
        charged = step(d, radius * progress);
        if (mode > 2.5) {
          float arrow = abs(pos.x) * .65 + pos.y;
          detail = max(detail, line(abs(arrow) - .26, .055) * (1. - smoothstep(.40, .53, abs(pos.x))));
        } else {
          detail = max(detail, line(axes, .035) * (1. - smoothstep(.22, .38, d)));
        }
      } else {
        float along = (1. - coord.y) * size.y;
        float stripes = sin((pos.x + pos.y) * 5.);
        detail = smoothstep(-.15, .2, stripes) * (1. - smoothstep(.14, .32, edge));
        clockLine = line(along - size.y * progress, .12);
        charged = step(along, size.y * progress);
        if (mode > 1.5) {
          float chevron = abs(fract((along + abs(pos.x) * .7) / 3.) - .5) * 3.;
          detail = max(detail, line(chevron, .055) * (1. - smoothstep(.55, .76, abs(pos.x))) * .75);
        }
      }
      float ink = clamp(max(border, detail), 0., 1.);
      vec3 base = mode > 2.5 ? vec3(.39,.07,.48) : vec3(.65,.045,.052);
      vec3 trim = mode > 2.5 ? vec3(1.,.65,1.) : vec3(1.,.65,.26);
      vec3 color = mix(mix(base, trim, ink), vec3(1.,.94,.74), clockLine);
      color = mix(color, vec3(.13,.019,.035), outline * .90);
      float alpha = .18 + .14 * charged + .61 * ink + .60 * clockLine + .48 * outline;
      gl_FragColor = vec4(color, min(.95, alpha));
      #include <colorspace_fragment>
    }`,
});
quad.userData.shared = material.userData.shared = true;

function setWarningUniforms() {
  material.uniforms.size.value.set(this.scale.x, this.scale.y);
  material.uniforms.progress.value = this.userData.progress;
  material.uniforms.mode.value = this.userData.mode;
  material.uniformsNeedUpdate = true;
}

export function attackMarker(shape, x, z, width, length, cannon) {
  const disc = shape !== 'band';
  const mesh = new THREE.Mesh(quad, material);
  mesh.name = cannon ? 'cannon-sweep' : shape + '-warning';
  mesh.userData.mode = cannon ? 2 : shape === 'flank' ? 3 : disc ? 0 : 1;
  mesh.userData.progress = 0;
  mesh.onBeforeRender = setWarningUniforms;
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, .115, z);
  mesh.scale.set(disc ? width * 2 : width, disc ? width * 2 : length, 1);
  mesh.renderOrder = 1;
  return mesh;
}

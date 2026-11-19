import { ShaderChunk } from 'three';

// Keep comparison sampling and soft edges on touch GPUs. A fixed rotated
// square avoids evaluating a jitter angle and its trigonometry for each pixel.
export function useCompactShadowFilter() {
  ShaderChunk.shadowmap_pars_fragment = ShaderChunk.shadowmap_pars_fragment.replace(
    /float phi = interleavedGradientNoise\( gl_FragCoord\.xy \) \* PI2;\s*shadow = \([\s\S]*?\) \* 0\.2;/,
    `vec2 a = radius * vec2(0.73, 0.31);
    vec2 b = radius * vec2(-0.31, 0.73);
    shadow = (
      texture(shadowMap, vec3(shadowCoord.xy + a, shadowCoord.z)) +
      texture(shadowMap, vec3(shadowCoord.xy - a, shadowCoord.z)) +
      texture(shadowMap, vec3(shadowCoord.xy + b, shadowCoord.z)) +
      texture(shadowMap, vec3(shadowCoord.xy - b, shadowCoord.z))
    ) * 0.25;`,
  );
}

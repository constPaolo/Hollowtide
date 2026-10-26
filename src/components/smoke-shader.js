// A hollow ball of smoke, seen by a camera that slowly circles it. The smoke
// lives in a shell between two radii, so you look through an empty middle
// into the far side. It drifts upwards and curls on itself; light comes from
// above and is dimmed by the smoke in front of each point.

export const SMOKE_VERTEX = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

export const SMOKE_FRAGMENT = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_look;
uniform sampler2D u_noise;
uniform vec3 u_background;
uniform vec3 u_tint;

// 3D value noise from a 2D texture: two layers (z and z + 1) live in the
// red and green channels, offset by (37, 17) texels.
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  vec2 uv = (i.xy + vec2(37.0, 17.0) * i.z) + f.xy;
  vec2 rg = texture2D(u_noise, (uv + 0.5) / 256.0).yx;
  return mix(rg.x, rg.y, f.z);
}

float density(vec3 p, float t) {
  float r = length(p);
  float shell = smoothstep(0.3, 0.5, r) * (1.0 - smoothstep(0.7, 1.0, r));
  if (shell <= 0.0) return 0.0;
  vec3 q = p * 3.2 - vec3(0.0, t * 0.45, 0.0);
  float w = noise(q * 0.6 - vec3(0.0, t * 0.25, 0.0));
  q += 1.4 * vec3(cos(w * 6.2832), w * 2.0, sin(w * 6.2832));
  float d = noise(q) * 0.62 + noise(q * 2.03) * 0.26 + noise(q * 4.1) * 0.12;
  return smoothstep(0.42, 0.82, d) * shell;
}

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / u_resolution.y;
  float t = u_time;

  float theta = 0.12 * t + u_look.x;
  float phi = 1.37 + u_look.y;
  vec3 eye = 2.5 * vec3(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta));
  vec3 fw = normalize(-eye);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 dir = normalize(fw + 0.5774 * (uv.x * rt + uv.y * up));

  // Where the ray crosses the unit sphere.
  float b = dot(eye, dir);
  float c = dot(eye, eye) - 1.0;
  float h = b * b - c;
  vec3 col = vec3(0.0);
  float alpha = 0.0;

  if (h > 0.0) {
    h = sqrt(h);
    float t0 = max(-b - h, 0.0);
    float t1 = -b + h;
    float stepLen = (t1 - t0) / float(STEPS);
    float s = t0 + stepLen * hash(gl_FragCoord.xy);
    vec3 light = normalize(vec3(cos(theta + 0.47), 2.2, sin(theta + 0.47)));

    for (int i = 0; i < STEPS; i++) {
      vec3 p = eye + dir * s;
      float d = density(p, t);
      if (d > 0.001) {
        float lit = exp(-density(p + light * 0.12, t) * 5.0);
        float a = clamp(d * 9.0 * stepLen, 0.0, 1.0);
        vec3 shade = u_tint * mix(0.18, 1.0, lit) * (0.75 + 0.35 * d);
        col += (1.0 - alpha) * a * shade;
        alpha += (1.0 - alpha) * a;
        if (alpha > 0.98) break;
      }
      s += stepLen;
    }
  }

  gl_FragColor = vec4(col + (1.0 - alpha) * u_background, 1.0);
}
`;

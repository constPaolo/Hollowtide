// Hero aurora: silk-like ribbons of green light drifting across the screen.
// Paolo's shader, kept as he wrote it; the renderer lives in Aurora.jsx.
export const AURORA_SHADER = `
  precision highp float;

  uniform vec2 u_resolution;
  uniform float u_time;

  void main() {
    // slow silky drift
    float t = u_time * 0.3;

    // Bias the bright core toward the upper-center of the viewport, as a
    // fraction of height so it sits in the same place on every screen.
    float yBias = 0.22;
    vec2 shifted = vec2(
      gl_FragCoord.x,
      gl_FragCoord.y - yBias * u_resolution.y
    );
    vec2 p = (2.0 * shifted - u_resolution) / u_resolution.y;

    // pre-fold the space a little so the ribbons read as draped silk
    // rather than pure sine waves
    vec2 w = p;
    w.x += 0.35 * sin(w.y * 1.7 + t * 0.4);
    w.y += 0.25 * sin(w.x * 1.3 - t * 0.3);

    vec3 col = vec3(0.0);

    // four stacked ribbons, each with its own undulation, speed and phase
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float phase = fi * 1.9;

      // undulating centerline: two incommensurate sines so the motion
      // never visibly repeats
      float yc = 0.30 * sin(w.x * (1.1 + 0.23 * fi) + t * (0.5 + 0.13 * fi) + phase)
               + 0.16 * sin(w.x * (2.3 - 0.3 * fi) - t * (0.7 - 0.1 * fi) + phase * 2.7);
      float d = w.y - yc - (fi - 1.5) * 0.34;

      // wide soft body with a tighter bright crest
      float body = exp(-d * d * 9.0);
      float crest = exp(-d * d * 60.0);

      // vertical curtain shimmer sweeping along the ribbon
      float curtain = 0.65 + 0.35 * sin(w.x * 9.0 + t * (1.2 + 0.3 * fi) + phase);

      float glow = (body * 0.55 + crest * 0.75) * curtain;

      // teal in the body, lifting to bright green at the crest
      col += glow * mix(vec3(0.03, 0.30, 0.24), vec3(0.13, 0.80, 0.42), crest);
    }

    // ribbons glow strongest near the upper-center core, fading outward
    float core = exp(-dot(p, p) * 0.5);
    col *= 0.4 + 1.0 * core;

    // soft rolloff where overlapping ribbons stack up, instead of a hard clip
    col = 1.0 - exp(-col * 1.5);
    col = pow(max(col, 0.0), vec3(0.85));

    // hazy desaturation, same treatment as the rest of the site
    float gray = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(gray), col, 0.35);

    // Soft atmospheric wash so brightness fades smoothly across the whole
    // screen. Diagonal-normalized so it fills the corners on any ratio, with
    // a faint floor so even the far edges never go pure black. Centered on
    // the same upper-center point as the ribbon core (yBias).
    float diag = length(u_resolution);
    vec2 hq = (gl_FragCoord.xy - vec2(0.5, 0.5 + yBias) * u_resolution) / diag;
    float haze = exp(-dot(hq, hq) * 1.8);
    col += vec3(0.02, 0.055, 0.04) + vec3(0.03, 0.08, 0.055) * haze;

    gl_FragColor = vec4(col, 1.0);
  }
`;

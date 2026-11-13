import { useEffect, useRef } from "react";
import { getRiso, subscribeRiso } from "../lib/riso";

// The clouds are soft, so they're drawn at half size and stretched by the browser.
const RESOLUTION = 0.5;
// Halftone dots are crisp, so with the riso look on the canvas is drawn at the
// screen's own pixel density, up to this.
const RISO_RESOLUTION = 2;
// How fast the clouds drift and churn. 1 is a gentle but visible drift.
const SPEED = 2;

const VERTEX = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

// White haze over a transparent canvas. The clouds fill the canvas from uTop
// (a fraction of its height) down: clear along their top edge, solid white along
// the bottom. Normally the canvas starts below the tagline and uTop is 0. With
// the riso look on, it covers the whole hero and the haze is printed as a
// halftone screen: blue dots that shrink to nothing as the sky turns white.
const FRAGMENT = `
precision highp float;
uniform vec2 uSize;
uniform float uTime;
uniform float uTop;
uniform float uPx; // canvas pixels per CSS pixel
uniform float uHalftone;
uniform float uCell;
uniform float uAngle;
uniform float uSoft;
uniform float uDensity;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * noise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + 17.0;
    amp *= 0.5;
  }
  return sum / 0.9375;
}

void main() {
  // v runs from 0 at the top of the clouds to 1 at the bottom of the canvas.
  float span = 1.0 - uTop;
  float v = (1.0 - gl_FragCoord.y / uSize.y - uTop) / span;
  float alpha = 0.0;
  if (v > 0.0) {
    // Sized by the clouds' height, so they keep their shape at any width.
    vec2 p = vec2(gl_FragCoord.x / (uSize.y * span), v);
    float t = uTime * 0.07;

    // Wide, flat billows that drift sideways while slowly changing shape.
    vec2 q = p * vec2(0.42, 0.95) + vec2(t * 0.6, 0.0);
    vec2 warp = vec2(fbm(q + vec2(0.0, t * 0.5)), fbm(q + vec2(5.2, 1.3) - vec2(0.0, t * 0.4)));
    float billow = fbm(q + 1.6 * warp + vec2(-t * 0.3, t * 0.2));
    // A finer layer drifting the other way gives the top edge some life.
    float wisp = fbm(p * vec2(1.0, 2.1) + vec2(-t * 1.1, t * 0.3) + warp);
    float n = mix(billow, wisp, 0.3) - 0.5;

    // The noise lifts and lowers the cloud top, and fades out toward the bottom,
    // where the canvas has to end up solid white.
    float density = v * 1.2 + n * 1.5 * (1.0 - v);
    alpha = smoothstep(0.08, 1.0, density);
    // A little grain hides banding in the long, soft fade.
    alpha += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0;
    // Nothing at the very top, so the clouds' edge never shows.
    alpha *= smoothstep(0.0, 0.22, v);
    alpha = clamp(max(alpha, smoothstep(0.82, 0.98, v)), 0.0, 1.0);
  }

  if (uHalftone > 0.0) {
    // How much blue ink this spot gets. Each cell of the rotated grid holds one
    // ink dot, sized so that full ink closes the gaps between dots completely.
    float ink = (1.0 - alpha) * uDensity;
    float s = sin(uAngle);
    float c = cos(uAngle);
    vec2 cell = mat2(c, -s, s, c) * (gl_FragCoord.xy / uPx) / uCell;
    float d = length(fract(cell) - 0.5);
    float edge = 0.75 / (uCell * uPx) + uSoft * 0.25;
    float radius = mix(-edge, 0.7071 + edge, sqrt(ink));
    float paper = smoothstep(radius - edge, radius + edge, d);
    alpha = mix(alpha, paper, uHalftone);
  }
  gl_FragColor = vec4(alpha); // white, premultiplied
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.warn(gl.getShaderInfoLog(shader));
  return null;
}

// Builds the program and returns a function that draws one frame, or null if
// WebGL isn't available (the CSS gradient on .hero-white stays as the fallback).
function setup(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { antialias: false, depth: false, stencil: false });
  if (!gl) return null;
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  // One triangle that covers the whole canvas.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const size = uniform("uSize");
  const time = uniform("uTime");
  const top = uniform("uTop");
  const px = uniform("uPx");
  const halftone = uniform("uHalftone");
  const cell = uniform("uCell");
  const angle = uniform("uAngle");
  const soft = uniform("uSoft");
  const density = uniform("uDensity");
  // `cloudTop` is where the clouds start, as a fraction of the canvas height.
  return (seconds: number, cloudTop: number) => {
    const riso = getRiso();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(size, canvas.width, canvas.height);
    gl.uniform1f(time, seconds);
    gl.uniform1f(top, cloudTop);
    gl.uniform1f(px, canvas.width / Math.max(1, canvas.clientWidth));
    gl.uniform1f(halftone, riso.enabled ? riso.halftone : 0);
    gl.uniform1f(cell, riso.cell);
    gl.uniform1f(angle, (riso.angle * Math.PI) / 180);
    gl.uniform1f(soft, riso.softness);
    gl.uniform1f(density, riso.density);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
}

export function Clouds() {
  const layerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const canvas = canvasRef.current;
    const topMark = topRef.current;
    if (!layer || !canvas || !topMark) return;

    let draw = setup(canvas);
    if (!draw) return;
    layer.dataset.shader = "";

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Start partway in, so the first frame is already well mixed.
    let seconds = 40;
    let last = 0;
    let raf = 0;
    let visible = false;
    let cloudTop = 0;

    const frame = (now: number) => {
      // Long gaps (a hidden tab) shouldn't make the clouds jump.
      if (last) seconds += Math.min((now - last) / 1000, 0.1) * SPEED;
      last = now;
      draw?.(seconds, cloudTop);
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (raf || reduced || !visible || !draw) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    // Also runs when the riso settings change, since they move and resize the canvas.
    const resize = () => {
      const resolution = getRiso().enabled ? Math.min(devicePixelRatio, RISO_RESOLUTION) : RESOLUTION;
      const width = Math.max(1, Math.round(canvas.clientWidth * resolution));
      const height = Math.max(1, Math.round(canvas.clientHeight * resolution));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      cloudTop = Math.max(0, (topMark.offsetTop - canvas.offsetTop) / Math.max(1, canvas.clientHeight));
      // Resizing clears the canvas, so redraw now rather than a frame late.
      draw?.(seconds, cloudTop);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const unsubscribe = subscribeRiso(resize);

    // Only animate while the hero is on screen.
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    visibility.observe(layer);

    // If the browser drops the WebGL context, show the gradient until it's back.
    const onLost = (e: Event) => {
      e.preventDefault();
      stop();
      draw = null;
      delete layer.dataset.shader;
    };
    const onRestored = () => {
      draw = setup(canvas);
      if (!draw) return;
      layer.dataset.shader = "";
      draw(seconds, cloudTop);
      start();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    return () => {
      stop();
      unsubscribe();
      resizeObserver.disconnect();
      visibility.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      delete layer.dataset.shader;
    };
  }, []);

  return (
    <div className="hero-white" ref={layerRef} aria-hidden="true">
      <div className="hero-clouds-top" ref={topRef} />
      <canvas className="hero-clouds" ref={canvasRef} />
    </div>
  );
}

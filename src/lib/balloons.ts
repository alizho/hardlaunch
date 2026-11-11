// Small purpose-built physics for the hero logos. All values are in design
// units (1 unit = 1px on the 1728-wide Figma frame), so the feel is the same
// at every viewport size.

export type Body = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  w: number;
  h: number;
  rot: number;
  phase: number;
  rest: number; // height this balloon settles at if nothing is above it
  scale?: number; // a little depth while orbiting; 1 otherwise
  el: HTMLElement;
  launch?: { fromX: number; fromY: number; fromRot: number; x: number; y: number; start: number; duration: number }; // intro: floating to this spot
};

type Orbit = {
  start: number;
  plans: Map<Body, OrbitPlan>;
};

// Each balloon spirals in on its own: its angle round the content only ever
// moves forward (clockwise) while it eases in or out to its layer, so it
// meets the ring travelling along it, already orbiting.
type OrbitPlan = {
  fromAngle: number; // where it was round the content, in the oval's own terms
  fromF: number; // how far out it was (1 = on the oval)
  advance: number; // how far forward it moves on top of the steady lap, to reach its place
  duration: number; // seconds to get there
  f: number; // its settled distance out, by layer
  along: number; // its settled offset ahead or behind, in radians
  depth: number; // its settled scale, for depth
};

export type Rect = { x: number; y: number; w: number; h: number; r: number };

const DRAG = 1.25;
// Near the top a balloon rises on GENTLE_LIFT alone. Further down, lift grows by
// about DEPTH_LIFT per unit, phasing in over the first SETTLE_BAND units.
const GENTLE_LIFT = 25;
const DEPTH_LIFT = 1.2;
const SETTLE_BAND = 150;
// Inside the top margin, a balloon touching one above it stops pushing and leans on it.
const TOP_MARGIN = 300;
const CONTACT_GAP = 4;
const CONTACT_ANGLE = 0.35; // how far above (0 = level, 1 = directly overhead) counts as "above"
const REST_RETURN = 3; // how gently a balloon pushed above its resting height sinks back
const WANDER = 13;
const MAX_SPEED = 2400;
const PUSH_FORCE = 5600;
const PUSH_REACH = 44;
const GRAB_STIFFNESS = 320;
const GRAB_DAMPING = 34;
const BALLOON_BOUNCE = 0.5;
const WALL_BOUNCE = 0.5;
const CEILING_BOUNCE = 0.25;
const SUBSTEPS = 3;
// The intro float: released from rest, climbing steadily, slowing as it reaches the top.
const liftCurve = (t: number) => 1 - (1 - t * t) ** 2.2;
const SWAY_CYCLES = 1.25; // side-to-side swings over the whole float
const SWAY_REACH = 0.24; // how far a balloon swings, relative to its radius
const DURATION_SPREAD = 0.05; // balloons take up to this fraction longer or shorter
const REST_GAP = 6; // space between balloons when they settle at the top
// Orbit: balloons circle the page content clockwise in a loose, layered halo.
//
// Every balloon starts moving the moment the logo is clicked, sweeping
// clockwise round the content from wherever it is and spiralling in to its
// place, so it joins the ring travelling along it, never backing up. Balloons
// keep their order round the content; the ones furthest ahead (the rightmost,
// from the top) sweep furthest to open the ring out evenly.
//
// Speed comes from two parts that both only ever ease off, never jump: the
// whole ring spins fast at the click and slows over its first lap or two to
// the settled pace, and on top of that each balloon's own sweep to its place
// starts at its quickest and trails away to nothing as it arrives. So the
// momentum of the entry carries straight into the spin.
const ORBIT_PERIOD = 36; // seconds per lap once settled
const ORBIT_START_PERIOD = 9; // seconds per lap at its fastest, just after the ease-in
const ORBIT_SPIN_DECAY = 8; // seconds for the extra spin to fall by about two thirds
const ORBIT_ENTRY_RATE = 1.25; // radians a second a balloon's own sweep starts at, at most
const ORBIT_ENTRY_MIN = 1.8; // seconds, the shortest sweep
const ORBIT_WIND_UP = 1.4; // seconds to ease in from still to full speed at the click
const ORBIT_MIN_ADVANCE = 0.5; // radians every balloon sweeps forward at least, so none sits still
const ORBIT_GAP_JITTER = 0.25; // each gap in the ring is up to this fraction longer or shorter
const ORBIT_SPREAD_EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1]; // in or out to its layer
// Following its spot: looser while coming in, so it only roughly traces the
// path, firmer once it's riding the ring.
const ORBIT_APPROACH_STIFFNESS = 3;
const ORBIT_APPROACH_DAMPING = 3.2;
const ORBIT_FOLLOW_TURN = 0.9; // how closely it matches its spot's turning (1 = exactly)
// A halo band rather than a single-file loop: each balloon rides one of a few
// layers at different distances from the content (1 = on the oval), with no
// two neighbours on the same layer. Inner layers sit a touch smaller and outer
// ones a touch larger, for depth.
const ORBIT_LAYERS = [0.88, 1.02, 1.17];
const ORBIT_LAYER_DEPTH = [0.93, 1, 1.07]; // scale per layer
const ORBIT_SCATTER = 0.04; // in or out within its layer
const ORBIT_SCATTER_ALONG = 0.12; // radians, ahead or behind its place in the flow
const ORBIT_DRIFT = 0.035; // slow drift in or out
const ORBIT_DRIFT_ALONG = 0.06; // radians, slow drift ahead or behind
const ORBIT_DEPTH = 0.03; // scale, up or down within its layer
const ORBIT_SEPARATE = 0.06; // share of an overlap undone per substep while orbiting
const ORBIT_PUSH = 0.7; // how much the cursor shoves an orbiting balloon, relative to a floating one
// Following its spot: a soft spring that also matches the spot's speed.
const ORBIT_STIFFNESS = 5;
const ORBIT_DAMPING = 4.2;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// A CSS-style cubic-bezier as a function of progress, solved for x by Newton's method.
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  const slope = (a: number, b: number, t: number) =>
    3 * a * (1 - t) ** 2 + 6 * (b - a) * t * (1 - t) + 3 * (1 - b) * t * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = slope(x1, x2, t);
      if (Math.abs(d) < 1e-6) break;
      t = clamp(t - (at(x1, x2, t) - x) / d, 0, 1);
    }
    return at(y1, y2, t);
  };
}

const spreadEase = cubicBezier(...ORBIT_SPREAD_EASE);

// A smooth minimum, so a limit eases in instead of being hit like a wall.
const softMin = (a: number, b: number, k = 0.08) => -k * Math.log(Math.exp(-a / k) + Math.exp(-b / k));

// A balloon's own sweep: quickest at the start, trailing off smoothly to a
// standstill (speed and slowing both reach zero together, so no jolt).
const trailOff = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - (1 - x) ** 3);

// Time as the motion feels it: starting still and easing in to the clock's
// pace over ORBIT_WIND_UP (speed follows a smoothstep, so it gathers gently
// from rest with no kick at the click), then running level with it.
function windUp(t: number) {
  const w = ORBIT_WIND_UP;
  if (t <= 0) return 0;
  if (t >= w) return t - w / 2;
  const x = t / w;
  return w * (x ** 3 - x ** 4 / 2);
}

// How far the whole ring has turned at `t` seconds: the settled pace plus an
// extra spin that starts at ORBIT_START_PERIOD's pace and dies away.
function spin(t: number) {
  const settled = (2 * Math.PI) / ORBIT_PERIOD;
  const extra = (2 * Math.PI) / ORBIT_START_PERIOD - settled;
  return settled * t + extra * ORBIT_SPIN_DECAY * (1 - Math.exp(-t / ORBIT_SPIN_DECAY));
}

export class BalloonWorld {
  bodies: Body[] = [];
  width = 1728;
  height = 1117;
  logo: Rect = { x: 732, y: 96, w: 264, h: 112, r: 34 };
  unit = 1;

  pointer = { x: 0, y: 0, vx: 0, vy: 0, inside: false };
  grabbed: Body | null = null;
  grabOffset = { x: 0, y: 0 };
  time = 0;
  // What the balloons circle: the logo, buttons, and tagline together. Set by the page.
  content = { x: 732, y: 96, w: 264, h: 340 };
  // Space between that content and the oval, each side.
  orbitPadding = { x: 220, y: 150 };
  private orbit: Orbit | null = null;

  get orbiting() {
    return this.orbit !== null;
  }

  startOrbit() {
    const { cx, cy } = this.contentCenter();
    const { rx, ry } = this.orbitRadii();
    const n = this.bodies.length;
    const TAU = 2 * Math.PI;

    const start = this.bodies.map((b) => {
      const ux = (b.x - cx) / rx;
      const uy = (b.y - cy) / ry;
      return { b, angle: Math.atan2(uy, ux), f: Math.hypot(ux, uy) };
    });

    // Order round the content, back to front: from the balloon with the most
    // clear space ahead of it, so the biggest gap becomes the ring's seam.
    const sorted = [...start].sort((a, c) => a.angle - c.angle);
    let seam = 0;
    let widest = -1;
    sorted.forEach((s, i) => {
      const next = sorted[(i + 1) % n];
      const gap = (((next.angle - s.angle) % TAU) + TAU) % TAU || TAU;
      if (gap > widest) {
        widest = gap;
        seam = (i + 1) % n;
      }
    });
    const ring = sorted.map((_, i) => sorted[(seam + i) % n]);
    // Unwrapped start angles, each just ahead of the one behind.
    const angles = [ring[0].angle];
    for (let i = 1; i < n; i++) {
      let a = ring[i].angle;
      while (a < angles[i - 1]) a += TAU;
      angles[i] = a;
    }

    // Places: slightly uneven gaps that together go once round, laid out
    // forward from the back balloon, then shifted so every balloon moves
    // forward at least a little.
    const gaps = ring.map((s) => 1 + this.jitter(s.b, 6) * ORBIT_GAP_JITTER);
    const total = gaps.reduce((a, g) => a + g, 0);
    const places = [angles[0]];
    for (let i = 1; i < n; i++) places[i] = places[i - 1] + (gaps[i - 1] / total) * TAU;
    const lift = Math.max(...places.map((p, i) => angles[i] - p + ORBIT_MIN_ADVANCE));
    const advances = places.map((p, i) => p + lift - angles[i]);

    // Layers round the ring, nudged so no two neighbours share one.
    const layers = ring.map((s) => Math.floor(((this.jitter(s.b, 2) + 1) / 2) * ORBIT_LAYERS.length) % ORBIT_LAYERS.length);
    for (let i = 1; i < n; i++) {
      const prev = layers[i - 1];
      const avoid = i === n - 1 ? [prev, layers[0]] : [prev];
      if (avoid.includes(layers[i])) layers[i] = [...ORBIT_LAYERS.keys()].find((l) => !avoid.includes(l)) ?? layers[i];
    }

    const plans = new Map<Body, OrbitPlan>();
    ring.forEach((s, i) => {
      plans.set(s.b, {
        fromAngle: angles[i],
        fromF: s.f,
        advance: advances[i],
        // Long enough that its sweep starts no faster than ORBIT_ENTRY_RATE
        // (trailOff starts at 3 x the average), so further ones take longer.
        duration: Math.max(ORBIT_ENTRY_MIN, (3 * advances[i]) / ORBIT_ENTRY_RATE),
        f: ORBIT_LAYERS[layers[i]] + this.jitter(s.b, 1) * ORBIT_SCATTER,
        along: this.jitter(s.b, 3) * ORBIT_SCATTER_ALONG,
        depth: ORBIT_LAYER_DEPTH[layers[i]] + this.jitter(s.b, 5) * ORBIT_DEPTH,
      });
      s.b.launch = undefined;
    });
    this.orbit = { start: this.time, plans };
  }

  // Lets go: every balloon goes back to floating up to its resting spot.
  stopOrbit() {
    this.orbit = null;
  }

  private contentCenter() {
    return { cx: this.content.x + this.content.w / 2, cy: this.content.y + this.content.h / 2 };
  }

  private orbitRadii() {
    return { rx: this.content.w / 2 + this.orbitPadding.x, ry: this.content.h / 2 + this.orbitPadding.y };
  }

  // A steady pseudo-random value in [-1, 1] per balloon, so each keeps its own place.
  private jitter(b: Body, salt: number) {
    const v = Math.sin(b.phase * 12.9898 + salt * 78.233) * 43758.5453;
    return (v - Math.floor(v)) * 2 - 1;
  }

  // How far through its entry a balloon is: 0 at the click, 1 once it's in place.
  private progress(plan: OrbitPlan, t: number) {
    return clamp(windUp(t) / plan.duration, 0, 1);
  }

  // How settled into its layer it is, for firming up the spring and depth.
  private spread(plan: OrbitPlan, t: number) {
    return spreadEase(this.progress(plan, t));
  }

  private circle(b: Body, dt: number) {
    // Its spot now and a moment either side, for the spot's speed and how
    // sharply it's turning.
    const step = 1 / 60;
    const [px0, py0] = this.orbitPoint(b, this.time - step);
    const [tx, ty] = this.orbitPoint(b, this.time);
    const [nx, ny] = this.orbitPoint(b, this.time + step);
    const tvx = (nx - px0) / (2 * step);
    const tvy = (ny - py0) / (2 * step);
    const tax = (nx - 2 * tx + px0) / (step * step);
    const tay = (ny - 2 * ty + py0) / (step * step);
    // Loose on the way in, firming up as it settles into the ring.
    const plan = this.orbit!.plans.get(b)!;
    const firm = this.spread(plan, this.time - this.orbit!.start);
    const k = ORBIT_APPROACH_STIFFNESS + (ORBIT_STIFFNESS - ORBIT_APPROACH_STIFFNESS) * firm;
    const c = ORBIT_APPROACH_DAMPING + (ORBIT_DAMPING - ORBIT_APPROACH_DAMPING) * firm;
    // Matching the spot's turning as well as its speed keeps a fast balloon
    // on its curve instead of swinging wide and whipping back.
    const turn = ORBIT_FOLLOW_TURN;
    // The cursor can still shove it; the spring then eases it back into place.
    const [px, py] = this.pointerPush(b);
    b.vx += ((tx - b.x) * k + (tvx - b.vx) * c + tax * turn + px * ORBIT_PUSH) * dt;
    b.vy += ((ty - b.y) * k + (tvy - b.vy) * c + tay * turn + py * ORBIT_PUSH) * dt;
  }


  // A balloon's spot at a given time: its angle sweeps forward from where it
  // was (the ring's spin plus its own trailing-off sweep) while it
  // eases in or out to its layer, so it spirals onto the ring moving along it.
  // Kept on screen however small the window is.
  private orbitPoint(b: Body, time: number): [number, number] {
    const plan = this.orbit!.plans.get(b)!;
    const t = time - this.orbit!.start;
    const e = this.spread(plan, t);
    const drift = Math.sin(time * 0.27 + b.phase * 2) * ORBIT_DRIFT_ALONG;
    const angle = plan.fromAngle + spin(windUp(t)) + plan.advance * trailOff(this.progress(plan, t)) + (plan.along + drift) * e;
    const settledF = plan.f + Math.sin(time * 0.35 + b.phase * 3) * ORBIT_DRIFT;
    // In or out faster than it sweeps round, so a balloon starting far out
    // is drawn in early rather than swinging wide.
    const p = this.progress(plan, t);
    const pull = 1 - (1 - p) ** 3;
    const { cx, cy } = this.contentCenter();
    const { rx, ry } = this.orbitRadii();
    // Softly kept inside the screen, so it never runs along an edge.
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const roomX = (cos >= 0 ? this.width - b.r - cx : cx - b.r) / (rx * Math.abs(cos) || 1e-6);
    const roomY = (sin >= 0 ? this.height - b.r - cy : cy - b.r) / (ry * Math.abs(sin) || 1e-6);
    const f = softMin(plan.fromF + (settledF - plan.fromF) * pull, Math.min(roomX, roomY) * 0.96);
    const x = cx + Math.cos(angle) * rx * f;
    const y = cy + Math.sin(angle) * ry * f;
    return [clamp(x, b.r, this.width - b.r), clamp(y, b.r, this.height - b.r)];
  }

  // On its way into the orbit: it passes through others rather than knocking them.
  private travelling(b: Body) {
    const plan = this.orbit?.plans.get(b);
    if (!plan || b === this.grabbed) return false;
    return this.progress(plan, this.time - this.orbit!.start) < 0.85;
  }

  // The scale a balloon is easing toward: its depth once it has spread into its layer, 1 otherwise.
  private depthGoal(b: Body) {
    const plan = this.orbit?.plans.get(b);
    if (!plan) return 1;
    return 1 + (plan.depth - 1) * this.spread(plan, this.time - this.orbit!.start);
  }

  add(body: Body) {
    this.bodies.push(body);
  }

  // Where each balloon stops if it floats straight up. The highest claim the top
  // first, and any that would overlap settle just beneath.
  settleStraightUp() {
    const spots = new Map<Body, { x: number; y: number }>();
    for (const b of [...this.bodies].sort((a, c) => a.y - c.y)) {
      const x = clamp(b.x, b.r, this.width - b.r);
      let y = b.rest;
      const blocked = () =>
        [...spots].some(([other, spot]) => Math.hypot(spot.x - x, spot.y - y) < other.r + b.r + REST_GAP);
      while (blocked()) y += 4;
      spots.set(b, { x, y });
      b.rest = y;
    }
    return spots;
  }

  launch(body: Body, x: number, y: number, duration: number) {
    const spread = 1 + Math.sin(body.phase * 5) * DURATION_SPREAD;
    body.launch = { fromX: body.x, fromY: body.y, fromRot: body.rot, x, y, start: this.time, duration: duration * spread };
  }


  movePointer(x: number, y: number, dt: number, inside: boolean) {
    const p = this.pointer;
    if (p.inside && dt > 0) {
      const blend = 0.45;
      p.vx += ((x - p.x) / dt - p.vx) * blend;
      p.vy += ((y - p.y) / dt - p.vy) * blend;
    }
    p.x = x;
    p.y = y;
    p.inside = inside;
  }

  grab(body: Body) {
    body.launch = undefined;
    this.grabbed = body;
    this.grabOffset = { x: body.x - this.pointer.x, y: body.y - this.pointer.y };
  }

  release() {
    this.grabbed = null;
  }

  step(frameDt: number) {
    // Two frames can carry the same timestamp, or one earlier than the last
    // (Safari rounds them to the millisecond). A step of no length would have
    // `rise` divide by zero and turn every position into NaN, which the browser
    // rejects as a transform, leaving the balloons stuck where they are for good.
    if (!(frameDt > 0)) return;
    const dt = Math.min(frameDt, 1 / 30) / SUBSTEPS;
    for (let i = 0; i < SUBSTEPS; i++) this.substep(dt);
    const decay = Math.exp(-Math.min(frameDt, 1 / 30) * 10);
    this.pointer.vx *= decay;
    this.pointer.vy *= decay;
    this.tilt(Math.min(frameDt, 1 / 30));
  }

  render() {
    for (const b of this.bodies) {
      const x = (b.x - b.w / 2) * this.unit;
      const y = (b.y - b.h / 2) * this.unit;
      const scale = b.scale && Math.abs(b.scale - 1) > 0.001 ? ` scale(${b.scale.toFixed(3)})` : "";
      b.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${b.rot.toFixed(2)}deg)${scale}`;
    }
  }

  private substep(dt: number) {
    this.time += dt;
    for (const b of this.bodies) {
      if (b === this.grabbed) this.followPointer(b, dt);
      else if (b.launch) this.rise(b, b.launch, dt);
      else if (this.orbit) this.circle(b, dt);
      else this.float(b, dt);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    this.collideBalloons();
    // Balloons pass behind the Hard Launch logo rather than bumping it, so
    // only the screen edges hold them in.
    for (const b of this.bodies) {
      if (b.launch) continue;
      this.collideBounds(b);
    }
  }

  // Sets the velocity that lands exactly on the curve, so tilt follows the sway
  // and the balloon hands over to `float` without a jump.
  private rise(b: Body, launch: NonNullable<Body["launch"]>, dt: number) {
    const t = Math.min(1, (this.time - launch.start) / launch.duration);
    const lift = liftCurve(t);
    // The envelope keeps the sway at zero where the float starts and ends.
    const sway = Math.sin(t * SWAY_CYCLES * 2 * Math.PI + b.phase) * Math.sin(t * Math.PI) * b.r * SWAY_REACH;
    b.vx = (launch.fromX + (launch.x - launch.fromX) * lift + sway - b.x) / dt;
    b.vy = (launch.fromY + (launch.y - launch.fromY) * lift - b.y) / dt;
    if (t >= 1) b.launch = undefined;
  }

  private isUnderBalloon(b: Body) {
    return this.bodies.some((other) => {
      if (other === b) return false;
      const dy = b.y - other.y;
      const distance = Math.hypot(b.x - other.x, dy);
      return distance < b.r + other.r + CONTACT_GAP && dy > distance * CONTACT_ANGLE;
    });
  }

  private float(b: Body, dt: number) {
    const t = this.time;
    let ax = Math.sin(t * 0.37 + b.phase) * WANDER;
    const depth = Math.max(0, b.y - b.rest);
    const rising = GENTLE_LIFT + (DEPTH_LIFT * depth * depth) / (depth + SETTLE_BAND);
    const leaning = depth < TOP_MARGIN && this.isUnderBalloon(b);
    const lift = leaning ? 0 : rising;
    let ay = -lift + Math.sin(t * 0.9 + b.phase * 2) * 11;
    if (b.y < b.rest) ay += (b.rest - b.y) * REST_RETURN;

    const [px, py] = this.pointerPush(b);
    ax += px;
    ay += py;

    b.vx += (ax - b.vx * DRAG) * dt;
    b.vy += (ay - b.vy * DRAG) * dt;
    const v = Math.hypot(b.vx, b.vy);
    if (v > MAX_SPEED) {
      b.vx *= MAX_SPEED / v;
      b.vy *= MAX_SPEED / v;
    }
  }

  // A quick cursor pass shoves a balloon it brushes, along the cursor's path.
  private pointerPush(b: Body): [number, number] {
    const p = this.pointer;
    const speed = Math.hypot(p.vx, p.vy);
    if (!p.inside || this.grabbed || speed <= 30) return [0, 0];
    const dx = b.x - p.x;
    const dy = b.y - p.y;
    const d = Math.hypot(dx, dy) || 0.001;
    const reach = b.r + PUSH_REACH;
    if (d >= reach) return [0, 0];
    const closeness = 1 - d / reach;
    const strength = Math.min(speed / 1000, 1) * PUSH_FORCE * closeness;
    const dirX = (dx / d) * 0.6 + (p.vx / speed) * 0.4;
    const dirY = (dy / d) * 0.6 + (p.vy / speed) * 0.4;
    return [dirX * strength, dirY * strength];
  }

  private followPointer(b: Body, dt: number) {
    const tx = this.pointer.x + this.grabOffset.x;
    const ty = this.pointer.y + this.grabOffset.y;
    b.vx += ((tx - b.x) * GRAB_STIFFNESS - b.vx * GRAB_DAMPING) * dt;
    b.vy += ((ty - b.y) * GRAB_STIFFNESS - b.vy * GRAB_DAMPING) * dt;
  }

  private collideBalloons() {
    const list = this.bodies;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        // Rising balloons pass each other, so the formation holds its shape,
        // and so do balloons on their way into the orbit.
        if (a.launch || b.launch || this.travelling(a) || this.travelling(b)) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = a.r + b.r;
        const distSq = dx * dx + dy * dy;
        if (distSq >= min * min) continue;
        const d = Math.sqrt(distSq) || 0.001;
        const nx = dx / d;
        const ny = dy / d;
        const invA = a === this.grabbed ? 0 : 1;
        const invB = b === this.grabbed ? 0 : 1;
        const total = invA + invB;
        if (total === 0) continue;
        // While orbiting, overlapping balloons ease apart instead of bouncing,
        // so one settling into the ring never knocks its neighbour backward.
        const gentle = this.orbit !== null && a !== this.grabbed && b !== this.grabbed;
        const overlap = (min - d) * (gentle ? ORBIT_SEPARATE : 1);
        a.x -= nx * overlap * (invA / total);
        a.y -= ny * overlap * (invA / total);
        b.x += nx * overlap * (invB / total);
        b.y += ny * overlap * (invB / total);
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn < 0 && !gentle) {
          const impulse = (-(1 + BALLOON_BOUNCE) * vn) / total;
          a.vx -= impulse * invA * nx;
          a.vy -= impulse * invA * ny;
          b.vx += impulse * invB * nx;
          b.vy += impulse * invB * ny;
        }
      }
    }
  }

  private collideBounds(b: Body) {
    if (b.x < b.r) {
      b.x = b.r;
      if (b.vx < 0) b.vx *= -WALL_BOUNCE;
    } else if (b.x > this.width - b.r) {
      b.x = this.width - b.r;
      if (b.vx > 0) b.vx *= -WALL_BOUNCE;
    }
    if (b.y < b.r) {
      b.y = b.r;
      if (b.vy < 0) b.vy *= -CEILING_BOUNCE;
    } else if (b.y > this.height - b.r) {
      b.y = this.height - b.r;
      if (b.vy > 0) b.vy *= -WALL_BOUNCE;
    }
  }

  private tilt(dt: number) {
    for (const b of this.bodies) {
      const sway = Math.sin(this.time * 0.8 + b.phase) * 2.5;
      const target = clamp(b.vx * 0.03, -20, 20) + sway;
      if (b.launch) {
        // Unwinds along the float's own curve, so the starting tilt never snaps.
        const t = Math.min(1, (this.time - b.launch.start) / b.launch.duration);
        b.rot = b.launch.fromRot + (target - b.launch.fromRot) * liftCurve(t);
      } else {
        b.rot += (target - b.rot) * (1 - Math.exp(-dt * 5));
      }
      const scale = b.scale ?? 1;
      b.scale = scale + (this.depthGoal(b) - scale) * (1 - Math.exp(-dt * 3));
    }
  }
}

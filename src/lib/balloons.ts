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
  el: HTMLElement;
  launch?: { fromX: number; fromY: number; fromRot: number; x: number; y: number; start: number; duration: number }; // intro: floating to this spot
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
const LOGO_CLEAR_LIFT = 62; // keeps a balloon pressed under the logo so it can slide out
const WANDER = 13;
const MAX_SPEED = 2400;
const PUSH_FORCE = 5600;
const PUSH_REACH = 44;
const GRAB_STIFFNESS = 320;
const GRAB_DAMPING = 34;
const LOGO_BOUNCE = 0.94;
const LOGO_MIN_REBOUND = 80;
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

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

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
      b.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${b.rot.toFixed(2)}deg)`;
    }
  }

  private substep(dt: number) {
    this.time += dt;
    for (const b of this.bodies) {
      if (b === this.grabbed) this.followPointer(b, dt);
      else if (b.launch) this.rise(b, b.launch, dt);
      else this.float(b, dt);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    this.collideBalloons();
    for (const b of this.bodies) {
      // A floating balloon ignores everything, so it can pass behind the logo.
      if (b.launch) continue;
      this.collideLogo(b);
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
    // Under the logo the ceiling is its underside, so balloons ease up to it instead of slamming in.
    const logo = this.logo;
    const underLogo = b.x > logo.x - b.r && b.x < logo.x + logo.w + b.r && b.y > logo.y + logo.h;
    const depth = Math.max(0, b.y - (underLogo ? logo.y + logo.h + b.r : b.rest));
    const rising = GENTLE_LIFT + (DEPTH_LIFT * depth * depth) / (depth + SETTLE_BAND);
    const leaning = depth < TOP_MARGIN && this.isUnderBalloon(b);
    const lift = underLogo ? Math.max(rising, LOGO_CLEAR_LIFT) : leaning ? 0 : rising;
    let ay = -lift + Math.sin(t * 0.9 + b.phase * 2) * 11;
    if (b.y < b.rest) ay += (b.rest - b.y) * REST_RETURN;

    const p = this.pointer;
    const speed = Math.hypot(p.vx, p.vy);
    if (p.inside && !this.grabbed && speed > 30) {
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const d = Math.hypot(dx, dy) || 0.001;
      const reach = b.r + PUSH_REACH;
      if (d < reach) {
        const closeness = 1 - d / reach;
        const strength = Math.min(speed / 1000, 1) * PUSH_FORCE * closeness;
        const dirX = (dx / d) * 0.6 + (p.vx / speed) * 0.4;
        const dirY = (dy / d) * 0.6 + (p.vy / speed) * 0.4;
        ax += dirX * strength;
        ay += dirY * strength;
      }
    }

    // A balloon resting under the flat underside of the logo drifts out to the
    // nearer side so it can carry on up.
    const belowLogo = underLogo && b.y < logo.y + logo.h + b.r + 30;
    if (belowLogo) ax += b.x < logo.x + logo.w / 2 ? -46 : 46;

    b.vx += (ax - b.vx * DRAG) * dt;
    b.vy += (ay - b.vy * DRAG) * dt;
    const v = Math.hypot(b.vx, b.vy);
    if (v > MAX_SPEED) {
      b.vx *= MAX_SPEED / v;
      b.vy *= MAX_SPEED / v;
    }
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
        // Rising balloons pass each other, so the formation holds its shape.
        if (a.launch || b.launch) continue;
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
        const overlap = min - d;
        a.x -= nx * overlap * (invA / total);
        a.y -= ny * overlap * (invA / total);
        b.x += nx * overlap * (invB / total);
        b.y += ny * overlap * (invB / total);
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn < 0) {
          const impulse = (-(1 + BALLOON_BOUNCE) * vn) / total;
          a.vx -= impulse * invA * nx;
          a.vy -= impulse * invA * ny;
          b.vx += impulse * invB * nx;
          b.vy += impulse * invB * ny;
        }
      }
    }
  }

  // Circle against the rounded rectangle around the Hard Launch logo.
  private collideLogo(b: Body) {
    const { x, y, w, h, r } = this.logo;
    const cx = clamp(b.x, x + r, x + w - r);
    const cy = clamp(b.y, y + r, y + h - r);
    const dx = b.x - cx;
    const dy = b.y - cy;
    const d = Math.hypot(dx, dy);
    const min = r + b.r;
    if (d >= min) return;

    let nx: number;
    let ny: number;
    let depth: number;
    if (d > 0.001) {
      nx = dx / d;
      ny = dy / d;
      depth = min - d;
    } else {
      // Centre is inside the core of the logo: leave through the nearest edge.
      const left = b.x - x;
      const right = x + w - b.x;
      const top = b.y - y;
      const bottom = y + h - b.y;
      const edge = Math.min(left, right, top, bottom);
      nx = edge === left ? -1 : edge === right ? 1 : 0;
      ny = edge === top ? -1 : edge === bottom ? 1 : 0;
      depth = edge + b.r;
    }

    b.x += nx * depth;
    b.y += ny * depth;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      const held = b === this.grabbed;
      const rebound = held ? 0 : Math.max(-vn * LOGO_BOUNCE, Math.min(-vn * 2, LOGO_MIN_REBOUND));
      b.vx += (-vn + rebound) * nx;
      b.vy += (-vn + rebound) * ny;
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
    }
  }
}

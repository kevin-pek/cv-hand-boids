/**
 * Renders a particle at a particular point. Opacity of particle renderer fades over time
 * in order to give a trailing effect.
 */
class ParticleRenderer {
  opacity: number;
  radius: number;
  x: number;
  y: number;

  constructor(x: number, y: number, radius: number = 1, opacity: number = 0.5) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.opacity = opacity;
  }

  update(): boolean {
    // decrement the opacity of the particle
    this.opacity = Math.max(this.opacity - 0.02, 0);
    return this.opacity > 0; // return true if should still render
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = `rgba(255, 155, 50, ${this.opacity})`;
    ctx.fill();
  }
}

/**
 * Represents single fading particle to be rendered. This class only contains the logic for updating
 * the radius and opacity of the particle to be drawn, and drawing the particle itself.
 */
export class Particle {
  x: number; // Current x position
  y: number; // Current y position
  speed: number; // Current speed
  acceleration: number;
  rotation: number; // angle that particle is facing in radians
  targetX: number | null; // Target x position
  targetY: number | null; // Target y position
  maxSpeed: number; // Maximum speed
  friction: number; // Friction coefficient
  radius: number;
  renderers: ParticleRenderer[];

  constructor(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    acceleration: number = 0.5,
    maxSpeed: number = 3,
    friction: number = 0.99,
    radius: number = 3,
  ) {
    this.x = x;
    this.y = y;
    this.speed = Math.random() * 2 - 1;
    this.targetX = targetX;
    this.targetY = targetY;
    this.acceleration = acceleration;
    this.maxSpeed = maxSpeed;
    this.friction = friction;
    this.radius = radius;
    this.renderers = new Array();
    this.rotation = Math.atan2(targetX - x, targetY - y);
  }

  // Update the particle's position and velocity using steering behavior
  update(canvasWidth: number, canvasHeight: number): void {
    // Calculate the desired velocity towards the target if it exists
    if (this.targetX !== null && this.targetY !== null) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;

      // Normalize the direction vector
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Calculate the target rotation
      const targetRotation = Math.atan2(dy, dx);

      // Smoothly steer towards the target rotation
      let angleDifference = targetRotation - this.rotation;
      angleDifference = ((angleDifference + Math.PI) % (2 * Math.PI)) - Math.PI;

      // Smoothly steer towards the target rotation
      this.rotation += angleDifference * 0.05;
      // this.rotation += (targetRotation - this.rotation) * 0.05;

      // Calculate the desired velocity
      const desiredSpeed = distance * this.acceleration;

      // Apply the steering force
      this.speed += (desiredSpeed - this.speed) * this.acceleration;

      // Limit speed to prevent erratic motion
      if (this.speed > this.maxSpeed) {
        this.speed = this.maxSpeed;
      }
    }

    // Apply friction to slow down the particle over time
    this.speed *= this.friction;
    const minSpeed = 1;
    if (this.speed < minSpeed) {
      this.speed = minSpeed;
    }

    // Update position
    this.x += this.speed * Math.cos(this.rotation);
    this.y += this.speed * Math.sin(this.rotation);

    // Bounce off canvas borders
    if (this.x - this.radius < 0 || this.x + this.radius > canvasWidth) {
      this.rotation = Math.PI - this.rotation; // Reverse direction
      this.x = Math.max(this.radius, Math.min(this.x, canvasWidth - this.radius));
    }
    if (this.y - this.radius < 0 || this.y + this.radius > canvasHeight) {
      this.rotation = -this.rotation; // Reverse direction
      this.y = Math.max(this.radius, Math.min(this.y, canvasHeight - this.radius));
    }

    // in-place filtering, .filter makes copy of entire array
    for (let i = this.renderers.length - 1; i >= 0; i--)
      if (!this.renderers[i].update()) this.renderers.splice(i, 1);

    // create fresh particles at the particle's current location
    this.renderers.push(new ParticleRenderer(this.x, this.y, this.radius, 0.5));
  }

  // Draw the particle on a canvas
  draw(ctx: CanvasRenderingContext2D): void {
    if (process.env.NODE_ENV === 'development') {
      if (this.targetX !== null && this.targetY !== null) {
        ctx.strokeStyle = 'blue'
        ctx.lineWidth = 0.1
        ctx.beginPath()
        ctx.moveTo(this.x, this.y)
        ctx.lineTo(this.targetX, this.targetY);
        ctx.closePath()
        ctx.stroke()
      }
    }
    this.renderers.forEach(r => r.draw(ctx));
  }
}

/**
 * Particle generator that accelerates and hovers around the target coordinate.
 * Generates trail of particles.
 */
export class ParticleSystem {
  particles: Particle[];
  targetX: number | null;
  targetY: number | null;

  constructor(targetX: number, targetY: number, numParticles: number = 100) {
    this.targetX = targetX;
    this.targetY = targetY;
    this.particles = Array.from({ length: numParticles }, () =>
      new Particle(
        targetX + Math.random() * 20 - 10,
        targetY + Math.random() * 20 - 10,
        targetX,
        targetY
      )
    );
  }

  update(canvasWidth: number, canvasHeight: number, newTargetX?: number, newTargetY?: number): void {
    // Update and remove particles that have minimum opacity
    this.particles.forEach((particle) => {
      this.targetX = newTargetX ?? null;
      this.targetY = newTargetY ?? null;
      particle.targetX = this.targetX;
      particle.targetY = this.targetY;
      particle.update(canvasWidth, canvasHeight);
    });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.particles.forEach((particle) => particle.draw(ctx));
  }
}

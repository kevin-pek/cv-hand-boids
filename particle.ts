export class BurstParticle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  opacity: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() + 0.1;
    this.dx = Math.cos(angle) * speed;
    this.dy = Math.sin(angle) * speed;
    this.radius = 3;
    this.opacity = 0.4;
  }

  update(): boolean {
    this.x += this.dx;
    this.y += this.dy;

    // Fade and shrink quickly
    this.opacity -= 0.01; 
    this.radius -= 0.1;

    // Continue rendering as long as these remain positive
    return this.opacity > 0 && this.radius > 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = `rgba(255, 205, 155, ${this.opacity})`;
    ctx.fill();
  }
}

/**
 * Renders a particle at a particular point. Opacity of particle renderer fades over time
 * in order to give a trailing effect.
 */
class ParticleRenderer {
  opacity: number;
  radius: number;
  x: number;
  y: number;
  color: string;

  constructor(x: number, y: number, radius: number, opacity: number, color: string) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.opacity = opacity;
    this.color = color;
  }

  update(): boolean {
    // decrement the opacity of the particle
    this.opacity = Math.max(this.opacity - 0.02, 0);
    this.radius = Math.max(this.radius - 0.1, 0)
    return this.opacity > 0 && this.radius > 0; // return true if should still render
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
    ctx.fill();
  }
}

/**
 * Represents single fading particle to be rendered. This class only contains the logic for updating
 * the radius and opacity of the particle to be drawn, and drawing the particle itself.
 */
export class Particle {
  x: number;
  y: number;
  speed: number;
  acceleration: number;
  rotation: number; // angle that particle is facing in radians 0-2π
  targetX: number | null;
  targetY: number | null;
  maxSpeed: number;
  minSpeed: number;
  friction: number; // speed is multiplied by friction every update
  radius: number;
  color: string;
  renderers: ParticleRenderer[];

  constructor(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    color: string,
    acceleration: number = 0.5,
    maxSpeed: number = 2,
    minSpeed: number = 1,
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
    this.minSpeed = minSpeed;
    this.friction = friction;
    this.radius = radius;
    this.renderers = new Array();
    this.rotation = Math.atan2(targetY - y, targetX - x);
    this.color = color;
  }

  updateBoidBehavior(
    particles: Particle[],
    neighborhoodRadius: number,
    cohesionWeight: number,
    separationWeight: number,
    alignmentWeight: number
  ): void {
    const neighbors: Particle[] = particles.filter(p => {
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return p !== this && distance < neighborhoodRadius;
    });

    if (neighbors.length === 0) return;

    // Cohesion: Move towards the average position of neighbors
    let avgX = 0, avgY = 0;
    neighbors.forEach(n => {
      avgX += n.x;
      avgY += n.y;
    });
    avgX /= neighbors.length;
    avgY /= neighbors.length;

    const cohesionForceX = (avgX - this.x);
    const cohesionForceY = (avgY - this.y);

    // Separation: Avoid overcrowding neighbors
    let sepForceX = 0, sepForceY = 0;
    neighbors.forEach(n => {
      const dx = this.x - n.x;
      const dy = this.y - n.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0 && distance < neighborhoodRadius / 2) { // Only apply strong separation when very close
        sepForceX += dx / (distance * distance); // Inverse square to apply stronger force at closer distances
        sepForceY += dy / (distance * distance);
      }
    });

    // Alignment: Align with the average velocity of neighbors
    let avgVelocityX = 0, avgVelocityY = 0;
    neighbors.forEach(n => {
      avgVelocityX += Math.cos(n.rotation) * n.speed;
      avgVelocityY += Math.sin(n.rotation) * n.speed;
    });
    avgVelocityX /= neighbors.length;
    avgVelocityY /= neighbors.length;

    const alignmentForceX = (avgVelocityX - Math.cos(this.rotation) * this.speed);
    const alignmentForceY = (avgVelocityY - Math.sin(this.rotation) * this.speed);

    // Combine forces with weights
    const totalForceX =
      cohesionForceX * cohesionWeight +
      sepForceX * separationWeight +
      alignmentForceX * alignmentWeight;
    const totalForceY =
      cohesionForceY * cohesionWeight +
      sepForceY * separationWeight +
      alignmentForceY * alignmentWeight;

    // Calculate resulting rotation and speed adjustments
    const targetRotation = Math.atan2(totalForceY, totalForceX);
    const rotationDelta = targetRotation - this.rotation;

    // Normalize rotation delta to stay within -π to π
    const adjustedRotationDelta =
      ((rotationDelta + Math.PI) % (2 * Math.PI)) - Math.PI;

    this.rotation += adjustedRotationDelta * 0.02; // Smoothly adjust rotation

    const forceMagnitude = Math.sqrt(totalForceX ** 2 + totalForceY ** 2);
    const speedDelta = forceMagnitude * 0.1; // Adjust speed incrementally
    this.speed += speedDelta;
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

      // Calculate the desired velocity
      const desiredSpeed = distance * this.acceleration;

      // Apply the steering force
      this.speed += (desiredSpeed - this.speed) * this.acceleration;
    }

    // Apply friction and clamp speed to prevent particles from stopping or moving too fast
    this.speed = Math.min(this.maxSpeed, Math.max(this.minSpeed, this.speed * this.friction));

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
    this.renderers.push(new ParticleRenderer(this.x, this.y, this.radius, 0.4, this.color));
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
  color: string; // comma separated rgb values 0-255
  // Boid behavior parameters
  neighborhoodRadius = 50;
  cohesionWeight = 0.1;
  separationWeight = 0.25;
  alignmentWeight = 0.05;

  constructor(targetX: number, targetY: number, numParticles: number = 100, color: string = '255, 155, 50') {
    this.targetX = targetX;
    this.targetY = targetY;
    this.color = color;
    this.particles = Array.from({ length: numParticles }, () =>
      new Particle(
        targetX + Math.random() * 20 - 10,
        targetY + Math.random() * 20 - 10,
        targetX,
        targetY,
        color
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
      particle.updateBoidBehavior(
        this.particles,
        this.neighborhoodRadius,
        this.cohesionWeight,
        this.separationWeight,
        this.alignmentWeight
      );
      particle.update(canvasWidth, canvasHeight);
    });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.particles.forEach((particle) => particle.draw(ctx));
  }
}

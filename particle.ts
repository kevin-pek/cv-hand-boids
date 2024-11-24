export class Particle {
  x: number; // Current x position
  y: number; // Current y position
  vx: number; // Velocity in the x direction
  vy: number; // Velocity in the y direction
  targetX: number | null; // Target x position
  targetY: number | null; // Target y position
  acceleration: number; // Acceleration factor
  maxSpeed: number; // Maximum speed
  friction: number; // Friction coefficient
  radius: number; // Radius of particle

  constructor(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    acceleration: number = 0.5,
    maxSpeed: number = 15,
    friction: number = 0.98,
    radius: number = 1,
  ) {
    this.x = x;
    this.y = y;
    this.vx = Math.random() * 2 - 1; // Random initial velocity
    this.vy = Math.random() * 2 - 1;
    this.targetX = targetX;
    this.targetY = targetY;
    this.acceleration = acceleration;
    this.maxSpeed = maxSpeed;
    this.friction = friction;
    this.radius = radius;
  }

  // Update the particle's position and velocity
  update(canvasWidth: number, canvasHeight: number): void {
    // Calculate directional force toward the target
    const dx = this.targetX !== null ? this.targetX - this.x : 0;
    const dy = this.targetY !== null ? this.targetY - this.y : 0;

    // Normalize the direction vector
    const distance = Math.sqrt(dx * dx + dy * dy);
    const directionX = dx / (distance || 1); // Avoid division by zero
    const directionY = dy / (distance || 1);

    // Apply acceleration in the direction of the target
    this.vx += directionX * this.acceleration;
    this.vy += directionY * this.acceleration;

    if (distance < 20) {
      this.vx -= dx * this.acceleration * 0.01; // Push away
      this.vy -= dy * this.acceleration * 0.01;
    } else {
      // Add random noise to create non-deterministic paths
      this.vx += dx * this.acceleration * (Math.random() - 0.3) * 0.1; // Randomly overshoot
      this.vy += dy * this.acceleration * (Math.random() - 0.3) * 0.1;
    }

    // Apply friction to simulate momentum
    this.vx *= this.friction;
    this.vy *= this.friction;

    // Limit speed to prevent erratic motion
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > this.maxSpeed) {
      this.vx = (this.vx / speed) * this.maxSpeed;
      this.vy = (this.vy / speed) * this.maxSpeed;
    }

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Bounce off canvas borders
    if (this.x - this.radius < 0 || this.x + this.radius > canvasWidth) {
      this.vx *= -1; // Reverse x velocity
      this.x = Math.max(this.radius, Math.min(this.x, canvasWidth - this.radius));
    }
    if (this.y - this.radius < 0 || this.y + this.radius > canvasHeight) {
      this.vy *= -1; // Reverse y velocity
      this.y = Math.max(this.radius, Math.min(this.y, canvasHeight - this.radius));
    }
  }

  // Draw the particle on a canvas
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 155, 50, 0.7)";
    ctx.fill();
  }
}

export class ParticleSystem {
  particles: Particle[];
  targetX: number | null;
  targetY: number | null;

  constructor(targetX: number, targetY: number, numParticles: number = 300) {
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

  update(canvasWidth: number, canvasHeight: number): void {
    this.particles.forEach((particle) => {
      particle.targetX = this.targetX;
      particle.targetY = this.targetY;
      particle.update(canvasWidth, canvasHeight);
    });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.particles.forEach((particle) => particle.draw(ctx));
  }
}

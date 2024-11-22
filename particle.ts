export class Particle {
  x: number; // Current x position
  y: number; // Current y position
  vx: number; // Velocity in the x direction
  vy: number; // Velocity in the y direction
  targetX: number; // Target x position
  targetY: number; // Target y position
  acceleration: number; // Acceleration factor
  maxSpeed: number; // Maximum speed
  friction: number; // Friction coefficient

  constructor(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    acceleration: number = 0.5,
    maxSpeed: number = 15,
    friction: number = 0.98
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
  }

  // Update the particle's position and velocity
  update(): void {
    // Calculate directional force toward the target
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;

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
  }

  // Draw the particle on a canvas
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2); // Radius = 3
    ctx.fillStyle = "rgba(255, 200, 138, 0.8)";
    ctx.fill();
  }
}

export class ParticleSystem {
  particles: Particle[];
  targetX: number;
  targetY: number;

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

  update(): void {
    this.particles.forEach((particle) => {
      particle.targetX = this.targetX;
      particle.targetY = this.targetY;
      particle.update();
    });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.particles.forEach((particle) => particle.draw(ctx));
  }
}

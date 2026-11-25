export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
  glow?: boolean;
  type?: 'fire' | 'water' | 'smoke' | 'spark' | 'ring' | 'slash' | 'leaf' | 'aura';
  ringRadius?: number;
  ringMaxRadius?: number;
}

export interface GroundMark {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface SlashArc {
  x: number;
  y: number;
  angle: number;
  color: string;
  radius: number;
  arcLength: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private groundMarks: GroundMark[] = [];
  private slashArcs: SlashArc[] = [];

  public update(dt: number) {
    // Update regular particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Friction / gravity
      if (p.type === 'smoke') {
        p.vy -= 15 * dt; // rise upward
        p.radius += 8 * dt; // expand
        p.vx *= 0.95;
      } else if (p.type === 'fire') {
        p.vy -= 20 * dt;
        p.radius = Math.max(1, p.radius - 10 * dt);
        p.vx *= 0.96;
      } else if (p.type === 'water') {
        p.vy += 40 * dt; // slight downward drop
        p.vx *= 0.94;
      } else if (p.type === 'ring') {
        if (p.ringRadius !== undefined && p.ringMaxRadius !== undefined) {
          p.ringRadius += (p.ringMaxRadius - p.ringRadius) * (dt * 8);
        }
      }

      p.alpha = Math.max(0, p.life / p.maxLife);
    }

    // Update ground marks (scorch patches, water wet spots)
    for (let i = this.groundMarks.length - 1; i >= 0; i--) {
      const g = this.groundMarks[i];
      g.life -= dt;
      if (g.life <= 0) {
        this.groundMarks.splice(i, 1);
        continue;
      }
      g.alpha = Math.max(0, (g.life / g.maxLife) * 0.4);
    }

    // Update slash arcs
    for (let i = this.slashArcs.length - 1; i >= 0; i--) {
      const s = this.slashArcs[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.slashArcs.splice(i, 1);
        continue;
      }
    }
  }

  public emitFlame(x: number, y: number, vx: number, vy: number, scale: number = 1) {
    const colors = ['#ffcc00', '#ff9900', '#ff4400', '#ff1100', '#ffe680'];
    const count = Math.floor(3 * scale);
    for (let i = 0; i < count; i++) {
      const angleOffset = (Math.random() - 0.5) * 0.4;
      const speed = Math.hypot(vx, vy) * (0.8 + Math.random() * 0.4);
      const baseAngle = Math.atan2(vy, vx) + angleOffset;
      const life = 0.25 + Math.random() * 0.25;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: Math.cos(baseAngle) * speed,
        vy: Math.sin(baseAngle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: (6 + Math.random() * 8) * scale,
        alpha: 0.9,
        life,
        maxLife: life,
        glow: true,
        type: 'fire',
      });
    }

    // Occasional smoke
    if (Math.random() < 0.3) {
      this.particles.push({
        x,
        y,
        vx: vx * 0.3 + (Math.random() - 0.5) * 20,
        vy: vy * 0.3 - 10,
        color: '#444444',
        radius: 8 * scale,
        alpha: 0.5,
        life: 0.5,
        maxLife: 0.5,
        type: 'smoke',
      });
    }
  }

  public emitWaterBurst(x: number, y: number, vx: number, vy: number, scale: number = 1) {
    const colors = ['#6890f0', '#98d8d8', '#ffffff', '#3860d8'];
    const count = Math.floor(4 * scale);
    for (let i = 0; i < count; i++) {
      const angleOffset = (Math.random() - 0.5) * 0.6;
      const speed = Math.hypot(vx, vy) * (0.6 + Math.random() * 0.6);
      const baseAngle = Math.atan2(vy, vx) + angleOffset;
      const life = 0.2 + Math.random() * 0.3;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(baseAngle) * speed,
        vy: Math.sin(baseAngle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: (4 + Math.random() * 6) * scale,
        alpha: 0.85,
        life,
        maxLife: life,
        glow: true,
        type: 'water',
      });
    }

    // Water ripple ring
    if (Math.random() < 0.35) {
      this.particles.push({
        x,
        y,
        vx: 0,
        vy: 0,
        color: '#70b8ff',
        radius: 0,
        ringRadius: 5,
        ringMaxRadius: 30 * scale,
        alpha: 0.7,
        life: 0.35,
        maxLife: 0.35,
        type: 'ring',
      });
    }
  }

  public emitLeafBurst(x: number, y: number, vx: number, vy: number, scale: number = 1) {
    const colors = ['#4ade80', '#22c55e', '#86efac', '#15803d', '#f472b6'];
    const count = Math.floor(4 * scale);
    for (let i = 0; i < count; i++) {
      const angleOffset = (Math.random() - 0.5) * 0.8;
      const speed = Math.hypot(vx, vy) * (0.6 + Math.random() * 0.6);
      const baseAngle = Math.atan2(vy, vx) + angleOffset;
      const life = 0.3 + Math.random() * 0.3;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: Math.cos(baseAngle) * speed,
        vy: Math.sin(baseAngle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: (4 + Math.random() * 5) * scale,
        alpha: 0.9,
        life,
        maxLife: life,
        glow: true,
        type: 'leaf',
      });
    }
  }

  public emitAuraBurst(x: number, y: number, vx: number, vy: number, scale: number = 1) {
    const colors = ['#38bdf8', '#0284c7', '#e0f2fe', '#818cf8'];
    const count = Math.floor(4 * scale);
    for (let i = 0; i < count; i++) {
      const angleOffset = (Math.random() - 0.5) * 0.5;
      const speed = Math.hypot(vx, vy) * (0.7 + Math.random() * 0.5);
      const baseAngle = Math.atan2(vy, vx) + angleOffset;
      const life = 0.25 + Math.random() * 0.25;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(baseAngle) * speed,
        vy: Math.sin(baseAngle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: (5 + Math.random() * 6) * scale,
        alpha: 0.95,
        life,
        maxLife: life,
        glow: true,
        type: 'aura',
      });
    }
  }

  public emitSlashArc(x: number, y: number, angle: number, color: string = '#00ffff') {
    this.slashArcs.push({
      x,
      y,
      angle,
      color,
      radius: 45,
      arcLength: Math.PI * 0.7,
      life: 0.18,
      maxLife: 0.18,
    });

    // Sparks along the slash
    for (let i = 0; i < 8; i++) {
      const sparkAngle = angle - Math.PI * 0.35 + (Math.PI * 0.7 * i) / 8;
      const dist = 35 + Math.random() * 15;
      const sx = x + Math.cos(sparkAngle) * dist;
      const sy = y + Math.sin(sparkAngle) * dist;

      this.particles.push({
        x: sx,
        y: sy,
        vx: Math.cos(sparkAngle) * (60 + Math.random() * 60),
        vy: Math.sin(sparkAngle) * (60 + Math.random() * 60),
        color: '#ffffff',
        radius: 2 + Math.random() * 2,
        alpha: 1,
        life: 0.15,
        maxLife: 0.15,
        glow: true,
        type: 'spark',
      });
    }
  }

  public emitExplosion(x: number, y: number, color: 'fire' | 'water' = 'fire') {
    const isFire = color === 'fire';
    const mainColors = isFire
      ? ['#ffffff', '#ffea00', '#ff6600', '#ff1a00', '#441100']
      : ['#ffffff', '#a0e0ff', '#3090ff', '#0040c0'];

    // Large shockwave ring
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      color: isFire ? '#ffcc00' : '#88d8ff',
      radius: 0,
      ringRadius: 10,
      ringMaxRadius: isFire ? 90 : 75,
      alpha: 1,
      life: 0.45,
      maxLife: 0.45,
      type: 'ring',
    });

    // Burst particles
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 220;
      const life = 0.3 + Math.random() * 0.4;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: mainColors[Math.floor(Math.random() * mainColors.length)],
        radius: 5 + Math.random() * 9,
        alpha: 1,
        life,
        maxLife: life,
        glow: true,
        type: isFire ? 'fire' : 'water',
      });
    }

    // Add ground scorch / puddle
    this.groundMarks.push({
      x,
      y,
      radius: 35 + Math.random() * 15,
      color: isFire ? 'rgba(30, 15, 10, 0.6)' : 'rgba(20, 60, 90, 0.4)',
      alpha: 0.5,
      life: 6.0,
      maxLife: 6.0,
    });
  }

  public emitDashPuff(x: number, y: number, dirX: number, dirY: number) {
    for (let i = 0; i < 8; i++) {
      const speed = 40 + Math.random() * 50;
      const angle = Math.atan2(-dirY, -dirX) + (Math.random() - 0.5) * 1.2;
      const life = 0.25 + Math.random() * 0.2;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 15,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15,
        color: '#e0e8f0',
        radius: 6 + Math.random() * 6,
        alpha: 0.6,
        life,
        maxLife: life,
        type: 'smoke',
      });
    }
  }

  public drawGroundMarks(ctx: CanvasRenderingContext2D) {
    for (const g of this.groundMarks) {
      ctx.save();
      ctx.globalAlpha = g.alpha;
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.ellipse(g.x, g.y, g.radius, g.radius * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    // Draw slash arcs first
    for (const s of this.slashArcs) {
      ctx.save();
      const progress = 1 - s.life / s.maxLife;
      const alpha = Math.sin((1 - progress) * Math.PI);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 5 * (1 - progress * 0.5);
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.arc(
        s.x,
        s.y,
        s.radius * (0.8 + progress * 0.4),
        s.angle - s.arcLength / 2,
        s.angle + s.arcLength / 2
      );
      ctx.stroke();

      // Inner white luminous core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Draw particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.type === 'ring' && p.ringRadius !== undefined) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.ringRadius, p.ringRadius * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'leaf') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 10);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.radius * 1.4, p.radius * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        if (p.glow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}

export const particles = new ParticleSystem();

import { Projectile, MeleeHitbox, DamageNumber } from './types';
import { particles } from './particles';
import { sound } from './audio';

export class CombatSystem {
  public projectiles: Projectile[] = [];
  public meleeHitboxes: MeleeHitbox[] = [];
  public damageNumbers: DamageNumber[] = [];
  private nextId: number = 1;

  public spawnProjectile(p: Omit<Projectile, 'id'>): Projectile {
    const proj: Projectile = {
      ...p,
      id: this.nextId++,
    };
    this.projectiles.push(proj);
    return proj;
  }

  public spawnMeleeHitbox(m: MeleeHitbox) {
    this.meleeHitboxes.push(m);
  }

  public spawnDamageNumber(
    x: number,
    y: number,
    text: string,
    color: string = '#ffffff',
    scale: number = 1
  ) {
    this.damageNumbers.push({
      x,
      y,
      text,
      color,
      lifetime: 0.9,
      maxLifetime: 0.9,
      vy: -65 * scale,
      scale,
    });
  }

  public update(dt: number, arenaRadius: number) {
    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.lifetime -= dt;

      if (p.lifetime <= 0) {
        if (p.isFireBlast && !p.hasExploded) {
          this.explodeFireBlast(p);
        }
        this.projectiles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Particle emission along projectile path
      if (p.element === 'fire') {
        particles.emitFlame(p.x, p.y, -p.vx * 0.2, -p.vy * 0.2, p.scale || 1);
      } else if (p.element === 'water') {
        particles.emitWaterBurst(p.x, p.y, -p.vx * 0.15, -p.vy * 0.15, p.scale || 1);
      } else if (p.element === 'grass') {
        particles.emitLeafBurst(p.x, p.y, -p.vx * 0.15, -p.vy * 0.15, p.scale || 1);
      } else if (p.element === 'fighting') {
        particles.emitAuraBurst(p.x, p.y, -p.vx * 0.15, -p.vy * 0.15, p.scale || 1);
      }

      // Arena boundary collision
      const distFromCenter = Math.hypot(p.x, p.y);
      if (distFromCenter > arenaRadius - p.radius) {
        if (p.isFireBlast && !p.hasExploded) {
          this.explodeFireBlast(p);
        } else {
          particles.emitExplosion(p.x, p.y, p.element === 'fire' ? 'fire' : 'water');
          sound.playHit(false);
        }
        this.projectiles.splice(i, 1);
        continue;
      }
    }

    // Update melee hitboxes
    for (let i = this.meleeHitboxes.length - 1; i >= 0; i--) {
      const m = this.meleeHitboxes[i];
      m.lifetime -= dt;
      if (m.lifetime <= 0) {
        this.meleeHitboxes.splice(i, 1);
      }
    }

    // Update floating damage numbers
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.lifetime -= dt;
      if (d.lifetime <= 0) {
        this.damageNumbers.splice(i, 1);
        continue;
      }
      d.y += d.vy * dt;
      d.vy *= 0.94; // decelerate upward float
    }
  }

  public explodeFireBlast(p: Projectile) {
    p.hasExploded = true;
    particles.emitExplosion(p.x, p.y, 'fire');
    sound.playExplosion();

    // Spawn 5 star burst fireballs branching outwards (Fire Blast Kanji / 5-star shape!)
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const speed = 240;
      this.spawnProjectile({
        owner: p.owner,
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 12,
        damage: Math.round(p.damage * 0.55),
        element: 'fire',
        lifetime: 0.6,
        maxLifetime: 0.6,
        piercing: false,
        scale: 1.1,
      });
    }
  }

  public calculateTypeMultiplier(
    attackerElement: string,
    defenderElement: string
  ): { mult: number; text?: string } {
    // Super Effective Matchups (1.85x)
    if (
      (attackerElement === 'water' && defenderElement === 'fire') ||
      (attackerElement === 'fire' && defenderElement === 'grass') ||
      (attackerElement === 'grass' && defenderElement === 'water') ||
      (attackerElement === 'fire' && defenderElement === 'steel') ||
      (attackerElement === 'fighting' && defenderElement === 'steel')
    ) {
      return { mult: 1.85, text: 'SUPER EFFECTIVE!' };
    }

    // Resisted Matchups (0.6x)
    if (
      (attackerElement === 'fire' && defenderElement === 'water') ||
      (attackerElement === 'water' && defenderElement === 'grass') ||
      (attackerElement === 'grass' && defenderElement === 'fire') ||
      (attackerElement === 'grass' && defenderElement === 'steel') ||
      (attackerElement === 'water' && defenderElement === 'water') ||
      (attackerElement === 'fire' && defenderElement === 'fire')
    ) {
      return { mult: 0.6, text: 'NOT VERY EFFECTIVE...' };
    }

    if (attackerElement === 'dragon') {
      return { mult: 1.15, text: '' };
    }

    return { mult: 1.0, text: '' };
  }

  public drawProjectiles(ctx: CanvasRenderingContext2D) {
    for (const p of this.projectiles) {
      ctx.save();
      const radius = p.radius;

      if (p.element === 'fire') {
        // Glowing Fireball / Fire Blast
        const grad = ctx.createRadialGradient(p.x, p.y, radius * 0.2, p.x, p.y, radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, '#ffdd33');
        grad.addColorStop(0.7, '#ff5500');
        grad.addColorStop(1, 'rgba(200, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = p.isFireBlast ? 20 : 12;

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * (p.scale || 1), 0, Math.PI * 2);
        ctx.fill();

        if (p.isFireBlast) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      } else if (p.element === 'water') {
        // Hydro Water Blast / Water Bullet
        const grad = ctx.createRadialGradient(p.x, p.y, radius * 0.2, p.x, p.y, radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#a0e4ff');
        grad.addColorStop(0.8, '#1e88e5');
        grad.addColorStop(1, 'rgba(10, 80, 200, 0)');

        ctx.fillStyle = grad;
        ctx.shadowColor = '#00b0ff';
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * (p.scale || 1), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.element === 'grass') {
        // Razor Leaf / Solar Beam
        const grad = ctx.createRadialGradient(p.x, p.y, radius * 0.2, p.x, p.y, radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#86efac');
        grad.addColorStop(0.8, '#22c55e');
        grad.addColorStop(1, 'rgba(20, 160, 40, 0)');

        ctx.fillStyle = grad;
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = p.isSolarBeam ? 24 : 12;

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * (p.scale || 1), 0, Math.PI * 2);
        ctx.fill();

        if (p.isSolarBeam) {
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      } else if (p.element === 'fighting' || p.element === 'steel') {
        // Aura Sphere / Energy Blast
        const grad = ctx.createRadialGradient(p.x, p.y, radius * 0.2, p.x, p.y, radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#7dd3fc');
        grad.addColorStop(0.8, '#0284c7');
        grad.addColorStop(1, 'rgba(2, 132, 199, 0)');

        ctx.fillStyle = grad;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 16;

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * (p.scale || 1), 0, Math.PI * 2);
        ctx.fill();

        // Aura pulse ring
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  public drawDamageNumbers(ctx: CanvasRenderingContext2D) {
    for (const d of this.damageNumbers) {
      ctx.save();
      const alpha = Math.min(1, (d.lifetime / d.maxLifetime) * 1.5);
      ctx.globalAlpha = alpha;
      ctx.font = `900 ${Math.round(18 * d.scale)}px 'Press Start 2P', monospace, sans-serif`;
      ctx.textAlign = 'center';

      // Outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(d.text, d.x, d.y);

      // Fill
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, d.x, d.y);
      ctx.restore();
    }
  }
}

export const combat = new CombatSystem();

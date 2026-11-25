import { Projectile, MeleeHitbox, DamageNumber, Telegraph } from './types';
import { particles } from './particles';
import { sound } from './audio';

export class CombatSystem {
  public projectiles: Projectile[] = [];
  public meleeHitboxes: MeleeHitbox[] = [];
  public damageNumbers: DamageNumber[] = [];
  public telegraphs: Telegraph[] = [];
  private nextId: number = 1;

  public spawnTelegraph(t: Telegraph) {
    this.telegraphs.push(t);
  }

  public spawnProjectile(p: Omit<Projectile, 'id'>): Projectile {
    const proj: Projectile = {
      ...p,
      age: 0,
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
      p.age = (p.age || 0) + dt;

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

    // Update enemy attack telegraphs
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      this.telegraphs[i].lifetime -= dt;
      if (this.telegraphs[i].lifetime <= 0) {
        this.telegraphs.splice(i, 1);
      }
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

  public drawTelegraphs(ctx: CanvasRenderingContext2D) {
    for (const t of this.telegraphs) {
      const progress = 1 - t.lifetime / t.maxLifetime;
      const angle = Math.atan2(t.targetY - t.y, t.targetX - t.x);
      ctx.save();
      ctx.globalAlpha = 0.25 + progress * 0.5;
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 2 + progress * 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + Math.cos(angle) * 380, t.y + Math.sin(angle) * 380);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius * (1.5 - progress * 0.6), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  public drawProjectiles(ctx: CanvasRenderingContext2D) {
    for (const p of this.projectiles) {
      ctx.save();
      const radius = p.radius * (p.scale || 1);
      const angle = Math.atan2(p.vy, p.vx);
      const age = p.age || 0;

      ctx.translate(p.x, p.y);
      ctx.rotate(angle);

      if (p.element === 'fire') {
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = p.isFireBlast ? 24 : 14;

        // Comet flame tail
        const tailLen = p.isFireBlast ? radius * 2.2 : radius * 1.9;
        const tailGrad = ctx.createLinearGradient(-tailLen, 0, radius, 0);
        tailGrad.addColorStop(0, 'rgba(255, 60, 0, 0)');
        tailGrad.addColorStop(0.5, 'rgba(255, 120, 0, 0.75)');
        tailGrad.addColorStop(1, '#ffea70');
        ctx.fillStyle = tailGrad;
        ctx.beginPath();
        ctx.moveTo(radius * 0.4, -radius * 0.65);
        ctx.quadraticCurveTo(-tailLen, 0, radius * 0.4, radius * 0.65);
        ctx.closePath();
        ctx.fill();

        // Glowing core
        const grad = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#ffdd33');
        grad.addColorStop(0.75, '#ff5500');
        grad.addColorStop(1, 'rgba(200, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        if (p.isFireBlast) {
          // Rotating 5-pointed star flare
          ctx.rotate(age * 7);
          ctx.strokeStyle = '#fff3b0';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const a = (i * Math.PI * 2) / 5;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * radius * 1.15, Math.sin(a) * radius * 1.15);
          }
          ctx.stroke();
        }
      } else if (p.element === 'water') {
        ctx.shadowColor = '#00b0ff';
        ctx.shadowBlur = p.piercing ? 22 : 12;

        // Pressurized hydro wake
        const tailLen = p.piercing ? radius * 2.8 : radius * 1.8;
        const wakeGrad = ctx.createLinearGradient(-tailLen, 0, radius, 0);
        wakeGrad.addColorStop(0, 'rgba(30, 136, 229, 0)');
        wakeGrad.addColorStop(0.6, 'rgba(96, 165, 250, 0.8)');
        wakeGrad.addColorStop(1, '#ffffff');
        ctx.fillStyle = wakeGrad;
        ctx.beginPath();
        ctx.moveTo(radius * 0.6, -radius * 0.55);
        ctx.lineTo(-tailLen, 0);
        ctx.lineTo(radius * 0.6, radius * 0.55);
        ctx.closePath();
        ctx.fill();

        const grad = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.45, '#a0e4ff');
        grad.addColorStop(0.85, '#1e88e5');
        grad.addColorStop(1, 'rgba(10, 80, 200, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        if (p.piercing) {
          // Spiral foam rings for Hydro Pump
          ctx.strokeStyle = 'rgba(224, 242, 254, 0.85)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(-radius * 0.5, 0, radius * 0.35, radius * 0.85, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (p.element === 'grass') {
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = p.isSolarBeam ? 26 : 10;

        if (p.isSolarBeam) {
          // Blazing Solar Beam lance + energy rings
          const beamLen = radius * 2.9;
          const beamGrad = ctx.createLinearGradient(-beamLen, 0, radius, 0);
          beamGrad.addColorStop(0, 'rgba(74, 222, 128, 0)');
          beamGrad.addColorStop(0.5, '#86efac');
          beamGrad.addColorStop(1, '#fef9c3');
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.roundRect(-beamLen, -radius * 0.55, beamLen + radius * 0.8, radius * 1.1, radius * 0.55);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(-radius * 0.4, 0, radius * 0.3, radius * 0.9, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Spinning Razor Leaf blade
          ctx.rotate(age * 16);
          ctx.fillStyle = '#22c55e';
          ctx.strokeStyle = '#dcfce7';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(radius * 1.15, 0);
          ctx.quadraticCurveTo(0, -radius * 0.65, -radius * 1.15, 0);
          ctx.quadraticCurveTo(0, radius * 0.65, radius * 1.15, 0);
          ctx.fill();
          ctx.stroke();
        }
      } else if (p.element === 'fighting' || p.element === 'steel') {
        ctx.shadowColor = p.isBoneRush ? '#a5f3fc' : '#38bdf8';
        ctx.shadowBlur = 18;

        if (p.isBoneRush) {
          // Spinning Aura Bone club
          ctx.rotate(age * 14);
          ctx.fillStyle = '#e0f2fe';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(-radius * 1.1, -radius * 0.25, radius * 2.2, radius * 0.5, 6);
          ctx.fill();
          ctx.stroke();
          for (const endX of [-radius * 1.05, radius * 1.05]) {
            ctx.beginPath();
            ctx.arc(endX, -radius * 0.22, radius * 0.28, 0, Math.PI * 2);
            ctx.arc(endX, radius * 0.22, radius * 0.28, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Pulsing Aura Sphere with orbiting ring
          const grad = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.4, '#7dd3fc');
          grad.addColorStop(0.8, '#0284c7');
          grad.addColorStop(1, 'rgba(2, 132, 199, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.rotate(age * 8);
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 0, radius * 1.15, radius * 0.45, 0.4, 0, Math.PI * 2);
          ctx.stroke();
        }
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

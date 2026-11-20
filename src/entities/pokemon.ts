import { Direction, ActionState, PokemonStats, PokemonElement } from '../types';
import { SpriteAnimator, getDirectionFromVector } from '../sprite';
import { combat } from '../combat';
import { sound } from '../audio';
import { particles } from '../particles';

export class Pokemon {
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public radius: number = 24;
  public stats: PokemonStats;
  public animator: SpriteAnimator;
  public currentAction: ActionState = 'idle';
  public facingDirection: Direction = Direction.South;
  public isPlayer: boolean = false;

  // States & Timers
  public isInvincible: boolean = false;
  public invincibilityTimer: number = 0;
  public hurtTimer: number = 0;
  public flashTimer: number = 0;
  public isFainted: boolean = false;
  public isDashing: boolean = false;
  public dashTimer: number = 0;
  public dashVx: number = 0;
  public dashVy: number = 0;

  // Action lock
  public actionLockTimer: number = 0;

  constructor(stats: PokemonStats, x: number, y: number) {
    this.stats = { ...stats };
    this.x = x;
    this.y = y;
    this.animator = new SpriteAnimator(stats.dex);
  }

  public update(dt: number, arenaRadius: number) {
    // Stamina regen
    if (this.stats.stamina < this.stats.maxStamina && !this.isDashing) {
      this.stats.stamina = Math.min(this.stats.maxStamina, this.stats.stamina + 28 * dt);
    }

    // Hurt timer
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      if (this.hurtTimer <= 0 && !this.isFainted) {
        this.setAction('idle');
      }
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
    }

    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer -= dt;
      if (this.invincibilityTimer <= 0) {
        this.isInvincible = false;
      }
    }

    if (this.actionLockTimer > 0) {
      this.actionLockTimer -= dt;
      if (this.actionLockTimer <= 0 && !this.isFainted && this.currentAction !== 'dash') {
        this.setAction('idle');
      }
    }

    // Dash physics
    if (this.isDashing) {
      this.dashTimer -= dt;
      this.x += this.dashVx * dt;
      this.y += this.dashVy * dt;

      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.setAction('idle');
      }
    } else if (this.hurtTimer <= 0 && this.actionLockTimer <= 0 && !this.isFainted) {
      // Normal movement
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Friction
      this.vx *= 0.85;
      this.vy *= 0.85;
    }

    // Arena boundary clamp
    const dist = Math.hypot(this.x, this.y);
    if (dist > arenaRadius - this.radius) {
      const angle = Math.atan2(this.y, this.x);
      this.x = Math.cos(angle) * (arenaRadius - this.radius);
      this.y = Math.sin(angle) * (arenaRadius - this.radius);
      this.vx = 0;
      this.vy = 0;
    }

    // Update sprite animator
    this.animator.setAction(this.currentAction);
    this.animator.setDirection(this.facingDirection);
    this.animator.update(dt);
  }

  public setAction(action: ActionState, force: boolean = false) {
    if (this.isFainted) return;
    if (this.currentAction === action && !force) return;
    this.currentAction = action;
    this.animator.setAction(action, force);
  }

  public lookAt(targetX: number, targetY: number) {
    if (this.isFainted) return;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    this.facingDirection = getDirectionFromVector(dx, dy);
    this.animator.setDirection(this.facingDirection);
  }

  public takeDamage(
    amount: number,
    element: PokemonElement,
    knockbackX: number = 0,
    knockbackY: number = 0
  ) {
    if (this.isInvincible || this.isFainted) {
      combat.spawnDamageNumber(this.x, this.y - 30, 'DODGED!', '#44ccff', 0.85);
      return;
    }

    const { mult, text } = combat.calculateTypeMultiplier(element, this.stats.element);
    const finalDamage = Math.max(1, Math.round(amount * mult));

    this.stats.hp = Math.max(0, this.stats.hp - finalDamage);

    // Color code damage
    let damageColor = '#ffffff';
    let scale = 1.0;
    if (mult > 1.2) {
      damageColor = '#ffdd44'; // Gold for super effective
      scale = 1.35;
    } else if (mult < 0.8) {
      damageColor = '#bbbbbb'; // Grey for resisted
      scale = 0.85;
    }

    combat.spawnDamageNumber(this.x, this.y - 25, `${finalDamage}`, damageColor, scale);
    if (text) {
      combat.spawnDamageNumber(
        this.x,
        this.y - 48,
        text,
        mult > 1.2 ? '#ff5533' : '#aaaaaa',
        mult > 1.2 ? 1.0 : 0.75
      );
    }

    // Apply knockback
    this.vx += knockbackX;
    this.vy += knockbackY;

    // Flash & Hurt
    this.flashTimer = 0.15;
    this.hurtTimer = 0.22;
    this.invincibilityTimer = 0.28;
    this.isInvincible = true;

    sound.playHit(mult > 1.2);

    if (this.stats.hp <= 0) {
      this.faint();
    } else {
      this.setAction('hurt', true);
    }
  }

  public faint() {
    this.isFainted = true;
    this.stats.hp = 0;
    this.setAction('faint', true);
    this.vx = 0;
    this.vy = 0;
    sound.playFaint();
    particles.emitExplosion(this.x, this.y, this.stats.element === 'fire' ? 'fire' : 'water');
  }

  public dash(dx: number, dy: number, speed: number = 420, duration: number = 0.22) {
    if (this.isFainted || this.isDashing || this.stats.stamina < 25) return false;

    this.stats.stamina -= 25;
    this.isDashing = true;
    this.dashTimer = duration;
    this.isInvincible = true;
    this.invincibilityTimer = duration + 0.08;

    let len = Math.hypot(dx, dy);
    if (len < 0.001) {
      // Dash in facing direction
      const angle = this.getAngleFromDirection(this.facingDirection);
      dx = Math.cos(angle);
      dy = Math.sin(angle);
      len = 1;
    }

    this.dashVx = (dx / len) * speed;
    this.dashVy = (dy / len) * speed;

    this.setAction('dash', true);
    sound.playDash();
    particles.emitDashPuff(this.x, this.y, dx, dy);
    return true;
  }

  public castBasicAttack(targetX: number, targetY: number): boolean {
    return false;
  }

  public castSkill1(targetX: number, targetY: number): boolean {
    return false;
  }

  public castSkill2(targetX: number, targetY: number): boolean {
    return false;
  }

  public updateAI(dt: number, target: Pokemon, arenaRadius: number): void {}

  public getSkills(): Record<string, any> {
    return {};
  }

  private getAngleFromDirection(dir: Direction): number {
    // 0:S, 1:SE, 2:E, 3:NE, 4:N, 5:NW, 6:W, 7:SW
    const angles = [
      Math.PI / 2,
      Math.PI / 4,
      0,
      -Math.PI / 4,
      -Math.PI / 2,
      (-3 * Math.PI) / 4,
      Math.PI,
      (3 * Math.PI) / 4,
    ];
    return angles[dir];
  }

  public draw(ctx: CanvasRenderingContext2D) {
    this.animator.draw(ctx, this.x, this.y, {
      flashWhite: this.flashTimer > 0,
      opacity: this.isDashing ? 0.65 : 1.0,
      shadow: true,
      shadowRadius: this.radius * 1.1,
    });
  }
}

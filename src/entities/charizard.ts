import { Pokemon } from './pokemon';
import { SkillInfo } from '../types';
import { combat } from '../combat';
import { sound } from '../audio';
import { particles } from '../particles';

export class Charizard extends Pokemon {
  public skills: Record<string, SkillInfo> = {
    flamethrower: {
      id: 'flamethrower',
      name: 'Flamethrower',
      type: 'stream',
      element: 'fire',
      cooldown: 1.8, // Slow, tactical basic attack (1.8s cooldown)
      currentCooldown: 0,
      staminaCost: 0,
      keyHint: 'L-Click / J',
      description: 'Slow poke projectile (deals low chip damage)',
      icon: '🔥',
    },
    dragonClaw: {
      id: 'dragonClaw',
      name: 'Dragon Claw',
      type: 'melee',
      element: 'dragon',
      cooldown: 2.2,
      currentCooldown: 0,
      staminaCost: 18,
      keyHint: 'R-Click / K',
      description: 'Lunging draconic slash that cleaves and knocks back',
      icon: '⚔️',
    },
    fireBlast: {
      id: 'fireBlast',
      name: 'Fire Blast',
      type: 'projectile',
      element: 'fire',
      cooldown: 5.0,
      currentCooldown: 0,
      staminaCost: 32,
      keyHint: 'Space / E',
      description: 'Massive star-shaped fireball that detonates into 5 explosive bursts',
      icon: '💥',
    },
    dash: {
      id: 'dash',
      name: 'Wing Dash',
      type: 'dash',
      element: 'normal',
      cooldown: 0.9,
      currentCooldown: 0,
      staminaCost: 25,
      keyHint: 'Shift',
      description: 'Invulnerable evasive speed burst',
      icon: '💨',
    },
  };

  // AI Cooldowns
  private aiBasicCooldown: number = 1.2;
  private aiSkill1Cooldown: number = 1.5;
  private aiSkill2Cooldown: number = 4.0;
  private aiDodgeCooldown: number = 2.0;
  private strafeDirection: number = 1;
  private strafeChangeTimer: number = 1.3;
  private aiPauseTimer: number = 0;

  constructor(x: number, y: number) {
    super(
      {
        name: 'Charizard',
        dex: '0006',
        maxHp: 280,
        hp: 280,
        maxStamina: 100,
        stamina: 100,
        speed: 215,
        attackPower: 84,
        defense: 78,
        element: 'fire',
      },
      x,
      y
    );
    this.radius = 26;
  }

  public override getSkills(): Record<string, SkillInfo> {
    return this.skills;
  }

  public override castBasicAttack(targetX: number, targetY: number): boolean {
    return this.castFlamethrower(targetX, targetY);
  }

  public override castSkill1(targetX: number, targetY: number): boolean {
    return this.castDragonClaw(targetX, targetY);
  }

  public override castSkill2(targetX: number, targetY: number): boolean {
    return this.castFireBlast(targetX, targetY);
  }

  public override update(dt: number, arenaRadius: number) {
    for (const key in this.skills) {
      const skill = this.skills[key];
      if (skill.currentCooldown > 0) {
        skill.currentCooldown = Math.max(0, skill.currentCooldown - dt);
      }
    }
    super.update(dt, arenaRadius);
  }

  public castFlamethrower(targetX: number, targetY: number): boolean {
    if (this.isFainted || this.isDashing || this.hurtTimer > 0) return false;
    const skill = this.skills.flamethrower;
    if (skill.currentCooldown > 0 || this.stats.stamina < skill.staminaCost) return false;

    skill.currentCooldown = skill.cooldown;
    this.stats.stamina -= skill.staminaCost;

    this.lookAt(targetX, targetY);
    this.setAction('shoot', true);
    this.actionLockTimer = 0.42;

    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    const speed = 440;

    combat.spawnProjectile({
      owner: this.isPlayer ? 'player' : 'enemy',
      x: this.x + Math.cos(angle) * 24,
      y: this.y + Math.sin(angle) * 24 - 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 12,
      damage: 12,
      element: 'fire',
      lifetime: 0.85,
      maxLifetime: 0.85,
      piercing: false,
      isBasic: true,
      scale: 1.1,
    });

    sound.playFlamethrower();
    return true;
  }

  public castDragonClaw(targetX: number, targetY: number): boolean {
    if (this.isFainted || this.isDashing || this.hurtTimer > 0) return false;
    const skill = this.skills.dragonClaw;
    if (skill.currentCooldown > 0) return false;
    if (this.stats.stamina < skill.staminaCost) {
      if (this.isPlayer) this.notifyLowStamina();
      return false;
    }

    skill.currentCooldown = skill.cooldown;
    this.stats.stamina -= skill.staminaCost;

    this.lookAt(targetX, targetY);
    this.setAction('attack', true);
    this.actionLockTimer = 0.38;

    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    this.vx = Math.cos(angle) * 260;
    this.vy = Math.sin(angle) * 260;

    const hx = this.x + Math.cos(angle) * 44;
    const hy = this.y + Math.sin(angle) * 44;

    combat.spawnMeleeHitbox({
      owner: this.isPlayer ? 'player' : 'enemy',
      x: hx,
      y: hy,
      radius: 46,
      damage: 54,
      element: 'dragon',
      lifetime: 0.24,
      hasHit: false,
    });

    particles.emitSlashArc(hx, hy, angle, '#00ffff');
    sound.playSlash();
    return true;
  }

  public castFireBlast(targetX: number, targetY: number): boolean {
    if (this.isFainted || this.isDashing || this.hurtTimer > 0) return false;
    const skill = this.skills.fireBlast;
    if (skill.currentCooldown > 0) return false;
    if (this.stats.stamina < skill.staminaCost) {
      if (this.isPlayer) this.notifyLowStamina();
      return false;
    }

    skill.currentCooldown = skill.cooldown;
    this.stats.stamina -= skill.staminaCost;

    this.lookAt(targetX, targetY);
    this.setAction('shoot', true);
    this.actionLockTimer = 0.35;

    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    const speed = 310;

    combat.spawnProjectile({
      owner: this.isPlayer ? 'player' : 'enemy',
      x: this.x + Math.cos(angle) * 26,
      y: this.y + Math.sin(angle) * 26 - 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 20,
      damage: 64,
      element: 'fire',
      lifetime: 1.25,
      maxLifetime: 1.25,
      piercing: false,
      isFireBlast: true,
      hasExploded: false,
      scale: 1.8,
    });

    sound.playFireBlastLaunch();
    return true;
  }

  public override updateAI(dt: number, target: Pokemon, arenaRadius: number) {
    if (this.isFainted || target.isFainted) return;

    const diff = this.getDifficultyParams();

    this.aiBasicCooldown = Math.max(0, this.aiBasicCooldown - dt);
    this.aiSkill1Cooldown = Math.max(0, this.aiSkill1Cooldown - dt);
    this.aiSkill2Cooldown = Math.max(0, this.aiSkill2Cooldown - dt);
    this.aiDodgeCooldown = Math.max(0, this.aiDodgeCooldown - dt);
    this.aiPauseTimer = Math.max(0, this.aiPauseTimer - dt);

    if (this.pendingUltTimer > 0) {
      this.pendingUltTimer -= dt;
      if (this.pendingUltTimer <= 0 && this.pendingUltAim) {
        this.castFireBlast(this.pendingUltAim.x, this.pendingUltAim.y);
        this.pendingUltAim = null;
        this.aiSkill2Cooldown = (5.4 + Math.random() * 1.6) * diff.cooldownMult;
        this.aiPauseTimer = diff.pauseTime * 1.25;
      }
      return;
    }

    this.strafeChangeTimer -= dt;
    if (this.strafeChangeTimer <= 0) {
      this.strafeDirection = Math.random() < 0.5 ? 1 : -1;
      this.strafeChangeTimer = 1.4 + Math.random() * 1.6;
    }

    this.checkDodgeIncoming(dt);

    if (this.isDashing || this.hurtTimer > 0 || this.actionLockTimer > 0 || this.aiPauseTimer > 0) return;

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    this.lookAt(target.x, target.y);

    if (dist < 80 && this.aiSkill1Cooldown <= 0) {
      const aim = this.getAimWithSpread(target.x, target.y, diff.spread);
      this.castDragonClaw(aim.x, aim.y);
      this.aiSkill1Cooldown = (2.6 + Math.random() * 0.6) * diff.cooldownMult;
      this.aiPauseTimer = diff.pauseTime;
      return;
    }

    if (this.aiSkill2Cooldown <= 0 && dist < 380 && dist > 70) {
      const aim = this.getAimWithSpread(target.x, target.y, diff.spread);
      this.startUltTelegraph(aim.x, aim.y, '#ff6600', 0.45);
      return;
    }

    if (this.aiBasicCooldown <= 0 && dist < 420) {
      const aim = this.getAimWithSpread(target.x, target.y, diff.spread);
      this.castFlamethrower(aim.x, aim.y);
      this.aiBasicCooldown = (1.9 + Math.random() * 0.5) * diff.cooldownMult;
      this.aiPauseTimer = diff.pauseTime * 0.8;
      return;
    }

    const angle = Math.atan2(dy, dx);
    const perp = angle + (Math.PI / 2) * this.strafeDirection;
    let moveX = Math.cos(perp);
    let moveY = Math.sin(perp);

    if (dist < 180) {
      moveX -= Math.cos(angle) * 0.7;
      moveY -= Math.sin(angle) * 0.7;
    } else if (dist > 270) {
      moveX += Math.cos(angle) * 0.7;
      moveY += Math.sin(angle) * 0.7;
    }

    const mLen = Math.hypot(moveX, moveY);
    if (mLen > 0.1) {
      this.vx = (moveX / mLen) * this.stats.speed * diff.speedMult;
      this.vy = (moveY / mLen) * this.stats.speed * diff.speedMult;
      this.setAction('walk');
    } else {
      this.setAction('idle');
    }
  }

  private checkDodgeIncoming(dt: number) {
    if (this.aiDodgeCooldown > 0 || this.isDashing || this.hurtTimer > 0) return;
    const diff = this.getDifficultyParams();
    for (const proj of combat.projectiles) {
      if (proj.owner === (this.isPlayer ? 'player' : 'enemy')) continue;
      const dist = Math.hypot(proj.x - this.x, proj.y - this.y);
      if (dist < 105) {
        const dot = proj.vx * (this.x - proj.x) + proj.vy * (this.y - proj.y);
        if (dot > 0) {
          if (Math.random() < diff.dodgeChance) {
            const pAngle = Math.atan2(proj.vy, proj.vx);
            const dodgeAngle = pAngle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
            this.dash(Math.cos(dodgeAngle), Math.sin(dodgeAngle), 400, 0.2);
            this.aiDodgeCooldown = diff.dodgeCooldown + Math.random() * 1.5;
          } else {
            this.aiDodgeCooldown = 1.2;
          }
          return;
        }
      }
    }
  }
}

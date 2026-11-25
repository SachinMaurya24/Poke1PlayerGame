import { Pokemon } from './pokemon';
import { SkillInfo } from '../types';
import { combat } from '../combat';
import { sound } from '../audio';
import { particles } from '../particles';

export class Venusaur extends Pokemon {
  public skills: Record<string, SkillInfo> = {
    razorLeaf: {
      id: 'razorLeaf',
      name: 'Razor Leaf',
      type: 'projectile',
      element: 'grass',
      cooldown: 1.8,
      currentCooldown: 0,
      staminaCost: 0,
      keyHint: 'L-Click / J',
      description: 'Spinning sharp leaf blades (1.8s cooldown poke)',
      icon: '🍃',
    },
    vineWhip: {
      id: 'vineWhip',
      name: 'Vine Whip',
      type: 'melee',
      element: 'grass',
      cooldown: 2.4,
      currentCooldown: 0,
      staminaCost: 20,
      keyHint: 'R-Click / K',
      description: 'Wide lash of dual thorny vines that cleaves and knocks back',
      icon: '🌿',
    },
    solarBeam: {
      id: 'solarBeam',
      name: 'Solar Beam',
      type: 'projectile',
      element: 'grass',
      cooldown: 5.5,
      currentCooldown: 0,
      staminaCost: 35,
      keyHint: 'Space / E',
      description: 'Concentrated beam of intense solar energy with heavy knockback',
      icon: '☀️',
    },
    dash: {
      id: 'dash',
      name: 'Petal Dash',
      type: 'dash',
      element: 'normal',
      cooldown: 0.9,
      currentCooldown: 0,
      staminaCost: 25,
      keyHint: 'Shift',
      description: 'Evasive dash enveloped in swirling petals',
      icon: '🌸',
    },
  };

  // AI Cooldowns
  private razorLeafCooldown: number = 1.2;
  private solarBeamCooldown: number = 4.0;
  private vineWhipCooldown: number = 1.5;
  private dodgeCooldown: number = 2.0;
  private strafeDirection: number = 1;
  private strafeChangeTimer: number = 1.5;
  private aiPauseTimer: number = 0;

  constructor(x: number, y: number) {
    super(
      {
        name: 'Venusaur',
        dex: '0003',
        maxHp: 320,
        hp: 320,
        maxStamina: 100,
        stamina: 100,
        speed: 180,
        attackPower: 82,
        defense: 83,
        element: 'grass',
      },
      x,
      y
    );
    this.radius = 28;
  }

  public override getSkills(): Record<string, SkillInfo> {
    return this.skills;
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

  public override castBasicAttack(targetX: number, targetY: number): boolean {
    if (this.isFainted || this.isDashing || this.hurtTimer > 0) return false;
    const skill = this.skills.razorLeaf;
    if (skill.currentCooldown > 0) return false;

    skill.currentCooldown = skill.cooldown;
    this.lookAt(targetX, targetY);
    this.setAction('shoot', true);
    this.actionLockTimer = 0.38;

    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    const speed = 440;

    combat.spawnProjectile({
      owner: this.isPlayer ? 'player' : 'enemy',
      x: this.x + Math.cos(angle) * 26,
      y: this.y + Math.sin(angle) * 26 - 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 12,
      damage: 12, // Low chip damage
      element: 'grass',
      lifetime: 0.85,
      maxLifetime: 0.85,
      piercing: false,
      isBasic: true,
      scale: 1.15,
    });

    sound.playLeafSound();
    return true;
  }

  public override castSkill1(targetX: number, targetY: number): boolean {
    if (this.isFainted || this.isDashing || this.hurtTimer > 0) return false;
    const skill = this.skills.vineWhip;
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
    const hx = this.x + Math.cos(angle) * 48;
    const hy = this.y + Math.sin(angle) * 48;

    combat.spawnMeleeHitbox({
      owner: this.isPlayer ? 'player' : 'enemy',
      x: hx,
      y: hy,
      radius: 50,
      damage: 52,
      element: 'grass',
      lifetime: 0.25,
      hasHit: false,
    });

    particles.emitSlashArc(hx, hy, angle, '#4ade80');
    sound.playVineWhip();
    return true;
  }

  public override castSkill2(targetX: number, targetY: number): boolean {
    if (this.isFainted || this.isDashing || this.hurtTimer > 0) return false;
    const skill = this.skills.solarBeam;
    if (skill.currentCooldown > 0) return false;
    if (this.stats.stamina < skill.staminaCost) {
      if (this.isPlayer) this.notifyLowStamina();
      return false;
    }

    skill.currentCooldown = skill.cooldown;
    this.stats.stamina -= skill.staminaCost;

    this.lookAt(targetX, targetY);
    this.setAction('shoot', true);
    this.actionLockTimer = 0.45;

    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    const speed = 520;

    combat.spawnProjectile({
      owner: this.isPlayer ? 'player' : 'enemy',
      x: this.x + Math.cos(angle) * 28,
      y: this.y + Math.sin(angle) * 28 - 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 24,
      damage: 70,
      element: 'grass',
      lifetime: 1.0,
      maxLifetime: 1.0,
      piercing: true,
      isSolarBeam: true,
      scale: 1.8,
    });

    sound.playSolarBeam();
    return true;
  }

  public override updateAI(dt: number, target: Pokemon, arenaRadius: number) {
    if (this.isFainted || target.isFainted) return;

    const diff = this.getDifficultyParams();

    this.razorLeafCooldown = Math.max(0, this.razorLeafCooldown - dt);
    this.solarBeamCooldown = Math.max(0, this.solarBeamCooldown - dt);
    this.vineWhipCooldown = Math.max(0, this.vineWhipCooldown - dt);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
    this.aiPauseTimer = Math.max(0, this.aiPauseTimer - dt);

    if (this.pendingUltTimer > 0) {
      this.pendingUltTimer -= dt;
      if (this.pendingUltTimer <= 0 && this.pendingUltAim) {
        this.castSkill2(this.pendingUltAim.x, this.pendingUltAim.y);
        this.pendingUltAim = null;
        this.solarBeamCooldown = (5.6 + Math.random() * 1.6) * diff.cooldownMult;
        this.aiPauseTimer = diff.pauseTime * 1.25;
      }
      return;
    }

    this.strafeChangeTimer -= dt;
    if (this.strafeChangeTimer <= 0) {
      this.strafeDirection = Math.random() < 0.5 ? 1 : -1;
      this.strafeChangeTimer = 1.5 + Math.random() * 1.5;
    }

    this.checkDodgeIncoming(dt);

    if (this.isDashing || this.hurtTimer > 0 || this.actionLockTimer > 0 || this.aiPauseTimer > 0) return;

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    this.lookAt(target.x, target.y);

    if (dist < 85 && this.vineWhipCooldown <= 0) {
      const aim = this.getAimWithSpread(target.x, target.y, diff.spread);
      this.castSkill1(aim.x, aim.y);
      this.vineWhipCooldown = (2.7 + Math.random() * 0.6) * diff.cooldownMult;
      this.aiPauseTimer = diff.pauseTime;
      return;
    }

    if (this.solarBeamCooldown <= 0 && dist < 390 && dist > 80) {
      const aim = this.getAimWithSpread(target.x, target.y, diff.spread);
      this.startUltTelegraph(aim.x, aim.y, '#4ade80', 0.45);
      return;
    }

    if (this.razorLeafCooldown <= 0 && dist < 420) {
      const aim = this.getAimWithSpread(target.x, target.y, diff.spread);
      this.castBasicAttack(aim.x, aim.y);
      this.razorLeafCooldown = (1.9 + Math.random() * 0.5) * diff.cooldownMult;
      this.aiPauseTimer = diff.pauseTime * 0.8;
      return;
    }

    // Strafe and keep medium distance
    const angle = Math.atan2(dy, dx);
    const perp = angle + (Math.PI / 2) * this.strafeDirection;
    let moveX = Math.cos(perp);
    let moveY = Math.sin(perp);

    if (dist < 200) {
      moveX -= Math.cos(angle) * 0.7;
      moveY -= Math.sin(angle) * 0.7;
    } else if (dist > 280) {
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
    if (this.dodgeCooldown > 0 || this.isDashing || this.hurtTimer > 0) return;
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
            this.dash(Math.cos(dodgeAngle), Math.sin(dodgeAngle), 360, 0.2);
            this.dodgeCooldown = diff.dodgeCooldown + Math.random() * 1.5;
          } else {
            this.dodgeCooldown = 1.2;
          }
          return;
        }
      }
    }
  }
}

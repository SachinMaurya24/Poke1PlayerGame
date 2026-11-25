import { Pokemon } from './pokemon';
import { SkillInfo } from '../types';
import { combat } from '../combat';
import { sound } from '../audio';
import { particles } from '../particles';

export class Blastoise extends Pokemon {
  public skills: Record<string, SkillInfo> = {
    waterGun: {
      id: 'waterGun',
      name: 'Water Gun',
      type: 'projectile',
      element: 'water',
      cooldown: 1.8,
      currentCooldown: 0,
      staminaCost: 0,
      keyHint: 'L-Click / J',
      description: 'Twin pressurized water streams (1.8s poke)',
      icon: '💧',
    },
    skullBash: {
      id: 'skullBash',
      name: 'Skull Bash',
      type: 'melee',
      element: 'normal',
      cooldown: 2.2,
      currentCooldown: 0,
      staminaCost: 20,
      keyHint: 'R-Click / K',
      description: 'Heavy lunging shell tackle that staggers',
      icon: '🛡️',
    },
    hydroPump: {
      id: 'hydroPump',
      name: 'Hydro Pump',
      type: 'projectile',
      element: 'water',
      cooldown: 5.2,
      currentCooldown: 0,
      staminaCost: 32,
      keyHint: 'Space / E',
      description: 'Massive dual cannon water beam with piercing knockback',
      icon: '🌊',
    },
    dash: {
      id: 'dash',
      name: 'Rapid Spin',
      type: 'dash',
      element: 'normal',
      cooldown: 0.9,
      currentCooldown: 0,
      staminaCost: 25,
      keyHint: 'Shift',
      description: 'High-speed spinning shell evasion',
      icon: '💨',
    },
  };

  // AI Cooldowns
  private waterGunCooldown: number = 1.2;
  private hydroPumpCooldown: number = 4.0;
  private meleeCooldown: number = 1.5;
  private dodgeCooldown: number = 2.0;
  private strafeDirection: number = 1;
  private strafeChangeTimer: number = 1.5;
  private aiPauseTimer: number = 0;

  constructor(x: number, y: number) {
    super(
      {
        name: 'Blastoise',
        dex: '0009',
        maxHp: 310,
        hp: 310,
        maxStamina: 100,
        stamina: 100,
        speed: 185,
        attackPower: 83,
        defense: 100,
        element: 'water',
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
    return this.castWaterGun(targetX, targetY);
  }

  public override castSkill1(targetX: number, targetY: number): boolean {
    return this.castSkullBash(targetX, targetY);
  }

  public override castSkill2(targetX: number, targetY: number): boolean {
    return this.castHydroPump(targetX, targetY);
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

  public castWaterGun(targetX: number, targetY: number): boolean {
    if (this.isFainted || this.isDashing || this.hurtTimer > 0) return false;
    const skill = this.skills.waterGun;
    if (skill.currentCooldown > 0) return false;

    skill.currentCooldown = skill.cooldown;
    this.setAction('shoot', true);
    this.actionLockTimer = 0.4;

    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    const speed = 440;

    for (let i = -1; i <= 1; i += 2) {
      const offsetAngle = angle + (Math.PI / 2) * i;
      const ox = this.x + Math.cos(angle) * 16 + Math.cos(offsetAngle) * 10;
      const oy = this.y + Math.sin(angle) * 16 + Math.sin(offsetAngle) * 10 - 4;

      combat.spawnProjectile({
        owner: this.isPlayer ? 'player' : 'enemy',
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 10,
        damage: 8,
        element: 'water',
        lifetime: 0.85,
        maxLifetime: 0.85,
        piercing: false,
        scale: 0.95,
      });
    }

    sound.playWaterGun();
    return true;
  }

  public castSkullBash(targetX: number, targetY: number): boolean {
    if (this.isFainted || this.isDashing || this.hurtTimer > 0) return false;
    const skill = this.skills.skullBash;
    if (skill.currentCooldown > 0 || this.stats.stamina < skill.staminaCost) return false;

    skill.currentCooldown = skill.cooldown;
    this.stats.stamina -= skill.staminaCost;

    this.lookAt(targetX, targetY);
    this.setAction('attack', true);
    this.actionLockTimer = 0.35;

    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    this.vx = Math.cos(angle) * 290;
    this.vy = Math.sin(angle) * 290;

    const hx = this.x + Math.cos(angle) * 42;
    const hy = this.y + Math.sin(angle) * 42;

    combat.spawnMeleeHitbox({
      owner: this.isPlayer ? 'player' : 'enemy',
      x: hx,
      y: hy,
      radius: 46,
      damage: 50,
      element: 'normal',
      lifetime: 0.25,
      hasHit: false,
    });

    particles.emitSlashArc(hx, hy, angle, '#80d0ff');
    sound.playSlash();
    return true;
  }

  public castHydroPump(targetX: number, targetY: number): boolean {
    if (this.isFainted || this.isDashing || this.hurtTimer > 0) return false;
    const skill = this.skills.hydroPump;
    if (skill.currentCooldown > 0 || this.stats.stamina < skill.staminaCost) return false;

    skill.currentCooldown = skill.cooldown;
    this.stats.stamina -= skill.staminaCost;

    this.lookAt(targetX, targetY);
    this.setAction('shoot', true);
    this.actionLockTimer = 0.45;

    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    const speed = 520;

    combat.spawnProjectile({
      owner: this.isPlayer ? 'player' : 'enemy',
      x: this.x + Math.cos(angle) * 24,
      y: this.y + Math.sin(angle) * 24 - 4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 22,
      damage: 48,
      element: 'water',
      lifetime: 0.95,
      maxLifetime: 0.95,
      piercing: true,
      scale: 1.7,
    });

    particles.emitWaterBurst(this.x, this.y, Math.cos(angle) * 120, Math.sin(angle) * 120, 2.0);
    sound.playHydroPump();
    return true;
  }

  public override updateAI(dt: number, target: Pokemon, arenaRadius: number) {
    if (this.isFainted || target.isFainted) return;

    this.waterGunCooldown = Math.max(0, this.waterGunCooldown - dt);
    this.hydroPumpCooldown = Math.max(0, this.hydroPumpCooldown - dt);
    this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
    this.aiPauseTimer = Math.max(0, this.aiPauseTimer - dt);

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

    if (dist < 80 && this.meleeCooldown <= 0) {
      const aim = this.getAimWithSpread(target.x, target.y, 0.28);
      this.castSkullBash(aim.x, aim.y);
      this.meleeCooldown = 3.6 + Math.random() * 0.8;
      this.aiPauseTimer = 0.5;
      return;
    }

    if (this.hydroPumpCooldown <= 0 && dist < 380 && dist > 70) {
      const aim = this.getAimWithSpread(target.x, target.y, 0.34);
      this.castHydroPump(aim.x, aim.y);
      this.hydroPumpCooldown = 7.5 + Math.random() * 2.0;
      this.aiPauseTimer = 0.65;
      return;
    }

    if (this.waterGunCooldown <= 0 && dist < 420) {
      const aim = this.getAimWithSpread(target.x, target.y, 0.3);
      this.castWaterGun(aim.x, aim.y);
      this.waterGunCooldown = 2.6 + Math.random() * 0.8;
      this.aiPauseTimer = 0.4;
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
      this.vx = (moveX / mLen) * this.stats.speed * 0.72;
      this.vy = (moveY / mLen) * this.stats.speed * 0.72;
      this.setAction('walk');
    } else {
      this.setAction('idle');
    }
  }

  private checkDodgeIncoming(dt: number) {
    if (this.dodgeCooldown > 0 || this.isDashing || this.hurtTimer > 0) return;
    for (const proj of combat.projectiles) {
      if (proj.owner === (this.isPlayer ? 'player' : 'enemy')) continue;
      const dist = Math.hypot(proj.x - this.x, proj.y - this.y);
      if (dist < 105) {
        const dot = proj.vx * (this.x - proj.x) + proj.vy * (this.y - proj.y);
        if (dot > 0) {
          if (Math.random() < 0.25) {
            const pAngle = Math.atan2(proj.vy, proj.vx);
            const dodgeAngle = pAngle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
            this.dash(Math.cos(dodgeAngle), Math.sin(dodgeAngle), 360, 0.2);
            this.dodgeCooldown = 5.5 + Math.random() * 2.0;
          } else {
            this.dodgeCooldown = 1.2;
          }
          return;
        }
      }
    }
  }
}

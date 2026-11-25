import { Pokemon } from './pokemon';
import { SkillInfo } from '../types';
import { combat } from '../combat';
import { sound } from '../audio';
import { particles } from '../particles';

export class Lucario extends Pokemon {
  public skills: Record<string, SkillInfo> = {
    auraSphere: {
      id: 'auraSphere',
      name: 'Aura Sphere',
      type: 'projectile',
      element: 'fighting',
      cooldown: 1.8,
      currentCooldown: 0,
      staminaCost: 0,
      keyHint: 'L-Click / J',
      description: 'Focused sphere of concentrated aura energy (1.8s poke)',
      icon: '🔮',
    },
    closeCombat: {
      id: 'closeCombat',
      name: 'Close Combat',
      type: 'melee',
      element: 'fighting',
      cooldown: 2.2,
      currentCooldown: 0,
      staminaCost: 20,
      keyHint: 'R-Click / K',
      description: 'Rapid rush of crushing punches that heavily staggers',
      icon: '🥊',
    },
    boneRush: {
      id: 'boneRush',
      name: 'Bone Rush',
      type: 'projectile',
      element: 'steel',
      cooldown: 5.0,
      currentCooldown: 0,
      staminaCost: 30,
      keyHint: 'Space / E',
      description: 'Lunging aura-infused strike with high impact shockwave',
      icon: '⚡',
    },
    dash: {
      id: 'dash',
      name: 'Extreme Speed',
      type: 'dash',
      element: 'normal',
      cooldown: 0.85,
      currentCooldown: 0,
      staminaCost: 22,
      keyHint: 'Shift',
      description: 'Lightning-fast burst of extreme evasive speed',
      icon: '💨',
    },
  };

  // AI Cooldowns
  private auraSphereCooldown: number = 1.2;
  private boneRushCooldown: number = 4.0;
  private closeCombatCooldown: number = 1.5;
  private dodgeCooldown: number = 2.0;
  private strafeDirection: number = 1;
  private strafeChangeTimer: number = 1.2;
  private aiPauseTimer: number = 0;

  constructor(x: number, y: number) {
    super(
      {
        name: 'Lucario',
        dex: '0448',
        maxHp: 270,
        hp: 270,
        maxStamina: 100,
        stamina: 100,
        speed: 230,
        attackPower: 110,
        defense: 70,
        element: 'fighting',
      },
      x,
      y
    );
    this.radius = 24;
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
    const skill = this.skills.auraSphere;
    if (skill.currentCooldown > 0) return false;

    skill.currentCooldown = skill.cooldown;
    this.lookAt(targetX, targetY);
    this.setAction('shoot', true); // maps to Charge
    this.actionLockTimer = 0.35;

    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    const speed = 460;

    combat.spawnProjectile({
      owner: this.isPlayer ? 'player' : 'enemy',
      x: this.x + Math.cos(angle) * 22,
      y: this.y + Math.sin(angle) * 22 - 4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 13,
      damage: 13, // Low chip poke
      element: 'fighting',
      lifetime: 0.85,
      maxLifetime: 0.85,
      piercing: false,
      isBasic: true,
      scale: 1.2,
    });

    sound.playAuraSphere();
    return true;
  }

  public override castSkill1(targetX: number, targetY: number): boolean {
    if (this.isFainted || this.isDashing || this.hurtTimer > 0) return false;
    const skill = this.skills.closeCombat;
    if (skill.currentCooldown > 0) return false;
    if (this.stats.stamina < skill.staminaCost) {
      if (this.isPlayer) this.notifyLowStamina();
      return false;
    }

    skill.currentCooldown = skill.cooldown;
    this.stats.stamina -= skill.staminaCost;

    this.lookAt(targetX, targetY);
    this.setAction('attack', true);
    this.actionLockTimer = 0.35;

    const angle = Math.atan2(targetY - this.y, targetX - this.x);

    // Forward lunge
    this.vx = Math.cos(angle) * 300;
    this.vy = Math.sin(angle) * 300;

    const hx = this.x + Math.cos(angle) * 44;
    const hy = this.y + Math.sin(angle) * 44;

    combat.spawnMeleeHitbox({
      owner: this.isPlayer ? 'player' : 'enemy',
      x: hx,
      y: hy,
      radius: 46,
      damage: 60,
      element: 'fighting',
      lifetime: 0.25,
      hasHit: false,
    });

    particles.emitSlashArc(hx, hy, angle, '#38bdf8');
    sound.playPunchFlurry();
    return true;
  }

  public override castSkill2(targetX: number, targetY: number): boolean {
    if (this.isFainted || this.isDashing || this.hurtTimer > 0) return false;
    const skill = this.skills.boneRush;
    if (skill.currentCooldown > 0) return false;
    if (this.stats.stamina < skill.staminaCost) {
      if (this.isPlayer) this.notifyLowStamina();
      return false;
    }

    skill.currentCooldown = skill.cooldown;
    this.stats.stamina -= skill.staminaCost;

    this.lookAt(targetX, targetY);
    this.setAction('shoot', true);
    this.actionLockTimer = 0.38;

    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    const speed = 490;

    combat.spawnProjectile({
      owner: this.isPlayer ? 'player' : 'enemy',
      x: this.x + Math.cos(angle) * 24,
      y: this.y + Math.sin(angle) * 24 - 4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 20,
      damage: 66,
      element: 'steel',
      lifetime: 1.0,
      maxLifetime: 1.0,
      piercing: false,
      isBoneRush: true,
      scale: 1.6,
    });

    particles.emitAuraBurst(this.x, this.y, Math.cos(angle) * 160, Math.sin(angle) * 160, 2.0);
    sound.playAuraSphere();
    return true;
  }

  public override updateAI(dt: number, target: Pokemon, arenaRadius: number) {
    if (this.isFainted || target.isFainted) return;

    const diff = this.getDifficultyParams();

    this.auraSphereCooldown = Math.max(0, this.auraSphereCooldown - dt);
    this.boneRushCooldown = Math.max(0, this.boneRushCooldown - dt);
    this.closeCombatCooldown = Math.max(0, this.closeCombatCooldown - dt);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
    this.aiPauseTimer = Math.max(0, this.aiPauseTimer - dt);

    if (this.pendingUltTimer > 0) {
      this.pendingUltTimer -= dt;
      if (this.pendingUltTimer <= 0 && this.pendingUltAim) {
        this.castSkill2(this.pendingUltAim.x, this.pendingUltAim.y);
        this.pendingUltAim = null;
        this.boneRushCooldown = (5.4 + Math.random() * 1.6) * diff.cooldownMult;
        this.aiPauseTimer = diff.pauseTime * 1.25;
      }
      return;
    }

    this.strafeChangeTimer -= dt;
    if (this.strafeChangeTimer <= 0) {
      this.strafeDirection = Math.random() < 0.5 ? 1 : -1;
      this.strafeChangeTimer = 1.2 + Math.random() * 1.4;
    }

    this.checkDodgeIncoming(dt);

    if (this.isDashing || this.hurtTimer > 0 || this.actionLockTimer > 0 || this.aiPauseTimer > 0) return;

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    this.lookAt(target.x, target.y);

    // Lucario is an aggressive melee/rushdown fighter
    if (dist < 85 && this.closeCombatCooldown <= 0) {
      const aim = this.getAimWithSpread(target.x, target.y, diff.spread);
      this.castSkill1(aim.x, aim.y);
      this.closeCombatCooldown = (2.6 + Math.random() * 0.6) * diff.cooldownMult;
      this.aiPauseTimer = diff.pauseTime;
      return;
    }

    if (this.boneRushCooldown <= 0 && dist < 320 && dist > 60) {
      const aim = this.getAimWithSpread(target.x, target.y, diff.spread);
      this.startUltTelegraph(aim.x, aim.y, '#38bdf8', 0.45);
      return;
    }

    if (this.auraSphereCooldown <= 0 && dist < 380) {
      const aim = this.getAimWithSpread(target.x, target.y, diff.spread);
      this.castBasicAttack(aim.x, aim.y);
      this.auraSphereCooldown = (1.9 + Math.random() * 0.5) * diff.cooldownMult;
      this.aiPauseTimer = diff.pauseTime * 0.8;
      return;
    }

    // Approach target with moderate strafe
    const angle = Math.atan2(dy, dx);
    const perp = angle + (Math.PI / 2) * this.strafeDirection;
    let moveX = Math.cos(angle) * 0.8 + Math.cos(perp) * 0.4;
    let moveY = Math.sin(angle) * 0.8 + Math.sin(perp) * 0.4;

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
            this.dash(Math.cos(dodgeAngle), Math.sin(dodgeAngle), 400, 0.2);
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

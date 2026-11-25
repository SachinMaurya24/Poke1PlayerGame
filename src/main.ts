import { spriteManager } from './sprite';
import { arena } from './arena';
import { Pokemon } from './entities/pokemon';
import { createPokemon } from './entities/factory';
import { combat } from './combat';
import { particles } from './particles';
import { ui, PokemonId, POKEMON_ROSTER } from './ui';
import { Difficulty, Direction } from './types';

class GameApp {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;

  private player!: Pokemon;
  private enemy!: Pokemon;

  private currentPlayerId: PokemonId = 'charizard';
  private currentBotId: PokemonId = 'blastoise';
  private currentDifficulty: Difficulty = 'easy';

  // Input states
  private keys: Record<string, boolean> = {};
  private mouseX: number = 0;
  private mouseY: number = 0;
  private lastMouseMoveTime: number = 0;
  private isMouseDownLeft: boolean = false;
  private isMouseDownRight: boolean = false;
  private bufferedAction: { type: 'basic' | 'skill1' | 'skill2'; expiresAt: number; fromKeyboard: boolean } | null = null;

  // Screen shake
  private screenShakeAmount: number = 0;

  // Damage statistics
  private totalPlayerDamage: number = 0;

  private lastTime: number = 0;

  public async start() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    // Set up inputs
    this.setupInputs();

    // Setup UI Callbacks
    ui.onStartBattleCallback = (playerId: PokemonId, botId: PokemonId, difficulty: Difficulty) => {
      this.currentPlayerId = playerId;
      this.currentBotId = botId;
      this.currentDifficulty = difficulty;
      this.startMatch(playerId, botId, difficulty);
    };

    ui.init();

    // Hook rematch button
    const rematchBtn = document.getElementById('rematch-btn');
    if (rematchBtn) {
      rematchBtn.addEventListener('click', () => {
        this.startMatch(this.currentPlayerId, this.currentBotId, this.currentDifficulty);
      });
    }

    // Preload sprites for all 4 Pokémon: Venusaur (0003), Charizard (0006), Blastoise (0009), Lucario (0448)
    await spriteManager.preload(['0003', '0006', '0009', '0448']);

    // Default fighter setup for HUD
    this.player = createPokemon('charizard', -180, 0, true);
    this.enemy = createPokemon('blastoise', 180, 0, false);

    // Start game loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  public startMatch(playerId: PokemonId, botId: PokemonId, difficulty: Difficulty = 'easy') {
    this.currentPlayerId = playerId;
    this.currentBotId = botId;
    this.currentDifficulty = difficulty;

    this.player = createPokemon(playerId, -180, 0, true);
    this.enemy = createPokemon(botId, 180, 0, false);
    this.enemy.difficulty = difficulty;

    this.player.lookAt(180, 0);
    this.enemy.lookAt(-180, 0);

    combat.projectiles = [];
    combat.meleeHitboxes = [];
    combat.damageNumbers = [];
    combat.telegraphs = [];
    this.bufferedAction = null;
    this.totalPlayerDamage = 0;

    const playerMeta = POKEMON_ROSTER[playerId];
    const enemyMeta = POKEMON_ROSTER[botId];

    arena.playerLabel = playerMeta.name;
    arena.enemyLabel = enemyMeta.name;

    ui.setupFighterHUD(playerMeta, enemyMeta);
    ui.showIntro(playerMeta.name, enemyMeta.name);
  }

  private setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.handleDash();
      }
      if (e.code === 'Space' || e.code === 'KeyE') {
        this.handleSkill2(true);
      }
      if (e.code === 'KeyJ') {
        this.handleBasicAttack(true);
      }
      if (e.code === 'KeyK') {
        this.handleSkill1(true);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      this.mouseX = (e.clientX - rect.left) * scaleX - this.canvas.width / 2;
      this.mouseY = (e.clientY - rect.top) * scaleY - this.canvas.height / 2;
      this.lastMouseMoveTime = performance.now();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.lastMouseMoveTime = performance.now();
      if (e.button === 0) {
        this.isMouseDownLeft = true;
        this.handleBasicAttack(false);
      } else if (e.button === 2) {
        this.isMouseDownRight = true;
        this.handleSkill1(false);
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDownLeft = false;
      } else if (e.button === 2) {
        this.isMouseDownRight = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handleDash() {
    if (ui.gameState !== 'fighting' || !this.player) return;
    let dx = 0;
    let dy = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

    this.player.dash(dx, dy);
  }

  private getAimTarget(fromKeyboard: boolean): { x: number; y: number } {
    const mouseIdle = performance.now() - this.lastMouseMoveTime > 2500;
    if (fromKeyboard && mouseIdle && this.player) {
      const dirAngles = [
        Math.PI / 2,
        Math.PI / 4,
        0,
        -Math.PI / 4,
        -Math.PI / 2,
        (-3 * Math.PI) / 4,
        Math.PI,
        (3 * Math.PI) / 4,
      ];
      const angle = dirAngles[this.player.facingDirection as Direction] ?? 0;
      return {
        x: this.player.x + Math.cos(angle) * 180,
        y: this.player.y + Math.sin(angle) * 180,
      };
    }
    return { x: this.mouseX, y: this.mouseY };
  }

  private tryExecuteAttack(type: 'basic' | 'skill1' | 'skill2', fromKeyboard: boolean): boolean {
    if (ui.gameState !== 'fighting' || !this.player) return false;
    const aim = this.getAimTarget(fromKeyboard);
    if (type === 'basic') return this.player.castBasicAttack(aim.x, aim.y);
    if (type === 'skill1') return this.player.castSkill1(aim.x, aim.y);
    return this.player.castSkill2(aim.x, aim.y);
  }

  private handleBasicAttack(fromKeyboard: boolean = false) {
    if (ui.gameState !== 'fighting' || !this.player) return;
    if (!this.tryExecuteAttack('basic', fromKeyboard)) {
      this.bufferedAction = { type: 'basic', expiresAt: performance.now() + 160, fromKeyboard };
    }
  }

  private handleSkill1(fromKeyboard: boolean = false) {
    if (ui.gameState !== 'fighting' || !this.player) return;
    if (!this.tryExecuteAttack('skill1', fromKeyboard)) {
      this.bufferedAction = { type: 'skill1', expiresAt: performance.now() + 160, fromKeyboard };
    }
  }

  private handleSkill2(fromKeyboard: boolean = false) {
    if (ui.gameState !== 'fighting' || !this.player) return;
    if (!this.tryExecuteAttack('skill2', fromKeyboard)) {
      this.bufferedAction = { type: 'skill2', expiresAt: performance.now() + 160, fromKeyboard };
    }
  }

  private processPlayerMovement(dt: number) {
    if (!this.player || this.player.isDashing || this.player.isFainted || this.player.hurtTimer > 0) return;

    let moveX = 0;
    let moveY = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveY -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveY += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    const len = Math.hypot(moveX, moveY);
    if (len > 0.001) {
      const spd = this.player.stats.speed;
      this.player.vx = (moveX / len) * spd;
      this.player.vy = (moveY / len) * spd;

      if (this.player.actionLockTimer <= 0) {
        this.player.lookAt(this.player.x + moveX, this.player.y + moveY);
        this.player.setAction('walk');
      }
    } else {
      if (this.player.actionLockTimer <= 0) {
        this.player.setAction('idle');
      }
    }
  }

  private checkCombatCollisions() {
    // 1. Projectiles vs Entities
    for (let i = combat.projectiles.length - 1; i >= 0; i--) {
      const p = combat.projectiles[i];

      if (p.owner === 'player' && this.enemy && !this.enemy.isFainted) {
        if (p.hasHitTarget) continue;
        const dist = Math.hypot(p.x - this.enemy.x, p.y - this.enemy.y);
        if (dist < p.radius + this.enemy.radius) {
          p.hasHitTarget = true;
          const kx = p.vx * 0.25;
          const ky = p.vy * 0.25;
          const preHp = this.enemy.stats.hp;
          this.enemy.takeDamage(p.damage, p.element, kx, ky, p.isBasic ? 0.05 : 0.28);
          this.totalPlayerDamage += Math.max(0, preHp - this.enemy.stats.hp);

          if (p.isFireBlast && !p.hasExploded) {
            combat.explodeFireBlast(p);
          } else {
            particles.emitExplosion(p.x, p.y, p.element === 'fire' ? 'fire' : 'water');
          }

          if (!p.piercing) {
            combat.projectiles.splice(i, 1);
            continue;
          }
        }
      } else if (p.owner === 'enemy' && this.player && !this.player.isFainted) {
        if (p.hasHitTarget) continue;
        const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        if (dist < p.radius + this.player.radius) {
          p.hasHitTarget = true;
          const kx = p.vx * 0.35;
          const ky = p.vy * 0.35;
          this.player.takeDamage(p.damage, p.element, kx, ky, p.isBasic ? 0.05 : 0.28);

          particles.emitExplosion(p.x, p.y, p.element === 'fire' ? 'fire' : 'water');
          this.screenShakeAmount = Math.max(this.screenShakeAmount, p.scale ? p.scale * 6 : 4);

          if (!p.piercing) {
            combat.projectiles.splice(i, 1);
            continue;
          }
        }
      }
    }

    // 2. Melee Hitboxes vs Entities
    for (const m of combat.meleeHitboxes) {
      if (m.hasHit) continue;

      if (m.owner === 'player' && this.enemy && !this.enemy.isFainted) {
        const dist = Math.hypot(m.x - this.enemy.x, m.y - this.enemy.y);
        if (dist < m.radius + this.enemy.radius) {
          m.hasHit = true;
          const angle = Math.atan2(this.enemy.y - this.player.y, this.enemy.x - this.player.x);
          const kx = Math.cos(angle) * 360;
          const ky = Math.sin(angle) * 360;

          const preHp = this.enemy.stats.hp;
          this.enemy.takeDamage(m.damage, m.element, kx, ky);
          this.totalPlayerDamage += Math.max(0, preHp - this.enemy.stats.hp);

          this.screenShakeAmount = 7;
        }
      } else if (m.owner === 'enemy' && this.player && !this.player.isFainted) {
        const dist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
        if (dist < m.radius + this.player.radius) {
          m.hasHit = true;
          const angle = Math.atan2(this.player.y - this.enemy.y, this.player.x - this.enemy.x);
          const kx = Math.cos(angle) * 320;
          const ky = Math.sin(angle) * 320;

          this.player.takeDamage(m.damage, m.element, kx, ky);
          this.screenShakeAmount = 9;
        }
      }
    }
  }

  private loop(timestamp: number) {
    const rawDt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    const dt = Math.min(rawDt, 0.1);

    arena.update(dt);

    if (this.player) {
      if (ui.gameState === 'fighting') {
        if (this.bufferedAction) {
          if (performance.now() <= this.bufferedAction.expiresAt) {
            if (this.tryExecuteAttack(this.bufferedAction.type, this.bufferedAction.fromKeyboard)) {
              this.bufferedAction = null;
            }
          } else {
            this.bufferedAction = null;
          }
        }
        if (this.isMouseDownLeft) {
          this.tryExecuteAttack('basic', false);
        }
      }
      this.processPlayerMovement(dt);
      this.player.update(dt, arena.radius);
    }

    if (this.enemy) {
      if (ui.gameState === 'fighting') {
        this.enemy.updateAI(dt, this.player, arena.radius);
      }
      this.enemy.update(dt, arena.radius);
    }

    combat.update(dt, arena.radius);
    particles.update(dt);

    if (ui.gameState === 'fighting') {
      this.checkCombatCollisions();
    }

    if (this.player && this.enemy) {
      const playerMeta = POKEMON_ROSTER[this.currentPlayerId];
      ui.update(dt, this.player, this.enemy, this.totalPlayerDamage, playerMeta);
    }

    if (this.screenShakeAmount > 0) {
      this.screenShakeAmount = Math.max(0, this.screenShakeAmount - dt * 25);
    }

    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  private render() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    ctx.translate(width / 2, height / 2);

    if (this.screenShakeAmount > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShakeAmount * 2;
      const shakeY = (Math.random() - 0.5) * this.screenShakeAmount * 2;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Colosseum Arena
    arena.draw(ctx);

    // 2. Ground Marks & Enemy Telegraphs
    particles.drawGroundMarks(ctx);
    combat.drawTelegraphs(ctx);

    // 3. Entities
    if (this.player && this.enemy) {
      const entities = [this.player, this.enemy];
      entities.sort((a, b) => a.y - b.y);
      for (const ent of entities) {
        ent.draw(ctx);
      }
    }

    // 4. Projectiles & Slashes
    combat.drawProjectiles(ctx);
    particles.draw(ctx);

    // 5. Floating Numbers
    combat.drawDamageNumbers(ctx);

    // 6. Crosshair Reticle
    this.drawReticle(ctx);

    ctx.restore();
  }

  private drawReticle(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Directional aim line & close-range melee arc preview during combat
    if (ui.gameState === 'fighting' && this.player && !this.player.isFainted) {
      const dx = this.mouseX - this.player.x;
      const dy = this.mouseY - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 12) {
        const angle = Math.atan2(dy, dx);
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(this.player.x + Math.cos(angle) * 26, this.player.y + Math.sin(angle) * 26);
        ctx.lineTo(this.mouseX, this.mouseY);
        ctx.stroke();

        // Melee arc preview when cursor is near the player
        if (dist < 125) {
          ctx.setLineDash([]);
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(this.player.x, this.player.y, 58, angle - 0.55, angle + 0.55);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(this.mouseX, this.mouseY, 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.mouseX - 18, this.mouseY);
    ctx.lineTo(this.mouseX - 6, this.mouseY);
    ctx.moveTo(this.mouseX + 6, this.mouseY);
    ctx.lineTo(this.mouseX + 18, this.mouseY);
    ctx.moveTo(this.mouseX, this.mouseY - 18);
    ctx.lineTo(this.mouseX, this.mouseY - 6);
    ctx.moveTo(this.mouseX, this.mouseY + 6);
    ctx.lineTo(this.mouseX, this.mouseY + 18);
    ctx.stroke();

    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(this.mouseX, this.mouseY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new GameApp();
  app.start().catch((err) => console.error('Error starting game:', err));
});

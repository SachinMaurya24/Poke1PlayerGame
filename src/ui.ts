import { Pokemon } from './entities/pokemon';
import { sound } from './audio';

export type GameState = 'menu' | 'intro' | 'fighting' | 'finished';
export type PokemonId = 'charizard' | 'blastoise' | 'venusaur' | 'lucario';

export interface PokemonMeta {
  id: PokemonId;
  name: string;
  dex: string;
  title: string;
  typeBadge1: string;
  typeClass1: string;
  typeBadge2?: string;
  typeClass2?: string;
  portrait: string;
  angryPortrait: string;
  color: string;
  hp: number;
  speed: number;
  skills: { key: string; name: string; icon: string }[];
}

export const POKEMON_ROSTER: Record<PokemonId, PokemonMeta> = {
  charizard: {
    id: 'charizard',
    name: 'CHARIZARD',
    dex: '0006',
    title: 'Flame Pokémon',
    typeBadge1: 'FIRE',
    typeClass1: 'type-fire',
    typeBadge2: 'FLYING',
    typeClass2: 'type-flying',
    portrait: '/assets/portraits/charizard_Normal.png',
    angryPortrait: '/assets/portraits/charizard_Angry.png',
    color: '#ea580c',
    hp: 280,
    speed: 215,
    skills: [
      { key: 'L-CLICK', name: 'Flamethrower', icon: '🔥' },
      { key: 'R-CLICK', name: 'Dragon Claw', icon: '⚔️' },
      { key: 'SPACE', name: 'Fire Blast', icon: '💥' },
      { key: 'SHIFT', name: 'Wing Dash', icon: '💨' },
    ],
  },
  blastoise: {
    id: 'blastoise',
    name: 'BLASTOISE',
    dex: '0009',
    title: 'Shellfish Pokémon',
    typeBadge1: 'WATER',
    typeClass1: 'type-water',
    portrait: '/assets/portraits/blastoise_Normal.png',
    angryPortrait: '/assets/portraits/blastoise_Angry.png',
    color: '#2563eb',
    hp: 310,
    speed: 185,
    skills: [
      { key: 'L-CLICK', name: 'Water Gun', icon: '💧' },
      { key: 'R-CLICK', name: 'Skull Bash', icon: '🛡️' },
      { key: 'SPACE', name: 'Hydro Pump', icon: '🌊' },
      { key: 'SHIFT', name: 'Rapid Spin', icon: '💨' },
    ],
  },
  venusaur: {
    id: 'venusaur',
    name: 'VENUSAUR',
    dex: '0003',
    title: 'Seed Pokémon',
    typeBadge1: 'GRASS',
    typeClass1: 'type-grass',
    typeBadge2: 'POISON',
    typeClass2: 'type-poison',
    portrait: '/assets/portraits/venusaur_Normal.png',
    angryPortrait: '/assets/portraits/venusaur_Angry.png',
    color: '#16a34a',
    hp: 320,
    speed: 180,
    skills: [
      { key: 'L-CLICK', name: 'Razor Leaf', icon: '🍃' },
      { key: 'R-CLICK', name: 'Vine Whip', icon: '🌿' },
      { key: 'SPACE', name: 'Solar Beam', icon: '☀️' },
      { key: 'SHIFT', name: 'Petal Dash', icon: '🌸' },
    ],
  },
  lucario: {
    id: 'lucario',
    name: 'LUCARIO',
    dex: '0448',
    title: 'Aura Pokémon',
    typeBadge1: 'FIGHTING',
    typeClass1: 'type-fighting',
    typeBadge2: 'STEEL',
    typeClass2: 'type-steel',
    portrait: '/assets/portraits/lucario_Normal.png',
    angryPortrait: '/assets/portraits/lucario_Angry.png',
    color: '#0284c7',
    hp: 270,
    speed: 230,
    skills: [
      { key: 'L-CLICK', name: 'Aura Sphere', icon: '🔮' },
      { key: 'R-CLICK', name: 'Close Combat', icon: '🥊' },
      { key: 'SPACE', name: 'Bone Rush', icon: '⚡' },
      { key: 'SHIFT', name: 'Extreme Speed', icon: '💨' },
    ],
  },
};

export class UIManager {
  // Pre-Match Selection Screen
  private selectionScreen!: HTMLElement;
  public selectedPlayerId: PokemonId = 'charizard';
  public selectedBotId: PokemonId | 'random' = 'blastoise';
  public onStartBattleCallback?: (playerId: PokemonId, botId: PokemonId) => void;

  // In-Game Top HUD
  private playerCardName!: HTMLElement;
  private playerTypeTags!: HTMLElement;
  private playerHpBar!: HTMLElement;
  private playerHpDelayBar!: HTMLElement;
  private playerHpText!: HTMLElement;
  private playerStaminaBar!: HTMLElement;
  private playerPortrait!: HTMLImageElement;

  private enemyCardName!: HTMLElement;
  private enemyTypeTags!: HTMLElement;
  private enemyHpBar!: HTMLElement;
  private enemyHpDelayBar!: HTMLElement;
  private enemyHpText!: HTMLElement;
  private enemyPortrait!: HTMLImageElement;

  private timerText!: HTMLElement;
  private soundBtn!: HTMLElement;

  // Action Hotbar Slots
  private slotIcons: HTMLElement[] = [];
  private slotKeys: HTMLElement[] = [];
  private slotOverlays: HTMLElement[] = [];

  // Match Banner Overlay
  private bannerOverlay!: HTMLElement;
  private bannerTitle!: HTMLElement;
  private bannerSubtitle!: HTMLElement;
  private rematchBtn!: HTMLElement;
  private changeFightersBtn!: HTMLElement;

  private matchTime: number = 0;
  public gameState: GameState = 'menu';

  public init() {
    this.selectionScreen = document.getElementById('selection-screen')!;

    // Top HUD
    this.playerCardName = document.getElementById('player-name')!;
    this.playerTypeTags = document.getElementById('player-types')!;
    this.playerHpBar = document.getElementById('player-hp-fill')!;
    this.playerHpDelayBar = document.getElementById('player-hp-delay')!;
    this.playerHpText = document.getElementById('player-hp-text')!;
    this.playerStaminaBar = document.getElementById('player-stamina-fill')!;
    this.playerPortrait = document.getElementById('player-portrait') as HTMLImageElement;

    this.enemyCardName = document.getElementById('enemy-name')!;
    this.enemyTypeTags = document.getElementById('enemy-types')!;
    this.enemyHpBar = document.getElementById('enemy-hp-fill')!;
    this.enemyHpDelayBar = document.getElementById('enemy-hp-delay')!;
    this.enemyHpText = document.getElementById('enemy-hp-text')!;
    this.enemyPortrait = document.getElementById('enemy-portrait') as HTMLImageElement;

    this.timerText = document.getElementById('match-timer')!;
    this.soundBtn = document.getElementById('sound-toggle-btn')!;

    // Action Slots (4 slots)
    for (let i = 0; i < 4; i++) {
      this.slotIcons.push(document.getElementById(`skill-icon-${i}`)!);
      this.slotKeys.push(document.getElementById(`skill-key-${i}`)!);
      this.slotOverlays.push(document.getElementById(`skill-cd-${i}`)!);
    }

    // Banner
    this.bannerOverlay = document.getElementById('match-banner')!;
    this.bannerTitle = document.getElementById('banner-title')!;
    this.bannerSubtitle = document.getElementById('banner-subtitle')!;
    this.rematchBtn = document.getElementById('rematch-btn')!;
    this.changeFightersBtn = document.getElementById('change-fighters-btn')!;

    // Sound toggle
    const toggleSound = () => {
      sound.enabled = !sound.enabled;
      const label = sound.enabled ? '🔊 SOUND ON' : '🔇 MUTED';
      document.querySelectorAll('.sound-toggle-btn, #sound-toggle-btn').forEach((btn) => {
        btn.textContent = label;
        btn.classList.toggle('muted', !sound.enabled);
      });
    };

    document.querySelectorAll('.sound-toggle-btn, #sound-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', toggleSound);
    });

    // Change fighters button
    this.changeFightersBtn.addEventListener('click', () => {
      this.showSelectionScreen();
    });

    // Setup character selector card clicks
    this.setupSelectionUI();
    this.showSelectionScreen();
  }

  private setupSelectionUI() {
    // Player choices
    const playerPills = document.querySelectorAll('.roster-card.p1');
    playerPills.forEach((card) => {
      card.addEventListener('click', () => {
        playerPills.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedPlayerId = card.getAttribute('data-id') as PokemonId;
      });
    });

    // Bot choices
    const botPills = document.querySelectorAll('.roster-card.cpu');
    botPills.forEach((card) => {
      card.addEventListener('click', () => {
        botPills.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        const botVal = card.getAttribute('data-id');
        this.selectedBotId = botVal === 'random' ? 'random' : (botVal as PokemonId);
      });
    });

    // Start battle button
    const startBtn = document.getElementById('start-battle-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        let actualBotId = this.selectedBotId;
        if (actualBotId === 'random') {
          const ids: PokemonId[] = ['charizard', 'blastoise', 'venusaur', 'lucario'];
          actualBotId = ids[Math.floor(Math.random() * ids.length)];
        }
        this.selectionScreen.style.display = 'none';
        if (this.onStartBattleCallback) {
          this.onStartBattleCallback(this.selectedPlayerId, actualBotId as PokemonId);
        }
      });
    }
  }

  public showSelectionScreen() {
    this.gameState = 'menu';
    this.bannerOverlay.style.display = 'none';
    this.selectionScreen.style.display = 'flex';
  }

  public setupFighterHUD(playerMeta: PokemonMeta, enemyMeta: PokemonMeta) {
    // Player HUD
    this.playerCardName.textContent = playerMeta.name;
    this.playerCardName.style.color = playerMeta.color;
    this.playerPortrait.src = playerMeta.portrait;

    let pTags = `<span class="type-tag ${playerMeta.typeClass1}">${playerMeta.typeBadge1}</span>`;
    if (playerMeta.typeBadge2 && playerMeta.typeClass2) {
      pTags += `<span class="type-tag ${playerMeta.typeClass2}">${playerMeta.typeBadge2}</span>`;
    }
    this.playerTypeTags.innerHTML = pTags;

    // Enemy HUD
    this.enemyCardName.textContent = `${enemyMeta.name} [CPU]`;
    this.enemyCardName.style.color = enemyMeta.color;
    this.enemyPortrait.src = enemyMeta.angryPortrait;

    let eTags = `<span class="type-tag ${enemyMeta.typeClass1}">${enemyMeta.typeBadge1}</span>`;
    if (enemyMeta.typeBadge2 && enemyMeta.typeClass2) {
      eTags += `<span class="type-tag ${enemyMeta.typeClass2}">${enemyMeta.typeBadge2}</span>`;
    }
    this.enemyTypeTags.innerHTML = eTags;

    // Reset Bars to Full on HUD initialization
    this.playerHpBar.style.width = '100%';
    this.playerHpDelayBar.style.width = '100%';
    this.playerHpBar.style.backgroundColor = '#22c55e';
    this.playerHpText.textContent = `${playerMeta.hp} / ${playerMeta.hp}`;
    this.playerStaminaBar.style.width = '100%';

    this.enemyHpBar.style.width = '100%';
    this.enemyHpDelayBar.style.width = '100%';
    this.enemyHpBar.style.backgroundColor = '#22c55e';
    this.enemyHpText.textContent = `${enemyMeta.hp} / ${enemyMeta.hp}`;

    // Action Slots
    for (let i = 0; i < 4; i++) {
      const sk = playerMeta.skills[i];
      if (sk) {
        this.slotIcons[i].textContent = sk.icon;
        this.slotKeys[i].textContent = sk.key;
        this.slotOverlays[i].style.height = '0%';
        this.slotOverlays[i].textContent = '';
      }
    }
  }

  public showIntro(playerName: string, enemyName: string) {
    this.gameState = 'intro';
    this.matchTime = 0;
    this.timerText.textContent = this.formatTime(0);
    this.bannerOverlay.style.display = 'flex';
    this.bannerTitle.textContent = 'READY...';
    this.bannerTitle.className = 'banner-text intro-pulse';
    this.bannerSubtitle.textContent = `${playerName} vs ${enemyName}`;
    this.rematchBtn.style.display = 'none';
    this.changeFightersBtn.style.display = 'none';

    setTimeout(() => {
      if (this.gameState === 'intro') {
        this.bannerTitle.textContent = 'FIGHT!';
        sound.playMatchStart();
      }
    }, 1100);

    setTimeout(() => {
      if (this.gameState === 'intro') {
        this.bannerOverlay.style.display = 'none';
        this.gameState = 'fighting';
      }
    }, 2000);
  }

  public showGameOver(won: boolean, playerDamageDealt: number) {
    if (this.gameState === 'finished') return;
    this.gameState = 'finished';

    this.bannerOverlay.style.display = 'flex';
    this.bannerTitle.textContent = won ? 'VICTORY!' : 'DEFEATED!';
    this.bannerTitle.className = won ? 'banner-text victory' : 'banner-text defeat';
    this.bannerSubtitle.innerHTML = `
      Match Time: ${this.formatTime(this.matchTime)}<br/>
      Total Damage Dealt: <span style="color:#ffcc00">${playerDamageDealt}</span>
    `;
    this.rematchBtn.style.display = 'inline-block';
    this.changeFightersBtn.style.display = 'inline-block';

    if (won) {
      sound.playVictory();
    }
  }

  public update(
    dt: number,
    player: Pokemon,
    enemy: Pokemon,
    totalPlayerDamageDealt: number,
    playerMeta: PokemonMeta
  ) {
    if (this.gameState === 'fighting') {
      this.matchTime += dt;
      this.timerText.textContent = this.formatTime(this.matchTime);

      if (enemy.isFainted) {
        this.showGameOver(true, totalPlayerDamageDealt);
      } else if (player.isFainted) {
        this.showGameOver(false, totalPlayerDamageDealt);
      }
    }

    // Player HP
    const playerHpPercent = Math.max(0, (player.stats.hp / player.stats.maxHp) * 100);
    this.playerHpBar.style.width = `${playerHpPercent}%`;
    this.playerHpDelayBar.style.width = `${playerHpPercent}%`;
    this.playerHpText.textContent = `${Math.ceil(player.stats.hp)} / ${player.stats.maxHp}`;

    if (playerHpPercent > 50) {
      this.playerHpBar.style.backgroundColor = '#22c55e';
    } else if (playerHpPercent > 20) {
      this.playerHpBar.style.backgroundColor = '#eab308';
    } else {
      this.playerHpBar.style.backgroundColor = '#ef4444';
    }

    // Player Stamina
    const staminaPercent = Math.max(0, (player.stats.stamina / player.stats.maxStamina) * 100);
    this.playerStaminaBar.style.width = `${staminaPercent}%`;

    // Player Portrait reaction
    if (player.stats.hp < player.stats.maxHp * 0.35 || player.currentAction === 'attack') {
      this.playerPortrait.src = playerMeta.angryPortrait;
    } else {
      this.playerPortrait.src = playerMeta.portrait;
    }

    // Enemy HP
    const enemyHpPercent = Math.max(0, (enemy.stats.hp / enemy.stats.maxHp) * 100);
    this.enemyHpBar.style.width = `${enemyHpPercent}%`;
    this.enemyHpDelayBar.style.width = `${enemyHpPercent}%`;
    this.enemyHpText.textContent = `${Math.ceil(enemy.stats.hp)} / ${enemy.stats.maxHp}`;

    if (enemyHpPercent > 50) {
      this.enemyHpBar.style.backgroundColor = '#22c55e';
    } else if (enemyHpPercent > 20) {
      this.enemyHpBar.style.backgroundColor = '#eab308';
    } else {
      this.enemyHpBar.style.backgroundColor = '#ef4444';
    }

    // Update Skill Cooldown overlays
    const skills = player.getSkills();
    const skillList = Object.values(skills);
    for (let i = 0; i < 4; i++) {
      const sk = skillList[i];
      const overlay = this.slotOverlays[i];
      if (sk && overlay) {
        if (sk.currentCooldown > 0) {
          const ratio = sk.currentCooldown / sk.cooldown;
          overlay.style.height = `${ratio * 100}%`;
          overlay.textContent = sk.currentCooldown > 0.5 ? sk.currentCooldown.toFixed(1) : '';
        } else {
          overlay.style.height = '0%';
          overlay.textContent = '';
        }
      }
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

export const ui = new UIManager();

import { Direction, ActionState, AnimMeta } from './types';

export function getDirectionFromVector(dx: number, dy: number): Direction {
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return Direction.South;
  const theta = Math.atan2(dy, dx);
  const angle = ((Math.PI / 2 - theta) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const idx = Math.round(angle / (Math.PI / 4)) % 8;
  return idx as Direction;
}

export class SpriteSheetManager {
  private images: Map<string, HTMLImageElement> = new Map();
  private animMetadata: Map<string, Record<string, AnimMeta>> = new Map();
  private loaded: boolean = false;

  public async preload(dexList: string[]): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const dex of dexList) {
      // Fetch metadata
      const metaPromise = fetch(`/assets/sprites/${dex}/anims.json`)
        .then((res) => res.json())
        .then((meta) => {
          this.animMetadata.set(dex, meta);
        })
        .catch((err) => {
          console.error(`Failed to load anim metadata for ${dex}:`, err);
        });
      promises.push(metaPromise);

      // Sheets to load
      const sheets = ['Walk', 'Attack', 'Hurt', 'Idle'];
      if (dex === '0006' || dex === '0003' || dex === '0009') {
        sheets.push('Shoot');
      }
      if (dex === '0006' || dex === '0448') {
        sheets.push('Faint');
      }
      if (dex === '0009' || dex === '0003') {
        sheets.push('Sleep');
      }
      if (dex === '0448') {
        sheets.push('Charge', 'Strike');
      }

      for (const sheet of sheets) {
        const key = `${dex}_${sheet}`;
        const img = new Image();
        img.src = `/assets/sprites/${dex}/${sheet}-Anim.png`;
        const imgPromise = new Promise<void>((resolve) => {
          img.onload = () => {
            this.images.set(key, img);
            resolve();
          };
          img.onerror = () => {
            console.warn(`Could not load sprite image for ${key}`);
            resolve();
          };
        });
        promises.push(imgPromise);
      }
    }

    await Promise.all(promises);
    this.loaded = true;
  }

  public isReady(): boolean {
    return this.loaded;
  }

  public getAnimMeta(dex: string, action: string): AnimMeta | null {
    const metas = this.animMetadata.get(dex);
    if (!metas) return null;
    return metas[action] || null;
  }

  public getImage(dex: string, action: string): HTMLImageElement | null {
    let sheetName = action.charAt(0).toUpperCase() + action.slice(1);
    if (action === 'shoot' && dex === '0448') {
      sheetName = 'Charge';
    } else if (action === 'faint') {
      sheetName = dex === '0009' || dex === '0003' ? 'Sleep' : 'Faint';
    }
    const key = `${dex}_${sheetName}`;
    return this.images.get(key) || null;
  }
}

export const spriteManager = new SpriteSheetManager();

export class SpriteAnimator {
  public dex: string;
  public currentAction: ActionState = 'idle';
  public currentDirection: Direction = Direction.South;
  public frameIndex: number = 0;
  private tickTimer: number = 0;
  public isAnimationFinished: boolean = false;
  public scale: number = 2.4; // Retro scaled up pixel art size

  constructor(dex: string) {
    this.dex = dex;
  }

  public setAction(action: ActionState, forceReset: boolean = false) {
    if (this.currentAction === action && !forceReset) return;
    this.currentAction = action;
    this.frameIndex = 0;
    this.tickTimer = 0;
    this.isAnimationFinished = false;
  }

  public setDirection(dir: Direction) {
    this.currentDirection = dir;
  }

  public update(deltaSeconds: number) {
    const animName = this.getMappedActionName(this.currentAction);
    const meta = spriteManager.getAnimMeta(this.dex, animName);
    if (!meta || meta.frameCount <= 0) return;

    // Convert seconds to approximate 60fps animation ticks
    this.tickTimer += deltaSeconds * 60;

    const durations = meta.durations;
    const currentDuration = durations[this.frameIndex] || 6;

    if (this.tickTimer >= currentDuration) {
      this.tickTimer -= currentDuration;
      if (this.frameIndex + 1 < meta.frameCount) {
        this.frameIndex++;
      } else {
        // End of animation
        if (this.currentAction === 'idle' || this.currentAction === 'walk') {
          this.frameIndex = 0;
        } else if (this.currentAction === 'faint') {
          this.frameIndex = meta.frameCount - 1; // Stay on last faint frame
          this.isAnimationFinished = true;
        } else {
          this.isAnimationFinished = true;
          this.frameIndex = 0;
        }
      }
    }
  }

  private getMappedActionName(action: ActionState): string {
    switch (action) {
      case 'walk':
      case 'dash':
        return 'Walk';
      case 'attack':
        return 'Attack';
      case 'shoot':
        return this.dex === '0448' ? 'Charge' : 'Shoot';
      case 'hurt':
        return 'Hurt';
      case 'faint':
        return this.dex === '0009' || this.dex === '0003' ? 'Sleep' : 'Faint';
      case 'idle':
      default:
        return 'Idle';
    }
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    options?: {
      flashWhite?: boolean;
      opacity?: number;
      shadow?: boolean;
      shadowRadius?: number;
    }
  ) {
    const animName = this.getMappedActionName(this.currentAction);
    const meta = spriteManager.getAnimMeta(this.dex, animName);
    const img = spriteManager.getImage(this.dex, this.currentAction);

    // Draw shadow first
    if (options?.shadow !== false) {
      ctx.save();
      ctx.fillStyle = 'rgba(10, 15, 25, 0.45)';
      ctx.beginPath();
      const sRadius = options?.shadowRadius || 24;
      ctx.ellipse(x, y + 22, sRadius, sRadius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (!img || !meta) {
      // Fallback placeholder circle if sprite not loaded
      ctx.save();
      ctx.fillStyle = this.dex === '0006' ? '#f08030' : '#6890f0';
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const fw = meta.frameWidth;
    const fh = meta.frameHeight;
    const maxDirs = Math.max(1, Math.floor(img.height / fh));
    const dirRow = Math.min(this.currentDirection, maxDirs - 1);
    const col = Math.min(this.frameIndex, meta.frameCount - 1);

    const sx = col * fw;
    const sy = dirRow * fh;

    const dw = fw * this.scale;
    const dh = fh * this.scale;
    const dx = Math.round(x - dw / 2);
    // Align base of sprite to entity's ground feet
    const dy = Math.round(y - dh + 20);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (options?.opacity !== undefined) {
      ctx.globalAlpha = options.opacity;
    }

    if (options?.flashWhite) {
      // Retro hurt blink: draw high brightness / white silhouette
      ctx.filter = 'brightness(3) contrast(1.5)';
    }

    ctx.drawImage(img, sx, sy, fw, fh, dx, dy, dw, dh);
    ctx.restore();
  }
}

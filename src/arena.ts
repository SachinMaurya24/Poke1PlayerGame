export class StadiumArena {
  public radius: number = 430;
  private time: number = 0;
  public playerLabel: string = 'CHARIZARD';
  public enemyLabel: string = 'BLASTOISE';

  public update(dt: number) {
    this.time += dt;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // 1. Outer Colosseum Surroundings (Deep stadium grandstand shadow)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-800, -800, 1600, 1600);

    // 2. Stadium Outer Stone Wall ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 36, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // Stone wall segmented bricks
    const segments = 32;
    for (let i = 0; i < segments; i++) {
      const angle = (i * Math.PI * 2) / segments;
      const rInner = this.radius;
      const rOuter = this.radius + 36;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * rInner, Math.sin(angle) * rInner);
      ctx.lineTo(Math.cos(angle) * rOuter, Math.sin(angle) * rOuter);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();

    // 3. Stadium Ground Floor (Colosseum arena dirt / turf texture)
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    // Radial gradient for stadium turf
    const arenaGrad = ctx.createRadialGradient(0, 0, 50, 0, 0, this.radius);
    arenaGrad.addColorStop(0, '#2d5a37'); // Lush stadium green center
    arenaGrad.addColorStop(0.7, '#244b2d');
    arenaGrad.addColorStop(0.92, '#7c5e3f'); // Dirt ring near wall
    arenaGrad.addColorStop(1, '#5c432d');
    ctx.fillStyle = arenaGrad;
    ctx.fill();

    // Turf line pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 28;
    for (let y = -this.radius; y <= this.radius; y += 56) {
      ctx.beginPath();
      ctx.moveTo(-this.radius, y);
      ctx.lineTo(this.radius, y);
      ctx.stroke();
    }

    // Outer white boundary line
    ctx.beginPath();
    ctx.arc(0, 0, this.radius - 20, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.stroke();

    // 4. Center Pokéball Arena Emblem
    const pRadius = 110;

    // Top half of Pokéball (Red)
    ctx.beginPath();
    ctx.arc(0, 0, pRadius, Math.PI, 0, false);
    ctx.fillStyle = 'rgba(220, 38, 38, 0.35)';
    ctx.fill();

    // Bottom half of Pokéball (White)
    ctx.beginPath();
    ctx.arc(0, 0, pRadius, 0, Math.PI, false);
    ctx.fillStyle = 'rgba(248, 250, 252, 0.3)';
    ctx.fill();

    // Center dividing line
    ctx.beginPath();
    ctx.moveTo(-pRadius, 0);
    ctx.lineTo(pRadius, 0);
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.stroke();

    // Pokéball outer circle
    ctx.beginPath();
    ctx.arc(0, 0, pRadius, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.stroke();

    // Pokéball Center Button
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();

    // 5. Team Trainer Marks (Player Red side on left, Enemy Blue side on right)
    ctx.font = '900 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.fillText(`◀ 1P (${this.playerLabel})`, -230, 0);

    ctx.fillStyle = 'rgba(59, 130, 246, 0.35)';
    ctx.fillText(`(${this.enemyLabel}) 2P ▶`, 230, 0);

    // 6. Stadium Floodlight Spotlights
    const lightAngles = [
      Math.PI / 4,
      (3 * Math.PI) / 4,
      (5 * Math.PI) / 4,
      (7 * Math.PI) / 4,
    ];

    for (const la of lightAngles) {
      const lx = Math.cos(la) * (this.radius + 20);
      const ly = Math.sin(la) * (this.radius + 20);

      // Light post base
      ctx.beginPath();
      ctx.arc(lx, ly, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#64748b';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f1f5f9';
      ctx.stroke();

      // Soft spotlight cone inwards
      const spotGrad = ctx.createRadialGradient(lx, ly, 5, lx, ly, 220);
      spotGrad.addColorStop(0, 'rgba(255, 255, 220, 0.22)');
      spotGrad.addColorStop(1, 'rgba(255, 255, 220, 0)');
      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.arc(lx, ly, 220, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  }
}

export const arena = new StadiumArena();

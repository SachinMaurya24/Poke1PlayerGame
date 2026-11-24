import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function main() {
  console.log('Starting Vite server...');
  const server = await createServer({
    root: rootDir,
    server: { port: 5199, host: 'localhost' },
  });
  await server.listen();
  const url = `http://localhost:5199`;
  console.log(`Vite server running at ${url}`);

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    defaultViewport: {
      width: 1200,
      height: 850,
      deviceScaleFactor: 2, // HiDPI Retina
    },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--mute-audio'],
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle0' });

  // Helper to take screenshot of the game container
  async function snap(filename) {
    const container = await page.$('#game-container');
    if (!container) throw new Error('#game-container not found');
    const outPath = path.join(rootDir, 'screenshots', filename);
    await container.screenshot({ path: outPath });
    console.log(`Saved screenshot: ${outPath}`);
  }

  // 1. Capture Selection Screen
  console.log('Capturing 01-selection-screen.png...');
  await snap('01-selection-screen.png');

  // 2. Start Charizard vs Blastoise Battle
  console.log('Starting Charizard vs Blastoise battle...');
  await page.click('#start-battle-btn');
  // Wait through intro (2.2s)
  await new Promise((r) => setTimeout(r, 2300));

  // Perform combat actions: Aim towards enemy (enemy is at +180, 0 in canvas coordinates)
  // Canvas is 1000x720, center is (500, 360). Enemy is roughly (680, 360).
  const canvasRect = await page.$eval('#game-canvas', (el) => {
    const rect = el.getBoundingClientRect();
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
  });

  const aimX = canvasRect.x + canvasRect.width * 0.65;
  const aimY = canvasRect.y + canvasRect.height * 0.5;

  await page.mouse.move(aimX, aimY);

  // Press Space (Fire Blast), J (Flamethrower), K (Dragon Claw)
  await page.keyboard.press('Space');
  await new Promise((r) => setTimeout(r, 150));
  await page.keyboard.down('KeyJ');
  await new Promise((r) => setTimeout(r, 400));
  await page.keyboard.up('KeyJ');
  await page.keyboard.press('KeyK');

  // Wait a moment for projectiles & particles to be vibrant across the screen
  await new Promise((r) => setTimeout(r, 200));
  console.log('Capturing 02-battle-clash-charizard-blastoise.png...');
  await snap('02-battle-clash-charizard-blastoise.png');

  // Let battle run a bit more to exchange hits
  await new Promise((r) => setTimeout(r, 800));
  await page.keyboard.down('KeyJ');
  await new Promise((r) => setTimeout(r, 300));
  await page.keyboard.up('KeyJ');
  await page.keyboard.press('ShiftLeft'); // Wing Dash
  await new Promise((r) => setTimeout(r, 250));
  console.log('Capturing 03-action-gameplay.png...');
  await snap('03-action-gameplay.png');

  // Return to menu to select Lucario vs Venusaur
  console.log('Switching to Lucario vs Venusaur...');
  await page.evaluate(() => {
    const changeBtn = document.getElementById('change-fighters-btn');
    if (changeBtn && changeBtn.offsetParent !== null) {
      changeBtn.click();
    } else {
      const screen = document.getElementById('selection-screen');
      if (screen) screen.style.display = 'flex';
    }
  });

  await new Promise((r) => setTimeout(r, 300));

  // Select Lucario for P1
  await page.click('.roster-card.p1[data-id="lucario"]');
  // Select Venusaur for CPU
  await page.click('.roster-card.cpu[data-id="venusaur"]');
  await new Promise((r) => setTimeout(r, 200));

  // Start battle
  await page.click('#start-battle-btn');
  await new Promise((r) => setTimeout(r, 2300));

  // Aim towards enemy
  await page.mouse.move(aimX, aimY);
  // Lucario skills: Space (Aura Sphere), J (Force Palm/Bone Rush), K
  await page.keyboard.press('Space');
  await new Promise((r) => setTimeout(r, 200));
  await page.keyboard.press('KeyK');
  await page.keyboard.down('KeyJ');
  await new Promise((r) => setTimeout(r, 350));
  await page.keyboard.up('KeyJ');
  await new Promise((r) => setTimeout(r, 150));

  console.log('Capturing 04-combat-lucario-vs-venusaur.png...');
  await snap('04-combat-lucario-vs-venusaur.png');

  // Trigger victory screen by setting enemy HP to 0 or calling showGameOver
  console.log('Capturing victory screen...');
  await page.evaluate(() => {
    // Call showGameOver directly or through UI if exposed, or dispatch victory
    const banner = document.getElementById('match-banner');
    const title = document.getElementById('banner-title');
    const subtitle = document.getElementById('banner-subtitle');
    const rematch = document.getElementById('rematch-btn');
    const changeFighters = document.getElementById('change-fighters-btn');

    if (banner && title && subtitle && rematch && changeFighters) {
      banner.style.display = 'flex';
      title.textContent = 'VICTORY!';
      title.className = 'banner-text victory';
      subtitle.innerHTML = 'Match Time: 00:42<br/>Total Damage Dealt: <span style="color:#ffcc00">320</span>';
      rematch.style.display = 'inline-block';
      changeFighters.style.display = 'inline-block';
    }
  });

  await new Promise((r) => setTimeout(r, 400));
  console.log('Capturing 05-victory-screen.png...');
  await snap('05-victory-screen.png');

  console.log('All screenshots captured successfully!');
  await browser.close();
  await server.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error running script:', err);
  process.exit(1);
});

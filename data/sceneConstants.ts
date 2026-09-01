import { ActMarker, BrandColor, ColorTier } from '../types';

export const MANDATORY_BRAND_PALETTE: BrandColor[] = [
  {
    name: 'Off-White',
    hex: '#FAF9F6',
    threeHex: '0xFAF9F6',
    tier: 'Tier 1 · Anchor',
    ire: 'IRE 95',
    role: 'Background · Clean off-white canvas',
    description: 'Background only. Pure, elegant off-white canvas.',
    bgClass: 'bg-[#FAF9F6]',
  },
  {
    name: 'Brand Green',
    hex: '#8DC63F',
    threeHex: '0x8DC63F',
    tier: 'Tier 3 · Bridge',
    ire: 'IRE 50',
    role: 'Accent · Focus elements & highlights',
    description: 'Accent elements only. Vibrant signature green.',
    bgClass: 'bg-[#8DC63F]',
  },
  {
    name: 'Black',
    hex: '#000000',
    threeHex: '0x000000',
    tier: 'Tier 2 · Voice',
    ire: 'IRE 0',
    role: 'Voice · All text, icons, and cursor',
    description: 'High contrast black for bold typography and line-art icons.',
    bgClass: 'bg-[#000000]',
  },
];

export const COLOR_TIERS: ColorTier[] = [
  {
    tierNumber: 1,
    badge: 'Tier 1 · Background',
    title: 'Off-White',
    hexList: ['#FAF9F6'],
    ire: 'IRE 95',
    ratioPercent: 80,
    description: 'Background only. Off-white (#FAF9F6) full 1920x1080 viewport.',
    borderClass: 'border-l-[#FAF9F6]',
    badgeBgClass: 'bg-[#FAF9F6]',
    badgeTextClass: 'text-black',
  },
  {
    tierNumber: 2,
    badge: 'Tier 2 · Accent',
    title: 'Brand Green',
    hexList: ['#8DC63F'],
    ire: 'IRE 50',
    ratioPercent: 5,
    description: 'Accent elements only (#8DC63F). High-energy signature focal points.',
    borderClass: 'border-l-[#8DC63F]',
    badgeBgClass: 'bg-[#8DC63F]',
    badgeTextClass: 'text-black',
  },
  {
    tierNumber: 3,
    badge: 'Tier 3 · Core',
    title: 'Black',
    hexList: ['#000000'],
    ire: 'IRE 0',
    ratioPercent: 15,
    description: 'All text, vector icons, and cursor (#000000). Maximum contrast & precision.',
    borderClass: 'border-l-[#000000]',
    badgeBgClass: 'bg-[#000000]',
    badgeTextClass: 'text-white',
  },
];

export const COLOR_CHEAT_SHEET = [
  { usage: 'Main Viewport Canvas', bgHex: '#FAF9F6', textHex: '#000000', borderHex: '#E2E0D8' },
  { usage: 'Brand Accent / Indicators', bgHex: '#8DC63F', textHex: '#000000', borderHex: '#8DC63F' },
  { usage: 'Hero Headline & Text', bgHex: 'Transparent', textHex: '#000000', borderHex: '—' },
  { usage: 'Line-Art Bank Icon', bgHex: 'Transparent', textHex: '#000000 (Stroke 5px)', borderHex: '#000000' },
];

export const ACT_MARKERS: ActMarker[] = [
  {
    id: 'scene-1',
    name: '0.0s – 1.5s: Scene 1 (Hook Text & Bank Icon)',
    subtitle: '"Bank 💸 slowing" on top & "you down?" with Bank Icon revealed in one sweep',
    timeSec: 0.0,
    frame: 0,
    color: '#8DC63F',
  },
  {
    id: 'scene-2',
    name: '1.5s – 2.05s: Scene 2 (Horizontal Pill Buttons Meet at Frame 123)',
    subtitle: 'Hook text moves up; "+ Add Funds" slides up & "Receive" slides down, touching at center',
    timeSec: 1.5,
    frame: 90,
    color: '#000000',
  },
  {
    id: 'scene-3',
    name: '2.05s – 3.5s: Scene 3 ("Send" Emerges, Pushes Sides & Click)',
    subtitle: 'Green "Send" pill pops out pushing sides away, cursor glides in and clicks with elastic bounce',
    timeSec: 2.05,
    frame: 123,
    color: '#8DC63F',
  },
  {
    id: 'scene-4',
    name: '3.5s – 4.0s: Scene 4 (Scatter)',
    subtitle: 'Black buttons scatter off-screen (top-left & bottom-right); cursor fades out; green Send holds',
    timeSec: 3.5,
    frame: 210,
    color: '#000000',
  },
  {
    id: 'scene-5',
    name: '4.0s – 5.0s: Scene 5 (The Morph)',
    subtitle: 'Green Send morphs to 240px circle with 3px stroke; text crossfades to Airtime & Package icon',
    timeSec: 4.0,
    frame: 240,
    color: '#8DC63F',
  },
  {
    id: 'scene-6',
    name: '5.0s – 6.0s: Scene 6 (Wheel Appearance)',
    subtitle: 'Two 180px off-white circles arc in from left and right with 40px gap, settling rhythmically',
    timeSec: 5.0,
    frame: 300,
    color: '#000000',
  },
  {
    id: 'scene-7',
    name: '6.0s – 6.8s: Scene 7 (Content Fill)',
    subtitle: 'Left circle fills with "Send & Receive", right circle fills with "Digital Microcredit"',
    timeSec: 6.0,
    frame: 360,
    color: '#8DC63F',
  },
  {
    id: 'scene-8',
    name: '6.8s – 8.5s: Scene 8 (The Carousel Rotation & Slot Counter)',
    subtitle: 'Outer bubbles orbit in 3 stages (180° each), center icon swaps, counter rolls 0 → 1,250 → 3,500 → 5,000',
    timeSec: 6.8,
    frame: 408,
    color: '#8DC63F',
  },
  {
    id: 'scene-9',
    name: '8.5s – 8.75s: Scene 9 (Final Merge)',
    subtitle: 'Outer circles scale to 0, center icons fade, and green button dissolves into center',
    timeSec: 8.5,
    frame: 510,
    color: '#000000',
  },
  {
    id: 'scene-10',
    name: '8.75s – 9.15s: Scene 10 (Brand Lockup & "Pay")',
    subtitle: 'Centered TeleBirr brand mark + "Pay" typography fade in with generous reading pause',
    timeSec: 8.75,
    frame: 525,
    color: '#8DC63F',
  },
  {
    id: 'scene-11',
    name: '9.15s – 10.55s: Scene 11 (Kinetic Slot Roller)',
    subtitle: 'Kinetic push-up transitions: "Pay" scrolls up to "Earn", then scrolls up to "TeleBirr" with dedicated reading intervals',
    timeSec: 9.15,
    frame: 549,
    color: '#000000',
  },
  {
    id: 'scene-12',
    name: '10.55s – 10.8s: Scene 12 (Closing Zoom Out)',
    subtitle: 'Full composition zooms down (1.0 → 0.4), fades (1.0 → 0.3), and blurs (4px) to conclude loop',
    timeSec: 10.55,
    frame: 633,
    color: '#8DC63F',
  },
];

export const RENDER_MJS_SCRIPT = `// 4K 60FPS Headless Renderer: render_4k.mjs
// Supports ProRes 422 HQ, ProRes 4444, H.264 (MP4), H.265 (HEVC), WebM (VP9)
// Usage: node render_4k.mjs [resolution=4k|2k|1080p] [fps=60|30] [codec=prores|h264|hevc|webm]

import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configurable render parameters
const RESOLUTION = process.argv[2] || '4k'; // '4k' (2160x2160), '2k' (1440x1440), '1080p' (1080x1080)
const FPS = parseInt(process.argv[3] || '60', 10);
const CODEC = process.argv[4] || 'h264'; // 'prores' | 'h264' | 'hevc' | 'webm'

const RES_MAP = {
  '4k': { width: 2160, height: 2160, scale: 2.7 },
  '2k': { width: 1440, height: 1440, scale: 1.8 },
  '1080p': { width: 1080, height: 1080, scale: 1.35 },
  '800p': { width: 800, height: 800, scale: 1.0 },
};

const targetRes = RES_MAP[RESOLUTION] || RES_MAP['4k'];

async function render() {
  console.log(\`🎬 Starting Studio Render: \${targetRes.width}x\${targetRes.height} @ \${FPS} FPS (\${CODEC.toUpperCase()})\`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--enable-accelerated-2d-canvas',
      '--disable-gpu-vsync',
      '--window-size=2400,2400'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: targetRes.width,
    height: targetRes.height,
    deviceScaleFactor: 1
  });

  const fileUrl = 'file://' + path.resolve('./canvas.html');
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  // Wait for harness synchronization
  await page.waitForFunction(() => window.READY === true);
  const totalFrames = await page.evaluate(() => window.TOTAL_FRAMES || 840);

  fs.mkdirSync('./frames_4k', { recursive: true });

  console.log(\`📸 Capturing \${totalFrames} high-fidelity frames deterministically...\`);
  for (let f = 0; f < totalFrames; f++) {
    await page.evaluate((frame) => window.seekFrame(frame), f);
    const padded = String(f).padStart(5, '0');
    await page.screenshot({
      path: \`./frames_4k/frame_\${padded}.png\`,
      omitBackground: false
    });

    if (f % 30 === 0 || f === totalFrames - 1) {
      const pct = Math.round(((f + 1) / totalFrames) * 100);
      console.log(\`[Progress: \${pct}%] Frame \${f + 1} / \${totalFrames}\`);
    }
  }

  await browser.close();

  console.log(\`🎞️ Encoding \${CODEC.toUpperCase()} video stream via FFmpeg...\`);
  let ffmpegCmd = '';
  
  if (CODEC === 'prores') {
    // Apple ProRes 422 HQ Master
    ffmpegCmd = \`ffmpeg -y -r \${FPS} -i ./frames_4k/frame_%05d.png -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le output_4k_prores.mov\`;
  } else if (CODEC === 'hevc') {
    // H.265 HEVC 10-bit Master
    ffmpegCmd = \`ffmpeg -y -r \${FPS} -i ./frames_4k/frame_%05d.png -c:v libx265 -crf 14 -pix_fmt yuv420p10le -preset slow output_4k_hevc.mp4\`;
  } else if (CODEC === 'webm') {
    // Google WebM VP9 4K
    ffmpegCmd = \`ffmpeg -y -r \${FPS} -i ./frames_4k/frame_%05d.png -c:v libvpx-vp9 -b:v 35M -crf 15 -pix_fmt yuv420p output_4k.webm\`;
  } else {
    // Master H.264 MP4 (Universally compatible)
    ffmpegCmd = \`ffmpeg -y -r \${FPS} -i ./frames_4k/frame_%05d.png -c:v libx264 -pix_fmt yuv420p -preset slow -crf 16 output_4k.mp4\`;
  }

  execSync(ffmpegCmd, { stdio: 'inherit' });
  console.log('✅ Render complete! Master video output generated.');
}

render().catch(console.error);
`;

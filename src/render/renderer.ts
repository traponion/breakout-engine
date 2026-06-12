// Breakout Game Renderer
// Extracted draw methods from BreakoutGame class (pixel-identical migration)

import type {
  GameStateType,
  Ball,
  Paddle,
  Brick,
  Bullet,
  HomingBullet,
  Laser,
  HomingLaser,
  Particle,
  DeathParticle,
  ComboPopup,
} from '../core/entities';
import type { Lang } from '../i18n/comments';
import {
  PARTICLE,
  COMMENT,
  HOMING_LASER,
  REFLECT,
  BALL_VISIBILITY,
  UI,
  COMBO_POPUP_LIFE,
  BRICK_FLASH_LIFE,
} from '../core/game';

// ==================== Types ====================

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  frameCount: number;
  gameState: GameStateType;
  score: number;
  lives: number; // actual HP (target)
  displayLives: number; // animated HP (drains toward lives)
  maxLives: number;
  difficulty: number;
  ball: Ball;
  paddle: Paddle;
  bricks: Brick[];
  bullets: Bullet[];
  homingBullets: HomingBullet[];
  lasers: Laser[];
  homingLasers: HomingLaser[];
  particles: Particle[];
  deathParticles: DeathParticle[];
  invincibleTimer: number;
  warning: string;
  screenShake: number;
  mascot: {
    comment: string;
    displayText: string;
    charIndex: number;
    timer: number;
    icon: HTMLImageElement | null;
    iconLoaded: boolean;
  };
  showMascotComments: boolean; // when false, the bubble chrome is not drawn at all
  lang: Lang;
  iconsLoaded: boolean;
  iconsLoadedCount: number;
  totalIconCount: number;
  rewardImagesLoaded: boolean;
  rewardImage: HTMLImageElement | null;
  dangerLevel: number;
  muted: boolean;
  seVolume: number; // 0–100, shown by the ready-screen slider
  trackTitleText: string | null;
  trackTitleTimer: number;
  levelUpText: string | null;
  levelUpTimer: number; // counts down from LEVEL_UP_DURATION; <=0 means hidden
  comboPopups: ComboPopup[];
}

// ==================== Main Render Function ====================

export function render(rctx: RenderContext): void {
  const { ctx, canvasWidth, canvasHeight, gameState, warning, frameCount, screenShake } = rctx;

  // Show loading screen with full blackout until icons are loaded
  if (!rctx.iconsLoaded) {
    drawLoadingScreen(rctx);
    drawMuteButton(rctx);
    return;
  }

  ctx.save();
  // Disable screen shake on game over screen for stable UI
  const shake = gameState === 'gameover' ? 0 : screenShake;
  ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(-10, -10, canvasWidth + 20, canvasHeight + 20);

  drawLasers(rctx);
  drawHomingLasers(rctx);
  if (warning) {
    ctx.fillStyle = frameCount % 10 < 5 ? '#ff0000' : '#ffff00';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(warning, canvasWidth / 2, canvasHeight / 2);
  }

  drawBall(rctx);
  drawPaddle(rctx);
  drawDangerWarning(rctx);
  drawDeathParticles(rctx);
  drawBricks(rctx);
  drawBullets(rctx);
  drawHomingBullets(rctx);
  drawParticles(rctx);
  drawComboPopups(rctx);
  // Ball position marker (drawn after other game elements, only during gameplay)
  if (gameState === 'playing') drawBallMarker(rctx);
  drawUI(rctx);
  if (rctx.showMascotComments) drawMascotComment(rctx);

  // Draw state-specific overlays
  if (gameState === 'ready') {
    drawReadyScreen(rctx);
  } else if (gameState === 'gameover') {
    drawGameOverScreen(rctx);
  }

  drawLevelUpNotice(rctx);
  drawTrackTitle(rctx);
  drawMuteButton(rctx);
  ctx.restore();
}

// ==================== Level-Up Notice ====================

// Animation: fade in over 10 frames, hold, fade out over 20 frames
export const LEVEL_UP_DURATION = 90; // frames (~1.5 s at 60 fps) — exported for game.ts
const LEVEL_UP_FADEOUT = 20;
const LEVEL_UP_FADEIN = 10;

function drawLevelUpNotice(rctx: RenderContext): void {
  const { ctx, canvasWidth, canvasHeight, levelUpText, levelUpTimer } = rctx;
  if (!levelUpText || levelUpTimer <= 0) return;

  const elapsed = LEVEL_UP_DURATION - levelUpTimer;
  const fadeIn = Math.min(1, elapsed / LEVEL_UP_FADEIN);
  const fadeOut = levelUpTimer < LEVEL_UP_FADEOUT ? levelUpTimer / LEVEL_UP_FADEOUT : 1;
  const alpha = fadeIn * fadeOut;

  // Pulsing glow: oscillate brightness for a shimmering effect
  const pulse = 0.7 + 0.3 * Math.sin(elapsed * 0.4);
  const cx = canvasWidth / 2;
  // Place in the ball travel zone — where the player's eyes naturally focus
  const y = canvasHeight * 0.55;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Glow layer (slightly larger, dimmer, offset text for depth)
  ctx.globalAlpha = alpha * pulse * 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(levelUpText, cx, y);

  // Main text with pulse brightness
  ctx.globalAlpha = alpha;
  const g = Math.round(255 * pulse);
  ctx.fillStyle = `rgb(255,${String(g)},0)`;
  ctx.font = 'bold 14px monospace';
  ctx.fillText(levelUpText, cx, y);

  // Animated arrows floating upward on both sides
  const textW = ctx.measureText(levelUpText).width;
  const arrowBaseX1 = cx - textW / 2 - 14;
  const arrowBaseX2 = cx + textW / 2 + 10;
  for (let i = 0; i < 3; i++) {
    const phase = (elapsed * 0.15 + i * 2.1) % 6.28;
    const arrowY = y - 4 + Math.sin(phase) * 6;
    const arrowAlpha = alpha * (0.4 + 0.4 * Math.sin(phase));
    ctx.globalAlpha = arrowAlpha;
    ctx.fillStyle = '#ffff00';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('\u2191', arrowBaseX1, arrowY - i * 5);
    ctx.fillText('\u2191', arrowBaseX2, arrowY - i * 5);
  }

  ctx.restore();
}

// ==================== Track Title Overlay ====================

// Animation constants: total 150 frames (~2.5 s at 60 fps)
// Phase 1 (150→30): fade in over 20 frames then hold, show "NOW PLAYING" label
// Phase 2 (30→0):  lerp position/size from centre to bottom-right badge
// Phase 3 (≤0):    permanent small badge in bottom-right
export const TRACK_TITLE_DURATION = 150;
const TRACK_TITLE_FADEOUT_WINDOW = 30;
const TRACK_TITLE_FADEIN_FRAMES = 20;
const TRACK_TITLE_MIN_ALPHA = 0.2;
const TRACK_TITLE_BADGE_ALPHA = 0.45;

function drawTrackTitle(rctx: RenderContext): void {
  const { ctx, canvasWidth, canvasHeight, trackTitleText, trackTitleTimer } = rctx;
  if (!trackTitleText) return;

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  // Badge destination
  const bx = canvasWidth - 10;
  const by = canvasHeight - 22;

  ctx.save();
  if (trackTitleTimer > TRACK_TITLE_FADEOUT_WINDOW) {
    // Phase 1: fade in then hold at centre
    const alpha = Math.min(
      1,
      (TRACK_TITLE_DURATION - trackTitleTimer) / TRACK_TITLE_FADEIN_FRAMES + TRACK_TITLE_MIN_ALPHA,
    );
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#aaaacc';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NOW PLAYING', cx, cy - 46);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('\u266a ' + trackTitleText, cx, cy - 30);
  } else if (trackTitleTimer > 0) {
    // Phase 2: lerp centre → badge (t: 1→0)
    const t = trackTitleTimer / TRACK_TITLE_FADEOUT_WINDOW;
    const x = bx + (cx - bx) * t;
    const y = by + (cy - 30 - by) * t;
    const fontSize = Math.round(8 + 10 * t); // 18px → 8px
    ctx.globalAlpha = TRACK_TITLE_BADGE_ALPHA + (1 - TRACK_TITLE_BADGE_ALPHA) * t;
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${String(fontSize)}px monospace`;
    ctx.textAlign = t >= 0.5 ? 'center' : 'right';
    ctx.fillText('\u266a ' + trackTitleText, x, y);
  } else {
    // Phase 3: static badge in bottom-right
    ctx.globalAlpha = TRACK_TITLE_BADGE_ALPHA;
    ctx.fillStyle = '#ffd700';
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('\u266a ' + trackTitleText, bx, by);
  }
  ctx.restore();
}

// ==================== Mute Button ====================

function drawMuteButton(rctx: RenderContext): void {
  const { ctx, muted } = rctx;
  const { x, y, w, h } = UI.muteBtn;
  const cx = x + w / 2;
  const cy = y + h / 2;

  // Speaker body
  ctx.fillStyle = muted ? '#666' : '#7fdbca';
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 4);
  ctx.lineTo(cx - 2, cy - 4);
  ctx.lineTo(cx + 4, cy - 8);
  ctx.lineTo(cx + 4, cy + 8);
  ctx.lineTo(cx - 2, cy + 4);
  ctx.lineTo(cx - 6, cy + 4);
  ctx.closePath();
  ctx.fill();

  if (muted) {
    // X mark for muted
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 5);
    ctx.lineTo(cx + 12, cy + 5);
    ctx.moveTo(cx + 12, cy - 5);
    ctx.lineTo(cx + 6, cy + 5);
    ctx.stroke();
  } else {
    // Sound waves
    ctx.strokeStyle = '#7fdbca';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) {
      const r = 5 + i * 4;
      ctx.beginPath();
      ctx.arc(cx + 4, cy, r, -0.6, 0.6);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// ==================== Helper Functions ====================

function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function getBrickColor(b: Brick): string {
  if (b.type === 'both') return '#ff6600';
  if (b.type === 'bomb') return '#ff0000';
  if (b.type === 'laser') return '#ff00ff';
  if (b.hp >= 3) return '#888888';
  if (b.hp === 2) return '#aaaaaa';
  return b.color;
}

function drawButton(
  ctx: CanvasRenderingContext2D,
  button: { x: number; y: number; w: number; h: number },
  text: string,
  bgColor: string,
  textColor: string,
): void {
  ctx.fillStyle = bgColor;
  ctx.fillRect(button.x, button.y, button.w, button.h);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(button.x, button.y, button.w, button.h);
  ctx.fillStyle = textColor;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, button.x + button.w / 2, button.y + button.h / 2);
  ctx.textBaseline = 'alphabetic';
}

function drawBubbleTail(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  c: string,
  o: number,
): void {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(x + o, y + 18 + o);
  ctx.lineTo(x - 8 + o, y + 26);
  ctx.lineTo(x + o, y + 34 - o);
  ctx.closePath();
  ctx.fill();
}

function drawTargetCorners(
  ctx: CanvasRenderingContext2D,
  size: number,
  cornerLength: number,
): void {
  for (let cornerIndex = 0; cornerIndex < 4; cornerIndex++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-size, -size);
    ctx.lineTo(-size, -size + cornerLength);
    ctx.moveTo(-size, -size);
    ctx.lineTo(-size + cornerLength, -size);
    ctx.stroke();
  }
}

// ==================== Game Element Drawing ====================

// Draw ball with glow effect (normal or power shot)
function drawBall(rctx: RenderContext): void {
  const { ctx, ball } = rctx;
  if (ball.isPowerShot) {
    drawCircle(ctx, ball.x, ball.y, ball.radius + 8, 'rgba(255, 0, 0, 0.2)');
    drawCircle(ctx, ball.x, ball.y, ball.radius + 5, 'rgba(255, 100, 0, 0.4)');
    drawCircle(ctx, ball.x, ball.y, ball.radius + 2, 'rgba(255, 200, 0, 0.6)');
    drawCircle(ctx, ball.x, ball.y, ball.radius, '#ffffff');
  } else {
    drawCircle(ctx, ball.x, ball.y, ball.radius + 2, 'rgba(255, 150, 0, 0.3)');
    drawCircle(ctx, ball.x, ball.y, ball.radius, '#ffd700');
  }
}

// Draw position marker when ball is in upper area (behind bricks)
function drawBallMarker(rctx: RenderContext): void {
  const { ctx, ball, frameCount } = rctx;

  // Only show when ball is in upper area
  if (ball.y > BALL_VISIBILITY.markerThreshold) return;

  const markerY = BALL_VISIBILITY.markerY;
  const fc = frameCount;

  // Pulsing effect
  const pulse = Math.sin(fc * 0.15) * 2;

  ctx.save();

  // Draw arrow pointing up
  ctx.fillStyle = fc % 10 < 5 ? '#ffd700' : '#ffaa00';
  ctx.beginPath();
  ctx.moveTo(ball.x, markerY - 8 - pulse);
  ctx.lineTo(ball.x - 6, markerY);
  ctx.lineTo(ball.x + 6, markerY);
  ctx.closePath();
  ctx.fill();

  // Draw connecting line from marker to ball (dashed)
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ball.x, markerY - 8);
  ctx.lineTo(ball.x, ball.y + ball.radius);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

function drawComboPopups(rctx: RenderContext): void {
  const { ctx, comboPopups } = rctx;
  ctx.save();
  for (const p of comboPopups) {
    const progress = 1 - p.life / COMBO_POPUP_LIFE;
    const alpha = p.life / COMBO_POPUP_LIFE;
    const y = p.y - progress * 20;
    let fontSize = 12;
    let color = '#ffffff';
    if (p.combo >= 5) {
      fontSize = 20;
      color = '#ff4444';
    } else if (p.combo >= 3) {
      fontSize = 16;
      color = '#ffff00';
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.font = `bold ${String(fontSize)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const excl = p.combo >= 5 ? '!!' : p.combo >= 3 ? '!' : '';
    ctx.fillText(`x${String(p.combo)}${excl}`, p.x, y);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

// Draw paddle with color-coded reflect zones
function drawPaddle(rctx: RenderContext): void {
  const { ctx, paddle, gameState, invincibleTimer, frameCount } = rctx;

  if (gameState === 'dying' || gameState === 'gameover') return;

  // Blink paddle during invincibility (skip every other frame)
  const isVisible = invincibleTimer <= 0 || Math.floor(invincibleTimer * 10) % 2 === 0;
  if (!isVisible) return;

  // Draw paddle with color-coded zones
  const paddleCenter = paddle.x + paddle.width / 2;
  const graceHalfWidth = (paddle.width * REFLECT.graceZoneRatio) / 2;
  const coreHalfWidth = (paddle.width * REFLECT.coreZoneRatio) / 2;
  const pulseAlpha = 0.15 + 0.1 * Math.sin(frameCount * 0.1);

  // Base color for invincibility
  const baseColor = invincibleTimer > 0 ? '#ffffff' : '#ffd700';

  // 1. Draw outer parts (normal paddle color)
  // Left side
  ctx.fillStyle = baseColor;
  ctx.fillRect(paddle.x, paddle.y, paddleCenter - graceHalfWidth - paddle.x, paddle.height);
  // Right side
  ctx.fillRect(
    paddleCenter + graceHalfWidth,
    paddle.y,
    paddle.x + paddle.width - (paddleCenter + graceHalfWidth),
    paddle.height,
  );

  // 2. Draw graze zone (light blue)
  const grazeColor = `rgba(200, 220, 255, ${String(0.5 + pulseAlpha * 0.2)})`;
  ctx.fillStyle = grazeColor;
  // Left graze
  ctx.fillRect(
    paddleCenter - graceHalfWidth,
    paddle.y,
    graceHalfWidth - coreHalfWidth,
    paddle.height,
  );
  // Right graze
  ctx.fillRect(
    paddleCenter + coreHalfWidth,
    paddle.y,
    graceHalfWidth - coreHalfWidth,
    paddle.height,
  );

  // Graze zone borders
  ctx.strokeStyle = 'rgba(180, 200, 255, 0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(paddleCenter - graceHalfWidth, paddle.y, graceHalfWidth * 2, paddle.height);

  // 3. Draw core zone (white)
  const coreColor = `rgba(255, 255, 255, ${String(0.65 + pulseAlpha * 0.15)})`;
  ctx.fillStyle = coreColor;
  ctx.fillRect(paddleCenter - coreHalfWidth, paddle.y, coreHalfWidth * 2, paddle.height);

  // Core zone border (thicker)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(paddleCenter - coreHalfWidth, paddle.y, coreHalfWidth * 2, paddle.height);

  // Optional: glow effect
  ctx.shadowBlur = 8;
  ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(paddleCenter - coreHalfWidth, paddle.y, coreHalfWidth * 2, paddle.height);
  ctx.shadowBlur = 0;
}

function drawDangerWarning(rctx: RenderContext): void {
  const { dangerLevel } = rctx;
  if (dangerLevel <= 0) return;

  const { ctx, canvasWidth, canvasHeight, frameCount } = rctx;

  // Draw red gradient at bottom of screen
  const gradientHeight = 120;
  const alpha = dangerLevel * 0.6;
  const blinkAlpha = frameCount % 10 < 5 ? alpha : alpha * 0.5;
  const gradient = ctx.createLinearGradient(0, canvasHeight - gradientHeight, 0, canvasHeight);
  gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(255, 0, 0, ${String(blinkAlpha)})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, canvasHeight - gradientHeight, canvasWidth, gradientHeight);

  // Draw DANGER text when danger level is significant
  if (dangerLevel >= 0.3) {
    ctx.save();
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = frameCount % 8 < 4 ? '#ff0000' : '#ffff00';
    ctx.fillText('DANGER!', canvasWidth / 2, canvasHeight - 20);
    ctx.restore();
  }
}

function drawLasers(rctx: RenderContext): void {
  const { ctx, canvasHeight, lasers, frameCount } = rctx;
  for (const l of lasers) {
    const cx = l.x + l.width / 2;
    if (l.isWarning) {
      ctx.fillStyle = frameCount % 6 < 3 ? 'rgba(255, 255, 0, 0.4)' : 'rgba(255, 0, 0, 0.4)';
      ctx.fillRect(l.x, 0, l.width, canvasHeight);
      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', cx, 30);
      ctx.fillText('!', cx, canvasHeight - 30);
    } else {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(l.x, 0, l.width, canvasHeight);
      ctx.fillStyle = '#fff';
      ctx.fillRect(l.x + 8, 0, l.width - 16, canvasHeight);
    }
  }
}

function drawHomingLasers(rctx: RenderContext): void {
  const { ctx, canvasHeight, paddle, homingLasers, frameCount } = rctx;
  const fc = frameCount;

  // Draw Caution alert if any homing laser is in tracking phase
  const hasTrackingLaser = homingLasers.some((l) => l.phase === 'tracking');
  if (hasTrackingLaser) {
    drawCautionAlert(rctx);
  }

  for (const l of homingLasers) {
    const cx = l.x + l.width / 2;

    switch (l.phase) {
      case 'tracking': {
        // Draw dashed line from laser to paddle (tracking indicator)
        ctx.save();
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(paddle.x + paddle.width / 2, paddle.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Draw tracking marker (animated)
        const pulseAlpha = 0.3 + 0.2 * Math.sin(fc * 0.15);
        ctx.fillStyle = `rgba(0, 255, 255, ${String(pulseAlpha)})`;
        ctx.fillRect(l.x, 0, l.width, canvasHeight);

        // Marker at top
        ctx.fillStyle = fc % 8 < 4 ? '#00ffff' : '#00aaff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('\u25CE', cx, 25);
        break;
      }
      case 'locked': {
        // Warning phase - intense blinking
        ctx.fillStyle = fc % 4 < 2 ? 'rgba(0, 255, 255, 0.6)' : 'rgba(255, 255, 0, 0.6)';
        ctx.fillRect(l.x, 0, l.width, canvasHeight);
        ctx.fillStyle = fc % 4 < 2 ? '#00ffff' : '#ffff00';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', cx, 30);
        ctx.fillText('!', cx, canvasHeight - 30);
        break;
      }
      case 'firing': {
        // Firing - cyan laser beam that expands over time
        const progress = 1 - l.timer / HOMING_LASER.fireFrames; // 0 -> 1
        const currentWidth = l.width + (HOMING_LASER.maxWidth - l.width) * progress;
        const centerX = l.x + l.width / 2;
        const drawX = centerX - currentWidth / 2;
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(drawX, 0, currentWidth, canvasHeight);
        ctx.fillStyle = '#fff';
        const coreWidth = Math.max(4, currentWidth - 16);
        ctx.fillRect(centerX - coreWidth / 2, 0, coreWidth, canvasHeight);
        break;
      }
    }
  }
}

function drawCautionAlert(rctx: RenderContext): void {
  const { ctx, canvasWidth, canvasHeight, frameCount } = rctx;
  const fc = frameCount;
  const barHeight = 60;
  const stripeWidth = 30;
  const barY = canvasHeight / 2 - barHeight / 2;

  // Slow pulsing alpha (sin wave) - more transparent
  const pulseAlpha = 0.6 + 0.15 * Math.sin(fc * 0.05);

  ctx.save();
  ctx.globalAlpha = pulseAlpha;

  // Yellow/black diagonal stripe background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, barY, canvasWidth, barHeight);

  // Draw diagonal stripes
  ctx.fillStyle = '#ffcc00';
  for (
    let x = -barHeight + ((fc * 2) % (stripeWidth * 2));
    x < canvasWidth + barHeight;
    x += stripeWidth * 2
  ) {
    ctx.beginPath();
    ctx.moveTo(x, barY);
    ctx.lineTo(x + barHeight, barY + barHeight);
    ctx.lineTo(x + barHeight + stripeWidth, barY + barHeight);
    ctx.lineTo(x + stripeWidth, barY);
    ctx.closePath();
    ctx.fill();
  }

  // Scrolling text - CAUTION!! only, bigger font
  const text = 'CAUTION!! CAUTION!! CAUTION!! ';
  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#ff0000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Text shadow for readability
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  const textWidth = ctx.measureText(text).width;
  const scrollX = -(fc * 1.5) % textWidth;
  ctx.fillText(text + text, scrollX, barY + barHeight / 2);

  ctx.restore();
}

function drawDeathParticles(rctx: RenderContext): void {
  const { ctx, deathParticles } = rctx;
  for (const p of deathParticles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = Math.min(1, p.life / PARTICLE.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawBricks(rctx: RenderContext): void {
  const { ctx, bricks } = rctx;
  for (const b of bricks) {
    if (!b.alive) continue;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    ctx.fillStyle = getBrickColor(b);
    ctx.fillRect(b.x, b.y, b.width, b.height);
    // Hit flash: white overlay that fades out
    if (b.flashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = b.flashTimer / BRICK_FLASH_LIFE;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.restore();
    }

    // Build label: combine HP and type icon horizontally
    let icon = '';
    switch (b.type) {
      case 'both': {
        icon = '爆雷';
        break;
      }
      case 'bomb': {
        icon = '爆';
        break;
      }
      case 'laser': {
        icon = '雷';
        break;
      }
    }
    const hpText = b.hp > 1 ? b.hp.toString() : '';
    const label = [hpText, icon].filter(Boolean).join(' ');

    if (label) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, cy);
      ctx.textBaseline = 'alphabetic';
    }
  }
}

function drawBullets(rctx: RenderContext): void {
  const { ctx, bullets } = rctx;
  for (const b of bullets) drawCircle(ctx, b.x, b.y, b.radius, b.color);
}

function drawTarget(rctx: RenderContext, x: number, y: number, locked: boolean): void {
  const { ctx, frameCount } = rctx;
  const fc = frameCount;
  const [rotM, baseS, sinM, cornerL, blinkM, col, altCol, txt, txtY] = locked
    ? ([0.1, 15, 0.15, 6, 6, '#ff3300', '#ff6600', 'FIRE!', -20] as const)
    : ([0.05, 20, 0.1, 8, 10, '#ff00ff', '#ff66ff', 'LOCK', -25] as const);
  const size = baseS + Math.sin(fc * sinM) * (locked ? 2 : 3);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(fc * rotM);
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  drawTargetCorners(ctx, size, cornerL);
  ctx.restore();
  ctx.fillStyle = fc % blinkM < blinkM / 2 ? col : altCol;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(txt, x, y + txtY);
}

function drawSingleHomingBullet(
  rctx: RenderContext,
  b: HomingBullet,
  targetX: number,
  targetY: number,
): boolean {
  const { ctx, frameCount } = rctx;
  const pulse = Math.sin(frameCount * 0.2) * 2;
  if (!b.locked) {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius + pulse, 0, Math.PI * 2);
  ctx.fillStyle = b.locked ? 'rgba(255, 100, 0, 0.5)' : 'rgba(255, 0, 255, 0.5)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  let col = b.color;
  if (b.locked) col = frameCount % 4 < 2 ? '#ffffff' : '#ff3300';
  ctx.fillStyle = col;
  ctx.fill();
  return !b.locked;
}

function drawHomingBullets(rctx: RenderContext): void {
  const { paddle, homingBullets } = rctx;
  const [targetX, targetY] = [paddle.x + paddle.width / 2, paddle.y];
  let hasTracking = false;
  const locked: HomingBullet[] = [];

  for (const b of homingBullets) {
    if (drawSingleHomingBullet(rctx, b, targetX, targetY)) hasTracking = true;
    if (b.locked && b.lockedX !== undefined) locked.push(b);
  }

  if (hasTracking) drawTarget(rctx, targetX, targetY, false);
  for (const b of locked)
    if (b.lockedX !== undefined && b.lockedY !== undefined)
      drawTarget(rctx, b.lockedX, b.lockedY, true);
}

function drawParticles(rctx: RenderContext): void {
  const { ctx, particles } = rctx;
  for (const p of particles) {
    ctx.globalAlpha = p.life / PARTICLE.life;
    drawCircle(ctx, p.x, p.y, 3, p.color);
  }
  ctx.globalAlpha = 1;
}

// ==================== UI Drawing ====================

function drawUI(rctx: RenderContext): void {
  const { ctx, canvasWidth, canvasHeight, score, lives, displayLives, maxLives, difficulty } = rctx;
  const [hpH, hpW, hpX, hpY] = [10, canvasWidth - 50, 24, 6];
  const displayRatio = displayLives / maxLives;
  const targetRatio = lives / maxLives;

  // Score & Level
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${String(score)}`, 10, canvasHeight - 10);
  // LV display — pulse glow when level-up is active
  const lvX = canvasWidth - 10;
  const lvY = canvasHeight - 10;
  const lvStr = `LV.${difficulty.toFixed(1)}`;
  if (rctx.levelUpTimer > 0) {
    const elapsed = LEVEL_UP_DURATION - rctx.levelUpTimer;
    const pulse = 0.7 + 0.3 * Math.sin(elapsed * 0.4);
    // Glow layer
    ctx.save();
    ctx.globalAlpha = pulse * 0.4;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(lvStr, lvX, lvY);
    ctx.restore();
    // Pulsing LV text
    const g = Math.round(255 * pulse);
    ctx.fillStyle = `rgb(255,${String(g)},100)`;
    ctx.font = 'bold 10px monospace';
  } else {
    ctx.fillStyle = '#ff6666';
    ctx.font = '10px monospace';
  }
  ctx.textAlign = 'right';
  ctx.fillText(lvStr, lvX, lvY);
  // HP bar background
  ctx.fillStyle = '#333';
  ctx.fillRect(hpX, hpY, hpW, hpH);
  // Ghost segment: drooling portion (displayLives > lives)
  if (displayRatio > targetRatio) {
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(hpX + hpW * targetRatio, hpY, hpW * (displayRatio - targetRatio), hpH);
  }
  // Active HP bar — color based on actual HP to avoid flicker during drain
  let hpColor = '#ff0000';
  if (targetRatio > 0.5) hpColor = '#00ff00';
  else if (targetRatio > 0.25) hpColor = '#ffff00';
  ctx.fillStyle = hpColor;
  ctx.fillRect(hpX, hpY, hpW * displayRatio, hpH);
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.strokeRect(hpX, hpY, hpW, hpH);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('HP', 4, hpY + hpH - 1);
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(
    `${String(Math.ceil(displayLives))}/${String(maxLives)}`,
    canvasWidth - 4,
    hpY + hpH - 1,
  );
}

// ==================== Screen Drawing ====================

// Full blackout loading screen shown before icons are loaded
function drawLoadingScreen(rctx: RenderContext): void {
  const { ctx, canvasWidth, canvasHeight, iconsLoadedCount, totalIconCount } = rctx;

  // Full black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Loading text
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Loading...', canvasWidth / 2, canvasHeight / 2 - 20);

  // Loading progress bar
  const progress = iconsLoadedCount / totalIconCount;
  const barWidth = 150;
  const barHeight = 8;
  const barX = (canvasWidth - barWidth) / 2;
  const barY = canvasHeight / 2;
  ctx.fillStyle = '#333';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(barX, barY, barWidth * progress, barHeight);
}

function drawReadyScreen(rctx: RenderContext): void {
  const { ctx, canvasWidth, lang } = rctx;
  const labels = UI.labels[lang];
  const { easyBtn, hardBtn } = UI.ready;

  // Semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 200, canvasWidth, 280);

  // Title - prompt to select difficulty to start
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    lang === 'ja'
      ? '\u96E3\u6613\u5EA6\u3092\u9078\u3093\u3067\u30B9\u30BF\u30FC\u30C8'
      : 'Select to Start',
    canvasWidth / 2,
    280,
  );

  // SE volume slider (drag or click the track; value persists per browser)
  drawVolumeSlider(rctx);

  // Difficulty buttons (clicking starts the game)
  drawButton(ctx, easyBtn, labels.easy, '#22c55e', '#fff');
  drawButton(ctx, hardBtn, labels.hard, '#ef4444', '#fff');

  // Instructions
  ctx.fillStyle = '#9ca3af';
  ctx.font = '12px sans-serif';
  ctx.fillText(
    lang === 'ja'
      ? '\u5F3E\u5E55\u3092\u907F\u3051\u306A\u304C\u3089\u30D6\u30ED\u30C3\u30AF\u3092\u58CA\u305B\uFF01'
      : 'Dodge bullets while breaking blocks!',
    canvasWidth / 2,
    400,
  );

  // Reflect system explanation with visual demo
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(
    lang === 'ja'
      ? '\u2728 \u53CD\u5C04\u30B7\u30B9\u30C6\u30E0 \u2728'
      : '\u2728 Reflect System \u2728',
    canvasWidth / 2,
    425,
  );
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText(
    lang === 'ja'
      ? '\u30D1\u30C9\u30EB\u4E2D\u592E\u3067\u5F3E\u3092\u81EA\u52D5\u53CD\u5C04\uFF01'
      : 'Auto-reflect bullets at paddle center!',
    canvasWidth / 2,
    440,
  );

  // Draw mini paddle with zones as visual guide
  const miniPaddleY = 455;
  const miniPaddleX = canvasWidth / 2 - 30;
  const miniPaddleWidth = 60;
  const miniPaddleHeight = 8;
  const miniGraceHalf = (miniPaddleWidth * REFLECT.graceZoneRatio) / 2;
  const miniCoreHalf = (miniPaddleWidth * REFLECT.coreZoneRatio) / 2;
  const miniCenter = miniPaddleX + miniPaddleWidth / 2;

  // 1. Draw outer parts (normal paddle color)
  ctx.fillStyle = '#ffd700';
  // Left side
  ctx.fillRect(
    miniPaddleX,
    miniPaddleY,
    miniCenter - miniGraceHalf - miniPaddleX,
    miniPaddleHeight,
  );
  // Right side
  ctx.fillRect(
    miniCenter + miniGraceHalf,
    miniPaddleY,
    miniPaddleX + miniPaddleWidth - (miniCenter + miniGraceHalf),
    miniPaddleHeight,
  );

  // 2. Draw graze zone (light blue)
  ctx.fillStyle = 'rgba(200, 220, 255, 0.5)';
  // Left graze
  ctx.fillRect(
    miniCenter - miniGraceHalf,
    miniPaddleY,
    miniGraceHalf - miniCoreHalf,
    miniPaddleHeight,
  );
  // Right graze
  ctx.fillRect(
    miniCenter + miniCoreHalf,
    miniPaddleY,
    miniGraceHalf - miniCoreHalf,
    miniPaddleHeight,
  );

  // Graze zone border
  ctx.strokeStyle = 'rgba(180, 200, 255, 0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(miniCenter - miniGraceHalf, miniPaddleY, miniGraceHalf * 2, miniPaddleHeight);

  // 3. Draw core zone (white)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.fillRect(miniCenter - miniCoreHalf, miniPaddleY, miniCoreHalf * 2, miniPaddleHeight);

  // Core zone border (thicker)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(miniCenter - miniCoreHalf, miniPaddleY, miniCoreHalf * 2, miniPaddleHeight);

  // Labels
  ctx.font = 'bold 8px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText(lang === 'ja' ? '\u30B3\u30A2' : 'Core', miniCenter, miniPaddleY - 3);
  ctx.fillStyle = 'rgba(180, 200, 255, 0.9)';
  ctx.fillText(
    lang === 'ja' ? '\u30B0\u30EC\u30FC\u30BA' : 'Graze',
    miniCenter - miniGraceHalf - 15,
    miniPaddleY + 6,
  );
}

function drawVolumeSlider(rctx: RenderContext): void {
  const { ctx, seVolume } = rctx;
  const { volumeTrack } = UI.ready;
  const trackCenterY = volumeTrack.y + volumeTrack.h / 2;

  // Label
  ctx.fillStyle = '#9ca3af';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('SE', volumeTrack.x - 12, trackCenterY + 3);

  // Track and filled portion
  ctx.fillStyle = '#333';
  ctx.fillRect(volumeTrack.x, volumeTrack.y, volumeTrack.w, volumeTrack.h);
  ctx.fillStyle = '#7fdbca';
  ctx.fillRect(volumeTrack.x, volumeTrack.y, (volumeTrack.w * seVolume) / 100, volumeTrack.h);

  // Knob
  const knobX = volumeTrack.x + (volumeTrack.w * seVolume) / 100;
  ctx.beginPath();
  ctx.arc(knobX, trackCenterY, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#e5e7eb';
  ctx.fill();

  // Numeric value
  ctx.fillStyle = '#9ca3af';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(String(seVolume), volumeTrack.x + volumeTrack.w + 14, trackCenterY + 3);
}

function drawGameOverScreen(rctx: RenderContext): void {
  const { ctx, canvasWidth, canvasHeight, score, lang, rewardImagesLoaded, rewardImage } = rctx;
  const labels = UI.labels[lang];

  // Dark overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Game Over text
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(labels.gameover, canvasWidth / 2, 30);

  // Score
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`Score: ${String(score)}`, canvasWidth / 2, 55);

  // Reward image
  if (rewardImage && rewardImagesLoaded) {
    const imgWidth = 180;
    const imgHeight = (rewardImage.height / rewardImage.width) * imgWidth;
    const imgX = (canvasWidth - imgWidth) / 2;
    const imgY = 70;

    // Draw border
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(imgX - 3, imgY - 3, imgWidth + 6, imgHeight + 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(imgX - 1, imgY - 1, imgWidth + 2, imgHeight + 2);

    ctx.drawImage(rewardImage, imgX, imgY, imgWidth, imgHeight);
  }

  // Retry button
  drawButton(ctx, UI.gameover.retryBtn, labels.retry, '#eab308', '#000');
}

// ==================== Mascot Comment ====================

function drawMascotComment(rctx: RenderContext): void {
  const { ctx, canvasWidth, mascot: n, frameCount } = rctx;
  const [iconX, iconY, iconSize, pad] = [6, 22, 48, 3];
  const [bX, bY, bW, bH] = [60, 20, canvasWidth - 66, 52];

  const radius = 8;
  if (n.iconLoaded && n.icon) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const typing = n.charIndex < n.comment.length && n.timer > 0;
    let [fx, fy] = [iconX, iconY];
    if (typing) {
      ctx.translate(iconX + 24, iconY + 24);
      ctx.rotate(Math.sin(frameCount * 0.3) * 0.1);
      ctx.translate(-24, -24 + Math.sin(frameCount * 0.4) * 3);
      [fx, fy] = [0, 0];
    }
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.roundRect(fx - pad, fy - pad, iconSize + pad * 2, iconSize + pad * 2, radius);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(
      fx - pad + 2,
      fy - pad + 2,
      iconSize + pad * 2 - 4,
      iconSize + pad * 2 - 4,
      radius - 2,
    );
    ctx.fill();
    ctx.drawImage(n.icon, fx, fy, iconSize, iconSize);
    ctx.restore();
  }

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.roundRect(bX, bY, bW, bH, radius);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(bX + 2, bY + 2, bW - 4, bH - 4, radius - 2);
  ctx.fill();
  drawBubbleTail(ctx, bX, bY, '#000', 0);
  drawBubbleTail(ctx, bX, bY, '#fff', 2);

  if (n.displayText) {
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    const txt = n.displayText,
      max = COMMENT.maxCharsPerLine;
    if (txt.length <= max) ctx.fillText(txt, bX + 8, bY + 32);
    else {
      ctx.fillText(txt.slice(0, max), bX + 8, bY + 24);
      ctx.fillText(txt.slice(max), bX + 8, bY + 42);
    }
  }
}

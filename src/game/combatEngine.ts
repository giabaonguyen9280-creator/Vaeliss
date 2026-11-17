import { CONFIG, EnemyTemplate, LimbConfig } from './config';
import { MapEnemyInstance } from './mapGen';
import { SeededRNG } from './prng';
import { getLimbReticlePositions } from './pixelArt';
import {
  CombatTurnResult,
  computeLimbDamagePreview,
  executeCombatItem,
  executeCombatTalk,
  executePlayerFlee,
  executePlayerGuard,
  executePlayerSkill,
  executePlayerWeaponAttack,
  getLimbDebuffBadges,
  LimbDamagePreview,
  LimbDebuffBadge,
  PlayerState,
} from './combat';

export type CombatActionType = 'ATTACK' | 'SKILL' | 'ITEM' | 'TALK' | 'GUARD' | 'FLEE';

export interface CombatParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number; // 0.5 standard gravity
  size: number;
  color: string;
  lifeMs: number;
  maxLifeMs: number;
  kind: 'blood' | 'fire' | 'spark';
}

export interface SlashArcEffect {
  x: number;
  y: number;
  elapsedMs: number;
  durationMs: number;
  startAngle: number;
  endAngle: number;
  radius: number;
  isCrit: boolean;
  kind: 'blood' | 'fire' | 'spark';
}

export interface FloatingCombatText {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
  vy: number;
  lifeMs: number;
  maxLifeMs: number;
}

export interface CombatEngineTurnOutcome {
  updatedPlayer: PlayerState;
  updatedEnemy: MapEnemyInstance;
  result: CombatTurnResult;
  endingTrigger?: {
    id: string;
    title: string;
    subtitle: string;
    epilogue: string;
  };
}

/**
 * Standalone CombatEngine Manager
 * - Decouples all Combat turn execution, Damage Preview, Debuff Badges,
 *   Delta-Time Animation Timelines (replacing setTimeout),
 *   Particle Engine (vx, vy, gravity = 0.5, fade-out),
 *   Eased Tapered Slash Arcs, and Damage-Scaled Screen Shake (Crit 25px, >500 dmg 15px)
 *   from App.tsx.
 */
export class CombatEngine {
  public particles: CombatParticle[] = [];
  public slashArcs: SlashArcEffect[] = [];
  public floatingTexts: FloatingCombatText[] = [];

  // Delta-time driven animation timers (no setTimeout!)
  public playerAttackTimerMs = 0;
  public enemyHitFlashTimerMs = 0;
  public enemyHitDelayTimerMs = 0;
  public playerHitDelayTimerMs = 0;
  public playerHitTimerMs = 0;

  // Screen Shake state (25px on Crit, 15px on >500 Dmg)
  public shakeAmplitude = 0;
  public shakeTimerMs = 0;
  public shakeMaxDurationMs = 1;
  public currentShakeX = 0;
  public currentShakeY = 0;

  // Continuous phase for per-limb sinusoidal idle breathing
  public breathPhase = 0;

  private nextFloatId = 1;

  public resetStageEffects(): void {
    this.particles = [];
    this.slashArcs = [];
    this.floatingTexts = [];
    this.playerAttackTimerMs = 0;
    this.enemyHitFlashTimerMs = 0;
    this.enemyHitDelayTimerMs = 0;
    this.playerHitDelayTimerMs = 0;
    this.playerHitTimerMs = 0;
    this.shakeAmplitude = 0;
    this.shakeTimerMs = 0;
    this.currentShakeX = 0;
    this.currentShakeY = 0;
  }

  public getStageAnimState(): 'idle' | 'playerAttack' | 'enemyHit' | 'playerHit' {
    if (this.enemyHitFlashTimerMs > 0) return 'enemyHit';
    if (this.playerAttackTimerMs > 0) return 'playerAttack';
    if (this.playerHitTimerMs > 0) return 'playerHit';
    return 'idle';
  }

  /**
   * Advances all combat animations, particles (gravity = 0.5), slash arcs, and screen shake using deltaTime (ms)
   */
  public update(dtMs: number): void {
    const clampedDt = Math.min(64, Math.max(1, dtMs));
    const frameScale = clampedDt / 16.667; // Normalized to 60fps step for physics constants

    // Advance per-limb sinusoidal breathing phase
    this.breathPhase = (this.breathPhase + clampedDt * 0.0038) % (Math.PI * 200);

    // Advance delta-time combat state machine (replaces setTimeout)
    if (this.playerAttackTimerMs > 0) {
      this.playerAttackTimerMs = Math.max(0, this.playerAttackTimerMs - clampedDt);
    }
    if (this.enemyHitDelayTimerMs > 0) {
      this.enemyHitDelayTimerMs -= clampedDt;
      if (this.enemyHitDelayTimerMs <= 0) {
        this.enemyHitDelayTimerMs = 0;
        this.enemyHitFlashTimerMs = 260;
      }
    }
    if (this.enemyHitFlashTimerMs > 0) {
      this.enemyHitFlashTimerMs = Math.max(0, this.enemyHitFlashTimerMs - clampedDt);
    }
    if (this.playerHitDelayTimerMs > 0) {
      this.playerHitDelayTimerMs -= clampedDt;
      if (this.playerHitDelayTimerMs <= 0) {
        this.playerHitDelayTimerMs = 0;
        this.playerHitTimerMs = 260;
      }
    }
    if (this.playerHitTimerMs > 0) {
      this.playerHitTimerMs = Math.max(0, this.playerHitTimerMs - clampedDt);
    }

    // Update Screen Shake
    if (this.shakeTimerMs > 0) {
      this.shakeTimerMs = Math.max(0, this.shakeTimerMs - clampedDt);
      const decay = this.shakeTimerMs / Math.max(1, this.shakeMaxDurationMs);
      const amp = this.shakeAmplitude * decay;
      this.currentShakeX = (Math.random() * 2 - 1) * amp;
      this.currentShakeY = (Math.random() * 2 - 1) * amp * 0.75;
    } else {
      this.currentShakeX = 0;
      this.currentShakeY = 0;
    }

    // Update Particle Physics (vx, vy, gravity = 0.5, fade out)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.lifeMs -= clampedDt;
      if (p.lifeMs <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * frameScale;
      p.y += p.vy * frameScale;
      p.vy += p.gravity * frameScale; // gravity = 0.5
    }

    // Update Eased Blade Slash Arcs
    for (let i = this.slashArcs.length - 1; i >= 0; i--) {
      const arc = this.slashArcs[i];
      arc.elapsedMs += clampedDt;
      if (arc.elapsedMs >= arc.durationMs) {
        this.slashArcs.splice(i, 1);
      }
    }

    // Update Floating Combat Numbers
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.lifeMs -= clampedDt;
      if (ft.lifeMs <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      ft.y += ft.vy * frameScale;
    }
  }

  public triggerScreenShake(amplitudePx: number, durationMs: number = 340): void {
    this.shakeAmplitude = Math.max(this.shakeAmplitude, amplitudePx);
    this.shakeTimerMs = durationMs;
    this.shakeMaxDurationMs = durationMs;
  }

  public spawnImpactEffects(
    tx: number,
    ty: number,
    dealtDmg: number,
    wasCrit: boolean,
    kind: 'blood' | 'fire' | 'spark'
  ): void {
    // 1. Spawn Tapered Eased Slash Arc
    this.slashArcs.push({
      x: tx,
      y: ty,
      elapsedMs: 0,
      durationMs: 340,
      startAngle: -1.15,
      endAngle: 1.45,
      radius: wasCrit ? 76 : 62,
      isCrit: wasCrit,
      kind,
    });

    // 2. Spawn Physics Particles with gravity = 0.5
    const count = wasCrit ? 34 : dealtDmg > 500 ? 28 : 20;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.2 + Math.random() * (wasCrit ? 7.5 : 5.2);
      const isFire = kind === 'fire' && i % 2 === 0;
      const isSpark = (kind === 'spark' || wasCrit) && i % 3 === 0;

      let color = '#dc2626';
      if (isFire) {
        color = i % 4 === 0 ? '#fef08a' : '#f97316';
      } else if (isSpark) {
        color = i % 2 === 0 ? '#fde047' : '#38bdf8';
      } else {
        color = i % 3 === 0 ? '#991b1b' : i % 2 === 0 ? '#ef4444' : '#7f1d1d';
      }

      this.particles.push({
        x: tx + (Math.random() - 0.5) * 14,
        y: ty + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isFire ? 3.2 : 2.0),
        gravity: 0.5, // Explicit 0.5 gravity per specification
        size: isSpark ? 2.5 + Math.random() * 2.2 : 3.0 + Math.random() * 3.5,
        color,
        lifeMs: 380 + Math.random() * 260,
        maxLifeMs: 640,
        kind: isFire ? 'fire' : isSpark ? 'spark' : 'blood',
      });
    }

    // 3. Trigger Damage-Scaled Screen Shake (Crit = 25px, Dmg > 500 = 15px, Normal = 7px)
    if (wasCrit) {
      this.triggerScreenShake(25, 420);
    } else if (dealtDmg > 500) {
      this.triggerScreenShake(15, 360);
    } else if (dealtDmg > 0) {
      this.triggerScreenShake(7, 240);
    }
  }

  /**
   * Renders Eased Tapered Slash Arcs & Physics Particles onto the Combat Canvas
   */
  public renderCanvasEffects(ctx: CanvasRenderingContext2D): void {
    // 1. Render Tapered Eased Blade Slash Arcs (fading from root to tip)
    for (const arc of this.slashArcs) {
      const progress = Math.min(1, arc.elapsedMs / arc.durationMs);
      // Cubic ease-out curve for blade sweep
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const fadeAlpha = Math.max(0, 1 - Math.pow(progress, 1.6));

      const currentSweepEnd =
        arc.startAngle + (arc.endAngle - arc.startAngle) * Math.min(1, easeOut * 1.25);
      const segments = 18;

      ctx.save();
      for (let s = 0; s < segments; s++) {
        const t0 = s / segments;
        const t1 = (s + 1) / segments;
        const a0 = arc.startAngle + (currentSweepEnd - arc.startAngle) * t0;
        const a1 = arc.startAngle + (currentSweepEnd - arc.startAngle) * t1;

        // Taper width & fade alpha from root to tip
        const tipFade = Math.sin(t1 * Math.PI);
        const segAlpha = fadeAlpha * (0.25 + 0.75 * t1);
        ctx.globalAlpha = segAlpha;

        ctx.strokeStyle =
          arc.kind === 'fire'
            ? '#fb923c'
            : arc.isCrit || arc.kind === 'spark'
            ? '#fef08a'
            : '#f8fafc';
        ctx.lineWidth = Math.max(1, (arc.isCrit ? 8.5 : 6.0) * tipFade * (1 - progress * 0.4));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(arc.x, arc.y, arc.radius, a0, a1);
        ctx.stroke();

        // Secondary crimson/ember trail
        ctx.strokeStyle = arc.kind === 'fire' ? '#dc2626' : '#ef4444';
        ctx.lineWidth = Math.max(0.8, 3.2 * tipFade);
        ctx.beginPath();
        ctx.arc(arc.x + 3, arc.y + 3, arc.radius - 5, a0, a1);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Render Physics Particles (Blood Drops, Fire Embers, Electric Sparks)
    for (const p of this.particles) {
      const alpha = Math.max(0, Math.min(1, p.lifeMs / p.maxLifeMs));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.kind === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 1.6, p.y - p.vy * 1.6);
        ctx.stroke();
      } else if (p.kind === 'fire') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.6 + 0.5 * alpha), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  public getDamagePreview(
    player: PlayerState,
    enemy: MapEnemyInstance,
    tpl: EnemyTemplate,
    limb: LimbConfig
  ): LimbDamagePreview {
    return computeLimbDamagePreview(player, enemy, tpl, limb);
  }

  public getLimbBadges(enemy: MapEnemyInstance, limbId: string): LimbDebuffBadge[] {
    return getLimbDebuffBadges(enemy, limbId);
  }

  /**
   * Executes a full player + enemy combat turn, schedules delta-time animations & particles,
   * and returns the updated state.
   */
  public executeTurn(
    player: PlayerState,
    enemy: MapEnemyInstance,
    seed: string,
    action: CombatActionType,
    selectedLimbId: string,
    opts?: { limbId?: string; skillId?: string; itemId?: string }
  ): CombatEngineTurnOutcome {
    const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
    const eCopy: MapEnemyInstance = JSON.parse(JSON.stringify(enemy));
    eCopy.lockedLimbIds = eCopy.lockedLimbIds || {};
    eCopy.severedLimbs = eCopy.severedLimbs || [];
    pCopy.skillLevels = pCopy.skillLevels || {};

    const rng = new SeededRNG(`${seed}_${eCopy.uid}_${eCopy.turnCount}_${Date.now()}`);
    const targetLimb = opts?.limbId || selectedLimbId;

    if (action === 'ATTACK' || action === 'SKILL') {
      this.playerAttackTimerMs = 260;
      this.enemyHitDelayTimerMs = 110;
    }

    let res: CombatTurnResult;
    if (action === 'ATTACK') {
      res = executePlayerWeaponAttack(pCopy, eCopy, targetLimb, rng);
    } else if (action === 'SKILL' && opts?.skillId) {
      res = executePlayerSkill(pCopy, eCopy, opts.skillId, targetLimb, rng);
    } else if (action === 'ITEM' && opts?.itemId) {
      res = executeCombatItem(pCopy, eCopy, opts.itemId, rng);
    } else if (action === 'TALK') {
      res = executeCombatTalk(pCopy, eCopy, rng);
    } else if (action === 'GUARD') {
      res = executePlayerGuard(pCopy, eCopy, rng);
    } else {
      res = executePlayerFlee(pCopy, eCopy, rng);
    }

    const tpl = CONFIG.ENEMIES[eCopy.templateId] || CONFIG.ENEMIES.fanatic_zealot;
    const retMap = getLimbReticlePositions(tpl.spriteKey);
    const actualTargetLimb = res.targetLimbId || targetLimb;
    const limbNorm = retMap[actualTargetLimb] || { nx: 0.5, ny: 0.36 };
    const hitX = Math.round(limbNorm.nx * 640);
    const hitY = Math.round(limbNorm.ny * 440);

    if (res.lastDealtDmg && res.lastDealtDmg > 0) {
      const pKind =
        res.particleType ||
        (opts?.skillId === 'holy_light' || opts?.itemId === 'brown_vial'
          ? 'fire'
          : res.wasCrit
          ? 'spark'
          : 'blood');
      this.spawnImpactEffects(hitX, hitY, res.lastDealtDmg, Boolean(res.wasCrit), pKind);

      this.floatingTexts.push({
        id: this.nextFloatId++,
        text: `-${res.lastDealtDmg}${res.wasCrit ? ' CRIT!' : ''}`,
        color: res.wasCrit ? '#facc15' : pKind === 'fire' ? '#fb923c' : '#f87171',
        x: hitX - 28,
        y: hitY - 22,
        vy: -0.65,
        lifeMs: 950,
        maxLifeMs: 950,
      });
    }

    if (res.lastTakenDmg && res.lastTakenDmg > 0) {
      this.playerHitDelayTimerMs = 200;
      this.floatingTexts.push({
        id: this.nextFloatId++,
        text: `-${res.lastTakenDmg} Sinh Lực`,
        color: '#fb923c',
        x: 175,
        y: 320,
        vy: -0.55,
        lifeMs: 950,
        maxLifeMs: 950,
      });
    }

    let endingTrigger: CombatEngineTurnOutcome['endingTrigger'] = undefined;
    if (res.playerDefeated) {
      endingTrigger = {
        id: 'SLAIN_IN_COMBAT',
        title: 'MÁU NHUỘM ĐẠI GIÁO ĐƯỜNG GOETHE',
        subtitle: 'Thể Xác Bị Nghiền Nát Trong Giao Tranh',
        epilogue:
          'Những nhát chém tàn khốc của quái vật đã kết thúc hành trình của bạn. Khi bắt đầu lại, Thung Lũng sẽ tái cấu trúc bằng một Seed ngẫu nhiên mới — hoặc bạn có thể tải lại Bản Lưu để quay về Seed cũ.',
      };
    } else if (res.enemyDefeated && eCopy.templateId === 'demon_lord_vaelis') {
      endingTrigger = {
        id: 'VAELIS_CLIMAX_CHOICE',
        title: 'NGAI VÀNG MÁU BỎ TRỐNG',
        subtitle: 'Hiệp Sĩ Trưởng Vaelis Đã Ngã Xuống • Bạn Nắm Giữ Lõi Khóa Hư Vô',
        epilogue:
          'Xác thịt nặng trĩu xiềng xích của Vaelis khuỵu xuống dưới chân Ngai Vàng Máu. Lõi Khóa Hư Vô rực sáng trên tay bạn — bạn có thể kết thúc vòng lặp ngay tại đây hoặc mang Lõi Khóa xuống đáy Tầng 3.',
      };
    }

    return {
      updatedPlayer: pCopy,
      updatedEnemy: eCopy,
      result: res,
      endingTrigger,
    };
  }
}

// Detailed Multi-Tone Anatomical Vector & Procedural Grimy Stone Renderer
// (Multi-Layered Garments, Rusted Armor, Horror Facial Anatomy, Distinctive Weapons & 3D Top-Down Map Textures)

export type LimbZone =
  | 'head'
  | 'torso'
  | 'right_arm'
  | 'left_arm'
  | 'legs'
  | 'left_leg'
  | 'coiling_body'
  | 'lashing_tail'
  | 'tentacle_1'
  | 'tentacle_2'
  | 'tentacle_3'
  | 'tentacle_4'
  | 'snake_tail_head';

export interface ReticleAnchor {
  limbId: string;
  nx: number; // normalized 0..1 X on 640x440 combat stage canvas
  ny: number; // normalized 0..1 Y on 640x440 combat stage canvas
}

/**
 * Returns exact normalized (0..1) anatomical coordinates on the 640x440 combat canvas
 * for the 1.6x scaled monster so On-Body Reticles sit directly on each limb.
 */
export function getLimbReticlePositions(spriteKey: string): Record<string, { nx: number; ny: number }> {
  if (spriteKey === 'astral_kraken') {
    // Kẻ Gác Đền Hóa Thạch: Đầu hóa đá (head), Lồng ngực thịt đỏ (torso), Đại kiếm đá tay phải (tentacle_1), Tay trái đá (tentacle_2), Vai giáp đá (tentacle_3), Chân trụ đá (tentacle_4)
    return {
      head: { nx: 0.50, ny: 0.18 },
      torso: { nx: 0.50, ny: 0.46 },
      tentacle_1: { nx: 0.77, ny: 0.48 },
      tentacle_2: { nx: 0.25, ny: 0.44 },
      tentacle_3: { nx: 0.31, ny: 0.26 },
      tentacle_4: { nx: 0.52, ny: 0.78 },
    };
  }
  if (spriteKey === 'ouroboros_serpent') {
    // Thí Nghiệm Số 09 – Cành Cây Thịt: Quả cầu tim (head), Thân cây thịt (torso), Rễ xương máu (coiling_body), Cành bàn tay người (lashing_tail)
    return {
      head: { nx: 0.50, ny: 0.18 },
      torso: { nx: 0.50, ny: 0.46 },
      coiling_body: { nx: 0.34, ny: 0.76 },
      lashing_tail: { nx: 0.73, ny: 0.38 },
    };
  }
  if (spriteKey === 'dimensional_viper') {
    return {
      head: { nx: 0.50, ny: 0.20 },
      torso: { nx: 0.50, ny: 0.46 },
      coiling_body: { nx: 0.30, ny: 0.68 },
      lashing_tail: { nx: 0.72, ny: 0.70 },
    };
  }
  if (spriteKey === 'void_chimera') {
    return {
      head: { nx: 0.50, ny: 0.18 },
      snake_tail_head: { nx: 0.74, ny: 0.38 },
      torso: { nx: 0.50, ny: 0.48 },
      right_arm: { nx: 0.25, ny: 0.50 },
      legs: { nx: 0.50, ny: 0.78 },
    };
  }
  if (spriteKey === 'demon_lord_vaelis') {
    return {
      head: { nx: 0.50, ny: 0.19 },
      torso: { nx: 0.50, ny: 0.44 },
      left_arm: { nx: 0.26, ny: 0.48 },
      right_arm: { nx: 0.76, ny: 0.44 },
      legs: { nx: 0.50, ny: 0.76 },
    };
  }
  if (spriteKey === 'dullahan_knight' || spriteKey === 'butcher_kaelgor') {
    return {
      head: { nx: 0.50, ny: 0.18 }, // Lồng sắt nhốt quạ hàn trên cổ cụt
      left_arm: { nx: 0.25, ny: 0.46 },
      torso: { nx: 0.50, ny: 0.46 },
      right_arm: { nx: 0.75, ny: 0.44 },
      legs: { nx: 0.50, ny: 0.76 },
    };
  }
  if (spriteKey === 'countess_carmilla' || spriteKey === 'fenrir_kin') {
    // Quái Vật Hợp Thể Kỵ Đoàn: 4 đầu gào thét (head), Khối giáp thịt nung chảy (torso), 6 tay bò dưới sàn
    return {
      head: { nx: 0.50, ny: 0.22 },
      torso: { nx: 0.50, ny: 0.46 },
      left_arm: { nx: 0.23, ny: 0.54 },
      right_arm: { nx: 0.77, ny: 0.54 },
      legs: { nx: 0.50, ny: 0.78 },
    };
  }
  if (spriteKey === 'executioner_paladin') {
    // Hồng Y Sáp Trắng: Lư hương vàng (head), Lễ phục sáp chảy lộ mặt trẻ em (torso), 2 tay trái ôm Kinh Văn Da Người (left_arm), 2 tay phải cầm Chuông Đồng (right_arm), Dải lụa lơ lửng (legs)
    return {
      head: { nx: 0.50, ny: 0.17 },
      torso: { nx: 0.50, ny: 0.45 },
      left_arm: { nx: 0.24, ny: 0.44 },
      right_arm: { nx: 0.76, ny: 0.44 },
      legs: { nx: 0.50, ny: 0.77 },
    };
  }
  if (spriteKey === 'grand_abbess') {
    // Nữ Tu Khóc Ra Sáp: Mặt phủ sáp trắng (head), Thân trói bánh xe (torso), Hai tay khâu ngược sau lưng (left_arm), Tay phải cầm trượng sáp (right_arm), Bánh xe tra tấn gỗ mục (legs)
    return {
      head: { nx: 0.50, ny: 0.20 },
      torso: { nx: 0.50, ny: 0.46 },
      left_arm: { nx: 0.27, ny: 0.42 },
      right_arm: { nx: 0.75, ny: 0.44 },
      legs: { nx: 0.50, ny: 0.76 },
    };
  }
  if (spriteKey === 'penitent_knight') {
    // Thánh Vệ Bạch Kim: Mũ giáp rỉ máu đen (head), Giáp bạch kim (torso), Khiên Tháp Con Mắt (left_arm), Chùy Bạch Kim (right_arm), Cẳng chân trái mất giáp (left_leg), Chân phải bọc giáp (legs)
    return {
      head: { nx: 0.50, ny: 0.18 },
      torso: { nx: 0.50, ny: 0.44 },
      left_arm: { nx: 0.24, ny: 0.46 },
      right_arm: { nx: 0.76, ny: 0.44 },
      left_leg: { nx: 0.40, ny: 0.76 },
      legs: { nx: 0.60, ny: 0.76 },
    };
  }
  if (spriteKey === 'dire_hellwolf' || spriteKey === 'void_panther') {
    return {
      head: { nx: 0.34, ny: 0.34 },
      torso: { nx: 0.54, ny: 0.48 },
      left_arm: { nx: 0.30, ny: 0.68 },
      right_arm: { nx: 0.46, ny: 0.70 },
      legs: { nx: 0.70, ny: 0.68 },
    };
  }
  return {
    head: { nx: 0.50, ny: 0.19 },
    torso: { nx: 0.50, ny: 0.45 },
    left_arm: { nx: 0.27, ny: 0.44 },
    right_arm: { nx: 0.73, ny: 0.44 },
    left_leg: { nx: 0.42, ny: 0.75 },
    legs: { nx: 0.58, ny: 0.75 },
  };
}

function drawArterialStump(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  const grad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
  grad.addColorStop(0, '#ff4d4d');
  grad.addColorStop(0.5, '#8b0000');
  grad.addColorStop(1, '#2b0505');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Exposed jagged bone shard in center
  ctx.fillStyle = '#e6dcc8';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.35, y);
  ctx.lineTo(x, y - r * 0.45);
  ctx.lineTo(x + r * 0.35, y + r * 0.1);
  ctx.lineTo(x, y + r * 0.35);
  ctx.closePath();
  ctx.fill();

  // Dripping arterial blood streams
  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = Math.max(1.5, r * 0.25);
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * r * 0.4, y + r * 0.4);
    ctx.quadraticCurveTo(x + i * r * 0.5, y + r * 1.5, x + i * r * 0.3, y + r * 2.3);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Helper to draw distinct, recognizable dark-fantasy weapons & props in monster/hero hands
 */
function drawDetailedWeapon(
  ctx: CanvasRenderingContext2D,
  spriteKey: string,
  hand: 'left' | 'right',
  hx: number,
  hy: number,
  scale: number,
  isTelegraphing: boolean = false
) {
  ctx.save();
  ctx.translate(hx, hy);

  if (hand === 'left') {
    if (spriteKey === 'fanatic_zealot' || spriteKey === 'crypt_keybearer') {
      // Burning Torch + Iron Key Ring for crypt_keybearer
      ctx.fillStyle = '#4a321f';
      ctx.strokeStyle = '#070608';
      ctx.lineWidth = 1.8 * scale;
      ctx.beginPath();
      ctx.moveTo(-4 * scale, 10 * scale);
      ctx.lineTo(-14 * scale, -26 * scale);
      ctx.lineTo(-7 * scale, -28 * scale);
      ctx.lineTo(3 * scale, 8 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const fGrad = ctx.createRadialGradient(-12 * scale, -34 * scale, 2 * scale, -12 * scale, -34 * scale, 16 * scale);
      fGrad.addColorStop(0, '#fff3b0');
      fGrad.addColorStop(0.45, '#f59e0b');
      fGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.arc(-12 * scale, -34 * scale, 16 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-17 * scale, -26 * scale);
      ctx.quadraticCurveTo(-20 * scale, -42 * scale, -11 * scale, -48 * scale);
      ctx.quadraticCurveTo(-3 * scale, -39 * scale, -7 * scale, -26 * scale);
      ctx.closePath();
      ctx.fill();

      if (spriteKey === 'crypt_keybearer') {
        // Large Iron Crypt Key Ring hanging from hand
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2.2 * scale;
        ctx.beginPath();
        ctx.arc(-4 * scale, 14 * scale, 7 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillRect(-6 * scale, 21 * scale, 4 * scale, 12 * scale);
      }
    } else if (spriteKey === 'rotting_priest') {
      // Tarnished Brass Soul-Bell (Quai cầm + Miệng chuông đồng vàng xỉn)
      ctx.strokeStyle = '#785c18';
      ctx.lineWidth = 2.4 * scale;
      ctx.beginPath();
      ctx.arc(-8 * scale, 2 * scale, 5.5 * scale, Math.PI, 0);
      ctx.stroke();

      const bellGrad = ctx.createLinearGradient(-16 * scale, 4 * scale, 2 * scale, 24 * scale);
      bellGrad.addColorStop(0, '#eab308');
      bellGrad.addColorStop(0.5, '#a16207');
      bellGrad.addColorStop(1, '#422006');
      ctx.fillStyle = bellGrad;
      ctx.strokeStyle = '#070608';
      ctx.lineWidth = 1.8 * scale;
      ctx.beginPath();
      ctx.moveTo(-14 * scale, 4 * scale);
      ctx.lineTo(-2 * scale, 4 * scale);
      ctx.quadraticCurveTo(3 * scale, 18 * scale, 5 * scale, 23 * scale);
      ctx.lineTo(-21 * scale, 23 * scale);
      ctx.quadraticCurveTo(-19 * scale, 18 * scale, -14 * scale, 4 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(-8 * scale, 24 * scale, 3.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (spriteKey === 'executioner_paladin') {
      // Colossal Raised Cross Tower-Shield covering half of Paladin's upper body
      const shGrad = ctx.createLinearGradient(-28 * scale, -44 * scale, 10 * scale, 26 * scale);
      shGrad.addColorStop(0, '#f8fafc');
      shGrad.addColorStop(0.5, '#94a3b8');
      shGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = shGrad;
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2.6 * scale;
      ctx.beginPath();
      ctx.moveTo(-26 * scale, -42 * scale);
      ctx.lineTo(10 * scale, -42 * scale);
      ctx.lineTo(10 * scale, 6 * scale);
      ctx.quadraticCurveTo(8 * scale, 24 * scale, -8 * scale, 32 * scale);
      ctx.quadraticCurveTo(-24 * scale, 24 * scale, -26 * scale, 6 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Blazing Gold Cross on Greatshield
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-11 * scale, -34 * scale, 6 * scale, 54 * scale);
      ctx.fillRect(-21 * scale, -18 * scale, 26 * scale, 6 * scale);
    } else if (spriteKey === 'fallen_knight') {
      // Iron-Rimmed Oak Shield with Rivets
      const shGrad = ctx.createLinearGradient(-22 * scale, -18 * scale, 4 * scale, 24 * scale);
      shGrad.addColorStop(0, '#78350f');
      shGrad.addColorStop(0.6, '#451a03');
      shGrad.addColorStop(1, '#1c0a02');
      ctx.fillStyle = shGrad;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.8 * scale;
      ctx.beginPath();
      ctx.moveTo(-22 * scale, -18 * scale);
      ctx.lineTo(4 * scale, -18 * scale);
      ctx.quadraticCurveTo(6 * scale, 10 * scale, -9 * scale, 28 * scale);
      ctx.quadraticCurveTo(-24 * scale, 10 * scale, -22 * scale, -18 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Steel Shield Boss & Cross Strips
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.2 * scale;
      ctx.beginPath();
      ctx.moveTo(-9 * scale, -16 * scale);
      ctx.lineTo(-9 * scale, 24 * scale);
      ctx.moveTo(-20 * scale, -2 * scale);
      ctx.lineTo(2 * scale, -2 * scale);
      ctx.stroke();
    } else if (spriteKey === 'butcher_kaelgor') {
      // Heavy Iron Meat Hook on Chain in Left Hand
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.8 * scale;
      ctx.beginPath();
      ctx.moveTo(-4 * scale, 0);
      ctx.lineTo(-14 * scale, 18 * scale);
      ctx.arc(-20 * scale, 18 * scale, 7 * scale, 0, Math.PI * 1.35);
      ctx.stroke();
    } else if (spriteKey === 'countess_carmilla') {
      // Floating Ruby Blood Chalice (Ly Huyết Ngọc lơ lửng)
      const auraGrad = ctx.createRadialGradient(-10 * scale, -18 * scale, 2, -10 * scale, -18 * scale, 16 * scale);
      auraGrad.addColorStop(0, 'rgba(244, 63, 94, 0.85)');
      auraGrad.addColorStop(1, 'rgba(136, 19, 55, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(-10 * scale, -18 * scale, 16 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#eab308';
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      ctx.moveTo(-17 * scale, -26 * scale);
      ctx.lineTo(-3 * scale, -26 * scale);
      ctx.quadraticCurveTo(-4 * scale, -14 * scale, -10 * scale, -14 * scale);
      ctx.quadraticCurveTo(-16 * scale, -14 * scale, -17 * scale, -26 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-11.5 * scale, -14 * scale, 3 * scale, 8 * scale);
      ctx.fillRect(-15 * scale, -6 * scale, 10 * scale, 2.5 * scale);

      // Swirling blood droplet above chalice
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(-10 * scale, -31 * scale, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (spriteKey === 'dullahan_knight') {
      // Blazing Severed Skull held aloft in Left Hand
      const fireGrad = ctx.createRadialGradient(-10 * scale, -8 * scale, 2 * scale, -10 * scale, -8 * scale, 20 * scale);
      fireGrad.addColorStop(0, '#e0f2fe');
      fireGrad.addColorStop(0.45, '#38bdf8');
      fireGrad.addColorStop(0.75, '#7e22ce');
      fireGrad.addColorStop(1, 'rgba(59, 7, 100, 0)');
      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.arc(-10 * scale, -8 * scale, 20 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Spectral Flame tongues rising from skull
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(-18 * scale, -6 * scale);
      ctx.quadraticCurveTo(-22 * scale, -28 * scale, -10 * scale, -34 * scale);
      ctx.quadraticCurveTo(2 * scale, -26 * scale, -2 * scale, -6 * scale);
      ctx.closePath();
      ctx.fill();

      // Bone Skull
      ctx.fillStyle = '#f5ebd6';
      ctx.strokeStyle = '#09070a';
      ctx.lineWidth = 1.8 * scale;
      ctx.beginPath();
      ctx.arc(-10 * scale, -4 * scale, 9 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Cyan Eye Sockets & Jaw teeth
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(-13 * scale, -5 * scale, 2.4 * scale, 0, Math.PI * 2);
      ctx.arc(-7 * scale, -5 * scale, 2.4 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (spriteKey === 'demon_lord_vaelis') {
      // Swirling Abyssal Void Singularity Sphere (Quả Cầu Hư Vô xoáy tím đen)
      const orbRadius = (isTelegraphing ? 24 : 18) * scale;
      const orbGrad = ctx.createRadialGradient(-10 * scale, -6 * scale, 2, -10 * scale, -6 * scale, orbRadius);
      orbGrad.addColorStop(0, '#09050f');
      orbGrad.addColorStop(0.35, '#7e22ce');
      orbGrad.addColorStop(0.7, '#e879f9');
      orbGrad.addColorStop(1, 'rgba(59, 7, 100, 0)');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(-10 * scale, -6 * scale, orbRadius, 0, Math.PI * 2);
      ctx.fill();

      // Swirling Void Vortex arcs
      ctx.strokeStyle = '#f0abfc';
      ctx.lineWidth = 1.8 * scale;
      for (let a = 0; a < 3; a++) {
        ctx.beginPath();
        ctx.arc(-10 * scale, -6 * scale, (8 + a * 4) * scale, a, a + Math.PI * 1.1);
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }

  // =========================================================================
  // RIGHT-HAND PRIMARY WEAPONS
  // =========================================================================
  ctx.strokeStyle = '#070608';
  ctx.lineWidth = 1.8 * scale;

  if (spriteKey === 'night_hunter') {
    // Serrated Curved Dagger (Dao Găm Cong lưỡi răng cưa)
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-3 * scale, -2 * scale, 6 * scale, 10 * scale);
    const bladeGrad = ctx.createLinearGradient(0, 0, 22 * scale, -34 * scale);
    bladeGrad.addColorStop(0, '#94a3b8');
    bladeGrad.addColorStop(0.6, '#f1f5f9');
    bladeGrad.addColorStop(1, '#16a34a'); // Poisoned tip
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(2 * scale, 0);
    ctx.bezierCurveTo(22 * scale, -8 * scale, 26 * scale, -28 * scale, 8 * scale, -36 * scale);
    ctx.bezierCurveTo(16 * scale, -24 * scale, 12 * scale, -10 * scale, -2 * scale, -2 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (spriteKey === 'forsaken_nun') {
    // Holy Mother Mace with Engraved Cross (Chùy Thánh Mẫu đầu tròn khắc thập tự)
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3.6 * scale;
    ctx.beginPath();
    ctx.moveTo(0, 10 * scale);
    ctx.lineTo(12 * scale, -28 * scale);
    ctx.stroke();

    const headX = 13 * scale;
    const headY = -32 * scale;
    const maceGrad = ctx.createRadialGradient(headX - 3 * scale, headY - 3 * scale, 2, headX, headY, 11 * scale);
    maceGrad.addColorStop(0, '#fef08a');
    maceGrad.addColorStop(0.55, '#eab308');
    maceGrad.addColorStop(1, '#713f12');
    ctx.fillStyle = maceGrad;
    ctx.strokeStyle = '#09070a';
    ctx.lineWidth = 1.8 * scale;
    ctx.beginPath();
    ctx.arc(headX, headY, 10.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Engraved Cross on Mace Head
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 2.2 * scale;
    ctx.beginPath();
    ctx.moveTo(headX, headY - 7 * scale);
    ctx.lineTo(headX, headY + 7 * scale);
    ctx.moveTo(headX - 6 * scale, headY - 1 * scale);
    ctx.lineTo(headX + 6 * scale, headY - 1 * scale);
    ctx.stroke();
  } else if (spriteKey === 'fanatic_zealot') {
    // Bloodied Reaper Sickle
    ctx.strokeStyle = '#5c3a21';
    ctx.lineWidth = 3.2 * scale;
    ctx.beginPath();
    ctx.moveTo(0, 6 * scale);
    ctx.lineTo(8 * scale, -18 * scale);
    ctx.stroke();

    const bladeGrad = ctx.createLinearGradient(4 * scale, -18 * scale, 24 * scale, -38 * scale);
    bladeGrad.addColorStop(0, '#94a3b8');
    bladeGrad.addColorStop(0.6, '#e2e8f0');
    bladeGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(7 * scale, -17 * scale);
    ctx.bezierCurveTo(26 * scale, -22 * scale, 26 * scale, -44 * scale, 4 * scale, -42 * scale);
    ctx.bezierCurveTo(16 * scale, -36 * scale, 16 * scale, -23 * scale, 5 * scale, -19 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (
    spriteKey === 'flagellant_monk' ||
    spriteKey === 'weeping_inquisitor' ||
    spriteKey === 'black_bone_skeleton'
  ) {
    // Spiked Morning Star Mace (Chùy gai sắt)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3.5 * scale;
    ctx.beginPath();
    ctx.moveTo(0, 8 * scale);
    ctx.lineTo(14 * scale, -28 * scale);
    ctx.stroke();

    const ballX = 15 * scale;
    const ballY = -32 * scale;
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#09070a';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.arc(ballX, ballY, 8.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(ballX + Math.cos(ang - 0.25) * 7 * scale, ballY + Math.sin(ang - 0.25) * 7 * scale);
      ctx.lineTo(ballX + Math.cos(ang) * 14.5 * scale, ballY + Math.sin(ang) * 14.5 * scale);
      ctx.lineTo(ballX + Math.cos(ang + 0.25) * 7 * scale, ballY + Math.sin(ang + 0.25) * 7 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (spriteKey === 'executioner_paladin') {
    // Colossal Judgment Warhammer (Búa Phán Quyết khổng lồ)
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 4.2 * scale;
    ctx.beginPath();
    ctx.moveTo(-2 * scale, 14 * scale);
    ctx.lineTo(16 * scale, -44 * scale);
    ctx.stroke();

    const hamGrad = ctx.createLinearGradient(2 * scale, -52 * scale, 32 * scale, -34 * scale);
    hamGrad.addColorStop(0, '#fef08a');
    hamGrad.addColorStop(0.5, '#cbd5e1');
    hamGrad.addColorStop(1, '#475569');
    ctx.fillStyle = hamGrad;
    ctx.strokeStyle = '#09070a';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(2 * scale, -48 * scale);
    ctx.lineTo(30 * scale, -36 * scale);
    ctx.lineTo(26 * scale, -24 * scale);
    ctx.lineTo(-2 * scale, -36 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (spriteKey === 'butcher_kaelgor') {
    // Spinning Serrated Chainsaw spraying orange sparks (Cưa xích răng cưa quay tít bắn tia lửa)
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(-4 * scale, -10 * scale, 15 * scale, 15 * scale);
    ctx.strokeRect(-4 * scale, -10 * scale, 15 * scale, 15 * scale);

    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(6 * scale, -6 * scale);
    ctx.lineTo(28 * scale, -54 * scale);
    ctx.lineTo(37 * scale, -49 * scale);
    ctx.lineTo(15 * scale, -1 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Serrated Saw Teeth
    ctx.fillStyle = '#f8fafc';
    for (let t = 0; t < 7; t++) {
      const tx = (8 + t * 3.0) * scale;
      const ty = (-10 - t * 6.4) * scale;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - 5 * scale, ty - 3 * scale);
      ctx.lineTo(tx + 1 * scale, ty - 6 * scale);
      ctx.closePath();
      ctx.fill();
    }

    // Flying Orange Sparks from spinning chain
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2 * scale;
    for (const [sx, sy] of [
      [-8, -18],
      [-12, -28],
      [26, -34],
      [34, -44],
    ]) {
      ctx.beginPath();
      ctx.moveTo(sx * scale, sy * scale);
      ctx.lineTo((sx - 6) * scale, (sy - 5) * scale);
      ctx.stroke();
    }
  } else if (spriteKey === 'grand_abbess' || spriteKey === 'rotting_priest') {
    // Glowing Holy Mother Staff (Trượng Thánh Mẫu phát hào quang chói lòa)
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 3.6 * scale;
    ctx.beginPath();
    ctx.moveTo(2 * scale, 18 * scale);
    ctx.lineTo(15 * scale, -42 * scale);
    ctx.stroke();

    const haloR = (spriteKey === 'grand_abbess' ? (isTelegraphing ? 28 : 20) : 14) * scale;
    const glow = ctx.createRadialGradient(15 * scale, -46 * scale, 2, 15 * scale, -46 * scale, haloR);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.35, '#fef08a');
    glow.addColorStop(0.7, 'rgba(234, 179, 8, 0.55)');
    glow.addColorStop(1, 'rgba(234, 179, 8, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(15 * scale, -46 * scale, haloR, 0, Math.PI * 2);
    ctx.fill();

    // Converging Judgment Light Beams when Grand Abbess is telegraphing
    if (spriteKey === 'grand_abbess') {
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
      ctx.lineWidth = 1.8 * scale;
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI * 2) / 8;
        ctx.beginPath();
        ctx.moveTo(15 * scale + Math.cos(ang) * 9 * scale, -46 * scale + Math.sin(ang) * 9 * scale);
        ctx.lineTo(15 * scale + Math.cos(ang) * haloR, -46 * scale + Math.sin(ang) * haloR);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3.2 * scale;
    ctx.beginPath();
    ctx.moveTo(15 * scale, -58 * scale);
    ctx.lineTo(15 * scale, -34 * scale);
    ctx.moveTo(6 * scale, -48 * scale);
    ctx.lineTo(24 * scale, -48 * scale);
    ctx.stroke();
  } else if (spriteKey === 'demon_lord_vaelis') {
    // World-Ending Apocalypse Greatsword (Đại Đao Diệt Thế rực lửa dung nham)
    const bGrad = ctx.createLinearGradient(2 * scale, 4 * scale, 28 * scale, -64 * scale);
    bGrad.addColorStop(0, '#450a0a');
    bGrad.addColorStop(0.4, '#dc2626');
    bGrad.addColorStop(0.8, '#f97316');
    bGrad.addColorStop(1, '#fef08a');
    ctx.fillStyle = bGrad;
    ctx.strokeStyle = '#09050a';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(0, 4 * scale);
    ctx.lineTo(22 * scale, -62 * scale);
    ctx.lineTo(34 * scale, -54 * scale);
    ctx.lineTo(26 * scale, -34 * scale);
    ctx.lineTo(31 * scale, -28 * scale);
    ctx.lineTo(12 * scale, 8 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Horned Demon Crossguard
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3.8 * scale;
    ctx.beginPath();
    ctx.moveTo(-6 * scale, -2 * scale);
    ctx.quadraticCurveTo(6 * scale, 6 * scale, 18 * scale, 8 * scale);
    ctx.stroke();
  } else {
    // Broad Iron Sword / Penitent Greatsword / Butcher Cleaver
    const isColossal = spriteKey === 'penitent_knight' || spriteKey === 'dullahan_knight';
    const len = isColossal ? -58 : -46;
    const bGrad = ctx.createLinearGradient(4 * scale, 0, 22 * scale, len * scale);
    bGrad.addColorStop(0, '#64748b');
    bGrad.addColorStop(0.55, '#e2e8f0');
    bGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = bGrad;
    ctx.beginPath();
    ctx.moveTo(1 * scale, 2 * scale);
    ctx.lineTo(18 * scale, len * scale);
    ctx.lineTo(28 * scale, (len + 5) * scale);
    ctx.lineTo(10 * scale, 6 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3.4 * scale;
    ctx.beginPath();
    ctx.moveTo(-4 * scale, -1 * scale);
    ctx.lineTo(15 * scale, 8 * scale);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Renders Multi-Tone Layered Dark-Fantasy Vector Sprites for all 3 Playable Classes,
 * 15 Normal Enemies (with distinct quadruped/hulking/chained stances),
 * 10 Mini-Bosses, and Demon Lord Vaelis with Visual Telegraph FX.
 */
export function drawPixelSprite(
  ctx: CanvasRenderingContext2D,
  spriteKey: string,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  severedLimbs: Set<string> = new Set(),
  flashWhite: boolean = false,
  isOilCovered: boolean = false,
  isBlinded: boolean = false,
  isTelegraphing: boolean = false,
  animPhase: number = 0
) {
  ctx.save();
  ctx.translate(destX, destY);

  const cx = destW * 0.5;
  const cy = destH * 0.46;
  const scale = Math.min(destW / 120, destH / 160);

  // Per-Limb Idle Breathing Curves (sin/cos offsets per anatomical part instead of whole-sprite bounce)
  const torsoBreathY = Math.sin(animPhase) * 2.2 * scale;
  const torsoExpandX = 1 + Math.sin(animPhase) * 0.025;
  const headBobY = Math.sin(animPhase - 0.55) * 3.1 * scale;
  const headSwayX = Math.cos(animPhase * 0.7) * 1.4 * scale;
  const leftArmBobY = Math.sin(animPhase + 1.1) * 3.6 * scale;
  const leftArmSwayX = Math.cos(animPhase + 0.6) * 2.2 * scale;
  const rightArmBobY = Math.sin(animPhase + 2.3) * 3.8 * scale;
  const rightArmSwayX = Math.sin(animPhase * 0.9) * 2.4 * scale;
  const wingFlapY = Math.sin(animPhase * 1.3) * 4.5 * scale;

  // Archetype classification for Multi-Tone Material Separation
  const isPriestOrNun =
    spriteKey === 'rotting_priest' ||
    spriteKey === 'grand_abbess' ||
    spriteKey === 'forsaken_nun';
  const isCrimsonInquisitor =
    spriteKey === 'weeping_inquisitor' ||
    spriteKey === 'countess_carmilla' ||
    spriteKey === 'demon_lord_vaelis';
  const isArmoredKnight =
    spriteKey === 'penitent_knight' ||
    spriteKey === 'executioner_paladin' ||
    spriteKey === 'dullahan_knight' ||
    spriteKey === 'fallen_knight' ||
    spriteKey === 'armored_ghoul';
  const isVoidEntity =
    spriteKey.includes('void') ||
    spriteKey.includes('kraken') ||
    spriteKey.includes('ouroboros') ||
    spriteKey.includes('viper') ||
    spriteKey.includes('chimera');

  let fleshLight = isVoidEntity ? '#c084fc' : isArmoredKnight ? '#94a3b8' : '#c8ad93';
  let fleshMid = isVoidEntity ? '#6b21a8' : isArmoredKnight ? '#64748b' : '#8d6e57';
  let fleshDark = isVoidEntity ? '#2e1065' : isArmoredKnight ? '#1e293b' : '#433022';

  let garbLight = '#6e5246';
  let garbMid = '#3d2c26';
  let garbDark = '#17100e';
  let trimCol = '#c9a227';
  let eyeColor = '#ff3b30';

  if (isPriestOrNun) {
    garbLight = '#6d28d9';
    garbMid = '#3b0764';
    garbDark = '#170529';
    trimCol = '#facc15';
    eyeColor = '#fde047';
  } else if (isCrimsonInquisitor) {
    garbLight = '#b91c1c';
    garbMid = '#650911';
    garbDark = '#260306';
    trimCol = '#f59e0b';
    eyeColor = '#ff2a2a';
  } else if (isArmoredKnight) {
    garbLight = '#94a3b8';
    garbMid = '#475569';
    garbDark = '#1e293b';
    trimCol = '#d97706';
    eyeColor = '#38bdf8';
  } else if (spriteKey === 'night_hunter') {
    garbLight = '#3f4e44';
    garbMid = '#222b25';
    garbDark = '#0f1411';
    trimCol = '#a16207';
    eyeColor = '#4ade80';
  } else if (spriteKey === 'orc_berserker' || spriteKey === 'forge_goblin') {
    fleshLight = '#65a30d';
    fleshMid = '#3f6212';
    fleshDark = '#1a2e05';
    garbLight = '#7c2d12';
    garbMid = '#451a03';
    garbDark = '#1c0a02';
    trimCol = '#ca8a04';
    eyeColor = '#f97316';
  } else if (isVoidEntity) {
    garbLight = '#9333ea';
    garbMid = '#4c1d95';
    garbDark = '#1e1b4b';
    trimCol = '#e879f9';
    eyeColor = '#facc15';
  } else {
    garbLight = '#7c2d12';
    garbMid = '#451a03';
    garbDark = '#1c0a02';
    trimCol = '#d97706';
    eyeColor = '#ef4444';
  }

  if (flashWhite) {
    fleshLight = '#ffffff';
    fleshMid = '#fecaca';
    garbLight = '#fff1f2';
    garbMid = '#fda4af';
  } else if (isOilCovered) {
    garbLight = '#3b1d5e';
    garbMid = '#1b0b2e';
    garbDark = '#09040f';
  }

  ctx.strokeStyle = '#070509';
  ctx.lineWidth = Math.max(1.4, 2.1 * scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Ground shadow / blood pool beneath entity
  const shadowGrad = ctx.createRadialGradient(
    cx,
    destH * 0.91,
    destW * 0.05,
    cx,
    destH * 0.91,
    destW * 0.42
  );
  shadowGrad.addColorStop(0, isTelegraphing ? 'rgba(220, 38, 38, 0.85)' : 'rgba(120, 15, 22, 0.72)');
  shadowGrad.addColorStop(0.6, 'rgba(18, 9, 14, 0.5)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(cx, destH * 0.91, destW * 0.39, destH * 0.065, 0, 0, Math.PI * 2);
  ctx.fill();

  // Telegraph Warning Aura Ring behind Boss/Enemy when charging lethal attack
  if (isTelegraphing) {
    const teleGrad = ctx.createRadialGradient(cx, cy, 10 * scale, cx, cy, destW * 0.48);
    teleGrad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
    teleGrad.addColorStop(0.55, 'rgba(220, 38, 38, 0.28)');
    teleGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = teleGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, destW * 0.46, 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================================================
  // DEDICATED ANATOMY FOR 6 CANON NPCS & CHILD 13 (DISTINCT HEIGHTS & POSTURES)
  // =========================================================================
  if (spriteKey === 'npc_smith') {
    // 1. Kẻ Đúc Kiếm Không Đầu (Tầng 1): Hulking headless giant, charred apron, 4 massive arms + Iron Anvil
    // Anvil in foreground base
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#070509';
    ctx.lineWidth = 2 * scale;
    ctx.fillRect(cx - 24 * scale, destH * 0.72, 48 * scale, 16 * scale);
    ctx.strokeRect(cx - 24 * scale, destH * 0.72, 48 * scale, 16 * scale);
    ctx.beginPath();
    ctx.moveTo(cx - 32 * scale, destH * 0.66);
    ctx.lineTo(cx + 32 * scale, destH * 0.66);
    ctx.lineTo(cx + 22 * scale, destH * 0.73);
    ctx.lineTo(cx - 22 * scale, destH * 0.73);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hulking Torso & Charred Leather Apron with molten iron droplets
    ctx.fillStyle = '#5c4033';
    ctx.beginPath();
    ctx.ellipse(cx, destH * 0.46 + torsoBreathY, 34 * scale, 26 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#29150c';
    ctx.fillRect(cx - 24 * scale, destH * 0.34 + torsoBreathY, 48 * scale, 34 * scale);
    ctx.strokeRect(cx - 24 * scale, destH * 0.34 + torsoBreathY, 48 * scale, 34 * scale);

    // Molten iron droplets on apron
    ctx.fillStyle = '#f97316';
    for (const [mx, my] of [[-12, 0.42], [10, 0.48], [-6, 0.56], [14, 0.58]]) {
      ctx.beginPath();
      ctx.arc(cx + mx * scale, destH * my + torsoBreathY, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flat Scarred Neck Stump (NO HEAD)
    ctx.fillStyle = '#3b1c1a';
    ctx.beginPath();
    ctx.ellipse(cx, destH * 0.23 + torsoBreathY, 13 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4 Massive Arms: Upper 2 holding Sledgehammer & Tongs, Lower 2 gripping Anvil
    ctx.strokeStyle = '#6b4c3b';
    ctx.lineWidth = 9 * scale;
    // Lower arms gripping anvil
    ctx.beginPath();
    ctx.moveTo(cx - 28 * scale, destH * 0.48);
    ctx.lineTo(cx - 22 * scale, destH * 0.66);
    ctx.moveTo(cx + 28 * scale, destH * 0.48);
    ctx.lineTo(cx + 22 * scale, destH * 0.66);
    // Upper arms raised with Sledgehammer & Tongs
    ctx.moveTo(cx - 28 * scale, destH * 0.34);
    ctx.lineTo(cx - 40 * scale, destH * 0.20 + leftArmBobY);
    ctx.moveTo(cx + 28 * scale, destH * 0.34);
    ctx.lineTo(cx + 40 * scale, destH * 0.20 + rightArmBobY);
    ctx.stroke();

    // Heavy Blacksmith Hammer in Upper Right Hand
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#070509';
    ctx.lineWidth = 2 * scale;
    ctx.fillRect(cx + 30 * scale, destH * 0.08 + rightArmBobY, 20 * scale, 12 * scale);
    ctx.strokeRect(cx + 30 * scale, destH * 0.08 + rightArmBobY, 20 * scale, 12 * scale);
    ctx.restore();
    return;
  }

  if (spriteKey === 'npc_glass_lady') {
    // 2. Quý Cô Trong Lồng Kính (Tầng 1): Suspended cylindrical glass & rusted iron cage with pale bride inside
    // Suspension chain from ceiling
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, destH * 0.12);
    ctx.stroke();

    // Pale Maiden in tattered ivory wedding gown inside cage
    ctx.fillStyle = '#d6d3c4';
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 1.6 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 12 * scale, destH * 0.36);
    ctx.lineTo(cx + 12 * scale, destH * 0.36);
    ctx.lineTo(cx + 18 * scale, destH * 0.80);
    ctx.lineTo(cx - 18 * scale, destH * 0.80);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pale Face with purple spiderweb veins & dark unblinking eyes
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.arc(cx, destH * 0.26 + headBobY * 0.5, 10 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Purple veins on neck/cheeks
    ctx.strokeStyle = '#7e22ce';
    ctx.lineWidth = 1.1 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 4 * scale, destH * 0.34);
    ctx.lineTo(cx - 6 * scale, destH * 0.27);
    ctx.moveTo(cx + 4 * scale, destH * 0.34);
    ctx.lineTo(cx + 6 * scale, destH * 0.27);
    ctx.stroke();
    // Large dark unblinking eyes
    ctx.fillStyle = '#09050a';
    ctx.beginPath();
    ctx.arc(cx - 3.8 * scale, destH * 0.25, 2.2 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 3.8 * scale, destH * 0.25, 2.2 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Translucent Fogged Glass Cylinder & Rusted Iron Cage Frame
    ctx.fillStyle = 'rgba(203, 213, 225, 0.22)';
    ctx.fillRect(cx - 24 * scale, destH * 0.14, 48 * scale, destH * 0.70);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.6 * scale;
    ctx.strokeRect(cx - 24 * scale, destH * 0.14, 48 * scale, destH * 0.70);
    for (const bx of [-12, 0, 12]) {
      ctx.beginPath();
      ctx.moveTo(cx + bx * scale, destH * 0.14);
      ctx.lineTo(cx + bx * scale, destH * 0.84);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (spriteKey === 'npc_priest') {
    // 3. Giáo Sĩ Mù (Tầng 2): Hunched, low-crouching emaciated old man (much shorter than Knight), hollow eye sockets, bone necklace, bell staff
    const py = destH * 0.22; // Shifted down for low hunched posture
    // Wax-crusted grey robe hunched over
    ctx.fillStyle = '#4b5563';
    ctx.strokeStyle = '#09070a';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 22 * scale, py + destH * 0.66);
    ctx.quadraticCurveTo(cx - 26 * scale, py + destH * 0.26, cx, py + destH * 0.20 + torsoBreathY);
    ctx.quadraticCurveTo(cx + 24 * scale, py + destH * 0.26, cx + 20 * scale, py + destH * 0.66);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Finger-bone & wax necklace
    ctx.fillStyle = '#fef3c7';
    for (let b = -3; b <= 3; b++) {
      ctx.fillRect(cx + b * 4 * scale - 1.5 * scale, py + destH * 0.33, 3 * scale, 5 * scale);
    }

    // Emaciated Head with 2 Hollow Black Eye Sockets & deep cheek scars
    ctx.fillStyle = '#d6c7b2';
    ctx.beginPath();
    ctx.arc(cx - 3 * scale, py + destH * 0.24 + headBobY, 11 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#050406';
    ctx.beginPath();
    ctx.arc(cx - 7 * scale, py + destH * 0.23 + headBobY, 2.8 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 1 * scale, py + destH * 0.23 + headBobY, 2.8 * scale, 0, Math.PI * 2);
    ctx.fill();
    // Cheek scars from eye sockets
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.4 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 7 * scale, py + destH * 0.25 + headBobY);
    ctx.lineTo(cx - 7 * scale, py + destH * 0.31 + headBobY);
    ctx.moveTo(cx + 1 * scale, py + destH * 0.25 + headBobY);
    ctx.lineTo(cx + 1 * scale, py + destH * 0.31 + headBobY);
    ctx.stroke();

    // Wooden Staff with Rusted Bronze Bells
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3.2 * scale;
    ctx.beginPath();
    ctx.moveTo(cx + 18 * scale, py + destH * 0.66);
    ctx.lineTo(cx + 22 * scale, py + destH * 0.08);
    ctx.stroke();
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.arc(cx + 26 * scale, py + destH * 0.14, 4.5 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 18 * scale, py + destH * 0.18, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (spriteKey === 'npc_child_12' || spriteKey === 'child_13') {
    // 4. Thánh Tử Thứ 12 & Thánh Tử Thứ 13: Small 8–12 year old child anatomy (much shorter & smaller than adult classes!)
    const isChild12 = spriteKey === 'npc_child_12';
    if (isChild12) {
      // Vertical Iron Extraction Frame behind Child 12
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4 * scale;
      ctx.strokeRect(cx - 20 * scale, destH * 0.22, 40 * scale, destH * 0.64);
      // Brass & Gold Extraction Tubes plugged into spine draining yellow & black fluid
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2.6 * scale;
      for (const ty of [0.46, 0.54, 0.62]) {
        ctx.beginPath();
        ctx.moveTo(cx - 26 * scale, destH * (ty + 0.12));
        ctx.quadraticCurveTo(cx - 12 * scale, destH * ty, cx, destH * ty);
        ctx.lineTo(cx + 26 * scale, destH * (ty + 0.12));
        ctx.stroke();
      }
    }

    // Small Child Body (occupies lower-center, ~55% of adult height)
    const childTopY = destH * 0.44 + torsoBreathY * 0.6;
    ctx.fillStyle = '#cbd5e1'; // Tattered prisoner rags
    ctx.strokeStyle = '#09070a';
    ctx.lineWidth = 1.6 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 9 * scale, childTopY + 10 * scale);
    ctx.lineTo(cx + 9 * scale, childTopY + 10 * scale);
    ctx.lineTo(cx + 11 * scale, destH * 0.78);
    ctx.lineTo(cx - 11 * scale, destH * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bare thin child legs
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3.2 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 4 * scale, destH * 0.78);
    ctx.lineTo(cx - 5 * scale, destH * 0.89);
    ctx.moveTo(cx + 4 * scale, destH * 0.78);
    ctx.lineTo(cx + 5 * scale, destH * 0.89);
    ctx.stroke();

    // Small Child Head with bleached white hair
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, childTopY, 8.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Dark hollow eyes
    ctx.fillStyle = '#09050a';
    ctx.beginPath();
    ctx.arc(cx - 3 * scale, childTopY, 1.8 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 3 * scale, childTopY, 1.8 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Glowing golden seed hands for Child 13
    if (!isChild12) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.8)';
      ctx.beginPath();
      ctx.arc(cx - 11 * scale, childTopY + 20 * scale, 3.5 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 11 * scale, childTopY + 20 * scale, 3.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (spriteKey === 'npc_broken_knight') {
    // 5. Kỵ Sĩ Gãy Chân (Tầng 2): Slumped sitting helmetless knight, both legs crushed & bandaged in front, broken shield & shortblade
    const sitY = destH * 0.36;
    // Crushed bandaged legs stretched forward on the ground
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#070509';
    ctx.lineWidth = 2 * scale;
    ctx.fillRect(cx - 18 * scale, destH * 0.74, 36 * scale, 12 * scale);
    ctx.strokeRect(cx - 18 * scale, destH * 0.74, 36 * scale, 12 * scale);
    // Blood-soaked bandages on crushed legs
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(cx - 12 * scale, destH * 0.73, 24 * scale, 10 * scale);

    // Slumped Dented Breastplate
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.ellipse(cx, sitY + destH * 0.26 + torsoBreathY, 20 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Helmetless Scarred Face with matted beard
    ctx.fillStyle = '#d6b89c';
    ctx.beginPath();
    ctx.arc(cx, sitY + destH * 0.08 + headBobY * 0.5, 10.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#27272a'; // Beard
    ctx.fillRect(cx - 8 * scale, sitY + destH * 0.11, 16 * scale, 6 * scale);

    // Rusted Shortblade propped in right hand
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(cx + 20 * scale, destH * 0.64);
    ctx.lineTo(cx + 28 * scale, destH * 0.88);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (spriteKey === 'npc_physician') {
    // 6. Lão Thần Y Điên (Tầng 3): Sitting in crude iron-and-wood wheelchair, lower body & left arm petrified into grey limestone, cracked monocle
    // Wheelchair Wheels
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3.5 * scale;
    ctx.beginPath();
    ctx.arc(cx - 20 * scale, destH * 0.72, 15 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 20 * scale, destH * 0.72, 15 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Petrified Grey Limestone Lower Body & Left Arm fused to chair
    ctx.fillStyle = '#78716c';
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2 * scale;
    ctx.fillRect(cx - 16 * scale, destH * 0.54, 32 * scale, 24 * scale);
    ctx.strokeRect(cx - 16 * scale, destH * 0.54, 32 * scale, 24 * scale);

    // Scholar Torso & Right Arm holding glowing Elixir Vial
    ctx.fillStyle = '#3b0764';
    ctx.fillRect(cx - 14 * scale, destH * 0.34 + torsoBreathY, 28 * scale, 22 * scale);
    ctx.strokeRect(cx - 14 * scale, destH * 0.34 + torsoBreathY, 28 * scale, 22 * scale);

    // Wild White Hair/Beard & Cracked Monocle
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(cx, destH * 0.24 + headBobY * 0.5, 12 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#38bdf8'; // Monocle on right eye
    ctx.lineWidth = 1.8 * scale;
    ctx.beginPath();
    ctx.arc(cx + 4 * scale, destH * 0.23 + headBobY * 0.5, 3.8 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Glowing Green Elixir in right hand
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(cx + 22 * scale, destH * 0.42 + rightArmBobY, 5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (spriteKey === 'npc_chronicler') {
    // 8. Kẻ Chép Sử Hóa Thạch (Tầng 3 – Vực Sao): Hunched ancient scribe 80% petrified into runic limestone, holding glowing purple reconstruction scroll
    ctx.fillStyle = '#57534e';
    ctx.strokeStyle = '#09070a';
    ctx.lineWidth = 2 * scale;
    // Petrified stone robe base fused to floor
    ctx.beginPath();
    ctx.moveTo(cx - 22 * scale, destH * 0.88);
    ctx.lineTo(cx - 16 * scale, destH * 0.36 + torsoBreathY * 0.3);
    ctx.lineTo(cx + 16 * scale, destH * 0.36 + torsoBreathY * 0.3);
    ctx.lineTo(cx + 24 * scale, destH * 0.88);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hunched hooded scholar head (cracked stone)
    ctx.fillStyle = '#78716c';
    ctx.beginPath();
    ctx.arc(cx - 2 * scale, destH * 0.27 + headBobY * 0.3, 11.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing violet rune eyes
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(cx - 5 * scale, destH * 0.27 + headBobY * 0.3, 2 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 2 * scale, destH * 0.27 + headBobY * 0.3, 2 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Unfurling Reconstruction Scroll in hands
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(cx - 12 * scale, destH * 0.46, 24 * scale, 16 * scale);
    ctx.strokeRect(cx - 12 * scale, destH * 0.46, 24 * scale, 16 * scale);
    ctx.strokeStyle = '#9333ea';
    ctx.lineWidth = 1.4 * scale;
    ctx.beginPath();
    ctx.arc(cx, destH * 0.54, 4.5 * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 3 MINIBOSS 1: KẺ GÁC ĐỀN HÓA THẠCH (`astral_kraken` — 70% Grey Limestone + 30% Bleeding Red Flesh)
  // =========================================================================
  if (spriteKey === 'astral_kraken') {
    // tentacle_4: Chân trụ đá hóa thạch bám rễ xuống sàn (nx: 0.52, ny: 0.78)
    if (!severedLimbs.has('tentacle_4')) {
      ctx.fillStyle = '#57534e';
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 2.4 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 26 * scale, destH * 0.58);
      ctx.lineTo(cx + 28 * scale, destH * 0.58);
      ctx.lineTo(cx + 36 * scale, destH * 0.90);
      ctx.lineTo(cx - 34 * scale, destH * 0.90);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Deep black shadow mass & stone root cracks
      ctx.fillStyle = '#070509';
      ctx.fillRect(cx - 12 * scale, destH * 0.62, 16 * scale, 26 * scale);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.6 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 22 * scale, destH * 0.64);
      ctx.lineTo(cx - 16 * scale, destH * 0.86);
      ctx.moveTo(cx + 18 * scale, destH * 0.64);
      ctx.lineTo(cx + 24 * scale, destH * 0.86);
      ctx.stroke();
    } else {
      drawArterialStump(ctx, cx, destH * 0.76, 12 * scale);
    }

    // torso: Lồng ngực 70% đá vôi xám nứt nẻ, 30% thịt đỏ rỉ máu (nx: 0.50, ny: 0.46)
    ctx.save();
    ctx.translate(0, torsoBreathY * 0.4);
    ctx.fillStyle = '#78716c';
    ctx.strokeStyle = '#070509';
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 30 * scale, destH * 0.28);
    ctx.lineTo(cx + 30 * scale, destH * 0.28);
    ctx.lineTo(cx + 24 * scale, destH * 0.62);
    ctx.lineTo(cx - 24 * scale, destH * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 45% dark ink shadow block on right torso half
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.moveTo(cx + 2 * scale, destH * 0.29);
    ctx.lineTo(cx + 28 * scale, destH * 0.29);
    ctx.lineTo(cx + 23 * scale, destH * 0.61);
    ctx.lineTo(cx - 4 * scale, destH * 0.61);
    ctx.closePath();
    ctx.fill();
    // 30% Exposed Raw Bleeding Red Muscle Core
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.moveTo(cx - 12 * scale, destH * 0.36);
    ctx.lineTo(cx + 14 * scale, destH * 0.40);
    ctx.lineTo(cx + 8 * scale, destH * 0.56);
    ctx.lineTo(cx - 14 * scale, destH * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // tentacle_3: Tấm giáp vai đá khổng lồ (nx: 0.31, ny: 0.26)
    if (!severedLimbs.has('tentacle_3')) {
      ctx.fillStyle = '#a8a29e';
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 2.4 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 44 * scale, destH * 0.18);
      ctx.lineTo(cx - 14 * scale, destH * 0.20);
      ctx.lineTo(cx - 18 * scale, destH * 0.36);
      ctx.lineTo(cx - 46 * scale, destH * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      drawArterialStump(ctx, cx - 28 * scale, destH * 0.26, 9 * scale);
    }

    // tentacle_2: Cánh tay trái hóa thạch nứt toác giơ lên che ngực (nx: 0.25, ny: 0.44)
    if (!severedLimbs.has('tentacle_2')) {
      ctx.fillStyle = '#78716c';
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 2.4 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 42 * scale, destH * 0.34);
      ctx.lineTo(cx - 16 * scale, destH * 0.38);
      ctx.lineTo(cx - 12 * scale, destH * 0.56);
      ctx.lineTo(cx - 38 * scale, destH * 0.54);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Jagged cracks
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 1.6 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 34 * scale, destH * 0.38);
      ctx.lineTo(cx - 22 * scale, destH * 0.46);
      ctx.lineTo(cx - 28 * scale, destH * 0.52);
      ctx.stroke();
    } else {
      drawArterialStump(ctx, cx - 28 * scale, destH * 0.44, 9 * scale);
    }

    // tentacle_1: Cánh Tay Phải khổng lồ liền khối với thanh Đại Kiếm Đá sắc lẹm (nx: 0.77, ny: 0.48)
    if (!severedLimbs.has('tentacle_1')) {
      ctx.save();
      ctx.translate(0, rightArmBobY * 0.5);
      ctx.fillStyle = '#a8a29e';
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.moveTo(cx + 24 * scale, destH * 0.28);
      ctx.lineTo(cx + 46 * scale, destH * 0.14);
      ctx.lineTo(cx + 56 * scale, destH * 0.84);
      ctx.lineTo(cx + 32 * scale, destH * 0.88);
      ctx.lineTo(cx + 24 * scale, destH * 0.48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Deep ink shadow along blade spine & bleeding tendon veins at shoulder joint
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.moveTo(cx + 26 * scale, destH * 0.32);
      ctx.lineTo(cx + 38 * scale, destH * 0.30);
      ctx.lineTo(cx + 42 * scale, destH * 0.82);
      ctx.lineTo(cx + 32 * scale, destH * 0.86);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      drawArterialStump(ctx, cx + 30 * scale, destH * 0.42, 10 * scale);
    }

    // head: Đầu chiến binh cổ đại hóa đá nứt nẻ (nx: 0.50, ny: 0.18)
    if (!severedLimbs.has('head')) {
      ctx.fillStyle = '#78716c';
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 2.4 * scale;
      ctx.beginPath();
      ctx.arc(cx, destH * 0.18 + headBobY * 0.4, 15 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#070509';
      ctx.fillRect(cx - 10 * scale, destH * 0.16 + headBobY * 0.4, 20 * scale, 5 * scale);
      ctx.fillStyle = isBlinded ? '#450a0a' : '#ef4444';
      ctx.beginPath();
      ctx.arc(cx + 5 * scale, destH * 0.18 + headBobY * 0.4, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawArterialStump(ctx, cx, destH * 0.18, 11 * scale);
    }
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 3 MINIBOSS 2: THÍ NGHIỆM SỐ 09 – CÀNH CÂY THỊT (`ouroboros_serpent`)
  // =========================================================================
  if (spriteKey === 'ouroboros_serpent') {
    // coiling_body: Rễ cây bằng xương trắng và gân máu cắm sâu xuống sàn (nx: 0.34, ny: 0.76)
    if (!severedLimbs.has('coiling_body')) {
      for (const rx of [-32, -16, 0, 18, 34]) {
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 8 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + rx * 0.3 * scale, destH * 0.58);
        ctx.quadraticCurveTo(cx + rx * scale, destH * 0.74, cx + rx * 1.3 * scale, destH * 0.90);
        ctx.stroke();
        // White bone root core
        ctx.strokeStyle = '#e7dcc8';
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + rx * 0.3 * scale, destH * 0.60);
        ctx.quadraticCurveTo(cx + rx * 0.9 * scale, destH * 0.74, cx + rx * 1.2 * scale, destH * 0.88);
        ctx.stroke();
      }
    } else {
      drawArterialStump(ctx, cx - 18 * scale, destH * 0.74, 11 * scale);
    }

    // torso: Lồng ngực banh rộng mọc lên thân cây thịt trắng bệch (nx: 0.50, ny: 0.46)
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#070509';
    ctx.lineWidth = 2.4 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 18 * scale, destH * 0.64);
    ctx.quadraticCurveTo(cx - 12 * scale, destH * 0.44, cx - 14 * scale, destH * 0.24);
    ctx.lineTo(cx + 14 * scale, destH * 0.24);
    ctx.quadraticCurveTo(cx + 12 * scale, destH * 0.44, cx + 18 * scale, destH * 0.64);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Splayed open ribs at base of flesh trunk
    ctx.strokeStyle = '#070509';
    ctx.lineWidth = 2.6 * scale;
    for (const dir of [-1, 1]) {
      for (let r = 0; r < 3; r++) {
        const ry = destH * (0.44 + r * 0.06);
        ctx.beginPath();
        ctx.moveTo(cx + dir * 6 * scale, ry);
        ctx.quadraticCurveTo(cx + dir * 26 * scale, ry - 6 * scale, cx + dir * 30 * scale, ry + 4 * scale);
        ctx.stroke();
      }
    }

    // lashing_tail: Cành cây mọc hàng chục bàn tay người nhỏ xíu co giật (nx: 0.73, ny: 0.38)
    if (!severedLimbs.has('lashing_tail')) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4.5 * scale;
      ctx.beginPath();
      ctx.moveTo(cx + 10 * scale, destH * 0.38);
      ctx.quadraticCurveTo(cx + 32 * scale, destH * 0.32, cx + 46 * scale, destH * 0.42 + rightArmBobY);
      ctx.stroke();
      // Twitching tiny human hands along the branch
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1.8 * scale;
      for (const [hx, hy] of [[24, 0.34], [34, 0.38], [44, 0.42], [30, 0.46], [40, 0.30]]) {
        const px = cx + hx * scale;
        const py = destH * hy + rightArmBobY * 0.6;
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(px, py, 3.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        for (let f = -2; f <= 2; f++) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + f * 2.2 * scale, py - 5.5 * scale);
          ctx.stroke();
        }
      }
    } else {
      drawArterialStump(ctx, cx + 24 * scale, destH * 0.38, 8 * scale);
    }

    // head: Các cành treo lủng lẳng những quả cầu thịt đập thình thịch như trái tim (nx: 0.50, ny: 0.18)
    if (!severedLimbs.has('head')) {
      const pulse = 1 + Math.sin(animPhase * 2.2) * 0.12;
      for (const [bx, by] of [[-26, 0.16], [0, 0.10], [26, 0.16], [-14, 0.24], [14, 0.24]]) {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3.5 * scale;
        ctx.beginPath();
        ctx.moveTo(cx, destH * 0.28);
        ctx.lineTo(cx + bx * scale, destH * by + headBobY);
        ctx.stroke();

        ctx.fillStyle = '#991b1b';
        ctx.strokeStyle = '#070509';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.arc(cx + bx * scale, destH * by + headBobY, 8 * scale * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else {
      drawArterialStump(ctx, cx, destH * 0.22, 11 * scale);
    }
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 3 NORMAL VIPER: MÃNG XÀ KHÔNG GIAN (`dimensional_viper`)
  // =========================================================================
  if (spriteKey === 'dimensional_viper') {
    // Coiled star-scaled serpent body (`coiling_body` & `lashing_tail`)
    ctx.strokeStyle = '#4c1d95';
    ctx.lineWidth = 14 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 32 * scale, destH * 0.78);
    ctx.bezierCurveTo(cx - 42 * scale, destH * 0.52, cx + 42 * scale, destH * 0.56, cx + 34 * subScale(scale), destH * 0.80);
    ctx.stroke();
    // Upper torso & hooded fanged head
    ctx.strokeStyle = '#7e22ce';
    ctx.lineWidth = 11 * scale;
    ctx.beginPath();
    ctx.moveTo(cx, destH * 0.66);
    ctx.quadraticCurveTo(cx - 10 * scale, destH * 0.42, cx, destH * 0.20 + headBobY);
    ctx.stroke();
    if (!severedLimbs.has('head')) {
      ctx.fillStyle = '#3b0764';
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.ellipse(cx, destH * 0.20 + headBobY, 18 * scale, 12 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(cx - 6 * scale, destH * 0.18 + headBobY, 2.5 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 6 * scale, destH * 0.18 + headBobY, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 3 BOSS: SỨ GIẢ CỦA VẾT RÁCH (`void_chimera` — Night Sky Shard + Reverse-Bent Crystal Fingers + CCW Meteorite Halo)
  // =========================================================================
  if (spriteKey === 'void_chimera') {
    // legs: Nửa dưới tan vào sương mù chướng khí (nx: 0.50, ny: 0.78)
    const mistGrad = ctx.createLinearGradient(cx, destH * 0.52, cx, destH * 0.94);
    mistGrad.addColorStop(0, '#1e1b4b');
    mistGrad.addColorStop(0.55, 'rgba(76, 29, 149, 0.75)');
    mistGrad.addColorStop(1, 'rgba(7, 5, 9, 0)');
    ctx.fillStyle = mistGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 28 * scale, destH * 0.52);
    ctx.lineTo(cx + 28 * scale, destH * 0.52);
    ctx.lineTo(cx + 44 * scale, destH * 0.92);
    ctx.lineTo(cx - 44 * scale, destH * 0.92);
    ctx.closePath();
    ctx.fill();

    // torso: Mảnh vỡ bầu trời đêm chứa các chòm sao tím và mắt không mí (nx: 0.50, ny: 0.48)
    ctx.fillStyle = '#07040e';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.6 * scale;
    ctx.beginPath();
    ctx.moveTo(cx, destH * 0.24);
    ctx.lineTo(cx + 32 * scale, destH * 0.34);
    ctx.lineTo(cx + 24 * scale, destH * 0.66);
    ctx.lineTo(cx - 24 * scale, destH * 0.66);
    ctx.lineTo(cx - 32 * scale, destH * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Violet constellations & lidless eyes inside night-sky torso
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.55)';
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 14 * scale, destH * 0.36);
    ctx.lineTo(cx, destH * 0.46);
    ctx.lineTo(cx + 14 * scale, destH * 0.38);
    ctx.lineTo(cx + 10 * scale, destH * 0.56);
    ctx.lineTo(cx - 12 * scale, destH * 0.54);
    ctx.closePath();
    ctx.stroke();
    for (const [ex, ey] of [[-12, 0.38], [12, 0.38], [0, 0.46], [-10, 0.54], [10, 0.54]]) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(cx + ex * scale, destH * ey, 4 * scale, 2.2 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#070509';
      ctx.beginPath();
      ctx.arc(cx + ex * scale, destH * ey, 1.3 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // right_arm (Left side of screen, nx: 0.25, ny: 0.50) & snake_tail_head (Right side of screen, nx: 0.74, ny: 0.38):
    // Đôi tay tinh thể tím có các khớp ngón tay bẻ gập ngược chiều tự nhiên
    const drawCrystalArm = (dir: -1 | 1, limbId: string) => {
      if (severedLimbs.has(limbId)) {
        drawArterialStump(ctx, cx + dir * 30 * scale, destH * 0.42, 9 * scale);
        return;
      }
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 5 * scale;
      const elbowX = cx + dir * 46 * scale;
      const elbowY = destH * 0.48 + rightArmBobY;
      const wristX = cx + dir * 36 * scale;
      const wristY = destH * 0.68 + rightArmBobY;
      ctx.beginPath();
      ctx.moveTo(cx + dir * 28 * scale, destH * 0.34);
      ctx.lineTo(elbowX, elbowY);
      ctx.lineTo(wristX, wristY);
      ctx.stroke();
      // Reverse-bent unnatural crystal finger joints (bẻ gập ngược chiều tự nhiên lên trên)
      ctx.lineWidth = 2.2 * scale;
      for (let f = -1; f <= 2; f++) {
        const knX = wristX + dir * (4 + f * 3.5) * scale;
        const knY = wristY + 6 * scale;
        ctx.beginPath();
        ctx.moveTo(wristX, wristY);
        ctx.lineTo(knX, knY);
        // Bent sharply backward/upward at unnatural angle
        ctx.lineTo(knX + dir * 7 * scale, knY - 11 * scale);
        ctx.stroke();
      }
    };
    drawCrystalArm(-1, 'right_arm');
    drawCrystalArm(1, 'snake_tail_head');

    // head: Khoảng không méo mó không mặt + Vầng hào quang đá thiên thạch đen xoay ngược chiều kim đồng hồ (nx: 0.50, ny: 0.18)
    if (!severedLimbs.has('head')) {
      const hy = destH * 0.18 + headBobY;
      ctx.fillStyle = '#030108';
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 2.4 * scale;
      ctx.beginPath();
      ctx.arc(cx, hy, 13 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Counter-clockwise rotating halo of jagged black meteorite stones (-animPhase)
      for (let m = 0; m < 7; m++) {
        const ang = -animPhase * 1.1 + (m * Math.PI * 2) / 7;
        const mx = cx + Math.cos(ang) * 26 * scale;
        const my = hy + Math.sin(ang) * 9.5 * scale;
        ctx.fillStyle = '#09070c';
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.6 * scale;
        ctx.beginPath();
        ctx.moveTo(mx - 4 * scale, my - 2 * scale);
        ctx.lineTo(mx + 1 * scale, my - 5 * scale);
        ctx.lineTo(mx + 5 * scale, my + 2 * scale);
        ctx.lineTo(mx - 2 * scale, my + 4 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else {
      drawArterialStump(ctx, cx, destH * 0.18, 10 * scale);
    }
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 1 BOSS: HIỆP SĨ TRƯỞNG VAELIS (`demon_lord_vaelis` — Fused to Blood Throne, 5 Impaled Greatswords, Hollow Bleeding Eyes)
  // =========================================================================
  if (spriteKey === 'demon_lord_vaelis') {
    // 1. Hậu cảnh: Ngai Vàng Máu đúc từ xương sọ và sắt đen + 5 thanh đại kiếm gỉ sét cắm xuyên chéo
    ctx.fillStyle = '#0d090f';
    ctx.strokeStyle = '#070509';
    ctx.lineWidth = 2.6 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 44 * scale, destH * 0.88);
    ctx.lineTo(cx - 38 * scale, destH * 0.08);
    ctx.lineTo(cx, destH * 0.02);
    ctx.lineTo(cx + 38 * scale, destH * 0.08);
    ctx.lineTo(cx + 44 * scale, destH * 0.88);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Skulls embedded in the Blood Throne backrest
    ctx.fillStyle = '#9ca3af';
    for (const [skX, skY] of [[-26, 0.14], [26, 0.14], [-32, 0.28], [32, 0.28], [0, 0.07]]) {
      ctx.beginPath();
      ctx.arc(cx + skX * scale, destH * skY, 5.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 5 Rusted Greatswords impaling diagonally through Vaelis's ribcage into the throne back
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 3.2 * scale;
    for (const [sx, sy, ex, ey] of [
      [-48, 0.10, -6, 0.46],
      [48, 0.10, 6, 0.46],
      [-46, 0.24, -8, 0.52],
      [46, 0.24, 8, 0.52],
      [0, 0.04, 0, 0.48],
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * scale, destH * sy);
      ctx.lineTo(cx + ex * scale, destH * ey);
      ctx.stroke();
      // Crossguard at outer hilt
      ctx.beginPath();
      ctx.moveTo(cx + (sx - 5) * scale, destH * (sy + 0.03));
      ctx.lineTo(cx + (sx + 5) * scale, destH * (sy - 0.03));
      ctx.stroke();
    }

    // legs: Đôi chân giáp nặng bị xiềng xích quấn chặt vào chân ngai xương (nx: 0.50, ny: 0.76)
    if (!severedLimbs.has('legs')) {
      for (const dir of [-1, 1]) {
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#070509';
        ctx.lineWidth = 2.4 * scale;
        ctx.fillRect(cx + (dir * 18 - 9) * scale, destH * 0.58, 18 * scale, 30 * scale);
        ctx.strokeRect(cx + (dir * 18 - 9) * scale, destH * 0.58, 18 * scale, 30 * scale);
      }
      // Heavy black chains binding legs to throne base
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3 * scale;
      ctx.setLineDash([4 * scale, 2 * scale]);
      ctx.beginPath();
      ctx.moveTo(cx - 38 * scale, destH * 0.70);
      ctx.lineTo(cx + 38 * scale, destH * 0.76);
      ctx.moveTo(cx - 38 * scale, destH * 0.80);
      ctx.lineTo(cx + 38 * scale, destH * 0.72);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      drawArterialStump(ctx, cx, destH * 0.74, 12 * scale);
    }

    // torso: Cơ thể Vaelis khổng lồ hốc hác ngồi hợp nhất vào ngai, lồng ngực lộ xương sườn xám ngoét & máu tím (nx: 0.50, ny: 0.44)
    ctx.save();
    ctx.translate(0, torsoBreathY * 0.5);
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#070509';
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 28 * scale, destH * 0.28);
    ctx.lineTo(cx + 28 * scale, destH * 0.28);
    ctx.lineTo(cx + 22 * scale, destH * 0.60);
    ctx.lineTo(cx - 22 * scale, destH * 0.60);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Exposed ashen ribcage & purple blood oozing down to floor
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.2 * scale;
    for (let r = 0; r < 4; r++) {
      const ry = destH * (0.34 + r * 0.05);
      ctx.beginPath();
      ctx.moveTo(cx - 16 * scale, ry);
      ctx.quadraticCurveTo(cx, ry + 4 * scale, cx + 16 * scale, ry);
      ctx.stroke();
    }
    ctx.fillStyle = '#7e22ce';
    ctx.fillRect(cx - 5 * scale, destH * 0.44, 10 * scale, 28 * scale);
    ctx.restore();

    // left_arm: Tay trái gầy guộc giật tung các sợi xiềng xích sắt đen ghim xuống sàn (nx: 0.26, ny: 0.48)
    if (!severedLimbs.has('left_arm')) {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 7 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 26 * scale, destH * 0.32);
      ctx.lineTo(cx - 38 * scale, destH * 0.50 + leftArmBobY);
      ctx.stroke();
      // Black iron chains pulled taut to floor
      ctx.strokeStyle = '#09070c';
      ctx.lineWidth = 3.2 * scale;
      ctx.setLineDash([5 * scale, 2 * scale]);
      ctx.beginPath();
      ctx.moveTo(cx - 38 * scale, destH * 0.50 + leftArmBobY);
      ctx.lineTo(cx - 48 * scale, destH * 0.88);
      ctx.moveTo(cx - 38 * scale, destH * 0.50 + leftArmBobY);
      ctx.lineTo(cx - 26 * scale, destH * 0.88);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      drawArterialStump(ctx, cx - 28 * scale, destH * 0.36, 9 * scale);
    }

    // right_arm: Tay phải bọc giáp siết thanh Trường Kiếm Thống Khổ rực lửa đen (nx: 0.76, ny: 0.44)
    if (!severedLimbs.has('right_arm')) {
      ctx.save();
      ctx.translate(0, rightArmBobY);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 8 * scale;
      ctx.beginPath();
      ctx.moveTo(cx + 26 * scale, destH * 0.32);
      ctx.lineTo(cx + 38 * scale, destH * 0.48);
      ctx.stroke();
      // Trường Kiếm Thống Khổ rực lửa đen-đỏ
      ctx.fillStyle = '#070509';
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.2 * scale;
      ctx.beginPath();
      ctx.moveTo(cx + 34 * scale, destH * 0.52);
      ctx.lineTo(cx + 46 * scale, destH * 0.06);
      ctx.lineTo(cx + 54 * scale, destH * 0.10);
      ctx.lineTo(cx + 42 * scale, destH * 0.56);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else {
      drawArterialStump(ctx, cx + 28 * scale, destH * 0.36, 9 * scale);
    }

    // head: Mũ trụ kỵ sĩ vỡ toác một nửa, lộ khuôn mặt già nua với 2 hốc mắt đen rỗng chảy lệ máu đen (nx: 0.50, ny: 0.19)
    if (!severedLimbs.has('head')) {
      const hy = destH * 0.19 + headBobY * 0.4;
      // Gaunt aged face
      ctx.fillStyle = '#9ca3af';
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 2.2 * scale;
      ctx.beginPath();
      ctx.arc(cx, hy, 13 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Half-shattered knight helm covering left half of head
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(cx, hy, 14 * scale, Math.PI * 0.55, Math.PI * 1.65);
      ctx.lineTo(cx, hy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Two hollow black eye sockets weeping black blood
      ctx.fillStyle = '#050307';
      ctx.beginPath();
      ctx.arc(cx - 4.5 * scale, hy - 1 * scale, 2.8 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 4.5 * scale, hy - 1 * scale, 2.8 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 4.5 * scale, hy + 2 * scale);
      ctx.lineTo(cx - 4.5 * scale, hy + 11 * scale);
      ctx.moveTo(cx + 4.5 * scale, hy + 2 * scale);
      ctx.lineTo(cx + 4.5 * scale, hy + 11 * scale);
      ctx.stroke();
    } else {
      drawArterialStump(ctx, cx, destH * 0.19, 10 * scale);
    }
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 1 MINIBOSS 1: ĐAO PHỦ HẦM NGỤC (`butcher_kaelgor` & `dullahan_knight` — Iron Crow Cage on Neck Stump + Barbed-Wire Butcher Apron)
  // =========================================================================
  if (spriteKey === 'butcher_kaelgor' || spriteKey === 'dullahan_knight') {
    // legs: Đôi ủng sắt đẫm máu (nx: 0.50, ny: 0.76)
    if (!severedLimbs.has('legs')) {
      for (const dir of [-1, 1]) {
        ctx.fillStyle = '#1c1917';
        ctx.strokeStyle = '#070509';
        ctx.lineWidth = 2.4 * scale;
        ctx.fillRect(cx + (dir * 15 - 9) * scale, destH * 0.58, 18 * scale, 30 * scale);
        ctx.strokeRect(cx + (dir * 15 - 9) * scale, destH * 0.58, 18 * scale, 30 * scale);
      }
    } else {
      drawArterialStump(ctx, cx, destH * 0.72, 11 * scale);
    }

    // torso: Thân hình đồ sộ mặc tạp dề da thuộc dày cộp bê bết máu khô và khâu bằng dây thép gai (nx: 0.50, ny: 0.46)
    ctx.save();
    ctx.translate(0, torsoBreathY);
    ctx.fillStyle = '#451a03';
    ctx.strokeStyle = '#070509';
    ctx.lineWidth = 2.6 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 32 * scale, destH * 0.28);
    ctx.lineTo(cx + 32 * scale, destH * 0.28);
    ctx.lineTo(cx + 28 * scale, destH * 0.64);
    ctx.lineTo(cx - 28 * scale, destH * 0.64);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 45% Grimdark Black Shadow Mass on right side + blood-caked apron
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(cx - 22 * scale, destH * 0.32, 44 * scale, 32 * scale);
    ctx.strokeRect(cx - 22 * scale, destH * 0.32, 44 * scale, 32 * scale);
    ctx.fillStyle = 'rgba(7, 5, 9, 0.55)';
    ctx.fillRect(cx, destH * 0.28, 28 * scale, 36 * scale);
    // Barbed-wire stitches across apron
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.8 * scale;
    for (const sy of [0.38, 0.46, 0.54]) {
      ctx.beginPath();
      ctx.moveTo(cx - 20 * scale, destH * sy);
      ctx.lineTo(cx + 20 * scale, destH * (sy + 0.03));
      ctx.stroke();
    }
    ctx.restore();

    // left_arm: Kéo lê sợi xích sắt nặng gắn móc treo thịt / lồng quạ phụ (nx: 0.25, ny: 0.46)
    if (!severedLimbs.has('left_arm')) {
      ctx.save();
      ctx.translate(leftArmSwayX, leftArmBobY);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 9 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 30 * scale, destH * 0.32);
      ctx.lineTo(cx - 40 * scale, destH * 0.52);
      ctx.stroke();
      // Heavy chain + iron meat hook
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.8 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 40 * scale, destH * 0.52);
      ctx.lineTo(cx - 44 * scale, destH * 0.72);
      ctx.arc(cx - 48 * scale, destH * 0.74, 7 * scale, 0, Math.PI * 1.35);
      ctx.stroke();
      ctx.restore();
    } else {
      drawArterialStump(ctx, cx - 30 * scale, destH * 0.36, 9 * scale);
    }

    // right_arm: Cầm Rìu Chặt Đầu / Cưa Xích Rỉ Máu khổng lồ mẻ lưỡi (nx: 0.75, ny: 0.44)
    if (!severedLimbs.has('right_arm')) {
      ctx.save();
      ctx.translate(rightArmSwayX, rightArmBobY);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 9 * scale;
      ctx.beginPath();
      ctx.moveTo(cx + 30 * scale, destH * 0.32);
      ctx.lineTo(cx + 38 * scale, destH * 0.50);
      ctx.stroke();
      drawDetailedWeapon(ctx, 'butcher_kaelgor', 'right', cx + 36 * scale, destH * 0.50, scale, isTelegraphing);
      ctx.restore();
    } else {
      drawArterialStump(ctx, cx + 30 * scale, destH * 0.36, 9 * scale);
    }

    // head: Cổ cụt ngang hàn chặt chiếc lồng sắt hình trụ nhốt đầy quạ đen chết (nx: 0.50, ny: 0.18)
    if (!severedLimbs.has('head')) {
      const cyCage = destH * 0.17 + headBobY * 0.5;
      // Dead black crows stuffed inside cage
      ctx.fillStyle = '#09070c';
      ctx.beginPath();
      ctx.arc(cx - 4 * scale, cyCage + 3 * scale, 8 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 5 * scale, cyCage + 1 * scale, 7 * scale, 0, Math.PI * 2);
      ctx.fill();
      if (!severedLimbs.has('left_arm') && !isBlinded) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(cx - 5 * scale, cyCage + 1 * scale, 2 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 5 * scale, cyCage, 2 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      // Cylindrical rusted iron cage bars welded to neck stump
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.4 * scale;
      ctx.strokeRect(cx - 15 * scale, cyCage - 11 * scale, 30 * scale, 22 * scale);
      for (const bx of [-9, -3, 3, 9]) {
        ctx.beginPath();
        ctx.moveTo(cx + bx * scale, cyCage - 11 * scale);
        ctx.lineTo(cx + bx * scale, cyCage + 11 * scale);
        ctx.stroke();
      }
    } else {
      drawArterialStump(ctx, cx, destH * 0.24, 10 * scale);
    }
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 1 MINIBOSS 2: QUÁI VẬT HỢP THỂ KỴ ĐOÀN (`countess_carmilla` & `fenrir_kin` — Melted Fused Armor Mass, 4 Screaming Heads, 6 Crawling Armored Arms)
  // =========================================================================
  if (spriteKey === 'countess_carmilla' || spriteKey === 'fenrir_kin') {
    // Broken spears & shattered shields jutting from back
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3 * scale;
    for (const [sx, sy, ex, ey] of [
      [-28, 0.34, -44, 0.08],
      [0, 0.30, -8, 0.04],
      [26, 0.34, 42, 0.08],
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * scale, destH * sy);
      ctx.lineTo(cx + ex * scale, destH * ey);
      ctx.stroke();
    }

    // 6 Crawling Rusted Armored Arms on floor (left_arm = 2 left arms, right_arm = 2 right arms, legs = 2 front lower arms)
    const drawCrawlingArmPair = (
      limbId: string,
      anchors: Array<[number, number, number, number]>
    ) => {
      if (severedLimbs.has(limbId)) {
        const [sx, sy] = anchors[0];
        drawArterialStump(ctx, cx + sx * scale, destH * sy, 9 * scale);
        return;
      }
      for (const [sx, sy, ex, ey] of anchors) {
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 7 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + sx * scale, destH * sy);
        ctx.lineTo(cx + ex * scale, destH * ey);
        ctx.stroke();
        // Broken sword/spear in crawling hand
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + ex * scale, destH * ey);
        ctx.lineTo(cx + (ex + (ex < 0 ? -12 : 12)) * scale, destH * (ey - 0.08));
        ctx.stroke();
      }
    };

    drawCrawlingArmPair('left_arm', [
      [-26, 0.48, -48, 0.62],
      [-24, 0.58, -44, 0.76],
    ]);
    drawCrawlingArmPair('right_arm', [
      [26, 0.48, 48, 0.62],
      [24, 0.58, 44, 0.76],
    ]);
    drawCrawlingArmPair('legs', [
      [-14, 0.64, -22, 0.88],
      [14, 0.64, 22, 0.88],
    ]);

    // torso: Khối thịt dị dạng khổng lồ bọc trong những mảnh giáp sắt kỵ sĩ nứt toác bị nung chảy dính vào nhau (nx: 0.50, ny: 0.46)
    ctx.save();
    ctx.translate(0, torsoBreathY);
    ctx.fillStyle = '#7f1d1d';
    ctx.strokeStyle = '#070509';
    ctx.lineWidth = 2.6 * scale;
    ctx.beginPath();
    ctx.ellipse(cx, destH * 0.48, 36 * scale, 26 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Melted cracked knight armor plates fused over the flesh mass
    ctx.fillStyle = '#475569';
    for (const [px, py, pw, ph] of [
      [-26, 0.34, 24, 18],
      [4, 0.36, 24, 20],
      [-18, 0.50, 34, 16],
    ]) {
      ctx.fillRect(cx + px * scale, destH * py, pw * scale, ph * scale);
      ctx.strokeRect(cx + px * scale, destH * py, pw * scale, ph * scale);
    }
    ctx.restore();

    // head: 4 cái đầu người trồi ra ở các góc khác nhau với biểu cảm gào thét đau đớn (nx: 0.50, ny: 0.22)
    if (!severedLimbs.has('head')) {
      for (const [hx, hy, tilt] of [
        [-18, 0.22, -0.25],
        [0, 0.18, 0],
        [18, 0.22, 0.25],
        [6, 0.30, 0.15],
      ]) {
        ctx.save();
        ctx.translate(cx + hx * scale, destH * hy + headBobY * 0.5);
        ctx.rotate(tilt);
        ctx.fillStyle = '#d6b89c';
        ctx.strokeStyle = '#070509';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, 8.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Agonized screaming mouth bleeding
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(-4 * scale, 1 * scale, 8 * scale, 5 * scale);
        ctx.restore();
      }
    } else {
      drawArterialStump(ctx, cx, destH * 0.22, 12 * scale);
    }
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 2 BOSS: HỒNG Y SÁP TRẮNG (`executioner_paladin` — Giant Gold Censer Head, Melting Wax Robe with Children Faces, 4 Ivory Arms, Levitating Silk Ribbons)
  // =========================================================================
  if (spriteKey === 'executioner_paladin') {
    // legs: Cơ thể lơ lửng cách mặt đất nửa mét nhờ hàng chục dải lụa kinh văn quấn quanh (nx: 0.50, ny: 0.77)
    if (!severedLimbs.has('legs')) {
      for (const rx of [-24, -12, 0, 12, 24]) {
        ctx.fillStyle = '#fef3c7';
        ctx.strokeStyle = '#070509';
        ctx.lineWidth = 1.8 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + rx * scale - 4 * scale, destH * 0.60);
        ctx.quadraticCurveTo(
          cx + (rx + Math.sin(animPhase + rx) * 6) * scale,
          destH * 0.76,
          cx + rx * 1.2 * scale,
          destH * 0.90
        );
        ctx.lineTo(cx + rx * 1.2 * scale + 5 * scale, destH * 0.90);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else {
      drawArterialStump(ctx, cx, destH * 0.74, 11 * scale);
    }

    // torso: Lễ phục giáo hoàng trắng muốt chảy nhão như sáp nến nóng, lộ những khuôn mặt trẻ em nhỏ xíu bên dưới (nx: 0.50, ny: 0.45)
    ctx.save();
    ctx.translate(0, torsoBreathY);
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#070509';
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 28 * scale, destH * 0.28);
    ctx.lineTo(cx + 28 * scale, destH * 0.28);
    ctx.lineTo(cx + 34 * scale, destH * 0.64);
    ctx.lineTo(cx - 34 * scale, destH * 0.64);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Tiny children's faces pressing outward beneath the translucent wax robe
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.4 * scale;
    for (const [fx, fy] of [[-12, 0.40], [10, 0.38], [-6, 0.52], [14, 0.50], [0, 0.44]]) {
      ctx.beginPath();
      ctx.arc(cx + fx * scale, destH * fy, 5.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#070509';
      ctx.fillRect(cx + (fx - 2.5) * scale, destH * fy - 1 * scale, 1.5 * scale, 1.5 * scale);
      ctx.fillRect(cx + (fx + 1.5) * scale, destH * fy - 1 * scale, 1.5 * scale, 1.5 * scale);
      ctx.fillStyle = '#cbd5e1';
    }
    ctx.restore();

    // left_arm: 2 cánh tay trái mảnh khảnh trắng bệch ôm quyển Kinh Văn Da Người đóng đinh đồng (nx: 0.24, ny: 0.44)
    if (!severedLimbs.has('left_arm')) {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 5 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 26 * scale, destH * 0.32);
      ctx.lineTo(cx - 42 * scale, destH * 0.40 + leftArmBobY);
      ctx.moveTo(cx - 26 * scale, destH * 0.42);
      ctx.lineTo(cx - 42 * scale, destH * 0.52 + leftArmBobY);
      ctx.stroke();
      // Kinh Văn Da Người đóng đinh đồng
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 2.2 * scale;
      ctx.fillRect(cx - 52 * scale, destH * 0.34 + leftArmBobY, 20 * scale, 28 * scale);
      ctx.strokeRect(cx - 52 * scale, destH * 0.34 + leftArmBobY, 20 * scale, 28 * scale);
    } else {
      drawArterialStump(ctx, cx - 28 * scale, destH * 0.42, 9 * scale);
    }

    // right_arm: 2 cánh tay phải cầm trượng gắn Chuông Đồng Đẫm Máu (nx: 0.76, ny: 0.44)
    if (!severedLimbs.has('right_arm')) {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 5 * scale;
      ctx.beginPath();
      ctx.moveTo(cx + 26 * scale, destH * 0.32);
      ctx.lineTo(cx + 42 * scale, destH * 0.40 + rightArmBobY);
      ctx.moveTo(cx + 26 * scale, destH * 0.42);
      ctx.lineTo(cx + 42 * scale, destH * 0.52 + rightArmBobY);
      ctx.stroke();
      // Staff with Bloodstained Bronze Bell
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 3.2 * scale;
      ctx.beginPath();
      ctx.moveTo(cx + 42 * scale, destH * 0.14 + rightArmBobY);
      ctx.lineTo(cx + 42 * scale, destH * 0.76 + rightArmBobY);
      ctx.stroke();
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(cx + 48 * scale, destH * 0.22 + rightArmBobY, 8 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      drawArterialStump(ctx, cx + 28 * scale, destH * 0.42, 9 * scale);
    }

    // head: Chiếc lư hương bằng vàng khổng lồ chạm khắc Thánh Mẫu tỏa khói trầm hương máu đen (nx: 0.50, ny: 0.17)
    if (!severedLimbs.has('head')) {
      const hy = destH * 0.17 + headBobY;
      ctx.fillStyle = '#eab308';
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 2.4 * scale;
      ctx.beginPath();
      ctx.moveTo(cx, hy - 14 * scale);
      ctx.lineTo(cx + 16 * scale, hy);
      ctx.lineTo(cx, hy + 13 * scale);
      ctx.lineTo(cx - 16 * scale, hy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Black-blood incense smoke plumes
      ctx.fillStyle = 'rgba(127, 29, 29, 0.55)';
      ctx.beginPath();
      ctx.arc(cx - 14 * scale, hy - 8 * scale, 8 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 14 * scale, hy - 8 * scale, 8 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawArterialStump(ctx, cx, destH * 0.17, 10 * scale);
    }
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 2 MINIBOSS 1: NỮ TU KHÓC RA SÁP (`grand_abbess` — Bound to Upright Wooden Torture Wheel, Stitched Back Arms, Wax-Covered Face)
  // =========================================================================
  if (spriteKey === 'grand_abbess') {
    // legs: Chiếc bánh xe tra tấn bằng gỗ mục đặt dựng đứng (nx: 0.50, ny: 0.76)
    if (!severedLimbs.has('legs')) {
      ctx.strokeStyle = '#5c3a21';
      ctx.lineWidth = 6 * scale;
      ctx.beginPath();
      ctx.arc(cx, destH * 0.52, 42 * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 3 * scale;
      for (let s = 0; s < 8; s++) {
        const ang = (s * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx, destH * 0.52);
        ctx.lineTo(cx + Math.cos(ang) * 42 * scale, destH * 0.52 + Math.sin(ang) * 42 * scale);
        ctx.stroke();
      }
    } else {
      drawArterialStump(ctx, cx, destH * 0.76, 11 * scale);
    }

    // torso: Nữ tu già nua bị trói chặt vào bánh xe gỗ (nx: 0.50, ny: 0.46)
    ctx.fillStyle = '#1e1b4b';
    ctx.strokeStyle = '#070509';
    ctx.lineWidth = 2.4 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 18 * scale, destH * 0.28);
    ctx.lineTo(cx + 18 * scale, destH * 0.28);
    ctx.lineTo(cx + 22 * scale, destH * 0.74);
    ctx.lineTo(cx - 22 * scale, destH * 0.74);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // left_arm: Hai tay bị bẻ ngược ra sau khâu liền vào lưng (nx: 0.27, ny: 0.42)
    if (!severedLimbs.has('left_arm')) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 5 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 18 * scale, destH * 0.34);
      ctx.lineTo(cx - 32 * scale, destH * 0.44);
      ctx.lineTo(cx - 16 * scale, destH * 0.52);
      ctx.stroke();
    } else {
      drawArterialStump(ctx, cx - 22 * scale, destH * 0.42, 8 * scale);
    }

    // right_arm: Tay phải điều khiển trượng sáp nóng (nx: 0.75, ny: 0.44)
    if (!severedLimbs.has('right_arm')) {
      drawDetailedWeapon(ctx, 'grand_abbess', 'right', cx + 28 * scale, destH * 0.48, scale, isTelegraphing);
    } else {
      drawArterialStump(ctx, cx + 22 * scale, destH * 0.42, 8 * scale);
    }

    // head: Toàn bộ vùng mắt bị phủ kín bởi lớp sáp nến trắng chảy đặc xuống tận ngực (nx: 0.50, ny: 0.20)
    if (!severedLimbs.has('head')) {
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.arc(cx, destH * 0.20 + headBobY * 0.4, 12 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Thick white wax dripping down over face & chest
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.moveTo(cx - 11 * scale, destH * 0.16);
      ctx.lineTo(cx + 11 * scale, destH * 0.16);
      ctx.lineTo(cx + 8 * scale, destH * 0.38);
      ctx.lineTo(cx, destH * 0.44);
      ctx.lineTo(cx - 8 * scale, destH * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      drawArterialStump(ctx, cx, destH * 0.20, 9 * scale);
    }
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 2 MINIBOSS 2: THÁNH VỆ BẠCH KIM BỊ THA HÓA (`penitent_knight` — Corroded Platinum Armor Oozing Black Blood, Eyeball Tower Shield, Unarmored Left Leg)
  // =========================================================================
  if (spriteKey === 'penitent_knight') {
    // left_leg: Cẳng chân trái mất giáp chỉ còn khối thịt máu đen (Tử huyệt, nx: 0.40, ny: 0.76)
    if (!severedLimbs.has('left_leg') && !severedLimbs.has('legs')) {
      ctx.fillStyle = '#7f1d1d';
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 2.2 * scale;
      ctx.fillRect(cx - 20 * scale, destH * 0.58, 14 * scale, 30 * scale);
      ctx.strokeRect(cx - 20 * scale, destH * 0.58, 14 * scale, 30 * scale);
      // Black blood ooze
      ctx.fillStyle = '#09070c';
      ctx.fillRect(cx - 16 * scale, destH * 0.64, 6 * scale, 20 * scale);
    } else {
      drawArterialStump(ctx, cx - 14 * scale, destH * 0.70, 9 * scale);
    }

    // legs: Chân phải bọc giáp bạch kim dày (nx: 0.60, ny: 0.76)
    if (!severedLimbs.has('legs')) {
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 2.4 * scale;
      ctx.fillRect(cx + 6 * scale, destH * 0.58, 16 * scale, 30 * scale);
      ctx.strokeRect(cx + 6 * scale, destH * 0.58, 16 * scale, 30 * scale);
    } else {
      drawArterialStump(ctx, cx + 14 * scale, destH * 0.70, 9 * scale);
    }

    // torso: Giáp bạch kim khổng lồ bị ăn mòn, qua các khe khớp trào ra bùn máu đen (nx: 0.50, ny: 0.44)
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#070509';
    ctx.lineWidth = 2.5 * scale;
    ctx.fillRect(cx - 26 * scale, destH * 0.28 + torsoBreathY, 52 * scale, 32 * scale);
    ctx.strokeRect(cx - 26 * scale, destH * 0.28 + torsoBreathY, 52 * scale, 32 * scale);
    // Black blood mud oozing from armor seams
    ctx.fillStyle = '#09050a';
    ctx.fillRect(cx - 18 * scale, destH * 0.36 + torsoBreathY, 36 * scale, 5 * scale);
    ctx.fillRect(cx - 4 * scale, destH * 0.36 + torsoBreathY, 8 * scale, 22 * scale);

    // left_arm: Cầm Khiên Tháp Bạch Kim khoét thủng ở giữa lộ con mắt khổng lồ đảo liên tục (nx: 0.24, ny: 0.46)
    if (!severedLimbs.has('left_arm')) {
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 2.5 * scale;
      ctx.fillRect(cx - 48 * scale, destH * 0.28 + leftArmBobY, 24 * scale, 42 * scale);
      ctx.strokeRect(cx - 48 * scale, destH * 0.28 + leftArmBobY, 24 * scale, 42 * scale);
      // Giant rolling eyeball in center of shield
      ctx.fillStyle = '#fef2f2';
      ctx.beginPath();
      ctx.arc(cx - 36 * scale, destH * 0.48 + leftArmBobY, 8.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(
        cx - 36 * scale + Math.cos(animPhase * 2) * 2.5 * scale,
        destH * 0.48 + leftArmBobY + Math.sin(animPhase * 2) * 2 * scale,
        4 * scale,
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else {
      drawArterialStump(ctx, cx - 30 * scale, destH * 0.42, 9 * scale);
    }

    // right_arm: Cầm Chùy Chiến Bạch Kim đầu vuông nặng trịch (nx: 0.76, ny: 0.44)
    if (!severedLimbs.has('right_arm')) {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.moveTo(cx + 34 * scale, destH * 0.62 + rightArmBobY);
      ctx.lineTo(cx + 38 * scale, destH * 0.18 + rightArmBobY);
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 2.2 * scale;
      ctx.fillRect(cx + 28 * scale, destH * 0.12 + rightArmBobY, 20 * scale, 16 * scale);
      ctx.strokeRect(cx + 28 * scale, destH * 0.12 + rightArmBobY, 20 * scale, 16 * scale);
    } else {
      drawArterialStump(ctx, cx + 30 * scale, destH * 0.42, 9 * scale);
    }

    // head: Mũ giáp bạch kim rỉ máu đen (nx: 0.50, ny: 0.18)
    if (!severedLimbs.has('head')) {
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 2.4 * scale;
      ctx.beginPath();
      ctx.arc(cx, destH * 0.18 + headBobY, 13 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#070509';
      ctx.fillRect(cx - 8 * scale, destH * 0.17 + headBobY, 16 * scale, 4 * scale);
    } else {
      drawArterialStump(ctx, cx, destH * 0.18, 10 * scale);
    }
    ctx.restore();
    return;
  }

  // =========================================================================
  // NORMAL ENEMY GROUP 1: QUÁI THÚ 4 CHÂN (`dire_hellwolf`, `void_panther`)
  // =========================================================================
  if (spriteKey === 'dire_hellwolf' || spriteKey === 'void_panther') {
    const isPanther = spriteKey === 'void_panther';
    const bodyCol = isPanther ? '#1e1b4b' : '#450a0a';
    const shadowCol = '#070509';

    // legs: Hai chân sau gân guốc (nx: 0.70, ny: 0.68)
    if (!severedLimbs.has('legs')) {
      ctx.fillStyle = bodyCol;
      ctx.strokeStyle = shadowCol;
      ctx.lineWidth = 2.4 * scale;
      ctx.beginPath();
      ctx.moveTo(cx + 16 * scale, destH * 0.48);
      ctx.lineTo(cx + 38 * scale, destH * 0.66);
      ctx.lineTo(cx + 32 * scale, destH * 0.88);
      ctx.lineTo(cx + 18 * scale, destH * 0.88);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      drawArterialStump(ctx, cx + 24 * scale, destH * 0.68, 9 * scale);
    }

    // torso: Thân thú cúi thấp lao về phía trước + Lõi tinh vân rách ở sườn (nx: 0.54, ny: 0.48)
    ctx.fillStyle = bodyCol;
    ctx.strokeStyle = shadowCol;
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.ellipse(cx + 4 * scale, destH * 0.48 + torsoBreathY, 32 * scale, 16 * scale, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (isPanther) {
      // Torn nebula core on flank
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.ellipse(cx + 6 * scale, destH * 0.48 + torsoBreathY, 10 * scale, 5 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // left_arm & right_arm: Hai chân trước vồ mồi (nx: 0.30, 0.68 & 0.46, 0.70)
    for (const [limbId, ox] of [
      ['left_arm', -24],
      ['right_arm', -6],
    ] as const) {
      if (!severedLimbs.has(limbId)) {
        ctx.fillStyle = bodyCol;
        ctx.beginPath();
        ctx.moveTo(cx + ox * scale, destH * 0.52);
        ctx.lineTo(cx + (ox - 6) * scale, destH * 0.88);
        ctx.lineTo(cx + (ox + 6) * scale, destH * 0.88);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        drawArterialStump(ctx, cx + ox * scale, destH * 0.68, 8 * scale);
      }
    }

    // head: Hàm mở rộng lộ răng nanh lửa / 4 mắt tím (nx: 0.34, ny: 0.34)
    if (!severedLimbs.has('head')) {
      const hx = cx - 22 * scale;
      const hy = destH * 0.34 + headBobY;
      ctx.fillStyle = bodyCol;
      ctx.beginPath();
      ctx.arc(hx, hy, 15 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Jaws & Fangs
      ctx.fillStyle = isPanther ? '#a855f7' : '#f97316';
      ctx.fillRect(hx - 14 * scale, hy + 2 * scale, 12 * scale, 5 * scale);
      // Eyes (4 violet eyes for void_panther, blazing red for hellwolf)
      ctx.fillStyle = isPanther ? '#e879f9' : '#ef4444';
      ctx.beginPath();
      ctx.arc(hx - 4 * scale, hy - 4 * scale, 2.2 * scale, 0, Math.PI * 2);
      ctx.arc(hx + 3 * scale, hy - 4 * scale, 2.2 * scale, 0, Math.PI * 2);
      if (isPanther) {
        ctx.arc(hx - 4 * scale, hy - 9 * scale, 1.8 * scale, 0, Math.PI * 2);
        ctx.arc(hx + 3 * scale, hy - 9 * scale, 1.8 * scale, 0, Math.PI * 2);
      }
      ctx.fill();
    } else {
      drawArterialStump(ctx, cx - 22 * scale, destH * 0.34, 10 * scale);
    }
    ctx.restore();
    return;
  }

  // =========================================================================
  // NORMAL ENEMY GROUP 2: QUÁI DỊ HÌNH (`void_tentacle_cluster`, `void_leech_beast`)
  // =========================================================================
  if (spriteKey === 'void_tentacle_cluster' || spriteKey === 'void_leech_beast') {
    const isLeech = spriteKey === 'void_leech_beast';
    // Writhing base & tentacles
    ctx.fillStyle = isLeech ? '#3f1d2e' : '#2e1065';
    ctx.strokeStyle = '#070509';
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.ellipse(cx, destH * 0.52 + torsoBreathY, 30 * scale, 24 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (const [limbId, dir] of [
      ['left_arm', -1],
      ['right_arm', 1],
    ] as const) {
      if (!severedLimbs.has(limbId)) {
        ctx.strokeStyle = isLeech ? '#881337' : '#7e22ce';
        ctx.lineWidth = 7 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + dir * 20 * scale, destH * 0.48);
        ctx.quadraticCurveTo(
          cx + dir * 46 * scale,
          destH * 0.34 + rightArmBobY,
          cx + dir * 36 * scale,
          destH * 0.68
        );
        ctx.stroke();
      }
    }

    if (!severedLimbs.has('head')) {
      const hy = destH * 0.22 + headBobY;
      ctx.fillStyle = isLeech ? '#4c0519' : '#581c87';
      ctx.beginPath();
      ctx.arc(cx, hy, 16 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Spiral lamprey teeth maw (`void_leech_beast`) or Central Abyssal Eye (`void_tentacle_cluster`)
      ctx.fillStyle = isLeech ? '#fecdd3' : '#facc15';
      ctx.beginPath();
      ctx.arc(cx, hy, 7 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      drawArterialStump(ctx, cx, destH * 0.22, 10 * scale);
    }
    ctx.restore();
    return;
  }

  // =========================================================================
  // NORMAL ENEMY GROUP 3: BỘ XƯƠNG ĐEN HỒN MA (`black_bone_skeleton`)
  // =========================================================================
  if (spriteKey === 'black_bone_skeleton') {
    // Ghostly cyan-violet soul flame behind black bones
    const soulGrad = ctx.createRadialGradient(cx, destH * 0.40, 4 * scale, cx, destH * 0.40, 34 * scale);
    soulGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    soulGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = soulGrad;
    ctx.beginPath();
    ctx.arc(cx, destH * 0.40, 34 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Charred black skeletal legs
    if (!severedLimbs.has('legs')) {
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 5 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 10 * scale, destH * 0.56);
      ctx.lineTo(cx - 14 * scale, destH * 0.88);
      ctx.moveTo(cx + 10 * scale, destH * 0.56);
      ctx.lineTo(cx + 14 * scale, destH * 0.88);
      ctx.stroke();
    }
    // Charred black ribcage & spine
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 5 * scale;
    ctx.beginPath();
    ctx.moveTo(cx, destH * 0.26);
    ctx.lineTo(cx, destH * 0.58);
    ctx.stroke();
    ctx.lineWidth = 3 * scale;
    for (let r = 0; r < 4; r++) {
      const ry = destH * (0.32 + r * 0.055);
      ctx.beginPath();
      ctx.moveTo(cx - 16 * scale, ry);
      ctx.lineTo(cx + 16 * scale, ry);
      ctx.stroke();
    }
    if (!severedLimbs.has('right_arm')) {
      drawDetailedWeapon(ctx, 'black_bone_skeleton', 'right', cx + 24 * scale, destH * 0.48, scale, isTelegraphing);
    }
    if (!severedLimbs.has('head')) {
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#070509';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.arc(cx, destH * 0.18 + headBobY, 12 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx - 4 * scale, destH * 0.18 + headBobY, 2.5 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 4 * scale, destH * 0.18 + headBobY, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // =========================================================================
  // PLAYABLE CLASSES & GRIMDARK CHURCH / DUNGEON HUMANOIDS
  // (`fallen_knight`, `forsaken_nun`, `night_hunter`, `fanatic_zealot`, `rotting_priest`,
  //  `weeping_inquisitor`, `flagellant_monk`, `crypt_keybearer`, `armored_ghoul`, `orc_berserker`, `forge_goblin`)
  // =========================================================================
  const torsoWidthMult = spriteKey === 'orc_berserker' || spriteKey === 'armored_ghoul' ? 1.25 : 1.15;

  // 1. Broad Multi-Layered Back Cloak Drapery with ragged Grimdark hem
  const capeGrad = ctx.createLinearGradient(cx, destH * 0.24, cx, destH * 0.88);
  capeGrad.addColorStop(0, spriteKey === 'fallen_knight' ? '#7f1d1d' : garbMid);
  capeGrad.addColorStop(1, '#070509');
  ctx.fillStyle = capeGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 26 * scale * torsoWidthMult, destH * 0.28);
  ctx.lineTo(cx - 34 * scale * torsoWidthMult, destH * 0.86);
  ctx.lineTo(cx - 20 * scale, destH * 0.81);
  ctx.lineTo(cx - 10 * scale, destH * 0.88);
  ctx.lineTo(cx, destH * 0.82);
  ctx.lineTo(cx + 10 * scale, destH * 0.88);
  ctx.lineTo(cx + 20 * scale, destH * 0.81);
  ctx.lineTo(cx + 34 * scale * torsoWidthMult, destH * 0.86);
  ctx.lineTo(cx + 26 * scale * torsoWidthMult, destH * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. LEGS
  const leftLegSevered = severedLimbs.has('left_leg') || severedLimbs.has('legs');
  const rightLegSevered = severedLimbs.has('legs');
  const drawLayeredLeg = (dir: -1 | 1, isSevered: boolean) => {
    const lx = cx + dir * 14 * scale;
    if (isSevered) {
      drawArterialStump(ctx, lx, destH * 0.62, 8.5 * scale);
      return;
    }
    const thighGrad = ctx.createLinearGradient(lx - 8 * scale, destH * 0.56, lx + 8 * scale, destH * 0.75);
    thighGrad.addColorStop(0, garbLight);
    thighGrad.addColorStop(1, '#070509');
    ctx.fillStyle = thighGrad;
    ctx.beginPath();
    ctx.moveTo(cx + dir * 4 * scale, destH * 0.56);
    ctx.quadraticCurveTo(cx + dir * 25 * scale, destH * 0.66, cx + dir * 20 * scale, destH * 0.76);
    ctx.lineTo(cx + dir * 6 * scale, destH * 0.76);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isArmoredKnight ? '#475569' : '#1c1412';
    ctx.beginPath();
    ctx.moveTo(cx + dir * 6 * scale, destH * 0.75);
    ctx.lineTo(cx + dir * 20 * scale, destH * 0.75);
    ctx.lineTo(cx + dir * 22 * scale, destH * 0.90);
    ctx.lineTo(cx + dir * 5 * scale, destH * 0.90);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  drawLayeredLeg(-1, leftLegSevered);
  drawLayeredLeg(1, rightLegSevered);

  // 3. TORSO (With 45% Grimdark Ink Shadow Block & Rot/Nails Details)
  ctx.save();
  ctx.translate(0, torsoBreathY);
  const tw = 24 * scale * torsoWidthMult * torsoExpandX;
  const torsoGrad = ctx.createRadialGradient(cx, cy - 6 * scale, 4 * scale, cx, cy, 36 * scale);
  torsoGrad.addColorStop(0, fleshLight);
  torsoGrad.addColorStop(0.5, fleshMid);
  torsoGrad.addColorStop(1, '#070509');
  ctx.fillStyle = torsoGrad;

  ctx.beginPath();
  ctx.moveTo(cx - tw, destH * 0.29);
  ctx.bezierCurveTo(cx - tw * 1.15, destH * 0.44, cx - tw * 0.9, destH * 0.55, cx - tw * 0.75, destH * 0.60);
  ctx.lineTo(cx + tw * 0.75, destH * 0.60);
  ctx.bezierCurveTo(cx + tw * 0.9, destH * 0.55, cx + tw * 1.15, destH * 0.44, cx + tw, destH * 0.29);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (spriteKey !== 'flagellant_monk') {
    const vestGrad = ctx.createLinearGradient(cx - tw, destH * 0.29, cx + tw, destH * 0.62);
    vestGrad.addColorStop(0, garbLight);
    vestGrad.addColorStop(0.5, garbMid);
    vestGrad.addColorStop(1, '#070509');
    ctx.fillStyle = vestGrad;
    ctx.beginPath();
    ctx.moveTo(cx - tw * 0.96, destH * 0.30);
    ctx.lineTo(cx - 7 * scale, destH * 0.30);
    ctx.lineTo(cx - 2 * scale, destH * 0.44);
    ctx.lineTo(cx + 2 * scale, destH * 0.44);
    ctx.lineTo(cx + 7 * scale, destH * 0.30);
    ctx.lineTo(cx + tw * 0.96, destH * 0.30);
    ctx.lineTo(cx + tw * 0.80, destH * 0.62);
    ctx.lineTo(cx - tw * 0.80, destH * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Flagellant Monk: Bare chest pierced with iron nails & bleeding lash marks
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.2 * scale;
    for (let w = -1; w <= 1; w++) {
      ctx.beginPath();
      ctx.moveTo(cx - 14 * scale, destH * (0.36 + w * 0.06));
      ctx.lineTo(cx + 14 * scale, destH * (0.42 + w * 0.06));
      ctx.stroke();
    }
    ctx.strokeStyle = '#cbd5e1';
    for (const nx of [-16, -9, 9, 16]) {
      ctx.beginPath();
      ctx.moveTo(cx + nx * scale, destH * 0.32);
      ctx.lineTo(cx + nx * 1.25 * scale, destH * 0.24);
      ctx.stroke();
    }
  }

  // Maggots & decomposing patches on rotting_priest & armored_ghoul
  if (spriteKey === 'rotting_priest' || spriteKey === 'armored_ghoul') {
    ctx.fillStyle = '#fef08a';
    for (const [mx, my] of [[-10, 0.38], [8, 0.44], [-6, 0.50], [12, 0.52]]) {
      ctx.beginPath();
      ctx.ellipse(cx + mx * scale, destH * my, 2.5 * scale, 1.2 * scale, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (spriteKey === 'night_hunter') {
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 18 * scale, destH * 0.31);
    ctx.lineTo(cx + 16 * scale, destH * 0.56);
    ctx.moveTo(cx + 18 * scale, destH * 0.31);
    ctx.lineTo(cx - 16 * scale, destH * 0.56);
    ctx.stroke();
  } else if (spriteKey === 'armored_ghoul') {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.6 * scale;
    ctx.setLineDash([4 * scale, 2 * scale]);
    ctx.beginPath();
    ctx.moveTo(cx - 24 * scale, destH * 0.38);
    ctx.quadraticCurveTo(cx, destH * 0.52, cx + 26 * scale, destH * 0.85);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = '#29170e';
  ctx.strokeStyle = '#070509';
  ctx.lineWidth = 1.6 * scale;
  ctx.fillRect(cx - tw * 0.78, destH * 0.55, tw * 1.56, 6 * scale);
  ctx.strokeRect(cx - tw * 0.78, destH * 0.55, tw * 1.56, 6 * scale);
  ctx.restore();

  // 4. LEFT ARM
  if (!severedLimbs.has('left_arm')) {
    ctx.save();
    ctx.translate(leftArmSwayX, leftArmBobY);
    ctx.fillStyle = fleshMid;
    ctx.beginPath();
    ctx.moveTo(cx - tw * 0.9, destH * 0.31);
    ctx.bezierCurveTo(cx - 44 * scale, destH * 0.37, cx - 44 * scale, destH * 0.53, cx - 31 * scale, destH * 0.59);
    ctx.lineTo(cx - 21 * scale, destH * 0.54);
    ctx.bezierCurveTo(cx - 28 * scale, destH * 0.46, cx - 26 * scale, destH * 0.38, cx - tw * 0.8, destH * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawDetailedWeapon(ctx, spriteKey, 'left', cx - 30 * scale, destH * 0.54, scale, isTelegraphing);
    ctx.restore();
  } else {
    drawArterialStump(ctx, cx - tw * 0.9, destH * 0.36 + torsoBreathY, 8.5 * scale);
  }

  // 5. RIGHT ARM
  if (!severedLimbs.has('right_arm')) {
    ctx.save();
    ctx.translate(rightArmSwayX, rightArmBobY);
    ctx.fillStyle = fleshMid;
    ctx.beginPath();
    ctx.moveTo(cx + tw * 0.9, destH * 0.31);
    ctx.bezierCurveTo(cx + 44 * scale, destH * 0.37, cx + 44 * scale, destH * 0.53, cx + 31 * scale, destH * 0.59);
    ctx.lineTo(cx + 21 * scale, destH * 0.54);
    ctx.bezierCurveTo(cx + 28 * scale, destH * 0.46, cx + 26 * scale, destH * 0.38, cx + tw * 0.8, destH * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawDetailedWeapon(ctx, spriteKey, 'right', cx + 30 * scale, destH * 0.54, scale, isTelegraphing);
    ctx.restore();
  } else {
    drawArterialStump(ctx, cx + tw * 0.9, destH * 0.36 + torsoBreathY, 8.5 * scale);
  }

  // 6. HEAD
  if (!severedLimbs.has('head')) {
    ctx.save();
    ctx.translate(headSwayX, headBobY);
    if (spriteKey === 'night_hunter') {
      ctx.fillStyle = '#78716c';
      ctx.fillRect(cx - 38 * scale, destH * 0.36, 13 * scale, 22 * scale);
      ctx.strokeStyle = '#070509';
      ctx.strokeRect(cx - 38 * scale, destH * 0.36, 13 * scale, 22 * scale);
    }

    const hoodGrad = ctx.createLinearGradient(cx, destH * 0.06, cx, destH * 0.32);
    hoodGrad.addColorStop(0, garbLight);
    hoodGrad.addColorStop(0.6, garbMid);
    hoodGrad.addColorStop(1, '#070509');
    ctx.fillStyle = hoodGrad;
    ctx.strokeStyle = '#070509';
    ctx.lineWidth = 2 * scale;

    if (spriteKey === 'forsaken_nun') {
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.moveTo(cx, destH * 0.05);
      ctx.bezierCurveTo(cx + 25 * scale, destH * 0.08, cx + 28 * scale, destH * 0.28, cx + 24 * scale, destH * 0.36);
      ctx.lineTo(cx - 24 * scale, destH * 0.36);
      ctx.bezierCurveTo(cx - 28 * scale, destH * 0.28, cx - 25 * scale, destH * 0.08, cx, destH * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (spriteKey === 'night_hunter') {
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(cx, destH * 0.18, 15 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(cx, destH * 0.06);
      ctx.bezierCurveTo(cx + 22 * scale, destH * 0.09, cx + 24 * scale, destH * 0.27, cx + 19 * scale, destH * 0.32);
      ctx.quadraticCurveTo(cx, destH * 0.29, cx - 19 * scale, destH * 0.32);
      ctx.bezierCurveTo(cx - 24 * scale, destH * 0.27, cx - 22 * scale, destH * 0.09, cx, destH * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    if (spriteKey === 'fallen_knight') {
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(cx, destH * 0.20, 12.5 * scale, 13.5 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#070509';
      ctx.fillRect(cx - 8.5 * scale, destH * 0.175, 17 * scale, 3.2 * scale);
      ctx.fillRect(cx - 1.8 * scale, destH * 0.175, 3.6 * scale, 11 * scale);
    } else {
      ctx.fillStyle = fleshLight;
      ctx.beginPath();
      ctx.ellipse(cx, destH * 0.205, 12 * scale, 13 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Iron nails driven into flagellant_monk skull
      if (spriteKey === 'flagellant_monk') {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.8 * scale;
        for (const nx of [-7, 0, 7]) {
          ctx.beginPath();
          ctx.moveTo(cx + nx * scale, destH * 0.10);
          ctx.lineTo(cx + nx * 1.3 * scale, destH * 0.03);
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#070509';
      ctx.beginPath();
      ctx.ellipse(cx - 4.8 * scale, destH * 0.19, 3.6 * scale, 2.8 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 4.8 * scale, destH * 0.19, 3.6 * scale, 2.8 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isBlinded ? '#5c1616' : eyeColor;
      ctx.beginPath();
      ctx.arc(cx - 4.8 * scale, destH * 0.19, 1.9 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 4.8 * scale, destH * 0.19, 1.9 * scale, 0, Math.PI * 2);
      ctx.fill();

      if (spriteKey === 'forsaken_nun') {
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 1.6 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 8 * scale, destH * 0.21);
        ctx.lineTo(cx - 2 * scale, destH * 0.26);
        ctx.stroke();
      }
    }
    ctx.restore();
  } else {
    drawArterialStump(ctx, cx, destH * 0.26 + torsoBreathY, 9 * scale);
  }

  ctx.restore();
}

/**
 * Draws the First-Person Foreground Back-Sprite of a Party Member
 * Distinctly tailored for:
 * - fallen_knight (Broad Riveted Plate Pauldrons, Sallet Helm + Crimson Plume, Tattered Red Cape, Broadsword & Shield)
 * - forsaken_nun (Flowing Gold-Trimmed Veil, Multi-Pleated Violet Habit, Holy Mother Cross Mace)
 * - night_hunter (Wide-Brimmed Hunter Hat, Leather Trench Coat + Crossed Straps, Serrated Curved Dagger)
 */
export function drawPartyBackSprite(
  ctx: CanvasRenderingContext2D,
  classId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  limbs: { leftArm: boolean; rightArm: boolean },
  isAttacking: boolean = false,
  isHit: boolean = false
) {
  ctx.save();
  const offsetX = isAttacking ? 20 : isHit ? -12 : 0;
  const offsetY = isAttacking ? -26 : isHit ? 10 : 0;
  ctx.translate(x + offsetX, y + offsetY);

  const cloakLight = isHit
    ? '#dc2626'
    : classId === 'fallen_knight'
    ? '#7f1d1d'
    : classId === 'forsaken_nun'
    ? '#4c1d95'
    : '#27382b';
  const cloakDark = '#09070c';

  // 1. Broad, Voluminous Multi-Fold Back Cloak / Habit / Leather Coat
  const grad = ctx.createLinearGradient(0, h * 0.25, 0, h);
  grad.addColorStop(0, cloakLight);
  grad.addColorStop(1, cloakDark);
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#070608';
  ctx.lineWidth = 2.4;

  ctx.beginPath();
  ctx.moveTo(w * 0.08, h);
  ctx.quadraticCurveTo(w * 0.06, h * 0.42, w * 0.24, h * 0.34);
  ctx.lineTo(w * 0.76, h * 0.34);
  ctx.quadraticCurveTo(w * 0.94, h * 0.42, w * 0.92, h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Deep Cloak Drapery Folds
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.lineWidth = 2.2;
  for (const fx of [0.28, 0.43, 0.57, 0.72]) {
    ctx.beginPath();
    ctx.moveTo(w * fx, h * 0.40);
    ctx.quadraticCurveTo(w * (fx + 0.03), h * 0.70, w * (fx - 0.02), h * 0.98);
    ctx.stroke();
  }

  if (classId === 'night_hunter') {
    // Crossed Leather Back Straps
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w * 0.24, h * 0.38);
    ctx.lineTo(w * 0.76, h * 0.86);
    ctx.moveTo(w * 0.76, h * 0.38);
    ctx.lineTo(w * 0.24, h * 0.86);
    ctx.stroke();
  }

  // 2. Broad Layered Shoulder Pauldrons / Mantle
  ctx.fillStyle =
    classId === 'forsaken_nun' ? '#f5ebd6' : classId === 'night_hunter' ? '#3f2e21' : '#64748b';
  ctx.strokeStyle = classId === 'forsaken_nun' ? '#eab308' : '#070608';
  ctx.lineWidth = 2.2;
  for (const dir of [-1, 1]) {
    const px = w * (0.5 + dir * 0.28);
    ctx.beginPath();
    ctx.ellipse(px, h * 0.40, w * 0.19, h * 0.095, dir * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 3. Headgear from Behind (Knight Great-Helm + Plume | Nun Gold-Trimmed Veil | Hunter Wide-Brimmed Hat)
  if (classId === 'forsaken_nun') {
    ctx.fillStyle = '#f5ebd6';
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.07);
    ctx.quadraticCurveTo(w * 0.78, h * 0.12, w * 0.72, h * 0.44);
    ctx.lineTo(w * 0.28, h * 0.44);
    ctx.quadraticCurveTo(w * 0.22, h * 0.12, w * 0.5, h * 0.07);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (classId === 'night_hunter') {
    ctx.fillStyle = '#1c1917';
    ctx.strokeStyle = '#070608';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.24, w * 0.28, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.20, w * 0.15, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#070608';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(w * 0.50, h * 0.24, w * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Flowing Crimson Plume
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(w * 0.50, h * 0.05);
    ctx.quadraticCurveTo(w * 0.70, h * 0.03, w * 0.64, h * 0.30);
    ctx.quadraticCurveTo(w * 0.48, h * 0.20, w * 0.50, h * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 4. Right Arm Class Weapon Raised in Foreground
  if (limbs.rightArm) {
    if (classId === 'forsaken_nun') {
      // Holy Mother Cross Mace
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(w * 0.75, h * 0.58);
      ctx.lineTo(w * 0.90, h * 0.14);
      ctx.stroke();

      ctx.fillStyle = '#eab308';
      ctx.strokeStyle = '#070608';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w * 0.90, h * 0.13, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (classId === 'night_hunter') {
      // Serrated Curved Dagger
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#070608';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.75, h * 0.55);
      ctx.quadraticCurveTo(w * 0.98, h * 0.32, w * 0.86, h * 0.10);
      ctx.quadraticCurveTo(w * 0.88, h * 0.34, w * 0.69, h * 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Broad Iron Sword
      const bladeGrad = ctx.createLinearGradient(w * 0.74, h * 0.56, w * 0.96, h * 0.02);
      bladeGrad.addColorStop(0, '#94a3b8');
      bladeGrad.addColorStop(0.6, '#f8fafc');
      bladeGrad.addColorStop(1, '#dc2626');
      ctx.fillStyle = bladeGrad;
      ctx.beginPath();
      ctx.moveTo(w * 0.73, h * 0.56);
      ctx.lineTo(w * 0.92, h * 0.04);
      ctx.lineTo(w * 0.99, h * 0.08);
      ctx.lineTo(w * 0.81, h * 0.59);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w * 0.67, h * 0.50);
      ctx.lineTo(w * 0.87, h * 0.58);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draws sharp 64x64 Vector Illustrations for all 16 Weapons, 3 Shields, Vials, Herbs, Bone Saw & Ancient Parchment
 */
export function drawItemIcon(ctx: CanvasRenderingContext2D, itemId: string, size: number = 64) {
  ctx.save();
  ctx.clearRect(0, 0, size, size);
  const cx = size * 0.5;
  const cy = size * 0.5;

  const bg = ctx.createRadialGradient(cx, cy, 4, cx, cy, size * 0.48);
  bg.addColorStop(0, '#251e28');
  bg.addColorStop(1, '#0b090e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#070608';
  ctx.lineWidth = Math.max(1.4, size * 0.032);

  if (
    itemId.includes('vial') ||
    itemId.includes('oil') ||
    itemId === 'holy_water' ||
    itemId === 'sedative_draught' ||
    itemId === 'holy_elixir' ||
    itemId === 'stimulant_serum' ||
    itemId === 'elixir_of_ancients' ||
    itemId === 'strong_alcohol'
  ) {
    const liquidCol =
      itemId === 'brown_vial'
        ? '#d97724'
        : itemId === 'red_vial' || itemId === 'blood_vial' || itemId === 'stimulant_serum'
        ? '#e5383b'
        : itemId === 'white_vial'
        ? '#f8f9fa'
        : itemId === 'purple_vial' || itemId === 'opium_vial'
        ? '#9d4edd'
        : itemId === 'blue_vial'
        ? '#2563eb'
        : itemId === 'holy_elixir' || itemId === 'holy_fire_oil'
        ? '#fbbf24'
        : itemId === 'elixir_of_ancients'
        ? '#10b981'
        : itemId === 'silver_sword_oil'
        ? '#cbd5e1'
        : itemId === 'strong_alcohol'
        ? '#b45309'
        : '#48cae4';

    // Cork & bottle neck
    ctx.fillStyle = '#9c6644';
    ctx.fillRect(cx - size * 0.07, size * 0.11, size * 0.14, size * 0.08);
    ctx.fillStyle = '#8d99ae';
    ctx.fillRect(cx - size * 0.09, size * 0.18, size * 0.18, size * 0.14);
    ctx.strokeRect(cx - size * 0.09, size * 0.18, size * 0.18, size * 0.14);

    // Flask bulb
    const bulbGrad = ctx.createRadialGradient(
      cx - size * 0.06,
      cy + size * 0.06,
      size * 0.03,
      cx,
      cy + size * 0.1,
      size * 0.28
    );
    bulbGrad.addColorStop(0, '#ffffff');
    bulbGrad.addColorStop(0.35, liquidCol);
    bulbGrad.addColorStop(1, '#1a0b12');
    ctx.fillStyle = bulbGrad;
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.1, size * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (itemId === 'brown_vial') {
      // Burning fuse spark for explosive brown vial
      ctx.strokeStyle = '#c9a66b';
      ctx.beginPath();
      ctx.moveTo(cx, size * 0.12);
      ctx.quadraticCurveTo(cx + size * 0.16, size * 0.04, cx + size * 0.22, size * 0.12);
      ctx.stroke();
      ctx.fillStyle = '#ffbe0b';
      ctx.beginPath();
      ctx.arc(cx + size * 0.22, size * 0.12, size * 0.065, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (itemId === 'bandage') {
    // Medical Gauze Roll + Crimson Blood Cross
    ctx.fillStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.roundRect(size * 0.18, size * 0.24, size * 0.56, size * 0.48, size * 0.08);
    ctx.fill();
    ctx.stroke();

    // Inner roll spiral on top
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.ellipse(size * 0.46, size * 0.28, size * 0.18, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Loose gauze strip tail
    ctx.fillStyle = '#d1d5db';
    ctx.beginPath();
    ctx.moveTo(size * 0.72, size * 0.52);
    ctx.lineTo(size * 0.88, size * 0.64);
    ctx.lineTo(size * 0.82, size * 0.78);
    ctx.lineTo(size * 0.68, size * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Red Cross / Blood stain emblem
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(size * 0.42, size * 0.37, size * 0.08, size * 0.24);
    ctx.fillRect(size * 0.34, size * 0.45, size * 0.24, size * 0.08);
  } else if (itemId.includes('herb') || itemId === 'calm_flower' || itemId === 'herbal_salve') {
    if (itemId === 'herbal_salve') {
      // Mortar jar of green healing salve
      ctx.fillStyle = '#4a3b32';
      ctx.fillRect(size * 0.22, size * 0.36, size * 0.56, size * 0.44);
      ctx.strokeRect(size * 0.22, size * 0.36, size * 0.56, size * 0.44);
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(cx, size * 0.36, size * 0.26, size * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Botanical Herb Leaf / Calm Flower
      const leafCol = itemId.includes('red')
        ? '#e11d48'
        : itemId === 'calm_flower'
        ? '#38bdf8'
        : '#34d399';
      ctx.fillStyle = leafCol;
      ctx.beginPath();
      ctx.moveTo(cx, size * 0.14);
      ctx.quadraticCurveTo(size * 0.8, cy, cx, size * 0.84);
      ctx.quadraticCurveTo(size * 0.2, cy, cx, size * 0.14);
      ctx.fill();
      ctx.stroke();

      // Leaf center vein
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.moveTo(cx, size * 0.22);
      ctx.lineTo(cx, size * 0.78);
      ctx.stroke();
    }
  } else if (itemId === 'dried_meat' || itemId === 'rotten_meat') {
    const isRotten = itemId === 'rotten_meat';
    // Bone shaft protruding
    ctx.strokeStyle = '#e5dccb';
    ctx.lineWidth = Math.max(3, size * 0.08);
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.78);
    ctx.lineTo(size * 0.78, size * 0.22);
    ctx.stroke();

    // Haunch of meat
    ctx.lineWidth = Math.max(1.4, size * 0.032);
    ctx.strokeStyle = '#070608';
    ctx.fillStyle = isRotten ? '#4d6b3c' : '#9b2c2c';
    ctx.beginPath();
    ctx.ellipse(cx + size * 0.04, cy - size * 0.04, size * 0.26, size * 0.19, -0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Fat marbling or rot spots
    ctx.fillStyle = isRotten ? '#a3e635' : '#fca5a5';
    ctx.beginPath();
    ctx.arc(cx + size * 0.06, cy - size * 0.08, size * 0.05, 0, Math.PI * 2);
    ctx.arc(cx - size * 0.04, cy + size * 0.02, size * 0.04, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'moldy_bread') {
    // Tavern Bread Loaf with Mold Spots
    ctx.fillStyle = '#925c2c';
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.04, size * 0.34, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bread score slashes
    ctx.strokeStyle = '#fde68a';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.14, cy - size * 0.08);
    ctx.lineTo(cx - size * 0.06, cy + size * 0.06);
    ctx.moveTo(cx + size * 0.04, cy - size * 0.08);
    ctx.lineTo(cx + size * 0.12, cy + size * 0.06);
    ctx.stroke();

    // Green mold patches
    ctx.fillStyle = '#65a30d';
    ctx.beginPath();
    ctx.arc(cx - size * 0.16, cy + size * 0.06, size * 0.055, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.18, cy + size * 0.02, size * 0.045, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'bone_saw') {
    // Surgical Bone Saw with Wooden Handle, Steel Frame & Bloodied Teeth
    ctx.fillStyle = '#78350f';
    ctx.fillRect(size * 0.14, size * 0.44, size * 0.16, size * 0.28);
    ctx.strokeRect(size * 0.14, size * 0.44, size * 0.16, size * 0.28);

    // Saw blade
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(size * 0.28, size * 0.36, size * 0.56, size * 0.16);
    ctx.strokeRect(size * 0.28, size * 0.36, size * 0.56, size * 0.16);

    // Bloodied serrated teeth along bottom of blade
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    for (let x = size * 0.3; x < size * 0.82; x += size * 0.08) {
      ctx.moveTo(x, size * 0.52);
      ctx.lineTo(x + size * 0.04, size * 0.62);
      ctx.lineTo(x + size * 0.08, size * 0.52);
    }
    ctx.fill();
  } else if (itemId.includes('key')) {
    // Ornate Dungeon Key
    const keyCol = itemId.includes('void') ? '#c084fc' : '#eab308';
    ctx.strokeStyle = keyCol;
    ctx.lineWidth = Math.max(2.2, size * 0.055);
    ctx.beginPath();
    ctx.arc(size * 0.3, cy, size * 0.14, 0, Math.PI * 2);
    ctx.moveTo(size * 0.44, cy);
    ctx.lineTo(size * 0.82, cy);
    ctx.moveTo(size * 0.68, cy);
    ctx.lineTo(size * 0.68, cy + size * 0.14);
    ctx.moveTo(size * 0.78, cy);
    ctx.lineTo(size * 0.78, cy + size * 0.14);
    ctx.stroke();
  } else if (
    itemId === 'iron_penitent_helm' ||
    itemId === 'weeping_hood' ||
    itemId === 'ashen_hood' ||
    itemId === 'stalkers_cap' ||
    itemId === 'mail_coif' ||
    itemId === 'legion_helm' ||
    itemId === 'beak_mask' ||
    itemId === 'black_wax_crown'
  ) {
    // Headgear Icons (6 new + 2 legacy)
    ctx.fillStyle =
      itemId === 'legion_helm' || itemId === 'iron_penitent_helm'
        ? '#64748b'
        : itemId === 'mail_coif'
        ? '#94a3b8'
        : itemId === 'stalkers_cap'
        ? '#78350f'
        : itemId === 'beak_mask'
        ? '#27272a'
        : itemId === 'black_wax_crown'
        ? '#18181b'
        : '#6b7280';
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.04, size * 0.28, Math.PI, 0);
    ctx.lineTo(size * 0.78, size * 0.78);
    ctx.lineTo(size * 0.22, size * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (itemId === 'beak_mask') {
      // Plague Doctor Beak
      ctx.fillStyle = '#d6d3c4';
      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 0.04);
      ctx.lineTo(size * 0.88, cy + size * 0.16);
      ctx.lineTo(cx, cy + size * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (itemId === 'black_wax_crown') {
      // Finger-bone spikes on crown
      ctx.fillStyle = '#fef3c7';
      for (const sx of [-0.18, 0, 0.18]) {
        ctx.fillRect(cx + size * sx - 2, size * 0.14, 4, size * 0.16);
      }
    } else {
      ctx.fillStyle = '#09070c';
      ctx.fillRect(size * 0.32, cy - size * 0.02, size * 0.36, size * 0.08);
    }
  } else if (
    itemId === 'cathedral_chainmail' ||
    itemId === 'void_woven_robe' ||
    itemId === 'goethe_cassock' ||
    itemId === 'boiled_cuirass' ||
    itemId === 'star_pelt_coat' ||
    itemId === 'flayed_disguise' ||
    itemId === 'vanguard_hauberk' ||
    itemId === 'legion_brigandine' ||
    itemId === 'platinum_cuirass'
  ) {
    // Body Armor / Robe Icons (7 new + 2 legacy)
    ctx.fillStyle =
      itemId === 'platinum_cuirass'
        ? '#e2e8f0'
        : itemId === 'legion_brigandine' || itemId === 'vanguard_hauberk' || itemId === 'cathedral_chainmail'
        ? '#475569'
        : itemId === 'boiled_cuirass'
        ? '#78350f'
        : itemId === 'flayed_disguise'
        ? '#9f1239'
        : itemId === 'star_pelt_coat'
        ? '#4c1d95'
        : '#374151';
    ctx.beginPath();
    ctx.moveTo(size * 0.28, size * 0.18);
    ctx.lineTo(size * 0.72, size * 0.18);
    ctx.lineTo(size * 0.84, size * 0.42);
    ctx.lineTo(size * 0.7, size * 0.82);
    ctx.lineTo(size * 0.3, size * 0.82);
    ctx.lineTo(size * 0.16, size * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (itemId === 'platinum_cuirass' || itemId === 'goethe_cassock') {
      ctx.strokeStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(cx, size * 0.26);
      ctx.lineTo(cx, size * 0.72);
      ctx.moveTo(size * 0.36, size * 0.42);
      ctx.lineTo(size * 0.64, size * 0.42);
      ctx.stroke();
    }
  } else if (
    itemId === 'bone_rosary_ring' ||
    itemId === 'eclipse_pendant' ||
    itemId === 'vaelis_signet' ||
    itemId === 'black_straw_effigy' ||
    itemId === 'void_beast_claw'
  ) {
    // Accessories (4 new + 1 legacy)
    if (itemId === 'black_straw_effigy') {
      ctx.fillStyle = '#451a03';
      ctx.fillRect(cx - size * 0.08, size * 0.2, size * 0.16, size * 0.6);
      ctx.fillRect(size * 0.24, size * 0.36, size * 0.52, size * 0.14);
      ctx.strokeRect(cx - size * 0.08, size * 0.2, size * 0.16, size * 0.6);
    } else if (itemId === 'void_beast_claw') {
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.moveTo(size * 0.26, size * 0.24);
      ctx.quadraticCurveTo(size * 0.78, size * 0.34, size * 0.66, size * 0.82);
      ctx.quadraticCurveTo(size * 0.46, size * 0.52, size * 0.26, size * 0.24);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.strokeStyle = itemId === 'eclipse_pendant' ? '#9333ea' : '#fde68a';
      ctx.lineWidth = Math.max(2.2, size * 0.05);
      ctx.beginPath();
      ctx.arc(cx, cy - size * 0.04, size * 0.22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(cx - size * 0.04, size * 0.58, size * 0.08, size * 0.22);
    }
  } else if (
    itemId.includes('shield') ||
    itemId === 'rotting_targe' ||
    itemId === 'rimmed_shield' ||
    itemId === 'legion_heater' ||
    itemId === 'widows_shield' ||
    itemId === 'aegis_of_order'
  ) {
    ctx.fillStyle =
      itemId === 'aegis_of_order'
        ? '#e2e8f0'
        : itemId === 'legion_heater' || itemId.includes('iron')
        ? '#475569'
        : itemId === 'widows_shield' || itemId.includes('blood')
        ? '#4c0519'
        : '#5c3d28';
    ctx.beginPath();
    ctx.moveTo(size * 0.22, size * 0.18);
    ctx.lineTo(size * 0.78, size * 0.18);
    ctx.quadraticCurveTo(size * 0.78, size * 0.65, cx, size * 0.86);
    ctx.quadraticCurveTo(size * 0.22, size * 0.65, size * 0.22, size * 0.18);
    ctx.fill();
    ctx.stroke();
  } else if (itemId === 'lucky_coin') {
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.2, 0, Math.PI * 2);
    ctx.stroke();
  } else if (itemId === 'lockpick') {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = Math.max(2, size * 0.055);
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.78);
    ctx.lineTo(size * 0.72, size * 0.26);
    ctx.lineTo(size * 0.84, size * 0.34);
    ctx.stroke();
  } else if (itemId === 'torch' || itemId === 'oil_lamp') {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - size * 0.07, cy, size * 0.14, size * 0.36);
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.05, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.03, size * 0.09, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'steel_trap') {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = Math.max(2.2, size * 0.055);
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(cx + i * size * 0.08 - 2, cy - size * 0.12, 4, size * 0.24);
    }
  } else if (itemId === 'void_core') {
    const vcGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.32);
    vcGrad.addColorStop(0, '#f3e8ff');
    vcGrad.addColorStop(0.45, '#9333ea');
    vcGrad.addColorStop(1, '#1e0b36');
    ctx.fillStyle = vcGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d8b4fe';
    ctx.stroke();
  } else if (itemId === 'knight_ring') {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = Math.max(2.5, size * 0.07);
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.24, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'pure_soul_shard' || itemId === 'petrified_bone_shard') {
    ctx.fillStyle = itemId === 'pure_soul_shard' ? '#e0f2fe' : '#a8a29e';
    ctx.beginPath();
    ctx.moveTo(cx, size * 0.14);
    ctx.lineTo(size * 0.72, cy);
    ctx.lineTo(cx, size * 0.86);
    ctx.lineTo(size * 0.28, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (itemId === 'ancient_parchment' || itemId === 'reconstruction_scroll' || itemId.startsWith('scroll_')) {
    ctx.fillStyle = itemId === 'reconstruction_scroll' ? '#fde68a' : '#d6be96';
    ctx.fillRect(size * 0.2, size * 0.14, size * 0.6, size * 0.72);
    ctx.strokeRect(size * 0.2, size * 0.14, size * 0.6, size * 0.72);
    ctx.strokeStyle = itemId === 'reconstruction_scroll' ? '#b45309' : '#7f1d1d';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.16, 0, Math.PI * 2);
    ctx.stroke();
  } else if (itemId.includes('mace') || itemId.includes('sledge') || itemId.includes('bell')) {
    // Heavy Mace / Sledgehammer / Blood Bell
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = Math.max(3, size * 0.075);
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.8);
    ctx.lineTo(size * 0.68, size * 0.32);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.4, size * 0.032);
    ctx.strokeStyle = '#070608';
    ctx.fillStyle = itemId.includes('holy') ? '#fbbf24' : itemId.includes('cursed') ? '#9333ea' : '#94a3b8';
    ctx.beginPath();
    ctx.arc(size * 0.68, size * 0.32, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (itemId.includes('bow') || itemId.includes('whip')) {
    ctx.strokeStyle = itemId.includes('whip') ? '#dc2626' : '#a16207';
    ctx.lineWidth = Math.max(2.4, size * 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.28, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();
  } else if (itemId.includes('axe') || itemId.includes('cleaver') || itemId.includes('scythe')) {
    // Battle Axe / Butcher Cleaver / Reaper Scythe
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = Math.max(3, size * 0.07);
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.82);
    ctx.lineTo(size * 0.75, size * 0.2);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.4, size * 0.032);
    ctx.strokeStyle = '#070608';
    ctx.fillStyle = itemId.includes('cursed') ? '#c084fc' : '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(size * 0.56, size * 0.24);
    ctx.quadraticCurveTo(size * 0.88, size * 0.36, size * 0.66, size * 0.62);
    ctx.lineTo(size * 0.46, size * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Detailed Weapon Blade + Fuller + Crossguard
    const col =
      itemId.includes('cursed') || itemId.includes('vaelis')
        ? '#dc2626'
        : itemId.includes('void')
        ? '#c77dff'
        : itemId.includes('holy')
        ? '#f4d03f'
        : '#e2e8f0';
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(size * 0.22, size * 0.74);
    ctx.lineTo(size * 0.76, size * 0.16);
    ctx.lineTo(size * 0.84, size * 0.24);
    ctx.lineTo(size * 0.3, size * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = itemId.includes('cursed') ? '#c084fc' : '#d4af37';
    ctx.lineWidth = Math.max(2.5, size * 0.06);
    ctx.beginPath();
    ctx.moveTo(size * 0.18, size * 0.62);
    ctx.lineTo(size * 0.42, size * 0.84);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws the 3 Illustrated Prologue Frames on a Canvas
 */
export function drawPrologueScene(
  ctx: CanvasRenderingContext2D,
  step: number,
  w: number,
  h: number,
  classId: string = 'fallen_knight'
) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  if (step === 0) {
    sky.addColorStop(0, '#1a060d');
    sky.addColorStop(0.55, '#4a101d');
    sky.addColorStop(1, '#09070b');
  } else if (step === 1) {
    sky.addColorStop(0, '#0f0818');
    sky.addColorStop(0.6, '#2e1645');
    sky.addColorStop(1, '#08060a');
  } else {
    sky.addColorStop(0, '#141917');
    sky.addColorStop(0.7, '#0d1110');
    sky.addColorStop(1, '#080709');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  if (step === 0) {
    // Red Moon & Cosmic Rift behind descending Black Castle crushing Goethe Cathedral
    const moonGrad = ctx.createRadialGradient(w * 0.5, h * 0.25, 10, w * 0.5, h * 0.25, 76);
    moonGrad.addColorStop(0, '#ef4444');
    moonGrad.addColorStop(0.7, '#991b1b');
    moonGrad.addColorStop(1, 'rgba(153,27,27,0)');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.25, 76, 0, Math.PI * 2);
    ctx.fill();

    // Purple Void crack behind castle
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.05);
    ctx.lineTo(w * 0.35, h * 0.22);
    ctx.lineTo(w * 0.65, h * 0.2);
    ctx.lineTo(w * 0.82, h * 0.06);
    ctx.stroke();

    // Falling Dark Castle (Floor 1) slamming onto Goethe Cathedral dome (Floor 2)
    ctx.fillStyle = '#140b10';
    ctx.beginPath();
    ctx.moveTo(w * 0.28, 0);
    ctx.lineTo(w * 0.33, h * 0.45);
    ctx.lineTo(w * 0.46, h * 0.58);
    ctx.lineTo(w * 0.54, h * 0.58);
    ctx.lineTo(w * 0.67, h * 0.45);
    ctx.lineTo(w * 0.72, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Crushed Cathedral roof & spires below
    ctx.fillStyle = '#241d22';
    ctx.fillRect(w * 0.16, h * 0.62, w * 0.68, h * 0.38);
    ctx.fillStyle = '#1a1418';
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.62);
    ctx.lineTo(w * 0.24, h * 0.46);
    ctx.lineTo(w * 0.28, h * 0.62);
    ctx.moveTo(w * 0.72, h * 0.62);
    ctx.lineTo(w * 0.76, h * 0.44);
    ctx.lineTo(w * 0.8, h * 0.62);
    ctx.fill();

    // Glowing blood fissures radiating from impact
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.58);
    ctx.lineTo(w * 0.41, h * 0.84);
    ctx.moveTo(w * 0.5, h * 0.58);
    ctx.lineTo(w * 0.6, h * 0.88);
    ctx.stroke();
  } else if (step === 1) {
    // Rising Void Tentacles & Black Blood Statue of Holy Mother
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = i % 2 === 0 ? '#9d4edd' : '#b91c1c';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(w * (0.12 + i * 0.15), h);
      ctx.quadraticCurveTo(w * 0.5, h * 0.35, w * (0.14 + i * 0.14), h * 0.14);
      ctx.stroke();
    }

    // Silhouette of Weeping Holy Mother Statue
    ctx.fillStyle = '#1f1924';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.32, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w * 0.42, h * 0.42);
    ctx.lineTo(w * 0.58, h * 0.42);
    ctx.lineTo(w * 0.64, h * 0.96);
    ctx.lineTo(w * 0.36, h * 0.96);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Black blood tears weeping from eyes
    ctx.strokeStyle = '#090507';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w * 0.485, h * 0.33);
    ctx.lineTo(w * 0.478, h * 0.65);
    ctx.moveTo(w * 0.515, h * 0.33);
    ctx.lineTo(w * 0.522, h * 0.65);
    ctx.stroke();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    // Jagged Iron Gate of Goethe Exterior + Hero's chosen class
    ctx.fillStyle = '#241f1c';
    ctx.fillRect(w * 0.14, h * 0.18, w * 0.16, h * 0.82);
    ctx.fillRect(w * 0.7, h * 0.18, w * 0.16, h * 0.82);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    for (let x = w * 0.32; x <= w * 0.68; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.24);
      ctx.lineTo(x, h * 0.92);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.38);
    ctx.lineTo(w * 0.7, h * 0.38);
    ctx.moveTo(w * 0.3, h * 0.7);
    ctx.lineTo(w * 0.7, h * 0.7);
    ctx.stroke();
    drawPartyBackSprite(ctx, classId, w * 0.44, h * 0.56, 68, 92, { leftArm: true, rightArm: true });
  }

  ctx.restore();
}

const tileCache: Map<string, HTMLCanvasElement> = new Map();

/**
 * Generates High-Detail 2D Architectural & Grimy Stone Map Textures (48x48)
 */
export function getFloorTileTexture(
  floor: 1 | 2 | 3,
  tileType: string,
  variant: number,
  isExterior: boolean = false
): HTMLCanvasElement {
  const v = Math.abs(variant) % 4;
  const key = `v3_${floor}_${tileType}_${v}_${isExterior ? 'ext' : 'int'}`;
  const cached = tileCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d')!;

  // 1. VOID (Dead Pine Canopy in Exterior / Cosmic Starfield in Floor 3 / Deep Abyss)
  if (tileType === 'VOID') {
    ctx.fillStyle = isExterior ? '#0f1410' : floor === 3 ? '#07040e' : '#070608';
    ctx.fillRect(0, 0, 48, 48);

    if (isExterior) {
      // Dead Pine Tree Canopy & gnarled branches casting shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.ellipse(26, 28, 19, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      const treeGrad = ctx.createRadialGradient(22, 20, 3, 24, 24, 18);
      treeGrad.addColorStop(0, '#2b3626');
      treeGrad.addColorStop(0.6, '#1b2418');
      treeGrad.addColorStop(1, '#0d120c');
      ctx.fillStyle = treeGrad;
      ctx.beginPath();
      ctx.arc(24, 22, 16, 0, Math.PI * 2);
      ctx.fill();

      // Dead dry twigs
      ctx.strokeStyle = '#3d3126';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(24, 22);
      ctx.lineTo(14, 12);
      ctx.moveTo(24, 22);
      ctx.lineTo(34, 14);
      ctx.moveTo(24, 22);
      ctx.lineTo(20, 34);
      ctx.stroke();
    } else if (floor === 3) {
      // Cosmic Starfield & Nebula dust
      ctx.fillStyle = v % 2 === 0 ? '#a855f7' : '#e9d5ff';
      ctx.fillRect(10 + v * 6, 12 + v * 4, 2, 2);
      ctx.fillRect(34 - v * 5, 28 + v * 3, 1.5, 1.5);
    }
    tileCache.set(key, canvas);
    return canvas;
  }

  // 2. 3D TOP-DOWN STONE WALL & CRACKED WALL (Lighter Top Ledge + Darker Front Masonry Face + Drop Shadow)
  if (tileType === 'WALL' || tileType === 'CRACKED_WALL') {
    const topCol = floor === 1 ? '#4a2024' : floor === 3 ? '#3b2859' : '#4a4e48';
    const frontCol = floor === 1 ? '#291114' : floor === 3 ? '#1e1330' : '#262925';
    const mortarCol = '#09080a';

    // Top horizontal roof/ledge (upper 18px)
    ctx.fillStyle = topCol;
    ctx.fillRect(0, 0, 48, 18);

    // Highlight bevel between top and front face
    ctx.fillStyle = floor === 1 ? '#7f1d1d' : floor === 3 ? '#6d28d9' : '#6c756b';
    ctx.fillRect(0, 17, 48, 2);

    // Front vertical stone masonry face (lower 30px)
    ctx.fillStyle = frontCol;
    ctx.fillRect(0, 19, 48, 29);

    // Staggered brick mortar lines
    ctx.strokeStyle = mortarCol;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, 46, 16);
    ctx.strokeRect(1, 19, 23, 14);
    ctx.strokeRect(24, 19, 23, 14);
    ctx.strokeRect(1, 33, 15, 14);
    ctx.strokeRect(16, 33, 16, 14);
    ctx.strokeRect(32, 33, 15, 14);

    // Moss / Grime at wall base
    ctx.fillStyle = floor === 1 ? 'rgba(220, 38, 38, 0.25)' : 'rgba(30, 58, 28, 0.45)';
    ctx.fillRect(0, 42, 48, 6);

    if (tileType === 'CRACKED_WALL') {
      // Glowing structural fissure indicating Brown Vial destructible wall
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(22, 3);
      ctx.lineTo(28, 17);
      ctx.lineTo(18, 31);
      ctx.lineTo(27, 45);
      ctx.stroke();
    }

    tileCache.set(key, canvas);
    return canvas;
  }

  // 3. CHASM (Abyssal Pit / Magma Trench / Cosmic Void)
  if (tileType === 'CHASM') {
    const grad = ctx.createRadialGradient(24, 24, 4, 24, 24, 30);
    grad.addColorStop(0, floor === 1 ? '#ea580c' : floor === 3 ? '#7e22ce' : '#050507');
    grad.addColorStop(1, '#040306');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#1f1924';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 46, 46);
    tileCache.set(key, canvas);
    return canvas;
  }

  // 4. BASE FLOOR TEXTURE (Exterior Grass/Pebbles vs Floor 2 Mossy/Bloody Flagstones vs Floor 1 Magma vs Floor 3 Runes)
  if (isExterior) {
    // Withered yellow-moss grass & gravel dirt path
    ctx.fillStyle = v % 2 === 0 ? '#282e22' : '#23291e';
    ctx.fillRect(0, 0, 48, 48);

    // Gravel pebbles
    ctx.fillStyle = '#3d382e';
    ctx.beginPath();
    ctx.arc(12 + v * 4, 16, 2.2, 0, Math.PI * 2);
    ctx.arc(34 - v * 3, 36, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Multi-layered withered yellow-olive grass tufts
    ctx.strokeStyle = v % 2 === 0 ? '#5c6638' : '#47542c';
    ctx.lineWidth = 1.4;
    for (const [gx, gy] of [
      [14, 36],
      [34, 22],
      [22, 14],
    ]) {
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx - 4, gy - 9);
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx, gy - 11);
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + 4, gy - 8);
      ctx.stroke();
    }
  } else if (floor === 2) {
    // Goethe Cathedral: Irregular grimy flagstones + cracks + corner moss + dried blood + grain noise
    ctx.fillStyle = v % 2 === 0 ? '#232522' : '#1e201d';
    ctx.fillRect(0, 0, 48, 48);

    // Irregular flagstone joints
    ctx.strokeStyle = '#0d0e0c';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, 46, 46);
    ctx.beginPath();
    ctx.moveTo(0, 24 + (v - 1) * 3);
    ctx.lineTo(48, 24 - (v - 1) * 3);
    ctx.moveTo(24 + (v % 2) * 5, 0);
    ctx.lineTo(22, 24);
    ctx.stroke();

    // Stone grain speckles
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(((i * 13 + v * 7) % 42) + 3, ((i * 19 + v * 11) % 42) + 3, 2, 2);
    }

    // Dull green moss in slab corners
    ctx.fillStyle = 'rgba(45, 76, 43, 0.55)';
    ctx.beginPath();
    ctx.arc(6, 6, 6 + v, 0, Math.PI * 2);
    ctx.arc(42, 40, 5, 0, Math.PI * 2);
    ctx.fill();

    // Dried dark bloodstain on some variants
    if (v === 1 || v === 3) {
      ctx.fillStyle = 'rgba(88, 16, 20, 0.55)';
      ctx.beginPath();
      ctx.ellipse(28, 30, 8, 5, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (floor === 1) {
    // Demon Lord Castle: Black basalt stone with glowing red magma veins
    ctx.fillStyle = '#1c1012';
    ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#090405';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, 46, 46);

    // Glowing magma crack
    ctx.strokeStyle = v % 2 === 0 ? '#dc2626' : '#ea580c';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(6, 10 + v * 4);
    ctx.lineTo(24, 26);
    ctx.lineTo(42, 38 - v * 3);
    ctx.stroke();
  } else {
    // Floor 3 Astral Abyss: Indigo rune stone with faint glowing purple magic circle
    ctx.fillStyle = '#181126';
    ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#2e1d4a';
    ctx.strokeRect(1, 1, 46, 46);

    ctx.strokeStyle = 'rgba(168, 85, 247, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(24, 24, 15, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 5. ARCHITECTURAL PROPS OVERLAID ON FLOOR
  if (tileType === 'BRIDGE') {
    ctx.fillStyle = '#4a3520';
    ctx.fillRect(3, 2, 42, 44);
    ctx.strokeStyle = '#1f140b';
    ctx.lineWidth = 1.5;
    for (let y = 8; y < 44; y += 9) {
      ctx.strokeRect(4, y, 40, 7);
    }
  } else if (tileType === 'BARS' || tileType === 'SHORTCUT_GATE' || (isExterior && tileType === 'PORTAL_NEXT')) {
    // Jagged Iron Gate with Riveted Horizontal Crossbars
    ctx.fillStyle = 'rgba(15, 15, 20, 0.6)';
    ctx.fillRect(2, 6, 44, 36);
    ctx.strokeStyle = tileType === 'SHORTCUT_GATE' ? '#eab308' : '#94a3b8';
    ctx.lineWidth = 3;
    for (let x = 8; x <= 40; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.lineTo(x, 44);
      ctx.stroke();
    }
    // Riveted horizontal crossbars
    ctx.fillStyle = '#475569';
    ctx.fillRect(4, 14, 40, 4);
    ctx.fillRect(4, 32, 40, 4);
  } else if (tileType === 'CRATE') {
    // Detailed Wooden Barrel / Supply Crate with Plank Grain & Steel Hoops
    const crateGrad = ctx.createRadialGradient(22, 20, 3, 24, 24, 18);
    crateGrad.addColorStop(0, '#855832');
    crateGrad.addColorStop(0.7, '#5c3a1e');
    crateGrad.addColorStop(1, '#2b190b');
    ctx.fillStyle = crateGrad;
    ctx.beginPath();
    ctx.arc(24, 24, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a0f07';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Steel Rim & Plank lines
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(24, 24, 13, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#2b190b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(14, 16);
    ctx.lineTo(34, 16);
    ctx.moveTo(12, 24);
    ctx.lineTo(36, 24);
    ctx.moveTo(14, 32);
    ctx.lineTo(34, 32);
    ctx.stroke();
  } else if (tileType === 'HERB') {
    // Wild Medicinal Herb Patch (Green / Red / White / Calm Flower cluster)
    ctx.fillStyle = 'rgba(10, 24, 14, 0.65)';
    ctx.beginPath();
    ctx.ellipse(24, 30, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lush serrated herb stems & leaves
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2.2;
    for (const [lx, ly] of [
      [14, 16],
      [24, 12],
      [34, 17],
      [18, 22],
      [30, 22],
    ]) {
      ctx.beginPath();
      ctx.moveTo(24, 32);
      ctx.quadraticCurveTo((24 + lx) / 2, ly + 6, lx, ly);
      ctx.stroke();
    }

    ctx.fillStyle = '#22c55e';
    for (const [lx, ly, ang] of [
      [16, 20, -0.5],
      [32, 20, 0.5],
      [24, 15, 0],
    ]) {
      ctx.beginPath();
      ctx.ellipse(lx, ly, 5.5, 2.8, ang, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glowing medicinal buds (Emerald Green, Crimson Red, Pure White, or Calm Azure based on variant)
    const budColors = ['#4ade80', '#ef4444', '#f8fafc', '#38bdf8'];
    const budCol = budColors[v % budColors.length];
    ctx.fillStyle = budCol;
    for (const [bx, by] of [
      [15, 15],
      [24, 11],
      [33, 16],
    ]) {
      ctx.beginPath();
      ctx.arc(bx, by, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  } else if (tileType === 'CHEST') {
    // Dark Oak Treasure Chest bound in Iron Straps with Gold Lock
    ctx.fillStyle = '#451a03';
    ctx.fillRect(7, 13, 34, 24);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(7, 10, 34, 8);
    ctx.strokeStyle = '#090504';
    ctx.lineWidth = 2;
    ctx.strokeRect(7, 10, 34, 27);

    // Iron Straps
    ctx.fillStyle = '#64748b';
    ctx.fillRect(12, 10, 4, 27);
    ctx.fillRect(32, 10, 4, 27);

    // Gleaming Gold Lockplate
    ctx.fillStyle = '#facc15';
    ctx.fillRect(21, 18, 6, 8);
    ctx.strokeRect(21, 18, 6, 8);
  } else if (tileType === 'BOOKSHELF') {
    // Tall Carved Wooden Bookshelf with Colored Tomes & Scrolls
    ctx.fillStyle = '#3b2313';
    ctx.fillRect(6, 4, 36, 40);
    ctx.strokeStyle = '#140b05';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 4, 36, 40);

    const colors = ['#991b1b', '#1e40af', '#ca8a04', '#6b21a8', '#065f46'];
    for (let row = 0; row < 3; row++) {
      const ry = 9 + row * 12;
      ctx.fillStyle = '#1f1209';
      ctx.fillRect(9, ry, 30, 9);
      for (let b = 0; b < 5; b++) {
        ctx.fillStyle = colors[(row + b) % colors.length];
        ctx.fillRect(10 + b * 5.8, ry + 1, 4.5, 8);
      }
    }
  } else if (tileType === 'HEXEN_ALTAR') {
    // Stone Pedestal inscribed with Glowing Purple 6-Pointed Star Rune Circle & Candles
    ctx.fillStyle = '#272030';
    ctx.beginPath();
    ctx.arc(24, 24, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#09070c';
    ctx.lineWidth = 2;
    ctx.stroke();

    const runeGlow = ctx.createRadialGradient(24, 24, 2, 24, 24, 17);
    runeGlow.addColorStop(0, 'rgba(216, 180, 254, 0.85)');
    runeGlow.addColorStop(0.6, 'rgba(147, 51, 234, 0.45)');
    runeGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = runeGlow;
    ctx.beginPath();
    ctx.arc(24, 24, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(24, 24, 13, 0, Math.PI * 2);
    // Hexagram star
    ctx.moveTo(24, 11);
    ctx.lineTo(35, 30);
    ctx.lineTo(13, 30);
    ctx.closePath();
    ctx.moveTo(24, 37);
    ctx.lineTo(35, 18);
    ctx.lineTo(13, 18);
    ctx.closePath();
    ctx.stroke();
  } else if (tileType === 'STAIRS_DOWN' || tileType === 'STAIRS_UP') {
    // Recessed 3D Stone Steps descending into shadow
    ctx.fillStyle = '#09070c';
    ctx.fillRect(5, 5, 38, 38);
    for (let s = 0; s < 5; s++) {
      const shade = tileType === 'STAIRS_DOWN' ? 75 - s * 13 : 25 + s * 13;
      ctx.fillStyle = `rgb(${shade}, ${shade - 5}, ${shade + 8})`;
      ctx.fillRect(7 + s * 2, 7 + s * 7, 34 - s * 4, 6);
    }
    ctx.strokeStyle = tileType === 'STAIRS_DOWN' ? '#a855f7' : '#f43f5e';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, 38, 38);
  } else if (tileType === 'VOID_RIFT') {
    const riftGrad = ctx.createRadialGradient(24, 24, 2, 24, 24, 22);
    riftGrad.addColorStop(0, '#fdf4ff');
    riftGrad.addColorStop(0.35, '#a855f7');
    riftGrad.addColorStop(0.75, '#4c1d95');
    riftGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = riftGrad;
    ctx.beginPath();
    ctx.arc(24, 24, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f0abfc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(24, 24, 16, 8, 0.5, 0, Math.PI * 2);
    ctx.stroke();
  } else if (tileType === 'BED_SAVE') {
    // Stone Cot with Straw Mattress & Fur Blanket
    ctx.fillStyle = '#3b2818';
    ctx.fillRect(7, 8, 34, 32);
    ctx.strokeStyle = '#140c06';
    ctx.lineWidth = 2;
    ctx.strokeRect(7, 8, 34, 32);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(10, 10, 14, 9);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(10, 20, 28, 17);
  } else if (tileType === 'FLOOR_TRAP') {
    // Rusty Bear-Trap / Spike Plate on Floor
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(24, 24, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#991b1b';
    for (const [sx, sy] of [[18, 20], [24, 18], [30, 20], [20, 28], [28, 28]]) {
      ctx.fillRect(sx - 1.5, sy - 3, 3, 6);
    }
  } else if (tileType === 'MIASMA_VENT') {
    // Glowing Purple Miasma Fissure Vent
    const mGrad = ctx.createRadialGradient(24, 24, 2, 24, 24, 18);
    mGrad.addColorStop(0, 'rgba(216, 180, 254, 0.8)');
    mGrad.addColorStop(0.55, 'rgba(126, 34, 206, 0.45)');
    mGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mGrad;
    ctx.beginPath();
    ctx.arc(24, 24, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 28);
    ctx.lineTo(24, 18);
    ctx.lineTo(36, 26);
    ctx.stroke();
  } else if (tileType === 'RITUAL_CIRCLE') {
    // Sacrificial Blood & Order Sigil Circle
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(24, 24, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(14, 14, 20, 20);
  } else if (tileType === 'CORPSE_LOOT') {
    // Fallen Expedition Corpse with Armor Remnants & Satchel
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.ellipse(24, 26, 14, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e5dccb';
    ctx.beginPath();
    ctx.arc(15, 22, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(20, 24, 10, 5);
  }

  tileCache.set(key, canvas);
  return canvas;
}

/**
 * Draws a 160x160 3D Embossed Antique Gold Coin for the Fate Coin Flip Modal
 * HEADS (MẶT NGỬA) = Crowned Holy Mother Portrait with Radiant Halo
 * TAILS (MẶT SẤP) = Goethe Sanctuary Emblem (Cross inside Solar Eclipse Circle)
 */
export function drawEngravedGoldCoin(
  ctx: CanvasRenderingContext2D,
  side: 'HEADS' | 'TAILS' | null,
  size: number = 160,
  clearCanvas: boolean = true
) {
  ctx.save();
  if (clearCanvas) {
    ctx.clearRect(0, 0, size, size);
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.44;

  // Outer ambient drop shadow (only when standalone or front-facing)
  if (clearCanvas) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.arc(cx + 3, cy + 5, r + 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Metallic 3D Gold Rim Gradient
  const rimGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  if (side === 'TAILS') {
    rimGrad.addColorStop(0, '#fde68a');
    rimGrad.addColorStop(0.35, '#d97706');
    rimGrad.addColorStop(0.7, '#78350f');
    rimGrad.addColorStop(1, '#f59e0b');
  } else {
    rimGrad.addColorStop(0, '#fef08a');
    rimGrad.addColorStop(0.3, '#eab308');
    rimGrad.addColorStop(0.7, '#854d0e');
    rimGrad.addColorStop(1, '#fde047');
  }

  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Serrated Milled Coin Edge (36 notches around rim)
  ctx.strokeStyle = 'rgba(69, 26, 3, 0.75)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 36; i++) {
    const ang = (i * Math.PI * 2) / 36;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * (r - 6), cy + Math.sin(ang) * (r - 6));
    ctx.lineTo(cx + Math.cos(ang) * (r - 1), cy + Math.sin(ang) * (r - 1));
    ctx.stroke();
  }

  // Recessed Inner Coin Face
  const faceR = r - 9;
  const faceGrad = ctx.createRadialGradient(cx - faceR * 0.25, cy - faceR * 0.25, 6, cx, cy, faceR);
  faceGrad.addColorStop(0, '#ca8a04');
  faceGrad.addColorStop(0.65, '#854d0e');
  faceGrad.addColorStop(1, '#451a03');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, faceR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, faceR - 2, 0, Math.PI * 2);
  ctx.stroke();

  const effectiveSide = side || 'HEADS';

  if (effectiveSide === 'HEADS') {
    // HEADS: Crowned Holy Mother Relief Portrait with Radiant Halo
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 26, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const ang = (i * Math.PI * 2) / 12;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 28, cy - 6 + Math.sin(ang) * 28);
      ctx.lineTo(cx + Math.cos(ang) * 35, cy - 6 + Math.sin(ang) * 35);
      ctx.stroke();
    }

    // Draped Veil & Shoulders Bust
    const reliefGrad = ctx.createLinearGradient(cx - 24, cy - 28, cx + 24, cy + 38);
    reliefGrad.addColorStop(0, '#fef08a');
    reliefGrad.addColorStop(0.5, '#eab308');
    reliefGrad.addColorStop(1, '#713f12');
    ctx.fillStyle = reliefGrad;
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(cx - 28, cy + 36);
    ctx.quadraticCurveTo(cx - 24, cy + 8, cx - 14, cy - 10);
    ctx.quadraticCurveTo(cx, cy - 26, cx + 14, cy - 10);
    ctx.quadraticCurveTo(cx + 24, cy + 8, cx + 28, cy + 36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sculpted Face Oval
    ctx.beginPath();
    ctx.ellipse(cx, cy - 3, 12, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Serene Closed Eyes & Nose Bridge
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 4);
    ctx.quadraticCurveTo(cx - 4, cy - 2, cx - 2, cy - 4);
    ctx.moveTo(cx + 2, cy - 4);
    ctx.quadraticCurveTo(cx + 4, cy - 2, cx + 7, cy - 4);
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx, cy + 2);
    ctx.stroke();

    // 5-Spire Gothic Crown
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy - 15);
    ctx.lineTo(cx - 13, cy - 28);
    ctx.lineTo(cx - 7, cy - 20);
    ctx.lineTo(cx, cy - 33);
    ctx.lineTo(cx + 7, cy - 20);
    ctx.lineTo(cx + 13, cy - 28);
    ctx.lineTo(cx + 15, cy - 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // TAILS: Goethe Sanctuary Emblem (Ornate Cross inside Solar Eclipse Circle)
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.stroke();

    // Eclipse rays
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI * 2) / 8 + Math.PI / 8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 34, cy + Math.sin(ang) * 34);
      ctx.lineTo(cx + Math.cos(ang) * 43, cy + Math.sin(ang) * 43);
      ctx.stroke();
    }

    // Ornate Gothic Cross of Goethe
    const crossGrad = ctx.createLinearGradient(cx - 24, cy - 34, cx + 24, cy + 34);
    crossGrad.addColorStop(0, '#fef08a');
    crossGrad.addColorStop(0.5, '#f59e0b');
    crossGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = crossGrad;
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;

    // Vertical beam
    ctx.fillRect(cx - 6, cy - 36, 12, 72);
    ctx.strokeRect(cx - 6, cy - 36, 12, 72);
    // Horizontal beam
    ctx.fillRect(cx - 28, cy - 10, 56, 12);
    ctx.strokeRect(cx - 28, cy - 10, 56, 12);

    // Center Blood Ruby / Solar Core
    ctx.fillStyle = '#be123c';
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Specular metallic sheen across coin surface
  const sheen = ctx.createLinearGradient(cx - r, cy - r, cx + r * 0.4, cy + r * 0.4);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
  sheen.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the 3-Phase 1.6-Second 3D Parabolic Coin Flip Animation on Canvas:
 * - Phase 1 (0.0s - 0.65s): Launch upward from bottom along parabolic arc with rapid 3D horizontal-axis flip (scaleY = Math.cos(flipAngle)) alternating HEADS/TAILS + shrinking ground shadow.
 * - Phase 2 (0.65s - 1.15s): Rapid fall to ground, decelerating flip, light bounce on stone floor, then 200ms perspective rest (scaleY ~ 0.45) revealing the result face.
 * - Phase 3 (1.15s - 1.60s): Smooth glide to screen center, rotating to front-facing (scaleY = 1) and zooming to crisp 160x160px result.
 * Supports both 1-coin and 2-coin (Lucky Coin x2) diverging parabolic trajectories.
 */
export function drawParabolicCoinFlipStage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsedMs: number,
  resultSide: 'HEADS' | 'TAILS',
  secondResultSide?: 'HEADS' | 'TAILS' | null
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  const coins: Array<{ targetSide: 'HEADS' | 'TAILS'; idx: number }> = secondResultSide
    ? [
        { targetSide: resultSide, idx: 0 },
        { targetSide: secondResultSide, idx: 1 },
      ]
    : [{ targetSide: resultSide, idx: 0 }];

  const groundY = height * 0.74;
  const startY = height * 0.94;
  const apexY = height * 0.17;
  const centerY = height * 0.48;
  const baseCoinSize = 160;

  for (const coin of coins) {
    const isDual = coins.length === 2;
    const dir = coin.idx === 0 ? -1 : 1;

    let x = width / 2;
    let y = centerY;
    let scaleY = 1;
    let coinScale = 1;
    let tiltAngle = 0;
    let activeFace: 'HEADS' | 'TAILS' = coin.targetSide;
    let shadowAlpha = 0;
    let shadowScale = 1;
    let impactRingProgress = -1;

    if (elapsedMs < 650) {
      // Phase 1 (0.0s - 0.65s): Parabolic upward launch from bottom edge
      const t1 = Math.max(0, elapsedMs / 650);
      const arc = 1 - Math.pow(1 - t1, 2.15);
      y = startY + (apexY - startY) * arc;

      if (isDual) {
        const spread = 28 + 56 * t1;
        x = width / 2 + dir * spread;
      } else {
        x = width / 2 + Math.sin(t1 * Math.PI) * 6;
      }

      // 3D horizontal-axis flip (scaleY = Math.cos(flipAngle)) alternating HEADS & TAILS
      const flipAngle = t1 * Math.PI * 8.5 + coin.idx * 0.85;
      const cosVal = Math.cos(flipAngle);
      activeFace = cosVal >= 0 ? 'HEADS' : 'TAILS';
      scaleY = Math.max(0.06, Math.abs(cosVal));

      tiltAngle =
        Math.sin(t1 * Math.PI * 3 + coin.idx) * 0.13 + (isDual ? dir * 0.08 : 0.05);
      coinScale = 0.72 + 0.18 * Math.sin(t1 * Math.PI * 0.6);

      // Ground shadow shrinks as coin flies higher
      shadowScale = 1 - 0.62 * arc;
      shadowAlpha = 0.56 * (1 - 0.6 * arc);
    } else if (elapsedMs < 1150) {
      // Phase 2 (0.65s - 1.15s): Fall down, bounce lightly, and rest at perspective angle (scaleY ~ 0.45) for 200ms
      const t2 = (elapsedMs - 650) / 500; // 500ms total

      if (isDual) {
        x = width / 2 + dir * 84;
      } else {
        x = width / 2;
      }

      if (t2 < 0.44) {
        // 2A (0.65s - 0.87s): Rapid fall to ground with decelerating flip
        const f = t2 / 0.44;
        const fallQuad = f * f;
        y = apexY + (groundY - apexY) * fallQuad;

        const flipAngle = Math.PI * 8.5 + (1 - Math.pow(1 - f, 1.6)) * Math.PI * 3.0 + coin.idx * 0.6;
        const cosVal = Math.cos(flipAngle);
        activeFace = cosVal >= 0 ? 'HEADS' : 'TAILS';
        scaleY = Math.max(0.08, Math.abs(cosVal));
        tiltAngle = (1 - f) * (isDual ? dir * 0.08 : 0.08);
        coinScale = 0.9 - 0.1 * f;

        shadowScale = 0.38 + 0.62 * fallQuad;
        shadowAlpha = 0.24 + 0.46 * fallQuad;
      } else if (t2 < 0.60) {
        // 2B (0.87s - 0.95s): Light bounce on impact
        const b = (t2 - 0.44) / 0.16;
        const bounceArc = Math.sin(b * Math.PI);
        y = groundY - bounceArc * 26;
        activeFace = coin.targetSide;
        scaleY = 0.28 + 0.17 * b + bounceArc * 0.12;
        tiltAngle = bounceArc * (isDual ? dir * 0.05 : -0.04);
        coinScale = 0.80;

        shadowScale = 1 - bounceArc * 0.18;
        shadowAlpha = 0.68 - bounceArc * 0.15;
        impactRingProgress = (t2 - 0.44) / 0.45;
      } else {
        // 2C (0.95s - 1.15s = 200ms): Rest flat on ground at perspective angle (scaleY = 0.45) revealing result
        y = groundY;
        activeFace = coin.targetSide;
        scaleY = 0.45;
        tiltAngle = 0;
        coinScale = 0.80;

        shadowScale = 1.0;
        shadowAlpha = 0.72;
        impactRingProgress = Math.min(1, (t2 - 0.44) / 0.45);
      }
    } else {
      // Phase 3 (1.15s - 1.60s): Glide to screen center, rotate front-facing (scaleY = 1) & zoom to 160x160px
      const t3 = Math.min(1, (elapsedMs - 1150) / 450);
      const e3 = 1 - Math.pow(1 - t3, 3);

      if (isDual) {
        x = width / 2 + dir * (84 + 6 * e3);
      } else {
        x = width / 2;
      }

      y = groundY + (centerY - groundY) * e3;
      activeFace = coin.targetSide;
      scaleY = 0.45 + 0.55 * e3;
      tiltAngle = 0;
      coinScale = isDual ? 0.80 + 0.14 * e3 : 0.80 + 0.20 * e3;

      shadowScale = 1.0 + 0.25 * e3;
      shadowAlpha = 0.72 * (1 - e3 * 0.85);
    }

    // 1. Draw Ground Shadow beneath coin
    if (shadowAlpha > 0.01) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(
        x,
        groundY + 14,
        54 * shadowScale,
        16 * shadowScale,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }

    // Subtle golden impact ripple when touching the floor in Phase 2
    if (impactRingProgress >= 0 && impactRingProgress < 1) {
      ctx.save();
      ctx.strokeStyle = `rgba(253, 224, 71, ${(0.45 * (1 - impactRingProgress)).toFixed(3)})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(
        x,
        groundY + 6,
        42 + impactRingProgress * 38,
        14 + impactRingProgress * 12,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw 3D Coin with Perspective ScaleY, Extruded Metallic Rim Edge & Embossed Face
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tiltAngle);
    ctx.scale(coinScale, coinScale);

    const r = baseCoinSize * 0.44;
    // Draw 3D cylindrical rim thickness when coin is tilted/flipping (scaleY < 0.98)
    const rimThickness = Math.max(2, Math.round(12 * (1 - scaleY * 0.82)));
    if (rimThickness > 2) {
      const edgeGrad = ctx.createLinearGradient(-r, 0, r, 0);
      edgeGrad.addColorStop(0, '#451a03');
      edgeGrad.addColorStop(0.25, '#b45309');
      edgeGrad.addColorStop(0.5, '#fef08a');
      edgeGrad.addColorStop(0.75, '#92400e');
      edgeGrad.addColorStop(1, '#451a03');

      ctx.fillStyle = edgeGrad;
      ctx.beginPath();
      ctx.ellipse(0, rimThickness, r, r * scaleY, 0, 0, Math.PI);
      ctx.lineTo(-r, 0);
      ctx.ellipse(0, 0, r, r * scaleY, 0, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Draw scaled top coin face
    ctx.save();
    ctx.scale(1, scaleY);
    ctx.translate(-baseCoinSize / 2, -baseCoinSize / 2);
    drawEngravedGoldCoin(ctx, activeFace, baseCoinSize, false);
    ctx.restore();

    ctx.restore();
  }

  ctx.restore();
}


/**
 * Multi-Tile Landmark Renderer (Over-border rendering for HEXEN_ALTAR 3x2, RITUAL_CIRCLE 3x3, BOOKSHELF 1x2, VOID_RIFT 3x3)
 */
export function drawMultiTileLandmark(
  ctx: CanvasRenderingContext2D,
  tileType: string,
  tileX: number,
  tileY: number,
  tileW: number,
  tileH: number,
  animTick: number,
  isLooted: boolean = false,
  isPlayerInside: boolean = false
) {
  ctx.save();
  const cx = (tileX + 0.5) * tileW;
  const cy = (tileY + 0.5) * tileH;
  const pulse = Math.sin(animTick * 0.6) * 0.5 + 0.5;

  if (tileType === 'RITUAL_CIRCLE') {
    // 3x3 Tile (144x144px) Sunken Arcane Matrix carved into stone floor
    const radiusOuter = tileW * 1.38;
    const radiusMid = tileW * 1.02;
    const radiusInner = tileW * 0.56;

    // Sunken stone recess ring
    const recessGrad = ctx.createRadialGradient(cx, cy, radiusInner * 0.2, cx, cy, radiusOuter);
    recessGrad.addColorStop(
      0,
      isPlayerInside ? 'rgba(220, 38, 38, 0.42)' : 'rgba(88, 28, 135, 0.20)'
    );
    recessGrad.addColorStop(
      0.65,
      isPlayerInside ? 'rgba(250, 204, 21, 0.28)' : 'rgba(127, 29, 29, 0.16)'
    );
    recessGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = recessGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusOuter, 0, Math.PI * 2);
    ctx.fill();

    // Chiseled dark groove shadow
    ctx.strokeStyle = '#07050a';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusOuter, 0, Math.PI * 2);
    ctx.arc(cx, cy, radiusMid, 0, Math.PI * 2);
    ctx.stroke();

    // Glowing carved runes (blazes bright when player stands inside the 3x3 matrix)
    const primaryStroke = isLooted
      ? 'rgba(100, 116, 139, 0.45)'
      : isPlayerInside
      ? '#fef08a'
      : `rgba(239, 68, 68, ${0.68 + pulse * 0.25})`;
    const secondaryStroke = isLooted
      ? 'rgba(71, 85, 105, 0.35)'
      : isPlayerInside
      ? '#f87171'
      : `rgba(250, 204, 21, ${0.55 + pulse * 0.3})`;

    ctx.strokeStyle = primaryStroke;
    ctx.lineWidth = isPlayerInside ? 2.8 : 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusOuter, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = secondaryStroke;
    ctx.lineWidth = isPlayerInside ? 2.2 : 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusMid, 0, Math.PI * 2);
    ctx.arc(cx, cy, radiusInner, 0, Math.PI * 2);
    ctx.stroke();

    // 8-Pointed Octagram & Elder Glyphs across the 3x3 floor
    for (let i = 0; i < 8; i++) {
      const a1 = (i * Math.PI) / 4;
      const a2 = ((i + 3) * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a1) * radiusMid, cy + Math.sin(a1) * radiusMid);
      ctx.lineTo(cx + Math.cos(a2) * radiusMid, cy + Math.sin(a2) * radiusMid);
      ctx.stroke();

      // Rune nodes around outer ring
      const rx = cx + Math.cos(a1) * ((radiusOuter + radiusMid) * 0.5);
      const ry = cy + Math.sin(a1) * ((radiusOuter + radiusMid) * 0.5);
      ctx.fillStyle = isPlayerInside ? '#fef08a' : '#f87171';
      ctx.beginPath();
      ctx.arc(rx, ry, isPlayerInside ? 4 : 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (tileType === 'HEXEN_ALTAR') {
    // 3x2 Tile (144x96px) 3-Stepped Stone Dais + Glowing Purple-Gold Elder Rune Circle + 4 Flickering Candlesticks
    const daisW = tileW * 2.85; // ~136px across 3 tiles
    const daisH = tileH * 1.85; // ~88px across 2 tiles
    const leftX = cx - daisW / 2;
    const topY = cy - daisH * 0.58;

    // Ambient Point-Light Floor Halo piercing darkness
    const halo = ctx.createRadialGradient(cx, cy, 8, cx, cy, tileW * 2.1);
    halo.addColorStop(0, `rgba(216, 180, 254, ${0.38 + pulse * 0.14})`);
    halo.addColorStop(0.5, `rgba(147, 51, 234, ${0.22 + pulse * 0.08})`);
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, tileW * 2.1, 0, Math.PI * 2);
    ctx.fill();

    // 3 Stepped Stone Platforms (Outer -> Mid -> Inner Sanctum)
    const steps = [
      { insetX: 0, insetY: 0, fill: '#1e1826', border: '#4c3b63' },
      { insetX: 12, insetY: 8, fill: '#282033', border: '#6d548c' },
      { insetX: 24, insetY: 16, fill: '#332742', border: '#a855f7' },
    ];
    for (const st of steps) {
      const sx = leftX + st.insetX;
      const sy = topY + st.insetY;
      const sw = daisW - st.insetX * 2;
      const sh = daisH - st.insetY * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(sx + 3, sy + 4, sw, sh);
      ctx.fillStyle = st.fill;
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = st.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sw, sh);
    }

    // Center Glowing Purple-Gold Elder Rune Circle
    const rCircle = tileW * 0.58;
    const circleCenterY = topY + daisH * 0.5;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, circleCenterY, rCircle, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a1 = (i * Math.PI) / 3 + animTick * 0.04;
      const a2 = ((i + 2) * Math.PI) / 3 + animTick * 0.04;
      ctx.moveTo(cx + Math.cos(a1) * rCircle, circleCenterY + Math.sin(a1) * rCircle);
      ctx.lineTo(cx + Math.cos(a2) * rCircle, circleCenterY + Math.sin(a2) * rCircle);
    }
    ctx.stroke();

    // 4 Corner Candlesticks with Flickering Flames
    const candleOffsets = [
      [leftX + 16, topY + 14],
      [leftX + daisW - 16, topY + 14],
      [leftX + 16, topY + daisH - 16],
      [leftX + daisW - 16, topY + daisH - 16],
    ];
    for (let i = 0; i < candleOffsets.length; i++) {
      const [kx, ky] = candleOffsets[i];
      // Brass stand + wax pillar
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(kx - 4, ky, 8, 4);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(kx - 2.5, ky - 10, 5, 10);
      // Flickering flame
      const flickerY = ((animTick + i) % 2 === 0 ? -1 : 1);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.45)';
      ctx.beginPath();
      ctx.arc(kx, ky - 13 + flickerY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(kx, ky - 13 + flickerY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  if (tileType === 'BOOKSHELF') {
    // 1x2 Tile (48x96px) Tall Gothic Wooden Bookcase reaching toward the ceiling
    const px = tileX * tileW;
    const py = (tileY - 1) * tileH;
    const w = tileW;
    const h = tileH * 2;

    // Ground drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(px + 2, py + h - 10, w - 4, 12);

    // Tall Gothic Oak Frame + Pointed Arch Crown
    ctx.fillStyle = '#2b180c';
    ctx.fillRect(px + 3, py + 12, w - 6, h - 16);
    ctx.beginPath();
    ctx.moveTo(px + 3, py + 14);
    ctx.lineTo(px + w / 2, py + 2);
    ctx.lineTo(px + w - 3, py + 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#120904';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 3, py + 12, w - 6, h - 16);

    // 4 Tiers of Shelves packed with Ancient Tomes & Parchment Scrolls
    const tomeColors = ['#991b1b', '#1e3a8a', '#b45309', '#581c87', '#065f46', '#78350f'];
    for (let row = 0; row < 4; row++) {
      const sy = py + 18 + row * 17;
      ctx.fillStyle = '#160c06';
      ctx.fillRect(px + 6, sy, w - 12, 13);

      for (let b = 0; b < 6; b++) {
        // If looted, leave gaps where books were pulled out
        if (isLooted && (row + b) % 3 === 0) continue;
        ctx.fillStyle = tomeColors[(row * 3 + b) % tomeColors.length];
        ctx.fillRect(px + 7 + b * 5.6, sy + 2, 4.4, 11);
      }
      // Rolled parchment scroll on row 1
      if (!isLooted && row === 1) {
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(px + w - 16, sy + 4, 8, 4);
      }
    }

    if (!isLooted) {
      // Unlooted: Golden candle burning brightly on top ledge
      const cX = px + w - 11;
      const cY = py + 12;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cX - 2, cY - 7, 4, 7);
      const glow = ctx.createRadialGradient(cX, cY - 10, 1, cX, cY - 10, 16);
      glow.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
      glow.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cX, cY - 10, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(cX, cY - 9 + (animTick % 2), 2.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Looted: Candle extinguished + Scattered pages & fallen book at foot of shelf
      const cX = px + w - 11;
      const cY = py + 12;
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(cX - 2, cY - 4, 4, 4);

      // Scattered parchment pages at base
      ctx.fillStyle = '#d6c5ad';
      ctx.fillRect(px + 8, py + h - 9, 10, 6);
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(px + 22, py + h - 8, 12, 7);
      ctx.fillStyle = '#e7dcc8';
      ctx.fillRect(px + 24, py + h - 7, 8, 4);
    }

    ctx.restore();
    return;
  }

  if (tileType === 'VOID_RIFT') {
    // 3x3 Tile (144x144px) Spatial Tear on Floor 3 + Purple Lightning + Levitating Rocks + Thánh Tử 13 Cage & Elixir Pedestal
    const riftR = tileW * 1.35;

    // Spatial distortion aura
    const aura = ctx.createRadialGradient(cx, cy - 8, 6, cx, cy - 8, riftR * 1.25);
    aura.addColorStop(0, '#fdf4ff');
    aura.addColorStop(0.28, '#a855f7');
    aura.addColorStop(0.62, 'rgba(88, 28, 135, 0.65)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy - 8, riftR * 1.25, 0, Math.PI * 2);
    ctx.fill();

    // Jagged vertical-diagonal dimensional tear core
    ctx.fillStyle = '#05020a';
    ctx.strokeStyle = '#f0abfc';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy - riftR * 0.95);
    ctx.lineTo(cx + 22, cy - 18);
    ctx.lineTo(cx + 12, cy + 16);
    ctx.lineTo(cx, cy + riftR * 0.65);
    ctx.lineTo(cx - 18, cy + 10);
    ctx.lineTo(cx - 14, cy - 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crackling purple lightning arcs radiating from the tear
    ctx.strokeStyle = animTick % 2 === 0 ? '#e879f9' : '#c084fc';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI) / 3 + (animTick % 4) * 0.18;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 14, cy - 8 + Math.sin(ang) * 14);
      ctx.lineTo(
        cx + Math.cos(ang + 0.2) * (riftR * 0.55),
        cy - 8 + Math.sin(ang - 0.15) * (riftR * 0.55)
      );
      ctx.lineTo(cx + Math.cos(ang) * (riftR * 0.95), cy - 8 + Math.sin(ang) * (riftR * 0.95));
      ctx.stroke();
    }

    // Levitating stone shards orbiting according to animTick
    const floatOffset = Math.sin(animTick * 0.8) * 5;
    ctx.fillStyle = '#3b2859';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.4;
    for (const [ox, oy, sz] of [
      [-46, -28, 9],
      [48, -22, 8],
      [-38, 22, 7],
      [44, 24, 9],
    ]) {
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy + floatOffset, sz, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Left Side of Rift: Half-open Iron Cage & Thánh Tử Thứ 13 (child_13)
    const cageX = cx - tileW * 0.95;
    const cageY = cy - tileH * 0.35;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(cageX, cageY, 34, 42);
    drawPixelSprite(ctx, 'child_13', cageX - 4, cageY - 18, 42, 62);

    // Right Side of Rift: Mossy Stone Pedestal holding the unique Elixir of Ancients
    const pedX = cx + tileW * 0.65;
    const pedY = cy + 2;
    ctx.fillStyle = '#334155';
    ctx.fillRect(pedX - 12, pedY, 24, 22);
    ctx.strokeStyle = '#0f172a';
    ctx.strokeRect(pedX - 12, pedY, 24, 22);
    if (!isLooted) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(pedX, pedY - 6 + floatOffset * 0.3, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a7f3d0';
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  ctx.restore();
}

/**
 * Draws Canonical Lore Set-Dressing Props around NPCs & Boss Vaelis so no NPC stands on bare floor
 */
export function drawNpcSetDressing(
  ctx: CanvasRenderingContext2D,
  npcTypeOrBoss: string,
  tileX: number,
  tileY: number,
  tileW: number,
  tileH: number,
  animTick: number
) {
  ctx.save();
  const cx = (tileX + 0.5) * tileW;
  const cy = (tileY + 0.5) * tileH;

  if (npcTypeOrBoss === 'NPC_SMITH') {
    // Floor 1 Blood Forge: Boiling red iron cauldron/brazier on left, weapon rack on right, blood-soaked anvil
    // Red fire brazier / cauldron
    const bx = cx - tileW * 0.95;
    const by = cy + 4;
    const fireGlow = ctx.createRadialGradient(bx, by, 2, bx, by, 32);
    fireGlow.addColorStop(0, 'rgba(251, 146, 60, 0.85)');
    fireGlow.addColorStop(0.5, 'rgba(220, 38, 38, 0.38)');
    fireGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fireGlow;
    ctx.beginPath();
    ctx.arc(bx, by, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(bx, by, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = animTick % 2 === 0 ? '#ef4444' : '#f97316';
    ctx.beginPath();
    ctx.arc(bx, by - 2, 9, 0, Math.PI * 2);
    ctx.fill();

    // Weapon Rack on right
    const rx = cx + tileW * 0.85;
    const ry = cy - 16;
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.strokeRect(rx - 14, ry, 28, 32);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    for (const ox of [-7, 0, 7]) {
      ctx.beginPath();
      ctx.moveTo(rx + ox, ry + 4);
      ctx.lineTo(rx + ox, ry + 28);
      ctx.stroke();
    }
  } else if (npcTypeOrBoss === 'NPC_GLASS_LADY') {
    // Floor 1 Antechamber: Ruined banquet table on left, extinguished candelabra on right, crystal cage rim at base
    ctx.fillStyle = '#3b2314';
    ctx.fillRect(cx - tileW * 1.15, cy + 2, 34, 18);
    ctx.strokeStyle = '#140b05';
    ctx.strokeRect(cx - tileW * 1.15, cy + 2, 34, 18);
    // White cloth remnant & skull on banquet table
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cx - tileW * 1.05, cy + 4, 14, 10);

    // Extinguished iron candelabra on right
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx + tileW * 0.85, cy + 16);
    ctx.lineTo(cx + tileW * 0.85, cy - 12);
    ctx.moveTo(cx + tileW * 0.85 - 8, cy - 8);
    ctx.lineTo(cx + tileW * 0.85 + 8, cy - 8);
    ctx.stroke();
  } else if (npcTypeOrBoss === 'demon_lord_vaelis') {
    // Floor 1 Throne Room: Bone & black-iron Throne dais behind Vaelis + heavy iron chains pinned into stone floor
    ctx.fillStyle = '#140c10';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 2.5;
    ctx.fillRect(cx - tileW * 1.35, cy - tileH * 1.4, tileW * 2.7, tileH * 2.2);
    ctx.strokeRect(cx - tileW * 1.35, cy - tileH * 1.4, tileW * 2.7, tileH * 2.2);

    // Heavy iron chains radiating to 4 floor anchors
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 3]);
    for (const [ax, ay] of [
      [-tileW * 1.5, -tileH * 1.2],
      [tileW * 1.5, -tileH * 1.2],
      [-tileW * 1.5, tileH * 1.1],
      [tileW * 1.5, tileH * 1.1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx + ax, cy + ay);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  } else if (npcTypeOrBoss === 'NPC_SMUGGLER') {
    // Floor 2 Exterior / Ruined Corner: Oilskin tarp spread on ground + colored vials + wooden crate + storm lantern
    ctx.fillStyle = '#362819';
    ctx.strokeStyle = '#1c130b';
    ctx.lineWidth = 1.8;
    ctx.fillRect(cx - 34, cy - 6, 68, 30);
    ctx.strokeRect(cx - 34, cy - 6, 68, 30);

    // Colored vials on tarp
    const vialCols = ['#ef4444', '#3b82f6', '#a855f7', '#eab308'];
    vialCols.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(cx - 20 + i * 9, cy + 12, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Storm lantern on right
    const lx = cx + 26;
    const ly = cy + 6;
    const lGlow = ctx.createRadialGradient(lx, ly, 1, lx, ly, 22);
    lGlow.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
    lGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lGlow;
    ctx.beginPath();
    ctx.arc(lx, ly, 22, 0, Math.PI * 2);
    ctx.fill();
  } else if (npcTypeOrBoss === 'NPC_PRISONER') {
    // Floor 2 Dungeon Cell: Half-open iron cell bars & broken chains on floor
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.5;
    for (let ox = -24; ox <= 24; ox += 12) {
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy - 36);
      ctx.lineTo(cx + ox, cy - 6);
      ctx.stroke();
    }
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.arc(cx - 16, cy + 14, 6, 0, Math.PI * 2);
    ctx.arc(cx + 18, cy + 12, 6, 0, Math.PI * 2);
    ctx.stroke();
  } else if (npcTypeOrBoss === 'NPC_PRIEST') {
    // Floor 2 Main Nave: Cracked Holy Mother statue behind Priest weeping black blood trail across floor
    const sx = cx;
    const sy = cy - tileH * 0.85;
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy - 14, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(sx - 12, sy - 4, 24, 26);
    ctx.strokeRect(sx - 12, sy - 4, 24, 26);

    // Black blood weeping from statue eyes onto floor
    ctx.strokeStyle = '#090508';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(sx - 4, sy - 14);
    ctx.lineTo(sx - 6, cy + 18);
    ctx.moveTo(sx + 4, sy - 14);
    ctx.lineTo(sx + 8, cy + 20);
    ctx.stroke();
  } else if (npcTypeOrBoss === 'NPC_BROKEN_KNIGHT') {
    // Floor 2 Wine Cellar / Supply Room: Smashed wooden wine casks & broken legion shield split in two
    ctx.fillStyle = '#5c3a1e';
    ctx.strokeStyle = '#1f1209';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx - 28, cy + 2, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Split legion shield on right
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(cx + 18, cy + 2);
    ctx.lineTo(cx + 32, cy + 6);
    ctx.lineTo(cx + 24, cy + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (npcTypeOrBoss === 'NPC_CHILD_12') {
    // Floor 2 Secret Sanctuary: White Wax Machine behind Child 12, golden drainage tubes & black blood pools
    ctx.fillStyle = '#e5dccb';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.fillRect(cx - 20, cy - tileH * 0.95, 40, 28);
    ctx.strokeRect(cx - 20, cy - tileH * 0.95, 40, 28);

    // Golden drainage tubes arching from machine into Child 12
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - tileH * 0.7);
    ctx.quadraticCurveTo(cx - 26, cy - 10, cx - 6, cy - 6);
    ctx.moveTo(cx + 14, cy - tileH * 0.7);
    ctx.quadraticCurveTo(cx + 26, cy - 10, cx + 6, cy - 6);
    ctx.stroke();

    // Black blood pool beneath feet
    ctx.fillStyle = 'rgba(15, 5, 12, 0.85)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 14, 24, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (npcTypeOrBoss === 'NPC_CHRONICLER') {
    // Floor 3 Rune Foyer: Ancient glowing runic stone steles & stacks of fossilized parchment tomes
    for (const ox of [-30, 30]) {
      ctx.fillStyle = '#2e1d4a';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.8;
      ctx.fillRect(cx + ox - 8, cy - 26, 16, 38);
      ctx.strokeRect(cx + ox - 8, cy - 26, 16, 38);
    }
  } else if (npcTypeOrBoss === 'NPC_PHYSICIAN') {
    // Floor 3 Star-Abyss Lab: Stone operating table on left & glass cabinet with green/purple chemical tubes on right
    // Stone operating slab
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.fillRect(cx - 44, cy - 4, 28, 18);
    ctx.strokeRect(cx - 44, cy - 4, 28, 18);

    // Chemical rack with glowing green & purple test tubes
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx + 20, cy - 22, 22, 32);
    ctx.strokeRect(cx + 20, cy - 22, 22, 32);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(cx + 24, cy - 16, 4, 10);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(cx + 32, cy - 16, 4, 10);
  }

  ctx.restore();
}



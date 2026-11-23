import { CONFIG, EnemyTemplate, LimbConfig, SkillDef, WeaponCategory } from './config';
import { MapEnemyInstance } from './mapGen';
import { CHARACTER_INTRO_STEPS, IntroChoiceOption } from './narrative';
import { SeededRNG } from './prng';

export interface PlayerLimbState {
  leftArm: boolean;
  rightArm: boolean;
  leftLeg: boolean;
  rightLeg: boolean;
  infected: Record<'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg', boolean>;
}

export interface PartyAlly {
  id: string;
  name: string;
  classId: string;
  spriteKey: string;
  isUndeadSummon?: boolean;
  hp: number;
  maxHp: number;
  mind: number;
  maxMind: number;
  hunger: number;
  weaponId: string;
  equippedShield: string | null;
  equippedHead: string | null;
  equippedBody: string | null;
  equippedAccessory: string | null;
  guarding: boolean;
  divineAegisTurns?: number;
  stunnedTurns?: number;
  waitingRoomId?: string;
  waitingX?: number;
  waitingY?: number;
  limbs: {
    leftArm: boolean;
    rightArm: boolean;
    leftLeg: boolean;
    rightLeg: boolean;
    infected: Record<'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg', boolean>;
  };
  statuses?: {
    bleeding: boolean;
    poisoned: boolean;
    parasite: boolean;
  };
}

export interface ArmorGearDef {
  id: string;
  name: string;
  slot: 'head' | 'body' | 'accessory';
  tier?: 1 | 2 | 3;
  weightClass?: 'light' | 'heavy';
  forbidNun?: boolean;
  requiresZeroCorruption?: boolean;
  defFlat?: number;
  maxHpBonus?: number;
  maxMindBonus?: number;
  physDef: number; // e.g. 0.08
  magDef: number;
  magAtk: number;
  agility: number;
  luck: number;
  hitBonus?: number;
  miasmaSanImmune?: boolean;
  sanPerTurn?: number;
  corPerCombat?: number;
  churchTalkBonus?: boolean;
  fireResist?: number;
  fireVulnMult?: number;
  coldMiasmaResist?: boolean;
  stealthVisionReduce?: boolean;
  bleedResistPct?: number;
  limbSeverResistPct?: number;
  blocksOneFatalStatus?: boolean;
  coinTossBoost?: boolean;
  desc: string;
}

export const GEAR_ITEMS: Record<string, ArmorGearDef> = {
  iron_penitent_helm: {
    id: 'iron_penitent_helm',
    name: 'Mũ Sắt Chuộc Tội',
    slot: 'head',
    tier: 2,
    weightClass: 'heavy',
    forbidNun: true,
    defFlat: 6,
    physDef: 0.08,
    magDef: 0.04,
    magAtk: 0,
    agility: -1,
    luck: 0,
    desc: 'Mũ sắt rỉ bảo vệ hộp sọ (+8% Kháng Vật Lý, +4% Kháng Phép).',
  },
  weeping_hood: {
    id: 'weeping_hood',
    name: 'Khăn Trùm Lệ Máu',
    slot: 'head',
    tier: 1,
    weightClass: 'light',
    defFlat: 2,
    physDef: 0.03,
    magDef: 0.10,
    magAtk: 15,
    agility: 2,
    luck: 2,
    desc: 'Khăn trùm của Tư tế (+10% Kháng Phép, +15 ST Phép).',
  },
  cathedral_chainmail: {
    id: 'cathedral_chainmail',
    name: 'Giáp Xích Đại Giáo Đường',
    slot: 'body',
    tier: 2,
    weightClass: 'heavy',
    forbidNun: true,
    defFlat: 15,
    physDef: 0.14,
    magDef: 0.06,
    magAtk: 0,
    agility: -1,
    luck: 0,
    desc: 'Giáp xích thép đen (+14% Kháng Vật Lý, +6% Kháng Phép).',
  },
  void_woven_robe: {
    id: 'void_woven_robe',
    name: 'Áo Choàng Sợi Hư Vô',
    slot: 'body',
    tier: 3,
    weightClass: 'light',
    defFlat: 5,
    physDef: 0.06,
    magDef: 0.16,
    magAtk: 28,
    agility: 3,
    luck: 4,
    desc: 'Áo choàng dệt từ bóng tối Tầng 3 (+16% Kháng Phép, +28 ST Phép, +3 Nhanh Nhẹn).',
  },
  bone_rosary_ring: {
    id: 'bone_rosary_ring',
    name: 'Tràng Hạt Xương Thánh Mẫu',
    slot: 'accessory',
    tier: 1,
    physDef: 0.03,
    magDef: 0.08,
    magAtk: 18,
    agility: 4,
    luck: 8,
    desc: 'Phụ kiện cổ vật (+8 May Mắn, +4 Nhanh Nhẹn, +18 ST Phép).',
  },

  // === 1. MŨ & PHỤ KIỆN ĐẦU (HEADWEAR — 6 MÓN) ===
  ashen_hood: {
    id: 'ashen_hood',
    name: 'Mũ Trùm Xám',
    slot: 'head',
    tier: 1,
    weightClass: 'light',
    defFlat: 2,
    maxMindBonus: 5,
    physDef: 0.03,
    magDef: 0.08,
    magAtk: 8,
    agility: 1,
    luck: 1,
    desc: 'Mũ vải lanh bạc màu bám đầy tro bụi và sáp nến (+2 Phòng Thủ, +5 Lý Trí tối đa, giảm tỉ lệ bị phát hiện từ xa).',
  },
  stalkers_cap: {
    id: 'stalkers_cap',
    name: 'Mũ Da Thợ Săn',
    slot: 'head',
    tier: 1,
    weightClass: 'light',
    defFlat: 4,
    physDef: 0.05,
    magDef: 0.04,
    magAtk: 0,
    agility: 2,
    luck: 3,
    hitBonus: 0.05,
    desc: 'Mũ da thú khâu tay che kín trán (+4 Phòng Thủ, +2 Nhanh Nhẹn, +5% Chính xác cho đòn đánh đầu tiên).',
  },
  mail_coif: {
    id: 'mail_coif',
    name: 'Trùm Cổ Xích',
    slot: 'head',
    tier: 1,
    weightClass: 'light',
    defFlat: 6,
    physDef: 0.08,
    magDef: 0.03,
    magAtk: 0,
    agility: -1,
    luck: 0,
    limbSeverResistPct: 0.25,
    desc: 'Lớp xích sắt đan khít bảo vệ cổ và gáy (+6 Phòng Thủ, -1 Nhanh Nhẹn, giảm 25% tỉ lệ bị chặt đứt Đầu).',
  },
  legion_helm: {
    id: 'legion_helm',
    name: 'Mũ Thép Kỵ Đoàn',
    slot: 'head',
    tier: 2,
    weightClass: 'heavy',
    forbidNun: true,
    defFlat: 10,
    physDef: 0.12,
    magDef: 0.04,
    magAtk: 0,
    agility: -2,
    luck: 0,
    limbSeverResistPct: 0.50,
    desc: 'Mũ sắt kín mặt của quân tiên phong Vaelis (+10 Phòng Thủ, -2 Nhanh Nhẹn, giảm 50% sát thương chí mạng vào Đầu; Nữ Tu Oan Khuất không thể đội).',
  },
  beak_mask: {
    id: 'beak_mask',
    name: 'Mặt Nạ Mỏ Chim',
    slot: 'head',
    tier: 2,
    weightClass: 'light',
    defFlat: 3,
    physDef: 0.04,
    magDef: 0.12,
    magAtk: 10,
    agility: 1,
    luck: 2,
    miasmaSanImmune: true,
    desc: 'Mặt nạ da nhồi thảo dược khô ở phần mỏ nhọn (+3 Phòng Thủ, miễn nhiễm tụt Lý Trí do Chướng Khí và giảm 60% tỉ lệ trúng Độc).',
  },
  black_wax_crown: {
    id: 'black_wax_crown',
    name: 'Vương Miện Sáp Đen',
    slot: 'head',
    tier: 3,
    weightClass: 'light',
    defFlat: 1,
    maxMindBonus: 15,
    physDef: 0.02,
    magDef: 0.18,
    magAtk: 26,
    agility: 0,
    luck: 4,
    sanPerTurn: 2,
    corPerCombat: 1,
    desc: 'Vòng sáp nến đen đông cứng cắm những mảnh xương ngón tay (+1 Phòng Thủ, +15 Lý Trí tối đa, hồi 2 Lý Trí mỗi lượt nhưng +1 Tha Hóa sau mỗi trận).',
  },

  // === 2. GIÁP THÂN (BODY ARMOR — 8 MÓN) ===
  goethe_cassock: {
    id: 'goethe_cassock',
    name: 'Áo Choàng Goethe',
    slot: 'body',
    tier: 1,
    weightClass: 'light',
    defFlat: 4,
    maxMindBonus: 10,
    physDef: 0.05,
    magDef: 0.14,
    magAtk: 18,
    agility: 1,
    luck: 2,
    churchTalkBonus: true,
    desc: 'Lễ phục vải thô của tu sĩ cấp thấp (+4 Phòng Thủ, +10 Lý Trí tối đa, tăng tỉ lệ thuyết phục quái vật thuộc Giáo hội ở Tầng 2).',
  },
  hardened_leather_cuirass: {
    id: 'hardened_leather_cuirass',
    name: 'Giáp Ngực Da Cứng',
    slot: 'body',
    tier: 1,
    weightClass: 'light',
    defFlat: 10,
    physDef: 0.11,
    magDef: 0.05,
    magAtk: 0,
    agility: 0,
    luck: 1,
    desc: 'Giáp da thuộc bồi nhiều lớp của lính đánh thuê thương đoàn (+10 Phòng Thủ, +11% Kháng Vật Lý, +5% Kháng Phép).',
  },
  boiled_cuirass: {
    id: 'boiled_cuirass',
    name: 'Áo Da Thuộc',
    slot: 'body',
    tier: 1,
    weightClass: 'light',
    defFlat: 9,
    physDef: 0.10,
    magDef: 0.06,
    magAtk: 0,
    agility: 0,
    luck: 1,
    fireResist: 0.75,
    desc: 'Áo giáp da bò ngâm dầu đun sôi (+9 Phòng Thủ, giữ nguyên tốc độ di chuyển và giảm 75% sát thương Lửa).',
  },
  star_pelt_coat: {
    id: 'star_pelt_coat',
    name: 'Áo Lông Vực Sao',
    slot: 'body',
    tier: 3,
    weightClass: 'light',
    defFlat: 11,
    physDef: 0.12,
    magDef: 0.14,
    magAtk: 12,
    agility: 1,
    luck: 2,
    coldMiasmaResist: true,
    fireVulnMult: 1.6,
    desc: 'Áo khoác khâu từ bộ lông dày của thú dị giới (+11 Phòng Thủ, kháng Lạnh và Chướng Khí ở Tầng 3, nhưng dễ bén Lửa x1.6).',
  },
  flayed_disguise: {
    id: 'flayed_disguise',
    name: 'Lớp Da Ngụy Trang',
    slot: 'body',
    tier: 2,
    weightClass: 'light',
    defFlat: 6,
    physDef: 0.07,
    magDef: 0.08,
    magAtk: 10,
    agility: 2,
    luck: 0,
    stealthVisionReduce: true,
    desc: 'Áo khoác khâu từ da của những kẻ tử đạo (+6 Phòng Thủ, đánh lừa tầm nhìn của Lính Canh Mù và xác sống, giảm một nửa tầm phát hiện).',
  },
  vanguard_hauberk: {
    id: 'vanguard_hauberk',
    name: 'Áo Xích Kỵ Binh',
    slot: 'body',
    tier: 2,
    weightClass: 'heavy',
    forbidNun: true,
    defFlat: 15,
    physDef: 0.16,
    magDef: 0.05,
    magAtk: 0,
    agility: -2,
    luck: 0,
    bleedResistPct: 0.50,
    desc: 'Giáp Hạng Nặng: Áo xích sắt dài tới đầu gối (+15 Phòng Thủ, -2 Nhanh Nhẹn, giảm 50% tỉ lệ bị Chảy Máu từ vũ khí sắc nhọn; Nữ Tu Oan Khuất không thể mặc).',
  },
  legion_brigandine: {
    id: 'legion_brigandine',
    name: 'Giáp Tấm Kỵ Đoàn',
    slot: 'body',
    tier: 2,
    weightClass: 'heavy',
    forbidNun: true,
    defFlat: 22,
    physDef: 0.22,
    magDef: 0.07,
    magAtk: 0,
    agility: -4,
    luck: 0,
    limbSeverResistPct: 0.45,
    desc: 'Giáp Hạng Nặng: Các tấm thép tán đinh bên dưới lớp da dày (+22 Phòng Thủ, -4 Nhanh Nhẹn, giảm mạnh tỉ lệ bị chặt đứt Tay và Chân; Nữ Tu Oan Khuất không thể mặc).',
  },
  platinum_cuirass: {
    id: 'platinum_cuirass',
    name: 'Giáp Bạch Kim',
    slot: 'body',
    tier: 3,
    weightClass: 'heavy',
    forbidNun: true,
    requiresZeroCorruption: true,
    defFlat: 28,
    physDef: 0.28,
    magDef: 0.16,
    magAtk: 15,
    agility: -3,
    luck: 3,
    desc: 'Giáp Hạng Nặng: Giáp hộ vệ của Giáo hội khắc kinh văn (+28 Phòng Thủ, -3 Nhanh Nhẹn, chỉ mặc được khi 0% Tha Hóa; nếu có Tha Hóa giáp sẽ tự nung nóng gây Bỏng!).',
  },

  // === 4. PHỤ KIỆN & BÙA CHÚ (ACCESSORIES — 4 MÓN) ===
  eclipse_pendant: {
    id: 'eclipse_pendant',
    name: 'Mặt Dây Nhật Thực',
    slot: 'accessory',
    tier: 2,
    physDef: 0.04,
    magDef: 0.06,
    magAtk: 10,
    agility: 4,
    luck: 4,
    desc: 'Huy chương bạc khắc hình mặt trời bị nuốt chửng (+4 Nhanh Nhẹn, giúp luôn giành quyền đi trước quái vật thường).',
  },
  vaelis_signet: {
    id: 'vaelis_signet',
    name: 'Nhẫn Kỵ Sĩ Vaelis',
    slot: 'accessory',
    tier: 3,
    maxHpBonus: 15,
    physDef: 0.05,
    magDef: 0.05,
    magAtk: 8,
    agility: 1,
    luck: 3,
    desc: 'Chiếc nhẫn sắt khắc lời thề tử thủ (+15 Sinh Lực tối đa, giảm sát thương nhận vào khi Sinh Lực dưới 30%).',
  },
  black_straw_effigy: {
    id: 'black_straw_effigy',
    name: 'Hình Nhân Rơm Đen',
    slot: 'accessory',
    tier: 1,
    physDef: 0.03,
    magDef: 0.12,
    magAtk: 14,
    agility: 0,
    luck: 6,
    blocksOneFatalStatus: true,
    desc: 'Bùa hộ mệnh bện bằng tóc và rơm thấm máu (Tự động chịu thay 1 lần hiệu ứng Ký Sinh Trùng hoặc Nhiễm Trùng chí mạng rồi bốc cháy).',
  },
  void_beast_claw: {
    id: 'void_beast_claw',
    name: 'Móng Vuốt Thú Dị Giới',
    slot: 'accessory',
    tier: 3,
    physDef: 0.04,
    magDef: 0.06,
    magAtk: 12,
    agility: 3,
    luck: 10,
    coinTossBoost: true,
    desc: 'Bùa may mắn làm từ móng vuốt hóa thạch (Tăng nhẹ tỉ lệ tung được mặt Ngửa khi mở rương hoặc né bẫy).',
  },
};

export function getChestMaxTier(room: { isExterior?: boolean; floor: 1 | 2 | 3 }): 1 | 2 | 3 {
  if (room.isExterior) return 1;
  if (room.floor === 3) return 3;
  return 2;
}

export function getEligibleChestWeaponIds(
  room: { isExterior?: boolean; floor: 1 | 2 | 3 },
  unlockedWeapons: string[]
): string[] {
  const maxTier = getChestMaxTier(room);
  return Object.keys(CONFIG.WEAPONS).filter((w) => {
    const def = CONFIG.WEAPONS[w];
    return (
      w !== 'bite_headbutt' &&
      !def.bossOnly &&
      !def.isCursed &&
      (def.tier || 1) <= maxTier &&
      !unlockedWeapons.includes(w)
    );
  });
}

export function getEligibleChestGearIds(
  room: { isExterior?: boolean; floor: 1 | 2 | 3 },
  unlockedGear: string[]
): string[] {
  const maxTier = getChestMaxTier(room);
  return Object.keys(GEAR_ITEMS).filter((g) => {
    const def = GEAR_ITEMS[g];
    return (def.tier || 1) <= maxTier && !unlockedGear.includes(g);
  });
}

export function getEligibleNormalCorpseWeaponIds(unlockedWeapons: string[]): string[] {
  return Object.keys(CONFIG.WEAPONS).filter((w) => {
    const def = CONFIG.WEAPONS[w];
    return (
      w !== 'bite_headbutt' &&
      !def.bossOnly &&
      !def.isCursed &&
      (def.tier || 1) <= 2 &&
      !unlockedWeapons.includes(w)
    );
  });
}

export function canPlayerEquipGear(
  p: PlayerState,
  gearId: string
): { allowed: boolean; reason?: string } {
  const gear = GEAR_ITEMS[gearId];
  if (!gear) return { allowed: false, reason: 'Không tìm thấy trang bị.' };
  if (p.classId === 'forsaken_nun' && (gear.forbidNun || gear.weightClass === 'heavy')) {
    return {
      allowed: false,
      reason: 'Nữ Tu Oan Khuất chỉ có thể mặc Giáp Nhẹ và Lễ Phục (không thể mặc Giáp Nặng / Mũ Thép Kỵ Đoàn).',
    };
  }
  if (gear.requiresZeroCorruption && p.corruption > 0) {
    return {
      allowed: false,
      reason: `[${gear.name}] đòi hỏi sự thuần khiết tuyệt đối (0% Tha Hóa). Chỉ số Tha Hóa hiện tại (${p.corruption}%) khiến giáp tự nung đỏ bỏng rát!`,
    };
  }
  return { allowed: true };
}

export function canPlayerEquipShield(
  p: PlayerState,
  shieldId?: string | null
): { allowed: boolean; reason?: string } {
  if (!p.limbs.leftArm || !p.limbs.rightArm) {
    return {
      allowed: false,
      reason: 'Bạn đã mất 1 cánh tay nên không thể vừa cầm vũ khí vừa đỡ Khiên!',
    };
  }
  const wpn = CONFIG.WEAPONS[p.equippedWeapon];
  if (wpn && wpn.hands === 2) {
    return {
      allowed: false,
      reason: `Vũ khí 2 tay [${wpn.name}] cần cả hai bàn tay để vung, không thể đeo thêm Khiên!`,
    };
  }
  if (shieldId) {
    const sh = CONFIG.SHIELDS[shieldId];
    if (sh?.requiresZeroCorruption && p.corruption > 0) {
      return {
        allowed: false,
        reason: `[${sh.name}] chỉ chấp nhận người có 0% Tha Hóa!`,
      };
    }
  }
  return { allowed: true };
}

export interface PlayerState {
  classId: string;
  name: string;
  title: string;
  hp: number;
  maxHp: number;
  mind: number;
  maxMind: number;
  headHp: number;
  maxHeadHp: number;
  hunger: number; // 0 to 100
  corruption: number;
  corruptionWarningLogged?: boolean;
  holyMagicLocked: boolean;
  holyMotherBanned: boolean;
  silverCoins: number;
  energyStones: number;
  naturalArmor: number;
  mindPerRoom: number;
  evasionBonus: number;
  baseFleeChance: number;
  agilityBonus?: number;
  magicResistBonus?: number;
  bleedStunResist?: boolean;
  panicImmune?: boolean;
  equippedWeapon: string;
  equippedShield: string | null;
  equippedHead: string | null;
  equippedBody: string | null;
  equippedAccessory: string | null;
  unlockedWeapons: string[];
  unlockedShields: string[];
  unlockedGear: string[];
  bloodForgedWeapons: string[];
  cursedLockedWeapon: string | null;
  silverOilTurns: number;
  poisonCoatTurns?: number;
  fireCoatTurns?: number;
  stealthStepsTurns?: number;
  torchTimer?: number;
  torchMaxTimer?: number;
  stimulantBonusPct: number;
  affinities: {
    holyMother: number;
    primordialVoid: number;
    demonicPact: number;
  };
  hexenStatNodes: string[];
  completedAffinityActions: string[];
  usedAltarKeys: string[];
  inventory: Record<string, number>;
  skillLevels: Record<string, number>;
  unlockedRecipes: string[];
  readBookIds: string[]; // Only books actually looted from bookshelves!
  party: PartyAlly[];
  dismissedCompanions?: PartyAlly[];
  npcLifecycle?: Record<string, 'map' | 'recruited' | 'dead'>;
  npcFlags: {
    priestHelped: boolean;
    smugglerClosed: boolean;
    prisonerRecruited: boolean;
    smugglerCoinsBought?: number;
  };
  questFlags: {
    vaelisTalked: boolean;
    vaelisDefeated: boolean;
    curedPetrification: boolean;
    child13Rescued: boolean;
    child12Resolved: boolean;
    child12Raised?: boolean;
    brokenKnightResolved: boolean;
    glassLadyResolved: boolean;
    smithUsed: boolean;
    physicianTalked: boolean;
    chroniclerTalked: boolean;
  };
  limbs: PlayerLimbState;
  statuses: {
    bleeding: boolean;
    poisoned: boolean;
    parasite: boolean;
    blindedTurns: number;
    hallucinating: boolean;
    guarding: boolean;
    divineAegisTurns: number;
    divineAegisLevel: number;
    bloodPactLevel: number;
    statusImmunityTurns: number;
    bleedImmunityTurns?: number;
    blessedArmorTurns?: number;
    veilEvasionTurns?: number;
    enGardeTurns?: number;
    enGardeLevel?: number;
  };
  stats: {
    stepsTaken: number;
    enemiesSlain: number;
    miniBossesSlain: number;
    limbsSevered: number;
  };
}

export function createInitialPlayer(classId: string, customName?: string): PlayerState {
  const cls = CONFIG.CLASSES.find((c) => c.id === classId) || CONFIG.CLASSES[0];
  const inv: Record<string, number> = {
    ...cls.startingItems,
    torch: Math.max(2, cls.startingItems.torch || 0),
    moldy_bread: 1,
    silver_coin: 18,
    energy_stone: 1,
  };
  const classHp =
    cls.id === 'fallen_knight'
      ? 135
      : cls.id === 'forsaken_nun'
      ? 90
      : cls.id === 'night_hunter'
      ? 105
      : CONFIG.BASE_PLAYER_HP;
  const classMind =
    cls.id === 'fallen_knight'
      ? 85
      : cls.id === 'forsaken_nun'
      ? 135
      : cls.id === 'night_hunter'
      ? 105
      : CONFIG.BASE_PLAYER_MIND;
  const trimmedName = customName?.trim();
  const startHead =
    cls.id === 'fallen_knight'
      ? 'legion_helm'
      : cls.id === 'forsaken_nun'
      ? 'ashen_hood'
      : 'stalkers_cap';
  const startBody =
    cls.id === 'fallen_knight'
      ? 'vanguard_hauberk'
      : cls.id === 'forsaken_nun'
      ? 'goethe_cassock'
      : 'boiled_cuirass';
  const startAcc =
    cls.id === 'fallen_knight'
      ? 'vaelis_signet'
      : cls.id === 'forsaken_nun'
      ? 'bone_rosary_ring'
      : 'eclipse_pendant';

  return {
    classId: cls.id,
    name: trimmedName && trimmedName.length > 0 ? trimmedName : cls.name,
    title: cls.title,
    hp: classHp,
    maxHp: classHp,
    mind: classMind,
    maxMind: classMind,
    headHp: cls.headHp,
    maxHeadHp: cls.headHp,
    hunger: 10,
    corruption: 0,
    corruptionWarningLogged: false,
    holyMagicLocked: false,
    holyMotherBanned: false,
    silverCoins: 18,
    energyStones: 1,
    naturalArmor: cls.naturalArmor,
    mindPerRoom: cls.mindPerRoom,
    evasionBonus: cls.evasionBonus,
    baseFleeChance: cls.baseFleeChance,
    equippedWeapon: cls.startingWeapon,
    equippedShield: cls.startingShield,
    equippedHead: startHead,
    equippedBody: startBody,
    equippedAccessory: startAcc,
    unlockedWeapons: ['rusty_knife', cls.startingWeapon],
    unlockedShields: cls.startingShield
      ? [cls.startingShield, 'rotting_targe', 'rimmed_shield']
      : ['rotten_wood_shield', 'rotting_targe'],
    unlockedGear: [
      'iron_penitent_helm',
      'weeping_hood',
      'cathedral_chainmail',
      'void_woven_robe',
      'bone_rosary_ring',
      startHead,
      startBody,
      startAcc,
    ],
    bloodForgedWeapons: [],
    cursedLockedWeapon: null,
    silverOilTurns: 0,
    poisonCoatTurns: 0,
    fireCoatTurns: 0,
    stealthStepsTurns: 0,
    torchTimer: 120,
    torchMaxTimer: 120,
    stimulantBonusPct: 0,
    affinities: {
      holyMother: 0,
      primordialVoid: 0,
      demonicPact: 0,
    },
    hexenStatNodes: [],
    completedAffinityActions: [],
    usedAltarKeys: [],
    inventory: inv,
    skillLevels: {
      [cls.startingSkill]: 1,
    },
    unlockedRecipes: [],
    readBookIds: [], // Start with 0 books read until looted from bookshelves!
    party: [],
    dismissedCompanions: [],
    npcLifecycle: {},
    npcFlags: {
      priestHelped: false,
      smugglerClosed: false,
      prisonerRecruited: false,
    },
    questFlags: {
      vaelisTalked: false,
      vaelisDefeated: false,
      curedPetrification: false,
      child13Rescued: false,
      child12Resolved: false,
      brokenKnightResolved: false,
      glassLadyResolved: false,
      smithUsed: false,
      physicianTalked: false,
      chroniclerTalked: false,
    },
    limbs: {
      leftArm: true,
      rightArm: true,
      leftLeg: true,
      rightLeg: true,
      infected: {
        leftArm: false,
        rightArm: false,
        leftLeg: false,
        rightLeg: false,
      },
    },
    statuses: {
      bleeding: false,
      poisoned: false,
      parasite: false,
      blindedTurns: 0,
      hallucinating: false,
      guarding: false,
      divineAegisTurns: 0,
      divineAegisLevel: 0,
      bloodPactLevel: 0,
      statusImmunityTurns: 0,
      bleedImmunityTurns: 0,
    },
    stats: {
      stepsTaken: 0,
      enemiesSlain: 0,
      miniBossesSlain: 0,
      limbsSevered: 0,
    },
  };
}

export function createRecruitedAlly(
  allyKey: 'fallen_knight' | 'forsaken_nun' | 'night_hunter' | 'ally_kael' | 'broken_knight' | 'child_13'
): PartyAlly {
  const defaultLimbs = (leftArm = true) => ({
    leftArm,
    rightArm: true,
    leftLeg: true,
    rightLeg: true,
    infected: { leftArm: false, rightArm: false, leftLeg: false, rightLeg: false },
  });

  if (allyKey === 'fallen_knight') {
    return {
      id: 'fallen_knight',
      name: 'Kẻ Gác Mộ Vô Danh Garrick',
      classId: 'fallen_knight',
      spriteKey: 'fallen_knight',
      hp: 135,
      maxHp: 135,
      mind: 85,
      maxMind: 85,
      hunger: 15,
      weaponId: 'broad_iron_sword',
      equippedShield: 'cathedral_iron_shield',
      equippedHead: 'legion_helm',
      equippedBody: 'vanguard_hauberk',
      equippedAccessory: 'vaelis_signet',
      guarding: false,
      limbs: defaultLimbs(true),
      statuses: { bleeding: false, poisoned: false, parasite: false },
    };
  }
  if (allyKey === 'forsaken_nun') {
    return {
      id: 'forsaken_nun',
      name: 'Nữ Tu Oan Khuất Agnes',
      classId: 'forsaken_nun',
      spriteKey: 'forsaken_nun',
      hp: 95,
      maxHp: 95,
      mind: 135,
      maxMind: 135,
      hunger: 10,
      weaponId: 'holy_mother_mace',
      equippedShield: null,
      equippedHead: 'ashen_hood',
      equippedBody: 'goethe_cassock',
      equippedAccessory: 'bone_rosary_ring',
      guarding: false,
      limbs: defaultLimbs(true),
      statuses: { bleeding: false, poisoned: false, parasite: false },
    };
  }
  if (allyKey === 'night_hunter') {
    return {
      id: 'night_hunter',
      name: 'Gã Săn Di Vật Crow',
      classId: 'night_hunter',
      spriteKey: 'night_hunter',
      hp: 110,
      maxHp: 110,
      mind: 105,
      maxMind: 105,
      hunger: 15,
      weaponId: 'curved_dagger',
      equippedShield: 'rotten_wood_shield',
      equippedHead: 'stalkers_cap',
      equippedBody: 'boiled_cuirass',
      equippedAccessory: 'eclipse_pendant',
      guarding: false,
      limbs: defaultLimbs(true),
      statuses: { bleeding: false, poisoned: false, parasite: false },
    };
  }
  if (allyKey === 'broken_knight') {
    return {
      id: 'broken_knight',
      name: 'Kỵ Sĩ Gãy Kiếm Roland',
      classId: 'broken_knight',
      spriteKey: 'broken_knight',
      hp: 125,
      maxHp: 125,
      mind: 80,
      maxMind: 80,
      hunger: 20,
      weaponId: 'broad_iron_sword',
      equippedShield: null,
      equippedHead: 'iron_penitent_helm',
      equippedBody: 'cathedral_chainmail',
      equippedAccessory: null,
      guarding: false,
      limbs: defaultLimbs(false), // Đã cụt tay trái
      statuses: { bleeding: false, poisoned: false, parasite: false },
    };
  }
  if (allyKey === 'child_13') {
    return {
      id: 'child_13',
      name: 'Thánh Tử Thứ 13',
      classId: 'child_13',
      spriteKey: 'child_13',
      hp: 90,
      maxHp: 90,
      mind: 120,
      maxMind: 120,
      hunger: 10,
      weaponId: 'holy_mother_mace',
      equippedShield: null,
      equippedHead: 'weeping_hood',
      equippedBody: 'void_woven_robe',
      equippedAccessory: 'bone_rosary_ring',
      guarding: false,
      limbs: defaultLimbs(true),
      statuses: { bleeding: false, poisoned: false, parasite: false },
    };
  }
  // Default: ally_kael (Tù Nhân Kael)
  return {
    id: 'ally_kael',
    name: 'Tù Nhân Kael',
    classId: 'ally_kael',
    spriteKey: 'ally_kael',
    hp: 105,
    maxHp: 105,
    mind: 85,
    maxMind: 85,
    hunger: 25,
    weaponId: 'broad_iron_sword',
    equippedShield: null,
    equippedHead: null,
    equippedBody: 'boiled_cuirass',
    equippedAccessory: null,
    guarding: false,
    limbs: defaultLimbs(true),
    statuses: { bleeding: false, poisoned: false, parasite: false },
  };
}

export function createNecromancySummon(enemy: MapEnemyInstance, necromancyLv = 1): PartyAlly {
  const tplId = enemy.templateId;
  let spriteKey = 'summon_ghoul';
  let name = 'Xác Sống Triệu Hồi';
  let weaponId = 'butcher_cleaver';
  let equippedShield: string | null = 'rotten_wood_shield';
  let equippedHead: string | null = 'ashen_hood';
  let equippedBody: string | null = 'boiled_cuirass';
  const equippedAccessory: string | null = null;
  let hp = 95;
  let mind = 60;

  if (
    tplId === 'penitent_knight' ||
    tplId === 'dullahan_knight' ||
    tplId === 'executioner_paladin' ||
    tplId === 'hollowed_void_walker'
  ) {
    spriteKey = 'summon_skeleton';
    name = 'Xương Đen Triệu Hồi';
    weaponId = 'broad_iron_sword';
    equippedShield = 'cathedral_iron_shield';
    equippedHead = 'iron_penitent_helm';
    equippedBody = 'cathedral_chainmail';
    hp = 115;
    mind = 75;
  } else if (
    tplId === 'rotting_priest' ||
    tplId === 'weeping_inquisitor' ||
    tplId === 'grand_abbess' ||
    tplId === 'countess_carmilla'
  ) {
    spriteKey = 'summon_wraith';
    name = 'Oán Linh Hư Vô';
    weaponId = '';
    equippedShield = null;
    equippedHead = null;
    equippedBody = null;
    hp = 165;
    mind = 105;
  }

  const maxHp =
    spriteKey === 'summon_wraith'
      ? Math.min(190, Math.round(hp * (necromancyLv >= 3 ? 1.15 : necromancyLv === 2 ? 1.08 : 1.0)))
      : Math.round(hp * (necromancyLv >= 3 ? 1.4 : necromancyLv === 2 ? 1.2 : 1.0));

  return {
    id: `undead_${enemy.uid}_${Date.now()}`,
    name,
    classId: spriteKey,
    spriteKey,
    isUndeadSummon: true,
    hp: maxHp,
    maxHp,
    mind,
    maxMind: mind,
    hunger: 0,
    weaponId,
    equippedShield,
    equippedHead,
    equippedBody,
    equippedAccessory,
    guarding: spriteKey === 'summon_wraith',
    divineAegisTurns: spriteKey === 'summon_wraith' ? 1 : 0,
    limbs: {
      leftArm: true,
      rightArm: true,
      leftLeg: true,
      rightLeg: true,
      infected: { leftArm: false, rightArm: false, leftLeg: false, rightLeg: false },
    },
    statuses: { bleeding: false, poisoned: false, parasite: false },
  };
}

export function castNecromancyOnCorpse(
  player: PlayerState,
  enemy: MapEnemyInstance
): { success: boolean; message: string; ally?: PartyAlly } {
  const necLv = player.skillLevels?.necromancy || 0;
  if (necLv <= 0) {
    return { success: false, message: 'Bạn chưa lĩnh hội Chiêu Hồn Thuật!' };
  }
  if (!enemy.defeated || enemy.corpseDevoured || enemy.corpseRaised) {
    return { success: false, message: 'Không thể dựng dậy cái xác này!' };
  }
  if (player.party.length >= 3) {
    return { success: false, message: 'Tổ đội đã đủ tối đa 4 người!' };
  }
  if (player.mind < 15) {
    return { success: false, message: 'Cần ít nhất 15 Lý Trí để thi triển Chiêu Hồn Thuật!' };
  }
  enemy.corpseRaised = true;
  player.mind = Math.max(0, player.mind - 15);
  player.corruption = Math.min(100, player.corruption + 12);
  banHolyMother(player);
  const summon = createNecromancySummon(enemy, necLv);
  player.party.push(summon);
  return {
    success: true,
    ally: summon,
    message: `Niệm xong chú ngữ [Chiêu Hồn Thuật], làn khói tử khí trỗi dậy dựng xác chết thành [${summon.name}] bước vào hàng ngũ.`,
  };
}

export function castNecromancyOnChild12(
  player: PlayerState
): { success: boolean; message: string; ally?: PartyAlly } {
  const necLv = player.skillLevels?.necromancy || 0;
  if (necLv <= 0) {
    return { success: false, message: 'Bạn chưa lĩnh hội Chiêu Hồn Thuật!' };
  }
  if (!player.questFlags?.child12Resolved) {
    return { success: false, message: 'Đứa trẻ vẫn còn bị giam trong ống chiết xuất!' };
  }
  if (player.questFlags?.child12Raised) {
    return { success: false, message: 'Linh hồn Thánh Tử Thứ 12 đã được triệu hồi rồi!' };
  }
  if (player.party.length >= 3) {
    return { success: false, message: 'Tổ đội đã đủ tối đa 4 người!' };
  }
  if (player.mind < 15) {
    return { success: false, message: 'Cần ít nhất 15 Lý Trí để thi triển Chiêu Hồn Thuật!' };
  }
  player.questFlags.child12Raised = true;
  player.mind = Math.max(0, player.mind - 15);
  player.corruption = Math.min(100, player.corruption + 12);
  banHolyMother(player);
  const hpMult = necLv >= 3 ? 1.175 : necLv === 2 ? 1.095 : 1.0;
  const maxHp = Math.min(190, Math.round(160 * hpMult));
  const summon: PartyAlly = {
    id: `undead_child_12_${Date.now()}`,
    name: 'Vong Linh Thánh Tử 12',
    classId: 'summon_child_12',
    spriteKey: 'summon_child_12',
    isUndeadSummon: true,
    hp: maxHp,
    maxHp,
    mind: 95,
    maxMind: 95,
    hunger: 0,
    weaponId: 'holy_mother_mace',
    equippedShield: null,
    equippedHead: null,
    equippedBody: 'goethe_cassock',
    equippedAccessory: null,
    guarding: true,
    divineAegisTurns: 1,
    limbs: {
      leftArm: true,
      rightArm: true,
      leftLeg: true,
      rightLeg: true,
      infected: { leftArm: false, rightArm: false, leftLeg: false, rightLeg: false },
    },
    statuses: { bleeding: false, poisoned: false, parasite: false },
  };
  player.party.push(summon);
  return {
    success: true,
    ally: summon,
    message: `Tiếng tụng niệm [Chiêu Hồn Thuật] vang vọng giữa hầm lạnh: Linh hồn đứa trẻ hóa thành [Vong Linh Thánh Tử 12] đứng lên che chở cho đội hình.`,
  };
}

export function isPlayerPanicking(p: PlayerState): boolean {
  return p.mind < 30 && !p.panicImmune;
}

export function canUnequipWeapon(p: PlayerState): { allowed: boolean; reason?: string } {
  if (p.cursedLockedWeapon && p.equippedWeapon === p.cursedLockedWeapon) {
    return {
      allowed: false,
      reason: 'Vũ khí Bị Nguyền đã mọc rễ găm chặt vào gân cốt tay! Hãy Trục Xuất tại Đài Cộng Hưởng (nhánh Thánh Mẫu) hoặc tự cưa bỏ tay.',
    };
  }
  return { allowed: true };
}

export function applyIntroChoiceToPlayer(p: PlayerState, opt: IntroChoiceOption): void {
  p.inventory = p.inventory || {};
  p.unlockedWeapons = p.unlockedWeapons || [];
  p.unlockedShields = p.unlockedShields || [];
  p.unlockedGear = p.unlockedGear || [];
  p.skillLevels = p.skillLevels || {};
  p.unlockedRecipes = p.unlockedRecipes || [];
  p.readBookIds = p.readBookIds || [];
  p.affinities = p.affinities || { holyMother: 0, primordialVoid: 0, demonicPact: 0 };

  if (opt.items) {
    for (const [k, qty] of Object.entries(opt.items)) {
      p.inventory[k] = (p.inventory[k] || 0) + qty;
    }
  }
  if (opt.weapons) {
    for (const w of opt.weapons) {
      if (!p.unlockedWeapons.includes(w)) p.unlockedWeapons.push(w);
    }
  }
  if (opt.equipWeapon) {
    if (!p.unlockedWeapons.includes(opt.equipWeapon)) p.unlockedWeapons.push(opt.equipWeapon);
    p.equippedWeapon = opt.equipWeapon;
    if (opt.cursedWeapon) {
      p.cursedLockedWeapon = opt.equipWeapon;
    }
  }
  if (opt.shields) {
    for (const s of opt.shields) {
      if (!p.unlockedShields.includes(s)) p.unlockedShields.push(s);
    }
  }
  if (opt.equipShield) {
    if (!p.unlockedShields.includes(opt.equipShield)) p.unlockedShields.push(opt.equipShield);
    p.equippedShield = opt.equipShield;
  }
  if (opt.gear) {
    for (const g of opt.gear) {
      if (!p.unlockedGear.includes(g)) p.unlockedGear.push(g);
    }
  }
  if (opt.equipGear) {
    if (!p.unlockedGear.includes(opt.equipGear)) p.unlockedGear.push(opt.equipGear);
    const gearDef = GEAR_ITEMS[opt.equipGear];
    if (gearDef && canPlayerEquipGear(p, opt.equipGear).allowed) {
      if (gearDef.slot === 'head') p.equippedHead = opt.equipGear;
      else if (gearDef.slot === 'body') p.equippedBody = opt.equipGear;
      else if (gearDef.slot === 'accessory') p.equippedAccessory = opt.equipGear;
    }
  }
  if (opt.skills) {
    for (const sk of opt.skills) {
      p.skillLevels[sk] = Math.min(3, (p.skillLevels[sk] || 0) + 1);
      const skDef = CONFIG.SKILLS.find((s) => s.id === sk);
      if (skDef?.branch === 'Huyết Quỷ') banHolyMother(p);
    }
  }
  if (opt.recipes) {
    for (const r of opt.recipes) {
      if (!p.unlockedRecipes.includes(r)) p.unlockedRecipes.push(r);
    }
  }
  if (opt.books) {
    for (const b of opt.books) {
      if (!p.readBookIds.includes(b)) p.readBookIds.push(b);
    }
  }
  if (opt.silverDelta) {
    p.silverCoins = Math.max(0, p.silverCoins + opt.silverDelta);
    p.inventory.silver_coin = p.silverCoins;
  }
  if (opt.energyStonesDelta) {
    p.energyStones = Math.max(0, p.energyStones + opt.energyStonesDelta);
    p.inventory.energy_stone = p.energyStones;
  }
  if (opt.maxMindDelta) {
    p.maxMind += opt.maxMindDelta;
    p.mind += opt.maxMindDelta;
  }
  if (opt.mindSet !== undefined) {
    p.mind = Math.min(p.maxMind, opt.mindSet);
  }
  if (opt.corruptionDelta) {
    p.corruption = Math.min(100, p.corruption + opt.corruptionDelta);
  }
  if (opt.agilityBonus) {
    p.agilityBonus = (p.agilityBonus || 0) + opt.agilityBonus;
    p.evasionBonus = Math.min(0.45, p.evasionBonus + opt.agilityBonus * 0.02);
  }
  if (opt.magicResistBonus) p.magicResistBonus = (p.magicResistBonus || 0) + opt.magicResistBonus;
  if (opt.bleedStunResist) p.bleedStunResist = true;
  if (opt.panicImmune) p.panicImmune = true;
  if (opt.holyMagicLocked) {
    banHolyMother(p);
  }
  if (opt.affinityDelta) {
    if (opt.affinityDelta.holyMother) {
      applyAffinityChange(p, 'holyMother', opt.affinityDelta.holyMother);
    }
    if (opt.affinityDelta.primordialVoid) {
      applyAffinityChange(p, 'primordialVoid', opt.affinityDelta.primordialVoid);
    }
    if (opt.affinityDelta.demonicPact) {
      applyAffinityChange(p, 'demonicPact', opt.affinityDelta.demonicPact, {
        skipDemonicCorruption: Boolean(opt.corruptionDelta),
      });
    }
  }
  syncCorruptionHolyBan(p);
}

export function applyDefaultIntroLoadoutForRemainingSteps(
  p: PlayerState,
  fromStepIdx = 0
): { appliedLabels: string[]; summary: string } {
  const clsKey =
    p.classId === 'forsaken_nun' || p.classId === 'night_hunter' ? p.classId : 'fallen_knight';
  const steps = CHARACTER_INTRO_STEPS[clsKey] || CHARACTER_INTRO_STEPS.fallen_knight;

  // Safe, canon, non-corrupting (COR = 0) default option index for each step (0, 1, 2) per character
  const defaultOptionIndicesByClass: Record<'fallen_knight' | 'forsaken_nun' | 'night_hunter', [number, number, number]> = {
    fallen_knight: [0, 1, 1], // [Trường Kiếm Thép Tốt + Chém Phủ Đầu], [Khiên Gỗ Bọc Sắt + Thế Thủ Kỵ Đoàn], [+2 Thuốc Hồi Huyết + 2 Băng Gạc]
    forsaken_nun: [1, 0, 1], // [Thảo Dược Chí Viễn Chinh + 2 Cỏ Huyết Dụ + 2 Vải Băng], [Chìa Khóa Hầm Nhỏ + Đèn Dầu], [Dao Găm Rỉ + Cuộn Giải Phẫu + Thảo Dược Xanh]
    night_hunter: [0, 2, 2], // [Dao Găm Cong + Cuộn Lướt Bóng + Trói Gân], [Cuộn Giải Phẫu + 2 Thuốc Giải Độc + 2 Rượu Mạnh + 1 Thuốc Hồi Huyết], [3 Đuốc + 2 Lọ Đỏ + Cuộn Đánh Lạc Hướng]
  };

  const optionIndices = defaultOptionIndicesByClass[clsKey];
  const appliedLabels: string[] = [];

  for (let i = Math.max(0, fromStepIdx); i < steps.length; i++) {
    const step = steps[i];
    const optIdx = optionIndices[i] ?? 0;
    const chosenOpt = step.options[optIdx] || step.options[0];
    if (chosenOpt) {
      applyIntroChoiceToPlayer(p, chosenOpt);
      appliedLabels.push(chosenOpt.effectText);
    }
  }

  // Ensure every character skipping into the Exterior has essential survival rations, healing & a Brown Vial to breach cracked walls
  const extraClassPack: Record<'fallen_knight' | 'forsaken_nun' | 'night_hunter', Record<string, number>> = {
    fallen_knight: { dried_meat: 2, brown_vial: 1, lucky_coin: 1 },
    forsaken_nun: { blue_vial: 2, dried_meat: 2, brown_vial: 1, lucky_coin: 1 },
    night_hunter: { blue_vial: 1, dried_meat: 2, brown_vial: 1, lockpick: 1 },
  };

  if (fromStepIdx < steps.length) {
    const bonusItems = extraClassPack[clsKey];
    for (const [itemId, qty] of Object.entries(bonusItems)) {
      p.inventory[itemId] = (p.inventory[itemId] || 0) + qty;
    }
  }

  const wpnName = CONFIG.WEAPONS[p.equippedWeapon]?.name || p.equippedWeapon;
  const summary = `${p.name} siết chặt [${wpnName}] cùng hành trang phòng thân, lặng lẽ tiến vào Ngoại Vi Đại Giáo Đường.`;

  return { appliedLabels, summary };
}

export function bloodForgeWeapon(
  p: PlayerState,
  weaponId: string
): { success: boolean; message: string } {
  const w = CONFIG.WEAPONS[weaponId];
  if (!w || w.hands === 0) {
    return { success: false, message: 'Không thể Huyết Rèn món vũ khí này!' };
  }
  p.bloodForgedWeapons = p.bloodForgedWeapons || [];
  if (p.bloodForgedWeapons.includes(weaponId)) {
    return { success: false, message: `[${w.name}] đã được tôi luyện bằng Huyết Rèn rồi.` };
  }
  p.bloodForgedWeapons.push(weaponId);
  p.corruption = Math.min(100, p.corruption + 15);
  applyAffinityChange(p, 'demonicPact', 1, { skipDemonicCorruption: true });
  return {
    success: true,
    message: `Kẻ Đúc Kiếm Không Đầu dìm [${w.name}] vào chảo huyết quỷ sôi sục! Lưỡi thép rít lên sắc lạnh dị thường, còn mùi máu tanh ngấm sâu vào huyết quản bạn.`,
  };
}

export const HOLY_MOTHER_REFUSAL_MSG = 'Thánh Mẫu đã quay lưng trước tội lỗi của ngươi.';
export const ALTAR_EXHAUSTED_MSG =
  'Phiến đá đã nguội lạnh, ấn ký không còn hồi đáp lời khẩn cầu của bạn.';
export const HOLY_ALTAR_REFUSAL_MSG =
  'Bức tượng đá im lìm. Bàn tay bạn vấy bẩn đến mức ánh sáng không còn chạm tới.';
export const HOLY_ALTAR_SUCCESS_MSG =
  'Ánh sáng bạc dịu nhẹ ôm lấy vết thương, cơn cồn cào lắng xuống nhường chỗ cho sự tĩnh lặng lạ thường.';
export const BLOOD_ALTAR_SUCCESS_MSG =
  'Phiến đá uống cạn dòng máu nóng. Một luồng nhiệt hung bạo dâng trào dọc theo từng thớ thịt.';
export const VOID_ALTAR_SUCCESS_MSG =
  'Mọi âm thanh xung quanh đột ngột tắt lịm. Bạn vừa thấu hiểu một mảnh chân lý mà tâm trí phàm trần không nên biết.';

export function buildAltarKey(floorId: string, x: number, y: number): string {
  return `${floorId}:${x}:${y}`;
}

export function isHolyMotherBanned(p: PlayerState): boolean {
  return Boolean(p.holyMotherBanned || p.holyMagicLocked || (p.corruption || 0) >= 25);
}

export function banHolyMother(p: PlayerState): void {
  p.holyMotherBanned = true;
  p.holyMagicLocked = true;
}

export const CORRUPTION_DIEGETIC_WARNING_MSG =
  'Mùi tro tàn bám chặt lấy tay bạn, lời cầu nguyện bỗng trở nên nặng nề một cách kỳ lạ...';

export function checkCorruptionDiegeticWarning(p: PlayerState, logs?: string[]): string | null {
  if (!isHolyMotherBanned(p) && !p.corruptionWarningLogged && p.corruption >= 18 && p.corruption < 25) {
    p.corruptionWarningLogged = true;
    if (logs) logs.push(CORRUPTION_DIEGETIC_WARNING_MSG);
    return CORRUPTION_DIEGETIC_WARNING_MSG;
  }
  return null;
}

export function syncCorruptionHolyBan(p: PlayerState): void {
  p.corruption = Math.max(0, Math.min(100, p.corruption || 0));
  if (p.corruption >= 25) {
    banHolyMother(p);
  }
}

export interface AltarRitualOptions {
  altarKey: string;
  deity: 'holy_mother' | 'demon_lord' | 'void_god';
  holyMode?: 'fasting' | 'white_herb';
  bloodHpLossRatio?: number;
}

export interface AltarRitualResult {
  success: boolean;
  blockedByUsed?: boolean;
  blockedByBan?: boolean;
  missingItem?: boolean;
  hpLost?: number;
  mindLost?: number;
  hungerAdded?: number;
  corruptionDelta?: number;
  affinityGained?: number;
  message: string;
}

export function performAltarAffinityRitual(
  p: PlayerState,
  opts: AltarRitualOptions
): AltarRitualResult {
  p.usedAltarKeys = p.usedAltarKeys || [];
  p.completedAffinityActions = p.completedAffinityActions || [];
  p.inventory = p.inventory || {};
  p.affinities = p.affinities || { holyMother: 0, primordialVoid: 0, demonicPact: 0 };

  if (p.usedAltarKeys.includes(opts.altarKey)) {
    return {
      success: false,
      blockedByUsed: true,
      message: ALTAR_EXHAUSTED_MSG,
    };
  }

  if (opts.deity === 'holy_mother') {
    if (isHolyMotherBanned(p)) {
      return {
        success: false,
        blockedByBan: true,
        message: HOLY_ALTAR_REFUSAL_MSG,
      };
    }

    const mode = opts.holyMode || 'fasting';
    let hungerAdded = 0;
    if (mode === 'white_herb') {
      if ((p.inventory.white_herb || 0) < 1) {
        return {
          success: false,
          missingItem: true,
          message: 'Bạn không mang theo Thảo Dược Trắng để dâng lễ.',
        };
      }
      p.inventory.white_herb = Math.max(0, (p.inventory.white_herb || 0) - 1);
    } else {
      const prevHunger = p.hunger || 0;
      p.hunger = Math.min(100, prevHunger + 20);
      hungerAdded = p.hunger - prevHunger;
    }

    const prevCor = p.corruption || 0;
    p.corruption = Math.max(0, prevCor - 5);
    p.usedAltarKeys.push(opts.altarKey);
    const gained = applyAffinityChange(p, 'holyMother', 1);

    return {
      success: true,
      hungerAdded,
      corruptionDelta: p.corruption - prevCor,
      affinityGained: gained,
      message: HOLY_ALTAR_SUCCESS_MSG,
    };
  }

  if (opts.deity === 'demon_lord') {
    const ratio = Math.max(0.25, Math.min(0.3, opts.bloodHpLossRatio ?? 0.28));
    const rawLoss = Math.max(1, Math.round(p.maxHp * ratio));
    const prevHp = p.hp;
    p.hp = Math.max(1, p.hp - rawLoss);
    p.statuses.bleeding = true;

    const prevCor = p.corruption || 0;
    p.corruption = Math.min(100, prevCor + 12);
    banHolyMother(p);
    p.usedAltarKeys.push(opts.altarKey);
    const gained = applyAffinityChange(p, 'demonicPact', 1, {
      skipDemonicCorruption: true,
    });

    return {
      success: true,
      hpLost: prevHp - p.hp,
      corruptionDelta: p.corruption - prevCor,
      affinityGained: gained,
      message: BLOOD_ALTAR_SUCCESS_MSG,
    };
  }

  // void_god: -30 Mind immediately (can drop into Panic), +0 Corruption, +1 primordialVoid
  const prevMind = p.mind;
  p.mind = Math.max(0, p.mind - 30);
  p.usedAltarKeys.push(opts.altarKey);
  const gained = applyAffinityChange(p, 'primordialVoid', 1);

  return {
    success: true,
    mindLost: prevMind - p.mind,
    corruptionDelta: 0,
    affinityGained: gained,
    message: VOID_ALTAR_SUCCESS_MSG,
  };
}

export function applyAffinityChange(
  p: PlayerState,
  pillar: 'holyMother' | 'primordialVoid' | 'demonicPact',
  delta: number,
  opts?: { skipDemonicCorruption?: boolean }
): number {
  p.affinities = p.affinities || { holyMother: 0, primordialVoid: 0, demonicPact: 0 };
  if (pillar === 'holyMother' && isHolyMotherBanned(p) && delta > 0) {
    return 0;
  }
  const prev = Math.max(0, Math.min(3, p.affinities[pillar] || 0));
  const next = Math.max(0, Math.min(3, prev + delta));
  p.affinities[pillar] = next;
  const netGain = Math.max(0, next - prev);
  if (netGain > 0) {
    if (pillar === 'demonicPact' && !opts?.skipDemonicCorruption) {
      p.corruption = Math.min(100, (p.corruption || 0) + 15 * netGain);
    } else if (pillar === 'primordialVoid') {
      p.maxMind = Math.max(30, p.maxMind - 10 * netGain);
      p.mind = Math.min(p.maxMind, p.mind);
    }
  }
  syncCorruptionHolyBan(p);
  return netGain;
}

export function getFloor3MiasmaMultiplier(p: PlayerState): number {
  const voidAff = p.affinities?.primordialVoid || 0;
  if (voidAff >= 3) return 0;
  if (voidAff === 2) return 0.3;
  if (voidAff === 1) return 0.65;
  return 1;
}

export function canUseHolySkill(
  p: PlayerState,
  sk: SkillDef
): { allowed: boolean; reason?: string } {
  if (sk.branch !== 'Thánh Mẫu') return { allowed: true };
  if (isHolyMotherBanned(p)) {
    return { allowed: false, reason: `${HOLY_MOTHER_REFUSAL_MSG}`};
  }
  if ((sk.requiredAffinity?.level || 0) >= 2 && (p.affinities?.demonicPact || 0) >= 2) {
    return {
      allowed: false,
      reason: 'Tín Ngưỡng [Huyết Quỷ] ≥ 2 đã khóa vĩnh viễn cổ thuật [Thánh Mẫu] bậc cao!',
    };
  }
  return { allowed: true };
}

export function grantAffinityOnce(
  p: PlayerState,
  actionId: string,
  pillar: 'holyMother' | 'primordialVoid' | 'demonicPact',
  delta = 1
): boolean {
  p.completedAffinityActions = p.completedAffinityActions || [];
  if (p.completedAffinityActions.includes(actionId)) {
    return false;
  }
  if (pillar === 'holyMother' && isHolyMotherBanned(p)) {
    return false;
  }
  p.completedAffinityActions.push(actionId);
  applyAffinityChange(p, pillar, delta, {
    skipDemonicCorruption: actionId === 'milestone_cannibalism',
  });
  return true;
}

export function exorciseCursedWeapon(p: PlayerState): { success: boolean; message: string } {
  if (!p.cursedLockedWeapon) {
    return { success: false, message: 'Tay bạn hiện không bị vũ khí nguyền rủa nào bám rễ.' };
  }
  if (isHolyMotherBanned(p)) {
    return { success: false, message: `${HOLY_MOTHER_REFUSAL_MSG}`};
  }
  if (p.energyStones < 1) {
    return { success: false, message: 'Cần ít nhất 1 Đá Linh Hồn Rỗng để Trục Xuất lời nguyền!' };
  }
  const cursedId = p.cursedLockedWeapon;
  const cursedName = CONFIG.WEAPONS[cursedId]?.name || cursedId;
  p.energyStones -= 1;
  p.inventory.energy_stone = Math.max(0, p.energyStones);
  p.cursedLockedWeapon = null;
  if (p.equippedWeapon === cursedId) {
    p.equippedWeapon = p.unlockedWeapons.find((id) => !CONFIG.WEAPONS[id]?.isCursed) || 'rusty_knife';
  }
  return {
    success: true,
    message: `Nghi thức Trục Xuất thành công! Lời nguyền của [${cursedName}] đã bị tháo khỏi cánh tay bạn.`,
  };
}

export function regrowLimbAtHexen(
  p: PlayerState,
  limbKey: 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'
): { success: boolean; message: string } {
  if (p.limbs[limbKey]) {
    return { success: false, message: 'Bộ phận này vẫn còn nguyên vẹn!' };
  }
  if (isHolyMotherBanned(p)) {
    return { success: false, message: `${HOLY_MOTHER_REFUSAL_MSG}`};
  }
  if (p.energyStones < 2 || p.mind < 25) {
    return { success: false, message: 'Cần 2 Đá Linh Hồn Rỗng và tối thiểu 25 Lý Trí để Tái Tạo Chi Thể!' };
  }
  p.energyStones -= 2;
  p.inventory.energy_stone = Math.max(0, p.energyStones);
  p.mind = Math.max(1, p.mind - 25);
  p.limbs[limbKey] = true;
  p.limbs.infected[limbKey] = false;
  return {
    success: true,
    message: 'Ánh sáng Thánh Mẫu rủ xuống giữa bóng tối: Da thịt và xương khớp mới mọc lại vẹn nguyên trên cơ thể bạn, đổi bằng một phần tâm lực.',
  };
}

export function unlockHexenStatNode(
  p: PlayerState,
  nodeId: 'agility_1' | 'atk_1' | 'def_1' | 'san_1'
): { success: boolean; message: string } {
  p.hexenStatNodes = p.hexenStatNodes || [];
  if (p.hexenStatNodes.includes(nodeId)) {
    return { success: false, message: 'Nốt chỉ số này đã được khắc ấn rồi!' };
  }
  if (p.energyStones < 1) {
    return { success: false, message: 'Cần 1 Đá Linh Hồn Rỗng để khắc ấn nốt chỉ số!' };
  }
  p.energyStones -= 1;
  p.inventory.energy_stone = Math.max(0, p.energyStones);
  p.hexenStatNodes.push(nodeId);
  if (nodeId === 'agility_1') {
    p.evasionBonus = Math.min(0.45, p.evasionBonus + 0.05);
    return { success: true, message: 'Khắc Ấn [Nhanh Nhẹn +1]: Tăng +5% Né tránh & Nhanh nhẹn!'};
  }
  if (nodeId === 'atk_1') {
    return { success: true, message: 'Khắc Ấn [Cường Lực Xương Thịt]: Tăng +15% Sát thương mọi đòn đánh!'};
  }
  if (nodeId === 'def_1') {
    p.naturalArmor = Math.min(0.45, p.naturalArmor + 0.1);
    return { success: true, message: 'Khắc Ấn [Da Thép Giáo Đường]: Tăng +10% Kháng Vật Lý!'};
  }
  p.maxMind += 25;
  p.mind = Math.min(p.maxMind, p.mind + 25);
  return { success: true, message: 'Khắc Ấn [Ý Chí Bất Khuất]: Tăng +25 Lý Trí tối đa & hồi +25 Lý Trí!'};
}

export function prayAffinityAtHexen(
  p: PlayerState,
  pillar: 'holyMother' | 'primordialVoid' | 'demonicPact'
): { success: boolean; message: string } {
  p.affinities = p.affinities || { holyMother: 0, primordialVoid: 0, demonicPact: 0 };
  if (p.energyStones < 1) {
    return { success: false, message: 'Cần 1 Đá Linh Hồn Rỗng để dâng lễ lên Trụ Cột Vũ Trụ!' };
  }
  if (pillar === 'holyMother' && isHolyMotherBanned(p)) {
    return { success: false, message: `${HOLY_MOTHER_REFUSAL_MSG}`};
  }
  if ((p.affinities[pillar] || 0) >= 3) {
    return { success: false, message: 'Tín Ngưỡng của trụ cột này đã đạt ngưỡng tối đa (3/3)!' };
  }
  p.energyStones -= 1;
  p.inventory.energy_stone = Math.max(0, p.energyStones);
  applyAffinityChange(p, pillar, 1);
  if (pillar === 'holyMother') {
    return { success: true, message: 'Cộng hưởng Thánh Mẫu +1! Lực lượng Trật Tự & Phép Lành được khai mở sâu hơn.'};
  }
  if (pillar === 'primordialVoid') {
    return { success: true, message: 'Ấn ký Hư Vô +1 khắc sâu vào tâm khảm (-10 Lý Trí tối đa, tăng kháng Chướng Khí Tầng 3)!'};
  }
  return { success: true, message: 'Khế ước Huyết Quỷ +1 rỉ máu trong huyết quản (+15 Tha Hóa), bóng tối đáp lời thỉnh cầu của bạn.'};
}

export function learnOrUpgradeHexenSkill(
  p: PlayerState,
  skillId: string
): { success: boolean; message: string } {
  p.affinities = p.affinities || { holyMother: 0, primordialVoid: 0, demonicPact: 0 };
  p.skillLevels = p.skillLevels || {};
  p.inventory = p.inventory || {};

  const sk = CONFIG.SKILLS.find((s) => s.id === skillId);
  if (!sk) {
    return { success: false, message: 'Không tìm thấy kỹ năng hợp lệ!' };
  }

  const curLv = p.skillLevels[skillId] || 0;
  if (curLv >= 3) {
    return { success: false, message: `Kỹ năng [${sk.name}] đã đạt cấp độ tối đa Cấp 3!` };
  }

  const holyCheck = canUseHolySkill(p, sk);
  if (!holyCheck.allowed) {
    return {
      success: false,
      message: holyCheck.reason || `${HOLY_MOTHER_REFUSAL_MSG}`,
    };
  }

  if (curLv === 0) {
    if (!sk.requiredAffinity) {
      return {
        success: false,
        message: `[${sk.name}] là Chiến Kỹ — chỉ có thể mở khóa Cấp 1 qua Cuộn Bí Kíp trên Kệ Sách!`,
      };
    }
    const { pillar, level } = sk.requiredAffinity;
    const pillarLabel =
      pillar === 'holyMother'
        ? 'Thánh Mẫu'
        : pillar === 'demonicPact'
        ? 'Huyết Quỷ'
        : 'Hư Vô Nguyên Thủy';
    const curAff = p.affinities[pillar] || 0;
    if (curAff < level) {
      return {
        success: false,
        message: `Cần Tín Ngưỡng [${pillarLabel}] ≥ ${level} (hiện tại: ${curAff}) mới có thể học [${sk.name}]!`,
      };
    }
  }

  if (p.energyStones < 1) {
    return {
      success: false,
      message: 'Cần 1 Đá Linh Hồn Rỗng để khắc ấn kỹ năng tại Đài Cộng Hưởng!',
    };
  }

  p.energyStones -= 1;
  p.inventory.energy_stone = Math.max(0, p.energyStones);
  p.skillLevels[skillId] = curLv + 1;
  if (sk.branch === 'Huyết Quỷ') {
    banHolyMother(p);
  }

  if (curLv === 0) {
    return {
      success: true,
      message: `Thần lực đáp lời! Đã lĩnh hội cổ thuật [${sk.name}] Cấp 1 tại Đài Cộng Hưởng.`,
    };
  }
  return {
    success: true,
    message: `Ấn ký cổ thuật [${sk.name}] khắc sâu lên Cấp ${curLv + 1} tại Đài Cộng Hưởng.`,
  };
}

export function getComputedPlayerStats(p: PlayerState) {
  const wpn = getEffectiveWeapon(p);
  const sh = p.equippedShield ? CONFIG.SHIELDS[p.equippedShield] : null;
  const h = p.equippedHead ? GEAR_ITEMS[p.equippedHead] : null;
  const b = p.equippedBody ? GEAR_ITEMS[p.equippedBody] : null;
  const a = p.equippedAccessory ? GEAR_ITEMS[p.equippedAccessory] : null;

  let avgAtk = Math.round((wpn.dmg[0] + wpn.dmg[1]) * 0.5);
  if (p.bloodForgedWeapons?.includes(wpn.id)) {
    avgAtk = Math.round(avgAtk * 1.35);
  }
  if (p.hexenStatNodes?.includes('atk_1')) {
    avgAtk = Math.round(avgAtk * 1.15);
  }
  if (p.hunger >= 50) {
    avgAtk = Math.round(avgAtk * 0.75); // -25% physical damage when hunger >= 50
  }

  const physDef = Math.min(
    0.85,
    p.naturalArmor +
      (sh ? sh.guardReduction * 0.2 : 0) +
      (h ? h.physDef : 0) +
      (b ? b.physDef : 0) +
      (a ? a.physDef : 0)
  );
  const magDef = Math.min(
    0.85,
    (h ? h.magDef : 0) +
      (b ? b.magDef : 0) +
      (a ? a.magDef : 0) +
      (p.mindPerRoom > 0 ? 0.12 : 0.04) +
      (p.magicResistBonus || 0)
  );
  const magAtk = 100 + (h ? h.magAtk : 0) + (b ? b.magAtk : 0) + (a ? a.magAtk : 0);
  const rawAgility =
    Math.round((0.1 + p.evasionBonus) * 100) +
    (p.agilityBonus || 0) +
    (h ? h.agility : 0) +
    (b ? b.agility : 0) +
    (a ? a.agility : 0) -
    countLostLegs(p) * 8;
  const rawLuck = Math.round(wpn.critChance * 100) + (h ? h.luck : 0) + (b ? b.luck : 0) + (a ? a.luck : 0);

  // Hunger >= 90% or both legs lost causes total loss of Evasion (0); 1 leg lost halves Evasion (-50%)
  const isStarvingCritical = p.hunger >= 90;
  const lostLegs = countLostLegs(p);
  const legEvasionMult = lostLegs >= 2 ? 0 : lostLegs === 1 ? 0.5 : 1;

  return {
    physAtk: avgAtk,
    physDefPct: Math.round(physDef * 100),
    magAtk,
    magDefPct: Math.round(magDef * 100),
    agility: isStarvingCritical ? 0 : Math.max(1, rawAgility),
    luck: isStarvingCritical ? 0 : Math.max(5, rawLuck),
    critRatePct: isStarvingCritical ? 0 : Math.round(wpn.critChance * 100),
    evasionPct: isStarvingCritical ? 0 : Math.max(0, Math.round(p.evasionBonus * 100 * legEvasionMult)),
  };
}

export function countIntactArms(p: PlayerState): number {
  return (p.limbs.leftArm ? 1 : 0) + (p.limbs.rightArm ? 1 : 0);
}

export function countLostLegs(p: PlayerState): number {
  return (!p.limbs.leftLeg ? 1 : 0) + (!p.limbs.rightLeg ? 1 : 0);
}

export function getPlayerStepCooldownMs(p: PlayerState): number {
  const lostLegs = countLostLegs(p);
  if (lostLegs === 0) return CONFIG.STEP_COOLDOWN_MS;
  if (lostLegs === 1) return CONFIG.ONE_LEG_LOST_COOLDOWN_MS;
  return CONFIG.TWO_LEGS_LOST_COOLDOWN_MS;
}

export function getEnemyStepMultiplier(p: PlayerState): number {
  const lostLegs = countLostLegs(p);
  if (lostLegs === 0) return 1;
  if (lostLegs === 1) return 2;
  return 3;
}

export function canPlayerFlee(p: PlayerState): boolean {
  return countLostLegs(p) < 2;
}

export function getFleeChancePct(p: PlayerState, enemyTpl?: EnemyTemplate | null): number {
  if (!canPlayerFlee(p)) return 0;
  if (enemyTpl?.tier === 'boss') return 0;
  let chance = p.baseFleeChance;
  if (countLostLegs(p) === 1) chance *= 0.5;
  return Math.round(Math.max(0, Math.min(0.95, chance)) * 100);
}

export function isWeaponTwoHanded(weaponId?: string | null): boolean {
  if (!weaponId) return false;
  const wpn = CONFIG.WEAPONS[weaponId];
  return Boolean(wpn && (wpn.isTwoHanded || wpn.hands === 2));
}

export function canMemberEquipWeapon(
  limbs: { leftArm: boolean; rightArm: boolean },
  weaponId: string
): { allowed: boolean; reason?: string } {
  const wpn = CONFIG.WEAPONS[weaponId];
  if (!wpn) return { allowed: false, reason: 'Không tìm thấy vũ khí.' };
  if (weaponId === 'bite_headbutt' || wpn.hands === 0) return { allowed: true };
  if (!limbs.leftArm && !limbs.rightArm) {
    return { allowed: false, reason: 'Đã mất cả hai tay — chỉ có thể chiến đấu tay không!' };
  }
  if (isWeaponTwoHanded(weaponId) && (!limbs.leftArm || !limbs.rightArm)) {
    return {
      allowed: false,
      reason: `Vũ khí 2 tay [${wpn.name}] yêu cầu cả Tay Trái và Tay Phải đều còn nguyên vẹn!`,
    };
  }
  return { allowed: true };
}

export function handlePlayerArmLoss(
  player: PlayerState,
  limbKey: 'leftArm' | 'rightArm',
  logs?: string[]
): string[] {
  const removed: string[] = [];
  const remainingArms = (player.limbs.leftArm ? 1 : 0) + (player.limbs.rightArm ? 1 : 0);

  // Losing either arm means you cannot hold a Shield alongside a weapon or wield a 2-handed weapon
  if (player.equippedShield && CONFIG.SHIELDS[player.equippedShield]) {
    const shId = player.equippedShield;
    if (!player.unlockedShields.includes(shId)) player.unlockedShields.push(shId);
    removed.push(CONFIG.SHIELDS[shId].name);
    player.equippedShield = null;
  }
  if (
    player.equippedWeapon &&
    player.equippedWeapon !== 'bite_headbutt' &&
    CONFIG.WEAPONS[player.equippedWeapon] &&
    (remainingArms === 0 || isWeaponTwoHanded(player.equippedWeapon))
  ) {
    const wId = player.equippedWeapon;
    const wName = CONFIG.WEAPONS[wId].name;
    if (!player.unlockedWeapons.includes(wId)) player.unlockedWeapons.push(wId);
    if (player.cursedLockedWeapon === wId) player.cursedLockedWeapon = null;
    removed.push(wName);
    player.equippedWeapon = 'bite_headbutt';
  }
  if (limbKey === 'rightArm' && player.cursedLockedWeapon) {
    player.cursedLockedWeapon = null;
  }
  if (removed.length > 0 && logs) {
    logs.push(
      `Mất [${limbKey === 'leftArm'? 'Tay Trái': 'Tay Phải'}]: Tự động tháo [${removed.join(', ')}] cất lại vào Túi Đồ!`
    );
  }
  return removed;
}

export function handleAllyArmLoss(
  player: PlayerState,
  ally: PartyAlly,
  limbKey: 'leftArm' | 'rightArm',
  logs?: string[]
): string[] {
  const removed: string[] = [];
  const remainingArms = (ally.limbs?.leftArm ? 1 : 0) + (ally.limbs?.rightArm ? 1 : 0);
  if (ally.equippedShield && CONFIG.SHIELDS[ally.equippedShield]) {
    const shId = ally.equippedShield;
    if (!player.unlockedShields.includes(shId)) player.unlockedShields.push(shId);
    removed.push(CONFIG.SHIELDS[shId].name);
    ally.equippedShield = null;
  }
  if (
    ally.weaponId &&
    ally.weaponId !== 'bite_headbutt' &&
    CONFIG.WEAPONS[ally.weaponId] &&
    (remainingArms === 0 || isWeaponTwoHanded(ally.weaponId))
  ) {
    const wId = ally.weaponId;
    const wName = CONFIG.WEAPONS[wId].name;
    if (!player.unlockedWeapons.includes(wId)) player.unlockedWeapons.push(wId);
    removed.push(wName);
    ally.weaponId = 'bite_headbutt';
  }
  if (removed.length > 0 && logs) {
    logs.push(
      `[${ally.name}] mất [${limbKey === 'leftArm'? 'Tay Trái': 'Tay Phải'}]: Tự động tháo [${removed.join(', ')}] trả về Túi Đồ!`
    );
  }
  return removed;
}

const ALLY_ID_TO_NPC_KEY: Record<string, string> = {
  ally_kael: 'npc_prisoner',
  broken_knight: 'npc_broken_knight',
  fallen_knight: 'npc_recruit_knight',
  forsaken_nun: 'npc_recruit_nun',
  night_hunter: 'npc_recruit_hunter',
};

export function markLivingAllyDead(player: PlayerState, ally: PartyAlly): void {
  if (ally.hp > 0) return;
  if (ally.isUndeadSummon) return;
  player.npcLifecycle = player.npcLifecycle || {};
  const npcKey = ALLY_ID_TO_NPC_KEY[ally.id] || ally.id;
  player.npcLifecycle[npcKey] = 'dead';
  player.npcLifecycle[ally.id] = 'dead';
}

/**
 * Permadeath Cleanup: Automatically removes every fallen companion (hp <= 0) from `player.party`,
 * reclaims their worn equipment into the shared inventory pool, marks living NPCs as permanently dead,
 * and emits a clear death notice. Main player (index 0) is untouched so Game Over triggers normally.
 */
export function pruneDeadCompanions(player: PlayerState, logs?: string[]): PartyAlly[] {
  if (!player.party || player.party.length === 0) return [];
  const fallen: PartyAlly[] = [];
  const survivors: PartyAlly[] = [];

  for (const ally of player.party) {
    if (ally.hp > 0) {
      survivors.push(ally);
      continue;
    }
    fallen.push(ally);
    if (ally.isUndeadSummon) {
      reclaimUndeadSummonGear(player, ally, logs);
    } else {
      markLivingAllyDead(player, ally);
      // Reclaim worn gear from fallen living companion into player's shared pool
      if (ally.weaponId && ally.weaponId !== 'bite_headbutt' && CONFIG.WEAPONS[ally.weaponId]) {
        if (!player.unlockedWeapons.includes(ally.weaponId)) {
          player.unlockedWeapons.push(ally.weaponId);
        }
        ally.weaponId = '';
      }
      if (ally.equippedShield && CONFIG.SHIELDS[ally.equippedShield]) {
        if (!player.unlockedShields.includes(ally.equippedShield)) {
          player.unlockedShields.push(ally.equippedShield);
        }
        ally.equippedShield = null;
      }
      for (const slot of ['equippedHead', 'equippedBody', 'equippedAccessory'] as const) {
        const gId = ally[slot];
        if (gId && GEAR_ITEMS[gId]) {
          if (!player.unlockedGear.includes(gId)) {
            player.unlockedGear.push(gId);
          }
          ally[slot] = null;
        }
      }
      if (player.dismissedCompanions) {
        player.dismissedCompanions = player.dismissedCompanions.filter((c) => c.id !== ally.id);
      }
    }
    if (logs) {
      logs.push(`[${ally.name}] đã gục ngã vĩnh viễn và rời khỏi đội hình...`);
    }
  }

  if (fallen.length > 0) {
    player.party = survivors;
  }
  return fallen;
}

export function leaveOrDismissPartyMember(
  player: PlayerState,
  partyIdx: number,
  mode: 'leave' | 'dismiss' | 'dead',
  waitSpot?: { roomId: string; x: number; y: number }
): { success: boolean; message: string } {
  const ally = player.party[partyIdx];
  if (!ally) return { success: false, message: 'Không tìm thấy thành viên tổ đội.' };

  const returnedNames: string[] = [];
  if (ally.weaponId && ally.weaponId !== 'bite_headbutt' && CONFIG.WEAPONS[ally.weaponId]) {
    if (!player.unlockedWeapons.includes(ally.weaponId)) {
      player.unlockedWeapons.push(ally.weaponId);
    }
    returnedNames.push(CONFIG.WEAPONS[ally.weaponId].name);
    ally.weaponId = '';
  }
  if (ally.equippedShield && CONFIG.SHIELDS[ally.equippedShield]) {
    if (!player.unlockedShields.includes(ally.equippedShield)) {
      player.unlockedShields.push(ally.equippedShield);
    }
    returnedNames.push(CONFIG.SHIELDS[ally.equippedShield].name);
    ally.equippedShield = null;
  }
  for (const slot of ['equippedHead', 'equippedBody', 'equippedAccessory'] as const) {
    const gId = ally[slot];
    if (gId && GEAR_ITEMS[gId]) {
      if (!player.unlockedGear.includes(gId)) {
        player.unlockedGear.push(gId);
      }
      returnedNames.push(GEAR_ITEMS[gId].name);
      ally[slot] = null;
    }
  }

  player.party.splice(partyIdx, 1);

  if (!ally.isUndeadSummon) {
    const npcKey = ALLY_ID_TO_NPC_KEY[ally.id] || ally.id;
    player.npcLifecycle = player.npcLifecycle || {};
    if (mode === 'leave') {
      player.npcLifecycle[npcKey] = 'map';
      if (ally.id === 'ally_kael') {
        player.npcFlags = player.npcFlags || { priestHelped: false, smugglerClosed: false, prisonerRecruited: false };
        player.npcFlags.prisonerRecruited = false;
      }
      if (ally.hp > 0) {
        const snapshot: PartyAlly = JSON.parse(JSON.stringify(ally));
        if (waitSpot) {
          snapshot.waitingRoomId = waitSpot.roomId;
          snapshot.waitingX = waitSpot.x;
          snapshot.waitingY = waitSpot.y;
        }
        player.dismissedCompanions = (player.dismissedCompanions || []).filter((c) => c.id !== ally.id);
        player.dismissedCompanions.push(snapshot);
      }
    } else if (mode === 'dead') {
      player.npcLifecycle[npcKey] = 'dead';
      player.dismissedCompanions = (player.dismissedCompanions || []).filter((c) => c.id !== ally.id);
    }
  }

  const gearNotice =
    returnedNames.length > 0 ? ` Toàn bộ trang bị [${returnedNames.join(', ')}] đã được thu hồi về Túi Đồ chung.` : '';

  return {
    success: true,
    message:
      mode === 'dismiss'
        ? `Đã giải tán [${ally.name}] trở về tro bụi.${gearNotice}`
        : mode === 'dead'
        ? `[${ally.name}] đã vĩnh viễn ngã xuống.${gearNotice}`
        : `[${ally.name}] đã rời nhóm (giữ nguyên thương tích) và đứng chờ tại vị trí hiện tại.${gearNotice}`,
  };
}

export function recallDismissedCompanion(
  player: PlayerState,
  allyId: string
): { success: boolean; message: string } {
  if (player.party.length >= 3) {
    return { success: false, message: 'Tổ đội đã đầy tối đa 4 người (1 Chính + 3 Đồng Hành)!' };
  }
  const pool = player.dismissedCompanions || [];
  const idx = pool.findIndex((c) => c.id === allyId);
  if (idx === -1) {
    return { success: false, message: 'Không tìm thấy đồng hành này trong danh sách chờ.' };
  }
  const [restored] = pool.splice(idx, 1);
  player.dismissedCompanions = pool;
  delete restored.waitingRoomId;
  delete restored.waitingX;
  delete restored.waitingY;
  if (!restored.weaponId) {
    restored.weaponId = 'bite_headbutt';
  }
  player.party.push(restored);
  const npcKey = ALLY_ID_TO_NPC_KEY[restored.id] || restored.id;
  player.npcLifecycle = player.npcLifecycle || {};
  player.npcLifecycle[npcKey] = 'recruited';
  if (restored.id === 'ally_kael') {
    player.npcFlags = player.npcFlags || { priestHelped: false, smugglerClosed: false, prisonerRecruited: false };
    player.npcFlags.prisonerRecruited = true;
  }
  return {
    success: true,
    message: `[${restored.name}] đã tái gia nhập tổ đội (Sinh Lực ${restored.hp}/${restored.maxHp}, Lý Trí ${restored.mind}/${restored.maxMind})!`,
  };
}

export function countTotalLostLimbs(p: PlayerState): number {
  let lost = 0;
  if (!p.limbs.leftArm) lost += 1;
  if (!p.limbs.rightArm) lost += 1;
  if (!p.limbs.leftLeg) lost += 1;
  if (!p.limbs.rightLeg) lost += 1;
  return lost;
}

export function getAmputationSanityMultiplier(p: PlayerState): number {
  return countTotalLostLimbs(p) >= 2 ? 1.5 : 1.0;
}

export function getEffectiveWeapon(p: PlayerState) {
  const arms = countIntactArms(p);
  if (arms === 0) {
    return CONFIG.WEAPONS.bite_headbutt;
  }
  const chosen = CONFIG.WEAPONS[p.equippedWeapon] || CONFIG.WEAPONS.bite_headbutt;
  if (isWeaponTwoHanded(chosen.id) && arms < 2) {
    return CONFIG.WEAPONS.bite_headbutt;
  }
  return chosen;
}

export function isPureTankSummon(ally: PartyAlly | null | undefined): boolean {
  return Boolean(ally && (ally.classId === 'summon_wraith' || ally.classId === 'summon_child_12'));
}

export function getUndeadSummonDmgMultiplier(player?: PlayerState): number {
  const necLv = player?.skillLevels?.necromancy || 1;
  if (necLv >= 3) return 1.05;
  if (necLv === 2) return 0.85;
  return 0.7;
}

export function isAllyGearLocked(ally: PartyAlly | null | undefined): boolean {
  if (!ally) return false;
  if (isPureTankSummon(ally)) return true;
  if (ally.isUndeadSummon && ally.hp <= 0) return true;
  return false;
}

export function reclaimUndeadSummonGear(
  player: PlayerState,
  ally: PartyAlly,
  logs?: string[]
): string[] {
  if (!ally.isUndeadSummon || ally.hp > 0) return [];
  const recoveredNames: string[] = [];

  if (ally.weaponId && ally.weaponId !== 'bite_headbutt' && CONFIG.WEAPONS[ally.weaponId]) {
    const wDef = CONFIG.WEAPONS[ally.weaponId];
    if (!player.unlockedWeapons.includes(ally.weaponId)) {
      player.unlockedWeapons.push(ally.weaponId);
    }
    recoveredNames.push(wDef.name);
    ally.weaponId = '';
  }

  if (ally.equippedShield && CONFIG.SHIELDS[ally.equippedShield]) {
    const sDef = CONFIG.SHIELDS[ally.equippedShield];
    if (!player.unlockedShields.includes(ally.equippedShield)) {
      player.unlockedShields.push(ally.equippedShield);
    }
    recoveredNames.push(sDef.name);
    ally.equippedShield = null;
  }

  const gearSlots: Array<'equippedHead' | 'equippedBody' | 'equippedAccessory'> = [
    'equippedHead',
    'equippedBody',
    'equippedAccessory',
  ];
  for (const slot of gearSlots) {
    const gId = ally[slot];
    if (gId && GEAR_ITEMS[gId]) {
      if (!player.unlockedGear.includes(gId)) {
        player.unlockedGear.push(gId);
      }
      recoveredNames.push(GEAR_ITEMS[gId].name);
      ally[slot] = null;
    }
  }

  if (recoveredNames.length > 0 && logs) {
    logs.push(
      `Xác sống tan rã thành tro bụi, nhưng [${recoveredNames.join(', ')}] đã rơi lại và được thu hồi vào kho đồ!`
    );
  }
  return recoveredNames;
}

export function getAllyEffectiveWeapon(ally: PartyAlly) {
  if (isPureTankSummon(ally) && !ally.weaponId) {
    return {
      id: 'spectral_aegis',
      name: 'Hộ Thể Linh Hồn',
      tier: 0 as const,
      hands: 0 as const,
      dmg: [0, 0] as [number, number],
      hitBonus: 0,
      critChance: 0,
      damageType: 'true' as const,
      desc: 'Oán Linh Thuần Phòng Thủ — ưu tiên dựng khiên che chắn và thu hút sát thương cho tổ đội.',
    };
  }
  const arms = (ally.limbs?.leftArm ? 1 : 0) + (ally.limbs?.rightArm ? 1 : 0);
  if (arms === 0) return CONFIG.WEAPONS.bite_headbutt;
  const chosen = CONFIG.WEAPONS[ally.weaponId] || CONFIG.WEAPONS.bite_headbutt;
  if (isWeaponTwoHanded(chosen.id) && arms < 2) {
    return CONFIG.WEAPONS.bite_headbutt;
  }
  return chosen;
}

export function getAllyAvailableSkills(ally: PartyAlly): string[] {
  if (ally.classId === 'fallen_knight' || ally.classId === 'broken_knight' || ally.classId === 'ally_kael') {
    return ['whirlwind_slash', 'hamstring_bind'];
  }
  if (ally.classId === 'forsaken_nun' || ally.classId === 'child_13') {
    return ['blessed_heal', 'holy_light', 'purification'];
  }
  if (ally.classId === 'night_hunter') {
    return ['hamstring_bind', 'veil_of_blindness'];
  }
  if (ally.classId === 'summon_child_12') {
    return ['divine_aegis', 'blessed_heal', 'purification'];
  }
  if (ally.classId === 'summon_wraith') {
    return ['divine_aegis', 'veil_of_blindness'];
  }
  if (ally.classId === 'summon_skeleton') {
    return ['whirlwind_slash'];
  }
  return ['flesh_rend'];
}

export function getAllyComputedStats(ally: PartyAlly, player?: PlayerState) {
  const wpn = getAllyEffectiveWeapon(ally);
  const sh = ally.equippedShield ? CONFIG.SHIELDS[ally.equippedShield] : null;
  const h = ally.equippedHead ? GEAR_ITEMS[ally.equippedHead] : null;
  const b = ally.equippedBody ? GEAR_ITEMS[ally.equippedBody] : null;
  const a = ally.equippedAccessory ? GEAR_ITEMS[ally.equippedAccessory] : null;

  let avgAtk = isPureTankSummon(ally) ? 0 : Math.round((wpn.dmg[0] + wpn.dmg[1]) * 0.5);
  if (!ally.isUndeadSummon && (ally.hunger || 0) >= 50) {
    avgAtk = Math.round(avgAtk * 0.75);
  }
  if (ally.isUndeadSummon && !isPureTankSummon(ally)) {
    avgAtk = Math.round(avgAtk * getUndeadSummonDmgMultiplier(player));
  }

  const baseArmor =
    ally.classId === 'summon_wraith'
      ? 0.34
      : ally.classId === 'summon_child_12'
      ? 0.28
      : ally.classId === 'fallen_knight' || ally.classId === 'broken_knight'
      ? 0.12
      : ally.classId === 'night_hunter'
      ? 0.05
      : 0.03;
  const physDef = Math.min(
    0.85,
    baseArmor +
      (sh ? sh.guardReduction * 0.2 : 0) +
      (h ? h.physDef : 0) +
      (b ? b.physDef : 0) +
      (a ? a.physDef : 0)
  );
  const magDef = Math.min(
    0.85,
    (h ? h.magDef : 0) + (b ? b.magDef : 0) + (a ? a.magDef : 0) + (isPureTankSummon(ally) ? 0.22 : 0.06)
  );
  const magAtk = 100 + (h ? h.magAtk : 0) + (b ? b.magAtk : 0) + (a ? a.magAtk : 0);
  const lostLegs = (!ally.limbs?.leftLeg ? 1 : 0) + (!ally.limbs?.rightLeg ? 1 : 0);
  const rawAgility = 12 + (h ? h.agility : 0) + (b ? b.agility : 0) + (a ? a.agility : 0) - lostLegs * 6;
  const isStarving = !ally.isUndeadSummon && (ally.hunger || 0) >= 90;
  const legEvaMult = lostLegs >= 2 ? 0 : lostLegs === 1 ? 0.5 : 1;
  return {
    physAtk: avgAtk,
    physDefPct: Math.round(physDef * 100),
    magAtk,
    magDefPct: Math.round(magDef * 100),
    agility: isStarving ? 0 : Math.max(1, rawAgility),
    critRatePct: isStarving || isPureTankSummon(ally) ? 0 : Math.round(wpn.critChance * 100),
    evasionPct: isStarving ? 0 : Math.max(0, Math.round(((h?.agility || 0) + (a?.agility || 0)) * 2 * legEvaMult)),
  };
}

export function canAllyEquipGear(ally: PartyAlly, gearId: string): { allowed: boolean; reason?: string } {
  if (isPureTankSummon(ally)) {
    return { allowed: false, reason: 'Oán Linh thuần phòng ngự không thể thay đổi trang bị!' };
  }
  if (ally.isUndeadSummon && ally.hp <= 0) {
    return { allowed: false, reason: 'Đệ tử Chiêu Hồn đã tan rã thành tro bụi!' };
  }
  const gear = GEAR_ITEMS[gearId];
  if (!gear) return { allowed: false, reason: 'Không tìm thấy trang bị.' };
  if ((ally.classId === 'forsaken_nun' || ally.classId === 'child_13') && (gear.forbidNun || gear.weightClass === 'heavy')) {
    return { allowed: false, reason: `[${ally.name}] không thể mặc Giáp Hạng Nặng.` };
  }
  return { allowed: true };
}

export function canAllyEquipShield(ally: PartyAlly, shieldId?: string | null): { allowed: boolean; reason?: string } {
  if (isPureTankSummon(ally)) {
    return { allowed: false, reason: 'Oán Linh thuần phòng ngự không thể thay đổi trang bị!' };
  }
  if (ally.isUndeadSummon && ally.hp <= 0) {
    return { allowed: false, reason: 'Đệ tử Chiêu Hồn đã tan rã thành tro bụi!' };
  }
  if (!ally.limbs.leftArm || !ally.limbs.rightArm) {
    return { allowed: false, reason: `[${ally.name}] đã mất 1 tay nên không thể cầm thêm Khiên!` };
  }
  const wpn = ally.weaponId ? CONFIG.WEAPONS[ally.weaponId] : null;
  if (wpn && wpn.hands === 2) {
    return { allowed: false, reason: `[${ally.name}] đang cầm vũ khí 2 tay [${wpn.name}]!` };
  }
  void shieldId;
  return { allowed: true };
}

export function applySupportItemToAlly(
  player: PlayerState,
  allyIndex: number,
  itemId: string,
  logs: string[]
): boolean {
  const ally = player.party[allyIndex];
  const item = CONFIG.ITEMS[itemId];
  if (!ally || !item || (player.inventory[itemId] || 0) <= 0) return false;
  if (ally.hp <= 0) {
    logs.push(`[${ally.name}] đã tử trận, không thể dùng vật phẩm!`);
    return false;
  }

  player.inventory[itemId] -= 1;
  ally.statuses = ally.statuses || { bleeding: false, poisoned: false, parasite: false };

  if (item.hpHealPct) {
    const pctHeal = Math.round(ally.maxHp * item.hpHealPct);
    ally.hp = Math.min(ally.maxHp, ally.hp + pctHeal);
    logs.push(`[${item.name}] hồi +${pctHeal} Sinh Lực cho [${ally.name}] (${ally.hp}/${ally.maxHp}).`);
  }
  if (item.hpHeal) {
    ally.hp = Math.min(ally.maxHp, ally.hp + item.hpHeal);
    logs.push(`[${item.name}] hồi +${item.hpHeal} Sinh Lực cho [${ally.name}] (${ally.hp}/${ally.maxHp}).`);
  }
  if (item.mindHeal) {
    ally.mind = Math.min(ally.maxMind, ally.mind + item.mindHeal);
    logs.push(`[${item.name}] hồi +${item.mindHeal} Lý Trí cho [${ally.name}] (${ally.mind}/${ally.maxMind}).`);
  }
  if (item.cureBleed) {
    ally.statuses.bleeding = false;
    if (itemId === 'bandage') {
      ally.hp = Math.min(ally.maxHp, ally.hp + 12);
      logs.push(`[${item.name}] cầm máu hoàn toàn & hồi +12 Sinh Lực cho [${ally.name}].`);
    } else {
      logs.push(`[${item.name}] cầm máu cho [${ally.name}].`);
    }
  }
  if (item.curePoison) {
    ally.statuses.poisoned = false;
    logs.push(`[${item.name}] giải độc cho [${ally.name}].`);
  }
  if (item.cureInfection) {
    ally.limbs.infected = { leftArm: false, rightArm: false, leftLeg: false, rightLeg: false };
    logs.push(`[${item.name}] xóa sạch Nhiễm Trùng cho [${ally.name}].`);
  }
  if (item.cureParasite) {
    ally.statuses.parasite = false;
    logs.push(`[${item.name}] tiêu diệt Ký Sinh Trùng trên [${ally.name}].`);
  }
  if (item.hungerRestore) {
    if (ally.isUndeadSummon) {
      logs.push(`[${ally.name}] là thuộc hạ Chiêu Hồn, không có cảm giác đói.`);
    } else {
      ally.hunger = Math.max(0, (ally.hunger || 0) - item.hungerRestore);
      logs.push(`[${item.name}] giảm ${item.hungerRestore} Độ Đói cho [${ally.name}].`);
    }
  }
  return true;
}

export function amputateAllyLimbWithBoneSaw(
  player: PlayerState,
  allyIndex: number,
  limbKey: 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'
): { success: boolean; message: string } {
  const ally = player.party[allyIndex];
  if (!ally) return { success: false, message: 'Không tìm thấy đồng đội!' };
  if ((player.inventory.bone_saw || 0) <= 0) {
    return { success: false, message: 'Bạn cần có Cưa Xương Rỉ Máu trong kho đồ!' };
  }
  if (!ally.limbs[limbKey]) {
    return { success: false, message: 'Bộ phận này của đồng đội đã mất rồi!' };
  }
  const labels: Record<'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg', string> = {
    leftArm: 'Tay Trái',
    rightArm: 'Tay Phải',
    leftLeg: 'Chân Trái',
    rightLeg: 'Chân Phải',
  };
  ally.limbs[limbKey] = false;
  ally.limbs.infected[limbKey] = false;
  ally.hp = Math.max(5, ally.hp - 12);
  ally.statuses = ally.statuses || { bleeding: false, poisoned: false, parasite: false };
  ally.statuses.bleeding = true;
  const autoMsgs: string[] = [];
  if (limbKey === 'leftArm' || limbKey === 'rightArm') {
    handleAllyArmLoss(player, ally, limbKey, autoMsgs);
  }
  return {
    success: true,
    message: `Lưỡi cưa nghiến đứt [${labels[limbKey]}] nhiễm độc của [${ally.name}], máu tươi tuôn xối xả khỏi vết cắt!${autoMsgs.length? `${autoMsgs.join('')}`: ''}`,
  };
}

export function getEnemyRemainingTotalHp(enemy: MapEnemyInstance): number {
  const torso = enemy.limbs.find((l) => l.id === 'torso');
  const head = enemy.limbs.find((l) => l.id === 'head');
  if ((torso && torso.hp <= 0) || (head && head.hp <= 0)) {
    return 0;
  }
  return enemy.limbs.reduce((acc, l) => acc + Math.max(0, l.hp), 0);
}

export function getEnemyMaxTotalHp(enemy: MapEnemyInstance): number {
  return enemy.limbs.reduce((acc, l) => acc + l.maxHp, 0);
}

export function isEnemyDead(enemy: MapEnemyInstance): boolean {
  const torso = enemy.limbs.find((l) => l.id === 'torso');
  const head = enemy.limbs.find((l) => l.id === 'head');
  if (torso && torso.hp <= 0) return true;
  if (head && head.hp <= 0) return true;
  return enemy.limbs.every((l) => l.hp <= 0);
}

export function canTargetEnemyLimb(
  enemy: MapEnemyInstance,
  tpl: EnemyTemplate,
  limbId: string
): { allowed: boolean; reason?: string } {
  const limb = enemy.limbs.find((l) => l.id === limbId);
  if (!limb || limb.hp <= 0) {
    return { allowed: false, reason: 'Bộ phận này đã bị chặt đứt!' };
  }
  if (tpl.id === 'astral_kraken' && limbId === 'head') {
    const severedTentacles = enemy.limbs.filter((l) => l.isTentacle && l.hp <= 0).length;
    if (severedTentacles < 2) {
      return {
        allowed: false,
        reason: `Con Mắt Trung Tâm đang được 4 Xúc Tu bảo vệ! Phải chặt đứt ít nhất 2 Xúc Tu trước (Hiện tại: ${severedTentacles}/2).`,
      };
    }
  }
  if (
    (tpl.id === 'demon_lord_vaelis' || tpl.id === 'vaelis') &&
    (limbId === 'torso' || limbId === 'head')
  ) {
    const guardianIds = ['throne_claw_left', 'throne_ensor_right', 'void_tendrils'];
    const intactGuardians = enemy.limbs.filter(
      (l) => guardianIds.includes(l.id) && l.hp > 0
    );
    if (intactGuardians.length === 3) {
      return {
        allowed: false,
        reason:
          'Phải chặt đứt ít nhất một cánh tay ngai vàng hoặc chùm xúc tu mới có thể tiếp cận Vaelis!',
      };
    }
  }
  return { allowed: true };
}

export function computeLimbHitChance(
  player: PlayerState,
  enemy: MapEnemyInstance,
  _tpl: EnemyTemplate,
  limb: LimbConfig
): number {
  const wpn = getEffectiveWeapon(player);
  const headHitBonus = player.equippedHead ? GEAR_ITEMS[player.equippedHead]?.hitBonus || 0 : 0;
  let base = 0.88 + wpn.hitBonus + headHitBonus;

  if (limb.id === 'head') {
    const hasSupportLegDefined = enemy.limbs.some((l) => l.isSupportLeg);
    const legsSevered = hasSupportLegDefined && enemy.limbs.every((l) => !l.isSupportLeg || l.hp <= 0);
    const isHeadUnlocked = legsSevered || enemy.stunTurns > 0 || enemy.blindTurns > 0;

    if (isHeadUnlocked) {
      // Severed legs, Stun, or Blind unlocks 85%–95% head accuracy
      base = Math.max(0.85, Math.min(0.95, 0.90 + wpn.hitBonus + headHitBonus + (wpn.headHitBonus || 0)));
    } else {
      // Anti-Head-Spam Lock: while standing and alert, head hit chance is locked at 15%–25%
      base = Math.max(0.15, Math.min(0.25, 0.20 + (wpn.headHitBonus || 0) * 0.25));
    }
  } else {
    base -= limb.evasionBonus || 0;
  }

  if (player.statuses.parasite) {
    base *= 1 - CONFIG.PARASITE_ACC_PENALTY;
  }
  if (player.statuses.blindedTurns > 0) {
    base *= 0.55;
  }

  return Math.max(0.15, Math.min(0.98, base));
}

export interface CombatPendingCoinFlip {
  enemyName: string;
  skillName: string;
  telegraphText: string;
  penaltyType: 'sever_limb' | 'heavy_bleed' | 'execute_damage';
  damageMultiplier: number;
}

export interface CombatTurnResult {
  logs: string[];
  enemyDefeated: boolean;
  playerDefeated: boolean;
  fledSuccess?: boolean;
  severedAnyLimb?: boolean;
  wasCrit?: boolean;
  lastDealtDmg?: number;
  lastTakenDmg?: number;
  particleType?: 'blood' | 'fire' | 'spark';
  targetLimbId?: string;
  weaponCategory?: WeaponCategory;
  vfxColor?: string;
  actorIdx?: number;
  pendingCoinFlip?: CombatPendingCoinFlip;
}

const DEFAULT_VFX_COLOR_BY_CATEGORY: Record<WeaponCategory, string> = {
  sword: '#e2e8f0',
  heavy_axe: '#d97706',
  dagger: '#7e22ce',
  staff: '#6b21a8',
  unarmed: '#dc2626',
};

export function getWeaponVfxMeta(
  weaponOrItemId?: string | null,
  fallbackCategory: WeaponCategory = 'unarmed',
  overrideColor?: string
): { weaponCategory: WeaponCategory; vfxColor: string } {
  if (weaponOrItemId) {
    const wpn = CONFIG.WEAPONS[weaponOrItemId];
    if (wpn) {
      const cat = wpn.weaponCategory || fallbackCategory;
      return {
        weaponCategory: cat,
        vfxColor: overrideColor || wpn.vfxColor || DEFAULT_VFX_COLOR_BY_CATEGORY[cat],
      };
    }
    const itm = CONFIG.ITEMS[weaponOrItemId];
    if (itm) {
      const cat = itm.weaponCategory || fallbackCategory;
      return {
        weaponCategory: cat,
        vfxColor: overrideColor || itm.vfxColor || DEFAULT_VFX_COLOR_BY_CATEGORY[cat],
      };
    }
  }
  return {
    weaponCategory: fallbackCategory,
    vfxColor: overrideColor || DEFAULT_VFX_COLOR_BY_CATEGORY[fallbackCategory],
  };
}

export function getSkillVfxMeta(
  skillId: string,
  equippedWeaponId?: string | null
): { weaponCategory: WeaponCategory; vfxColor: string } {
  if (skillId === 'whirlwind_slash' || skillId === 'en_garde') {
    return getWeaponVfxMeta(equippedWeaponId, 'sword');
  }
  if (skillId === 'hamstring_bind') {
    return getWeaponVfxMeta(equippedWeaponId, 'dagger', '#d97706');
  }
  if (
    skillId === 'holy_light' ||
    skillId === 'blessed_heal' ||
    skillId === 'divine_aegis' ||
    skillId === 'purification'
  ) {
    return { weaponCategory: 'staff', vfxColor: '#eab308' };
  }
  if (skillId === 'flesh_rend' || skillId === 'blood_pact' || skillId === 'blood_drain') {
    return { weaponCategory: 'dagger', vfxColor: '#991b1b' };
  }
  if (skillId === 'void_bite' || skillId === 'veil_of_blindness' || skillId === 'obliterate') {
    return { weaponCategory: 'staff', vfxColor: '#6b21a8' };
  }
  return getWeaponVfxMeta(equippedWeaponId, 'unarmed');
}

export function isEnemyWeaponLimbSevered(enemy: MapEnemyInstance, tpl: EnemyTemplate): boolean {
  const severedSet = new Set(enemy.severedLimbs || []);
  const limbMapByKey: Record<'rightArm' | 'leftArm', string[]> = {
    rightArm: ['right_arm', 'throne_ensor_right', 'tentacle_1'],
    leftArm: ['left_arm', 'throne_claw_left', 'tentacle_2'],
  };

  if (tpl.weaponLimb) {
    const candidateIds = limbMapByKey[tpl.weaponLimb];
    const matching = enemy.limbs.filter((l) => candidateIds.includes(l.id));
    if (matching.length > 0) {
      return matching.every((l) => l.hp <= 0 || severedSet.has(l.id));
    }
  }

  const weaponArms = enemy.limbs.filter((l) => l.isWeaponArm);
  if (weaponArms.length > 0) {
    return weaponArms.every((l) => l.hp <= 0 || severedSet.has(l.id));
  }
  return false;
}

/**
 * Diminishing Returns Armor Curve:
 * ArmorFactor = 1 / (1 + Armor / 50)
 * Supports both decimal limb.armor (0..0.9 -> 0..90 Armor pts) and direct Armor points (>= 1).
 */
export function computeArmorFactor(
  rawArmor: number = 0,
  ignoreArmor: boolean = false,
  armorShredded: boolean = false,
  armorPen: number = 0
): { armorPoints: number; armorFactor: number } {
  if (ignoreArmor || rawArmor <= 0 || armorPen >= 1) {
    return { armorPoints: 0, armorFactor: 1 };
  }
  let armorPoints = rawArmor > 0 && rawArmor <= 1 ? rawArmor * 100 : rawArmor;
  if (armorShredded) {
    armorPoints *= 1 - CONFIG.RED_VIAL_ARMOR_SHRED;
  }
  if (armorPen > 0) {
    armorPoints *= Math.max(0, 1 - armorPen);
  }
  armorPoints = Math.max(0, Math.round(armorPoints));
  const armorFactor = 1 / (1 + armorPoints / 50);
  return { armorPoints, armorFactor };
}

export interface LimbDamagePreview {
  minDmg: number;
  maxDmg: number;
  hitPct: number;
  critPct: number;
  armorPoints: number;
  armorReductionPct: number;
}

/**
 * Computes real-time Damage Preview (Min-Max Dmg, Hit %, Crit %, Current Armor) for the Combat Reticle Tooltip
 */
export function computeLimbDamagePreview(
  player: PlayerState,
  enemy: MapEnemyInstance,
  tpl: EnemyTemplate,
  limb: LimbConfig,
  actorIndex: number = 0
): LimbDamagePreview {
  const ally = actorIndex > 0 ? player.party[actorIndex - 1] || null : null;
  if (ally) {
    const allyWpn = getAllyEffectiveWeapon(ally);
    const hitChance = Math.max(0.25, Math.min(0.96, 0.86 + allyWpn.hitBonus - (limb.evasionBonus || 0)));
    const hitPct = Math.round(hitChance * 100);
    const isAllyStarving = !ally.isUndeadSummon && (ally.hunger || 0) >= 90;
    const critPct = isAllyStarving ? 0 : Math.round(allyWpn.critChance * 100);

    let mult = 1.0;
    if (!ally.isUndeadSummon && (ally.hunger || 0) >= 50) mult *= 0.75;
    if (ally.isUndeadSummon && !isPureTankSummon(ally)) {
      mult *= getUndeadSummonDmgMultiplier(player);
    }
    if (allyWpn.undeadDemonBonus && tpl.isUndeadOrDemon) {
      mult *= 1 + allyWpn.undeadDemonBonus;
    }
    if (allyWpn.limbBonusDmg && limb.id !== 'torso' && limb.id !== 'head') {
      mult *= 1 + allyWpn.limbBonusDmg;
    }
    if (tpl.slashResist && allyWpn.damageType === 'slash') {
      mult *= 1 - tpl.slashResist;
    }
    if (tpl.bluntWeakness && allyWpn.damageType === 'blunt') {
      mult *= 1 + tpl.bluntWeakness;
    }
    const isFireOrHoly = Boolean(allyWpn.burnDmg || allyWpn.undeadDemonBonus || allyWpn.id === 'holy_mother_mace');
    if (enemy.oilCovered && isFireOrHoly) {
      mult *= 2.5;
    }
    const activeShieldArm = enemy.limbs.find((l) => l.isShieldArm && l.hp > 0);
    if (activeShieldArm && (limb.id === 'torso' || limb.id === 'head')) {
      mult *= 0.2;
    }
    if (tpl.id === 'penitent_knight' && limb.id === 'head') {
      const leftLeg = enemy.limbs.find((l) => l.id === 'left_leg');
      if (leftLeg && leftLeg.hp <= 0) mult *= 1.35;
    }

    const ignoreArmor = allyWpn.damageType === 'true' || (allyWpn.armorPen || 0) >= 1.0;
    const isArmorShredded = (enemy.acidTurns || 0) > 0 || enemy.blindTurns > 0;
    const { armorPoints, armorFactor } = computeArmorFactor(
      limb.armor || 0,
      ignoreArmor,
      isArmorShredded,
      allyWpn.armorPen || 0
    );

    const minDmg = Math.max(1, Math.round(allyWpn.dmg[0] * mult * armorFactor));
    const maxDmg = Math.max(minDmg, Math.round(allyWpn.dmg[1] * mult * armorFactor));

    return {
      minDmg,
      maxDmg,
      hitPct,
      critPct,
      armorPoints,
      armorReductionPct: Math.round((1 - armorFactor) * 100),
    };
  }

  const wpn = getEffectiveWeapon(player);
  const hitPct = Math.round(computeLimbHitChance(player, enemy, tpl, limb) * 100);
  const isStarving90 = player.hunger >= 90;
  const critPct = isStarving90
    ? 0
    : player.statuses.bloodPactLevel >= 2
    ? 100
    : Math.round(wpn.critChance * 100);

  let mult = 1.0;
  if (player.bloodForgedWeapons?.includes(wpn.id)) mult *= 1.35;
  if (player.hexenStatNodes?.includes('atk_1')) mult *= 1.15;
  if ((player.stimulantBonusPct || 0) > 0) mult *= 1 + (player.stimulantBonusPct || 0);
  if ((player.silverOilTurns || 0) > 0 && tpl.isUndeadOrDemon) mult *= 1.35;
  if (player.hunger >= 50) mult *= 0.75;
  if (player.statuses.bloodPactLevel > 0) {
    mult *=
      player.statuses.bloodPactLevel === 1
        ? 2.0
        : player.statuses.bloodPactLevel === 2
        ? 2.3
        : 2.6;
  }
  if (wpn.undeadDemonBonus && tpl.isUndeadOrDemon) {
    mult *= 1 + wpn.undeadDemonBonus;
  }
  if (wpn.limbBonusDmg && limb.id !== 'torso' && limb.id !== 'head') {
    mult *= 1 + wpn.limbBonusDmg;
  }
  if (tpl.slashResist && wpn.damageType === 'slash') {
    mult *= 1 - tpl.slashResist;
  }
  if (tpl.bluntWeakness && wpn.damageType === 'blunt') {
    mult *= 1 + tpl.bluntWeakness;
  }
  const isFireOrHolyWeapon = Boolean(
    wpn.burnDmg || wpn.undeadDemonBonus || wpn.id === 'holy_mother_mace'
  );
  if (enemy.oilCovered && isFireOrHolyWeapon) {
    mult *= 2.5;
  }
  const activeShieldArm = enemy.limbs.find((l) => l.isShieldArm && l.hp > 0);
  if (activeShieldArm && (limb.id === 'torso' || limb.id === 'head')) {
    mult *= 0.2;
  }
  if (tpl.id === 'penitent_knight' && limb.id === 'head') {
    const leftLeg = enemy.limbs.find((l) => l.id === 'left_leg');
    if (leftLeg && leftLeg.hp <= 0) mult *= 1.35;
  }

  const ignoreArmor = wpn.damageType === 'true' || (wpn.armorPen || 0) >= 1.0;
  const isArmorShredded = (enemy.acidTurns || 0) > 0 || enemy.blindTurns > 0;
  const { armorPoints, armorFactor } = computeArmorFactor(
    limb.armor || 0,
    ignoreArmor,
    isArmorShredded,
    wpn.armorPen || 0
  );

  const minDmg = Math.max(1, Math.round(wpn.dmg[0] * mult * armorFactor));
  const maxDmg = Math.max(minDmg, Math.round(wpn.dmg[1] * mult * armorFactor));

  return {
    minDmg,
    maxDmg,
    hitPct,
    critPct,
    armorPoints,
    armorReductionPct: Math.round((1 - armorFactor) * 100),
  };
}

export interface LimbDebuffBadge {
  type: 'acid' | 'oil' | 'locked' | 'blind' | 'burn' | 'poison';
  label: string;
  turns: number;
  color: string;
}

/**
 * Returns active status/debuff badges with remaining turns for a specific enemy limb
 */
export function getLimbDebuffBadges(
  enemy: MapEnemyInstance,
  limbId: string
): LimbDebuffBadge[] {
  const badges: LimbDebuffBadge[] = [];
  const lockedTurns = enemy.lockedLimbIds?.[limbId] || 0;
  if (lockedTurns > 0) {
    badges.push({
      type: 'locked',
      label: 'KHÓA',
      turns: lockedTurns,
      color: '#38bdf8',
    });
  }
  const acidTurns = enemy.acidTurns || (enemy.blindTurns > 0 && enemy.blindTurns < 90 ? enemy.blindTurns : 0);
  if (acidTurns > 0) {
    badges.push({
      type: 'acid',
      label: 'AXIT',
      turns: acidTurns,
      color: '#f87171',
    });
  }
  if (enemy.oilCovered) {
    badges.push({
      type: 'oil',
      label: 'DẦU',
      turns: enemy.oilTurns || 3,
      color: '#c084fc',
    });
  }
  if (limbId === 'head' && enemy.blindTurns > 0) {
    badges.push({
      type: 'blind',
      label: 'MÙ',
      turns: enemy.blindTurns >= 90 ? 99 : enemy.blindTurns,
      color: '#fbbf24',
    });
  }
  if (limbId === 'torso' && (enemy.burnPerTurn || 0) > 0) {
    badges.push({
      type: 'burn',
      label: 'CHÁY',
      turns: enemy.burnTurns || 3,
      color: '#fb923c',
    });
  }
  if (limbId === 'torso' && (enemy.poisonPerTurn || 0) > 0 && (enemy.poisonTurns || 0) > 0) {
    badges.push({
      type: 'poison',
      label: 'ĐỘC',
      turns: enemy.poisonTurns || 3,
      color: '#4ade80',
    });
  }
  return badges;
}

export function applyLimbDamageToEnemy(
  player: PlayerState,
  enemy: MapEnemyInstance,
  tpl: EnemyTemplate,
  limb: LimbConfig,
  rawDmg: number,
  ignoreArmor: boolean,
  logs: string[],
  armorPen: number = 0
): { actualDmg: number; severedNow: boolean } {
  let mult = 1.0;

  const activeShieldArm = enemy.limbs.find((l) => l.isShieldArm && l.hp > 0);
  if (activeShieldArm && (limb.id === 'torso' || limb.id === 'head')) {
    mult *= 0.20;
    logs.push(
      tpl.id === 'dullahan_knight'
        ? 'Khiên Tháp Rỉ Máu ở Tay Trái của Kỵ Sĩ Vorath chặn mất 80% sát thương! Hãy phá vỡ Tay Trái trước!'
        : 'Khiên ở Tay Trái chặn mất 80% sát thương vào Thân và Đầu! Hãy phá vỡ Tay Trái trước!'
    );
  }

  if (tpl.id === 'penitent_knight' && limb.id === 'head') {
    const leftLeg = enemy.limbs.find((l) => l.id === 'left_leg');
    if (leftLeg && leftLeg.hp <= 0) {
      mult *= 1.35;
    }
  }

  const isArmorShredded = (enemy.acidTurns || 0) > 0 || enemy.blindTurns > 0;
  const { armorFactor } = computeArmorFactor(
    limb.armor || 0,
    ignoreArmor,
    isArmorShredded,
    armorPen
  );

  const finalDmg = Math.max(1, Math.round(rawDmg * mult * armorFactor));
  const prevHp = limb.hp;
  limb.hp = Math.max(0, limb.hp - finalDmg);

  if (limb.id !== 'torso') {
    const torso = enemy.limbs.find((l) => l.id === 'torso');
    if (torso && torso.hp > 0) {
      torso.hp = Math.max(1, torso.hp - Math.round(finalDmg * 0.35));
    }
  }

  let severedNow = false;
  if (prevHp > 0 && limb.hp <= 0) {
    severedNow = true;
    if (!enemy.severedLimbs.includes(limb.id)) {
      enemy.severedLimbs.push(limb.id);
    }
    player.stats.limbsSevered += 1;
    logs.push(`CHẶT ĐỨT LÌA [${limb.name}] của ${enemy.customName || tpl.name}!`);

    if (tpl.id === 'dullahan_knight' && limb.id === 'left_arm') {
      enemy.blindTurns = 99;
      enemy.telegraphing = false;
      logs.push('KHIÊN THÁP RỈ MÁU VỠ TAN! Kỵ Sĩ Tiên Phong Vorath mất hoàn toàn thế thủ che chắn và bị mù lòa!');
    }
    if (tpl.id === 'penitent_knight' && limb.id === 'left_leg') {
      logs.push('Hiệp Sĩ Chuộc Tội gãy Chân Trái, quỳ sụp xuống làm lộ hoàn toàn phần Đầu (95% Trúng)!');
    }
    if (tpl.id === 'ouroboros_serpent' && limb.id === 'coiling_body') {
      enemy.telegraphing = false;
      logs.push('Thân Cuộn của Trăn Khổng Lồ bị chém đứt! Đòn Nuốt Chửng bị phá hủy hoàn toàn!');
    }
    if (tpl.id === 'grand_abbess' && limb.id === 'right_arm') {
      enemy.telegraphing = false;
      logs.push('Tay Phải cầm Trượng Thánh Mẫu đã đứt! Đại Nữ Tu không thể niệm Ánh Sáng Phán Xét nữa!');
    }
    if ((tpl.id === 'demon_lord_vaelis' || tpl.id === 'vaelis') && limb.id === 'void_conduit') {
      enemy.stunTurns = Math.max(enemy.stunTurns, 1);
      enemy.telegraphing = false;
      logs.push('ỐNG DẪN HUYẾT MẠCH TỦY SỐNG VỠ TUNG! Vaelis mất khả năng tự hồi phục Sinh Lực và bị CHOÁNG 1 lượt!');
    }
  }

  return { actualDmg: finalDmg, severedNow };
}

export function executePlayerWeaponAttack(
  player: PlayerState,
  enemy: MapEnemyInstance,
  targetLimbId: string,
  rng: SeededRNG
): CombatTurnResult {
  const logs: string[] = [];
  const tpl = CONFIG.ENEMIES[enemy.templateId] || CONFIG.ENEMIES.fanatic_zealot;

  // Auto-redirect if the previously selected limb was already severed on an earlier turn
  let effectiveLimbId = targetLimbId;
  const requestedLimb = enemy.limbs.find((l) => l.id === effectiveLimbId);
  if (!requestedLimb || requestedLimb.hp <= 0) {
    const fallbackLimb =
      enemy.limbs.find((l) => l.id === 'torso' && l.hp > 0 && canTargetEnemyLimb(enemy, tpl, l.id).allowed) ||
      enemy.limbs.find((l) => l.hp > 0 && canTargetEnemyLimb(enemy, tpl, l.id).allowed) ||
      enemy.limbs.find((l) => l.hp > 0);
    if (fallbackLimb) {
      effectiveLimbId = fallbackLimb.id;
      logs.push(`Bộ phận cũ đã đứt lìa, tự động chuyển nhát chém sang [${fallbackLimb.name}]!`);
    }
  }

  const targetCheck = canTargetEnemyLimb(enemy, tpl, effectiveLimbId);
  if (!targetCheck.allowed) {
    return {
      logs: [targetCheck.reason || 'Không thể nhắm vào bộ phận này.'],
      enemyDefeated: false,
      playerDefeated: false,
    };
  }

  const limb = enemy.limbs.find((l) => l.id === effectiveLimbId)!;
  const wpn = getEffectiveWeapon(player);
  const hitChance = computeLimbHitChance(player, enemy, tpl, limb);

  player.statuses.guarding = false;
  let severedAnyLimb = false;
  let wasCrit = false;
  let totalDealt = 0;
  let particleType: 'blood' | 'fire' | 'spark' = 'blood';

  if (!rng.chance(hitChance)) {
    logs.push(`Bạn vung [${wpn.name}] nhắm vào [${limb.name}] nhưng sượt qua khoảng không!`);
  } else {
    let dmg = rng.int(wpn.dmg[0], wpn.dmg[1]);

    if (player.bloodForgedWeapons?.includes(wpn.id)) {
      dmg = Math.round(dmg * 1.35);
    }
    if (player.hexenStatNodes?.includes('atk_1')) {
      dmg = Math.round(dmg * 1.15);
    }
    if ((player.stimulantBonusPct || 0) > 0) {
      dmg = Math.round(dmg * (1 + player.stimulantBonusPct));
      player.stimulantBonusPct = 0;
      logs.push('Huyết Thanh Kích Thích sục sôi trong huyết quản, đẩy bùng uy lực đòn đánh!');
    }
    if ((player.silverOilTurns || 0) > 0) {
      player.silverOilTurns = Math.max(0, player.silverOilTurns - 1);
      if (tpl.isUndeadOrDemon) {
        dmg = Math.round(dmg * 1.35);
        logs.push('Dầu Kiếm Bạc lóe sáng chém xuyên thân xác tà ma!');
      }
    }

    // Cursed Weapon Backfire when Lý Trí < 40
    if ((wpn.isCursed || player.cursedLockedWeapon === wpn.id) && player.mind < 40 && rng.chance(0.35)) {
      player.hp = Math.max(1, player.hp - 14);
      player.mind = Math.max(0, player.mind - 8);
      logs.push(`Lời nguyền trên [${wpn.name}] cắn ngược vào tay chủ nhân giữa cơn hoảng loạn!`);
    }

    // Hunger >= 50 reduces physical damage by 25%
    if (player.hunger >= 50) {
      dmg = Math.round(dmg * 0.75);
      logs.push('Cơn đói cồn cào khiến cánh tay bạn run rẩy, lực chém suy giảm nặng nề!');
    }

    // Hunger >= 90 disables Critical Hits & Evasion completely
    const isStarving90 = player.hunger >= 90;
    if (isStarving90) {
      logs.push('Đói lả đến mờ mắt, bạn không còn đủ sức tung đòn hiểm hay né tránh!');
    }

    let forceCrit = false;
    let hadBloodPactLv3 = false;
    if (player.statuses.bloodPactLevel > 0) {
      const pactMult = player.statuses.bloodPactLevel === 1 ? 2.0 : player.statuses.bloodPactLevel === 2 ? 2.3 : 2.6;
      dmg = Math.round(dmg * pactMult);
      if (player.statuses.bloodPactLevel >= 2 && !isStarving90) forceCrit = true;
      if (player.statuses.bloodPactLevel >= 3) {
        hadBloodPactLv3 = true;
      }
      player.statuses.bloodPactLevel = 0;
      logs.push('Huyết Ước bùng nổ cường hóa đòn chém!');
    }

    if (wpn.undeadDemonBonus && tpl.isUndeadOrDemon) {
      dmg = Math.round(dmg * (1 + wpn.undeadDemonBonus));
    }
    if (wpn.limbBonusDmg && limb.id !== 'torso' && limb.id !== 'head') {
      dmg = Math.round(dmg * (1 + wpn.limbBonusDmg));
    }
    if (tpl.slashResist && wpn.damageType === 'slash') {
      dmg = Math.round(dmg * (1 - tpl.slashResist));
      logs.push('Khung xương đen kháng bớt sát thương chém của lưỡi kiếm!');
    }
    if (tpl.bluntWeakness && wpn.damageType === 'blunt') {
      dmg = Math.round(dmg * (1 + tpl.bluntWeakness));
      logs.push('Vũ khí hạng nặng đập nát cấu trúc xương đen (+50% sát thương)!');
    }

    // Elemental Reaction: Fire / Holy attack against Oil-covered target -> 2.5x Damage + 150 Burn/turn for 3 turns!
    const hasFireCoat = (player.fireCoatTurns || 0) > 0;
    const hasPoisonCoat = (player.poisonCoatTurns || 0) > 0;
    const isFireOrHoly = Boolean(
      wpn.burnDmg || wpn.undeadDemonBonus || wpn.id === 'holy_mother_mace' || hasFireCoat
    );
    if (enemy.oilCovered && isFireOrHoly) {
      dmg = Math.round(dmg * 2.5);
      enemy.oilCovered = false;
      enemy.oilTurns = 0;
      enemy.burnPerTurn = Math.max(enemy.burnPerTurn || 0, 150);
      enemy.burnTurns = 3;
      particleType = 'fire';
      logs.push('Tinh dầu bùng cháy trước đòn Lửa/Thánh, nhân 2.5x sát thương và thiêu đốt 150 sát thương mỗi lượt!');
    }

    const effectiveCritChance = isStarving90 ? 0 : wpn.critChance;
    if (!isStarving90 && (forceCrit || rng.chance(effectiveCritChance))) {
      wasCrit = true;
      dmg = Math.round(dmg * 1.5);
      if (particleType === 'blood') particleType = 'spark';
    }

    if (
      wpn.headExecuteChance &&
      limb.id === 'head' &&
      tpl.tier === 'normal' &&
      rng.chance(wpn.headExecuteChance)
    ) {
      dmg = limb.hp + 999;
      logs.push('LƯỠI HÁI ĐEN XỬ TỬ TỨC KHẮC!');
    }

    const ignoreArmor = wpn.damageType === 'true' || (wpn.armorPen || 0) >= 1.0;

    const { actualDmg, severedNow } = applyLimbDamageToEnemy(
      player,
      enemy,
      tpl,
      limb,
      dmg,
      ignoreArmor,
      logs,
      wpn.armorPen || 0
    );
    totalDealt += actualDmg;

    logs.unshift(
      `[${wpn.name}] giáng vào [${limb.name}] gây ${actualDmg} sát thương${wasCrit? '(CHÍ MẠNG!)': ''}!`
    );

    if (severedNow) {
      severedAnyLimb = true;
      if (wpn.limbSeverHeal) {
        player.hp = Math.min(player.maxHp, player.hp + wpn.limbSeverHeal);
        logs.push(`Đao Phay Đồ Tể hấp thụ máu tươi hồi +${wpn.limbSeverHeal} Sinh Lực!`);
      }
    }
    if (hadBloodPactLv3 && (severedNow || isEnemyDead(enemy))) {
      player.hp = Math.min(player.maxHp, player.hp + 12);
      logs.push('Huyết Ước hấp thụ máu tươi từ vết cắt chí mạng, hồi +12 Sinh Lực!');
    }

    if (wpn.bleedDmg) {
      enemy.bleedPerTurn = Math.max(enemy.bleedPerTurn, wpn.bleedDmg);
    }
    if (wpn.burnDmg && !enemy.oilCovered) {
      enemy.burnPerTurn = Math.max(enemy.burnPerTurn, wpn.burnDmg);
      enemy.burnTurns = Math.max(enemy.burnTurns || 0, 2);
      particleType = 'fire';
    }
    if (hasPoisonCoat) {
      player.poisonCoatTurns = Math.max(0, (player.poisonCoatTurns || 0) - 1);
      const pDot = Math.max(65, Math.round(getEnemyMaxTotalHp(enemy) * 0.05));
      enemy.poisonPerTurn = Math.max(enemy.poisonPerTurn || 0, pDot);
      enemy.poisonTurns = Math.max(enemy.poisonTurns || 0, 3);
      logs.push(`Độc tẩm trên vũ khí ngấm vào máu, rút ${pDot} Sinh Lực mỗi lượt (3 lượt)!`);
    }
    if (hasFireCoat) {
      player.fireCoatTurns = Math.max(0, (player.fireCoatTurns || 0) - 1);
      const fDot = Math.max(70, Math.round(getEnemyMaxTotalHp(enemy) * 0.05));
      enemy.burnPerTurn = Math.max(enemy.burnPerTurn || 0, fDot);
      enemy.burnTurns = Math.max(enemy.burnTurns || 0, 3);
      particleType = 'fire';
      logs.push(`Dầu Lửa trên vũ khí bùng cháy, thiêu đốt ${fDot} Sinh Lực mỗi lượt!`);
    }

    // Elemental/Physical Reaction: Blunt weapon hitting an Armor-Shredded (Red Vial) target gains +30% Stun chance (1 turn)
    const isArmorShredded = (enemy.acidTurns || 0) > 0 || enemy.blindTurns > 0;
    const bonusBluntStun = wpn.damageType === 'blunt' && isArmorShredded ? 0.30 : 0;
    const totalStunChance = (wpn.stunChance || 0) + bonusBluntStun;
    if (totalStunChance > 0 && rng.chance(totalStunChance)) {
      enemy.stunTurns = Math.max(enemy.stunTurns, 1);
      particleType = 'spark';
      logs.push(
        bonusBluntStun > 0
          ? 'Cú đập giáng thẳng vào lớp giáp mục nát, khiến mục tiêu CHOÁNG trong một nhịp!'
          : 'Cú đập ngàn cân làm mục tiêu CHOÁNG trong một nhịp!'
      );
    }
  }

  // Party Allies Follow-Up Strike (Pure Tanks raise protective shield instead of attacking)
  for (const ally of player.party) {
    if (ally.hp <= 0 || isEnemyDead(enemy)) continue;
    if ((ally.stunnedTurns || 0) > 0) {
      ally.stunnedTurns = Math.max(0, (ally.stunnedTurns || 0) - 1);
      logs.push(`Đồng đội [${ally.name}] đang bị Xúc Tu Hư Vô trói chặt, mất lượt hành động!`);
      continue;
    }
    if (isPureTankSummon(ally)) {
      ally.guarding = true;
      if (ally.mind < 30) {
        logs.push(
          `[BẢN NĂNG HỘ VỆ] [${ally.name}] co mình vào thế thủ bản năng nhưng không đủ tâm lực để dựng khiên hộ thể cho đồng đội!`
        );
      } else {
        ally.divineAegisTurns = Math.max(ally.divineAegisTurns || 0, 1);
        player.statuses.divineAegisTurns = Math.max(player.statuses.divineAegisTurns || 0, 1);
        player.statuses.divineAegisLevel = Math.max(player.statuses.divineAegisLevel || 0, 1);
        logs.push(`[${ally.name}] dựng màn chắn linh hồn bảo vệ đội hình & thu hút sát thương!`);
      }
      continue;
    }
    const allyLimb =
      enemy.limbs.find((l) => l.id === effectiveLimbId && l.hp > 0 && canTargetEnemyLimb(enemy, tpl, l.id).allowed) ||
      enemy.limbs.find((l) => l.hp > 0 && canTargetEnemyLimb(enemy, tpl, l.id).allowed) ||
      enemy.limbs.find((l) => l.hp > 0);
    if (allyLimb) {
      const allyWpn = getAllyEffectiveWeapon(ally);
      let allyDmg = rng.int(allyWpn.dmg[0], allyWpn.dmg[1]);
      if (!ally.isUndeadSummon && (ally.hunger || 0) >= 50) allyDmg = Math.round(allyDmg * 0.75);
      if (ally.isUndeadSummon && !isPureTankSummon(ally)) {
        allyDmg = Math.round(allyDmg * getUndeadSummonDmgMultiplier(player));
      }
      const sub = applyLimbDamageToEnemy(player, enemy, tpl, allyLimb, allyDmg, false, logs);
      totalDealt += sub.actualDmg;
      if (sub.severedNow) severedAnyLimb = true;
      logs.push(`Đồng đội [${ally.name}] bồi thêm nhát chém vào [${allyLimb.name}] gây ${sub.actualDmg} sát thương!`);
    }
  }

  const out = finishCombatRoundWithEnemyTurn(player, enemy, tpl, rng, logs, severedAnyLimb, wasCrit);
  const wpnVfx = getWeaponVfxMeta(wpn.id);
  out.lastDealtDmg = totalDealt;
  out.particleType = particleType;
  out.targetLimbId = effectiveLimbId;
  out.weaponCategory = wpnVfx.weaponCategory;
  out.vfxColor = wpnVfx.vfxColor;
  out.actorIdx = 0;
  return out;
}

/**
 * Combat `Trò Chuyện (Talk)` Action
 */
export function executeCombatTalk(
  player: PlayerState,
  enemy: MapEnemyInstance,
  rng: SeededRNG
): CombatTurnResult {
  const logs: string[] = [];
  const tpl = CONFIG.ENEMIES[enemy.templateId] || CONFIG.ENEMIES.fanatic_zealot;

  if (enemy.talked) {
    logs.push(`${enemy.customName || tpl.name} gầm gừ khước từ mọi lời nói của bạn!`);
  } else {
    enemy.talked = true;
    if (tpl.id === 'demon_lord_vaelis') {
      player.questFlags = player.questFlags || {
        vaelisTalked: false,
        vaelisDefeated: false,
        curedPetrification: false,
        child13Rescued: false,
        child12Resolved: false,
        brokenKnightResolved: false,
        glassLadyResolved: false,
        smithUsed: false,
        physicianTalked: false,
        chroniclerTalked: false,
      };
      player.questFlags.vaelisTalked = true;
      enemy.telegraphing = false;
      enemy.stunTurns = Math.max(enemy.stunTurns, 1);
      logs.push(
        'HIỆP SĨ TRƯỞNG VAELIS khựng lại giữa vũng máu: “Ngươi xuống tận đây... đừng để lũ giáo sĩ lừa dối! Ta kéo cả Lâu Đài Hắc Ám giáng xuống để làm NẮP HẦM đè lên Vết Rách Vực Sao! Nếu ta ngã xuống mà không ai giữ Lõi Khóa, Chướng Khí sẽ nuốt sạch Đại Giáo Đường...”'
      );
    } else if (
      tpl.id === 'penitent_knight' ||
      tpl.id === 'executioner_paladin' ||
      tpl.id === 'dullahan_knight' ||
      tpl.id === 'hollowed_void_walker'
    ) {
      const head = enemy.limbs.find((l) => l.id === 'head');
      if (head) {
        head.armor = 0;
        head.evasionBonus = 0;
      }
      logs.push(
        `Bạn lăng mạ lời thề hiệp sĩ giả tạo của [${tpl.name}]! Trong cơn phẫn nộ mù quáng, hắn tự giật tung mũ giáp bảo vệ phần Đầu!`
      );
    } else if (
      tpl.id === 'rotting_priest' ||
      tpl.id === 'fanatic_zealot' ||
      tpl.id === 'weeping_inquisitor' ||
      tpl.id === 'grand_abbess'
    ) {
      enemy.stunTurns = Math.max(enemy.stunTurns, 1);
      enemy.telegraphing = false;
      logs.push(
        `Bạn chất vấn về những giọt máu đen trên tượng Thánh Mẫu! [${enemy.customName || tpl.name}] bàng hoàng ôm đầu hoài nghi đức tin, khựng hẳn một nhịp!`
      );
    } else {
      enemy.blindTurns = Math.max(enemy.blindTurns, 1);
      logs.push(
        `Bạn hét lớn đánh lạc hướng [${enemy.customName || tpl.name}], khiến tầm nhìn của nó chao đảo!`
      );
    }
  }

  return finishCombatRoundWithEnemyTurn(player, enemy, tpl, rng, logs, false, false);
}

export function executePlayerSkill(
  player: PlayerState,
  enemy: MapEnemyInstance,
  skillId: string,
  targetLimbId: string,
  rng: SeededRNG
): CombatTurnResult {
  const logs: string[] = [];
  try {
    const tpl = CONFIG.ENEMIES[enemy.templateId] || CONFIG.ENEMIES.fanatic_zealot;
    const skill = CONFIG.SKILLS.find((s) => s.id === skillId);
    player.skillLevels = player.skillLevels || {};
    enemy.lockedLimbIds = enemy.lockedLimbIds || {};
    enemy.severedLimbs = enemy.severedLimbs || [];
    const lv = player.skillLevels[skillId] || 0;

    if (!skill || lv <= 0) {
      return { logs: ['Bạn chưa học kỹ năng này!'], enemyDefeated: false, playerDefeated: false };
    }
    const holyCheck = canUseHolySkill(player, skill);
    if (!holyCheck.allowed) {
      return {
        logs: [holyCheck.reason || `${HOLY_MOTHER_REFUSAL_MSG}`],
        enemyDefeated: false,
        playerDefeated: false,
      };
    }
    if (player.mind < skill.mindCost) {
      return { logs: [`Không đủ Lý Trí (Cần ${skill.mindCost} Lý Trí)!`], enemyDefeated: false, playerDefeated: false };
    }
    if (skill.hpCost && player.hp <= skill.hpCost) {
      return { logs: ['Máu quá thấp để hiến tế!'], enemyDefeated: false, playerDefeated: false };
    }

    player.mind = Math.max(0, player.mind - skill.mindCost);
    if (skill.hpCost) {
      player.hp = Math.max(1, player.hp - skill.hpCost);
    }
    if (skill.branch === 'Huyết Quỷ') {
      banHolyMother(player);
    }
    if (skill.corruptionGain) {
      player.corruption = Math.min(100, player.corruption + skill.corruptionGain);
      syncCorruptionHolyBan(player);
      checkCorruptionDiegeticWarning(player, logs);
    }

    const limb =
      enemy.limbs.find((l) => l.id === targetLimbId && l.hp > 0) ||
      enemy.limbs.find((l) => l.id === 'torso' && l.hp > 0) ||
      enemy.limbs.find((l) => l.hp > 0) ||
      enemy.limbs[0];

    let severedAny = false;
    let dealt = 0;
    let wasCrit = false;

    if (skillId === 'whirlwind_slash') {
      const wpn = getEffectiveWeapon(player);
      const mult = lv === 1 ? 1.0 : lv === 2 ? 1.2 : 1.45;
      const baseDmg = Math.round(rng.int(wpn.dmg[0], wpn.dmg[1]) * mult);
      const torso = enemy.limbs.find((l) => l.id === 'torso' && l.hp > 0);
      const arms = enemy.limbs.filter((l) => (l.isWeaponArm || l.isShieldArm || l.isTentacle) && l.hp > 0);
      const targets = [
        ...(torso ? [torso] : []),
        ...arms.slice(0, lv === 1 ? 1 : lv === 2 ? 2 : 4),
      ];
      const finalTargets = targets.length > 0 ? targets : limb ? [limb] : [];
      logs.push(`Thi triển [Nhát Chém Xoáy] quét qua ${finalTargets.length} bộ phận!`);
      for (const t of finalTargets) {
        const res = applyLimbDamageToEnemy(player, enemy, tpl, t, baseDmg, false, logs);
        dealt += res.actualDmg;
        if (res.severedNow) severedAny = true;
      }
      if (lv >= 3) enemy.bleedPerTurn = Math.max(enemy.bleedPerTurn || 0, 160);
    } else if (skillId === 'hamstring_bind' && limb) {
      const lockTurns = lv === 1 ? 2 : 3;
      const dmg = lv === 1 ? 180 : lv === 2 ? 260 : 350;
      enemy.lockedLimbIds[limb.id] = lockTurns;
      let secondLockedName: string | null = null;
      if (lv >= 3) {
        const secondLimb =
          enemy.limbs.find(
            (l) => l.id !== limb.id && l.hp > 0 && (l.isWeaponArm || l.isShieldArm || l.isTentacle)
          ) || enemy.limbs.find((l) => l.id !== limb.id && l.hp > 0);
        if (secondLimb) {
          enemy.lockedLimbIds[secondLimb.id] = lockTurns;
          secondLockedName = secondLimb.name;
        }
      }
      if (lv >= 2) limb.armor = Math.max(0, (limb.armor || 0) * 0.5);
      const res = applyLimbDamageToEnemy(player, enemy, tpl, limb, dmg, false, logs);
      dealt += res.actualDmg;
      if (res.severedNow) severedAny = true;
      logs.push(
        secondLockedName
          ? `[Trói Gân] khóa chặt [${limb.name}] và [${secondLockedName}] trong ${lockTurns} lượt, gây ${res.actualDmg} sát thương!`
          : `[Trói Gân] khóa chặt [${limb.name}] trong ${lockTurns} lượt và gây ${res.actualDmg} sát thương!`
      );
    } else if (skillId === 'holy_light' && limb) {
      let dmg = lv === 1 ? rng.int(450, 600) : lv === 2 ? rng.int(600, 780) : rng.int(780, 1000);
      if (player.equippedShield === 'aegis_of_order') {
        dmg = Math.round(dmg * 1.3);
      }
      if (enemy.oilCovered) {
        dmg = Math.round(dmg * 2.5);
        enemy.oilCovered = false;
        enemy.oilTurns = 0;
        enemy.burnPerTurn = Math.max(enemy.burnPerTurn || 0, 150);
        enemy.burnTurns = 3;
        logs.push('Thánh Quang kích nổ lớp Tinh Dầu, nhân 2.5x sát thương và thiêu đốt dữ dội!');
      }
      const res = applyLimbDamageToEnemy(player, enemy, tpl, limb, dmg, lv >= 3, logs);
      dealt += res.actualDmg;
      if (res.severedNow) severedAny = true;
      if (lv >= 2) enemy.blindTurns = Math.max(enemy.blindTurns || 0, 1);
      logs.push(`[Thánh Quang] giáng xuống [${limb.name}] gây ${res.actualDmg} sát thương Thánh!`);
    } else if (skillId === 'blessed_heal') {
      const heal = lv === 1 ? 45 : lv === 2 ? 65 : 90;
      player.hp = Math.min(player.maxHp, player.hp + heal);
      player.statuses.bleeding = false;
      if (lv >= 2) {
        player.limbs.infected = { leftArm: false, rightArm: false, leftLeg: false, rightLeg: false };
      }
      if (lv >= 3) {
        player.statuses.blessedArmorTurns = Math.max(player.statuses.blessedArmorTurns || 0, 2);
      }
      logs.push(
        lv >= 3
          ? `[Phép Lành] khép miệng vết thương, hồi +${heal} Sinh Lực và tăng +20% Giáp trong 2 lượt!`
          : `[Phép Lành] khép miệng vết thương, hồi +${heal} Sinh Lực.`
      );
    } else if (skillId === 'divine_aegis') {
      player.statuses.divineAegisTurns = lv === 1 ? 2 : 3;
      player.statuses.divineAegisLevel = lv;
      player.statuses.guarding = true;
      logs.push(`[Hộ Thể] bao bọc cơ thể bằng khiên thánh trong ${player.statuses.divineAegisTurns} lượt!`);
    } else if (skillId === 'purification') {
      const heal = lv === 1 ? 15 : lv === 2 ? 30 : 45;
      player.hp = Math.min(player.maxHp, player.hp + heal);
      if (lv >= 3) player.mind = Math.min(player.maxMind, player.mind + 15);
      player.statuses.poisoned = false;
      player.statuses.parasite = false;
      player.statuses.blindedTurns = 0;
      player.limbs.infected = { leftArm: false, rightArm: false, leftLeg: false, rightLeg: false };
      if (lv >= 2) player.statuses.statusImmunityTurns = lv;
      logs.push(`[Thanh Tẩy] trục xuất toàn bộ ký sinh, độc tố và hồi +${heal} Sinh Lực!`);
    } else if (skillId === 'flesh_rend' && limb) {
      const dmg = lv === 1 ? 350 : lv === 2 ? 480 : 620;
      const bleed = lv === 1 ? 180 : lv === 2 ? 250 : 320;
      if (lv >= 3) {
        limb.armor = Math.max(0, (limb.armor || 0) * 0.6);
      }
      const res = applyLimbDamageToEnemy(player, enemy, tpl, limb, dmg, false, logs);
      dealt += res.actualDmg;
      if (res.severedNow) severedAny = true;
      enemy.bleedPerTurn = Math.max(enemy.bleedPerTurn || 0, bleed);
      logs.push(`[Xé Xác] cào toạc [${limb.name}] gây ${res.actualDmg} sát thương cùng vết rách chảy máu!`);
    } else if (skillId === 'blood_pact') {
      player.statuses.bloodPactLevel = lv;
      logs.push('[Huyết Ước] hiến máu thức tỉnh cơn cuồng sát cho đòn đánh kế tiếp!');
    } else if (skillId === 'blood_drain' && limb) {
      let dmg = lv === 1 ? 380 : lv === 2 ? 520 : 680;
      let heal = lv === 1 ? 25 : lv === 2 ? 38 : 55;
      if (lv >= 2 && (enemy.bleedPerTurn || 0) > 0) {
        dmg = Math.round(dmg * 1.5);
        heal = Math.round(heal * 1.5);
      }
      const res = applyLimbDamageToEnemy(player, enemy, tpl, limb, dmg, false, logs);
      dealt += res.actualDmg;
      if (res.severedNow) severedAny = true;
      player.hp = Math.min(player.maxHp, player.hp + heal);
      logs.push(`[Hút Máu] rút ${res.actualDmg} máu từ [${limb.name}] và hồi +${heal} Sinh Lực!`);
    } else if (skillId === 'void_bite' && limb) {
      const dmg = lv === 1 ? 500 : lv === 2 ? 680 : 880;
      const res = applyLimbDamageToEnemy(player, enemy, tpl, limb, dmg, true, logs);
      dealt += res.actualDmg;
      if (res.severedNow) severedAny = true;
      if (lv >= 3) {
        enemy.telegraphing = false;
        enemy.telegraphCoinFlip = false;
      }
      logs.push(`[Hư Vô Cắn] nghiền nát không gian tại [${limb.name}] gây ${res.actualDmg} sát thương chuẩn xuyên giáp!`);
    } else if (skillId === 'veil_of_blindness') {
      enemy.blindTurns = Math.max(enemy.blindTurns || 0, lv === 1 ? 2 : 3);
      if (lv >= 2) {
        player.statuses.veilEvasionTurns = Math.max(player.statuses.veilEvasionTurns || 0, lv === 2 ? 2 : 3);
      }
      if (lv >= 3) {
        enemy.telegraphing = false;
        enemy.telegraphCoinFlip = false;
      }
      logs.push(`[Che Mắt] phủ sương mù hư vô làm mù quái vật trong ${enemy.blindTurns} lượt!`);
    } else if (skillId === 'obliterate' && limb) {
      const threshold = lv === 1 ? 400 : lv === 2 ? 650 : 900;
      const fallbackDmg = lv === 1 ? 450 : lv === 2 ? 620 : 800;
      const dmgToDeal = limb.hp <= threshold ? limb.hp + 999 : fallbackDmg;
      const res = applyLimbDamageToEnemy(player, enemy, tpl, limb, dmgToDeal, true, logs);
      dealt += res.actualDmg;
      if (res.severedNow) severedAny = true;
      if (limb.hp <= 0) {
        logs.push(`[Xóa Sổ] XÓA SẠCH SỰ TỒN TẠI của [${limb.name}]!`);
      } else {
        limb.armor = 0;
        if (lv >= 3) {
          enemy.lockedLimbIds[limb.id] = Math.max(enemy.lockedLimbIds[limb.id] || 0, 1);
          logs.push(
            `[Xóa Sổ] giáng ${res.actualDmg} sát thương chuẩn và nghiền nát hoàn toàn lớp giáp của [${limb.name}]! Bộ phận bị khóa cứng 1 lượt!`
          );
        } else {
          logs.push(
            `[Xóa Sổ] giáng ${res.actualDmg} sát thương chuẩn và nghiền nát hoàn toàn lớp giáp của [${limb.name}]!`
          );
        }
      }
    } else if (skillId === 'en_garde' && limb) {
      const wpn = getEffectiveWeapon(player);
      const mult = lv === 1 ? 1.0 : lv === 2 ? 1.3 : 1.6;
      const isEnGardeCrit = lv >= 3 && player.hunger < 90;
      const baseDmg = Math.round(rng.int(wpn.dmg[0], wpn.dmg[1]) * mult * (isEnGardeCrit ? 1.5 : 1.0));
      if (isEnGardeCrit) wasCrit = true;
      player.statuses.guarding = true;
      player.statuses.enGardeTurns = Math.max(player.statuses.enGardeTurns || 0, 1);
      player.statuses.enGardeLevel = Math.max(player.statuses.enGardeLevel || 0, lv);
      const res = applyLimbDamageToEnemy(player, enemy, tpl, limb, baseDmg, false, logs);
      dealt += res.actualDmg;
      if (res.severedNow) severedAny = true;
      logs.push(
        `[Thế Thủ Phản Kích] vừa giơ kiếm phòng thủ chặt chẽ vừa phản chém vào [${limb.name}] gây ${res.actualDmg} sát thương${wasCrit ? ' (CHÍ MẠNG!)' : ''}!`
      );
    }

    const out = finishCombatRoundWithEnemyTurn(player, enemy, tpl, rng, logs, severedAny, wasCrit);
    const skVfx = getSkillVfxMeta(skillId, getEffectiveWeapon(player).id);
    out.lastDealtDmg = dealt;
    out.weaponCategory = skVfx.weaponCategory;
    out.vfxColor = skVfx.vfxColor;
    out.actorIdx = 0;
    return out;
  } catch (err) {
    console.error('executePlayerSkill error:', err);
    return {
      logs: [...logs, 'Năng lượng kỹ năng va chạm dữ dội trong bóng tối!'],
      enemyDefeated: isEnemyDead(enemy),
      playerDefeated: player.hp <= 0,
    };
  }
}

export function executeCombatItem(
  player: PlayerState,
  enemy: MapEnemyInstance,
  itemId: string,
  rng: SeededRNG
): CombatTurnResult {
  const logs: string[] = [];
  const tpl = CONFIG.ENEMIES[enemy.templateId] || CONFIG.ENEMIES.fanatic_zealot;
  const count = player.inventory[itemId] || 0;
  if (count <= 0) {
    return { logs: ['Bạn không còn vật phẩm này!'], enemyDefeated: false, playerDefeated: false };
  }

  const item = CONFIG.ITEMS[itemId];
  if (!item || !item.combatUsable) {
    return { logs: ['Vật phẩm này không thể dùng trong trận đấu!'], enemyDefeated: false, playerDefeated: false };
  }

  player.inventory[itemId] = count - 1;
  let severedAny = false;
  let dealt = 0;
  let wasCrit = false;

  if (itemId === 'brown_vial') {
    const dmg = rng.int(CONFIG.BROWN_VIAL_MIN_DMG, CONFIG.BROWN_VIAL_MAX_DMG);
    const torso = enemy.limbs.find((l) => l.id === 'torso' && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
    logs.push(`Bạn ném [Lọ Nâu] phát nổ kinh hoàng (${dmg} sát thương)!`);

    if (tpl.id === 'ouroboros_serpent' && enemy.telegraphing) {
      enemy.telegraphing = false;
      const head = enemy.limbs.find((l) => l.id === 'head');
      if (head && head.hp > 0) {
        applyLimbDamageToEnemy(player, enemy, tpl, head, dmg, true, logs);
      }
      logs.push('Lọ Nâu nổ tung ngay trong họng Trăn Khổng Lồ, phá tan đòn Nuốt Chửng!');
    }

    const res = applyLimbDamageToEnemy(player, enemy, tpl, torso, dmg, true, logs);
    dealt += res.actualDmg;
    if (res.severedNow) severedAny = true;

    for (const l of enemy.limbs) {
      if (l.id !== 'torso' && l.hp > 0 && l.hp <= 420) {
        const sub = applyLimbDamageToEnemy(player, enemy, tpl, l, l.hp + 50, true, logs);
        if (sub.severedNow) severedAny = true;
      }
    }
  } else if (itemId === 'red_vial') {
    enemy.blindTurns = Math.max(enemy.blindTurns, CONFIG.RED_VIAL_BLIND_TURNS);
    enemy.acidTurns = Math.max(enemy.acidTurns || 0, 3);
    const head = enemy.limbs.find((l) => l.id === 'head' && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
    for (const l of enemy.limbs) {
      l.armor = (l.armor || 0) * (1 - CONFIG.RED_VIAL_ARMOR_SHRED);
    }
    const sub = applyLimbDamageToEnemy(player, enemy, tpl, head, 190, true, logs);
    dealt += sub.actualDmg;
    logs.push(
      `Bạn tạt [Lọ Đỏ] vào Đầu ${tpl.name}! Axit ăn mòn làm mục tiêu mù lòa và rạn nứt giáp!`
    );
    if (tpl.id === 'grand_abbess' && enemy.telegraphing) {
      enemy.telegraphing = false;
      logs.push('Đại Nữ Tu ôm mặt gào thét, đòn Ánh Sáng Phán Xét bị hủy bỏ!');
    }
  } else if (itemId === 'white_vial') {
    player.statuses.parasite = false;
    player.statuses.poisoned = false;
    player.limbs.infected = { leftArm: false, rightArm: false, leftLeg: false, rightLeg: false };
    logs.push('Bạn uống [Thuốc Giải Độc]: Tiêu diệt sạch Ký Sinh Trùng Hư Vô, xóa Độc tố và Nhiễm trùng!');
  } else if (itemId === 'purple_vial') {
    enemy.oilCovered = true;
    enemy.oilTurns = 3;
    if (tpl.tier === 'normal' && canPlayerFlee(player)) {
      logs.push('[Lọ Tím] phủ màn khói đặc giúp bạn thoát khỏi giao tranh an toàn!');
      return {
        logs,
        enemyDefeated: false,
        playerDefeated: false,
        fledSuccess: true,
      };
    } else {
      logs.push(`Bạn ném [Lọ Tím]: ${tpl.name} bị thấm đẫm lớp tinh dầu dễ cháy.`);
    }
  } else if (itemId === 'rotten_meat') {
    if (tpl.isBeast) {
      enemy.stunTurns = Math.max(enemy.stunTurns, 1);
      enemy.telegraphing = false;
      logs.push(`Bạn ném [Thịt Thối]! Bản năng dã thú khiến ${tpl.name} cúi xuống ngấu nghiến, bỏ lỡ nhịp tấn công!`);
    } else {
      logs.push(`Bạn ném [Thịt Thối] nhưng ${tpl.name} không phải loài Quái thú nên không mắc bẫy!`);
    }
  } else if (itemId === 'silver_sword_oil') {
    player.silverOilTurns = 6;
    logs.push('Bạn thoa [Dầu Kiếm Bạc] lên lưỡi thép, ánh bạc lạnh lẽo sắc bén hẳn lên.');
  } else if (itemId === 'holy_fire_oil') {
    const torso = enemy.limbs.find((l) => l.id === 'torso' && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
    const rawHolyFire = enemy.oilCovered ? 1050 : 420;
    const sub = applyLimbDamageToEnemy(player, enemy, tpl, torso, rawHolyFire, true, logs);
    dealt += sub.actualDmg;
    enemy.oilCovered = false;
    enemy.oilTurns = 0;
    enemy.burnPerTurn = Math.max(enemy.burnPerTurn || 0, 180);
    enemy.burnTurns = 3;
    logs.push(`Bạn ném [Lọ Dầu Lửa Thánh] gây ${sub.actualDmg} sát thương Thánh Hỏa & thiêu đốt dữ dội!`);
  } else if (itemId === 'void_acid_vial') {
    enemy.acidTurns = Math.max(enemy.acidTurns || 0, 4);
    for (const l of enemy.limbs) {
      l.armor = (l.armor || 0) * 0.3;
    }
    const torso = enemy.limbs.find((l) => l.id === 'torso' && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
    const sub = applyLimbDamageToEnemy(player, enemy, tpl, torso, 380, true, logs);
    dealt += sub.actualDmg;
    logs.push(`[Lọ Axit Hư Vô] ăn mòn lớp giáp toàn thân và gây ${sub.actualDmg} sát thương chuẩn!`);
  } else if (itemId === 'steel_trap') {
    const leg =
      enemy.limbs.find((l) => l.isSupportLeg && l.hp > 0) ||
      enemy.limbs.find((l) => l.hp > 0)!;
    enemy.lockedLimbIds = enemy.lockedLimbIds || {};
    enemy.lockedLimbIds[leg.id] = 2;
    enemy.telegraphing = false;
    const sub = applyLimbDamageToEnemy(player, enemy, tpl, leg, 280, false, logs);
    dealt += sub.actualDmg;
    if (sub.severedNow) severedAny = true;
    logs.push(`Bạn gài [Bẫy Dây Thép] kẹp chặt [${leg.name}] gây ${sub.actualDmg} sát thương và khóa cứng chi!`);
  } else if (itemId === 'ancient_ash') {
    enemy.blindTurns = Math.max(enemy.blindTurns, 3);
    if (tpl.coinFlipSkill?.requiredLimb === 'head' || tpl.id === 'grand_abbess') {
      enemy.telegraphing = false;
      enemy.telegraphCoinFlip = false;
    }
    logs.push(`Bạn tung [Tro Tàn Cổ] thẳng vào mắt ${tpl.name}: MÙ LÒA 3 lượt, mở khóa điểm yếu Đầu!`);
  } else if (itemId === 'poison_powder') {
    enemy.blindTurns = Math.max(enemy.blindTurns, 2);
    const pDot = Math.max(55, Math.round(getEnemyMaxTotalHp(enemy) * 0.04));
    enemy.poisonPerTurn = Math.max(enemy.poisonPerTurn || 0, pDot);
    enemy.poisonTurns = Math.max(enemy.poisonTurns || 0, 3);
    player.poisonCoatTurns = Math.max(player.poisonCoatTurns || 0, 2);
    if (tpl.coinFlipSkill?.requiredLimb === 'head') {
      enemy.telegraphing = false;
      enemy.telegraphCoinFlip = false;
    }
    logs.push(`Bạn rắc [Bột Độc] gây Mù & Nhiễm Độc (${pDot} dmg/lượt), đồng thời tẩm độc lên vũ khí!`);
  } else if (itemId === 'poison_herb') {
    player.poisonCoatTurns = 3;
    logs.push('Bạn nghiền [Thảo Dược Độc] bôi lên lưỡi vũ khí (3 đòn đánh tẩm độc 5% Sinh Lực/lượt)!');
  } else if (itemId === 'lamp_oil') {
    player.fireCoatTurns = 3;
    logs.push('Bạn tẩm [Dầu Đèn] lên vũ khí (3 đòn đánh bùng lửa thiêu đốt 5% Sinh Lực/lượt)!');
  } else if (itemId === 'scroll_distract_ash') {
    enemy.blindTurns = Math.max(enemy.blindTurns || 0, 2);
    enemy.telegraphing = false;
    enemy.telegraphCoinFlip = false;
    if (tpl.tier !== 'boss') {
      logs.push(`Bạn tung [Cuộn Đánh Lạc Hướng]! Màn tro mù lòa 2 lượt giúp bạn rút lui an toàn khỏi ${tpl.name}!`);
      return {
        logs,
        enemyDefeated: false,
        playerDefeated: false,
        fledSuccess: true,
      };
    }
    logs.push(`Bạn tung [Cuộn Đánh Lạc Hướng] làm Mù ${tpl.name} 2 lượt và phá nhịp đòn!`);
  } else if (itemId === 'hunter_arrows') {
    const headOrTorso =
      enemy.limbs.find((l) => l.id === 'head' && l.hp > 0) ||
      enemy.limbs.find((l) => l.id === 'torso' && l.hp > 0) ||
      enemy.limbs.find((l) => l.hp > 0)!;
    if (headOrTorso && rng.chance(0.95)) {
      let arrowDmg = rng.int(260, 340);
      if (player.hunger < 90 && rng.chance(0.35)) {
        wasCrit = true;
        arrowDmg = Math.round(arrowDmg * 1.5);
      }
      const sub = applyLimbDamageToEnemy(player, enemy, tpl, headOrTorso, arrowDmg, false, logs, 0.35);
      dealt += sub.actualDmg;
      if (sub.severedNow) severedAny = true;
      logs.push(
        `Bạn bắn [Mũi Tên Săn] xuyên vào [${headOrTorso.name}] gây ${sub.actualDmg} sát thương${wasCrit ? ' (CHÍ MẠNG!)' : ''}!`
      );
    } else {
      logs.push('Mũi tên săn sượt qua bóng tối!');
    }
  } else {
    applySupportItemEffects(player, itemId, logs);
  }

  const out = finishCombatRoundWithEnemyTurn(player, enemy, tpl, rng, logs, severedAny, wasCrit);
  const itmVfx = getWeaponVfxMeta(itemId, 'dagger');
  out.lastDealtDmg = dealt;
  out.weaponCategory = itmVfx.weaponCategory;
  out.vfxColor = itmVfx.vfxColor;
  out.actorIdx = 0;
  return out;
}

export function applySupportItemEffects(player: PlayerState, itemId: string, logs: string[]) {
  const item = CONFIG.ITEMS[itemId];
  if (!item) return;

  if (item.hpHealPct) {
    const pctHeal = Math.round(player.maxHp * item.hpHealPct);
    player.hp = Math.min(player.maxHp, player.hp + pctHeal);
    logs.push(`[${item.name}] hồi phục ${Math.round(item.hpHealPct * 100)}% (+${pctHeal} Sinh Lực, hiện tại: ${player.hp}/${player.maxHp}).`);
  }
  if (item.hpHeal) {
    player.hp = Math.min(player.maxHp, player.hp + item.hpHeal);
    logs.push(`[${item.name}] hồi +${item.hpHeal} Sinh Lực (${player.hp}/${player.maxHp}).`);
  }
  if (item.mindHeal) {
    player.mind = Math.min(player.maxMind, player.mind + item.mindHeal);
    logs.push(`[${item.name}] hồi +${item.mindHeal} Lý Trí (${player.mind}/${player.maxMind}).`);
  }
  if (itemId === 'stimulant_serum') {
    player.stimulantBonusPct = 0.6;
    logs.push('Huyết Thanh Kích Thích tăng +60% Sát thương cho đòn đánh kế tiếp!');
  }
  if (itemId === 'pure_soul_shard') {
    player.corruption = Math.max(0, player.corruption - 15);
    logs.push('[Mảnh Linh Hồn Thuần Khiết] gột rửa -15 điểm Tha Hóa!');
  }
  if (itemId === 'elixir_of_ancients') {
    player.questFlags = player.questFlags || {
      vaelisTalked: false,
      vaelisDefeated: false,
      curedPetrification: false,
      child13Rescued: false,
      child12Resolved: false,
      brokenKnightResolved: false,
      glassLadyResolved: false,
      smithUsed: false,
      physicianTalked: false,
      chroniclerTalked: false,
    };
    player.questFlags.curedPetrification = true;
    logs.push('Bạn uống cạn [Tiên Dược Nguyên Sơ]! Lớp độc hóa đá lạnh buốt trong máu thịt lập tức tan rã.');
  }
  if (item.cureBleed) {
    player.statuses.bleeding = false;
    player.statuses.bleedImmunityTurns = Math.max(player.statuses.bleedImmunityTurns || 0, 3);
    if (itemId === 'bandage') {
      player.hp = Math.min(player.maxHp, player.hp + 12);
      logs.push(`[${item.name}] quấn chặt vết thương: CẦM MÁU HOÀN TOÀN, hồi +12 Sinh Lực.`);
    } else {
      logs.push(`[${item.name}] đã cầm máu hoàn toàn và bảo vệ miệng vết thương.`);
    }
  }
  if (item.curePoison) {
    player.statuses.poisoned = false;
  }
  if (item.cureInfection) {
    player.limbs.infected = { leftArm: false, rightArm: false, leftLeg: false, rightLeg: false };
    logs.push(`[${item.name}] xóa sạch Nhiễm Trùng trên các chi.`);
  }
  if (item.cureParasite) {
    player.statuses.parasite = false;
    logs.push(`[${item.name}] trục xuất Ký Sinh Trùng.`);
  }
  if (item.cureHallucination) {
    player.statuses.hallucinating = false;
    player.statuses.blindedTurns = 0;
  }
  if (item.hungerRestore) {
    player.hunger = Math.max(0, player.hunger - item.hungerRestore);
    logs.push(`[${item.name}] giảm ${item.hungerRestore} Cơn Đói.`);
  }
  if (itemId === 'torch') {
    player.torchTimer = 120;
    player.torchMaxTimer = 120;
    logs.push('Đã thắp sáng [Đuốc Sáng]! Ngọn lửa ấm áp xua tan bóng tối hầm ngục (120s).');
  }
  if (itemId === 'oil_lamp') {
    player.torchTimer = 240;
    player.torchMaxTimer = 240;
    logs.push('Đã châm lửa [Đèn Dầu]! Nguồn sáng ổn định đẩy lùi bóng tối đặc quánh (240s).');
  }
}

export function executePlayerGuard(
  player: PlayerState,
  enemy: MapEnemyInstance,
  rng: SeededRNG
): CombatTurnResult {
  const tpl = CONFIG.ENEMIES[enemy.templateId] || CONFIG.ENEMIES.fanatic_zealot;
  player.statuses.guarding = true;
  player.mind = Math.min(player.maxMind, player.mind + 4);
  for (const ally of player.party) {
    ally.guarding = true;
  }
  const shield = player.equippedShield ? CONFIG.SHIELDS[player.equippedShield] : null;
  const logs = [
    shield
      ? `Cả đội giơ [${shield.name}] dựng thế phòng thủ vững chắc, giữ vững tinh thần!`
      : 'Cả đội thu mình vào thế phòng thủ chặt chẽ, bảo toàn chi thể!',
  ];
  return finishCombatRoundWithEnemyTurn(player, enemy, tpl, rng, logs, false, false);
}

export function executePlayerFlee(
  player: PlayerState,
  enemy: MapEnemyInstance,
  rng: SeededRNG
): CombatTurnResult {
  const tpl = CONFIG.ENEMIES[enemy.templateId] || CONFIG.ENEMIES.fanatic_zealot;
  if (!canPlayerFlee(player)) {
    return {
      logs: ['Bạn đã mất cả 2 chân, không thể Bỏ chạy!'],
      enemyDefeated: false,
      playerDefeated: false,
      fledSuccess: false,
    };
  }
  if (tpl.tier === 'boss') {
    return {
      logs: ['Cánh cửa Ngai Vàng Máu đã đóng chặt! Không thể chạy trốn khỏi Ma Vương Vaelis!'],
      enemyDefeated: false,
      playerDefeated: false,
      fledSuccess: false,
    };
  }
  let chance = player.baseFleeChance;
  if (countLostLegs(player) === 1) chance *= 0.5;
  if (enemy.stunTurns > 0 || enemy.blindTurns > 0) chance = Math.min(0.95, chance + 0.25);

  if (rng.chance(chance)) {
    return {
      logs: ['Bạn lách qua màn sương tối, rút lui khỏi trận chiến thành công!'],
      enemyDefeated: false,
      playerDefeated: false,
      fledSuccess: true,
    };
  }

  const logs = ['Đường lui bị phong tỏa! Kẻ địch lập tức chớp thời cơ lao tới!'];
  return finishCombatRoundWithEnemyTurn(player, enemy, tpl, rng, logs, false, false);
}

function finishCombatRoundWithEnemyTurn(
  player: PlayerState,
  enemy: MapEnemyInstance,
  tpl: EnemyTemplate,
  rng: SeededRNG,
  logs: string[],
  severedAnyLimb: boolean,
  wasCrit: boolean
): CombatTurnResult {
  if (isEnemyDead(enemy)) {
    return handleEnemyDeath(player, enemy, tpl, logs, severedAnyLimb, wasCrit);
  }

  const torso = enemy.limbs.find((l) => l.id === 'torso');
  if (enemy.bleedPerTurn > 0 && torso) {
    torso.hp = Math.max(0, torso.hp - enemy.bleedPerTurn);
    logs.push(`${enemy.customName || tpl.name} mất ${enemy.bleedPerTurn} Sinh Lực vì Chảy máu.`);
  }
  if (enemy.burnPerTurn > 0 && torso) {
    torso.hp = Math.max(0, torso.hp - enemy.burnPerTurn);
    logs.push(`${enemy.customName || tpl.name} mất ${enemy.burnPerTurn} Sinh Lực vì Thiêu đốt.`);
    if (enemy.burnTurns !== undefined) {
      enemy.burnTurns -= 1;
      if (enemy.burnTurns <= 0) {
        enemy.burnPerTurn = 0;
        enemy.burnTurns = 0;
      }
    }
  }
  if ((enemy.poisonPerTurn || 0) > 0 && (enemy.poisonTurns || 0) > 0 && torso) {
    torso.hp = Math.max(0, torso.hp - (enemy.poisonPerTurn || 0));
    logs.push(`${enemy.customName || tpl.name} mất ${enemy.poisonPerTurn} Sinh Lực vì Nhiễm Độc.`);
    enemy.poisonTurns = Math.max(0, (enemy.poisonTurns || 0) - 1);
    if (enemy.poisonTurns <= 0) {
      enemy.poisonPerTurn = 0;
    }
  }

  if (isEnemyDead(enemy)) {
    return handleEnemyDeath(player, enemy, tpl, logs, severedAnyLimb, wasCrit);
  }

  enemy.turnCount += 1;
  let lastTakenDmg = 0;
  let pendingCoinFlip: CombatPendingCoinFlip | undefined = undefined;

  const lockedMap = enemy.lockedLimbIds || {};
  enemy.lockedLimbIds = lockedMap;
  for (const k of Object.keys(lockedMap)) {
    lockedMap[k] -= 1;
    if (lockedMap[k] <= 0) delete lockedMap[k];
  }

  // Hunger >= 90% or 2 legs lost reduces player evasion to 0; 1 leg lost halves evasion (-50%)
  const lostPlayerLegs = countLostLegs(player);
  const veilBonus = (player.statuses.veilEvasionTurns || 0) > 0 ? 0.15 : 0;
  const effectivePlayerEvasion =
    player.hunger >= 90 || lostPlayerLegs >= 2
      ? 0
      : lostPlayerLegs === 1
      ? (player.evasionBonus + veilBonus) * 0.5
      : player.evasionBonus + veilBonus;

  const isCoinSkillLimbReady = (req?: 'head' | 'leftArm' | 'rightArm'): boolean => {
    if (!req) return true;
    if (req === 'head') {
      const h = enemy.limbs.find((l) => l.id === 'head');
      return Boolean(h && h.hp > 0 && !lockedMap[h.id] && enemy.blindTurns <= 0);
    }
    if (req === 'leftArm') {
      const la = enemy.limbs.find(
        (l) => l.id === 'left_arm' || l.id === 'throne_claw_left' || l.id === 'tentacle_2' || l.id === 'coiling_body'
      );
      return Boolean(la && la.hp > 0 && !lockedMap[la.id]);
    }
    const ra = enemy.limbs.find(
      (l) => l.id === 'right_arm' || l.id === 'throne_ensor_right' || l.id === 'tentacle_1'
    );
    return Boolean(ra && ra.hp > 0 && !lockedMap[ra.id]);
  };

  if (enemy.stunTurns > 0) {
    enemy.stunTurns -= 1;
    enemy.telegraphing = false;
    enemy.telegraphCoinFlip = false;
    logs.push(`${enemy.customName || tpl.name} đang bị Choáng / Mất lượt hành động!`);
  } else if (tpl.id === 'demon_lord_vaelis' || tpl.id === 'vaelis') {
    const clawLeft = enemy.limbs.find((l) => l.id === 'throne_claw_left' && l.hp > 0 && !lockedMap[l.id]);
    const censorRight = enemy.limbs.find((l) => l.id === 'throne_ensor_right' && l.hp > 0 && !lockedMap[l.id]);
    const tendrils = enemy.limbs.find((l) => l.id === 'void_tendrils' && l.hp > 0 && !lockedMap[l.id]);
    const conduit = enemy.limbs.find((l) => l.id === 'void_conduit' && l.hp > 0 && !lockedMap[l.id]);
    const vaelisHead = enemy.limbs.find((l) => l.id === 'head' && l.hp > 0 && !lockedMap[l.id]);

    // 1. Telegraph Attack every 3rd turn (Thánh Quang Hắc Ám — hỗ trợ Tung Xu nếu không Phòng Thủ)
    if (enemy.telegraphing) {
      enemy.telegraphing = false;
      const wasCoinTelegraph = Boolean(enemy.telegraphCoinFlip);
      enemy.telegraphCoinFlip = false;
      if (wasCoinTelegraph && tpl.coinFlipSkill) {
        if (!isCoinSkillLimbReady(tpl.coinFlipSkill.requiredLimb)) {
          logs.push(`Bộ phận phát chiêu của Vaelis đã bị kiềm chế, đòn [${tpl.coinFlipSkill.name}] bị phá vỡ!`);
        } else if (player.statuses.guarding || player.statuses.divineAegisTurns > 0) {
          logs.push(`Ngươi thủ thế vững vàng, chặn đứng hoàn toàn đòn xử tử [${tpl.coinFlipSkill.name}] của Vaelis!`);
        } else {
          pendingCoinFlip = {
            enemyName: enemy.customName || tpl.name,
            skillName: tpl.coinFlipSkill.name,
            telegraphText: tpl.coinFlipSkill.telegraphText,
            penaltyType: tpl.coinFlipSkill.penaltyType,
            damageMultiplier: tpl.coinFlipSkill.damageMultiplier,
          };
          logs.push(`[TUNG XU ĐOẠT MỆNH] Vaelis tung [${tpl.coinFlipSkill.name}]!`);
        }
      } else {
        const rawDmg = rng.int(tpl.telegraphDmg[0], tpl.telegraphDmg[1]);
        logs.push(`NGAI VÀNG XƯƠNG SẮT PHÓNG THÍCH [${tpl.telegraphName}] QUÉT TOÀN BỘ TỔ ĐỘI!`);
        player.mind = Math.max(0, player.mind - 16);
        lastTakenDmg += applyDamageToPlayer(player, enemy, tpl, rawDmg, true, logs, rng);
        for (const ally of player.party) {
          if (ally.hp > 0) {
            const allyStats = getAllyComputedStats(ally, player);
            const physRed = allyStats.physDefPct / 100;
            const guardMult = ally.guarding || (ally.divineAegisTurns || 0) > 0 ? 0.45 : 0.8;
            const allyDmg = Math.max(3, Math.round(rawDmg * guardMult * (1 - physRed * 0.5)));
            ally.hp = Math.max(0, ally.hp - allyDmg);
            ally.mind = Math.max(0, ally.mind - 12);
            logs.push(`Thánh Quang Hắc Ám quét trúng [${ally.name}] (-${allyDmg} Sinh Lực, -12 Lý Trí)!`);
            if (ally.hp <= 0) {
              logs.push(`[${ally.name}] đã ngã xuống trước Thánh Quang Hắc Ám!`);
              reclaimUndeadSummonGear(player, ally, logs);
              markLivingAllyDead(player, ally);
            }
          }
        }
      }
    } else {
      // 2. Cánh Tay Cơ Khí Trái (Vuốt Xương Sắt): Nghiền Nát Giáp
      if (clawLeft) {
        const rawDmg = rng.int(tpl.normalDmg[0], tpl.normalDmg[1]);
        logs.push('[Cánh Tay Cơ Khí Trái] bổ xuống đòn [Nghiền Nát Giáp]!');
        lastTakenDmg += applyDamageToPlayer(player, enemy, tpl, rawDmg, true, logs, rng);
      }

      // 3. Cánh Tay Nghi Lễ Phải (Lư Hương Huyết Hỏa): Sương Mù Chướng Khí
      if (censorRight) {
        const magDmg = rng.int(12, 18);
        player.hp = Math.max(0, player.hp - magDmg);
        player.mind = Math.max(0, player.mind - 12);
        if (player.statuses.statusImmunityTurns <= 0 && (player.equippedHead !== 'beak_mask' || rng.chance(0.4))) {
          player.statuses.poisoned = true;
        }
        lastTakenDmg += magDmg;
        for (const ally of player.party) {
          if (ally.hp > 0) {
            const allyMagRed = getAllyComputedStats(ally, player).magDefPct / 100;
            const allyMagDmg = Math.max(2, Math.round(magDmg * 0.65 * (1 - allyMagRed * 0.5)));
            ally.hp = Math.max(0, ally.hp - allyMagDmg);
            ally.mind = Math.max(0, ally.mind - 12);
            if (ally.hp <= 0) {
              reclaimUndeadSummonGear(player, ally, logs);
              markLivingAllyDead(player, ally);
            }
          }
        }
        logs.push(`[Cánh Tay Nghi Lễ Phải] vung Lư Hương Huyết Hỏa xả [Sương Mù Chướng Khí]: Gây ${magDmg} sát thương phép, rút 12 Lý Trí toàn đội và gây Nhiễm Độc!`);
      }

      // 4. Chùm Xúc Tu Hư Vô Dưới Bệ Ngai: Trói Buộc & Hút Sinh Lực
      if (tendrils) {
        const aliveAllies = player.party.filter((a) => a.hp > 0);
        const pureTanks = aliveAllies.filter((a) => isPureTankSummon(a));
        const drainDmg = rng.int(14, 22);
        const targetPool = pureTanks.length > 0 ? pureTanks : aliveAllies;
        if (targetPool.length > 0 && rng.chance(pureTanks.length > 0 ? 0.8 : 0.65)) {
          const victimAlly = rng.pick(targetPool);
          const actualDrain = Math.max(4, Math.round(drainDmg * (1 - getAllyComputedStats(victimAlly, player).physDefPct / 150)));
          victimAlly.hp = Math.max(0, victimAlly.hp - actualDrain);
          victimAlly.stunnedTurns = 1;
          if (torso) torso.hp = Math.min(torso.maxHp, torso.hp + actualDrain * 3);
          logs.push(`[Chùm Xúc Tu Hư Vô] quấn chặt [${victimAlly.name}] (Mất lượt kế tiếp), hút ${actualDrain} Sinh Lực truyền về Ngai Vàng!`);
          if (victimAlly.hp <= 0) {
            reclaimUndeadSummonGear(player, victimAlly, logs);
            markLivingAllyDead(player, victimAlly);
          }
        } else {
          player.hp = Math.max(0, player.hp - drainDmg);
          lastTakenDmg += drainDmg;
          if (torso) torso.hp = Math.min(torso.maxHp, torso.hp + drainDmg * 3);
          logs.push(`[Chùm Xúc Tu Hư Vô] trói chân bạn, hút ${drainDmg} Sinh Lực để nuôi dưỡng Vaelis!`);
        }
      }

      // 5. Đầu Đội Vương Miện Gai Sắt: Sắc Lệnh Bạo Chúa (nếu có thành viên Lý Trí < 50)
      if (vaelisHead) {
        const lowMindAlly = player.party.find((a) => a.hp > 0 && a.mind < 50);
        if (lowMindAlly) {
          const friendlyDmg = rng.int(12, 20);
          player.hp = Math.max(0, player.hp - friendlyDmg);
          lastTakenDmg += friendlyDmg;
          logs.push(`[Sắc Lệnh Bạo Chúa] từ Vương Miện Gai Sắt khống chế Lý Trí rạn vỡ của [${lowMindAlly.name}], ép đồng đội vung vũ khí chém bạn (-${friendlyDmg} Sinh Lực)!`);
        } else if (player.mind < 50 && player.party.some((a) => a.hp > 0)) {
          const targetAlly = player.party.find((a) => a.hp > 0)!;
          const friendlyDmg = rng.int(14, 22);
          targetAlly.hp = Math.max(0, targetAlly.hp - friendlyDmg);
          logs.push(`[Sắc Lệnh Bạo Chúa] bóp nghẹt Lý Trí suy sụp của bạn, ép lưỡi kiếm hướng về phía [${targetAlly.name}] (-${friendlyDmg} Sinh Lực)!`);
          if (targetAlly.hp <= 0) {
            reclaimUndeadSummonGear(player, targetAlly, logs);
            markLivingAllyDead(player, targetAlly);
          }
        }
      }

      if (!clawLeft && !censorRight && !tendrils) {
        const pulseDmg = rng.int(10, 16);
        lastTakenDmg += applyDamageToPlayer(player, enemy, tpl, pulseDmg, false, logs, rng);
        logs.push('Ngai Vàng Xương Sắt đã gãy hết tay hộ vệ, phát ra xung chấn hắc ám yếu ớt!');
      }

      if (enemy.turnCount % 2 === 0) {
        enemy.telegraphing = true;
        if (tpl.coinFlipSkill && isCoinSkillLimbReady(tpl.coinFlipSkill.requiredLimb)) {
          enemy.telegraphCoinFlip = true;
          logs.push(`CẢNH BÁO TỬ THẦN (TUNG XU): ${tpl.coinFlipSkill.telegraphText}`);
        } else {
          enemy.telegraphCoinFlip = false;
          logs.push(`CẢNH BÁO ĐỎ: ${tpl.telegraphDesc}`);
        }
      }
    }

    // 6. Ống Dẫn Huyết Mạch Tủy Sống: Tự động bơm +280 Sinh Lực cuối mỗi lượt
    if (conduit && torso && torso.hp > 0) {
      torso.hp = Math.min(torso.maxHp, torso.hp + 280);
      logs.push('[Ống Dẫn Huyết Mạch Tủy Sống] bơm máu đỏ rực từ đỉnh ngai vàng vào cổ Vaelis, khâu liền vết thương (+280 Sinh Lực)!');
    }
  } else {
    const intactWeaponLimbs = enemy.limbs.filter(
      (l) => l.isWeaponArm && l.hp > 0 && !lockedMap[l.id]
    );
    const intactNonVitalLimbs = enemy.limbs.filter(
      (l) => !l.isVital && l.hp > 0 && !lockedMap[l.id]
    );
    const allLimbsSeveredHelpless = intactWeaponLimbs.length === 0 && intactNonVitalLimbs.length === 0;

    if (allLimbsSeveredHelpless) {
      enemy.telegraphing = false;
      enemy.telegraphCoinFlip = false;
      logs.push(`${enemy.customName || tpl.name} đã mất sạch tay chân, nằm quằn quại bất lực trên nền đá!`);
    } else if (intactWeaponLimbs.length === 0) {
      const tackleDmg = Math.max(3, Math.round(tpl.normalDmg[0] * 0.35));
      lastTakenDmg += applyDamageToPlayer(player, enemy, tpl, tackleDmg, false, logs, rng);
      logs.push(`${enemy.customName || tpl.name} đã mất hết tay vũ khí, chỉ có thể húc yếu ớt!`);
      enemy.telegraphing = false;
      enemy.telegraphCoinFlip = false;
    } else if (enemy.telegraphing) {
      enemy.telegraphing = false;
      const wasCoinTelegraph = Boolean(enemy.telegraphCoinFlip);
      enemy.telegraphCoinFlip = false;

      if (wasCoinTelegraph && tpl.coinFlipSkill) {
        if (!isCoinSkillLimbReady(tpl.coinFlipSkill.requiredLimb)) {
          logs.push(`Bộ phận tung chiêu của [${enemy.customName || tpl.name}] đã bị phế/khóa! Đòn tử thần [${tpl.coinFlipSkill.name}] bị hủy bỏ hoàn toàn!`);
        } else if (player.statuses.guarding || player.statuses.divineAegisTurns > 0) {
          logs.push(`Ngươi thủ thế vững chắc, chặn đứng hoàn toàn đòn tử thần tung xu [${tpl.coinFlipSkill.name}]!`);
        } else {
          pendingCoinFlip = {
            enemyName: enemy.customName || tpl.name,
            skillName: tpl.coinFlipSkill.name,
            telegraphText: tpl.coinFlipSkill.telegraphText,
            penaltyType: tpl.coinFlipSkill.penaltyType,
            damageMultiplier: tpl.coinFlipSkill.damageMultiplier,
          };
          logs.push(`[ĐÒN TỬ THẦN TUNG XU] ${enemy.customName || tpl.name} phát động [${tpl.coinFlipSkill.name}]!`);
        }
      } else {
        let hitProb = 0.90 - effectivePlayerEvasion;
        if (enemy.blindTurns > 0) {
          hitProb *= 1 - CONFIG.RED_VIAL_BLIND_ACC_PENALTY;
        }

        if (!rng.chance(Math.max(0.10, hitProb))) {
          logs.push(`Đòn chí mạng [${tpl.telegraphName}] của ${enemy.customName || tpl.name} ĐÁNH TRƯỢT!`);
        } else {
          const rawDmg = rng.int(tpl.telegraphDmg[0], tpl.telegraphDmg[1]);
          logs.push(`${enemy.customName || tpl.name} tung đòn chí mạng báo trước: [${tpl.telegraphName}]!`);

          if (tpl.id === 'grand_abbess') {
            player.statuses.blindedTurns = Math.max(player.statuses.blindedTurns, 2);
            logs.push('Ánh Sáng Phán Xét làm bạn bị MÙ MẮT 2 lượt!');
          } else if (tpl.id === 'countess_carmilla' && player.statuses.bleeding && torso) {
            torso.hp = Math.min(torso.maxHp, torso.hp + 1000);
            logs.push('Huyết Nữ Carmilla hút dòng máu đang chảy của bạn và TỰ HỒI +1.000 Sinh Lực!');
          } else if (tpl.id === 'void_leech_beast') {
            player.mind = Math.max(0, player.mind - 18);
            logs.push('Năng lượng Hư Vô hút cạn 18 Lý Trí của bạn!');
          }

          lastTakenDmg += applyDamageToPlayer(player, enemy, tpl, rawDmg, true, logs, rng);
        }
      }
    } else {
      const strikes = tpl.id === 'fenrir_kin' && intactWeaponLimbs.length >= 2 ? 2 : 1;
      for (let s = 0; s < strikes; s++) {
        let hitProb = 0.84 - effectivePlayerEvasion;
        if (enemy.blindTurns > 0) {
          hitProb *= 1 - CONFIG.RED_VIAL_BLIND_ACC_PENALTY;
        }
        if (!rng.chance(Math.max(0.10, hitProb))) {
          logs.push(`Đòn tấn công của ${enemy.customName || tpl.name} sượt qua người bạn!`);
        } else {
          const rawDmg = rng.int(tpl.normalDmg[0], tpl.normalDmg[1]);
          lastTakenDmg += applyDamageToPlayer(player, enemy, tpl, rawDmg, false, logs, rng);
        }
      }

      if (tpl.id === 'rotting_priest') {
        const bellArm = enemy.limbs.find((l) => l.id === 'left_arm');
        if (bellArm && bellArm.hp > 0) {
          player.mind = Math.max(0, player.mind - 15);
          logs.push('Tiếng chuông cầu hồn của Giáo Sĩ Mục Rữa làm bạn tụt 15 Lý Trí!');
        }
      }

      if (tpl.id === 'void_chimera') {
        const snakeHead = enemy.limbs.find((l) => l.id === 'snake_tail_head');
        if (snakeHead && snakeHead.hp > 0) {
          player.hp = Math.max(0, player.hp - 10);
          lastTakenDmg += 10;
          if (player.statuses.statusImmunityTurns <= 0 && (player.equippedHead !== 'beak_mask' || rng.chance(0.4))) {
            player.statuses.poisoned = true;
          }
          logs.push('Đầu Rắn ở đuôi Bạch Hổ phun mưa nọc độc gây 10 sát thương và Nhiễm Độc!');
        }
      }

      enemy.telegraphing = true;
      if (tpl.coinFlipSkill && isCoinSkillLimbReady(tpl.coinFlipSkill.requiredLimb) && rng.chance(0.45)) {
        enemy.telegraphCoinFlip = true;
        logs.push(`CẢNH BÁO TỬ THẦN (TUNG XU): ${tpl.coinFlipSkill.telegraphText}`);
      } else {
        enemy.telegraphCoinFlip = false;
        logs.push(`CẢNH BÁO ĐỎ: ${tpl.telegraphDesc}`);
      }
    }
  }

  if (enemy.blindTurns > 0 && enemy.blindTurns < 90) {
    enemy.blindTurns -= 1;
  }
  if (enemy.acidTurns && enemy.acidTurns > 0) {
    enemy.acidTurns -= 1;
  }
  if (enemy.oilTurns && enemy.oilTurns > 0) {
    enemy.oilTurns -= 1;
    if (enemy.oilTurns <= 0) {
      enemy.oilCovered = false;
    }
  }

  if (player.statuses.bleeding) {
    player.hp = Math.max(0, player.hp - 8);
    logs.push('Máu tươi tuôn ra không ngừng từ vết rách (-8 Sinh Lực)!');
  }
  if (player.statuses.poisoned) {
    player.hp = Math.max(0, player.hp - 7);
    logs.push('Độc tố ăn mòn làm bạn mất 7 Sinh Lực!');
  }
  if (player.statuses.parasite) {
    player.mind = Math.max(0, player.mind - 6);
    player.hunger = Math.min(100, player.hunger + 6);
    logs.push('Ấu trùng ký sinh ngoe nguẩy trong tủy sống, rút cạn Lý Trí và làm mờ mắt!');
  }
  if (player.statuses.blindedTurns > 0) {
    player.statuses.blindedTurns -= 1;
  }
  if (player.statuses.divineAegisTurns > 0) {
    player.statuses.divineAegisTurns -= 1;
  }
  if (player.statuses.statusImmunityTurns > 0) {
    player.statuses.statusImmunityTurns -= 1;
  }
  if (player.statuses.bleedImmunityTurns && player.statuses.bleedImmunityTurns > 0) {
    player.statuses.bleedImmunityTurns -= 1;
  }
  if (player.statuses.blessedArmorTurns && player.statuses.blessedArmorTurns > 0) {
    player.statuses.blessedArmorTurns -= 1;
  }
  if (player.statuses.veilEvasionTurns && player.statuses.veilEvasionTurns > 0) {
    player.statuses.veilEvasionTurns -= 1;
  }
  if (player.statuses.enGardeTurns && player.statuses.enGardeTurns > 0) {
    player.statuses.enGardeTurns -= 1;
    if (player.statuses.enGardeTurns <= 0) {
      player.statuses.enGardeLevel = 0;
    }
  }

  // Ally end-of-round DoTs & Mind decay (including Undead Summons; Undead never gain Hunger)
  for (const ally of player.party) {
    if (ally.hp <= 0) {
      if (ally.isUndeadSummon) reclaimUndeadSummonGear(player, ally, logs);
      continue;
    }
    ally.statuses = ally.statuses || { bleeding: false, poisoned: false, parasite: false };
    if ((ally.divineAegisTurns || 0) > 0) {
      ally.divineAegisTurns = Math.max(0, (ally.divineAegisTurns || 0) - 1);
    }
    if (ally.statuses.bleeding) {
      ally.hp = Math.max(0, ally.hp - 6);
      logs.push(`[${ally.name}] mất 6 Sinh Lực vì Chảy máu!`);
    }
    if (ally.statuses.poisoned) {
      ally.hp = Math.max(0, ally.hp - 5);
      logs.push(`[${ally.name}] mất 5 Sinh Lực vì Độc tố!`);
    }
    if (ally.hp <= 0) {
      logs.push(`[${ally.name}] đã gục ngã vì vết thương quá nặng!`);
      if (ally.isUndeadSummon) reclaimUndeadSummonGear(player, ally, logs);
      continue;
    }
    if (ally.isUndeadSummon) {
      ally.hunger = 0;
      const mindDrain = rng.int(4, 7);
      ally.mind = Math.max(0, ally.mind - mindDrain);
      if (ally.mind <= 0) {
        const decayDmg = Math.max(1, Math.round(ally.maxHp * 0.15));
        ally.hp = Math.max(0, ally.hp - decayDmg);
        logs.push(
          `[PHÂN RÃ LINH HỒN] Mất sạch Lý Trí, thân xác [${ally.name}] rạn vỡ và tan rã dần (-${decayDmg} Sinh Lực)!`
        );
        if (ally.hp <= 0) {
          reclaimUndeadSummonGear(player, ally, logs);
        }
      } else if (ally.mind < 30) {
        logs.push(
          isPureTankSummon(ally)
            ? `Lý Trí của [${ally.name}] tụt xuống dưới 30 — không còn đủ tâm lực dựng khiên hộ thể cho đồng đội!`
            : `Lý Trí của [${ally.name}] tụt xuống dưới 30 — sắp phát cơn Cuồng Loạn Xác Chết!`
        );
      }
    } else {
      const mindDrain = rng.int(1, 3);
      ally.mind = Math.max(0, ally.mind - mindDrain);
      if (ally.mind < 30) {
        logs.push(`Lý Trí của [${ally.name}] tụt xuống dưới 30 — rơi vào Hoảng Loạn!`);
      }
    }
  }

  if (player.equippedHead === 'black_wax_crown' && player.hp > 0) {
    player.mind = Math.min(player.maxMind, player.mind + 2);
  }
  if (player.equippedBody === 'platinum_cuirass' && player.corruption > 0 && player.hp > 0) {
    player.hp = Math.max(0, player.hp - 5);
    logs.push('[Giáp Bạch Kim] thiêu đốt da thịt kẻ mang vết nhơ Tha Hóa (-5 Sinh Lực)!');
  }

  // Permadeath: immediately remove any fallen companion (hp <= 0) from player.party
  pruneDeadCompanions(player, logs);

  // Reset single-turn guarding stance for player and all surviving party members
  player.statuses.guarding = false;
  for (const ally of player.party) {
    ally.guarding = false;
  }

  const playerDefeated = player.hp <= 0 || player.headHp <= 0;
  const enemyWeaponSevered = isEnemyWeaponLimbSevered(enemy, tpl);
  const enemyCat: WeaponCategory = enemyWeaponSevered
    ? 'unarmed'
    : tpl.defaultWeaponCategory || 'unarmed';
  const enemyVfx = getWeaponVfxMeta(
    undefined,
    enemyCat,
    enemyCat === 'staff'
      ? tpl.floor === 3 || tpl.id === 'rotting_priest'
        ? '#6b21a8'
        : '#eab308'
      : enemyCat === 'sword' && (tpl.id === 'demon_lord_vaelis' || tpl.id === 'countess_carmilla')
      ? '#991b1b'
      : undefined
  );

  return {
    logs,
    enemyDefeated: false,
    playerDefeated,
    severedAnyLimb,
    wasCrit,
    lastTakenDmg,
    weaponCategory: enemyCat,
    vfxColor: enemyVfx.vfxColor,
    pendingCoinFlip,
  };
}

export function resolveCombatCoinFlipOutcome(
  player: PlayerState,
  enemy: MapEnemyInstance,
  tpl: EnemyTemplate,
  won: boolean,
  penaltyType: 'sever_limb' | 'heavy_bleed' | 'execute_damage',
  damageMultiplier: number,
  rng: SeededRNG
): CombatTurnResult {
  const logs: string[] = [];
  player.statuses.guarding = false;
  if (won) {
    logs.push(`Lật ngửa định mệnh! Ngươi lộn người né tránh hoàn toàn đòn tử thần từ ${enemy.customName || tpl.name}!`);
    return {
      logs,
      enemyDefeated: false,
      playerDefeated: false,
      lastTakenDmg: 0,
    };
  }

  const baseRaw = rng.int(tpl.telegraphDmg[0], tpl.telegraphDmg[1]);
  const scaledDmg = Math.max(15, Math.round(baseRaw * damageMultiplier));
  let actualTaken = 0;

  if (penaltyType === 'sever_limb') {
    actualTaken = applyDamageToPlayer(player, enemy, tpl, scaledDmg, false, logs, rng);
    const severCandidates: Array<{ key: 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'; label: string }> = [
      { key: 'leftArm', label: 'Tay Trái' },
      { key: 'rightArm', label: 'Tay Phải' },
      { key: 'leftLeg', label: 'Chân Trái' },
      { key: 'rightLeg', label: 'Chân Phải' },
    ];
    const intact = severCandidates.filter((c) => player.limbs[c.key]);
    if (intact.length > 0) {
      const victim = rng.pick(intact);
      player.limbs[victim.key] = false;
      player.limbs.infected[victim.key] = false;
      if ((player.statuses.bleedImmunityTurns || 0) <= 0) {
        player.statuses.bleeding = true;
      }
      logs.push(`SẤP MẶT ĐỊNH MỆNH! Đòn tử thần chặt đứt lìa [${victim.label}] của bạn!`);
      if (victim.key === 'leftArm' || victim.key === 'rightArm') {
        handlePlayerArmLoss(player, victim.key, logs);
      }
    }
  } else if (penaltyType === 'heavy_bleed') {
    actualTaken = applyDamageToPlayer(player, enemy, tpl, scaledDmg, false, logs, rng);
    if ((player.statuses.bleedImmunityTurns || 0) <= 0) {
      player.statuses.bleeding = true;
    }
    player.mind = Math.max(0, player.mind - 15);
    logs.push(`SẤP MẶT ĐỊNH MỆNH! Vết thương toác máu chảy không ngừng (-${actualTaken} Sinh Lực, -15 Lý Trí, Chảy Máu Nặng)!`);
  } else {
    player.hp = Math.max(0, player.hp - scaledDmg);
    actualTaken = scaledDmg;
    player.mind = Math.max(0, player.mind - 12);
    logs.push(`SẤP MẶT ĐỊNH MỆNH! Đòn xử tử xuyên thẳng qua giáp trụ (-${scaledDmg} Sinh Lực, -12 Lý Trí)!`);
  }

  // Permadeath: immediately remove any fallen companion (hp <= 0) from player.party
  pruneDeadCompanions(player, logs);

  return {
    logs,
    enemyDefeated: false,
    playerDefeated: player.hp <= 0 || player.headHp <= 0,
    lastTakenDmg: actualTaken,
    wasCrit: true,
    weaponCategory: tpl.defaultWeaponCategory || 'heavy_axe',
    vfxColor: '#dc2626',
  };
}

export function resolveEnemyCombatRound(
  player: PlayerState,
  enemy: MapEnemyInstance,
  rng: SeededRNG
): CombatTurnResult {
  const tpl = CONFIG.ENEMIES[enemy.templateId] || CONFIG.ENEMIES.fanatic_zealot;
  return finishCombatRoundWithEnemyTurn(player, enemy, tpl, rng, [], false, false);
}

export function executeSingleActorCombatAction(
  player: PlayerState,
  enemy: MapEnemyInstance,
  actorIndex: number,
  action: 'ATTACK' | 'SKILL' | 'ITEM' | 'TALK' | 'GUARD' | 'FLEE',
  targetLimbId: string,
  opts: { skillId?: string; itemId?: string } | undefined,
  rng: SeededRNG
): CombatTurnResult {
  const logs: string[] = [];
  const tpl = CONFIG.ENEMIES[enemy.templateId] || CONFIG.ENEMIES.fanatic_zealot;
  enemy.lockedLimbIds = enemy.lockedLimbIds || {};
  enemy.severedLimbs = enemy.severedLimbs || [];
  player.skillLevels = player.skillLevels || {};

  const isMain = actorIndex === 0;
  const ally = isMain ? null : player.party[actorIndex - 1];
  if (!isMain && (!ally || ally.hp <= 0)) {
    return { logs: [], enemyDefeated: isEnemyDead(enemy), playerDefeated: false };
  }

  if (ally && (ally.stunnedTurns || 0) > 0) {
    ally.stunnedTurns = Math.max(0, (ally.stunnedTurns || 0) - 1);
    return {
      logs: [`[${ally.name}] đang bị Xúc Tu Hư Vô trói chặt, mất lượt hành động!`],
      enemyDefeated: false,
      playerDefeated: false,
    };
  }

  // Automatic Panic / Undead Frenzy check (Lý Trí < 30; allow main player to use ITEM to recover sanity)
  const actorPanicking = isMain ? action !== 'ITEM' && isPlayerPanicking(player) : Boolean(ally && ally.mind < 30);
  if (actorPanicking) {
    const validLimbs = enemy.limbs.filter((l) => l.hp > 0 && canTargetEnemyLimb(enemy, tpl, l.id).allowed);
    const chosenLimb =
      (validLimbs.length > 0 ? rng.pick(validLimbs) : enemy.limbs.find((l) => l.hp > 0)) || enemy.limbs[0];

    if (ally?.isUndeadSummon) {
      if (isPureTankSummon(ally)) {
        ally.guarding = true;
        return {
          logs: [
            `[BẢN NĂNG HỘ VỆ] [${ally.name}] co mình vào thế thủ bản năng nhưng không đủ tâm lực để dựng khiên hộ thể cho đồng đội!`,
          ],
          enemyDefeated: false,
          playerDefeated: false,
        };
      }
      const wpn = getAllyEffectiveWeapon(ally);
      const dmg = Math.round(rng.int(wpn.dmg[0], wpn.dmg[1]) * 1.15 * getUndeadSummonDmgMultiplier(player));
      if (ally.mind < 15 && rng.chance(0.28)) {
        const graze = rng.int(6, 12);
        player.hp = Math.max(1, player.hp - graze);
        return {
          logs: [
            `[CUỒNG LOẠN XÁC CHẾT] [${ally.name}] mất hoàn toàn kiểm soát, vung vũ khí cào sượt qua bạn (-${graze} Sinh Lực)!`,
          ],
          enemyDefeated: false,
          playerDefeated: false,
        };
      }
      if (chosenLimb) {
        const res = applyLimbDamageToEnemy(player, enemy, tpl, chosenLimb, dmg, false, logs);
        logs.unshift(
          `[CUỒNG LOẠN XÁC CHẾT] [${ally.name}] gầm rú lao vào xé xác [${chosenLimb.name}] gây ${res.actualDmg} sát thương!`
        );
        if (isEnemyDead(enemy)) {
          return handleEnemyDeath(player, enemy, tpl, logs, res.severedNow, false);
        }
        return {
          logs,
          enemyDefeated: false,
          playerDefeated: false,
          lastDealtDmg: res.actualDmg,
          severedAnyLimb: res.severedNow,
          targetLimbId: chosenLimb.id,
          particleType: 'blood',
        };
      }
    } else {
      const actorName = isMain ? player.name : ally!.name;
      const wpn = isMain ? getEffectiveWeapon(player) : getAllyEffectiveWeapon(ally!);
      if (rng.chance(0.35)) {
        if (isMain) player.statuses.guarding = true;
        else if (ally) ally.guarding = true;
        return {
          logs: [`[HOẢNG LOẠN] [${actorName}] run rẩy ôm đầu phòng thủ hỗn loạn!`],
          enemyDefeated: false,
          playerDefeated: false,
        };
      }
      if (chosenLimb) {
        const dmg = Math.round(rng.int(wpn.dmg[0], wpn.dmg[1]) * 0.85);
        const res = applyLimbDamageToEnemy(player, enemy, tpl, chosenLimb, dmg, false, logs);
        logs.unshift(
          `[HOẢNG LOẠN] [${actorName}] chém bừa vào [${chosenLimb.name}] gây ${res.actualDmg} sát thương!`
        );
        if (isEnemyDead(enemy)) {
          return handleEnemyDeath(player, enemy, tpl, logs, res.severedNow, false);
        }
        return {
          logs,
          enemyDefeated: false,
          playerDefeated: false,
          lastDealtDmg: res.actualDmg,
          severedAnyLimb: res.severedNow,
          targetLimbId: chosenLimb.id,
          particleType: 'blood',
        };
      }
    }
  }

  let effectiveLimbId = targetLimbId;
  const requestedLimb = enemy.limbs.find((l) => l.id === effectiveLimbId);
  if (!requestedLimb || requestedLimb.hp <= 0) {
    const fallback =
      enemy.limbs.find((l) => l.id === 'torso' && l.hp > 0 && canTargetEnemyLimb(enemy, tpl, l.id).allowed) ||
      enemy.limbs.find((l) => l.hp > 0 && canTargetEnemyLimb(enemy, tpl, l.id).allowed) ||
      enemy.limbs.find((l) => l.hp > 0);
    if (fallback) effectiveLimbId = fallback.id;
  }

  // Main player individual action (without auto-firing allies or enemy phase)
  if (isMain) {
    if (action === 'ATTACK') {
      const targetCheck = canTargetEnemyLimb(enemy, tpl, effectiveLimbId);
      if (!targetCheck.allowed) {
        return { logs: [targetCheck.reason || 'Không thể nhắm vào bộ phận này.'], enemyDefeated: false, playerDefeated: false };
      }
      const limb = enemy.limbs.find((l) => l.id === effectiveLimbId)!;
      const wpn = getEffectiveWeapon(player);
      const hitChance = computeLimbHitChance(player, enemy, tpl, limb);
      player.statuses.guarding = false;
      let severedNowOut = false;
      let wasCrit = false;
      let totalDealt = 0;
      let particleType: 'blood' | 'fire' | 'spark' = 'blood';

      if (!rng.chance(hitChance)) {
        logs.push(`[${player.name}] vung [${wpn.name}] nhắm vào [${limb.name}] nhưng sượt qua!`);
      } else {
        let dmg = rng.int(wpn.dmg[0], wpn.dmg[1]);
        if (player.bloodForgedWeapons?.includes(wpn.id)) dmg = Math.round(dmg * 1.35);
        if (player.hexenStatNodes?.includes('atk_1')) dmg = Math.round(dmg * 1.15);
        if ((player.stimulantBonusPct || 0) > 0) {
          dmg = Math.round(dmg * (1 + player.stimulantBonusPct));
          player.stimulantBonusPct = 0;
        }
        if ((player.silverOilTurns || 0) > 0) {
          player.silverOilTurns = Math.max(0, player.silverOilTurns - 1);
          if (tpl.isUndeadOrDemon) dmg = Math.round(dmg * 1.35);
        }
        if ((wpn.isCursed || player.cursedLockedWeapon === wpn.id) && player.mind < 40 && rng.chance(0.35)) {
          player.hp = Math.max(1, player.hp - 14);
          player.mind = Math.max(0, player.mind - 8);
          logs.push(`Lời nguyền trên [${wpn.name}] cắn ngược vào tay chủ nhân!`);
        }
        if (player.hunger >= 50) dmg = Math.round(dmg * 0.75);
        const isStarving90 = player.hunger >= 90;
        let forceCrit = false;
        let hadBloodPactLv3 = false;
        if (player.statuses.bloodPactLevel > 0) {
          const pactMult = player.statuses.bloodPactLevel === 1 ? 2.0 : player.statuses.bloodPactLevel === 2 ? 2.3 : 2.6;
          dmg = Math.round(dmg * pactMult);
          if (player.statuses.bloodPactLevel >= 2 && !isStarving90) forceCrit = true;
          if (player.statuses.bloodPactLevel >= 3) hadBloodPactLv3 = true;
          player.statuses.bloodPactLevel = 0;
        }
        if (wpn.undeadDemonBonus && tpl.isUndeadOrDemon) dmg = Math.round(dmg * (1 + wpn.undeadDemonBonus));
        if (wpn.limbBonusDmg && limb.id !== 'torso' && limb.id !== 'head') dmg = Math.round(dmg * (1 + wpn.limbBonusDmg));
        if (tpl.slashResist && wpn.damageType === 'slash') dmg = Math.round(dmg * (1 - tpl.slashResist));
        if (tpl.bluntWeakness && wpn.damageType === 'blunt') dmg = Math.round(dmg * (1 + tpl.bluntWeakness));
        const hasFireCoat = (player.fireCoatTurns || 0) > 0;
        const hasPoisonCoat = (player.poisonCoatTurns || 0) > 0;
        const isFireOrHoly = Boolean(wpn.burnDmg || wpn.undeadDemonBonus || wpn.id === 'holy_mother_mace' || hasFireCoat);
        if (enemy.oilCovered && isFireOrHoly) {
          dmg = Math.round(dmg * 2.5);
          enemy.oilCovered = false;
          enemy.oilTurns = 0;
          enemy.burnPerTurn = Math.max(enemy.burnPerTurn || 0, 150);
          enemy.burnTurns = 3;
          particleType = 'fire';
          logs.push('Phản ứng Nguyên tố: Kích nổ Tinh Dầu x2.5 sát thương & Thiêu Đốt 150/lượt!');
        }
        if (!isStarving90 && (forceCrit || rng.chance(wpn.critChance))) {
          wasCrit = true;
          dmg = Math.round(dmg * 1.5);
          if (particleType === 'blood') particleType = 'spark';
        }
        if (wpn.headExecuteChance && limb.id === 'head' && tpl.tier === 'normal' && rng.chance(wpn.headExecuteChance)) {
          dmg = limb.hp + 999;
          logs.push('LƯỠI HÁI ĐEN XỬ TỬ TỨC KHẮC!');
        }
        const ignoreArmor = wpn.damageType === 'true' || (wpn.armorPen || 0) >= 1.0;
        const { actualDmg, severedNow } = applyLimbDamageToEnemy(
          player,
          enemy,
          tpl,
          limb,
          dmg,
          ignoreArmor,
          logs,
          wpn.armorPen || 0
        );
        totalDealt = actualDmg;
        severedNowOut = severedNow;
        logs.unshift(`[${player.name}] dùng [${wpn.name}] chém [${limb.name}] gây ${actualDmg} sát thương${wasCrit? '(CHÍ MẠNG!)': ''}!`);
        if (severedNow && wpn.limbSeverHeal) {
          player.hp = Math.min(player.maxHp, player.hp + wpn.limbSeverHeal);
        }
        if (hadBloodPactLv3 && (severedNow || isEnemyDead(enemy))) {
          player.hp = Math.min(player.maxHp, player.hp + 12);
          logs.push('Huyết Ước hấp thụ máu tươi từ vết cắt chí mạng, hồi +12 Sinh Lực!');
        }
        if (wpn.bleedDmg) enemy.bleedPerTurn = Math.max(enemy.bleedPerTurn, wpn.bleedDmg);
        if (wpn.burnDmg && !enemy.oilCovered) {
          enemy.burnPerTurn = Math.max(enemy.burnPerTurn, wpn.burnDmg);
          enemy.burnTurns = Math.max(enemy.burnTurns || 0, 2);
          particleType = 'fire';
        }
        if (hasPoisonCoat) {
          player.poisonCoatTurns = Math.max(0, (player.poisonCoatTurns || 0) - 1);
          const pDot = Math.max(65, Math.round(getEnemyMaxTotalHp(enemy) * 0.05));
          enemy.poisonPerTurn = Math.max(enemy.poisonPerTurn || 0, pDot);
          enemy.poisonTurns = Math.max(enemy.poisonTurns || 0, 3);
          logs.push(`Độc tẩm trên vũ khí ngấm vào máu, rút ${pDot} Sinh Lực/lượt (3 lượt)!`);
        }
        if (hasFireCoat) {
          player.fireCoatTurns = Math.max(0, (player.fireCoatTurns || 0) - 1);
          const fDot = Math.max(70, Math.round(getEnemyMaxTotalHp(enemy) * 0.05));
          enemy.burnPerTurn = Math.max(enemy.burnPerTurn || 0, fDot);
          enemy.burnTurns = Math.max(enemy.burnTurns || 0, 3);
          particleType = 'fire';
          logs.push(`Dầu Lửa trên vũ khí bùng cháy, thiêu đốt ${fDot} Sinh Lực/lượt!`);
        }
        const isArmorShredded = (enemy.acidTurns || 0) > 0 || enemy.blindTurns > 0;
        const totalStun = (wpn.stunChance || 0) + (wpn.damageType === 'blunt' && isArmorShredded ? 0.3 : 0);
        if (totalStun > 0 && rng.chance(totalStun)) {
          enemy.stunTurns = Math.max(enemy.stunTurns, 1);
          particleType = 'spark';
          logs.push('Đòn đánh làm mục tiêu CHOÁNG 1 lượt!');
        }
      }
      const wpnVfx = getWeaponVfxMeta(wpn.id);
      if (isEnemyDead(enemy)) {
        const deadOut = handleEnemyDeath(player, enemy, tpl, logs, severedNowOut, wasCrit);
        deadOut.lastDealtDmg = totalDealt;
        deadOut.particleType = particleType;
        deadOut.targetLimbId = effectiveLimbId;
        deadOut.weaponCategory = wpnVfx.weaponCategory;
        deadOut.vfxColor = wpnVfx.vfxColor;
        deadOut.actorIdx = actorIndex;
        return deadOut;
      }
      return {
        logs,
        enemyDefeated: false,
        playerDefeated: false,
        severedAnyLimb: severedNowOut,
        wasCrit,
        lastDealtDmg: totalDealt,
        particleType,
        targetLimbId: effectiveLimbId,
        weaponCategory: wpnVfx.weaponCategory,
        vfxColor: wpnVfx.vfxColor,
        actorIdx: actorIndex,
      };
    }

    if (action === 'GUARD') {
      player.statuses.guarding = true;
      player.mind = Math.min(player.maxMind, player.mind + 4);
      const shield = player.equippedShield ? CONFIG.SHIELDS[player.equippedShield] : null;
      return {
        logs: [
          shield
            ? `[${player.name}] giơ [${shield.name}] thủ thế vững vàng!`
            : `[${player.name}] thu mình vào thế phòng thủ chặt chẽ!`,
        ],
        enemyDefeated: false,
        playerDefeated: false,
      };
    }

    if (action === 'TALK') {
      const savedHp = player.hp;
      const savedParty = JSON.parse(JSON.stringify(player.party));
      // Perform talk effect without enemy turn
      if (enemy.talked) {
        logs.push(`${enemy.customName || tpl.name} gầm gừ khước từ mọi lời nói của bạn!`);
      } else {
        enemy.talked = true;
        if (tpl.id === 'demon_lord_vaelis') {
          player.questFlags.vaelisTalked = true;
          enemy.telegraphing = false;
          enemy.stunTurns = Math.max(enemy.stunTurns, 1);
          logs.push(
            'HIỆP SĨ TRƯỞNG VAELIS khựng lại giữa vũng máu: “Ngươi xuống tận đây... đừng để lũ giáo sĩ lừa dối! Ta kéo cả Lâu Đài Hắc Ám giáng xuống để làm NẮP HẦM đè lên Vết Rách Vực Sao!”'
          );
        } else if (
          tpl.id === 'penitent_knight' ||
          tpl.id === 'executioner_paladin' ||
          tpl.id === 'dullahan_knight' ||
          tpl.id === 'hollowed_void_walker'
        ) {
          const head = enemy.limbs.find((l) => l.id === 'head');
          if (head) {
            head.armor = 0;
            head.evasionBonus = 0;
          }
          logs.push(`Bạn lăng mạ lời thề giả tạo của [${tpl.name}]! Hắn tự giật tung lớp bảo vệ ở Đầu!`);
        } else if (
          tpl.id === 'rotting_priest' ||
          tpl.id === 'fanatic_zealot' ||
          tpl.id === 'weeping_inquisitor' ||
          tpl.id === 'grand_abbess'
        ) {
          enemy.stunTurns = Math.max(enemy.stunTurns, 1);
          enemy.telegraphing = false;
          logs.push(`Bạn chất vấn về những giọt máu đen trên tượng Thánh Mẫu! [${enemy.customName || tpl.name}] bàng hoàng MẤT 1 LƯỢT!`);
        } else {
          enemy.blindTurns = Math.max(enemy.blindTurns, 1);
          logs.push(`Bạn hét lớn đánh lạc hướng [${enemy.customName || tpl.name}], làm nó khựng lại một nhịp!`);
        }
      }
      void savedHp;
      void savedParty;
      return { logs, enemyDefeated: false, playerDefeated: false };
    }

    if (action === 'FLEE') {
      if (!canPlayerFlee(player)) {
        return { logs: ['Bạn đã mất cả 2 chân, không thể Bỏ chạy!'], enemyDefeated: false, playerDefeated: false };
      }
      if (tpl.tier === 'boss') {
        return { logs: ['Không thể chạy trốn khỏi Boss tầng!'], enemyDefeated: false, playerDefeated: false };
      }
      let chance = player.baseFleeChance;
      if (countLostLegs(player) === 1) chance *= 0.5;
      if (enemy.stunTurns > 0 || enemy.blindTurns > 0) chance = Math.min(0.95, chance + 0.25);
      if (rng.chance(chance)) {
        return {
          logs: [`Cả đội lách qua bóng tối Bỏ chạy thành công!`],
          enemyDefeated: false,
          playerDefeated: false,
          fledSuccess: true,
        };
      }
      return {
        logs: [`Bỏ chạy thất bại! Kẻ địch vẫn bám sát ngay sau lưng!`],
        enemyDefeated: false,
        playerDefeated: false,
      };
    }

    if (action === 'SKILL' && opts?.skillId) {
      const skillId = opts.skillId;
      const skill = CONFIG.SKILLS.find((s) => s.id === skillId);
      const lv = player.skillLevels[skillId] || 0;
      if (!skill || lv <= 0) {
        return { logs: ['Bạn chưa học kỹ năng này!'], enemyDefeated: false, playerDefeated: false };
      }
      const holyCheck = canUseHolySkill(player, skill);
      if (!holyCheck.allowed) {
        return { logs: [holyCheck.reason || `${HOLY_MOTHER_REFUSAL_MSG}`], enemyDefeated: false, playerDefeated: false };
      }
      if (player.mind < skill.mindCost) {
        return { logs: [`Không đủ Lý Trí (Cần ${skill.mindCost} Lý Trí)!`], enemyDefeated: false, playerDefeated: false };
      }
      if (skill.hpCost && player.hp <= skill.hpCost) {
        return { logs: ['Sinh Lực quá thấp để hiến tế!'], enemyDefeated: false, playerDefeated: false };
      }

      player.mind = Math.max(0, player.mind - skill.mindCost);
      if (skill.hpCost) player.hp = Math.max(1, player.hp - skill.hpCost);
      if (skill.branch === 'Huyết Quỷ') banHolyMother(player);
      if (skill.corruptionGain) {
        player.corruption = Math.min(100, player.corruption + skill.corruptionGain);
        syncCorruptionHolyBan(player);
        checkCorruptionDiegeticWarning(player, logs);
      }

      const limb = enemy.limbs.find((l) => l.id === effectiveLimbId && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
      let dealt = 0;
      let severedNow = false;
      let wasCrit = false;
      if (skillId === 'whirlwind_slash') {
        const wpn = getEffectiveWeapon(player);
        const mult = lv === 1 ? 1.0 : lv === 2 ? 1.2 : 1.45;
        const baseDmg = Math.round(rng.int(wpn.dmg[0], wpn.dmg[1]) * mult);
        const torso = enemy.limbs.find((l) => l.id === 'torso' && l.hp > 0);
        const arms = enemy.limbs.filter((l) => (l.isWeaponArm || l.isShieldArm || l.isTentacle) && l.hp > 0);
        const targets = [...(torso ? [torso] : []), ...arms.slice(0, lv === 1 ? 1 : lv === 2 ? 2 : 4)];
        const finalTargets = targets.length > 0 ? targets : [limb];
        logs.push(`[${player.name}] thi triển [Nhát Chém Xoáy]!`);
        for (const t of finalTargets) {
          const r = applyLimbDamageToEnemy(player, enemy, tpl, t, baseDmg, false, logs);
          dealt += r.actualDmg;
          if (r.severedNow) severedNow = true;
        }
        if (lv >= 3) enemy.bleedPerTurn = Math.max(enemy.bleedPerTurn || 0, 160);
      } else if (skillId === 'hamstring_bind' && limb) {
        const lockTurns = lv === 1 ? 2 : 3;
        const dmg = lv === 1 ? 180 : lv === 2 ? 260 : 350;
        enemy.lockedLimbIds[limb.id] = lockTurns;
        let secondLockedName: string | null = null;
        if (lv >= 3) {
          const secondLimb =
            enemy.limbs.find(
              (l) => l.id !== limb.id && l.hp > 0 && (l.isWeaponArm || l.isShieldArm || l.isTentacle)
            ) || enemy.limbs.find((l) => l.id !== limb.id && l.hp > 0);
          if (secondLimb) {
            enemy.lockedLimbIds[secondLimb.id] = lockTurns;
            secondLockedName = secondLimb.name;
          }
        }
        if (lv >= 2) limb.armor = Math.max(0, (limb.armor || 0) * 0.5);
        const r = applyLimbDamageToEnemy(player, enemy, tpl, limb, dmg, false, logs);
        dealt = r.actualDmg;
        severedNow = r.severedNow;
        logs.push(
          secondLockedName
            ? `[${player.name}] dùng [Trói Gân] khóa [${limb.name}] và [${secondLockedName}] (${lockTurns} lượt), gây ${r.actualDmg} sát thương!`
            : `[${player.name}] dùng [Trói Gân] lên [${limb.name}] gây ${r.actualDmg} sát thương!`
        );
      } else if (skillId === 'holy_light' && limb) {
        let dmg = lv === 1 ? rng.int(450, 600) : lv === 2 ? rng.int(600, 780) : rng.int(780, 1000);
        if (player.equippedShield === 'aegis_of_order') {
          dmg = Math.round(dmg * 1.3);
        }
        if (enemy.oilCovered) {
          dmg = Math.round(dmg * 2.5);
          enemy.burnPerTurn = Math.max(enemy.burnPerTurn || 0, 150);
          enemy.burnTurns = 3;
          enemy.oilCovered = false;
          enemy.oilTurns = 0;
        }
        const r = applyLimbDamageToEnemy(player, enemy, tpl, limb, dmg, lv >= 3, logs);
        dealt = r.actualDmg;
        severedNow = r.severedNow;
        if (lv >= 2) enemy.blindTurns = Math.max(enemy.blindTurns || 0, 1);
        logs.push(`[${player.name}] giáng [Thánh Quang] vào [${limb.name}] gây ${r.actualDmg} sát thương!`);
      } else if (skillId === 'blessed_heal') {
        const heal = lv === 1 ? 45 : lv === 2 ? 65 : 90;
        player.hp = Math.min(player.maxHp, player.hp + heal);
        player.statuses.bleeding = false;
        if (lv >= 2) player.limbs.infected = { leftArm: false, rightArm: false, leftLeg: false, rightLeg: false };
        if (lv >= 3) player.statuses.blessedArmorTurns = Math.max(player.statuses.blessedArmorTurns || 0, 2);
        logs.push(
          lv >= 3
            ? `[${player.name}] niệm [Phép Lành] hồi +${heal} Sinh Lực, cầm máu và tăng +20% Giáp (2 lượt)!`
            : `[${player.name}] niệm [Phép Lành] hồi +${heal} Sinh Lực & cầm máu!`
        );
      } else if (skillId === 'divine_aegis') {
        player.statuses.divineAegisTurns = lv === 1 ? 2 : 3;
        player.statuses.divineAegisLevel = lv;
        player.statuses.guarding = true;
        logs.push(`[${player.name}] dựng [Hộ Thể] trong ${player.statuses.divineAegisTurns} lượt!`);
      } else if (skillId === 'purification') {
        const heal = lv === 1 ? 15 : lv === 2 ? 30 : 45;
        player.hp = Math.min(player.maxHp, player.hp + heal);
        if (lv >= 3) player.mind = Math.min(player.maxMind, player.mind + 15);
        player.statuses.poisoned = false;
        player.statuses.parasite = false;
        player.statuses.blindedTurns = 0;
        player.limbs.infected = { leftArm: false, rightArm: false, leftLeg: false, rightLeg: false };
        if (lv >= 2) player.statuses.statusImmunityTurns = lv;
        logs.push(`[${player.name}] niệm [Thanh Tẩy] giải trừ ác tật!`);
      } else if (skillId === 'flesh_rend' && limb) {
        const dmg = lv === 1 ? 350 : lv === 2 ? 480 : 620;
        const bleed = lv === 1 ? 180 : lv === 2 ? 250 : 320;
        if (lv >= 3) {
          limb.armor = Math.max(0, (limb.armor || 0) * 0.6);
        }
        const r = applyLimbDamageToEnemy(player, enemy, tpl, limb, dmg, false, logs);
        dealt = r.actualDmg;
        severedNow = r.severedNow;
        enemy.bleedPerTurn = Math.max(enemy.bleedPerTurn || 0, bleed);
        logs.push(`[${player.name}] dùng [Xé Xác] vào [${limb.name}] gây ${r.actualDmg} sát thương!`);
      } else if (skillId === 'blood_pact') {
        player.statuses.bloodPactLevel = lv;
        logs.push(`[${player.name}] kích hoạt [Huyết Ước] cho đòn đánh kế tiếp!`);
      } else if (skillId === 'blood_drain' && limb) {
        let dmg = lv === 1 ? 380 : lv === 2 ? 520 : 680;
        let heal = lv === 1 ? 25 : lv === 2 ? 38 : 55;
        if (lv >= 2 && (enemy.bleedPerTurn || 0) > 0) {
          dmg = Math.round(dmg * 1.5);
          heal = Math.round(heal * 1.5);
        }
        const r = applyLimbDamageToEnemy(player, enemy, tpl, limb, dmg, false, logs);
        dealt = r.actualDmg;
        severedNow = r.severedNow;
        player.hp = Math.min(player.maxHp, player.hp + heal);
        logs.push(`[${player.name}] dùng [Hút Máu] gây ${r.actualDmg} sát thương và hồi +${heal} Sinh Lực!`);
      } else if (skillId === 'void_bite' && limb) {
        const dmg = lv === 1 ? 500 : lv === 2 ? 680 : 880;
        const r = applyLimbDamageToEnemy(player, enemy, tpl, limb, dmg, true, logs);
        dealt = r.actualDmg;
        severedNow = r.severedNow;
        if (lv >= 3) {
          enemy.telegraphing = false;
          enemy.telegraphCoinFlip = false;
        }
        logs.push(`[${player.name}] niệm [Hư Vô Cắn] lên [${limb.name}] gây ${r.actualDmg} sát thương chuẩn!`);
      } else if (skillId === 'veil_of_blindness') {
        enemy.blindTurns = Math.max(enemy.blindTurns || 0, lv === 1 ? 2 : 3);
        if (lv >= 2) {
          player.statuses.veilEvasionTurns = Math.max(player.statuses.veilEvasionTurns || 0, lv === 2 ? 2 : 3);
        }
        if (lv >= 3) {
          enemy.telegraphing = false;
          enemy.telegraphCoinFlip = false;
        }
        logs.push(`[${player.name}] tung [Che Mắt] làm mù kẻ thù!`);
      } else if (skillId === 'obliterate' && limb) {
        const threshold = lv === 1 ? 400 : lv === 2 ? 650 : 900;
        const fallbackDmg = lv === 1 ? 450 : lv === 2 ? 620 : 800;
        const r = applyLimbDamageToEnemy(player, enemy, tpl, limb, limb.hp <= threshold ? limb.hp + 999 : fallbackDmg, true, logs);
        dealt = r.actualDmg;
        severedNow = r.severedNow;
        if (limb.hp <= 0) {
          logs.push(`[Xóa Sổ] XÓA SẠCH SỰ TỒN TẠI của [${limb.name}]!`);
        } else {
          limb.armor = 0;
          if (lv >= 3) {
            enemy.lockedLimbIds[limb.id] = Math.max(enemy.lockedLimbIds[limb.id] || 0, 1);
            logs.push(
              `[Xóa Sổ] giáng ${r.actualDmg} sát thương chuẩn và nghiền nát hoàn toàn lớp giáp của [${limb.name}]! Bộ phận bị khóa cứng 1 lượt!`
            );
          } else {
            logs.push(
              `[Xóa Sổ] giáng ${r.actualDmg} sát thương chuẩn và nghiền nát hoàn toàn lớp giáp của [${limb.name}]!`
            );
          }
        }
      } else if (skillId === 'en_garde' && limb) {
        const wpn = getEffectiveWeapon(player);
        const mult = lv === 1 ? 1.0 : lv === 2 ? 1.3 : 1.6;
        const isEnGardeCrit = lv >= 3 && player.hunger < 90;
        const baseDmg = Math.round(rng.int(wpn.dmg[0], wpn.dmg[1]) * mult * (isEnGardeCrit ? 1.5 : 1.0));
        if (isEnGardeCrit) wasCrit = true;
        player.statuses.guarding = true;
        player.statuses.enGardeTurns = Math.max(player.statuses.enGardeTurns || 0, 1);
        player.statuses.enGardeLevel = Math.max(player.statuses.enGardeLevel || 0, lv);
        const r = applyLimbDamageToEnemy(player, enemy, tpl, limb, baseDmg, false, logs);
        dealt = r.actualDmg;
        severedNow = r.severedNow;
        logs.push(
          `[${player.name}] dùng [Thế Thủ Phản Kích] vào [${limb.name}] gây ${r.actualDmg} sát thương${wasCrit ? ' (CHÍ MẠNG!)' : ''}!`
        );
      }

      const skVfx = getSkillVfxMeta(skillId, getEffectiveWeapon(player).id);
      if (isEnemyDead(enemy)) {
        const deadOut = handleEnemyDeath(player, enemy, tpl, logs, severedNow, wasCrit);
        deadOut.lastDealtDmg = dealt;
        deadOut.weaponCategory = skVfx.weaponCategory;
        deadOut.vfxColor = skVfx.vfxColor;
        deadOut.actorIdx = actorIndex;
        return deadOut;
      }
      return {
        logs,
        enemyDefeated: false,
        playerDefeated: false,
        lastDealtDmg: dealt,
        severedAnyLimb: severedNow,
        wasCrit,
        targetLimbId: limb?.id,
        weaponCategory: skVfx.weaponCategory,
        vfxColor: skVfx.vfxColor,
        actorIdx: actorIndex,
      };
    }

    if (action === 'ITEM' && opts?.itemId) {
      const itemId = opts.itemId;
      const count = player.inventory[itemId] || 0;
      const item = CONFIG.ITEMS[itemId];
      if (count <= 0 || !item || !item.combatUsable) {
        return { logs: ['Không thể dùng vật phẩm này trong trận!'], enemyDefeated: false, playerDefeated: false };
      }
      const actorName = player.name;
      player.inventory[itemId] = count - 1;
      let dealt = 0;
      let severedNow = false;
      let wasCrit = false;

      if (itemId === 'brown_vial') {
        const dmg = rng.int(CONFIG.BROWN_VIAL_MIN_DMG, CONFIG.BROWN_VIAL_MAX_DMG);
        const torso = enemy.limbs.find((l) => l.id === 'torso' && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
        logs.push(`[${actorName}] ném [Lọ Nâu] phát nổ dữ dội (${dmg} sát thương)!`);
        if (tpl.id === 'ouroboros_serpent' && enemy.telegraphing) {
          enemy.telegraphing = false;
          const head = enemy.limbs.find((l) => l.id === 'head');
          if (head && head.hp > 0) applyLimbDamageToEnemy(player, enemy, tpl, head, dmg, true, logs);
        }
        const res = applyLimbDamageToEnemy(player, enemy, tpl, torso, dmg, true, logs);
        dealt = res.actualDmg;
        severedNow = res.severedNow;
        for (const l of enemy.limbs) {
          if (l.id !== 'torso' && l.hp > 0 && l.hp <= 420) {
            const sub = applyLimbDamageToEnemy(player, enemy, tpl, l, l.hp + 50, true, logs);
            if (sub.severedNow) severedNow = true;
          }
        }
      } else if (itemId === 'red_vial') {
        enemy.blindTurns = Math.max(enemy.blindTurns, CONFIG.RED_VIAL_BLIND_TURNS);
        enemy.acidTurns = Math.max(enemy.acidTurns || 0, 3);
        const head = enemy.limbs.find((l) => l.id === 'head' && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
        for (const l of enemy.limbs) l.armor = (l.armor || 0) * (1 - CONFIG.RED_VIAL_ARMOR_SHRED);
        const sub = applyLimbDamageToEnemy(player, enemy, tpl, head, 190, true, logs);
        dealt = sub.actualDmg;
        logs.push(`[${actorName}] tạt [Lọ Đỏ] làm mù & bào giáp ${tpl.name}!`);
        if (tpl.id === 'grand_abbess' && enemy.telegraphing) {
          enemy.telegraphing = false;
          logs.push('Đại Nữ Tu ôm mặt gào thét, đòn Ánh Sáng Phán Xét bị hủy bỏ!');
        }
      } else if (itemId === 'white_vial') {
        player.statuses.parasite = false;
        player.statuses.poisoned = false;
        player.limbs.infected = { leftArm: false, rightArm: false, leftLeg: false, rightLeg: false };
        logs.push(`[${actorName}] uống [Thuốc Giải Độc] thanh tẩy ký sinh & độc tố!`);
      } else if (itemId === 'purple_vial') {
        enemy.oilCovered = true;
        enemy.oilTurns = 3;
        if (tpl.tier === 'normal' && canPlayerFlee(player)) {
          return { logs: ['[Lọ Tím] tạo màn khói đặc giúp cả đội Bỏ chạy thành công!'], enemyDefeated: false, playerDefeated: false, fledSuccess: true };
        }
        logs.push(`[${actorName}] ném [Lọ Tím] phủ Tinh Dầu lên ${tpl.name}!`);
      } else if (itemId === 'rotten_meat') {
        if (tpl.isBeast) {
          enemy.stunTurns = Math.max(enemy.stunTurns, 1);
          enemy.telegraphing = false;
          logs.push(`[${actorName}] ném [Thịt Thối] dụ ${tpl.name} bỏ qua 1 lượt!`);
        } else {
          logs.push(`${tpl.name} không bị mắc bẫy [Thịt Thối]!`);
        }
      } else if (itemId === 'silver_sword_oil') {
        player.silverOilTurns = 6;
        logs.push(`[${actorName}] bôi [Dầu Kiếm Bạc] lên vũ khí!`);
      } else if (itemId === 'holy_fire_oil') {
        const torso = enemy.limbs.find((l) => l.id === 'torso' && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
        const sub = applyLimbDamageToEnemy(player, enemy, tpl, torso, enemy.oilCovered ? 1050 : 420, true, logs);
        dealt = sub.actualDmg;
        enemy.oilCovered = false;
        enemy.oilTurns = 0;
        enemy.burnPerTurn = Math.max(enemy.burnPerTurn || 0, 180);
        enemy.burnTurns = 3;
        logs.push(`[${actorName}] ném [Lọ Dầu Lửa Thánh] gây ${sub.actualDmg} sát thương!`);
      } else if (itemId === 'void_acid_vial') {
        enemy.acidTurns = Math.max(enemy.acidTurns || 0, 4);
        for (const l of enemy.limbs) l.armor = (l.armor || 0) * 0.3;
        const torso = enemy.limbs.find((l) => l.id === 'torso' && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
        const sub = applyLimbDamageToEnemy(player, enemy, tpl, torso, 380, true, logs);
        dealt = sub.actualDmg;
        logs.push(`[${actorName}] ném [Lọ Axit Hư Vô] ăn mòn giáp gây ${sub.actualDmg} sát thương!`);
      } else if (itemId === 'steel_trap') {
        const leg = enemy.limbs.find((l) => l.isSupportLeg && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
        enemy.lockedLimbIds[leg.id] = 2;
        enemy.telegraphing = false;
        const sub = applyLimbDamageToEnemy(player, enemy, tpl, leg, 280, false, logs);
        dealt = sub.actualDmg;
        severedNow = sub.severedNow;
        logs.push(`[${actorName}] gài [Bẫy Dây Thép] khóa [${leg.name}]!`);
      } else if (itemId === 'ancient_ash') {
        enemy.blindTurns = Math.max(enemy.blindTurns, 3);
        if (tpl.coinFlipSkill?.requiredLimb === 'head' || tpl.id === 'grand_abbess') {
          enemy.telegraphing = false;
          enemy.telegraphCoinFlip = false;
        }
        logs.push(`[${actorName}] tung [Tro Tàn Cổ] làm Mù ${tpl.name} 3 lượt, mở khóa điểm yếu Đầu!`);
      } else if (itemId === 'poison_powder') {
        enemy.blindTurns = Math.max(enemy.blindTurns, 2);
        const pDot = Math.max(55, Math.round(getEnemyMaxTotalHp(enemy) * 0.04));
        enemy.poisonPerTurn = Math.max(enemy.poisonPerTurn || 0, pDot);
        enemy.poisonTurns = Math.max(enemy.poisonTurns || 0, 3);
        player.poisonCoatTurns = Math.max(player.poisonCoatTurns || 0, 2);
        if (tpl.coinFlipSkill?.requiredLimb === 'head') {
          enemy.telegraphing = false;
          enemy.telegraphCoinFlip = false;
        }
        logs.push(`[${actorName}] rắc [Bột Độc] gây Mù & Nhiễm Độc (${pDot} dmg/lượt), tẩm độc vũ khí!`);
      } else if (itemId === 'poison_herb') {
        player.poisonCoatTurns = 3;
        logs.push(`[${actorName}] tẩm [Thảo Dược Độc] lên vũ khí (3 đòn đánh)!`);
      } else if (itemId === 'lamp_oil') {
        player.fireCoatTurns = 3;
        logs.push(`[${actorName}] tẩm [Dầu Đèn] lên vũ khí (3 đòn đánh)!`);
      } else if (itemId === 'scroll_distract_ash') {
        enemy.blindTurns = Math.max(enemy.blindTurns || 0, 2);
        enemy.telegraphing = false;
        enemy.telegraphCoinFlip = false;
        if (tpl.tier !== 'boss') {
          logs.push(`[${actorName}] tung [Cuộn Đánh Lạc Hướng]! Màn tro mù lòa 2 lượt giúp rút lui an toàn khỏi ${tpl.name}!`);
          return { logs, enemyDefeated: false, playerDefeated: false, fledSuccess: true };
        }
        logs.push(`[${actorName}] tung [Cuộn Đánh Lạc Hướng] làm Mù ${tpl.name} 2 lượt và phá nhịp đòn!`);
      } else if (itemId === 'hunter_arrows') {
        const limb = enemy.limbs.find((l) => l.id === effectiveLimbId && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
        if (limb && rng.chance(0.95)) {
          let arrowDmg = rng.int(260, 340);
          if (player.hunger < 90 && rng.chance(0.35)) {
            wasCrit = true;
            arrowDmg = Math.round(arrowDmg * 1.5);
          }
          const sub = applyLimbDamageToEnemy(player, enemy, tpl, limb, arrowDmg, false, logs, 0.35);
          dealt = sub.actualDmg;
          severedNow = sub.severedNow;
          logs.push(
            `[${actorName}] bắn [Mũi Tên Săn] xuyên vào [${limb.name}] gây ${sub.actualDmg} sát thương${wasCrit ? ' (CHÍ MẠNG!)' : ''}!`
          );
        } else {
          logs.push(`[${actorName}] bắn [Mũi Tên Săn] sượt qua mục tiêu!`);
        }
      } else {
        applySupportItemEffects(player, itemId, logs);
      }

      const itmVfx = getWeaponVfxMeta(itemId, 'dagger');
      if (isEnemyDead(enemy)) {
        const deadOut = handleEnemyDeath(player, enemy, tpl, logs, severedNow, wasCrit);
        deadOut.lastDealtDmg = dealt;
        deadOut.weaponCategory = itmVfx.weaponCategory;
        deadOut.vfxColor = itmVfx.vfxColor;
        deadOut.actorIdx = actorIndex;
        return deadOut;
      }
      return {
        logs,
        enemyDefeated: false,
        playerDefeated: false,
        lastDealtDmg: dealt,
        severedAnyLimb: severedNow,
        wasCrit,
        weaponCategory: itmVfx.weaponCategory,
        vfxColor: itmVfx.vfxColor,
        actorIdx: actorIndex,
      };
    }
    return { logs, enemyDefeated: false, playerDefeated: false };
  }

  // Ally individual action (actorIndex >= 1)
  if (!ally) return { logs: [], enemyDefeated: false, playerDefeated: false };
  ally.guarding = false;

  if (action === 'GUARD') {
    ally.guarding = true;
    ally.mind = Math.min(ally.maxMind, ally.mind + 4);
    if (isPureTankSummon(ally)) {
      return {
        logs: [`[${ally.name}] giữ thế phòng thủ kiên cố, thu hút sát thương cho cả đội!`],
        enemyDefeated: false,
        playerDefeated: false,
      };
    }
    return {
      logs: [`[${ally.name}] thu mình vào thế phòng thủ bảo vệ đội hình!`],
      enemyDefeated: false,
      playerDefeated: false,
    };
  }

  if (action === 'ITEM' && opts?.itemId) {
    const itemId = opts.itemId;
    const item = CONFIG.ITEMS[itemId];
    const count = player.inventory[itemId] || 0;
    if (count <= 0 || !item || !item.combatUsable) {
      return { logs: ['Vật phẩm không khả dụng!'], enemyDefeated: false, playerDefeated: false };
    }
    // Offensive tactical vials/throws execute directly under ally's name/turn; healing/support items apply to this ally
    if (['brown_vial', 'red_vial', 'purple_vial', 'rotten_meat', 'holy_fire_oil', 'void_acid_vial', 'steel_trap', 'ancient_ash', 'poison_powder', 'poison_herb', 'lamp_oil', 'scroll_distract_ash', 'hunter_arrows'].includes(itemId)) {
      const actorName = ally.name;
      player.inventory[itemId] = count - 1;
      let dealt = 0;
      let severedNow = false;
      let wasCrit = false;

      if (itemId === 'brown_vial') {
        const dmg = rng.int(CONFIG.BROWN_VIAL_MIN_DMG, CONFIG.BROWN_VIAL_MAX_DMG);
        const torso = enemy.limbs.find((l) => l.id === 'torso' && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
        logs.push(`[${actorName}] ném [Lọ Nâu] phát nổ dữ dội (${dmg} sát thương)!`);
        if (tpl.id === 'ouroboros_serpent' && enemy.telegraphing) {
          enemy.telegraphing = false;
          const head = enemy.limbs.find((l) => l.id === 'head');
          if (head && head.hp > 0) applyLimbDamageToEnemy(player, enemy, tpl, head, dmg, true, logs);
        }
        const res = applyLimbDamageToEnemy(player, enemy, tpl, torso, dmg, true, logs);
        dealt = res.actualDmg;
        severedNow = res.severedNow;
        for (const l of enemy.limbs) {
          if (l.id !== 'torso' && l.hp > 0 && l.hp <= 420) {
            const sub = applyLimbDamageToEnemy(player, enemy, tpl, l, l.hp + 50, true, logs);
            if (sub.severedNow) severedNow = true;
          }
        }
      } else if (itemId === 'red_vial') {
        enemy.blindTurns = Math.max(enemy.blindTurns, CONFIG.RED_VIAL_BLIND_TURNS);
        enemy.acidTurns = Math.max(enemy.acidTurns || 0, 3);
        const head = enemy.limbs.find((l) => l.id === 'head' && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
        for (const l of enemy.limbs) l.armor = (l.armor || 0) * (1 - CONFIG.RED_VIAL_ARMOR_SHRED);
        const sub = applyLimbDamageToEnemy(player, enemy, tpl, head, 190, true, logs);
        dealt = sub.actualDmg;
        logs.push(`[${actorName}] tạt [Lọ Đỏ] làm mù & bào giáp ${tpl.name}!`);
        if (tpl.id === 'grand_abbess' && enemy.telegraphing) {
          enemy.telegraphing = false;
          logs.push('Đại Nữ Tu ôm mặt gào thét, đòn Ánh Sáng Phán Xét bị hủy bỏ!');
        }
      } else if (itemId === 'purple_vial') {
        enemy.oilCovered = true;
        enemy.oilTurns = 3;
        if (tpl.tier === 'normal' && canPlayerFlee(player)) {
          return { logs: ['[Lọ Tím] tạo màn khói đặc giúp cả đội Bỏ chạy thành công!'], enemyDefeated: false, playerDefeated: false, fledSuccess: true };
        }
        logs.push(`[${actorName}] ném [Lọ Tím] phủ Tinh Dầu lên ${tpl.name}!`);
      } else if (itemId === 'rotten_meat') {
        if (tpl.isBeast) {
          enemy.stunTurns = Math.max(enemy.stunTurns, 1);
          enemy.telegraphing = false;
          logs.push(`[${actorName}] ném [Thịt Thối] dụ ${tpl.name} bỏ qua 1 lượt!`);
        } else {
          logs.push(`${tpl.name} không bị mắc bẫy [Thịt Thối]!`);
        }
      } else if (itemId === 'holy_fire_oil') {
        const torso = enemy.limbs.find((l) => l.id === 'torso' && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
        const sub = applyLimbDamageToEnemy(player, enemy, tpl, torso, enemy.oilCovered ? 1050 : 420, true, logs);
        dealt = sub.actualDmg;
        enemy.oilCovered = false;
        enemy.oilTurns = 0;
        enemy.burnPerTurn = Math.max(enemy.burnPerTurn || 0, 180);
        enemy.burnTurns = 3;
        logs.push(`[${actorName}] ném [Lọ Dầu Lửa Thánh] gây ${sub.actualDmg} sát thương!`);
      } else if (itemId === 'void_acid_vial') {
        enemy.acidTurns = Math.max(enemy.acidTurns || 0, 4);
        for (const l of enemy.limbs) l.armor = (l.armor || 0) * 0.3;
        const torso = enemy.limbs.find((l) => l.id === 'torso' && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
        const sub = applyLimbDamageToEnemy(player, enemy, tpl, torso, 380, true, logs);
        dealt = sub.actualDmg;
        logs.push(`[${actorName}] ném [Lọ Axit Hư Vô] ăn mòn giáp gây ${sub.actualDmg} sát thương!`);
      } else if (itemId === 'steel_trap') {
        const leg = enemy.limbs.find((l) => l.isSupportLeg && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
        enemy.lockedLimbIds[leg.id] = 2;
        enemy.telegraphing = false;
        const sub = applyLimbDamageToEnemy(player, enemy, tpl, leg, 280, false, logs);
        dealt = sub.actualDmg;
        severedNow = sub.severedNow;
        logs.push(`[${actorName}] gài [Bẫy Dây Thép] khóa [${leg.name}]!`);
      } else if (itemId === 'ancient_ash') {
        enemy.blindTurns = Math.max(enemy.blindTurns, 3);
        if (tpl.coinFlipSkill?.requiredLimb === 'head' || tpl.id === 'grand_abbess') {
          enemy.telegraphing = false;
          enemy.telegraphCoinFlip = false;
        }
        logs.push(`[${actorName}] tung [Tro Tàn Cổ] làm Mù ${tpl.name} 3 lượt, mở khóa điểm yếu Đầu!`);
      } else if (itemId === 'poison_powder') {
        enemy.blindTurns = Math.max(enemy.blindTurns, 2);
        const pDot = Math.max(55, Math.round(getEnemyMaxTotalHp(enemy) * 0.04));
        enemy.poisonPerTurn = Math.max(enemy.poisonPerTurn || 0, pDot);
        enemy.poisonTurns = Math.max(enemy.poisonTurns || 0, 3);
        player.poisonCoatTurns = Math.max(player.poisonCoatTurns || 0, 2);
        if (tpl.coinFlipSkill?.requiredLimb === 'head') {
          enemy.telegraphing = false;
          enemy.telegraphCoinFlip = false;
        }
        logs.push(`[${actorName}] rắc [Bột Độc] gây Mù & Nhiễm Độc (${pDot} dmg/lượt), tẩm độc vũ khí!`);
      } else if (itemId === 'poison_herb') {
        player.poisonCoatTurns = 3;
        logs.push(`[${actorName}] tẩm [Thảo Dược Độc] lên vũ khí (3 đòn đánh)!`);
      } else if (itemId === 'lamp_oil') {
        player.fireCoatTurns = 3;
        logs.push(`[${actorName}] tẩm [Dầu Đèn] lên vũ khí (3 đòn đánh)!`);
      } else if (itemId === 'scroll_distract_ash') {
        enemy.blindTurns = Math.max(enemy.blindTurns || 0, 2);
        enemy.telegraphing = false;
        enemy.telegraphCoinFlip = false;
        if (tpl.tier !== 'boss') {
          logs.push(`[${actorName}] tung [Cuộn Đánh Lạc Hướng]! Màn tro mù lòa 2 lượt giúp rút lui an toàn khỏi ${tpl.name}!`);
          return { logs, enemyDefeated: false, playerDefeated: false, fledSuccess: true };
        }
        logs.push(`[${actorName}] tung [Cuộn Đánh Lạc Hướng] làm Mù ${tpl.name} 2 lượt và phá nhịp đòn!`);
      } else if (itemId === 'hunter_arrows') {
        const limb = enemy.limbs.find((l) => l.id === effectiveLimbId && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
        if (limb && rng.chance(0.95)) {
          let arrowDmg = rng.int(260, 340);
          if ((ally.isUndeadSummon || (ally.hunger || 0) < 90) && rng.chance(0.35)) {
            wasCrit = true;
            arrowDmg = Math.round(arrowDmg * 1.5);
          }
          const sub = applyLimbDamageToEnemy(player, enemy, tpl, limb, arrowDmg, false, logs, 0.35);
          dealt = sub.actualDmg;
          severedNow = sub.severedNow;
          logs.push(
            `[${actorName}] bắn [Mũi Tên Săn] xuyên vào [${limb.name}] gây ${sub.actualDmg} sát thương${wasCrit ? ' (CHÍ MẠNG!)' : ''}!`
          );
        } else {
          logs.push(`[${actorName}] bắn [Mũi Tên Săn] sượt qua mục tiêu!`);
        }
      }

      const itmVfx = getWeaponVfxMeta(itemId, 'dagger');
      if (isEnemyDead(enemy)) {
        const deadOut = handleEnemyDeath(player, enemy, tpl, logs, severedNow, wasCrit);
        deadOut.lastDealtDmg = dealt;
        deadOut.weaponCategory = itmVfx.weaponCategory;
        deadOut.vfxColor = itmVfx.vfxColor;
        deadOut.actorIdx = actorIndex;
        return deadOut;
      }
      return {
        logs,
        enemyDefeated: false,
        playerDefeated: false,
        lastDealtDmg: dealt,
        severedAnyLimb: severedNow,
        wasCrit,
        weaponCategory: itmVfx.weaponCategory,
        vfxColor: itmVfx.vfxColor,
        actorIdx: actorIndex,
      };
    }
    applySupportItemToAlly(player, actorIndex - 1, itemId, logs);
    return { logs, enemyDefeated: false, playerDefeated: false, actorIdx: actorIndex };
  }

  if (action === 'SKILL' && opts?.skillId) {
    const skillId = opts.skillId;
    const skill = CONFIG.SKILLS.find((s) => s.id === skillId);
    if (!skill || ally.mind < skill.mindCost) {
      return { logs: [`[${ally.name}] không đủ Lý Trí để dùng kỹ năng này!`], enemyDefeated: false, playerDefeated: false };
    }
    ally.mind = Math.max(0, ally.mind - skill.mindCost);
    const limb = enemy.limbs.find((l) => l.id === effectiveLimbId && l.hp > 0) || enemy.limbs.find((l) => l.hp > 0)!;
    let dealt = 0;
    let severedNow = false;

    if (skillId === 'divine_aegis') {
      const necLv = player.skillLevels?.necromancy || 1;
      const shieldTurns = necLv >= 3 ? 3 : 2;
      ally.guarding = true;
      ally.divineAegisTurns = Math.max(ally.divineAegisTurns || 0, shieldTurns);
      player.statuses.divineAegisTurns = Math.max(player.statuses.divineAegisTurns || 0, 2);
      player.statuses.divineAegisLevel = Math.max(player.statuses.divineAegisLevel || 0, necLv >= 3 ? 2 : 1);
      logs.push(
        `[${ally.name}] dựng [Hộ Thể Linh Hồn] trong ${shieldTurns} lượt, tạo khiên bảo vệ đồng đội & thu hút sát thương!`
      );
    } else if (skillId === 'blessed_heal') {
      const target = [player, ...player.party.filter((a) => a.hp > 0)].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (target && 'classId' in target && 'inventory' in target) {
        target.hp = Math.min(target.maxHp, target.hp + 45);
        target.statuses.bleeding = false;
        logs.push(`[${ally.name}] niệm [Phép Lành] hồi +45 Sinh Lực & cầm máu cho [${target.name}]!`);
      } else if (target) {
        target.hp = Math.min(target.maxHp, target.hp + 45);
        if (target.statuses) target.statuses.bleeding = false;
        logs.push(`[${ally.name}] niệm [Phép Lành] hồi +45 Sinh Lực cho [${target.name}]!`);
      }
    } else if (skillId === 'purification') {
      player.statuses.poisoned = false;
      player.statuses.parasite = false;
      player.limbs.infected = { leftArm: false, rightArm: false, leftLeg: false, rightLeg: false };
      ally.statuses = { bleeding: false, poisoned: false, parasite: false };
      logs.push(`[${ally.name}] niệm [Thanh Tẩy] xóa sạch Độc & Ký sinh cho tổ đội!`);
    } else if (skillId === 'veil_of_blindness') {
      enemy.blindTurns = Math.max(enemy.blindTurns || 0, 2);
      logs.push(`[${ally.name}] tung [Che Mắt] làm mù ${tpl.name} 2 lượt!`);
    } else if (skillId === 'hamstring_bind' && limb) {
      const summonDmgMult = ally.isUndeadSummon && !isPureTankSummon(ally) ? getUndeadSummonDmgMultiplier(player) : 1;
      enemy.lockedLimbIds[limb.id] = 2;
      const r = applyLimbDamageToEnemy(player, enemy, tpl, limb, Math.round(190 * summonDmgMult), false, logs);
      dealt = r.actualDmg;
      severedNow = r.severedNow;
      logs.push(`[${ally.name}] dùng [Trói Gân] khóa [${limb.name}] & gây ${r.actualDmg} sát thương!`);
    } else if (skillId === 'whirlwind_slash') {
      const summonDmgMult = ally.isUndeadSummon && !isPureTankSummon(ally) ? getUndeadSummonDmgMultiplier(player) : 1;
      const wpn = getAllyEffectiveWeapon(ally);
      const baseDmg = Math.round(rng.int(wpn.dmg[0], wpn.dmg[1]) * summonDmgMult);
      const torso = enemy.limbs.find((l) => l.id === 'torso' && l.hp > 0);
      const arm = enemy.limbs.find((l) => (l.isWeaponArm || l.isShieldArm) && l.hp > 0);
      const tList = [torso, arm].filter(Boolean) as LimbConfig[];
      logs.push(`[${ally.name}] thi triển [Nhát Chém Xoáy]!`);
      for (const t of tList.length ? tList : [limb]) {
        const r = applyLimbDamageToEnemy(player, enemy, tpl, t, baseDmg, false, logs);
        dealt += r.actualDmg;
        if (r.severedNow) severedNow = true;
      }
    } else if (skillId === 'holy_light' && limb) {
      const dmg = rng.int(440, 580);
      const r = applyLimbDamageToEnemy(player, enemy, tpl, limb, dmg, false, logs);
      dealt = r.actualDmg;
      severedNow = r.severedNow;
      logs.push(`[${ally.name}] giáng [Thánh Quang] vào [${limb.name}] gây ${r.actualDmg} sát thương!`);
    } else if (skillId === 'void_bite' && limb) {
      const r = applyLimbDamageToEnemy(player, enemy, tpl, limb, 460, true, logs);
      dealt = r.actualDmg;
      severedNow = r.severedNow;
      logs.push(`[${ally.name}] niệm [Hư Vô Cắn] vào [${limb.name}] gây ${r.actualDmg} sát thương chuẩn!`);
    } else if (limb) {
      const summonDmgMult = ally.isUndeadSummon && !isPureTankSummon(ally) ? getUndeadSummonDmgMultiplier(player) : 1;
      const rendDmg = Math.round(200 * summonDmgMult);
      const rendBleed = Math.round(90 * summonDmgMult);
      const r = applyLimbDamageToEnemy(player, enemy, tpl, limb, rendDmg, false, logs);
      dealt = r.actualDmg;
      severedNow = r.severedNow;
      enemy.bleedPerTurn = Math.max(enemy.bleedPerTurn || 0, rendBleed);
      logs.push(`[${ally.name}] cào xé [${limb.name}] gây ${r.actualDmg} sát thương!`);
    }

    const allySkVfx = getSkillVfxMeta(skillId, getAllyEffectiveWeapon(ally).id);
    if (isEnemyDead(enemy)) {
      const deadOut = handleEnemyDeath(player, enemy, tpl, logs, severedNow, false);
      deadOut.lastDealtDmg = dealt;
      deadOut.weaponCategory = allySkVfx.weaponCategory;
      deadOut.vfxColor = allySkVfx.vfxColor;
      deadOut.actorIdx = actorIndex;
      return deadOut;
    }
    return {
      logs,
      enemyDefeated: false,
      playerDefeated: false,
      lastDealtDmg: dealt,
      severedAnyLimb: severedNow,
      targetLimbId: limb?.id,
      weaponCategory: allySkVfx.weaponCategory,
      vfxColor: allySkVfx.vfxColor,
      actorIdx: actorIndex,
    };
  }

  // Pure Tank summons lock offensive ATTACK and prioritize protective stance (must cast divine_aegis for party shield)
  if (isPureTankSummon(ally)) {
    ally.guarding = true;
    ally.mind = Math.min(ally.maxMind, ally.mind + 4);
    return {
      logs: [
        `[${ally.name}] là Oán Linh Thuần Phòng Thủ — khóa đòn tấn công và thu mình vào thế thủ thu hút sát thương!`,
      ],
      enemyDefeated: false,
      playerDefeated: false,
    };
  }

  // Ally ATTACK
  const targetCheck = canTargetEnemyLimb(enemy, tpl, effectiveLimbId);
  const limb =
    (targetCheck.allowed ? enemy.limbs.find((l) => l.id === effectiveLimbId) : null) ||
    enemy.limbs.find((l) => l.hp > 0 && canTargetEnemyLimb(enemy, tpl, l.id).allowed) ||
    enemy.limbs.find((l) => l.hp > 0);
  if (!limb) return { logs, enemyDefeated: isEnemyDead(enemy), playerDefeated: false };

  const allyWpn = getAllyEffectiveWeapon(ally);
  const hitChance = Math.max(0.25, Math.min(0.96, 0.86 + allyWpn.hitBonus - (limb.evasionBonus || 0)));
  if (!rng.chance(hitChance)) {
    return {
      logs: [`[${ally.name}] vung [${allyWpn.name}] nhắm vào [${limb.name}] nhưng trượt!`],
      enemyDefeated: false,
      playerDefeated: false,
      targetLimbId: limb.id,
    };
  }
  let allyDmg = rng.int(allyWpn.dmg[0], allyWpn.dmg[1]);
  if (!ally.isUndeadSummon && (ally.hunger || 0) >= 50) allyDmg = Math.round(allyDmg * 0.75);
  if (ally.isUndeadSummon && !isPureTankSummon(ally)) {
    allyDmg = Math.round(allyDmg * getUndeadSummonDmgMultiplier(player));
  }
  let wasCrit = false;
  if ((ally.isUndeadSummon || (ally.hunger || 0) < 90) && rng.chance(allyWpn.critChance)) {
    wasCrit = true;
    allyDmg = Math.round(allyDmg * 1.5);
  }
  const ignoreArmor = allyWpn.damageType === 'true' || (allyWpn.armorPen || 0) >= 1.0;
  const sub = applyLimbDamageToEnemy(player, enemy, tpl, limb, allyDmg, ignoreArmor, logs, allyWpn.armorPen || 0);
  logs.unshift(
    `[${ally.name}] dùng [${allyWpn.name}] đánh vào [${limb.name}] gây ${sub.actualDmg} sát thương${wasCrit? '(CHÍ MẠNG!)': ''}!`
  );
  const allyWpnVfx = getWeaponVfxMeta(allyWpn.id);
  if (isEnemyDead(enemy)) {
    const deadOut = handleEnemyDeath(player, enemy, tpl, logs, sub.severedNow, wasCrit);
    deadOut.lastDealtDmg = sub.actualDmg;
    deadOut.targetLimbId = limb.id;
    deadOut.weaponCategory = allyWpnVfx.weaponCategory;
    deadOut.vfxColor = allyWpnVfx.vfxColor;
    deadOut.actorIdx = actorIndex;
    return deadOut;
  }
  return {
    logs,
    enemyDefeated: false,
    playerDefeated: false,
    lastDealtDmg: sub.actualDmg,
    severedAnyLimb: sub.severedNow,
    wasCrit,
    targetLimbId: limb.id,
    particleType: wasCrit ? 'spark' : 'blood',
    weaponCategory: allyWpnVfx.weaponCategory,
    vfxColor: allyWpnVfx.vfxColor,
    actorIdx: actorIndex,
  };
}

function applyDamageToPlayer(
  player: PlayerState,
  enemy: MapEnemyInstance,
  tpl: EnemyTemplate,
  rawDmg: number,
  isTelegraphLethal: boolean,
  logs: string[],
  rng: SeededRNG
): number {
  // Alive party allies can intercept single-target hits; Pure Tanks draw high Aggro (72%-82%)
  const aliveAllies = player.party.filter((a) => a.hp > 0);
  const hasPureTank = aliveAllies.some((a) => isPureTankSummon(a));
  const hasGuardingPureTank = aliveAllies.some((a) => isPureTankSummon(a) && (a.guarding || (a.divineAegisTurns || 0) > 0));
  const interceptChance = hasGuardingPureTank ? 0.82 : hasPureTank ? 0.72 : 0.38;

  if (aliveAllies.length > 0 && rng.chance(interceptChance)) {
    const weightedPool: PartyAlly[] = [];
    for (const candidate of aliveAllies) {
      const weight = isPureTankSummon(candidate)
        ? candidate.guarding || (candidate.divineAegisTurns || 0) > 0
          ? 8
          : 5
        : candidate.guarding
        ? 2
        : 1;
      for (let w = 0; w < weight; w++) weightedPool.push(candidate);
    }
    const ally = rng.pick(weightedPool);
    const allyStats = getAllyComputedStats(ally, player);
    const basePhysDef = allyStats.physDefPct / 100;
    const allyShield =
      ally.equippedShield && ally.limbs?.leftArm && ally.limbs?.rightArm
        ? CONFIG.SHIELDS[ally.equippedShield]
        : null;

    let allyRed = basePhysDef;
    if ((ally.divineAegisTurns || 0) > 0) {
      allyRed = Math.max(allyRed, 0.75);
    } else if (ally.guarding) {
      allyRed = Math.max(
        allyRed,
        isPureTankSummon(ally) ? Math.min(0.85, basePhysDef + 0.38) : allyShield ? allyShield.guardReduction : 0.58
      );
      if (allyShield && allyShield.thornsDmg > 0) {
        const torso = enemy.limbs.find((l) => l.id === 'torso');
        if (torso) torso.hp = Math.max(0, torso.hp - allyShield.thornsDmg);
        logs.push(`[${ally.name}] dùng [${allyShield.name}] phản lại ${allyShield.thornsDmg} sát thương!`);
      }
    }

    const allyDmg = Math.max(1, Math.round(rawDmg * (1 - allyRed)));
    ally.hp = Math.max(0, ally.hp - allyDmg);
    const wasProtectedFromSever = ally.guarding || (ally.divineAegisTurns || 0) > 0 || Boolean(allyShield?.preventLimbLoss && ally.guarding);
    logs.push(
      `${isPureTankSummon(ally)? 'Oán Linh Thuần Thủ': 'Đồng đội'} [${ally.name}] thu hút và đỡ đòn từ ${enemy.customName || tpl.name}, nhận ${allyDmg} sát thương (Sinh Lực còn ${ally.hp}/${ally.maxHp})!`
    );
    if (isTelegraphLethal && !wasProtectedFromSever && ally.hp > 0 && rng.chance(0.45)) {
      const limbCandidates: Array<{ key: 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'; label: string }> = [
        { key: 'leftLeg', label: 'Chân Trái' },
        { key: 'rightLeg', label: 'Chân Phải' },
        { key: 'leftArm', label: 'Tay Trái' },
        { key: 'rightArm', label: 'Tay Phải' },
      ];
      const intact = limbCandidates.filter((c) => ally.limbs[c.key]);
      if (intact.length > 0) {
        const cut = rng.pick(intact);
        ally.limbs[cut.key] = false;
        logs.push(`Đòn chí mạng chặt đứt lìa [${cut.label}] của đồng đội [${ally.name}]!`);
        if (cut.key === 'leftArm' || cut.key === 'rightArm') {
          handleAllyArmLoss(player, ally, cut.key, logs);
        }
      }
    }
    if (ally.hp <= 0) {
      logs.push(`Đồng đội [${ally.name}] đã gục ngã trên chiến trường!`);
      reclaimUndeadSummonGear(player, ally, logs);
      markLivingAllyDead(player, ally);
    }
    return allyDmg;
  }

  const stats = getComputedPlayerStats(player);
  let reduction = stats.physDefPct / 100;
  const shield = player.equippedShield && countIntactArms(player) >= 1 ? CONFIG.SHIELDS[player.equippedShield] : null;
  const headGear = player.equippedHead ? GEAR_ITEMS[player.equippedHead] : null;
  const bodyGear = player.equippedBody ? GEAR_ITEMS[player.equippedBody] : null;

  if (player.statuses.divineAegisTurns > 0) {
    const aegisRed = player.statuses.divineAegisLevel === 1 ? 0.75 : player.statuses.divineAegisLevel === 2 ? 0.82 : 0.88;
    reduction = Math.max(reduction, aegisRed);
    if (player.statuses.divineAegisLevel >= 3) {
      const torso = enemy.limbs.find((l) => l.id === 'torso');
      if (torso) torso.hp = Math.max(0, torso.hp - 200);
      logs.push('Khiên Hộ Thể tối thượng phản ngược 200 sát thương Thánh!');
    }
  } else if ((player.statuses.enGardeTurns || 0) > 0) {
    const egLv = player.statuses.enGardeLevel || 1;
    const egRed = egLv === 1 ? 0.65 : egLv === 2 ? 0.75 : 0.85;
    reduction = Math.max(reduction, egRed);
  } else if (player.statuses.guarding) {
    reduction = Math.max(reduction, shield ? shield.guardReduction : 0.55);
    if (shield && shield.thornsDmg > 0) {
      const torso = enemy.limbs.find((l) => l.id === 'torso');
      if (torso) torso.hp = Math.max(0, torso.hp - shield.thornsDmg);
      logs.push(`Gai nhọn của [${shield.name}] đâm ngược lại quái gây ${shield.thornsDmg} sát thương!`);
    }
  }

  if ((player.statuses.blessedArmorTurns || 0) > 0) {
    reduction = Math.min(0.9, reduction + 0.2);
  }

  if (player.equippedAccessory === 'vaelis_signet' && player.hp / Math.max(1, player.maxHp) < 0.3) {
    reduction = Math.min(0.9, reduction + 0.2);
  }

  const finalDmg = Math.max(1, Math.round(rawDmg * (1 - reduction)));
  player.hp = Math.max(0, player.hp - finalDmg);
  logs.push(`${enemy.customName || tpl.name} gây ${finalDmg} sát thương lên bạn (Sinh Lực còn ${player.hp}/${player.maxHp}).`);

  const consumeBlackStrawEffigy = (): boolean => {
    if (player.equippedAccessory !== 'black_straw_effigy') return false;
    player.equippedAccessory = null;
    player.unlockedGear = (player.unlockedGear || []).filter((g) => g !== 'black_straw_effigy');
    logs.push('[Hình Nhân Rơm Đen] bốc cháy thành tro, gánh thay lời nguyền cho bạn!');
    return true;
  };

  if (player.statuses.statusImmunityTurns <= 0) {
    if (
      (tpl.id === 'armored_ghoul' || tpl.id === 'void_tentacle_cluster' || tpl.id === 'hollowed_void_walker') &&
      rng.chance(0.45)
    ) {
      if (!consumeBlackStrawEffigy()) {
        player.statuses.parasite = true;
        logs.push('KINH HOÀNG: Ấu trùng ký sinh hư vô đã chui vào tủy sống, khiến thị lực mờ đục!');
      }
    }
    const baseBleedChance = player.bleedStunResist ? 0.25 : 0.55;
    const effectiveBleedChance = baseBleedChance * (1 - (bodyGear?.bleedResistPct || 0));
    if (
      (tpl.id === 'weeping_inquisitor' || tpl.id === 'countess_carmilla' || tpl.id === 'butcher_kaelgor') &&
      (player.statuses.bleedImmunityTurns || 0) <= 0 &&
      rng.chance(effectiveBleedChance)
    ) {
      player.statuses.bleeding = true;
      logs.push('Bạn bị rách động mạch gây CHẢY MÁU!');
    }
    if ((tpl.id === 'armored_ghoul' || tpl.id === 'rotting_priest') && rng.chance(0.40)) {
      const limbKeys: Array<'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'> = ['leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
      const intactKeys = limbKeys.filter((k) => player.limbs[k]);
      if (intactKeys.length > 0) {
        if (!consumeBlackStrawEffigy()) {
          const chosen = rng.pick(intactKeys);
          player.limbs.infected[chosen] = true;
          logs.push('Vết cắn bẩn thỉu khiến chi thể sưng tấy, mưng mủ nhiễm trùng!');
        }
      }
    }
  }

  const protectedFromSever =
    player.statuses.guarding ||
    player.statuses.divineAegisTurns > 0 ||
    ((player.statuses.enGardeTurns || 0) > 0 && (player.statuses.enGardeLevel || 1) >= 3) ||
    Boolean(shield && shield.preventLimbLoss && player.statuses.guarding);

  if (isTelegraphLethal && !protectedFromSever) {
    const severCandidates: Array<{ key: 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'; label: string }> = [
      { key: 'leftLeg', label: 'Chân Trái' },
      { key: 'rightLeg', label: 'Chân Phải' },
      { key: 'leftArm', label: 'Tay Trái' },
      { key: 'rightArm', label: 'Tay Phải' },
    ];
    const intact = severCandidates.filter((c) => player.limbs[c.key]);
    const severResist = Math.min(
      0.75,
      (headGear?.limbSeverResistPct || 0) + (bodyGear?.limbSeverResistPct || 0)
    );
    const effectiveSeverChance = 0.65 * (1 - severResist);
    if (intact.length > 0 && rng.chance(effectiveSeverChance)) {
      const victim = rng.pick(intact);
      player.limbs[victim.key] = false;
      player.limbs.infected[victim.key] = false;
      if ((player.statuses.bleedImmunityTurns || 0) <= 0) {
        player.statuses.bleeding = true;
      }
      logs.push(`ĐÒN CHÍ MẠNG CẮT ĐỨT LÌA [${victim.label}] CỦA BẠN! Máu phun xối xả!`);
      if (victim.key === 'leftArm' || victim.key === 'rightArm') {
        handlePlayerArmLoss(player, victim.key, logs);
      }
    }
  }

  return finalDmg;
}

function handleEnemyDeath(
  player: PlayerState,
  enemy: MapEnemyInstance,
  tpl: EnemyTemplate,
  logs: string[],
  severedAnyLimb: boolean,
  wasCrit: boolean
): CombatTurnResult {
  enemy.defeated = true;
  player.stats.enemiesSlain += 1;
  player.silverCoins += tpl.tier === 'normal' ? 6 : 20;
  player.inventory.silver_coin = Math.max(0, player.silverCoins);
  if (tpl.tier === 'miniboss' || tpl.tier === 'boss') {
    player.stats.miniBossesSlain += 1;
  }

  logs.push(`TIÊU DIỆT THÀNH CÔNG [${enemy.customName || tpl.name}] (+${tpl.tier === 'normal'? 6: 20} Đồng Bạc)!`);

  if (tpl.dropEnergyStones > 0) {
    player.energyStones += tpl.dropEnergyStones;
    player.inventory.energy_stone = Math.max(0, player.energyStones);
    logs.push(`Thu thập được +${tpl.dropEnergyStones} Đá Linh Hồn Rỗng giữa đống tro tàn.`);
  }

  if (tpl.dropLuckyCoins && tpl.dropLuckyCoins > 0) {
    player.inventory.lucky_coin = (player.inventory.lucky_coin || 0) + tpl.dropLuckyCoins;
    logs.push(`Nhặt được +${tpl.dropLuckyCoins} Thẻ Bài Bạc.`);
  }

  if (tpl.guaranteedDropItem) {
    player.inventory[tpl.guaranteedDropItem] = (player.inventory[tpl.guaranteedDropItem] || 0) + 1;
    const itemDef = CONFIG.ITEMS[tpl.guaranteedDropItem];
    if (itemDef) {
      logs.push(`Nhặt được vật phẩm: [${itemDef.name}]!`);
    }
  }

  if (tpl.guaranteedWeaponDrop) {
    if (!player.unlockedWeapons.includes(tpl.guaranteedWeaponDrop)) {
      player.unlockedWeapons.push(tpl.guaranteedWeaponDrop);
    }
    const wpnDef = CONFIG.WEAPONS[tpl.guaranteedWeaponDrop];
    if (wpnDef) {
      logs.push(`CHIẾN LỢI PHẨM BẬC CAO: Mở khóa vũ khí [${wpnDef.name}]!`);
    }
  }

  if (tpl.id === 'demon_lord_vaelis') {
    player.questFlags = player.questFlags || {
      vaelisTalked: false,
      vaelisDefeated: false,
      curedPetrification: false,
      child13Rescued: false,
      child12Resolved: false,
      brokenKnightResolved: false,
      glassLadyResolved: false,
      smithUsed: false,
      physicianTalked: false,
      chroniclerTalked: false,
    };
    player.questFlags.vaelisDefeated = true;
    if (tpl.guaranteedDropItem !== 'void_core') {
      player.inventory.void_core = (player.inventory.void_core || 0) + 1;
    }
    if (!player.unlockedWeapons.includes('vaelis_torment_blade')) {
      player.unlockedWeapons.push('vaelis_torment_blade');
    }
    logs.push('Thu hồi [Lõi Khóa Hư Vô] từ lồng ngực Hiệp Sĩ Trưởng Vaelis & mở khóa [Trường Kiếm Thống Khổ Của Vaelis]!');
  }

  if (player.equippedHead === 'black_wax_crown') {
    player.corruption = Math.min(100, (player.corruption || 0) + 1);
    syncCorruptionHolyBan(player);
    checkCorruptionDiegeticWarning(player, logs);
  }

  if ((player.skillLevels?.necromancy || 0) >= 3) {
    for (const ally of player.party) {
      if (ally.isUndeadSummon && ally.hp > 0) {
        ally.mind = Math.min(ally.maxMind, ally.mind + 8);
      }
    }
  }

  return {
    logs,
    enemyDefeated: true,
    playerDefeated: false,
    severedAnyLimb,
    wasCrit,
  };
}

/**
 * Devour Corpse (`Nuốt Chửng`) to restore Hunger & HP at the cost of +20 Corruption and locking Holy Mother magic
 */
export function devourEnemyCorpse(player: PlayerState, enemy: MapEnemyInstance): { success: boolean; message: string } {
  if (!enemy.defeated || enemy.corpseDevoured) {
    return { success: false, message: 'Không có xác quái vật nào có thể Nuốt Chửng!' };
  }
  enemy.corpseDevoured = true;
  player.hunger = Math.max(0, player.hunger - 45);
  player.hp = Math.min(player.maxHp, player.hp + 20);
  player.corruption = Math.min(100, player.corruption + 20);
  banHolyMother(player);
  grantAffinityOnce(player, 'milestone_cannibalism', 'demonicPact', 1);
  return {
    success: true,
    message:
      'Máu đen đặc quánh ngấm vào huyết quản, cơn đói dịu xuống nhưng tiếng thì thầm của Thánh Mẫu bỗng im bặt.',
  };
}

/**
 * Clean Field Dissection (`Cuộn Giải Phẫu Thực Địa`) — +0 Tha Hóa, KHÔNG khóa Thánh Mẫu
 */
export function dissectEnemyCorpseCleanly(
  player: PlayerState,
  enemy: MapEnemyInstance,
  rng: SeededRNG
): { success: boolean; message: string } {
  if (!enemy.defeated || enemy.corpseDevoured) {
    return { success: false, message: 'Không có xác quái vật nào để giải phẫu!' };
  }
  if ((player.inventory.scroll_field_dissection || 0) <= 0) {
    return { success: false, message: 'Cần [Cuộn Giải Phẫu Thực Địa] trong hành trang!' };
  }
  player.inventory.scroll_field_dissection = Math.max(0, (player.inventory.scroll_field_dissection || 0) - 1);
  enemy.corpseDevoured = true;
  player.inventory.dried_meat = (player.inventory.dried_meat || 0) + 1;
  const herbId = rng.chance(0.55) ? 'red_herb' : 'green_herb';
  player.inventory[herbId] = (player.inventory[herbId] || 0) + 1;
  player.inventory.blood_vial = (player.inventory.blood_vial || 0) + 1;
  const herbName = CONFIG.ITEMS[herbId]?.name || herbId;
  return {
    success: true,
    message: `Lưỡi dao giải phẫu tách lọc gọn ghẽ trong im lặng, thu về Thịt Khô, [${herbName}] và Lọ Máu Tinh Lọc.`,
  };
}

/**
 * Emergency Amputation Scroll (`Cuộn Cưa Xương Khẩn Cấp`) outside combat without needing Bone Saw
 */
export function useEmergencyAmputationScroll(
  player: PlayerState,
  limbKey: 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'
): { success: boolean; message: string } {
  if ((player.inventory.scroll_emergency_amputation || 0) <= 0) {
    return { success: false, message: 'Bạn không có [Cuộn Cưa Xương Khẩn Cấp]!' };
  }
  if (!player.limbs[limbKey]) {
    return { success: false, message: 'Bộ phận này đã mất rồi!' };
  }
  player.inventory.scroll_emergency_amputation = Math.max(0, (player.inventory.scroll_emergency_amputation || 0) - 1);
  const prevSaw = player.inventory.bone_saw || 0;
  player.inventory.bone_saw = prevSaw + 1;
  const res = amputateInfectedLimbWithBoneSaw(player, limbKey);
  player.inventory.bone_saw = prevSaw;
  if (!res.success) {
    player.inventory.scroll_emergency_amputation = (player.inventory.scroll_emergency_amputation || 0) + 1;
    return res;
  }
  return {
    success: true,
    message: res.message.replace('dùng Cưa Xương', 'kích hoạt [Cuộn Cưa Xương Khẩn Cấp]'),
  };
}

/**
 * Bone Saw Amputation outside combat (in Inventory)
 */
export function amputateInfectedLimbWithBoneSaw(
  player: PlayerState,
  limbKey: 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'
): { success: boolean; message: string } {
  if ((player.inventory.bone_saw || 0) <= 0) {
    return { success: false, message: 'Bạn cần có Cưa Xương Rỉ Máu trong kho đồ!' };
  }
  if (!player.limbs[limbKey]) {
    return { success: false, message: 'Bộ phận này đã mất rồi!' };
  }
  const labels: Record<'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg', string> = {
    leftArm: 'Tay Trái',
    rightArm: 'Tay Phải',
    leftLeg: 'Chân Trái',
    rightLeg: 'Chân Phải',
  };
  player.limbs[limbKey] = false;
  player.limbs.infected[limbKey] = false;
  player.hp = Math.max(5, player.hp - 12);
  player.statuses.bleeding = true;
  let cursedFreedMsg = '';
  if (player.cursedLockedWeapon && (limbKey === 'rightArm' || limbKey === 'leftArm')) {
    const unlockedName = CONFIG.WEAPONS[player.cursedLockedWeapon]?.name || player.cursedLockedWeapon;
    player.cursedLockedWeapon = null;
    if (player.equippedWeapon && CONFIG.WEAPONS[player.equippedWeapon]?.isCursed) {
      player.equippedWeapon = 'bite_headbutt';
    }
    cursedFreedMsg = ` Bạn cũng đã cắt rời cánh tay mang lời nguyền [${unlockedName}]!`;
  }
  const autoMsgs: string[] = [];
  if (limbKey === 'leftArm' || limbKey === 'rightArm') {
    handlePlayerArmLoss(player, limbKey, autoMsgs);
  }
  return {
    success: true,
    message: `Bạn nghiến răng dùng Cưa Xương cắt bỏ [${labels[limbKey]}], ngăn chặn độc nhiễm trùng lan vào tim!${cursedFreedMsg}${autoMsgs.length? `${autoMsgs.join('')}`: ''} Máu tươi tuôn ra không ngừng từ miệng vết cắt.`,
  };
}

import { CONFIG, LimbConfig } from './config';
import { SeededRNG } from './prng';

export enum TILE {
  VOID = 'VOID',
  FLOOR = 'FLOOR',
  WALL = 'WALL',
  CRACKED_WALL = 'CRACKED_WALL',
  CHASM = 'CHASM',
  BRIDGE = 'BRIDGE',
  BARS = 'BARS',
  SHORTCUT_GATE = 'SHORTCUT_GATE',
  PORTAL_NEXT = 'PORTAL_NEXT',
  PORTAL_PREV = 'PORTAL_PREV',
  STAIRS_UP = 'STAIRS_UP',
  STAIRS_DOWN = 'STAIRS_DOWN',
  CHEST = 'CHEST',
  CRATE = 'CRATE',
  BOOKSHELF = 'BOOKSHELF',
  HEXEN_ALTAR = 'HEXEN_ALTAR',
  HERB = 'HERB',
  BED_SAVE = 'BED_SAVE',
  VOID_RIFT = 'VOID_RIFT',
  NPC_PRIEST = 'NPC_PRIEST',
  NPC_SMUGGLER = 'NPC_SMUGGLER',
  NPC_PRISONER = 'NPC_PRISONER',
  NPC_CHILD_12 = 'NPC_CHILD_12',
  NPC_BROKEN_KNIGHT = 'NPC_BROKEN_KNIGHT',
  NPC_SMITH = 'NPC_SMITH',
  NPC_GLASS_LADY = 'NPC_GLASS_LADY',
  NPC_PHYSICIAN = 'NPC_PHYSICIAN',
  NPC_CHRONICLER = 'NPC_CHRONICLER',
  NPC_RECRUIT_KNIGHT = 'NPC_RECRUIT_KNIGHT',
  NPC_RECRUIT_NUN = 'NPC_RECRUIT_NUN',
  NPC_RECRUIT_HUNTER = 'NPC_RECRUIT_HUNTER',
  FLOOR_TRAP = 'FLOOR_TRAP',
  MIASMA_VENT = 'MIASMA_VENT',
  RITUAL_CIRCLE = 'RITUAL_CIRCLE',
  CORPSE_LOOT = 'CORPSE_LOOT',
  BLOOD_THRONE = 'BLOOD_THRONE',
}

export type RoomTemplateType =
  | 'BRIDGE_CHASM'
  | 'JAGGED_RUIN'
  | 'DONUT_PIT'
  | 'ZIGZAG_HALL'
  | 'CRYPT_ALCOVES'
  | 'SPLIT_SHORTCUT';

export interface MapEnemyInstance {
  uid: string;
  templateId: string;
  customName?: string;
  x: number;
  y: number;
  defeated: boolean;
  corpseDevoured?: boolean;
  corpseLooted?: boolean;
  corpseRaised?: boolean;
  isTutorialGatekeeper?: boolean;
  isFloorBoss?: boolean;
  facing?: 'up' | 'down' | 'left' | 'right';
  aiState?: 'patrol' | 'alert' | 'chase' | 'deagro';
  alertTimerMs?: number;
  loseSightTimerMs?: number;
  questionTimerMs?: number;
  eatTicksRemaining?: number;
  patrolTicks?: number;
  moveCooldownMs?: number;
  lastSeenX?: number;
  lastSeenY?: number;
  limbs: LimbConfig[];
  severedLimbs: string[];
  lockedLimbIds?: Record<string, number>;
  bleedPerTurn: number;
  burnPerTurn: number;
  burnTurns?: number;
  poisonPerTurn?: number;
  poisonTurns?: number;
  oilCovered: boolean;
  oilTurns?: number;
  acidTurns?: number;
  blindTurns: number;
  stunTurns: number;
  telegraphing: boolean;
  telegraphCoinFlip?: boolean;
  turnCount: number;
  talked: boolean;
}

export interface MapDecoy {
  x: number;
  y: number;
  turnsLeft: number;
}

export type HerbType = 'green_herb' | 'red_herb' | 'white_herb' | 'calm_flower';

export const HERB_POOL: HerbType[] = ['green_herb', 'red_herb', 'white_herb', 'calm_flower'];

export function herbTypeToVariant(herbType: HerbType): number {
  if (herbType === 'green_herb') return 0;
  if (herbType === 'red_herb') return 1;
  if (herbType === 'white_herb') return 2;
  return 3;
}

export type RitualDeityType = 'uninscribed' | 'holy_mother' | 'demon_lord' | 'void_god';

export interface RoomData {
  id: string;
  floor: 1 | 2 | 3;
  roomIndex: number;
  name: string;
  sensoryLine: string;
  template: RoomTemplateType;
  width: number;
  height: number;
  isExterior?: boolean;
  grid: TILE[][];
  spawnX: number;
  spawnY: number;
  secretX: number;
  secretY: number;
  secretChamberCoords: string[];
  enemies: MapEnemyInstance[];
  corpses?: MapEnemyInstance[];
  decoys?: MapDecoy[];
  herbTypes?: Record<string, HerbType>;
  ritualCircles?: Record<string, { deityType: RitualDeityType; used?: boolean }>;
  guaranteedRecipeBooks?: Record<string, string>;
  lootedCoords: string[];
  shortcutOpened: boolean;
  secretWallBlown: boolean;
}

export function getHerbTypeAtCoord(
  room: RoomData,
  x: number,
  y: number,
  seed?: string
): HerbType {
  const key = `${x},${y}`;
  const stored = room.herbTypes?.[key];
  if (stored) return stored;
  return new SeededRNG(`${seed || 'goethe'}_herb_${room.id}_${key}`).pick(HERB_POOL);
}

export interface WorldMapState {
  seed: string;
  rooms: Record<string, RoomData>;
  currentRoomId: string;
  visitedRoomIds: string[];
}

export function isWalkableTile(tile: TILE, shortcutOpened = false): boolean {
  if (tile === TILE.SHORTCUT_GATE) return shortcutOpened;
  return (
    tile === TILE.FLOOR ||
    tile === TILE.BRIDGE ||
    tile === TILE.PORTAL_NEXT ||
    tile === TILE.PORTAL_PREV ||
    tile === TILE.STAIRS_UP ||
    tile === TILE.STAIRS_DOWN ||
    tile === TILE.CHEST ||
    tile === TILE.CRATE ||
    tile === TILE.BOOKSHELF ||
    tile === TILE.HEXEN_ALTAR ||
    tile === TILE.HERB ||
    tile === TILE.BED_SAVE ||
    tile === TILE.VOID_RIFT ||
    tile === TILE.FLOOR_TRAP ||
    tile === TILE.MIASMA_VENT ||
    tile === TILE.RITUAL_CIRCLE ||
    tile === TILE.CORPSE_LOOT
  );
}

export function createMapEnemyInstance(
  uid: string,
  templateId: string,
  x: number,
  y: number,
  opts?: {
    customName?: string;
    isTutorialGatekeeper?: boolean;
    isFloorBoss?: boolean;
    facing?: 'up' | 'down' | 'left' | 'right';
  }
): MapEnemyInstance {
  const tpl = CONFIG.ENEMIES[templateId] || CONFIG.ENEMIES.fanatic_zealot;
  const limbs: LimbConfig[] = tpl.limbs.map((l) => ({ ...l }));
  return {
    uid,
    templateId: tpl.id,
    customName: opts?.customName,
    x,
    y,
    defeated: false,
    corpseDevoured: false,
    corpseLooted: false,
    corpseRaised: false,
    isTutorialGatekeeper: opts?.isTutorialGatekeeper,
    isFloorBoss: opts?.isFloorBoss || Boolean(tpl.isFloorBoss),
    facing: opts?.facing || 'left',
    aiState: 'patrol',
    alertTimerMs: 0,
    loseSightTimerMs: 0,
    questionTimerMs: 0,
    moveCooldownMs: 0,
    limbs,
    severedLimbs: [],
    lockedLimbIds: {},
    bleedPerTurn: 0,
    burnPerTurn: 0,
    burnTurns: 0,
    oilCovered: false,
    oilTurns: 0,
    acidTurns: 0,
    blindTurns: 0,
    stunTurns: 0,
    telegraphing: false,
    turnCount: 0,
    talked: false,
  };
}

export function buildRoomLayout(
  template: RoomTemplateType,
  rng: SeededRNG,
  width: number = CONFIG.GRID_W,
  height: number = CONFIG.GRID_H,
  opts?: { allowSecretChamber?: boolean; forceSecretChamber?: boolean }
): {
  grid: TILE[][];
  spawnX: number;
  spawnY: number;
  exitX: number;
  exitY: number;
  secretX: number;
  secretY: number;
  secretChamberCoords: string[];
  secretHerbTypes: Record<string, HerbType>;
} {
  const w = width;
  const h = height;
  const grid: TILE[][] = Array.from({ length: h }, () => Array(w).fill(TILE.VOID));

  // Inner stone wall shell inside outer VOID border
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      grid[y][x] = TILE.WALL;
    }
  }

  // Carve main floor interior
  for (let y = 3; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      grid[y][x] = TILE.FLOOR;
    }
  }

  const midX = Math.floor(w / 2);
  const midY = Math.floor(h / 2) + 1;
  const spawnX = 3;
  const spawnY = midY;
  const exitX = w - 3;
  const exitY = midY;

  if (template === 'BRIDGE_CHASM') {
    for (let y = 3; y < h - 2; y++) {
      grid[y][midX - 1] = TILE.CHASM;
      grid[y][midX] = TILE.CHASM;
    }
    grid[midY - 1][midX - 1] = TILE.BRIDGE;
    grid[midY - 1][midX] = TILE.BRIDGE;
    grid[midY][midX - 1] = TILE.BRIDGE;
    grid[midY][midX] = TILE.BRIDGE;
  } else if (template === 'JAGGED_RUIN') {
    for (let x = 6; x < w - 6; x += 5) {
      grid[4][x] = TILE.WALL;
      grid[h - 4][x] = TILE.WALL;
    }
  } else if (template === 'DONUT_PIT') {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        grid[midY + dy][midX + dx] = TILE.CHASM;
      }
    }
  } else if (template === 'ZIGZAG_HALL') {
    for (let y = 3; y < midY - 2; y++) {
      grid[y][midX - 3] = TILE.WALL;
    }
    for (let y = midY + 2; y < h - 2; y++) {
      grid[y][midX + 3] = TILE.WALL;
    }
  } else if (template === 'CRYPT_ALCOVES') {
    for (let x = 6; x < w - 6; x += 5) {
      grid[3][x] = TILE.WALL;
      grid[h - 3][x] = TILE.WALL;
    }
  } else if (template === 'SPLIT_SHORTCUT') {
    for (let x = 4; x < w - 4; x++) {
      if (x !== midX) {
        grid[midY - 2][x] = TILE.BARS;
      }
    }
    grid[midY - 2][midX] = TILE.SHORTCUT_GATE;
  }

  // Ensure spawn and exit portals first so secret chamber placement strictly avoids them
  grid[spawnY][spawnX - 1] = TILE.PORTAL_PREV;
  grid[spawnY][spawnX] = TILE.FLOOR;
  grid[spawnY][spawnX + 1] = TILE.FLOOR;
  grid[exitY][exitX] = TILE.PORTAL_NEXT;
  grid[exitY][exitX - 1] = TILE.FLOOR;

  // Rare (~38% seeded) Secret Chamber behind TILE.CRACKED_WALL on varied wall sides (top/bottom/left/right)
  let secretX = -1;
  let secretY = -1;
  const secretChamberCoords: string[] = [];
  const secretHerbTypes: Record<string, HerbType> = {};
  const allowSecret = opts?.allowSecretChamber !== false;
  const shouldSpawnSecret = Boolean(opts?.forceSecretChamber) || (allowSecret && rng.chance(0.38));

  if (shouldSpawnSecret) {
    type SecretCandidate = {
      side: 'top' | 'bottom' | 'left' | 'right';
      crackX: number;
      crackY: number;
      frontX: number;
      frontY: number;
      entryX: number;
      entryY: number;
      lootX: number;
      lootY: number;
      sealWalls: Array<[number, number]>;
    };

    const candidates: SecretCandidate[] = [];
    const nearPortal = (x: number, y: number) =>
      Math.abs(x - spawnX) + Math.abs(y - spawnY) <= 2 ||
      Math.abs(x - (spawnX - 1)) + Math.abs(y - spawnY) <= 2 ||
      Math.abs(x - exitX) + Math.abs(y - exitY) <= 2;

    // Top wall candidates (chamber at y = 1, crack at y = 2, interior floor at y = 3)
    for (let x = 5; x <= w - 7; x++) {
      if (
        grid[3][x] === TILE.FLOOR &&
        grid[3][x + 1] === TILE.FLOOR &&
        !nearPortal(x, 3)
      ) {
        candidates.push({
          side: 'top',
          crackX: x,
          crackY: 2,
          frontX: x,
          frontY: 3,
          entryX: x,
          entryY: 1,
          lootX: x + 1,
          lootY: 1,
          sealWalls: [
            [x - 1, 1],
            [x + 2, 1],
            [x + 1, 2],
          ],
        });
      }
    }

    // Bottom wall candidates (chamber at y = h - 2, crack at y = h - 3, interior floor at y = h - 4)
    if (h >= 13) {
      for (let x = 5; x <= w - 7; x++) {
        if (
          grid[h - 4][x] === TILE.FLOOR &&
          grid[h - 4][x + 1] === TILE.FLOOR &&
          grid[h - 3][x] === TILE.FLOOR &&
          grid[h - 3][x + 1] === TILE.FLOOR &&
          !nearPortal(x, h - 3) &&
          !nearPortal(x, h - 4)
        ) {
          candidates.push({
            side: 'bottom',
            crackX: x,
            crackY: h - 3,
            frontX: x,
            frontY: h - 4,
            entryX: x,
            entryY: h - 2,
            lootX: x + 1,
            lootY: h - 2,
            sealWalls: [
              [x - 1, h - 2],
              [x + 2, h - 2],
              [x + 1, h - 3],
            ],
          });
        }
      }
    }

    // Left wall candidates (chamber at x = 1, crack at x = 2, interior floor at x = 3)
    for (let y = 4; y <= h - 5; y++) {
      if (
        grid[y][3] === TILE.FLOOR &&
        grid[y][2] === TILE.FLOOR &&
        grid[y + 1][2] === TILE.FLOOR &&
        !nearPortal(2, y) &&
        !nearPortal(2, y + 1)
      ) {
        candidates.push({
          side: 'left',
          crackX: 2,
          crackY: y,
          frontX: 3,
          frontY: y,
          entryX: 1,
          entryY: y,
          lootX: 1,
          lootY: y + 1,
          sealWalls: [
            [1, y - 1],
            [1, y + 2],
            [2, y + 1],
          ],
        });
      }
    }

    // Right wall candidates (chamber at x = w - 2, crack at x = w - 3, interior floor at x = w - 4)
    for (let y = 4; y <= h - 5; y++) {
      if (
        grid[y][w - 4] === TILE.FLOOR &&
        grid[y][w - 3] === TILE.FLOOR &&
        grid[y + 1][w - 3] === TILE.FLOOR &&
        !nearPortal(w - 3, y) &&
        !nearPortal(w - 3, y + 1)
      ) {
        candidates.push({
          side: 'right',
          crackX: w - 3,
          crackY: y,
          frontX: w - 4,
          frontY: y,
          entryX: w - 2,
          entryY: y,
          lootX: w - 2,
          lootY: y + 1,
          sealWalls: [
            [w - 2, y - 1],
            [w - 2, y + 2],
            [w - 3, y + 1],
          ],
        });
      }
    }

    if (candidates.length > 0) {
      // Pick side fairly first so top/bottom/left/right are all represented
      const availableSides = Array.from(new Set(candidates.map((c) => c.side)));
      const chosenSide = rng.pick(availableSides);
      const sideCandidates = candidates.filter((c) => c.side === chosenSide);
      const picked = rng.pick(sideCandidates);

      secretX = picked.crackX;
      secretY = picked.crackY;
      for (const [wx, wy] of picked.sealWalls) {
        if (wy >= 1 && wy < h - 1 && wx >= 1 && wx < w - 1) {
          grid[wy][wx] = TILE.WALL;
        }
      }
      grid[picked.crackY][picked.crackX] = TILE.CRACKED_WALL;
      grid[picked.frontY][picked.frontX] = TILE.FLOOR;

      // Vary secret chamber contents (~35% Chest, ~35% Crate+Corpse, ~30% Trap guarding Herb/Crate)
      const contentRoll = rng.next();
      if (contentRoll < 0.35) {
        grid[picked.entryY][picked.entryX] = TILE.FLOOR;
        grid[picked.lootY][picked.lootX] = TILE.CHEST;
      } else if (contentRoll < 0.70) {
        grid[picked.entryY][picked.entryX] = TILE.CRATE;
        grid[picked.lootY][picked.lootX] = TILE.CORPSE_LOOT;
      } else {
        grid[picked.entryY][picked.entryX] = TILE.FLOOR_TRAP;
        if (rng.chance(0.55)) {
          grid[picked.lootY][picked.lootX] = TILE.HERB;
          secretHerbTypes[`${picked.lootX},${picked.lootY}`] = rng.pick(HERB_POOL);
        } else {
          grid[picked.lootY][picked.lootX] = TILE.CRATE;
        }
      }

      secretChamberCoords.push(
        `${picked.entryX},${picked.entryY}`,
        `${picked.lootX},${picked.lootY}`
      );
    }
  }

  return {
    grid,
    spawnX,
    spawnY,
    exitX,
    exitY,
    secretX,
    secretY,
    secretChamberCoords,
    secretHerbTypes,
  };
}

function buildExteriorCourtyardRoom(seed: string): RoomData {
  const w = 22;
  const h = 16;
  const grid: TILE[][] = Array.from({ length: h }, () => Array(w).fill(TILE.VOID));

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      grid[y][x] = TILE.WALL;
    }
  }
  for (let y = 3; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      grid[y][x] = TILE.FLOOR;
    }
  }

  // No secret chamber in F2_EXTERIOR (outer wall stays solid)
  const secretX = -1;
  const secretY = -1;
  const secretChamberCoords: string[] = [];

  const gateY = Math.floor(h / 2) + 1;
  grid[gateY - 1][w - 3] = TILE.BARS;
  grid[gateY][w - 3] = TILE.PORTAL_NEXT;
  grid[gateY + 1][w - 3] = TILE.BARS;

  grid[5][4] = TILE.CRATE;
  grid[h - 4][6] = TILE.CRATE;
  grid[3][18] = TILE.CRATE;
  grid[3][12] = TILE.BOOKSHELF;
  grid[3][15] = TILE.BOOKSHELF;
  grid[h - 3][3] = TILE.BED_SAVE;
  grid[6][8] = TILE.HERB;
  grid[h - 4][11] = TILE.HERB;
  grid[5][17] = TILE.CORPSE_LOOT;
  grid[h - 3][16] = TILE.CORPSE_LOOT;

  const herbRng = new SeededRNG(`${seed}_exterior_herbs`);
  const herbTypes: Record<string, HerbType> = {
    [`8,6`]: herbRng.pick(HERB_POOL),
    [`11,${h - 4}`]: herbRng.pick(HERB_POOL),
  };

  const enemies: MapEnemyInstance[] = [
    createMapEnemyInstance('F2_EXT_TUTORIAL', 'fanatic_zealot', 12, gateY, {
      customName: 'Giáo Dân Cuồng Tín',
      isTutorialGatekeeper: true,
      facing: 'left',
    }),
  ];

  return {
    id: 'F2_EXTERIOR',
    floor: 2,
    roomIndex: -1,
    name: 'Ngoại Vi Đại Giáo Đường Goethe',
    sensoryLine:
      'Gió lạnh thổi qua những rặng thông khô và thảm cỏ úa vàng. Phía sau Cổng Sắt Răng Cưa là nơi Đại Giáo Đường từng đứng vững — trước khi Lâu Đài Hắc Ám giáng xuống đè nát mái vòm.',
    template: 'JAGGED_RUIN',
    width: w,
    height: h,
    isExterior: true,
    grid,
    spawnX: 3,
    spawnY: gateY,
    secretX,
    secretY,
    secretChamberCoords,
    enemies,
    herbTypes,
    lootedCoords: [],
    shortcutOpened: true,
    secretWallBlown: false,
  };
}

export function generateWorld(seed: string): WorldMapState {
  const rng = new SeededRNG(seed);
  const rooms: Record<string, RoomData> = {};

  const floorConfigs: {
    floor: 1 | 2 | 3;
    count: number;
    titlePrefix: string;
    sensory: string;
    normalPool: string[];
    bossId: string;
  }[] = [
    {
      floor: 2,
      count: 5,
      titlePrefix: 'Tầng 2: Đại Giáo Đường Goethe Sụp Đổ',
      sensory:
        'Những bức tượng Thánh Mẫu trắng bị cột đá đen của Lâu Đài Ma Vương đâm xuyên qua, rỉ máu đen xuống nền gạch nứt.',
      normalPool: [
        'fanatic_zealot',
        'rotting_priest',
        'weeping_inquisitor',
        'flagellant_monk',
        'crypt_keybearer',
      ],
      bossId: 'executioner_paladin',
    },
    {
      floor: 3,
      count: 4,
      titlePrefix: 'Tầng 3: Vực Sao Dị Giới & Hầm Mộ Cổ',
      sensory:
        'Không gian bị bẻ cong dưới nền móng giáo đường. Ánh sáng sao tím lạnh lẽo rỉ ra từ những vết nứt không-thời-gian.',
      normalPool: [
        'void_tentacle_cluster',
        'void_panther',
        'void_leech_beast',
        'hollowed_void_walker',
        'dimensional_viper',
      ],
      bossId: 'void_chimera',
    },
    {
      floor: 1,
      count: 4,
      titlePrefix: 'Tầng 1: Lâu Đài Hắc Ám',
      sensory:
        'Kiến trúc đá đen dị giới đè nặng lên đỉnh Giáo Đường. Mùi máu sắt và khói búa rèn nồng nặc quanh Ngai Vàng Xương Sắt.',
      normalPool: [
        'dire_hellwolf',
        'forge_goblin',
        'orc_berserker',
        'black_bone_skeleton',
        'armored_ghoul',
      ],
      bossId: 'demon_lord_vaelis',
    },
  ];

  const templates: RoomTemplateType[] = [
    'JAGGED_RUIN',
    'CRYPT_ALCOVES',
    'ZIGZAG_HALL',
    'BRIDGE_CHASM',
    'DONUT_PIT',
    'SPLIT_SHORTCUT',
  ];

  for (const fc of floorConfigs) {
    for (let idx = 0; idx < fc.count; idx++) {
      const roomId = `F${fc.floor}_R${idx}`;
      const isBossRoom = idx === fc.count - 1;
      const isThroneRoom = fc.floor === 1 && isBossRoom;
      const tpl: RoomTemplateType = isBossRoom
        ? 'JAGGED_RUIN'
        : templates[(idx + fc.floor) % templates.length];

      const roomW = isBossRoom ? 26 : idx % 2 === 0 ? 24 : 22;
      const roomH = isBossRoom ? 18 : idx % 2 === 0 ? 18 : 16;

      const {
        grid,
        spawnX,
        spawnY,
        exitX,
        exitY,
        secretX,
        secretY,
        secretChamberCoords,
        secretHerbTypes,
      } = buildRoomLayout(tpl, rng, roomW, roomH, { allowSecretChamber: !isBossRoom });

      // If Floor 1 Final Boss Throne Room (F1_R3), clear interior for Grand Royal Carpet & 3-Step Dais
      if (isThroneRoom) {
        for (let y = 3; y < roomH - 2; y++) {
          for (let x = 2; x < roomW - 2; x++) {
            if (grid[y][x] !== TILE.PORTAL_PREV && grid[y][x] !== TILE.PORTAL_NEXT) {
              grid[y][x] = TILE.FLOOR;
            }
          }
        }
      }

      // Boss rooms are terminal rooms for their floors; F1_R0 and F3_R0 enter via floor stairs instead of PORTAL_PREV
      if (isBossRoom) {
        grid[exitY][exitX] = TILE.FLOOR;
      }
      if ((fc.floor === 1 || fc.floor === 3) && idx === 0) {
        grid[spawnY][spawnX - 1] = TILE.WALL;
      }

      // 1. Build occupiedTiles & reservedMask to prevent ANY overlapping stairs, altars, NPCs, props, or chasms
      const reservedMask = new Set<string>();
      const occupiedTiles = new Set<string>();
      const reserveArea = (cx: number, cy: number, radius: number) => {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const key = `${cx + dx},${cy + dy}`;
            reservedMask.add(key);
            occupiedTiles.add(key);
          }
        }
      };

      // Reserve all non-floor structural tiles and 1-tile buffer around gates/portals/bars/cracked walls/bridges
      for (let y = 0; y < roomH; y++) {
        for (let x = 0; x < roomW; x++) {
          const t = grid[y][x];
          if (t !== TILE.FLOOR) {
            reservedMask.add(`${x},${y}`);
            occupiedTiles.add(`${x},${y}`);
          }
          if (
            t === TILE.SHORTCUT_GATE ||
            t === TILE.BARS ||
            t === TILE.PORTAL_PREV ||
            t === TILE.PORTAL_NEXT ||
            t === TILE.CRACKED_WALL ||
            t === TILE.BRIDGE
          ) {
            reserveArea(x, y, 1);
          }
        }
      }
      // Reserve secret chamber and entrance tile (when present)
      for (const coord of secretChamberCoords) {
        reservedMask.add(coord);
        occupiedTiles.add(coord);
      }
      if (secretX >= 0 && secretY >= 0) {
        reserveArea(secretX, secretY, 1);
      }
      // Reserve 5x5 spawn & exit safety zones
      reserveArea(spawnX, spawnY, 2);
      reserveArea(exitX, exitY, 2);

      // If Throne Room (F1_R3), reserve the 3-tile-wide Royal Red Carpet & Gothic Pillar aisles + Boss zone
      if (isThroneRoom) {
        for (let x = 2; x < roomW - 2; x++) {
          for (let y = spawnY - 3; y <= spawnY + 3; y++) {
            reservedMask.add(`${x},${y}`);
            occupiedTiles.add(`${x},${y}`);
          }
        }
      }

      const isAreaFreeInOccupied = (cx: number, cy: number, checkRadius = 1): boolean => {
        if (cx < 3 || cx > roomW - 4 || cy < 4 || cy > roomH - 3) return false;
        for (let dy = -checkRadius; dy <= checkRadius; dy++) {
          for (let dx = -checkRadius; dx <= checkRadius; dx++) {
            const key = `${cx + dx},${cy + dy}`;
            if (occupiedTiles.has(key) || reservedMask.has(key)) return false;
            const t = grid[cy + dy]?.[cx + dx];
            if (
              t === TILE.PORTAL_PREV ||
              t === TILE.PORTAL_NEXT ||
              t === TILE.STAIRS_UP ||
              t === TILE.STAIRS_DOWN ||
              t === TILE.CRACKED_WALL ||
              t === TILE.SHORTCUT_GATE ||
              t === TILE.BARS ||
              t === TILE.BRIDGE ||
              t === TILE.CHASM ||
              t === TILE.VOID
            ) {
              return false;
            }
          }
        }
        return true;
      };

      const findUnoccupiedSpot = (prefX: number, prefY: number, checkRadius = 1): [number, number] | null => {
        const startX = Math.max(3, Math.min(roomW - 4, prefX));
        const startY = Math.max(4, Math.min(roomH - 3, prefY));
        if (isAreaFreeInOccupied(startX, startY, checkRadius)) {
          return [startX, startY];
        }
        const maxDist = roomW + roomH;
        for (let dist = 1; dist <= maxDist; dist++) {
          for (let dy = -dist; dy <= dist; dy++) {
            const rem = dist - Math.abs(dy);
            const dxList = rem === 0 ? [0] : [-rem, rem];
            for (const dx of dxList) {
              const nx = startX + dx;
              const ny = startY + dy;
              if (isAreaFreeInOccupied(nx, ny, checkRadius)) {
                return [nx, ny];
              }
            }
          }
        }
        if (checkRadius > 0) {
          return findUnoccupiedSpot(startX, startY, 0);
        }
        return null;
      };

      // Helper to place landmarks, stairs & NPCs checking occupiedTiles first + guaranteed walkable clearance
      const placeLandmark = (
        cx: number,
        cy: number,
        tileType: TILE,
        clearRadius = 1,
        reserveRadius = 2
      ): [number, number] | null => {
        const spot = findUnoccupiedSpot(cx, cy, Math.min(1, clearRadius));
        if (!spot) return null;
        const [sx, sy] = spot;
        for (let dy = -clearRadius; dy <= clearRadius; dy++) {
          for (let dx = -clearRadius; dx <= clearRadius; dx++) {
            const ny = sy + dy;
            const nx = sx + dx;
            if (ny >= 3 && ny < roomH - 2 && nx >= 2 && nx < roomW - 2) {
              const cur = grid[ny][nx];
              if (cur === TILE.WALL) {
                grid[ny][nx] = TILE.FLOOR;
              }
            }
          }
        }
        grid[sy][sx] = tileType;
        reserveArea(sx, sy, reserveRadius);
        return [sx, sy];
      };

      // Inter-floor stairs (checked against occupiedTiles before placement)
      if (fc.floor === 2 && idx === 1) {
        placeLandmark(Math.floor(roomW / 2) - 3, 4, TILE.STAIRS_UP, 1, 2);
      }
      if (fc.floor === 2 && idx === 3) {
        placeLandmark(Math.floor(roomW / 2), roomH - 4, TILE.STAIRS_DOWN, 1, 2);
      }
      if (fc.floor === 1 && idx === 0) {
        placeLandmark(4, roomH - 4, TILE.STAIRS_DOWN, 1, 2);
      }
      if (fc.floor === 3 && idx === 0) {
        placeLandmark(4, 4, TILE.STAIRS_UP, 1, 2);
      }

      // Guarantee Đài Cộng Hưởng (HEXEN_ALTAR) in Room 0 and Room 2 of each floor (checks occupiedTiles)
      if (!isThroneRoom && (idx === 0 || idx === 2)) {
        const hx = Math.floor(roomW / 2);
        const hy = tpl === 'SPLIT_SHORTCUT' ? spawnY + 2 : spawnY;
        placeLandmark(hx, hy, TILE.HEXEN_ALTAR, 1, 2);
      }

      // Place Canon Story & Survival NPCs across Floors 1, 2, 3 (each checks occupiedTiles first)
      // FLOOR 1: Lâu Đài Hắc Ám
      if (fc.floor === 1 && idx === 1) {
        placeLandmark(Math.floor(roomW / 2) + 2, 5, TILE.NPC_SMITH, 1, 2);
      }
      if (fc.floor === 1 && idx === 2) {
        placeLandmark(Math.floor(roomW / 2) + 4, 5, TILE.NPC_GLASS_LADY, 1, 2);
      }

      // FLOOR 2: Đại Giáo Đường Goethe Đổ Nát
      if (fc.floor === 2 && idx === 0) {
        placeLandmark(6, roomH - 4, TILE.NPC_SMUGGLER, 1, 2);
        // Recruitable Kẻ Gác Mộ (if player is not fallen_knight)
        placeLandmark(roomW - 7, 5, TILE.NPC_RECRUIT_KNIGHT, 1, 2);
      }
      if (fc.floor === 2 && idx === 1) {
        placeLandmark(Math.floor(roomW / 2) - 4, roomH - 4, TILE.NPC_PRISONER, 1, 2);
      }
      if (fc.floor === 2 && idx === 2) {
        placeLandmark(6, 5, TILE.NPC_PRIEST, 1, 2);
        // Recruitable Kẻ Dị Giáo (if player is not forsaken_nun)
        placeLandmark(roomW - 7, roomH - 4, TILE.NPC_RECRUIT_NUN, 1, 2);
      }
      if (fc.floor === 2 && idx === 3) {
        placeLandmark(6, roomH - 4, TILE.NPC_BROKEN_KNIGHT, 1, 2);
        placeLandmark(roomW - 6, 5, TILE.NPC_CHILD_12, 1, 2);
      }

      // FLOOR 3: Vực Sao Dị Giới
      if (fc.floor === 3 && idx === 0) {
        // Recruitable Gã Săn Di Vật (if player is not night_hunter)
        placeLandmark(roomW - 7, roomH - 4, TILE.NPC_RECRUIT_HUNTER, 1, 2);
      }
      if (fc.floor === 3 && idx === 1) {
        placeLandmark(Math.floor(roomW / 2), 5, TILE.NPC_CHRONICLER, 1, 2);
      }
      if (fc.floor === 3 && idx === 2) {
        placeLandmark(Math.floor(roomW / 2) + 3, roomH - 4, TILE.NPC_PHYSICIAN, 1, 2);
      }
      if (fc.floor === 3 && idx === 3) {
        placeLandmark(Math.floor(roomW / 2) - 3, spawnY, TILE.VOID_RIFT, 1, 2);
      }

      // Boss / Mini-Boss / Normal Enemy Placement
      const enemies: MapEnemyInstance[] = [];
      const facings: ('up' | 'down' | 'left' | 'right')[] = ['left', 'right', 'down', 'up'];

      let roomMiniBossId: string | null = null;
      let extraRoomMiniBossId: string | null = null;
      if (!isBossRoom) {
        if (fc.floor === 2 && idx === 1) roomMiniBossId = 'penitent_knight';
        else if (fc.floor === 2 && idx === 2) roomMiniBossId = 'grand_abbess';
        else if (fc.floor === 3 && idx === 0) roomMiniBossId = 'ouroboros_serpent';
        else if (fc.floor === 3 && idx === 1) roomMiniBossId = 'astral_kraken';
        else if (fc.floor === 1 && idx === 0) roomMiniBossId = 'butcher_kaelgor';
        else if (fc.floor === 1 && idx === 1) roomMiniBossId = 'dullahan_knight';
        else if (fc.floor === 1 && idx === 2) {
          roomMiniBossId = 'countess_carmilla';
          extraRoomMiniBossId = 'fenrir_kin';
        }
      }

      if (isBossRoom) {
        const bossX = isThroneRoom ? roomW - 6 : Math.max(12, Math.floor((roomW * 2) / 3) + 2);
        const bossY = spawnY;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const cy = bossY + dy;
            const cx = bossX + dx;
            if (cy >= 3 && cy < roomH - 2 && cx >= 3 && cx < roomW - 3) {
              if (grid[cy][cx] === TILE.WALL || grid[cy][cx] === TILE.CHASM) {
                grid[cy][cx] = TILE.FLOOR;
              }
            }
          }
        }
        reserveArea(bossX, bossY, 2);
        enemies.push(
          createMapEnemyInstance(`${roomId}_BOSS`, fc.bossId, bossX, bossY, {
            isFloorBoss: true,
            facing: 'left',
          })
        );
      }

      // Collect unreserved open floor tiles for enemies & props
      const openTiles: [number, number][] = [];
      for (let y = 4; y < roomH - 3; y++) {
        for (let x = 5; x < roomW - 4; x++) {
          if (grid[y][x] !== TILE.FLOOR) continue;
          if (reservedMask.has(`${x},${y}`)) continue;
          openTiles.push([x, y]);
        }
      }

      const popTileWithBuffer = (rngSource: SeededRNG, bufferRadius = 1): [number, number] | null => {
        const candidates = openTiles.filter(([tx, ty]) => !reservedMask.has(`${tx},${ty}`));
        if (candidates.length === 0) return null;
        const pick = candidates[rngSource.int(0, candidates.length - 1)];
        const [tx, ty] = pick;
        const origIdx = openTiles.findIndex(([ox, oy]) => ox === tx && oy === ty);
        if (origIdx >= 0) openTiles.splice(origIdx, 1);
        reserveArea(tx, ty, bufferRadius);
        return [tx, ty];
      };

      const extraRng = new SeededRNG(`${seed}_${roomId}_extra_props`);
      const ritualCircles: Record<string, { deityType: RitualDeityType; used?: boolean }> = {};

      // Place Ritual Circle (3x3 footprint) in odd non-boss rooms BEFORE enemies so landmarks never get crowded out
      if (!isBossRoom && idx % 2 === 1) {
        const fixedDeityByRoom: Record<string, RitualDeityType> = {
          F2_R1: 'uninscribed',
          F2_R3: 'holy_mother',
          F3_R1: 'void_god',
          F1_R1: 'demon_lord',
        };
        const fallbackDeities: RitualDeityType[] = ['uninscribed', 'holy_mother', 'demon_lord', 'void_god'];
        const assignedDeity: RitualDeityType =
          fixedDeityByRoom[roomId] || fallbackDeities[(fc.floor + idx) % fallbackDeities.length];
        for (let i = 0; i < openTiles.length; i++) {
          const [rx, ry] = openTiles[i];
          let clear3x3 = true;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (
                grid[ry + dy]?.[rx + dx] !== TILE.FLOOR ||
                reservedMask.has(`${rx + dx},${ry + dy}`)
              ) {
                clear3x3 = false;
              }
            }
          }
          if (clear3x3) {
            const placed = placeLandmark(rx, ry, TILE.RITUAL_CIRCLE, 1, 2);
            if (placed) {
              ritualCircles[`${placed[0]},${placed[1]}`] = { deityType: assignedDeity, used: false };
            }
            break;
          }
        }
      }

      if (!isBossRoom && roomMiniBossId) {
        const normalId1 = fc.normalPool[idx % fc.normalPool.length];
        const normalId2 = fc.normalPool[(idx + 2) % fc.normalPool.length];
        const eSpot1 = popTileWithBuffer(rng, 1);
        if (eSpot1) {
          enemies.push(
            createMapEnemyInstance(`${roomId}_E1`, normalId1, eSpot1[0], eSpot1[1], {
              facing: facings[rng.int(0, facings.length - 1)],
            })
          );
        }
        const eSpot2 = popTileWithBuffer(rng, 1);
        if (eSpot2) {
          enemies.push(
            createMapEnemyInstance(`${roomId}_E2`, normalId2, eSpot2[0], eSpot2[1], {
              facing: facings[rng.int(0, facings.length - 1)],
            })
          );
        }
        const mbSpot = popTileWithBuffer(rng, 1);
        if (mbSpot) {
          enemies.push(
            createMapEnemyInstance(`${roomId}_MB`, roomMiniBossId, mbSpot[0], mbSpot[1], {
              facing: 'left',
            })
          );
        }
        if (extraRoomMiniBossId) {
          const mbSpot2 = popTileWithBuffer(rng, 2) || popTileWithBuffer(rng, 1);
          if (mbSpot2) {
            enemies.push(
              createMapEnemyInstance(`${roomId}_MB2`, extraRoomMiniBossId, mbSpot2[0], mbSpot2[1], {
                facing: 'left',
              })
            );
          }
        }
      } else if (!isBossRoom) {
        const smallCount = fc.floor === 3 ? 3 : rng.int(1, 3);
        for (let sIdx = 0; sIdx < smallCount; sIdx++) {
          const normalId = fc.normalPool[(idx + sIdx) % fc.normalPool.length];
          const eSpot = popTileWithBuffer(rng, 1);
          if (eSpot) {
            enemies.push(
              createMapEnemyInstance(`${roomId}_E${sIdx + 1}`, normalId, eSpot[0], eSpot[1], {
                facing: facings[rng.int(0, facings.length - 1)],
              })
            );
          }
        }
      }

      // Contextual Placement for BOOKSHELF: strictly along top stone walls with walkable floor in front
      const wallShelfCandidates: [number, number][] = [];
      for (let x = 4; x < roomW - 4; x++) {
        const y = 3;
        if (
          grid[y][x] === TILE.FLOOR &&
          grid[y - 1][x] === TILE.WALL &&
          grid[y + 1][x] === TILE.FLOOR &&
          !reservedMask.has(`${x},${y}`)
        ) {
          wallShelfCandidates.push([x, y]);
        }
      }
      const shelfTargetCount = isThroneRoom ? 2 : 3;
      let shelvesPlaced = 0;
      while (shelvesPlaced < shelfTargetCount && wallShelfCandidates.length > 0) {
        const pickIdx = extraRng.int(0, wallShelfCandidates.length - 1);
        const [sx, sy] = wallShelfCandidates[pickIdx];
        wallShelfCandidates.splice(pickIdx, 1);
        if (reservedMask.has(`${sx},${sy}`)) continue;
        grid[sy][sx] = TILE.BOOKSHELF;
        reserveArea(sx, sy, 1);
        shelvesPlaced++;
      }

      // Contextual Placement for BED_SAVE: quiet room corners adjacent to walls
      if (!isThroneRoom && (idx === 1 || idx === 3 || (fc.floor !== 2 && idx === 0))) {
        const cornerCandidates: [number, number][] = [
          [3, 3],
          [roomW - 4, 3],
          [3, roomH - 3],
          [roomW - 4, roomH - 3],
        ];
        for (const [bx, by] of cornerCandidates) {
          if (grid[by]?.[bx] === TILE.FLOOR && !reservedMask.has(`${bx},${by}`)) {
            grid[by][bx] = TILE.BED_SAVE;
            reserveArea(bx, by, 1);
            break;
          }
        }
      }

      // Place Crates, Chest, Herbs, and Survival Props with strict >= 2 Manhattan distance (bufferRadius = 1)
      const herbTypes: Record<string, HerbType> = { ...secretHerbTypes };
      if (!isThroneRoom) {
        const chestSpot = popTileWithBuffer(extraRng, 1);
        if (chestSpot) grid[chestSpot[1]][chestSpot[0]] = TILE.CHEST;

        const crateCount = isBossRoom ? 2 : 3;
        for (let cIdx = 0; cIdx < crateCount; cIdx++) {
          const crateSpot = popTileWithBuffer(extraRng, 1);
          if (crateSpot) grid[crateSpot[1]][crateSpot[0]] = TILE.CRATE;
        }

        const herbCount = isBossRoom ? 2 : extraRng.chance(0.55) ? 3 : 2;
        for (let hIdx = 0; hIdx < herbCount; hIdx++) {
          const herbSpot = popTileWithBuffer(extraRng, 1);
          if (herbSpot) {
            grid[herbSpot[1]][herbSpot[0]] = TILE.HERB;
            herbTypes[`${herbSpot[0]},${herbSpot[1]}`] = extraRng.pick(HERB_POOL);
          }
        }
      }

      if (!isBossRoom) {
        const isFairTrapTile = (tx: number, ty: number): boolean => {
          if (Math.abs(tx - spawnX) + Math.abs(ty - spawnY) <= 1) return false;
          if (Math.abs(tx - exitX) + Math.abs(ty - exitY) <= 1) return false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (Math.abs(dx) + Math.abs(dy) > 1) continue;
              const nt = grid[ty + dy]?.[tx + dx];
              if (
                nt === TILE.PORTAL_PREV ||
                nt === TILE.PORTAL_NEXT ||
                nt === TILE.STAIRS_UP ||
                nt === TILE.STAIRS_DOWN ||
                nt === TILE.HEXEN_ALTAR ||
                nt === TILE.RITUAL_CIRCLE ||
                nt === TILE.FLOOR_TRAP
              ) {
                return false;
              }
            }
          }
          return true;
        };

        for (let tIdx = 0; tIdx < 2; tIdx++) {
          let trapSpot = popTileWithBuffer(extraRng, 1) || popTileWithBuffer(extraRng, 0);
          if (trapSpot && !isFairTrapTile(trapSpot[0], trapSpot[1])) {
            trapSpot = null;
          }
          if (!trapSpot) {
            // Scan entire room floor for any unoccupied tile, strongly preferring fair tiles not adjacent to spawn/exit/stairs/altars/traps
            const fairFallbackFloors: [number, number][] = [];
            const anyFallbackFloors: [number, number][] = [];
            for (let y = 3; y < roomH - 2; y++) {
              for (let x = 3; x < roomW - 3; x++) {
                if (grid[y][x] === TILE.FLOOR && !reservedMask.has(`${x},${y}`)) {
                  if (isFairTrapTile(x, y)) {
                    fairFallbackFloors.push([x, y]);
                  } else {
                    anyFallbackFloors.push([x, y]);
                  }
                }
              }
            }
            const pool = fairFallbackFloors.length > 0 ? fairFallbackFloors : anyFallbackFloors;
            if (pool.length > 0) {
              trapSpot = pool[extraRng.int(0, pool.length - 1)];
              reserveArea(trapSpot[0], trapSpot[1], 1);
            }
          }
          if (trapSpot) grid[trapSpot[1]][trapSpot[0]] = TILE.FLOOR_TRAP;
        }
        const miasmaSpot = popTileWithBuffer(extraRng, 1);
        if (miasmaSpot) grid[miasmaSpot[1]][miasmaSpot[0]] = TILE.MIASMA_VENT;
        const corpseCount = extraRng.chance(0.55) ? 2 : 1;
        for (let cpIdx = 0; cpIdx < corpseCount; cpIdx++) {
          const corpseSpot = popTileWithBuffer(extraRng, 1);
          if (corpseSpot) grid[corpseSpot[1]][corpseSpot[0]] = TILE.CORPSE_LOOT;
        }
      }

      const canonRoomMeta: Record<string, { name: string; sensory: string }> = {
        F2_R0: {
          name: 'Tầng 2 – Khu 1: Tiền Sảnh Đổ Nát & Chợ Đen',
          sensory:
            'Bức tường phía nam sụp đổ che khuất ánh mắt đám giáo dân. Kẻ Buôn Lậu Đeo Mặt Nạ trải tấm bạt vải dầu bên ngọn đèn bão leo lét.',
        },
        F2_R1: {
          name: 'Tầng 2 – Khu 2: Hầm Ngục Tối & Cũi Sắt Kỵ Đoàn',
          sensory:
            'Mùi máu sắt nồng nặc bốc lên từ những song sắt gỉ sét. Cựu chiến binh Kael đang bị xiềng trong ngục tối gần lối cầu thang dẫn lên Lâu Đài Tầng 1.',
        },
        F2_R2: {
          name: 'Tầng 2 – Khu 3: Sảnh Chính Giáo Đường & Tượng Thánh Mẫu',
          sensory:
            'Những hàng cột đá trắng nứt toác thấm đẫm máu đen rỉ ra từ tượng Thánh Mẫu. Giáo Sĩ Mù đang quỳ rạp dưới chân bệ tượng đổ nát.',
        },
        F2_R3: {
          name: 'Tầng 2 – Khu 4: Hầm Rượu Đổ Nát & Hậu Cung Tế Đàn 12',
          sensory:
            'Giữa những thùng rượu vỡ nát, Kỵ Sĩ Gãy Chân nắm chặt chiếc nhẫn của Vaelis. Phía hậu cung dẫn xuống Vực Sao là cỗ máy sáp trắng đang rút máu Thánh Tử Thứ 12.',
        },
        F2_R4: {
          name: 'Tầng 2 – Khu 5: Sảnh Tế Đàn Hồng Y Sáp Trắng',
          sensory:
            'Khói hương gây mê đặc quánh tỏa ra từ chiếc lư hương khổng lồ. Hồng Y Sáp Trắng — Kẻ Chăn Dắt Đàn Chiên Mù — một mình trấn giữ đại sảnh.',
        },
        F1_R0: {
          name: 'Tầng 1 – Khu 1: Tiền Đồn Máu Lâu Đài Hắc Ám',
          sensory:
            'Kiến trúc đá đen nặng nề của Lâu Đài Ma Vương đè trĩu lên trần Giáo Đường. Mạch dung nham máu rực đỏ dưới khe đá báo hiệu Giao Kèo Máu.',
        },
        F1_R1: {
          name: 'Tầng 1 – Khu 2: Lò Rèn Quỷ',
          sensory:
            'Tiếng búa tạ nện vang vọng rợn người trong ánh lửa lò rèn đỏ rực.',
        },
        F1_R2: {
          name: 'Tầng 1 – Khu 3: Tiền Sảnh Bàn Tiệc',
          sensory:
            'Ngay trước cửa phòng Ngai Vàng Xương Sắt, Quý Cô Trong Lồng Kính bị giam giữ.',
        },
        F1_R3: {
          name: 'Tầng 1 – Khu 4: Đại Điện Ngai Máu Vaelis',
          sensory:
            'Thảm Đỏ Hoàng Gia viền vàng trải dài giữa hai hàng cột đá Gothic và lư hương lửa đỏ dẫn tới Bệ Đá Tam Cấp. Trên Ngai Vàng Xương Sắt khổng lồ, Hiệp Sĩ Trưởng Vaelis ngồi uy nghi bất động.',
        },
        F3_R0: {
          name: 'Tầng 3 – Khu 1: Vực Sao Cổ Ngữ',
          sensory:
            'Không gian và thời gian uốn cong bên dưới nền móng Goethe.',
        },
        F3_R1: {
          name: 'Tầng 3 – Khu 2: Sảnh Bia Đá Cổ Ngữ',
          sensory:
            'Giữa những bia đá khắc cổ ngữ phát sáng và chồng sách da dê hóa thạch, Kẻ Chép Sử Hóa Thạch vẫn lẩm bẩm về 3 Mảnh Thần Chú Tái Thiết.',
        },
        F3_R2: {
          name: 'Tầng 3 – Khu 3: Phòng Thí Nghiệm Vực Sao',
          sensory:
            'Bên bàn mổ đá và tủ kính đựng ống nghiệm xanh-tím, Lão Thần Y Điên ngồi trên chiếc xe lăn gỗ đã dính liền vào nửa thân dưới hóa đá.',
        },
        F3_R3: {
          name: 'Tầng 3 – Khu 4: Tâm Điểm Vết Rách & Thánh Tử Thứ 13',
          sensory:
            'Khe nứt không gian tím thẫm gầm rú dữ dội giữa khoảng không tĩnh mịch.',
        },
      };
      const meta = canonRoomMeta[roomId];

      rooms[roomId] = {
        id: roomId,
        floor: fc.floor,
        roomIndex: idx,
        name: meta ? meta.name : `${fc.titlePrefix} – Khu ${idx + 1}`,
        sensoryLine: meta ? meta.sensory : fc.sensory,
        template: tpl,
        width: roomW,
        height: roomH,
        grid,
        spawnX,
        spawnY,
        secretX,
        secretY,
        secretChamberCoords,
        enemies,
        herbTypes,
        ritualCircles,
        lootedCoords: [],
        shortcutOpened: false,
        secretWallBlown: false,
      };
    }
  }

  rooms.F2_EXTERIOR = buildExteriorCourtyardRoom(seed);

  // Deterministically place the 3 Alchemy Books (Pha Chế Thuốc 1, 2, 3) into bookshelves/chests
  const bookRng = new SeededRNG(`${seed}_alchemy_books_placement`);
  const alchemyPlacements: Array<{ bookItemId: string; preferredRooms: string[] }> = [
    { bookItemId: 'recipe_book_expedition', preferredRooms: ['F2_R0', 'F2_R1', 'F2_R2'] },
    { bookItemId: 'recipe_book_cathedral', preferredRooms: ['F2_R2', 'F2_R3', 'F1_R0', 'F2_R1'] },
    { bookItemId: 'recipe_book_forbidden', preferredRooms: ['F1_R1', 'F1_R2', 'F3_R0', 'F3_R1', 'F2_R3'] },
  ];
  for (const { bookItemId, preferredRooms } of alchemyPlacements) {
    let placed = false;
    for (const rId of preferredRooms) {
      const targetRoom = rooms[rId];
      if (!targetRoom) continue;
      targetRoom.guaranteedRecipeBooks = targetRoom.guaranteedRecipeBooks || {};
      const shelfSpots: string[] = [];
      const chestSpots: string[] = [];
      for (let y = 0; y < targetRoom.grid.length; y++) {
        for (let x = 0; x < (targetRoom.grid[y]?.length || 0); x++) {
          const k = `${x},${y}`;
          if (targetRoom.guaranteedRecipeBooks[k]) continue;
          const tile = targetRoom.grid[y][x];
          if (tile === TILE.BOOKSHELF) shelfSpots.push(k);
          else if (tile === TILE.CHEST) chestSpots.push(k);
        }
      }
      const candidates = shelfSpots.length > 0 ? shelfSpots : chestSpots;
      if (candidates.length > 0) {
        const chosenKey = candidates[bookRng.int(0, candidates.length - 1)];
        targetRoom.guaranteedRecipeBooks[chosenKey] = bookItemId;
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Fallback: scan all dungeon rooms for any bookshelf or chest
      for (const targetRoom of Object.values(rooms)) {
        targetRoom.guaranteedRecipeBooks = targetRoom.guaranteedRecipeBooks || {};
        let foundKey: string | null = null;
        for (let y = 0; y < targetRoom.grid.length && !foundKey; y++) {
          for (let x = 0; x < (targetRoom.grid[y]?.length || 0); x++) {
            const k = `${x},${y}`;
            if (targetRoom.guaranteedRecipeBooks[k]) continue;
            const tile = targetRoom.grid[y][x];
            if (tile === TILE.BOOKSHELF || tile === TILE.CHEST) {
              foundKey = k;
              break;
            }
          }
        }
        if (foundKey) {
          targetRoom.guaranteedRecipeBooks[foundKey] = bookItemId;
          break;
        }
      }
    }
  }

  return {
    seed,
    rooms,
    currentRoomId: 'F2_EXTERIOR',
    visitedRoomIds: ['F2_EXTERIOR'],
  };
}

export const NPC_TILE_SET = new Set<TILE>([
  TILE.NPC_PRIEST,
  TILE.NPC_SMUGGLER,
  TILE.NPC_PRISONER,
  TILE.NPC_CHILD_12,
  TILE.NPC_BROKEN_KNIGHT,
  TILE.NPC_SMITH,
  TILE.NPC_GLASS_LADY,
  TILE.NPC_PHYSICIAN,
  TILE.NPC_CHRONICLER,
  TILE.NPC_RECRUIT_KNIGHT,
  TILE.NPC_RECRUIT_NUN,
  TILE.NPC_RECRUIT_HUNTER,
]);

function isSightBlockerTile(t: TILE | undefined): boolean {
  return (
    t === TILE.WALL ||
    t === TILE.CRACKED_WALL ||
    t === TILE.VOID ||
    t === TILE.CRATE ||
    t === TILE.BOOKSHELF ||
    t === TILE.CHEST
  );
}

/**
 * Pure Bresenham Line-of-Sight check between two grid coordinates.
 * Walls, Cracked Walls, Voids, and tall obstacles (Crates, Bookshelves, Chests) block sight beyond them.
 */
export function hasLineOfSight(
  grid: TILE[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number
): boolean {
  let cx = x0;
  let cy = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (cx !== x1 || cy !== y1) {
    if (cx !== x0 || cy !== y0) {
      const t = grid[cy]?.[cx];
      if (isSightBlockerTile(t)) {
        return false;
      }
    }
    const e2 = err * 2;
    const stepX = e2 > -dy;
    const stepY = e2 < dx;
    if (stepX && stepY) {
      const tx = grid[cy]?.[cx + sx];
      const ty = grid[cy + sy]?.[cx];
      if (isSightBlockerTile(tx) && isSightBlockerTile(ty)) {
        return false;
      }
    }
    if (stepX) {
      err -= dy;
      cx += sx;
    }
    if (stepY) {
      err += dx;
      cy += sy;
    }
  }
  return true;
}

/**
 * Checks whether target (tx, ty) falls inside:
 * 1) The enemy's narrow directional vision cone in front (`coneRange <= 3` tiles)
 * 2) Or the surrounding sound/hearing radius (`1` tile normal/disguised, `2` with heavy armor)
 */
export function isDetectedByEnemy(
  ex: number,
  ey: number,
  facing: 'up' | 'down' | 'left' | 'right',
  tx: number,
  ty: number,
  coneRange: number,
  hearingRadius: number
): boolean {
  const dx = tx - ex;
  const dy = ty - ey;
  const manhattan = Math.abs(dx) + Math.abs(dy);
  if (manhattan === 0) return true;

  if (manhattan <= hearingRadius) return true;

  if (manhattan > coneRange) return false;
  if (facing === 'left') return dx < 0 && Math.abs(dy) <= Math.abs(dx);
  if (facing === 'right') return dx > 0 && Math.abs(dy) <= Math.abs(dx);
  if (facing === 'up') return dy < 0 && Math.abs(dx) <= Math.abs(dy);
  return dy > 0 && Math.abs(dx) <= Math.abs(dy);
}

/**
 * Shortest-path BFS on walkable grid tiles from (sx, sy) to (tx, ty).
 * Returns the first step (dx, dy) along the shortest path, or null if unreachable.
 */
function findNextChaseStepBFS(
  grid: TILE[][],
  roomW: number,
  roomH: number,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  shortcutOpened: boolean,
  blockedSecretSet: Set<string>,
  occupiedByOtherEnemy: Set<string>
): { dx: number; dy: number } | null {
  if (sx === tx && sy === ty) return null;
  const startKey = `${sx},${sy}`;
  const targetKey = `${tx},${ty}`;
  const queue: Array<{ x: number; y: number; firstDx: number; firstDy: number }> = [];
  const visited = new Set<string>([startKey]);
  const dirs: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (const [dx, dy] of dirs) {
    const nx = sx + dx;
    const ny = sy + dy;
    if (nx < 1 || nx >= roomW - 1 || ny < 1 || ny >= roomH - 1) continue;
    const key = `${nx},${ny}`;
    if (blockedSecretSet.has(key)) continue;
    if (!isWalkableTile(grid[ny][nx], shortcutOpened)) continue;
    if (key !== targetKey && occupiedByOtherEnemy.has(key)) continue;
    if (key === targetKey) return { dx, dy };
    visited.add(key);
    queue.push({ x: nx, y: ny, firstDx: dx, firstDy: dy });
  }

  let head = 0;
  let bestFallback: { dx: number; dy: number; dist: number } | null = null;
  while (head < queue.length && visited.size < 450) {
    const cur = queue[head++];
    const curDist = Math.abs(cur.x - tx) + Math.abs(cur.y - ty);
    if (!bestFallback || curDist < bestFallback.dist) {
      bestFallback = { dx: cur.firstDx, dy: cur.firstDy, dist: curDist };
    }
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 1 || nx >= roomW - 1 || ny < 1 || ny >= roomH - 1) continue;
      const key = `${nx},${ny}`;
      if (visited.has(key) || blockedSecretSet.has(key)) continue;
      if (!isWalkableTile(grid[ny][nx], shortcutOpened)) continue;
      if (key !== targetKey && occupiedByOtherEnemy.has(key)) continue;
      if (key === targetKey) return { dx: cur.firstDx, dy: cur.firstDy };
      visited.add(key);
      queue.push({ x: nx, y: ny, firstDx: cur.firstDx, firstDy: cur.firstDy });
    }
  }
  return bestFallback ? { dx: bestFallback.dx, dy: bestFallback.dy } : null;
}

function getFacingToward(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  fallback: 'up' | 'down' | 'left' | 'right'
): 'up' | 'down' | 'left' | 'right' {
  const dx = tx - sx;
  const dy = ty - sy;
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
    return dx > 0 ? 'right' : 'left';
  }
  if (dy !== 0) {
    return dy > 0 ? 'down' : 'up';
  }
  return fallback;
}

export interface AdvanceEnemiesResult {
  enemies: MapEnemyInstance[];
  collidedEnemy: MapEnemyInstance | null;
  decoys: MapDecoy[];
}

/**
 * Autonomous AI Game Loop tick (called every ~400ms from App.tsx and in deterministic tests):
 * advances each active enemy at most 1 grid step using narrow sightRange <= 3, solid obstacle LOS,
 * <= 4 tile decoy luring with N-tick eating lock, patrol fallback, and instant <= 1 combat trigger.
 */
export function advanceRoomEnemiesOneTurn(
  room: RoomData,
  playerPos: { x: number; y: number },
  equippedBody: string | null,
  stealthActive = false
): AdvanceEnemiesResult {
  const roomW = room.width || room.grid[0]?.length || CONFIG.GRID_W;
  const roomH = room.height || room.grid.length || CONFIG.GRID_H;

  const npcCenters: Array<[number, number]> = [];
  for (let y = 0; y < roomH; y++) {
    for (let x = 0; x < roomW; x++) {
      if (NPC_TILE_SET.has(room.grid[y][x])) {
        npcCenters.push([x, y]);
      }
    }
  }
  const isInsideNpcZone = (tx: number, ty: number) =>
    npcCenters.some(([nx, ny]) => Math.abs(tx - nx) <= 1 && Math.abs(ty - ny) <= 1);

  const isHeavyArmor =
    equippedBody === 'legion_brigandine' ||
    equippedBody === 'vanguard_hauberk' ||
    equippedBody === 'cathedral_chainmail' ||
    equippedBody === 'platinum_cuirass';
  const isFlayedDisguise = equippedBody === 'flayed_disguise';
  // Narrow tactical sight range (<= 3 tiles) & tight hearing radius
  const sightRange = isFlayedDisguise ? 2 : 3;
  const hearingRadius = isFlayedDisguise ? 1 : isHeavyArmor ? 2 : 1;

  const activeDecoys: MapDecoy[] = (room.decoys || []).filter((d) => d.turnsLeft > 0);

  const blockedSecretSet = new Set<string>(
    !room.secretWallBlown ? room.secretChamberCoords || [] : []
  );

  const occupiedAll = new Set<string>(
    room.enemies.filter((e) => !e.defeated).map((e) => `${e.x},${e.y}`)
  );

  const reverseMap: Record<'up' | 'down' | 'left' | 'right', 'up' | 'down' | 'left' | 'right'> = {
    left: 'right',
    right: 'left',
    up: 'down',
    down: 'up',
  };

  let collidedEnemy: MapEnemyInstance | null = null;
  const nextEnemies: MapEnemyInstance[] = [];

  for (const enemy of room.enemies) {
    // Immediately stop enemy movement loop once combat has been triggered
    if (collidedEnemy) {
      nextEnemies.push(enemy);
      continue;
    }

    if (enemy.defeated || enemy.isTutorialGatekeeper) {
      nextEnemies.push(enemy);
      continue;
    }

    if (enemy.isFloorBoss) {
      if ((enemy.questionTimerMs || 0) > 0) {
        nextEnemies.push({
          ...enemy,
          questionTimerMs: Math.max(0, (enemy.questionTimerMs || 0) - 1000),
        });
      } else {
        nextEnemies.push(enemy);
      }
      continue;
    }

    // Locked eating decoy at current tile for N ticks while ignoring player
    if ((enemy.eatTicksRemaining || 0) > 0) {
      const nextEatTicks = Math.max(0, (enemy.eatTicksRemaining || 0) - 1);
      nextEnemies.push({
        ...enemy,
        aiState: nextEatTicks > 0 ? ('deagro' as const) : ('patrol' as const),
        eatTicksRemaining: nextEatTicks,
        questionTimerMs: nextEatTicks > 0 ? 1000 : 0,
        alertTimerMs: 0,
        loseSightTimerMs: 0,
        moveCooldownMs: 0,
      });
      continue;
    }

    const facing = enemy.facing || 'left';
    const manhattanToPlayer =
      Math.abs(playerPos.x - enemy.x) + Math.abs(playerPos.y - enemy.y);
    const hasLOS = hasLineOfSight(room.grid, enemy.x, enemy.y, playerPos.x, playerPos.y);
    const detected =
      !stealthActive &&
      manhattanToPlayer <= sightRange &&
      hasLOS &&
      isDetectedByEnemy(
        enemy.x,
        enemy.y,
        facing,
        playerPos.x,
        playerPos.y,
        sightRange,
        hearingRadius
      );

    let aiState: 'patrol' | 'alert' | 'chase' | 'deagro' = enemy.aiState || 'patrol';
    let questionTimerMs = enemy.questionTimerMs || 0;
    let loseSightTimerMs = enemy.loseSightTimerMs ?? 0;
    let lastSeenX = enemy.lastSeenX ?? playerPos.x;
    let lastSeenY = enemy.lastSeenY ?? playerPos.y;

    const postFleeGraceActive = aiState === 'deagro' && questionTimerMs > 1000;

    // Decoy / Bait (Mồi Nhử) priority luring within <= 4 Manhattan tiles
    let nearestDecoy: MapDecoy | null = null;
    let nearestDecoyDist = Infinity;
    for (const decoy of activeDecoys) {
      const dist = Math.abs(decoy.x - enemy.x) + Math.abs(decoy.y - enemy.y);
      if (dist <= 4 && dist < nearestDecoyDist) {
        nearestDecoy = decoy;
        nearestDecoyDist = dist;
      }
    }

    if (
      nearestDecoy &&
      !postFleeGraceActive &&
      !(aiState === 'chase' && manhattanToPlayer <= 1 && nearestDecoyDist > 0)
    ) {
      if (enemy.x === nearestDecoy.x && enemy.y === nearestDecoy.y) {
        nextEnemies.push({
          ...enemy,
          aiState: 'deagro' as const,
          eatTicksRemaining: 6,
          questionTimerMs: 1000,
          alertTimerMs: 0,
          loseSightTimerMs: 0,
          moveCooldownMs: 0,
        });
        continue;
      }
      const decoyStep = findNextChaseStepBFS(
        room.grid,
        roomW,
        roomH,
        enemy.x,
        enemy.y,
        nearestDecoy.x,
        nearestDecoy.y,
        room.shortcutOpened,
        blockedSecretSet,
        occupiedAll
      );
      if (decoyStep) {
        const nx = enemy.x + decoyStep.dx;
        const ny = enemy.y + decoyStep.dy;
        const nextFacing: 'up' | 'down' | 'left' | 'right' =
          decoyStep.dx !== 0
            ? decoyStep.dx > 0
              ? 'right'
              : 'left'
            : decoyStep.dy > 0
            ? 'down'
            : 'up';
        const nextKey = `${nx},${ny}`;
        if (
          !(nx === playerPos.x && ny === playerPos.y) &&
          nx >= 1 &&
          nx < roomW - 1 &&
          ny >= 1 &&
          ny < roomH - 1 &&
          isWalkableTile(room.grid[ny][nx], room.shortcutOpened) &&
          !blockedSecretSet.has(nextKey) &&
          !occupiedAll.has(nextKey)
        ) {
          occupiedAll.delete(`${enemy.x},${enemy.y}`);
          occupiedAll.add(nextKey);
          const arrivedAtDecoy = nx === nearestDecoy.x && ny === nearestDecoy.y;
          nextEnemies.push({
            ...enemy,
            x: nx,
            y: ny,
            facing: nextFacing,
            aiState: 'deagro' as const,
            eatTicksRemaining: arrivedAtDecoy ? 6 : 0,
            questionTimerMs: 1000,
            alertTimerMs: 0,
            loseSightTimerMs: 0,
            moveCooldownMs: 0,
          });
          continue;
        }
      }
    }

    if (aiState === 'deagro') {
      questionTimerMs = Math.max(0, questionTimerMs - 1000);
      if (detected && !postFleeGraceActive) {
        const lockedFacing = getFacingToward(enemy.x, enemy.y, playerPos.x, playerPos.y, facing);
        nextEnemies.push({
          ...enemy,
          facing: lockedFacing,
          aiState: 'alert' as const,
          alertTimerMs: 1,
          loseSightTimerMs: 1000,
          questionTimerMs: 0,
          moveCooldownMs: 0,
          lastSeenX: playerPos.x,
          lastSeenY: playerPos.y,
        });
        continue;
      }
      if (questionTimerMs <= 0) {
        aiState = 'patrol';
      } else {
        nextEnemies.push({
          ...enemy,
          aiState: 'deagro' as const,
          questionTimerMs,
          loseSightTimerMs: 0,
          moveCooldownMs: 0,
        });
        continue;
      }
    }

    if (aiState === 'patrol' && detected) {
      const lockedFacing = getFacingToward(enemy.x, enemy.y, playerPos.x, playerPos.y, facing);
      nextEnemies.push({
        ...enemy,
        facing: lockedFacing,
        aiState: 'alert' as const,
        alertTimerMs: 1,
        loseSightTimerMs: 1000,
        questionTimerMs: 0,
        moveCooldownMs: 0,
        lastSeenX: playerPos.x,
        lastSeenY: playerPos.y,
      });
      continue;
    }

    if (aiState === 'alert') {
      aiState = 'chase';
      loseSightTimerMs = 1000;
      if (hasLOS && manhattanToPlayer <= sightRange) {
        lastSeenX = playerPos.x;
        lastSeenY = playerPos.y;
      }
    }

    if (aiState === 'chase') {
      // Stealth immediately breaks active chase and forces enemy back to patrol
      if (stealthActive) {
        nextEnemies.push({
          ...enemy,
          aiState: 'patrol' as const,
          alertTimerMs: 0,
          loseSightTimerMs: 0,
          questionTimerMs: 0,
          moveCooldownMs: 0,
        });
        continue;
      }

      // Immediate combat lock if chasing enemy is already adjacent/overlapping (Manhattan <= 1)
      if (manhattanToPlayer <= 1) {
        const lockedFacing = getFacingToward(enemy.x, enemy.y, playerPos.x, playerPos.y, facing);
        const engagedEnemy: MapEnemyInstance = {
          ...enemy,
          facing: lockedFacing,
          aiState: 'chase',
          alertTimerMs: 0,
          loseSightTimerMs: 1000,
          questionTimerMs: 0,
          moveCooldownMs: 0,
          lastSeenX: playerPos.x,
          lastSeenY: playerPos.y,
        };
        collidedEnemy = engagedEnemy;
        nextEnemies.push(engagedEnemy);
        continue;
      }

      // If lost sight or out of range: pursue lastSeenX/lastSeenY while loseSightTimerMs > 0 (-500ms/turn)
      if (manhattanToPlayer > sightRange || !hasLOS) {
        const nextLoseTimer = Math.max(0, loseSightTimerMs - 500);
        const alreadyAtLastSeen = enemy.x === lastSeenX && enemy.y === lastSeenY;
        if (loseSightTimerMs <= 0 || alreadyAtLastSeen) {
          nextEnemies.push({
            ...enemy,
            aiState: 'patrol' as const,
            alertTimerMs: 0,
            loseSightTimerMs: 0,
            questionTimerMs: 0,
            moveCooldownMs: 0,
          });
          continue;
        }

        const pursueStep = findNextChaseStepBFS(
          room.grid,
          roomW,
          roomH,
          enemy.x,
          enemy.y,
          lastSeenX,
          lastSeenY,
          room.shortcutOpened,
          blockedSecretSet,
          occupiedAll
        );
        if (pursueStep) {
          const nx = enemy.x + pursueStep.dx;
          const ny = enemy.y + pursueStep.dy;
          const nextFacing: 'up' | 'down' | 'left' | 'right' =
            pursueStep.dx !== 0
              ? pursueStep.dx > 0
                ? 'right'
                : 'left'
              : pursueStep.dy > 0
              ? 'down'
              : 'up';
          const nextKey = `${nx},${ny}`;
          if (
            !(nx === playerPos.x && ny === playerPos.y) &&
            nx >= 1 &&
            nx < roomW - 1 &&
            ny >= 1 &&
            ny < roomH - 1 &&
            isWalkableTile(room.grid[ny][nx], room.shortcutOpened) &&
            !blockedSecretSet.has(nextKey) &&
            !occupiedAll.has(nextKey)
          ) {
            occupiedAll.delete(`${enemy.x},${enemy.y}`);
            occupiedAll.add(nextKey);
            const arrived = nx === lastSeenX && ny === lastSeenY;
            const nextState: 'patrol' | 'chase' = arrived || nextLoseTimer <= 0 ? 'patrol' : 'chase';
            const movedEnemy: MapEnemyInstance = {
              ...enemy,
              x: nx,
              y: ny,
              facing: nextFacing,
              aiState: nextState,
              alertTimerMs: 0,
              loseSightTimerMs: nextState === 'patrol' ? 0 : nextLoseTimer,
              questionTimerMs: 0,
              moveCooldownMs: 0,
              lastSeenX,
              lastSeenY,
            };
            if (Math.abs(nx - playerPos.x) + Math.abs(ny - playerPos.y) <= 1) {
              collidedEnemy = {
                ...movedEnemy,
                aiState: 'chase',
                facing: getFacingToward(nx, ny, playerPos.x, playerPos.y, nextFacing),
              };
            }
            nextEnemies.push(movedEnemy);
            continue;
          }
        }

        const fallbackState: 'patrol' | 'chase' = nextLoseTimer <= 0 ? 'patrol' : 'chase';
        nextEnemies.push({
          ...enemy,
          aiState: fallbackState,
          alertTimerMs: 0,
          loseSightTimerMs: fallbackState === 'patrol' ? 0 : nextLoseTimer,
          questionTimerMs: 0,
          moveCooldownMs: 0,
          lastSeenX,
          lastSeenY,
        });
        continue;
      }

      loseSightTimerMs = 1000;
      lastSeenX = playerPos.x;
      lastSeenY = playerPos.y;

      const bfsStep = findNextChaseStepBFS(
        room.grid,
        roomW,
        roomH,
        enemy.x,
        enemy.y,
        playerPos.x,
        playerPos.y,
        room.shortcutOpened,
        blockedSecretSet,
        occupiedAll
      );

      if (bfsStep) {
        const nx = enemy.x + bfsStep.dx;
        const ny = enemy.y + bfsStep.dy;
        const nextFacing: 'up' | 'down' | 'left' | 'right' =
          bfsStep.dx !== 0
            ? bfsStep.dx > 0
              ? 'right'
              : 'left'
            : bfsStep.dy > 0
            ? 'down'
            : 'up';

        if (nx === playerPos.x && ny === playerPos.y) {
          const engagedEnemy: MapEnemyInstance = {
            ...enemy,
            facing: nextFacing,
            aiState: 'chase',
            alertTimerMs: 0,
            loseSightTimerMs: 1000,
            questionTimerMs: 0,
            moveCooldownMs: 0,
            lastSeenX: playerPos.x,
            lastSeenY: playerPos.y,
          };
          collidedEnemy = engagedEnemy;
          nextEnemies.push(engagedEnemy);
          continue;
        }

        const nextKey = `${nx},${ny}`;
        if (
          nx >= 1 &&
          nx < roomW - 1 &&
          ny >= 1 &&
          ny < roomH - 1 &&
          isWalkableTile(room.grid[ny][nx], room.shortcutOpened) &&
          !blockedSecretSet.has(nextKey) &&
          !occupiedAll.has(nextKey)
        ) {
          occupiedAll.delete(`${enemy.x},${enemy.y}`);
          occupiedAll.add(nextKey);
          const distAfterStep =
            Math.abs(nx - playerPos.x) + Math.abs(ny - playerPos.y);
          const movedEnemy: MapEnemyInstance = {
            ...enemy,
            x: nx,
            y: ny,
            facing: nextFacing,
            aiState: 'chase' as const,
            alertTimerMs: 0,
            loseSightTimerMs,
            questionTimerMs: 0,
            moveCooldownMs: 0,
            lastSeenX,
            lastSeenY,
          };
          if (distAfterStep <= 1) {
            collidedEnemy = {
              ...movedEnemy,
              facing: getFacingToward(nx, ny, playerPos.x, playerPos.y, nextFacing),
            };
          }
          nextEnemies.push(movedEnemy);
          continue;
        }
      }

      nextEnemies.push({
        ...enemy,
        facing: getFacingToward(enemy.x, enemy.y, playerPos.x, playerPos.y, facing),
        aiState: 'chase' as const,
        alertTimerMs: 0,
        loseSightTimerMs,
        questionTimerMs: 0,
        moveCooldownMs: 0,
        lastSeenX,
        lastSeenY,
      });
      continue;
    }

    // Patrol: roam naturally with occasional left/right turns and perpendicular obstacle avoidance (not just back-and-forth)
    const leftTurnMap: Record<'up' | 'down' | 'left' | 'right', 'up' | 'down' | 'left' | 'right'> = {
      up: 'left',
      left: 'down',
      down: 'right',
      right: 'up',
    };
    const rightTurnMap: Record<'up' | 'down' | 'left' | 'right', 'up' | 'down' | 'left' | 'right'> = {
      up: 'right',
      right: 'down',
      down: 'left',
      left: 'up',
    };
    const dirDelta: Record<'up' | 'down' | 'left' | 'right', [number, number]> = {
      left: [-1, 0],
      right: [1, 0],
      up: [0, -1],
      down: [0, 1],
    };
    const tryPatrolDir = (dir: 'up' | 'down' | 'left' | 'right'): { x: number; y: number; key: string } | null => {
      const [dx, dy] = dirDelta[dir];
      const tx = enemy.x + dx;
      const ty = enemy.y + dy;
      const key = `${tx},${ty}`;
      const withinPatrolBounds = tx >= 2 && tx < roomW - 2 && ty >= 3 && ty < roomH - 2;
      if (
        withinPatrolBounds &&
        !(tx === playerPos.x && ty === playerPos.y) &&
        isWalkableTile(room.grid[ty][tx], room.shortcutOpened) &&
        !blockedSecretSet.has(key) &&
        !isInsideNpcZone(tx, ty) &&
        !occupiedAll.has(key)
      ) {
        return { x: tx, y: ty, key };
      }
      return null;
    };

    const nextPatrolTick = (enemy.patrolTicks || 0) + 1;
    const patrolRng = new SeededRNG(`${room.id}_${enemy.uid}_patrol_${nextPatrolTick}`);
    const patrolRoll = patrolRng.next();
    const preferLeftFirst = patrolRng.next() < 0.5;
    const perpA = preferLeftFirst ? leftTurnMap[facing] : rightTurnMap[facing];
    const perpB = preferLeftFirst ? rightTurnMap[facing] : leftTurnMap[facing];

    // Occasionally pause 1 beat & glance left/right to sweep vision cone naturally
    if (nextPatrolTick > 2 && patrolRoll < 0.14) {
      const lookDir = tryPatrolDir(perpA) ? perpA : tryPatrolDir(perpB) ? perpB : facing;
      nextEnemies.push({
        ...enemy,
        facing: lookDir,
        patrolTicks: nextPatrolTick,
        aiState: 'patrol' as const,
        alertTimerMs: 0,
        loseSightTimerMs: 0,
        questionTimerMs: 0,
        moveCooldownMs: 0,
      });
      continue;
    }

    // Build candidate directions: periodically prefer a left/right turn over straight line after >= 3 ticks
    const candidateDirs: Array<'up' | 'down' | 'left' | 'right'> =
      nextPatrolTick >= 3 && patrolRoll < 0.42
        ? [perpA, perpB, facing, reverseMap[facing]]
        : [facing, perpA, perpB, reverseMap[facing]];

    let movedPatrol = false;
    for (const candidateDir of candidateDirs) {
      const spot = tryPatrolDir(candidateDir);
      if (spot) {
        occupiedAll.delete(`${enemy.x},${enemy.y}`);
        occupiedAll.add(spot.key);
        nextEnemies.push({
          ...enemy,
          x: spot.x,
          y: spot.y,
          facing: candidateDir,
          patrolTicks: nextPatrolTick,
          aiState: 'patrol' as const,
          alertTimerMs: 0,
          loseSightTimerMs: 0,
          questionTimerMs: 0,
          moveCooldownMs: 0,
        });
        movedPatrol = true;
        break;
      }
    }

    if (!movedPatrol) {
      nextEnemies.push({
        ...enemy,
        facing: reverseMap[facing],
        patrolTicks: nextPatrolTick,
        aiState: 'patrol' as const,
        alertTimerMs: 0,
        loseSightTimerMs: 0,
        questionTimerMs: 0,
        moveCooldownMs: 0,
      });
    }
  }

  const nextDecoys = activeDecoys
    .map((d) => ({ ...d, turnsLeft: d.turnsLeft - 1 }))
    .filter((d) => d.turnsLeft > 0);

  return {
    enemies: nextEnemies,
    collidedEnemy,
    decoys: nextDecoys,
  };
}


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
  moveCooldownMs?: number;
  lastSeenX?: number;
  lastSeenY?: number;
  limbs: LimbConfig[];
  severedLimbs: string[];
  lockedLimbIds?: Record<string, number>;
  bleedPerTurn: number;
  burnPerTurn: number;
  burnTurns?: number;
  oilCovered: boolean;
  oilTurns?: number;
  acidTurns?: number;
  blindTurns: number;
  stunTurns: number;
  telegraphing: boolean;
  turnCount: number;
  talked: boolean;
}

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
  lootedCoords: string[];
  shortcutOpened: boolean;
  secretWallBlown: boolean;
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
  height: number = CONFIG.GRID_H
): {
  grid: TILE[][];
  spawnX: number;
  spawnY: number;
  exitX: number;
  exitY: number;
  secretX: number;
  secretY: number;
  secretChamberCoords: string[];
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

  // Carve Secret Chamber behind TILE.CRACKED_WALL in top wall
  const secretX = rng.int(6, Math.max(7, w - 7));
  const secretY = 2;
  const chamberY = 1;
  grid[chamberY][secretX - 1] = TILE.WALL;
  grid[chamberY][secretX] = TILE.FLOOR;
  grid[chamberY][secretX + 1] = TILE.CHEST;
  grid[chamberY][secretX + 2] = TILE.WALL;
  grid[secretY][secretX] = TILE.CRACKED_WALL;
  grid[secretY + 1][secretX] = TILE.FLOOR;
  const secretChamberCoords = [
    `${secretX},${chamberY}`,
    `${secretX + 1},${chamberY}`,
  ];

  // Ensure spawn and exit portals
  grid[spawnY][spawnX - 1] = TILE.PORTAL_PREV;
  grid[spawnY][spawnX] = TILE.FLOOR;
  grid[spawnY][spawnX + 1] = TILE.FLOOR;
  grid[exitY][exitX] = TILE.PORTAL_NEXT;
  grid[exitY][exitX - 1] = TILE.FLOOR;

  return { grid, spawnX, spawnY, exitX, exitY, secretX, secretY, secretChamberCoords };
}

function buildExteriorCourtyardRoom(): RoomData {
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

  // Secret chamber at top-left
  const secretX = 6;
  const secretY = 2;
  grid[1][secretX] = TILE.FLOOR;
  grid[1][secretX + 1] = TILE.CHEST;
  grid[secretY][secretX] = TILE.CRACKED_WALL;
  grid[3][secretX] = TILE.FLOOR;
  const secretChamberCoords = [`${secretX},1`, `${secretX + 1},1`];

  const gateY = Math.floor(h / 2) + 1;
  grid[gateY - 1][w - 3] = TILE.BARS;
  grid[gateY][w - 3] = TILE.PORTAL_NEXT;
  grid[gateY + 1][w - 3] = TILE.BARS;

  grid[5][4] = TILE.CRATE;
  grid[h - 4][6] = TILE.CRATE;
  grid[3][12] = TILE.BOOKSHELF;
  grid[3][15] = TILE.BOOKSHELF;
  grid[h - 3][3] = TILE.BED_SAVE;
  grid[6][8] = TILE.HERB;
  grid[h - 4][11] = TILE.HERB;
  grid[5][17] = TILE.CORPSE_LOOT;

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

      const { grid, spawnX, spawnY, exitX, exitY, secretX, secretY, secretChamberCoords } =
        buildRoomLayout(tpl, rng, roomW, roomH);

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

      // Inter-floor stairs
      if (fc.floor === 2 && idx === 1) {
        grid[4][Math.floor(roomW / 2)] = TILE.STAIRS_UP;
        grid[5][Math.floor(roomW / 2)] = TILE.FLOOR;
      }
      if (fc.floor === 2 && idx === 3) {
        grid[roomH - 3][Math.floor(roomW / 2)] = TILE.STAIRS_DOWN;
        grid[roomH - 4][Math.floor(roomW / 2)] = TILE.FLOOR;
      }
      if (fc.floor === 1 && idx === 0) {
        grid[roomH - 3][4] = TILE.STAIRS_DOWN;
        grid[roomH - 4][4] = TILE.FLOOR;
      }
      if (fc.floor === 3 && idx === 0) {
        grid[4][4] = TILE.STAIRS_UP;
        grid[5][4] = TILE.FLOOR;
      }

      // 1. Build reservedMask to prevent ANY overlapping props/gates/NPCs
      const reservedMask = new Set<string>();
      const reserveArea = (cx: number, cy: number, radius: number) => {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            reservedMask.add(`${cx + dx},${cy + dy}`);
          }
        }
      };

      // Reserve all non-floor structural tiles and 1-tile buffer around gates/portals/stairs/bars
      for (let y = 0; y < roomH; y++) {
        for (let x = 0; x < roomW; x++) {
          const t = grid[y][x];
          if (t !== TILE.FLOOR) {
            reservedMask.add(`${x},${y}`);
          }
          if (
            t === TILE.SHORTCUT_GATE ||
            t === TILE.BARS ||
            t === TILE.PORTAL_PREV ||
            t === TILE.PORTAL_NEXT ||
            t === TILE.STAIRS_UP ||
            t === TILE.STAIRS_DOWN ||
            t === TILE.CRACKED_WALL ||
            t === TILE.BRIDGE
          ) {
            reserveArea(x, y, 1);
          }
        }
      }
      // Reserve secret chamber and entrance tile
      for (const coord of secretChamberCoords) {
        reservedMask.add(coord);
      }
      reserveArea(secretX, secretY + 1, 1);
      // Reserve 5x5 spawn safety zone
      reserveArea(spawnX, spawnY, 2);
      reserveArea(exitX, exitY, 2);

      // If Throne Room (F1_R3), reserve the 3-tile-wide Royal Red Carpet & Gothic Pillar aisles
      if (isThroneRoom) {
        for (let x = 2; x < roomW - 2; x++) {
          for (let y = spawnY - 3; y <= spawnY + 3; y++) {
            reservedMask.add(`${x},${y}`);
          }
        }
      }

      // Helper to place multi-tile landmarks & NPCs with guaranteed walkable clearance + reservedMask lock
      const placeLandmark = (cx: number, cy: number, tileType: TILE, clearRadius = 1, reserveRadius = 2) => {
        for (let dy = -clearRadius; dy <= clearRadius; dy++) {
          for (let dx = -clearRadius; dx <= clearRadius; dx++) {
            const ny = cy + dy;
            const nx = cx + dx;
            if (ny >= 3 && ny < roomH - 2 && nx >= 2 && nx < roomW - 2) {
              const cur = grid[ny][nx];
              if (cur === TILE.WALL || cur === TILE.CHASM) {
                grid[ny][nx] = TILE.FLOOR;
              }
            }
          }
        }
        grid[cy][cx] = tileType;
        reserveArea(cx, cy, reserveRadius);
      };

      // Guarantee Hexen Altar in Room 0 and Room 2 of each floor (away from SPLIT_SHORTCUT bars)
      if (!isThroneRoom && (idx === 0 || idx === 2)) {
        const hx = Math.floor(roomW / 2);
        const hy = tpl === 'SPLIT_SHORTCUT' ? spawnY + 2 : spawnY;
        placeLandmark(hx, hy, TILE.HEXEN_ALTAR, 1, 2);
      }

      // Place Canon NPCs across Floors 1, 2, 3
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
        // Recruitable Fallen Knight (if player is not fallen_knight)
        placeLandmark(roomW - 7, 5, TILE.NPC_RECRUIT_KNIGHT, 1, 2);
      }
      if (fc.floor === 2 && idx === 1) {
        placeLandmark(Math.floor(roomW / 2) - 4, roomH - 4, TILE.NPC_PRISONER, 1, 2);
      }
      if (fc.floor === 2 && idx === 2) {
        placeLandmark(6, 5, TILE.NPC_PRIEST, 1, 2);
        // Recruitable Forsaken Nun (if player is not forsaken_nun)
        placeLandmark(roomW - 7, roomH - 4, TILE.NPC_RECRUIT_NUN, 1, 2);
      }
      if (fc.floor === 2 && idx === 3) {
        placeLandmark(6, roomH - 4, TILE.NPC_BROKEN_KNIGHT, 1, 2);
        placeLandmark(roomW - 6, 5, TILE.NPC_CHILD_12, 1, 2);
      }

      // FLOOR 3: Vực Sao Dị Giới
      if (fc.floor === 3 && idx === 0) {
        // Recruitable Night Hunter (if player is not night_hunter)
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
        for (let attempt = 0; attempt < openTiles.length; attempt++) {
          const i = rngSource.int(0, openTiles.length - 1);
          const [tx, ty] = openTiles[i];
          openTiles.splice(i, 1);
          if (reservedMask.has(`${tx},${ty}`)) continue;
          reserveArea(tx, ty, bufferRadius);
          return [tx, ty];
        }
        return null;
      };

      if (!isBossRoom && roomMiniBossId) {
        const normalId = fc.normalPool[idx % fc.normalPool.length];
        const eSpot1 = popTileWithBuffer(rng, 1);
        if (eSpot1) {
          enemies.push(
            createMapEnemyInstance(`${roomId}_E1`, normalId, eSpot1[0], eSpot1[1], {
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
        const smallCount = rng.int(1, 3);
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

      const extraRng = new SeededRNG(`${seed}_${roomId}_extra_props`);

      // Place Ritual Circle (3x3 footprint) in odd non-boss rooms before smaller props
      if (!isBossRoom && idx % 2 === 1) {
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
            placeLandmark(rx, ry, TILE.RITUAL_CIRCLE, 1, 2);
            break;
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
      if (!isThroneRoom) {
        const chestSpot = popTileWithBuffer(extraRng, 1);
        if (chestSpot) grid[chestSpot[1]][chestSpot[0]] = TILE.CHEST;

        for (let cIdx = 0; cIdx < 2; cIdx++) {
          const crateSpot = popTileWithBuffer(extraRng, 1);
          if (crateSpot) grid[crateSpot[1]][crateSpot[0]] = TILE.CRATE;
        }

        for (let hIdx = 0; hIdx < 2; hIdx++) {
          const herbSpot = popTileWithBuffer(extraRng, 1);
          if (herbSpot) grid[herbSpot[1]][herbSpot[0]] = TILE.HERB;
        }
      }

      if (!isBossRoom) {
        const trapSpot = popTileWithBuffer(extraRng, 1);
        if (trapSpot) grid[trapSpot[1]][trapSpot[0]] = TILE.FLOOR_TRAP;
        const miasmaSpot = popTileWithBuffer(extraRng, 1);
        if (miasmaSpot) grid[miasmaSpot[1]][miasmaSpot[0]] = TILE.MIASMA_VENT;
        const corpseSpot = popTileWithBuffer(extraRng, 1);
        if (corpseSpot) grid[corpseSpot[1]][corpseSpot[0]] = TILE.CORPSE_LOOT;
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
          name: 'Tầng 1 – Khu 2: Lò Rèn Quỷ & Chảo Máu',
          sensory:
            'Tiếng búa tạ nện vang vọng rợn người. Kẻ Đúc Kiếm Không Đầu có bốn cánh tay sần sùi đứng bên đe rèn đẫm máu và chảo sắt sôi lửa đỏ.',
        },
        F1_R2: {
          name: 'Tầng 1 – Khu 3: Tiền Sảnh Bàn Tiệc & Lồng Kính Pha Lê',
          sensory:
            'Ngay trước cửa phòng Ngai Vàng Xương Sắt, Quý Cô Trong Lồng Kính bị giam giữa bàn tiệc đổ nát và những chân nến tắt lịm.',
        },
        F1_R3: {
          name: 'Tầng 1 – Khu 4: Đại Điện Ngai Vàng Máu Vaelis',
          sensory:
            'Thảm Đỏ Hoàng Gia viền vàng trải dài giữa hai hàng cột đá Gothic và lư hương lửa đỏ dẫn tới Bệ Đá Tam Cấp. Trên Ngai Vàng Xương Sắt khổng lồ, Hiệp Sĩ Trưởng Vaelis ngồi uy nghi bất động chờ nhát kiếm phán xét.',
        },
        F3_R0: {
          name: 'Tầng 3 – Khu 1: Vực Sao Cổ Ngữ & Cành Cây Thịt',
          sensory:
            'Không gian và thời gian uốn cong bên dưới nền móng Goethe. Thí Nghiệm Thất Bại Số 09 đang bò lết giữa những rễ cây bằng thịt đỏ hỏn.',
        },
        F3_R1: {
          name: 'Tầng 3 – Khu 2: Sảnh Bia Đá Cổ Ngữ & Kẻ Chép Sử Hóa Thạch',
          sensory:
            'Giữa những bia đá khắc cổ ngữ phát sáng và chồng sách da dê hóa thạch, Kẻ Chép Sử Hóa Thạch vẫn lẩm bẩm về 3 Mảnh Thần Chú Tái Thiết.',
        },
        F3_R2: {
          name: 'Tầng 3 – Khu 3: Phòng Thí Nghiệm Vực Sao & Lão Thần Y',
          sensory:
            'Bên bàn mổ đá và tủ kính đựng ống nghiệm xanh-tím, Lão Thần Y Điên ngồi trên chiếc xe lăn gỗ đã dính liền vào nửa thân dưới hóa đá.',
        },
        F3_R3: {
          name: 'Tầng 3 – Khu 4: Tâm Điểm Vết Rách & Thánh Tử Thứ 13',
          sensory:
            'Khe nứt không gian tím thẫm gầm rú phía trên lồng sắt mở hé của Thánh Tử Thứ 13 và bệ đá đặt bình Tiên Dược Cổ Đại. Sứ Giả Của Vết Rách lơ lửng trấn giữ đáy vực.',
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
        lootedCoords: [],
        shortcutOpened: false,
        secretWallBlown: false,
      };
    }
  }

  rooms.F2_EXTERIOR = buildExteriorCourtyardRoom();

  return {
    seed,
    rooms,
    currentRoomId: 'F2_EXTERIOR',
    visitedRoomIds: ['F2_EXTERIOR'],
  };
}

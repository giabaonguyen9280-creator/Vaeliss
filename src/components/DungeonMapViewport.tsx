import React, { useEffect, useRef } from 'react';
import { CONFIG } from '../game/config';
import { PlayerState } from '../game/combat';
import { isWalkableTile, MapEnemyInstance, RoomData, TILE } from '../game/mapGen';
import {
  drawMultiTileLandmark,
  drawNpcSetDressing,
  drawPixelSprite,
  getFloorTileTexture,
} from '../game/pixelArt';

interface DungeonMapViewportProps {
  room: RoomData;
  player: PlayerState;
  playerPos: { x: number; y: number };
  trailCoords: Array<{ x: number; y: number }>;
  animTick: number;
  isInteractivePaused: boolean;
  riftElixirCollected?: boolean;
  onTileClick: (worldTileX: number, worldTileY: number) => void;
  onUpdateEnemies?: (updater: (enemies: MapEnemyInstance[]) => MapEnemyInstance[]) => void;
  onEnemyCollidePlayer?: (enemy: MapEnemyInstance) => void;
}

const NPC_TILE_SET = new Set<TILE>([
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

function isRecruitNpcActive(tile: TILE, player: PlayerState, looted: boolean): boolean {
  if (tile === TILE.NPC_RECRUIT_KNIGHT) {
    return (
      !looted &&
      player.classId !== 'fallen_knight' &&
      !player.party.some((a) => a.id === 'fallen_knight')
    );
  }
  if (tile === TILE.NPC_RECRUIT_NUN) {
    return (
      !looted &&
      player.classId !== 'forsaken_nun' &&
      !player.party.some((a) => a.id === 'forsaken_nun')
    );
  }
  if (tile === TILE.NPC_RECRUIT_HUNTER) {
    return (
      !looted &&
      player.classId !== 'night_hunter' &&
      !player.party.some((a) => a.id === 'night_hunter')
    );
  }
  return true;
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

/**
 * Pure Bresenham Line-of-Sight check between two grid coordinates.
 * Walls and Cracked Walls block sight beyond them, while the blocking wall itself remains visible.
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
      if (t === TILE.WALL || t === TILE.CRACKED_WALL || t === TILE.VOID) {
        return false;
      }
    }
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
  return true;
}

/**
 * Checks whether target (tx, ty) falls inside:
 * 1) The enemy's directional vision cone in front (`coneRange = 5` tiles)
 * 2) Or the surrounding sound/hearing radius (`hearingRadius = 2` tiles; `3` with heavy armor; `1` with Flayed Disguise)
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

  // Surrounding sound/hearing detection (requires clear LOS so walls block sound agro across rooms)
  if (manhattan <= hearingRadius) return true;

  // Directional 5-tile front sight cone
  if (manhattan > coneRange) return false;
  if (facing === 'left') return dx < 0 && Math.abs(dy) <= Math.abs(dx);
  if (facing === 'right') return dx > 0 && Math.abs(dy) <= Math.abs(dx);
  if (facing === 'up') return dy < 0 && Math.abs(dx) <= Math.abs(dy);
  return dy > 0 && Math.abs(dx) <= Math.abs(dy);
}

export const DungeonMapViewport: React.FC<DungeonMapViewportProps> = ({
  room,
  player,
  playerPos,
  trailCoords,
  animTick,
  isInteractivePaused,
  riftElixirCollected = false,
  onTileClick,
  onUpdateEnemies,
  onEnemyCollidePlayer,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<{
    cacheKey: string;
    canvas: HTMLCanvasElement;
  } | null>(null);

  // Smoothly interpolated visual coordinates for player & camera
  const visualPosRef = useRef<{ x: number; y: number }>({
    x: playerPos.x,
    y: playerPos.y,
  });
  const prevRoomIdRef = useRef<string>(room.id);
  const cameraOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const triggeredCombatRef = useRef<boolean>(false);
  const onUpdateEnemiesRef = useRef(onUpdateEnemies);
  onUpdateEnemiesRef.current = onUpdateEnemies;
  const onEnemyCollidePlayerRef = useRef(onEnemyCollidePlayer);
  onEnemyCollidePlayerRef.current = onEnemyCollidePlayer;

  // Snap visualPos immediately when switching rooms and reset combat trigger lock
  useEffect(() => {
    if (prevRoomIdRef.current !== room.id) {
      prevRoomIdRef.current = room.id;
      visualPosRef.current = { x: playerPos.x, y: playerPos.y };
      triggeredCombatRef.current = false;
    }
  }, [room.id, playerPos.x, playerPos.y]);

  // Auto-trigger combat immediately whenever a chasing enemy (or Floor Boss) closes within Manhattan distance <= 1
  useEffect(() => {
    if (isInteractivePaused || !onEnemyCollidePlayerRef.current) return;

    const threateningEnemy = room.enemies.find((e) => {
      if (e.defeated || e.isTutorialGatekeeper) return false;
      const dist = Math.abs(e.x - playerPos.x) + Math.abs(e.y - playerPos.y);
      if (dist > 1) return false;
      if (e.isFloorBoss) {
        return (e.questionTimerMs || 0) <= 0;
      }
      return e.aiState === 'chase';
    });

    if (!threateningEnemy) {
      triggeredCombatRef.current = false;
      return;
    }

    if (!triggeredCombatRef.current) {
      triggeredCombatRef.current = true;
      onEnemyCollidePlayerRef.current(threateningEnemy);
    }
  }, [room.id, room.enemies, playerPos.x, playerPos.y, isInteractivePaused]);

  // High-Precision Chase & De-Agro AI Loop (50ms tick for exact 300ms alert pause, 250ms/190ms chase steps, and 2500ms LOS de-agro)
  useEffect(() => {
    if (isInteractivePaused || !onUpdateEnemiesRef.current) return;

    const TICK_MS = 50;
    const roomW = room.width || room.grid[0]?.length || CONFIG.GRID_W;
    const roomH = room.height || room.grid.length || CONFIG.GRID_H;

    // Collect NPC coordinates so patrolling enemies never enter the 3x3 clearance zone around NPCs
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

    const timer = setInterval(() => {
      if (triggeredCombatRef.current || !onUpdateEnemiesRef.current) return;

      const isHeavyArmor =
        player.equippedBody === 'legion_brigandine' ||
        player.equippedBody === 'vanguard_hauberk' ||
        player.equippedBody === 'cathedral_chainmail' ||
        player.equippedBody === 'platinum_cuirass';
      const isFlayedDisguise = player.equippedBody === 'flayed_disguise';

      const coneRange = 5;
      const hearingRadius = isFlayedDisguise ? 1 : isHeavyArmor ? 3 : 2;

      const blockedSecretSet = new Set<string>(
        !room.secretWallBlown ? room.secretChamberCoords || [] : []
      );

      onUpdateEnemiesRef.current((prevEnemies) => {
        const occupiedAll = new Set<string>(
          prevEnemies.filter((e) => !e.defeated).map((e) => `${e.x},${e.y}`)
        );
        return prevEnemies.map((enemy) => {
          if (enemy.defeated || enemy.isTutorialGatekeeper) {
            return enemy;
          }

          if (enemy.isFloorBoss) {
            if ((enemy.questionTimerMs || 0) > 0) {
              return {
                ...enemy,
                questionTimerMs: Math.max(0, (enemy.questionTimerMs || 0) - TICK_MS),
              };
            }
            return enemy;
          }

          const tpl = CONFIG.ENEMIES[enemy.templateId];
          const speedSteps = tpl?.speedSteps || 1;
          const chaseStepIntervalMs = speedSteps >= 2 ? 190 : 250;
          const patrolStepIntervalMs = 450;

          const facing = enemy.facing || 'left';
          const manhattanToPlayer =
            Math.abs(playerPos.x - enemy.x) + Math.abs(playerPos.y - enemy.y);

          // If an alerted or chasing enemy is already adjacent (<= 1 tile), lock into chase so combat triggers immediately
          if (manhattanToPlayer <= 1 && (enemy.aiState === 'chase' || enemy.aiState === 'alert')) {
            const dxToPlayer = playerPos.x - enemy.x;
            const dyToPlayer = playerPos.y - enemy.y;
            const lockedFacing =
              Math.abs(dxToPlayer) >= Math.abs(dyToPlayer) && dxToPlayer !== 0
                ? dxToPlayer > 0
                  ? 'right'
                  : 'left'
                : dyToPlayer !== 0
                ? dyToPlayer > 0
                  ? 'down'
                  : 'up'
                : facing;
            return {
              ...enemy,
              aiState: 'chase',
              alertTimerMs: 0,
              questionTimerMs: 0,
              facing: lockedFacing,
              lastSeenX: playerPos.x,
              lastSeenY: playerPos.y,
            };
          }

          const hasLOS = hasLineOfSight(room.grid, enemy.x, enemy.y, playerPos.x, playerPos.y);
          const detected =
            hasLOS &&
            isDetectedByEnemy(
              enemy.x,
              enemy.y,
              facing,
              playerPos.x,
              playerPos.y,
              coneRange,
              hearingRadius
            );

          let aiState: 'patrol' | 'alert' | 'chase' | 'deagro' = enemy.aiState || 'patrol';
          let alertTimerMs = Math.max(0, (enemy.alertTimerMs || 0) - TICK_MS);
          let loseSightTimerMs = enemy.loseSightTimerMs ?? 0;
          let questionTimerMs = Math.max(0, (enemy.questionTimerMs || 0) - TICK_MS);
          let moveCooldownMs = Math.max(0, (enemy.moveCooldownMs || 0) - TICK_MS);
          let lastSeenX = enemy.lastSeenX ?? playerPos.x;
          let lastSeenY = enemy.lastSeenY ?? playerPos.y;

          // 1. Agro Trigger: Patrol / De-Agro -> 300ms '!' Alert Pause -> Chase (loseSightTimerMs = 2500)
          // Suppress instant re-agro right after fleeing combat while questionTimerMs > 1500
          const postFleeGraceActive = aiState === 'deagro' && questionTimerMs > 1500;
          if (aiState === 'patrol' || aiState === 'deagro') {
            if (detected && !postFleeGraceActive) {
              return {
                ...enemy,
                aiState: 'alert',
                alertTimerMs: 300,
                loseSightTimerMs: 2500,
                questionTimerMs: 0,
                moveCooldownMs: 300,
                lastSeenX: playerPos.x,
                lastSeenY: playerPos.y,
              };
            }
            if (aiState === 'deagro' && questionTimerMs <= 0) {
              aiState = 'patrol';
            }
          }

          // 2. Alert Pause (300ms with red '!' overhead before starting chase)
          if (aiState === 'alert') {
            if (hasLOS) {
              lastSeenX = playerPos.x;
              lastSeenY = playerPos.y;
            }
            if (alertTimerMs > 0) {
              return {
                ...enemy,
                aiState: 'alert',
                alertTimerMs,
                loseSightTimerMs: 2500,
                moveCooldownMs,
                lastSeenX,
                lastSeenY,
              };
            }
            aiState = 'chase';
            loseSightTimerMs = 2500;
            moveCooldownMs = 0;
          }

          // 3. De-Agro Conditions while in 'chase'
          if (aiState === 'chase') {
            // Condition A: Manhattan distance >= 9 tiles -> De-Agro & show yellow '?' for 1500ms
            if (manhattanToPlayer >= 9) {
              return {
                ...enemy,
                aiState: 'deagro',
                questionTimerMs: 1500,
                loseSightTimerMs: 0,
                moveCooldownMs: patrolStepIntervalMs,
              };
            }

            // Condition B: Line-of-sight blocked by wall continuously for 2500ms
            if (hasLOS) {
              loseSightTimerMs = 2500;
              lastSeenX = playerPos.x;
              lastSeenY = playerPos.y;
            } else {
              loseSightTimerMs = Math.max(0, loseSightTimerMs - TICK_MS);
              if (loseSightTimerMs <= 0) {
                return {
                  ...enemy,
                  aiState: 'deagro',
                  questionTimerMs: 1500,
                  loseSightTimerMs: 0,
                  moveCooldownMs: patrolStepIntervalMs,
                };
              }
            }
          }

          // Wait until movement cooldown expires before taking a grid step
          if (moveCooldownMs > 0) {
            return {
              ...enemy,
              aiState,
              alertTimerMs,
              loseSightTimerMs,
              questionTimerMs,
              moveCooldownMs,
              lastSeenX,
              lastSeenY,
            };
          }

          let stepX = 0;
          let stepY = 0;
          let nextFacing = facing;

          if (aiState === 'chase') {
            // Move toward current playerPos if visible, or toward lastSeenX/lastSeenY when behind wall
            const targetX = hasLOS ? playerPos.x : lastSeenX;
            const targetY = hasLOS ? playerPos.y : lastSeenY;

            if (enemy.x === targetX && enemy.y === targetY && !hasLOS) {
              // Reached last seen tile and still cannot see player -> show '?' and return to patrol
              return {
                ...enemy,
                aiState: 'deagro',
                questionTimerMs: 1500,
                loseSightTimerMs: 0,
                moveCooldownMs: patrolStepIntervalMs,
              };
            }

            const bfsStep = findNextChaseStepBFS(
              room.grid,
              roomW,
              roomH,
              enemy.x,
              enemy.y,
              targetX,
              targetY,
              room.shortcutOpened,
              blockedSecretSet,
              occupiedAll
            );

            if (bfsStep) {
              stepX = bfsStep.dx;
              stepY = bfsStep.dy;
              if (stepX !== 0) nextFacing = stepX > 0 ? 'right' : 'left';
              else if (stepY !== 0) nextFacing = stepY > 0 ? 'down' : 'up';
            }
          } else if (aiState === 'patrol' && !postFleeGraceActive) {
            if (Math.random() < 0.65) {
              if (facing === 'left') stepX = -1;
              else if (facing === 'right') stepX = 1;
              else if (facing === 'up') stepY = -1;
              else stepY = 1;
            }
          }

          const nx = enemy.x + stepX;
          const ny = enemy.y + stepY;
          const nextCooldown = aiState === 'chase' ? chaseStepIntervalMs : patrolStepIntervalMs;

          // Allow stepping directly onto player coordinates without canceling or reversing the step
          const isSteppingOntoPlayer =
            (stepX !== 0 || stepY !== 0) && nx === playerPos.x && ny === playerPos.y;
          if (isSteppingOntoPlayer) {
            return {
              ...enemy,
              x: nx,
              y: ny,
              facing: nextFacing,
              aiState: 'chase',
              alertTimerMs: 0,
              loseSightTimerMs: 2500,
              questionTimerMs: 0,
              moveCooldownMs: nextCooldown,
              lastSeenX: playerPos.x,
              lastSeenY: playerPos.y,
            };
          }

          const withinBounds =
            aiState === 'chase'
              ? nx >= 1 && nx < roomW - 1 && ny >= 1 && ny < roomH - 1
              : nx >= 2 && nx < roomW - 2 && ny >= 3 && ny < roomH - 2;

          if (
            (stepX !== 0 || stepY !== 0) &&
            withinBounds &&
            isWalkableTile(room.grid[ny][nx], room.shortcutOpened) &&
            (aiState === 'chase' || !isInsideNpcZone(nx, ny))
          ) {
            return {
              ...enemy,
              x: nx,
              y: ny,
              facing: nextFacing,
              aiState,
              alertTimerMs,
              loseSightTimerMs,
              questionTimerMs,
              moveCooldownMs: nextCooldown,
              lastSeenX,
              lastSeenY,
            };
          } else if (stepX !== 0 || stepY !== 0) {
            const reverseMap: Record<'up' | 'down' | 'left' | 'right', 'up' | 'down' | 'left' | 'right'> = {
              left: 'right',
              right: 'left',
              up: 'down',
              down: 'up',
            };
            return {
              ...enemy,
              facing: reverseMap[facing],
              aiState,
              alertTimerMs,
              loseSightTimerMs,
              questionTimerMs,
              moveCooldownMs: nextCooldown,
              lastSeenX,
              lastSeenY,
            };
          }

          return {
            ...enemy,
            aiState,
            alertTimerMs,
            loseSightTimerMs,
            questionTimerMs,
            moveCooldownMs: nextCooldown,
            lastSeenX,
            lastSeenY,
          };
        });
      });
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [
    isInteractivePaused,
    room.id,
    room.grid,
    room.width,
    room.height,
    room.shortcutOpened,
    room.secretWallBlown,
    room.secretChamberCoords,
    playerPos.x,
    playerPos.y,
    player.equippedBody,
    player.equippedHead,
  ]);

  // Smooth Delta-Time Render Loop with Offscreen Static Layer + Camera Translation + Bresenham LOS
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const renderFrame = (now: number) => {
      const dt = Math.min(0.064, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      // Smooth lerp toward logical playerPos
      const lerpSpeed = Math.min(1, dt * 15);
      visualPosRef.current.x += (playerPos.x - visualPosRef.current.x) * lerpSpeed;
      visualPosRef.current.y += (playerPos.y - visualPosRef.current.y) * lerpSpeed;
      if (Math.abs(playerPos.x - visualPosRef.current.x) < 0.01) visualPosRef.current.x = playerPos.x;
      if (Math.abs(playerPos.y - visualPosRef.current.y) < 0.01) visualPosRef.current.y = playerPos.y;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const tileW = CONFIG.TILE_PX;
          const tileH = CONFIG.TILE_PX;
          const roomW = room.width || room.grid[0]?.length || CONFIG.GRID_W;
          const roomH = room.height || room.grid.length || CONFIG.GRID_H;
          const worldPxW = roomW * tileW;
          const worldPxH = roomH * tileH;
          const viewW = canvas.width;
          const viewH = canvas.height;

          // Build or reuse Offscreen Static Tile Layer
          const cacheKey = `${room.id}_${roomW}x${roomH}_${room.secretWallBlown}_${room.shortcutOpened}_${room.lootedCoords.join('|')}`;
          if (!offscreenRef.current || offscreenRef.current.cacheKey !== cacheKey) {
            const offCanvas = document.createElement('canvas');
            offCanvas.width = worldPxW;
            offCanvas.height = worldPxH;
            const offCtx = offCanvas.getContext('2d')!;

            for (let y = 0; y < roomH; y++) {
              for (let x = 0; x < roomW; x++) {
                const tile = room.grid[y][x];
                const px = x * tileW;
                const py = y * tileH;
                const coordKey = `${x},${y}`;

                // Multi-tile landmarks render dynamically over clean stone floor
                const texTile =
                  tile === TILE.HEXEN_ALTAR ||
                  tile === TILE.RITUAL_CIRCLE ||
                  tile === TILE.BOOKSHELF ||
                  tile === TILE.VOID_RIFT
                    ? TILE.FLOOR
                    : tile;

                const variantHash = Math.abs(((x * 73 + y * 37) ^ (x * 19)) % 6);
                const floorTex = getFloorTileTexture(
                  room.floor,
                  texTile,
                  variantHash,
                  Boolean(room.isExterior)
                );
                offCtx.drawImage(floorTex, px, py, tileW, tileH);

                // Wall Contact Drop Shadows (Soft gradient shadow cast downward onto adjacent floor tiles)
                const isWallTile = tile === TILE.WALL || tile === TILE.CRACKED_WALL || tile === TILE.VOID;
                if (!isWallTile) {
                  const aboveTile = y > 0 ? room.grid[y - 1][x] : null;
                  const leftTile = x > 0 ? room.grid[y][x - 1] : null;
                  if (aboveTile === TILE.WALL || aboveTile === TILE.CRACKED_WALL) {
                    const bGrad = offCtx.createLinearGradient(px, py, px, py + 15);
                    bGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
                    bGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    offCtx.fillStyle = bGrad;
                    offCtx.fillRect(px, py, tileW, 15);
                  }
                  if (leftTile === TILE.WALL || leftTile === TILE.CRACKED_WALL) {
                    const lGrad = offCtx.createLinearGradient(px, py, px + 10, py);
                    lGrad.addColorStop(0, 'rgba(0, 0, 0, 0.38)');
                    lGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    offCtx.fillStyle = lGrad;
                    offCtx.fillRect(px, py, 10, tileH);
                  }
                }

                if (tile === TILE.PORTAL_NEXT || tile === TILE.PORTAL_PREV) {
                  offCtx.fillStyle = tile === TILE.PORTAL_NEXT ? '#b45309' : '#4b5563';
                  offCtx.fillRect(px + 6, py + 6, tileW - 12, tileH - 12);
                  offCtx.strokeStyle = '#fbbf24';
                  offCtx.strokeRect(px + 6, py + 6, tileW - 12, tileH - 12);
                } else if (
                  tile === TILE.CRATE ||
                  tile === TILE.HERB ||
                  tile === TILE.CHEST ||
                  tile === TILE.CORPSE_LOOT ||
                  tile === TILE.FLOOR_TRAP
                ) {
                  if (room.lootedCoords.includes(coordKey)) {
                    offCtx.fillStyle = 'rgba(0,0,0,0.58)';
                    offCtx.fillRect(px + 6, py + 6, tileW - 12, tileH - 12);
                  }
                }
              }
            }
            offscreenRef.current = { cacheKey, canvas: offCanvas };
          }

          // Compute clamped Camera Offset centered on interpolated player position
          const targetCamX = (visualPosRef.current.x + 0.5) * tileW - viewW / 2;
          const targetCamY = (visualPosRef.current.y + 0.5) * tileH - viewH / 2;
          const camX =
            worldPxW > viewW ? Math.max(0, Math.min(worldPxW - viewW, targetCamX)) : 0;
          const camY =
            worldPxH > viewH ? Math.max(0, Math.min(worldPxH - viewH, targetCamY)) : 0;
          cameraOffsetRef.current = { x: camX, y: camY };

          ctx.clearRect(0, 0, viewW, viewH);
          ctx.save();
          ctx.translate(-camX, -camY);

          // 1. Blit Cached Static Tile Layer
          ctx.drawImage(offscreenRef.current.canvas, 0, 0);

          // Compute Bresenham Line-of-Sight Visibility Set from playerPos
          const hasTorchOrLamp =
            (player.inventory.torch || 0) > 0 || (player.inventory.oil_lamp || 0) > 0;
          const sightRadius = room.isExterior
            ? 11
            : room.floor === 3
            ? hasTorchOrLamp
              ? 7
              : 5
            : hasTorchOrLamp
            ? 9
            : 7;

          const visibleCoords = new Set<string>();
          const staticPointLights: Array<{ x: number; y: number; color: string; radius: number }> = [];

          for (let y = 0; y < roomH; y++) {
            for (let x = 0; x < roomW; x++) {
              const dist = Math.hypot(x - playerPos.x, y - playerPos.y);
              if (dist <= sightRadius + 0.6 && hasLineOfSight(room.grid, playerPos.x, playerPos.y, x, y)) {
                visibleCoords.add(`${x},${y}`);
              }
              const t = room.grid[y][x];
              if (t === TILE.HEXEN_ALTAR) {
                staticPointLights.push({
                  x,
                  y,
                  color: 'rgba(192, 132, 252, 0.30)',
                  radius: tileW * 2.8,
                });
              } else if (t === TILE.VOID_RIFT) {
                staticPointLights.push({
                  x,
                  y,
                  color: 'rgba(168, 85, 247, 0.36)',
                  radius: tileW * 3.2,
                });
              }
            }
          }

          // 1B. Floor-Level 3x3 Sunken Ritual Circles (Walkable, glows brightly when player stands inside 3x3)
          for (let y = 0; y < roomH; y++) {
            for (let x = 0; x < roomW; x++) {
              if (room.grid[y][x] === TILE.RITUAL_CIRCLE && visibleCoords.has(`${x},${y}`)) {
                const isInside =
                  Math.abs(playerPos.x - x) <= 1 && Math.abs(playerPos.y - y) <= 1;
                const isLooted = room.lootedCoords.includes(`${x},${y}`);
                drawMultiTileLandmark(
                  ctx,
                  TILE.RITUAL_CIRCLE,
                  x,
                  y,
                  tileW,
                  tileH,
                  animTick,
                  isLooted,
                  isInside
                );
              }
            }
          }

          // 2. Depth-Sorted Entities Pass (Multi-Tile Landmarks + NPC Set-Dressing + NPCs + Party + Player + Enemies)
          interface RenderEntity {
            footY: number;
            draw: () => void;
          }
          const entities: RenderEntity[] = [];

          // Dedicated NPC Sprite Keys matching each NPC's unique anatomy in pixelArt.ts
          const npcSpriteMeta: Record<string, { sprite: string; label: string }> = {
            [TILE.NPC_PRIEST]: { sprite: 'npc_priest', label: 'Giáo Sĩ Mù' },
            [TILE.NPC_SMUGGLER]: { sprite: 'night_hunter', label: 'Buôn Lậu' },
            [TILE.NPC_PRISONER]: { sprite: 'ally_kael', label: 'Kael (Tù Nhân)' },
            [TILE.NPC_CHILD_12]: { sprite: 'npc_child_12', label: 'Thánh Tử 12' },
            [TILE.NPC_BROKEN_KNIGHT]: { sprite: 'npc_broken_knight', label: 'Kỵ Sĩ Gãy Chân' },
            [TILE.NPC_SMITH]: { sprite: 'npc_smith', label: 'Kẻ Đúc Kiếm' },
            [TILE.NPC_GLASS_LADY]: { sprite: 'npc_glass_lady', label: 'Quý Cô Lồng Kính' },
            [TILE.NPC_PHYSICIAN]: { sprite: 'npc_physician', label: 'Lão Thần Y' },
            [TILE.NPC_CHRONICLER]: { sprite: 'npc_chronicler', label: 'Kẻ Chép Sử' },
            [TILE.NPC_RECRUIT_KNIGHT]: { sprite: 'fallen_knight', label: 'Hiệp Sĩ Marcus' },
            [TILE.NPC_RECRUIT_NUN]: { sprite: 'forsaken_nun', label: 'Nữ Tu Elena' },
            [TILE.NPC_RECRUIT_HUNTER]: { sprite: 'night_hunter', label: 'Thợ Săn Lyra' },
          };

          for (let y = 0; y < roomH; y++) {
            for (let x = 0; x < roomW; x++) {
              const t = room.grid[y][x];
              const isLandmark =
                t === TILE.HEXEN_ALTAR || t === TILE.BOOKSHELF || t === TILE.VOID_RIFT;
              if (!visibleCoords.has(`${x},${y}`) && t !== TILE.HEXEN_ALTAR && t !== TILE.VOID_RIFT) {
                continue;
              }

              // Multi-Tile Standing Landmarks (3x2 Hexen Altar, 1x2 Gothic Bookshelf, 3x3 Void Rift + Child 13)
              if (isLandmark) {
                const cKey = `${x},${y}`;
                const isLooted =
                  t === TILE.VOID_RIFT ? riftElixirCollected : room.lootedCoords.includes(cKey);
                entities.push({
                  footY: y - 0.1,
                  draw: () => {
                    drawMultiTileLandmark(ctx, t, x, y, tileW, tileH, animTick, isLooted, false);
                  },
                });
                continue;
              }

              const meta = npcSpriteMeta[t];
              if (meta) {
                const cKey = `${x},${y}`;
                if (
                  t === TILE.NPC_PRISONER &&
                  (player.npcFlags.prisonerRecruited || player.party.some((a) => a.id === 'ally_kael'))
                ) {
                  continue;
                }
                if (!isRecruitNpcActive(t, player, room.lootedCoords.includes(cKey))) {
                  continue;
                }
                const px = x * tileW;
                const py = (y - 1) * tileH;

                entities.push({
                  footY: y,
                  draw: () => {
                    // Draw Canonical Set-Dressing Props behind/around NPC
                    drawNpcSetDressing(ctx, t, x, y, tileW, tileH, animTick);
                    drawPixelSprite(ctx, meta.sprite, px, py, tileW, tileH * 2);
                    ctx.fillStyle = 'rgba(0,0,0,0.82)';
                    ctx.fillRect(px - 10, py - 10, tileW + 20, 13);
                    ctx.fillStyle = '#fbbf24';
                    ctx.font = 'bold 10px "Noto Serif", serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(meta.label, px + tileW / 2, py);
                  },
                });
              }
            }
          }

          // Recruited Party Follower(s)
          player.party.forEach((ally, idx) => {
            if (ally.hp <= 0) return;
            const coord = trailCoords[idx] || { x: Math.max(1, playerPos.x - 1), y: playerPos.y };
            entities.push({
              footY: coord.y,
              draw: () => {
                const px = coord.x * tileW;
                const py = (coord.y - 1) * tileH;
                drawPixelSprite(ctx, ally.spriteKey || ally.classId, px, py, tileW, tileH * 2);
              },
            });
          });

          // Player Entity (Smoothly interpolated visualPosRef)
          entities.push({
            footY: visualPosRef.current.y,
            draw: () => {
              const px = visualPosRef.current.x * tileW;
              const py = (visualPosRef.current.y - 1) * tileH + (animTick % 2 === 0 ? 0 : -2);
              ctx.fillStyle = 'rgba(0,0,0,0.48)';
              ctx.beginPath();
              ctx.ellipse(
                px + tileW / 2,
                visualPosRef.current.y * tileH + tileH - 6,
                tileW * 0.35,
                6,
                0,
                0,
                Math.PI * 2
              );
              ctx.fill();

              const severed = new Set<string>();
              if (!player.limbs.leftArm) severed.add('left_arm');
              if (!player.limbs.rightArm) severed.add('right_arm');
              if (!player.limbs.leftLeg) severed.add('left_leg');
              if (!player.limbs.rightLeg) severed.add('legs');

              drawPixelSprite(ctx, player.classId, px, py, tileW, tileH * 2, severed);
            },
          });

          // Enemies (Alive or Slain Corpse for Looting & Devouring)
          for (const enemyInst of room.enemies) {
            if (!visibleCoords.has(`${enemyInst.x},${enemyInst.y}`) && !enemyInst.isFloorBoss) {
              continue;
            }
            const tpl = CONFIG.ENEMIES[enemyInst.templateId];
            if (!tpl) continue;

            if (enemyInst.defeated) {
              entities.push({
                footY: enemyInst.y,
                draw: () => {
                  const px = enemyInst.x * tileW;
                  const py = enemyInst.y * tileH;
                  ctx.fillStyle = 'rgba(125, 18, 18, 0.76)';
                  ctx.beginPath();
                  ctx.ellipse(px + tileW / 2, py + tileH / 2, 19, 11, 0, 0, Math.PI * 2);
                  ctx.fill();
                  const canRaise =
                    (player.skillLevels?.necromancy || 0) >= 1 &&
                    !enemyInst.corpseRaised &&
                    player.party.length < 3;
                  if (!enemyInst.corpseDevoured || !enemyInst.corpseLooted || canRaise) {
                    ctx.fillStyle = !enemyInst.corpseLooted || canRaise ? '#fde047' : '#fca5a5';
                    ctx.font = 'bold 9px "Noto Serif", serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(
                      !enemyInst.corpseLooted || canRaise ? 'Xác Quái [F]' : 'Xác Quái',
                      px + tileW / 2,
                      py + tileH / 2 + 3
                    );
                  }
                },
              });
              continue;
            }

            entities.push({
              footY: enemyInst.y,
              draw: () => {
                // Draw Throne & Floor Chains Set-Dressing behind Vaelis on Floor 1
                if (enemyInst.templateId === 'demon_lord_vaelis') {
                  drawNpcSetDressing(
                    ctx,
                    'demon_lord_vaelis',
                    enemyInst.x,
                    enemyInst.y,
                    tileW,
                    tileH,
                    animTick
                  );
                }

                const isBoss3x = Boolean(enemyInst.isFloorBoss || tpl.spriteScale === '3x3');
                const isMiniBoss2x =
                  !isBoss3x && (tpl.spriteScale === '2x2' || tpl.spriteScale === '2x3');

                const drawW = isBoss3x ? tileW * 3 : isMiniBoss2x ? tileW * 2 : tileW;
                const drawH = isBoss3x ? tileH * 3.2 : isMiniBoss2x ? tileH * 2.5 : tileH * 2;
                const px =
                  enemyInst.x * tileW -
                  (isBoss3x ? tileW * 1.0 : isMiniBoss2x ? tileW * 0.5 : 0);
                const py =
                  (enemyInst.y + 1) * tileH - drawH + (animTick % 3 === 0 ? -2 : 0);

                // Subtle 5-Tile Vision Cone indicator on floor for active patrolling/chasing enemies
                if (!enemyInst.isTutorialGatekeeper && !isBoss3x && enemyInst.facing) {
                  ctx.save();
                  ctx.fillStyle =
                    enemyInst.aiState === 'chase' || enemyInst.aiState === 'alert'
                      ? 'rgba(239, 68, 68, 0.18)'
                      : 'rgba(250, 204, 21, 0.07)';
                  const cx = (enemyInst.x + 0.5) * tileW;
                  const cy = (enemyInst.y + 0.5) * tileH;
                  const ang =
                    enemyInst.facing === 'right'
                      ? 0
                      : enemyInst.facing === 'down'
                      ? Math.PI / 2
                      : enemyInst.facing === 'left'
                      ? Math.PI
                      : -Math.PI / 2;
                  ctx.beginPath();
                  ctx.moveTo(cx, cy);
                  ctx.arc(cx, cy, tileW * 4.8, ang - 0.45, ang + 0.45);
                  ctx.closePath();
                  ctx.fill();
                  ctx.restore();
                }

                // Ground Shadow / Aura under enemy
                ctx.fillStyle = isBoss3x
                  ? 'rgba(153, 27, 27, 0.62)'
                  : 'rgba(120, 15, 15, 0.45)';
                ctx.beginPath();
                ctx.ellipse(
                  enemyInst.x * tileW + tileW / 2,
                  enemyInst.y * tileH + tileH - 4,
                  isBoss3x ? tileW * 1.35 : isMiniBoss2x ? tileW * 0.75 : tileW * 0.38,
                  isBoss3x ? 14 : 8,
                  0,
                  0,
                  Math.PI * 2
                );
                ctx.fill();

                drawPixelSprite(
                  ctx,
                  tpl.spriteKey,
                  px,
                  py,
                  drawW,
                  drawH,
                  new Set(enemyInst.severedLimbs),
                  false,
                  enemyInst.oilCovered,
                  enemyInst.blindTurns > 0,
                  enemyInst.telegraphing,
                  now * 0.003
                );

                // Red '!' Alert / Chase Indicator OR Yellow '?' De-Agro Indicator
                if (enemyInst.aiState === 'alert' || enemyInst.aiState === 'chase') {
                  ctx.save();
                  ctx.fillStyle = 'rgba(15, 5, 8, 0.88)';
                  ctx.fillRect(enemyInst.x * tileW + tileW / 2 - 10, py - 20, 20, 18);
                  ctx.strokeStyle = '#ef4444';
                  ctx.lineWidth = 1.5;
                  ctx.strokeRect(enemyInst.x * tileW + tileW / 2 - 10, py - 20, 20, 18);
                  ctx.fillStyle = '#ef4444';
                  ctx.font = 'bold 14px "Noto Serif", serif';
                  ctx.textAlign = 'center';
                  ctx.fillText('!', enemyInst.x * tileW + tileW / 2, py - 6);
                  ctx.restore();
                } else if (
                  enemyInst.aiState === 'deagro' &&
                  (enemyInst.questionTimerMs || 0) > 0
                ) {
                  ctx.save();
                  ctx.fillStyle = 'rgba(15, 12, 5, 0.88)';
                  ctx.fillRect(enemyInst.x * tileW + tileW / 2 - 10, py - 20, 20, 18);
                  ctx.strokeStyle = '#facc15';
                  ctx.lineWidth = 1.5;
                  ctx.strokeRect(enemyInst.x * tileW + tileW / 2 - 10, py - 20, 20, 18);
                  ctx.fillStyle = '#fef08a';
                  ctx.font = 'bold 14px "Noto Serif", serif';
                  ctx.textAlign = 'center';
                  ctx.fillText('?', enemyInst.x * tileW + tileW / 2, py - 6);
                  ctx.restore();
                }
              },
            });
          }

          entities.sort((a, b) => a.footY - b.footY);
          for (const ent of entities) {
            ent.draw();
          }

          // 3. Bresenham Line-of-Sight Shadowcasting Overlay (pierced by Hexen Altar & Void Rift static point lights)
          for (let y = 0; y < roomH; y++) {
            for (let x = 0; x < roomW; x++) {
              if (!visibleCoords.has(`${x},${y}`)) {
                const nearStaticLight = staticPointLights.some(
                  (pl) => Math.hypot(x - pl.x, y - pl.y) <= 2.2
                );
                ctx.fillStyle = nearStaticLight
                  ? 'rgba(14, 8, 24, 0.52)'
                  : room.isExterior
                  ? 'rgba(6, 8, 10, 0.72)'
                  : 'rgba(3, 2, 6, 0.94)';
                ctx.fillRect(x * tileW, y * tileH, tileW, tileH);
              }
            }
          }

          // Static Point-Light Glows for Hexen Altar & Void Rift
          for (const pl of staticPointLights) {
            const lx = (pl.x + 0.5) * tileW;
            const ly = (pl.y + 0.5) * tileH;
            const pGrad = ctx.createRadialGradient(lx, ly, 6, lx, ly, pl.radius);
            pGrad.addColorStop(0, pl.color);
            pGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.arc(lx, ly, pl.radius, 0, Math.PI * 2);
            ctx.fill();
          }

          // Radial Torchlight / Floor 3 Miasma Mist Vignette centered on interpolated player
          const playerCenterX = (visualPosRef.current.x + 0.5) * tileW;
          const playerCenterY = (visualPosRef.current.y + 0.3) * tileH;
          if (!room.isExterior) {
            const lightRadiusPx = sightRadius * tileW;
            const torchGrad = ctx.createRadialGradient(
              playerCenterX,
              playerCenterY,
              tileW * 1.4,
              playerCenterX,
              playerCenterY,
              lightRadiusPx
            );
            if (room.floor === 3) {
              torchGrad.addColorStop(0, 'rgba(192, 132, 252, 0.08)');
              torchGrad.addColorStop(0.55, 'rgba(18, 9, 32, 0.50)');
              torchGrad.addColorStop(1, 'rgba(4, 2, 8, 0.90)');
            } else {
              torchGrad.addColorStop(0, 'rgba(255, 190, 110, 0.07)');
              torchGrad.addColorStop(0.55, 'rgba(10, 8, 12, 0.46)');
              torchGrad.addColorStop(1, 'rgba(3, 2, 5, 0.88)');
            }
            ctx.fillStyle = torchGrad;
            ctx.fillRect(0, 0, worldPxW, worldPxH);
          }

          // 3A. Drifting Miasma Mist Layer across the dungeon floor
          ctx.save();
          const driftT = now * 0.00035;
          const mistBase =
            room.floor === 3
              ? 'rgba(147, 51, 234, 0.14)'
              : room.floor === 1
              ? 'rgba(153, 27, 27, 0.10)'
              : room.isExterior
              ? 'rgba(120, 113, 108, 0.13)'
              : 'rgba(100, 116, 139, 0.09)';
          for (let m = 0; m < 6; m++) {
            const mx = ((m * 190 + driftT * (28 + m * 6)) % (worldPxW + 240)) - 120;
            const my = ((m * 115 + Math.sin(driftT * 1.4 + m) * 28) % worldPxH);
            const mr = 95 + (m % 3) * 32;
            const mGrad = ctx.createRadialGradient(mx, my, 8, mx, my, mr);
            mGrad.addColorStop(0, mistBase);
            mGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = mGrad;
            ctx.beginPath();
            ctx.arc(mx, my, mr, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // 3B. Secret Chamber Solid #060508 Mask (conceals hidden rooms behind Cracked Walls until blown open)
          const secretMaskSet = new Set<string>(
            !room.secretWallBlown ? room.secretChamberCoords || [] : []
          );
          if (!room.secretWallBlown && secretMaskSet.size > 0) {
            ctx.fillStyle = '#060508';
            for (const coordStr of secretMaskSet) {
              const [sxStr, syStr] = coordStr.split(',');
              const sx = Number(sxStr);
              const sy = Number(syStr);
              if (Number.isFinite(sx) && Number.isFinite(sy)) {
                ctx.fillRect(sx * tileW, sy * tileH, tileW, tileH);
              }
            }
          }

          // 4. Proximity Interaction Highlight & Floating Prompt ([F])
          // Multi-tile landmarks & NPCs support 2-tile radius; single-tile lootables check 1-tile first
          const searchOffsets: Array<[number, number]> = [
            [0, 0],
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [1, 1],
            [-1, 1],
            [1, -1],
            [-1, -1],
            [2, 0],
            [-2, 0],
            [0, 2],
            [0, -2],
            [2, 1],
            [-2, 1],
            [2, -1],
            [-2, -1],
            [1, 2],
            [-1, 2],
            [1, -2],
            [-1, -2],
            [2, 2],
            [-2, 2],
            [2, -2],
            [-2, -2],
          ];
          let drewPrompt = false;
          for (const [dx, dy] of searchOffsets) {
            const ix = playerPos.x + dx;
            const iy = playerPos.y + dy;
            if (ix < 0 || ix >= roomW || iy < 0 || iy >= roomH) continue;
            const cKey = `${ix},${iy}`;
            if (secretMaskSet.has(cKey)) continue;
            const t = room.grid[iy][ix];
            const chebyshev = Math.max(Math.abs(dx), Math.abs(dy));
            const manhattan = Math.abs(dx) + Math.abs(dy);
            const isMultiTileOrNpc =
              t === TILE.HEXEN_ALTAR ||
              t === TILE.RITUAL_CIRCLE ||
              t === TILE.VOID_RIFT ||
              t === TILE.BOOKSHELF ||
              t === TILE.CRACKED_WALL ||
              NPC_TILE_SET.has(t);

            if (!isMultiTileOrNpc && manhattan > 1) continue;
            if (isMultiTileOrNpc && chebyshev > 2) continue;

            let promptLabel: string | null = null;

            if (t === TILE.CRATE && !room.lootedCoords.includes(cKey)) promptLabel = '[F] Lục Thùng';
            else if (t === TILE.HERB && !room.lootedCoords.includes(cKey)) promptLabel = '[F] Hái Thảo Dược';
            else if (t === TILE.CHEST && !room.lootedCoords.includes(cKey)) promptLabel = '[F] Mở Rương';
            else if (t === TILE.BOOKSHELF && !room.lootedCoords.includes(cKey)) promptLabel = '[F] Lục Kệ Sách';
            else if (t === TILE.HEXEN_ALTAR) promptLabel = '[F] Bàn Thờ Hexen';
            else if (t === TILE.BED_SAVE) promptLabel = '[F] Ngủ & Lưu';
            else if (t === TILE.SHORTCUT_GATE && !room.shortcutOpened) promptLabel = '[F] Mở Cổng Tắt';
            else if (t === TILE.NPC_PRIEST) promptLabel = '[F] Giáo Sĩ Mù';
            else if (t === TILE.NPC_SMUGGLER && !player.npcFlags.smugglerClosed) promptLabel = '[F] Mặc Cả';
            else if (t === TILE.NPC_PRISONER && !player.npcFlags.prisonerRecruited) promptLabel = '[F] Cứu Tù Nhân';
            else if (t === TILE.NPC_CHILD_12) promptLabel = '[F] Thánh Tử 12';
            else if (t === TILE.NPC_BROKEN_KNIGHT) promptLabel = '[F] Kỵ Sĩ Gãy Chân';
            else if (t === TILE.NPC_SMITH) promptLabel = '[F] Huyết Rèn';
            else if (t === TILE.NPC_GLASS_LADY) promptLabel = '[F] Lồng Kính';
            else if (t === TILE.NPC_PHYSICIAN) promptLabel = '[F] Lão Thần Y';
            else if (t === TILE.NPC_CHRONICLER) promptLabel = '[F] Kẻ Chép Sử';
            else if (t === TILE.NPC_RECRUIT_KNIGHT && isRecruitNpcActive(t, player, room.lootedCoords.includes(cKey)))
              promptLabel = '[F] Hiệp Sĩ Marcus';
            else if (t === TILE.NPC_RECRUIT_NUN && isRecruitNpcActive(t, player, room.lootedCoords.includes(cKey)))
              promptLabel = '[F] Nữ Tu Elena';
            else if (t === TILE.NPC_RECRUIT_HUNTER && isRecruitNpcActive(t, player, room.lootedCoords.includes(cKey)))
              promptLabel = '[F] Thợ Săn Lyra';
            else if (t === TILE.VOID_RIFT) promptLabel = '[F] Vết Rách & Thánh Tử 13';
            else if (t === TILE.MIASMA_VENT && !room.lootedCoords.includes(cKey))
              promptLabel = '[F] Hấp Thụ Khí';
            else if (t === TILE.RITUAL_CIRCLE && !room.lootedCoords.includes(cKey))
              promptLabel = '[F] Vòng Tròn Tế';
            else if (t === TILE.CORPSE_LOOT && !room.lootedCoords.includes(cKey))
              promptLabel = '[F] Lục Xác Kỵ Sĩ';
            else if (t === TILE.CRACKED_WALL) promptLabel = '[F] Nổ Tường';

            if (promptLabel) {
              const px = ix * tileW;
              const py = iy * tileH;
              ctx.save();
              ctx.strokeStyle = animTick % 2 === 0 ? '#fbbf24' : '#fef08a';
              ctx.lineWidth = 2.5;
              ctx.strokeRect(px + 2, py + 2, tileW - 4, tileH - 4);

              const tagW = 136;
              const tagH = 18;
              const tagX = Math.max(4, Math.min(worldPxW - tagW - 4, px + tileW / 2 - tagW / 2));
              const tagY = Math.max(4, py - 20);
              ctx.fillStyle = 'rgba(12, 9, 16, 0.92)';
              ctx.fillRect(tagX, tagY, tagW, tagH);
              ctx.strokeStyle = '#fbbf24';
              ctx.lineWidth = 1.2;
              ctx.strokeRect(tagX, tagY, tagW, tagH);

              ctx.fillStyle = '#fef08a';
              ctx.font = 'bold 10px "Noto Serif", serif';
              ctx.textAlign = 'center';
              ctx.fillText(promptLabel, tagX + tagW / 2, tagY + 13);
              ctx.restore();
              drewPrompt = true;
              break;
            }
          }

          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [room, player, playerPos, trailCoords, animTick, riftElixirCollected]);

  return (
    <canvas
      ref={canvasRef}
      width={CONFIG.GRID_W * CONFIG.TILE_PX}
      height={CONFIG.GRID_H * CONFIG.TILE_PX}
      className="max-h-full max-w-full w-auto h-auto object-contain cursor-pointer"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const scaleX = e.currentTarget.width / rect.width;
        const scaleY = e.currentTarget.height / rect.height;
        const viewPxX = (e.clientX - rect.left) * scaleX;
        const viewPxY = (e.clientY - rect.top) * scaleY;
        const worldPxX = viewPxX + cameraOffsetRef.current.x;
        const worldPxY = viewPxY + cameraOffsetRef.current.y;
        const tx = Math.floor(worldPxX / CONFIG.TILE_PX);
        const ty = Math.floor(worldPxY / CONFIG.TILE_PX);
        onTileClick(tx, ty);
      }}
    />
  );
};

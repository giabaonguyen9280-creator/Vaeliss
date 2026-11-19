import React, { useEffect, useRef } from 'react';
import { CONFIG } from '../game/config';
import { PlayerState, PartyAlly } from '../game/combat';
import {
  getHerbTypeAtCoord,
  hasLineOfSight,
  herbTypeToVariant,
  isWalkableTile,
  MapEnemyInstance,
  NPC_TILE_SET,
  RoomData,
  TILE,
} from '../game/mapGen';
export { hasLineOfSight, isDetectedByEnemy } from '../game/mapGen';
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
  filmGrainEnabled?: boolean;
  onTileClick: (worldTileX: number, worldTileY: number) => void;
  onEnemyCollidePlayer?: (enemy: MapEnemyInstance) => void;
}

export function getParkedCompanionSpots(
  room: RoomData,
  player: PlayerState
): Array<{ ally: PartyAlly; x: number; y: number }> {
  const dismissed = (player.dismissedCompanions || []).filter((a) => a.hp > 0);
  if (dismissed.length === 0) return [];
  const roomH = room.height || room.grid.length;
  const roomW = room.width || room.grid[0]?.length || 0;
  let altarX = -1;
  let altarY = -1;
  for (let y = 0; y < roomH && altarX === -1; y++) {
    for (let x = 0; x < roomW; x++) {
      if (room.grid[y]?.[x] === TILE.HEXEN_ALTAR) {
        altarX = x;
        altarY = y;
        break;
      }
    }
  }
  if (altarX === -1) return [];

  const candidateOffsets: Array<[number, number]> = [
    [-2, 0],
    [2, 0],
    [0, 2],
    [-1, 1],
    [1, 1],
    [-2, 1],
    [2, 1],
    [-1, 0],
    [1, 0],
    [0, 1],
    [-2, -1],
    [2, -1],
  ];
  const spots: Array<{ ally: PartyAlly; x: number; y: number }> = [];
  const usedKeys = new Set<string>();
  for (const ally of dismissed) {
    for (const [ox, oy] of candidateOffsets) {
      const sx = altarX + ox;
      const sy = altarY + oy;
      if (sx <= 0 || sx >= roomW - 1 || sy <= 0 || sy >= roomH - 1) continue;
      const key = `${sx},${sy}`;
      if (usedKeys.has(key)) continue;
      const tile = room.grid[sy]?.[sx];
      if (!isWalkableTile(tile)) continue;
      if (tile === TILE.FLOOR_TRAP) continue;
      if (room.enemies.some((e) => !e.defeated && e.x === sx && e.y === sy)) continue;
      usedKeys.add(key);
      spots.push({ ally, x: sx, y: sy });
      break;
    }
  }
  return spots;
}

function isNpcTileActive(tile: TILE, player: PlayerState, looted: boolean): boolean {
  const lifecycle = player.npcLifecycle || {};
  if (tile === TILE.NPC_RECRUIT_KNIGHT) {
    if (lifecycle.npc_recruit_knight === 'recruited' || lifecycle.npc_recruit_knight === 'dead') return false;
    return (
      (lifecycle.npc_recruit_knight === 'map' || !looted) &&
      player.classId !== 'fallen_knight' &&
      !player.party.some((a) => a.id === 'fallen_knight')
    );
  }
  if (tile === TILE.NPC_RECRUIT_NUN) {
    if (lifecycle.npc_recruit_nun === 'recruited' || lifecycle.npc_recruit_nun === 'dead') return false;
    return (
      (lifecycle.npc_recruit_nun === 'map' || !looted) &&
      player.classId !== 'forsaken_nun' &&
      !player.party.some((a) => a.id === 'forsaken_nun')
    );
  }
  if (tile === TILE.NPC_RECRUIT_HUNTER) {
    if (lifecycle.npc_recruit_hunter === 'recruited' || lifecycle.npc_recruit_hunter === 'dead') return false;
    return (
      (lifecycle.npc_recruit_hunter === 'map' || !looted) &&
      player.classId !== 'night_hunter' &&
      !player.party.some((a) => a.id === 'night_hunter')
    );
  }
  if (tile === TILE.NPC_PRISONER) {
    if (lifecycle.npc_prisoner === 'recruited' || lifecycle.npc_prisoner === 'dead') return false;
    return !player.npcFlags.prisonerRecruited && !player.party.some((a) => a.id === 'ally_kael');
  }
  if (tile === TILE.NPC_BROKEN_KNIGHT) {
    if (lifecycle.npc_broken_knight === 'recruited' || lifecycle.npc_broken_knight === 'dead') return false;
    return !player.party.some((a) => a.id === 'broken_knight');
  }
  return true;
}

export const DungeonMapViewport: React.FC<DungeonMapViewportProps> = ({
  room,
  player,
  playerPos,
  trailCoords,
  animTick,
  isInteractivePaused,
  riftElixirCollected = false,
  filmGrainEnabled = true,
  onTileClick,
  onEnemyCollidePlayer,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<{
    cacheKey: string;
    canvas: HTMLCanvasElement;
  } | null>(null);
  const grainCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Smoothly interpolated visual coordinates for player & camera
  const visualPosRef = useRef<{ x: number; y: number }>({
    x: playerPos.x,
    y: playerPos.y,
  });
  const prevRoomIdRef = useRef<string>(room.id);
  const cameraOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const triggeredCombatRef = useRef<boolean>(false);
  const onEnemyCollidePlayerRef = useRef(onEnemyCollidePlayer);
  useEffect(() => {
    onEnemyCollidePlayerRef.current = onEnemyCollidePlayer;
  }, [onEnemyCollidePlayer]);

  // Snap visualPos immediately when switching rooms and reset combat trigger lock
  useEffect(() => {
    if (prevRoomIdRef.current !== room.id) {
      prevRoomIdRef.current = room.id;
      visualPosRef.current = { x: playerPos.x, y: playerPos.y };
      triggeredCombatRef.current = false;
    }
  }, [room.id, playerPos.x, playerPos.y]);

  // Trigger combat only if overlapping an enemy or inside a Floor Boss 3x3 aura
  useEffect(() => {
    if (isInteractivePaused || !onEnemyCollidePlayerRef.current) return;

    const threateningEnemy = room.enemies.find((e) => {
      if (e.defeated || e.isTutorialGatekeeper) return false;
      if (e.isFloorBoss) {
        const withinBossFootprint =
          Math.abs(e.x - playerPos.x) <= 1 && Math.abs(e.y - playerPos.y) <= 1;
        return withinBossFootprint && (e.questionTimerMs || 0) <= 0;
      }
      return e.x === playerPos.x && e.y === playerPos.y;
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

                const variantHash =
                  tile === TILE.HERB
                    ? herbTypeToVariant(getHerbTypeAtCoord(room, x, y))
                    : Math.abs(((x * 73 + y * 37) ^ (x * 19)) % 6);
                const floorTex = getFloorTileTexture(
                  room.floor,
                  texTile,
                  variantHash,
                  Boolean(room.isExterior)
                );
                offCtx.drawImage(floorTex, px, py, tileW, tileH);

                // Hard 2.5D Wall Cast Shadows onto adjacent walkable floor tiles
                const isWallTile = tile === TILE.WALL || tile === TILE.CRACKED_WALL || tile === TILE.VOID;
                if (!isWallTile) {
                  const aboveTile = y > 0 ? room.grid[y - 1][x] : null;
                  const leftTile = x > 0 ? room.grid[y][x - 1] : null;
                  if (aboveTile === TILE.WALL || aboveTile === TILE.CRACKED_WALL) {
                    // Crisp hard cast shadow ledge + subtle penumbra
                    offCtx.fillStyle = 'rgba(3, 2, 5, 0.68)';
                    offCtx.fillRect(px, py, tileW, 8);
                    const bGrad = offCtx.createLinearGradient(px, py + 8, px, py + 20);
                    bGrad.addColorStop(0, 'rgba(3, 2, 5, 0.36)');
                    bGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    offCtx.fillStyle = bGrad;
                    offCtx.fillRect(px, py + 8, tileW, 12);
                  }
                  if (leftTile === TILE.WALL || leftTile === TILE.CRACKED_WALL) {
                    offCtx.fillStyle = 'rgba(3, 2, 5, 0.52)';
                    offCtx.fillRect(px, py, 5, tileH);
                    const lGrad = offCtx.createLinearGradient(px + 5, py, px + 14, py);
                    lGrad.addColorStop(0, 'rgba(3, 2, 5, 0.28)');
                    lGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    offCtx.fillStyle = lGrad;
                    offCtx.fillRect(px + 5, py, 9, tileH);
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

          const secretHiddenSet = new Set<string>(
            !room.secretWallBlown ? room.secretChamberCoords || [] : []
          );
          const visibleCoords = new Set<string>();
          const staticPointLights: Array<{
            x: number;
            y: number;
            color: string;
            coreColor?: string;
            radius: number;
            isWallCandle?: boolean;
          }> = [];

          for (let y = 0; y < roomH; y++) {
            for (let x = 0; x < roomW; x++) {
              const coordStr = `${x},${y}`;
              const dist = Math.hypot(x - playerPos.x, y - playerPos.y);
              if (dist <= sightRadius + 0.6 && hasLineOfSight(room.grid, playerPos.x, playerPos.y, x, y)) {
                visibleCoords.add(coordStr);
              }
              const t = room.grid[y][x];
              if (t === TILE.HEXEN_ALTAR) {
                staticPointLights.push({
                  x,
                  y,
                  color: 'rgba(168, 85, 247, 0.36)',
                  coreColor: 'rgba(185, 28, 28, 0.28)',
                  radius: tileW * 3.1,
                });
              } else if (t === TILE.VOID_RIFT) {
                staticPointLights.push({
                  x,
                  y,
                  color: 'rgba(168, 85, 247, 0.42)',
                  coreColor: 'rgba(232, 121, 249, 0.22)',
                  radius: tileW * 3.4,
                });
              } else if (
                !room.isExterior &&
                t === TILE.WALL &&
                !secretHiddenSet.has(coordStr) &&
                y + 1 < roomH &&
                !secretHiddenSet.has(`${x},${y + 1}`) &&
                room.grid[y + 1][x] !== TILE.WALL &&
                room.grid[y + 1][x] !== TILE.CRACKED_WALL &&
                room.grid[y + 1][x] !== TILE.VOID &&
                (x * 31 + y * 17) % 11 === 0
              ) {
                staticPointLights.push({
                  x,
                  y,
                  color: 'rgba(245, 158, 11, 0.24)',
                  coreColor: 'rgba(254, 240, 138, 0.48)',
                  radius: tileW * 2.15,
                  isWallCandle: true,
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
                const cKey = `${x},${y}`;
                const circleMeta = room.ritualCircles?.[cKey];
                const deityType = circleMeta?.deityType || 'uninscribed';
                const isLooted =
                  Boolean(circleMeta?.used) ||
                  (deityType !== 'uninscribed' && room.lootedCoords.includes(cKey));
                drawMultiTileLandmark(
                  ctx,
                  TILE.RITUAL_CIRCLE,
                  x,
                  y,
                  tileW,
                  tileH,
                  animTick,
                  isLooted,
                  isInside,
                  deityType
                );
              }
            }
          }

          // 1C. Placed Bait / Decoys (Mồi Nhử) on floor
          for (const decoy of room.decoys || []) {
            if (decoy.turnsLeft <= 0 || !visibleCoords.has(`${decoy.x},${decoy.y}`)) continue;
            const dpx = decoy.x * tileW + tileW * 0.5;
            const dpy = decoy.y * tileH + tileH * 0.55;
            ctx.save();
            ctx.strokeStyle = animTick % 2 === 0 ? 'rgba(163, 230, 53, 0.55)' : 'rgba(132, 204, 22, 0.3)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(dpx, dpy, tileW * 0.34, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#4d6b3c';
            ctx.strokeStyle = '#070608';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(dpx, dpy, tileW * 0.2, tileH * 0.14, -0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#e5dccb';
            ctx.fillRect(dpx - tileW * 0.22, dpy + 2, 6, 3);

            ctx.fillStyle = '#bef264';
            ctx.font = 'bold 9px "Noto Serif", serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Mồi (${decoy.turnsLeft})`, dpx, decoy.y * tileH + 10);
            ctx.restore();
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
            [TILE.NPC_SMUGGLER]: { sprite: 'npc_smuggler', label: 'Buôn Lậu' },
            [TILE.NPC_PRISONER]: { sprite: 'ally_kael', label: 'Kael (Tù Nhân)' },
            [TILE.NPC_CHILD_12]: { sprite: 'npc_child_12', label: 'Thánh Tử 12' },
            [TILE.NPC_BROKEN_KNIGHT]: { sprite: 'npc_broken_knight', label: 'Kỵ Sĩ Gãy Chân' },
            [TILE.NPC_SMITH]: { sprite: 'npc_smith', label: 'Kẻ Đúc Kiếm' },
            [TILE.NPC_GLASS_LADY]: { sprite: 'npc_glass_lady', label: 'Quý Cô Lồng Kính' },
            [TILE.NPC_PHYSICIAN]: { sprite: 'npc_physician', label: 'Lão Thần Y' },
            [TILE.NPC_CHRONICLER]: { sprite: 'npc_chronicler', label: 'Kẻ Chép Sử' },
            [TILE.NPC_RECRUIT_KNIGHT]: { sprite: 'fallen_knight', label: 'Kẻ Gác Mộ Garrick' },
            [TILE.NPC_RECRUIT_NUN]: { sprite: 'forsaken_nun', label: 'Nữ Tu Oan Khuất Agnes' },
            [TILE.NPC_RECRUIT_HUNTER]: { sprite: 'night_hunter', label: 'Gã Săn Di Vật Crow' },
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
                if (!isNpcTileActive(t, player, room.lootedCoords.includes(cKey))) {
                  continue;
                }
                const px = x * tileW;
                const npcBob = Math.sin(now * 0.0018 + x * 0.9 + y * 0.5) * 1.4;
                const py = (y - 1) * tileH + npcBob;

                entities.push({
                  footY: y,
                  draw: () => {
                    // Draw Canonical Set-Dressing Props behind/around NPC
                    drawNpcSetDressing(ctx, t, x, y, tileW, tileH, animTick);
                    ctx.fillStyle = 'rgba(0,0,0,0.44)';
                    ctx.beginPath();
                    ctx.ellipse(px + tileW / 2, y * tileH + tileH - 6, tileW * 0.34, 5.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    drawPixelSprite(
                      ctx,
                      meta.sprite,
                      px,
                      py,
                      tileW,
                      tileH * 2,
                      new Set(),
                      false,
                      false,
                      false,
                      false,
                      now * 0.0024 + x
                    );
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

          // Parked Dismissed Companions waiting near Hexen Altar
          const parkedCompanions = getParkedCompanionSpots(room, player);
          parkedCompanions.forEach(({ ally, x: cxPos, y: cyPos }, pIdx) => {
            entities.push({
              footY: cyPos,
              draw: () => {
                const px = cxPos * tileW;
                const allyBob = Math.sin(now * 0.0018 + (pIdx + 3) * 1.1) * 1.4;
                const py = (cyPos - 1) * tileH + allyBob;
                ctx.fillStyle = 'rgba(0,0,0,0.42)';
                ctx.beginPath();
                ctx.ellipse(px + tileW / 2, cyPos * tileH + tileH - 6, tileW * 0.31, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                drawPixelSprite(
                  ctx,
                  ally.spriteKey || ally.classId,
                  px,
                  py,
                  tileW,
                  tileH * 2,
                  new Set(),
                  false,
                  false,
                  false,
                  false,
                  now * 0.0022 + pIdx
                );
                ctx.fillStyle = 'rgba(0,0,0,0.82)';
                ctx.fillRect(px - 14, py - 12, tileW + 28, 15);
                ctx.fillStyle = '#c5a059';
                ctx.font = 'bold 11px "Noto Serif", serif';
                ctx.textAlign = 'center';
                ctx.fillText(ally.name, px + tileW / 2, py - 1);
              },
            });
          });

          // Recruited Party Follower(s)
          player.party.forEach((ally, idx) => {
            if (ally.hp <= 0) return;
            const coord = trailCoords[idx] || { x: Math.max(1, playerPos.x - 1), y: playerPos.y };
            entities.push({
              footY: coord.y,
              draw: () => {
                const px = coord.x * tileW;
                const allyBob = Math.sin(now * 0.0018 + (idx + 1) * 1.4) * 1.6;
                const py = (coord.y - 1) * tileH + allyBob;
                ctx.fillStyle = 'rgba(0,0,0,0.42)';
                ctx.beginPath();
                ctx.ellipse(px + tileW / 2, coord.y * tileH + tileH - 6, tileW * 0.31, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                drawPixelSprite(
                  ctx,
                  ally.spriteKey || ally.classId,
                  px,
                  py,
                  tileW,
                  tileH * 2,
                  new Set(),
                  false,
                  false,
                  false,
                  false,
                  now * 0.0024 + idx
                );
              },
            });
          });

          // Player Entity (Smoothly interpolated visualPosRef + smooth ~3.5s idle sine breathing)
          entities.push({
            footY: visualPosRef.current.y,
            draw: () => {
              const px = visualPosRef.current.x * tileW;
              const playerBob = Math.sin(now * 0.0018) * 1.8;
              const py = (visualPosRef.current.y - 1) * tileH + playerBob;
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

              drawPixelSprite(
                ctx,
                player.classId,
                px,
                py,
                tileW,
                tileH * 2,
                severed,
                false,
                false,
                false,
                false,
                now * 0.0024
              );
            },
          });

          // Slain Corpses (removed from active enemies into room.corpses for Looting, Necromancy & Devouring)
          const corpseList = [
            ...(room.corpses || []),
            ...room.enemies.filter((e) => e.defeated),
          ];
          for (const corpseInst of corpseList) {
            if (!visibleCoords.has(`${corpseInst.x},${corpseInst.y}`) && !corpseInst.isFloorBoss) {
              continue;
            }
            entities.push({
              footY: corpseInst.y,
              draw: () => {
                const px = corpseInst.x * tileW;
                const py = corpseInst.y * tileH;
                ctx.fillStyle = 'rgba(125, 18, 18, 0.76)';
                ctx.beginPath();
                ctx.ellipse(px + tileW / 2, py + tileH / 2, 19, 11, 0, 0, Math.PI * 2);
                ctx.fill();
                const isNearPlayer =
                  Math.abs(corpseInst.x - playerPos.x) + Math.abs(corpseInst.y - playerPos.y) <= 1;
                const canRaise =
                  (player.skillLevels?.necromancy || 0) >= 1 &&
                  !corpseInst.corpseRaised &&
                  player.party.length < 3;
                if (!isNearPlayer && (!corpseInst.corpseDevoured || !corpseInst.corpseLooted || canRaise)) {
                  ctx.fillStyle = !corpseInst.corpseLooted || canRaise ? '#fde047' : '#fca5a5';
                  ctx.font = 'bold 9px "Noto Serif", serif';
                  ctx.textAlign = 'center';
                  ctx.fillText('Xác Quái', px + tileW / 2, py + tileH / 2 + 3);
                }
              },
            });
          }

          // Active Living Enemies
          for (const enemyInst of room.enemies) {
            if (enemyInst.defeated) continue;
            if (!visibleCoords.has(`${enemyInst.x},${enemyInst.y}`) && !enemyInst.isFloorBoss) {
              continue;
            }
            const tpl = CONFIG.ENEMIES[enemyInst.templateId];
            if (!tpl) continue;

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
                const enemyBob = Math.sin(now * 0.0018 + enemyInst.x * 0.7 + enemyInst.y) * 1.7;
                const py = (enemyInst.y + 1) * tileH - drawH + enemyBob;

                // Subtle 3-Tile Vision Cone indicator on floor for active patrolling/chasing enemies
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
                  ctx.arc(cx, cy, tileW * 3.0, ang - 0.45, ang + 0.45);
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

          // Static Point-Light Glows for Hexen Altar, Void Rift & Flickering Wall Candles
          for (const pl of staticPointLights) {
            const flicker = pl.isWallCandle
              ? 0.86 + Math.sin(now * 0.011 + pl.x * 3.1 + pl.y * 1.7) * 0.14
              : 0.90 + Math.sin(now * 0.0032 + pl.x) * 0.10;
            const lx = (pl.x + 0.5) * tileW;
            const ly = (pl.isWallCandle ? pl.y + 0.85 : pl.y + 0.5) * tileH;
            const rad = pl.radius * flicker;

            if (pl.isWallCandle) {
              // Render wall sconce & flickering flame on front masonry face
              if (visibleCoords.has(`${pl.x},${pl.y + 1}`) || visibleCoords.has(`${pl.x},${pl.y}`)) {
                ctx.fillStyle = '#475569';
                ctx.fillRect(lx - 3, pl.y * tileH + 34, 6, 6);
                ctx.fillStyle = '#e5dccb';
                ctx.fillRect(lx - 1.5, pl.y * tileH + 29, 3, 6);
                ctx.fillStyle = flicker > 0.9 ? '#fef08a' : '#f59e0b';
                ctx.beginPath();
                ctx.arc(lx, pl.y * tileH + 27, 2.6 * flicker, 0, Math.PI * 2);
                ctx.fill();
              }
            }

            const pGrad = ctx.createRadialGradient(lx, ly, 4, lx, ly, rad);
            if (pl.coreColor) {
              pGrad.addColorStop(0, pl.coreColor);
              pGrad.addColorStop(0.38, pl.color);
            } else {
              pGrad.addColorStop(0, pl.color);
            }
            pGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.arc(lx, ly, rad, 0, Math.PI * 2);
            ctx.fill();
          }

          // Flickering Storm-Lantern / Torchlight & Deep Darkness Vignette centered on interpolated player
          const playerCenterX = (visualPosRef.current.x + 0.5) * tileW;
          const playerCenterY = (visualPosRef.current.y + 0.3) * tileH;
          if (!room.isExterior) {
            const lanternFlicker = 1 + Math.sin(now * 0.0085) * 0.03 + Math.sin(now * 0.021) * 0.015;
            const lightRadiusPx = sightRadius * tileW * lanternFlicker;
            const torchGrad = ctx.createRadialGradient(
              playerCenterX,
              playerCenterY,
              tileW * 1.15,
              playerCenterX,
              playerCenterY,
              lightRadiusPx
            );
            if (room.floor === 3) {
              torchGrad.addColorStop(0, 'rgba(192, 132, 252, 0.10)');
              torchGrad.addColorStop(0.45, 'rgba(18, 9, 32, 0.44)');
              torchGrad.addColorStop(0.82, 'rgba(7, 4, 14, 0.86)');
              torchGrad.addColorStop(1, 'rgba(3, 2, 6, 0.96)');
            } else {
              torchGrad.addColorStop(0, hasTorchOrLamp ? 'rgba(255, 198, 120, 0.11)' : 'rgba(245, 175, 105, 0.07)');
              torchGrad.addColorStop(0.42, 'rgba(12, 9, 14, 0.38)');
              torchGrad.addColorStop(0.8, 'rgba(5, 4, 8, 0.84)');
              torchGrad.addColorStop(1, 'rgba(3, 2, 5, 0.95)');
            }
            ctx.fillStyle = torchGrad;
            ctx.fillRect(0, 0, worldPxW, worldPxH);
          }

          // 3A. Continuous Pale Light-Gray Drifting Mist Layers across the Exploration Viewport
          ctx.save();
          const mistSec = now * 0.001;
          const mistStrength = room.isExterior ? 1.15 : room.floor === 3 ? 1.05 : 1.0;

          // Layer 1: Wide drifting pale light-gray fog banks (layered radial clouds)
          const wrapW = worldPxW + 360;
          const wrapH = worldPxH + 220;
          for (let m = 0; m < 10; m++) {
            const speedX = 14 + (m % 4) * 5;
            const speedY = (m % 2 === 0 ? 1 : -1) * (3.5 + (m % 3) * 1.5);
            const rawX = m * 173 + mistSec * speedX;
            const rawY = m * 119 + mistSec * speedY + Math.sin(mistSec * 0.45 + m * 1.3) * 26;
            const mx = ((rawX % wrapW) + wrapW) % wrapW - 180;
            const my = ((rawY % wrapH) + wrapH) % wrapH - 110;
            const mr = 115 + (m % 3) * 42;
            const alphaCenter = (0.11 + (m % 3) * 0.025) * mistStrength;
            const alphaMid = (0.045 + (m % 2) * 0.015) * mistStrength;

            const mGrad = ctx.createRadialGradient(mx, my, 10, mx, my, mr);
            mGrad.addColorStop(0, `rgba(214, 220, 228, ${alphaCenter.toFixed(3)})`);
            mGrad.addColorStop(0.55, `rgba(182, 190, 200, ${alphaMid.toFixed(3)})`);
            mGrad.addColorStop(1, 'rgba(148, 158, 170, 0)');
            ctx.fillStyle = mGrad;
            ctx.beginPath();
            ctx.arc(mx, my, mr, 0, Math.PI * 2);
            ctx.fill();
          }

          // Layer 2: Horizontal elongated low-hanging pale-gray mist ribbons drifting steadily
          for (let b = 0; b < 5; b++) {
            const dir = b % 2 === 0 ? 1 : -1;
            const bandSpanW = worldPxW + 420;
            const bxRaw = b * 230 + mistSec * dir * (18 + b * 4);
            const bx = ((bxRaw % bandSpanW) + bandSpanW) % bandSpanW - 210;
            const by = ((b + 0.5) / 5) * worldPxH + Math.cos(mistSec * 0.55 + b) * 18;
            const rw = 190 + (b % 2) * 55;
            const rh = 58 + (b % 3) * 14;

            ctx.save();
            ctx.translate(bx, by);
            ctx.scale(1, rh / rw);
            const ribbonGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, rw);
            ribbonGrad.addColorStop(0, `rgba(222, 227, 234, ${(0.095 * mistStrength).toFixed(3)})`);
            ribbonGrad.addColorStop(0.6, `rgba(190, 198, 208, ${(0.04 * mistStrength).toFixed(3)})`);
            ribbonGrad.addColorStop(1, 'rgba(160, 168, 178, 0)');
            ctx.fillStyle = ribbonGrad;
            ctx.beginPath();
            ctx.arc(0, 0, rw, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // Layer 3: Subtle floating pale-gray ash/mist motes
          for (let p = 0; p < 16; p++) {
            const pxRaw = p * 97 + mistSec * (12 + (p % 5) * 3.5);
            const pyRaw = p * 67 - mistSec * (4 + (p % 3) * 2) + Math.sin(mistSec * 0.9 + p) * 14;
            const px = ((pxRaw % worldPxW) + worldPxW) % worldPxW;
            const py = ((pyRaw % worldPxH) + worldPxH) % worldPxH;
            const pr = 1.4 + (p % 3) * 0.7;
            const pAlpha = 0.22 + 0.14 * Math.sin(mistSec * 1.4 + p * 0.8);
            ctx.fillStyle = `rgba(218, 224, 232, ${Math.max(0.08, pAlpha).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(px, py, pr, 0, Math.PI * 2);
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

          // 4. Proximity Interaction Highlight & Floating Prompt ([F]) — Manhattan distance <= 1
          const searchOffsets: Array<[number, number]> = [
            [0, 0],
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ];
          let drewPrompt = false;
          for (const [dx, dy] of searchOffsets) {
            if (Math.abs(dx) + Math.abs(dy) > 1) continue;
            const ix = playerPos.x + dx;
            const iy = playerPos.y + dy;
            if (ix < 0 || ix >= roomW || iy < 0 || iy >= roomH) continue;
            const cKey = `${ix},${iy}`;
            if (secretMaskSet.has(cKey)) continue;
            const t = room.grid[iy][ix];
            const interactableCorpse = corpseList.find(
              (c) =>
                c.x === ix &&
                c.y === iy &&
                (!c.corpseLooted ||
                  !c.corpseDevoured ||
                  ((player.skillLevels?.necromancy || 0) >= 1 && !c.corpseRaised && player.party.length < 3))
            );

            let promptLabel: string | null = null;

            if (interactableCorpse) {
              promptLabel = !interactableCorpse.corpseLooted ? '[F] Lục Xác Quái' : '[F] Xác Quái';
            }
            else if (t === TILE.CRATE && !room.lootedCoords.includes(cKey)) promptLabel = '[F] Lục Thùng';
            else if (t === TILE.HERB && !room.lootedCoords.includes(cKey)) {
              const ht = getHerbTypeAtCoord(room, ix, iy);
              promptLabel =
                ht === 'red_herb'
                  ? '[F] Hái Thảo Dược Đỏ'
                  : ht === 'white_herb'
                  ? '[F] Hái Thảo Dược Trắng'
                  : ht === 'calm_flower'
                  ? '[F] Hái Hoa Tĩnh Tâm'
                  : '[F] Hái Thảo Dược Xanh';
            }
            else if (t === TILE.CHEST && !room.lootedCoords.includes(cKey)) promptLabel = '[F] Mở Rương';
            else if (t === TILE.BOOKSHELF && !room.lootedCoords.includes(cKey)) promptLabel = '[F] Lục Kệ Sách';
            else if (t === TILE.HEXEN_ALTAR) promptLabel = '[F] Đài Cộng Hưởng';
            else if (t === TILE.BED_SAVE) promptLabel = '[F] Ngủ & Lưu';
            else if (t === TILE.SHORTCUT_GATE && !room.shortcutOpened) promptLabel = '[F] Mở Cổng Tắt';
            else if (t === TILE.NPC_PRIEST) promptLabel = '[F] Giáo Sĩ Mù';
            else if (t === TILE.NPC_SMUGGLER && !player.npcFlags.smugglerClosed) promptLabel = '[F] Mặc Cả';
            else if (t === TILE.NPC_PRISONER && isNpcTileActive(t, player, false)) promptLabel = '[F] Cứu Tù Nhân';
            else if (t === TILE.NPC_CHILD_12) promptLabel = '[F] Thánh Tử 12';
            else if (t === TILE.NPC_BROKEN_KNIGHT && isNpcTileActive(t, player, false)) promptLabel = '[F] Kỵ Sĩ Gãy Chân';
            else if (t === TILE.NPC_SMITH) promptLabel = '[F] Huyết Rèn';
            else if (t === TILE.NPC_GLASS_LADY) promptLabel = '[F] Lồng Kính';
            else if (t === TILE.NPC_PHYSICIAN) promptLabel = '[F] Lão Thần Y';
            else if (t === TILE.NPC_CHRONICLER) promptLabel = '[F] Kẻ Chép Sử';
            else if (t === TILE.NPC_RECRUIT_KNIGHT && isNpcTileActive(t, player, room.lootedCoords.includes(cKey)))
              promptLabel = '[F] Kẻ Gác Mộ Garrick';
            else if (t === TILE.NPC_RECRUIT_NUN && isNpcTileActive(t, player, room.lootedCoords.includes(cKey)))
              promptLabel = '[F] Nữ Tu Oan Khuất Agnes';
            else if (t === TILE.NPC_RECRUIT_HUNTER && isNpcTileActive(t, player, room.lootedCoords.includes(cKey)))
              promptLabel = '[F] Gã Săn Di Vật Crow';
            else if (t === TILE.VOID_RIFT) promptLabel = '[F] Vết Rách & Thánh Tử 13';
            else if (t === TILE.MIASMA_VENT && !room.lootedCoords.includes(cKey))
              promptLabel = '[F] Hấp Thụ Khí';
            else if (t === TILE.RITUAL_CIRCLE) {
              const cMeta = room.ritualCircles?.[cKey];
              const dType = cMeta?.deityType || 'uninscribed';
              if (!cMeta?.used && (dType === 'uninscribed' || !room.lootedCoords.includes(cKey))) {
                promptLabel =
                  dType === 'holy_mother'
                    ? '[F] Đàn Thánh Mẫu'
                    : dType === 'demon_lord'
                    ? '[F] Đàn Huyết Tế'
                    : dType === 'void_god'
                    ? '[F] Đàn Hư Vô'
                    : '[F] Vòng Tròn Cổ';
              }
            }
            else if (t === TILE.CORPSE_LOOT && !room.lootedCoords.includes(cKey))
              promptLabel = '[F] Lục Xác Kỵ Sĩ';
            else if (t === TILE.CRACKED_WALL) promptLabel = '[F] Nổ Tường';
            else {
              const parkedHere = parkedCompanions.find((p) => p.x === ix && p.y === iy);
              if (parkedHere) {
                promptLabel = `[F] Gọi Lại ${parkedHere.ally.name}`;
              }
            }

            if (promptLabel) {
              const px = ix * tileW;
              const py = iy * tileH;
              ctx.save();
              ctx.strokeStyle = animTick % 2 === 0 ? '#fbbf24' : '#fef08a';
              ctx.lineWidth = 2.5;
              ctx.strokeRect(px + 2, py + 2, tileW - 4, tileH - 4);

              const tagW = 176;
              const tagH = 22;
              const tagX = Math.max(4, Math.min(worldPxW - tagW - 4, px + tileW / 2 - tagW / 2));
              const tagY = Math.max(4, py - 24);
              ctx.fillStyle = 'rgba(12, 9, 16, 0.94)';
              ctx.fillRect(tagX, tagY, tagW, tagH);
              ctx.strokeStyle = '#fbbf24';
              ctx.lineWidth = 1.3;
              ctx.strokeRect(tagX, tagY, tagW, tagH);

              ctx.fillStyle = '#fef08a';
              ctx.font = 'bold 12px "Noto Serif", serif';
              ctx.textAlign = 'center';
              ctx.fillText(promptLabel, tagX + tagW / 2, tagY + 15);
              ctx.restore();
              drewPrompt = true;
              break;
            }
          }

          ctx.restore();

          // 5. Subtle Cached Film-Grain Texture Overlay matching Dark Fantasy UI
          if (filmGrainEnabled) {
            if (!grainCanvasRef.current) {
              const gCanvas = document.createElement('canvas');
              gCanvas.width = 128;
              gCanvas.height = 128;
              const gCtx = gCanvas.getContext('2d')!;
              const imgData = gCtx.createImageData(128, 128);
              const data = imgData.data;
              let seedVal = 1337;
              for (let i = 0; i < data.length; i += 4) {
                seedVal = (seedVal * 1664525 + 1013904223) >>> 0;
                const shade = (seedVal >>> 24) & 255;
                data[i] = shade;
                data[i + 1] = shade;
                data[i + 2] = shade;
                data[i + 3] = 10; // Ultra-thin film grain (~3.9% alpha)
              }
              gCtx.putImageData(imgData, 0, 0);
              grainCanvasRef.current = gCanvas;
            }
            const gPat = ctx.createPattern(grainCanvasRef.current, 'repeat');
            if (gPat) {
              ctx.save();
              ctx.fillStyle = gPat;
              ctx.fillRect(0, 0, viewW, viewH);
              ctx.restore();
            }
          }
        }
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [room, player, playerPos, trailCoords, animTick, riftElixirCollected, filmGrainEnabled]);

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

import React, { useEffect, useRef } from 'react';
import { CONFIG } from '../game/config';
import { PlayerState, PartyAlly, buildAltarKey } from '../game/combat';
import {
  getHerbTypeAtCoord,
  hasLineOfSight,
  herbTypeToVariant,
  isWalkableTile,
  MapEnemyInstance,
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
import { SeededRNG } from '../game/prng';

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

export function findSafeCompanionParkTile(
  room: RoomData | undefined,
  origin: { x: number; y: number },
  existingDismissed: PartyAlly[] = []
): { x: number; y: number } {
  if (!room) return { x: origin.x, y: origin.y };
  const roomH = room.height || room.grid.length;
  const roomW = room.width || room.grid[0]?.length || 0;
  const occupied = new Set<string>();
  for (const e of room.enemies) {
    if (!e.defeated) occupied.add(`${e.x},${e.y}`);
  }
  for (const dc of existingDismissed) {
    if (dc.hp > 0 && dc.parkedLocation?.roomId === room.id) {
      occupied.add(`${dc.parkedLocation.x},${dc.parkedLocation.y}`);
    }
  }
  const offsets: Array<[number, number]> = [
    [-1, 0],
    [1, 0],
    [0, 1],
    [0, -1],
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
    [0, 0],
  ];
  for (const [dx, dy] of offsets) {
    const nx = origin.x + dx;
    const ny = origin.y + dy;
    if (nx <= 0 || nx >= roomW - 1 || ny <= 0 || ny >= roomH - 1) continue;
    const key = `${nx},${ny}`;
    if (occupied.has(key)) continue;
    const tile = room.grid[ny]?.[nx];
    if (!isWalkableTile(tile, room.shortcutOpened)) continue;
    if (tile === TILE.FLOOR_TRAP || tile === TILE.MIASMA_VENT) continue;
    return { x: nx, y: ny };
  }
  return { x: origin.x, y: origin.y };
}

export function getParkedCompanionSpots(
  room: RoomData,
  player: PlayerState
): Array<{ ally: PartyAlly; x: number; y: number }> {
  const dismissed = (player.dismissedCompanions || []).filter((a) => a.hp > 0);
  if (dismissed.length === 0) return [];
  const roomH = room.height || room.grid.length;
  const roomW = room.width || room.grid[0]?.length || 0;
  const spots: Array<{ ally: PartyAlly; x: number; y: number }> = [];
  const usedKeys = new Set<string>();

  // 1. Render dismissed companions pinned to their exact parkedLocation in this room
  const legacyUnpinned: PartyAlly[] = [];
  for (const ally of dismissed) {
    if (ally.parkedLocation) {
      if (ally.parkedLocation.roomId !== room.id) continue;
      const sx = Math.max(1, Math.min(roomW - 2, ally.parkedLocation.x));
      const sy = Math.max(1, Math.min(roomH - 2, ally.parkedLocation.y));
      const key = `${sx},${sy}`;
      if (!usedKeys.has(key) && isWalkableTile(room.grid[sy]?.[sx], room.shortcutOpened)) {
        usedKeys.add(key);
        spots.push({ ally, x: sx, y: sy });
      } else {
        const fallback = findSafeCompanionParkTile(room, { x: sx, y: sy }, []);
        usedKeys.add(`${fallback.x},${fallback.y}`);
        spots.push({ ally, x: fallback.x, y: fallback.y });
      }
    } else {
      legacyUnpinned.push(ally);
    }
  }

  // 2. Legacy fallback for older saves without parkedLocation: place near HEXEN_ALTAR
  if (legacyUnpinned.length === 0) return spots;
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
  if (altarX === -1) return spots;

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
  for (const ally of legacyUnpinned) {
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
  const parkedIds = new Set((player.dismissedCompanions || []).filter((a) => a.hp > 0).map((a) => a.id));
  if (tile === TILE.NPC_RECRUIT_KNIGHT) {
    if (lifecycle.npc_recruit_knight === 'recruited' || lifecycle.npc_recruit_knight === 'dead') return false;
    if (parkedIds.has('fallen_knight')) return false;
    return (
      (lifecycle.npc_recruit_knight === 'map' || !looted) &&
      player.classId !== 'fallen_knight' &&
      !player.party.some((a) => a.id === 'fallen_knight')
    );
  }
  if (tile === TILE.NPC_RECRUIT_NUN) {
    if (lifecycle.npc_recruit_nun === 'recruited' || lifecycle.npc_recruit_nun === 'dead') return false;
    if (parkedIds.has('forsaken_nun')) return false;
    return (
      (lifecycle.npc_recruit_nun === 'map' || !looted) &&
      player.classId !== 'forsaken_nun' &&
      !player.party.some((a) => a.id === 'forsaken_nun')
    );
  }
  if (tile === TILE.NPC_RECRUIT_HUNTER) {
    if (lifecycle.npc_recruit_hunter === 'recruited' || lifecycle.npc_recruit_hunter === 'dead') return false;
    if (parkedIds.has('night_hunter')) return false;
    return (
      (lifecycle.npc_recruit_hunter === 'map' || !looted) &&
      player.classId !== 'night_hunter' &&
      !player.party.some((a) => a.id === 'night_hunter')
    );
  }
  if (tile === TILE.NPC_PRISONER) {
    if (lifecycle.npc_prisoner === 'recruited' || lifecycle.npc_prisoner === 'dead') return false;
    if (parkedIds.has('ally_kael')) return false;
    return !player.npcFlags.prisonerRecruited && !player.party.some((a) => a.id === 'ally_kael');
  }
  if (tile === TILE.NPC_BROKEN_KNIGHT) {
    if (lifecycle.npc_broken_knight === 'recruited' || lifecycle.npc_broken_knight === 'dead') return false;
    if (parkedIds.has('broken_knight')) return false;
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<{
    cacheKey: string;
    canvas: HTMLCanvasElement;
  } | null>(null);
  const grainCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ResizeObserver: force <canvas> to cover 100% of the antique bronze viewport with zero black letterbox margins
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const syncCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      const targetW = Math.max(320, Math.floor(rect.width));
      const targetH = Math.max(240, Math.floor(rect.height));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    syncCanvasSize();
    const rafInit = requestAnimationFrame(syncCanvasSize);
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        syncCanvasSize();
      });
      ro.observe(container);
      return () => {
        cancelAnimationFrame(rafInit);
        ro.disconnect();
      };
    }
    window.addEventListener('resize', syncCanvasSize);
    return () => {
      cancelAnimationFrame(rafInit);
      window.removeEventListener('resize', syncCanvasSize);
    };
  }, []);

  // Smoothly interpolated visual coordinates for player & camera
  const visualPosRef = useRef<{ x: number; y: number }>({
    x: playerPos.x,
    y: playerPos.y,
  });
  const prevRoomIdRef = useRef<string>(room.id);
  const cameraOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const alertStartMapRef = useRef<Record<string, number>>({});
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



  const renderStateRef = useRef({
    room,
    player,
    playerPos,
    trailCoords,
    animTick,
    riftElixirCollected,
    filmGrainEnabled,
  });
  renderStateRef.current = {
    room,
    player,
    playerPos,
    trailCoords,
    animTick,
    riftElixirCollected,
    filmGrainEnabled,
  };

  // Smooth Delta-Time Render Loop with Offscreen Static Layer + Camera Translation + Bresenham LOS
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const renderFrame = (now: number) => {
      const {
        room,
        player,
        playerPos,
        trailCoords,
        animTick,
        riftElixirCollected,
        filmGrainEnabled,
      } = renderStateRef.current;
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
          const hasBloodThrone = room.grid.some((row) => row.includes(TILE.BLOOD_THRONE));
          const cacheKey = `${room.id}_${roomW}x${roomH}_${room.secretWallBlown}_${room.shortcutOpened}_${hasBloodThrone}_${room.lootedCoords.join('|')}`;
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

                // Multi-tile landmarks render dynamically over clean stone floor
                const texTile =
                  tile === TILE.HEXEN_ALTAR ||
                  tile === TILE.RITUAL_CIRCLE ||
                  tile === TILE.BOOKSHELF ||
                  tile === TILE.VOID_RIFT ||
                  tile === TILE.BLOOD_THRONE
                    ? TILE.FLOOR
                    : tile;

                const variantHash =
                  tile === TILE.HERB
                    ? herbTypeToVariant(getHerbTypeAtCoord(room, x, y))
                    : new SeededRNG(`tile_${room.id}_${x}_${y}`).int(0, 19);
                const floorTex = getFloorTileTexture(
                  room.floor,
                  texTile,
                  variantHash,
                  Boolean(room.isExterior)
                );
                offCtx.drawImage(floorTex, px, py, tileW, tileH);

                // Soft contact shadow directly underneath crates & chests so props feel grounded
                if (tile === TILE.CRATE || tile === TILE.CHEST) {
                  offCtx.fillStyle = 'rgba(0, 0, 0, 0.58)';
                  offCtx.beginPath();
                  offCtx.ellipse(px + tileW * 0.5, py + tileH * 0.80, tileW * 0.36, 6, 0, 0, Math.PI * 2);
                  offCtx.fill();
                }
              }
            }

            // Seamless Continuous Royal Crimson Carpet Runner down the Throne Room (F1_R3) central axis
            if (room.id === 'F1_R3') {
              const midY = Math.floor(roomH / 2);
              const startX = 2;
              const endX = Math.max(startX + 2, roomW - 4);
              const carpetTopPx = (midY - 1) * tileH + 10;
              const carpetHeightPx = tileH * 3 - 20;
              const carpetLeftPx = startX * tileW + 4;
              const carpetWidthPx = (endX - startX + 1) * tileW - 8;

              offCtx.save();
              // Clip to walkable central strip so carpet never paints over walls
              const carpetGrad = offCtx.createLinearGradient(0, carpetTopPx, 0, carpetTopPx + carpetHeightPx);
              carpetGrad.addColorStop(0, '#420a10');
              carpetGrad.addColorStop(0.18, '#6e141d');
              carpetGrad.addColorStop(0.5, '#7f1d1d');
              carpetGrad.addColorStop(0.82, '#6e141d');
              carpetGrad.addColorStop(1, '#420a10');
              offCtx.fillStyle = carpetGrad;
              offCtx.fillRect(carpetLeftPx, carpetTopPx, carpetWidthPx, carpetHeightPx);

              // Seamless Royal Gold Thread Trim Borders (top & bottom edges + inner hairline)
              offCtx.strokeStyle = '#ca8a04';
              offCtx.lineWidth = 2.4;
              offCtx.strokeRect(carpetLeftPx + 2, carpetTopPx + 4, carpetWidthPx - 4, carpetHeightPx - 8);
              offCtx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
              offCtx.lineWidth = 1;
              offCtx.strokeRect(carpetLeftPx + 6, carpetTopPx + 9, carpetWidthPx - 12, carpetHeightPx - 18);

              // Subtle woven gothic diamond runner pattern
              offCtx.strokeStyle = 'rgba(202, 138, 4, 0.22)';
              offCtx.lineWidth = 1.2;
              for (let rx = carpetLeftPx + 28; rx < carpetLeftPx + carpetWidthPx - 24; rx += 48) {
                const ry = carpetTopPx + carpetHeightPx * 0.5;
                offCtx.beginPath();
                offCtx.moveTo(rx, ry - 18);
                offCtx.lineTo(rx + 18, ry);
                offCtx.lineTo(rx, ry + 18);
                offCtx.lineTo(rx - 18, ry);
                offCtx.closePath();
                offCtx.stroke();
              }
              offCtx.restore();
            }

            // Second Pass: Hard 6px 2.5D Wall Cast Shadows onto adjacent floor tiles + looted prop dimmers
            for (let y = 0; y < roomH; y++) {
              for (let x = 0; x < roomW; x++) {
                const tile = room.grid[y][x];
                const px = x * tileW;
                const py = y * tileH;
                const coordKey = `${x},${y}`;

                const isWallTile = tile === TILE.WALL || tile === TILE.CRACKED_WALL || tile === TILE.VOID;
                if (!isWallTile) {
                  const aboveTile = y > 0 ? room.grid[y - 1][x] : null;
                  const leftTile = x > 0 ? room.grid[y][x - 1] : null;
                  if (aboveTile === TILE.WALL || aboveTile === TILE.CRACKED_WALL) {
                    // Crisp 6px hard cast shadow directly beneath wall base + subtle soft penumbra
                    offCtx.fillStyle = 'rgba(3, 2, 5, 0.86)';
                    offCtx.fillRect(px, py, tileW, 6);
                    const bGrad = offCtx.createLinearGradient(px, py + 6, px, py + 16);
                    bGrad.addColorStop(0, 'rgba(3, 2, 5, 0.42)');
                    bGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    offCtx.fillStyle = bGrad;
                    offCtx.fillRect(px, py + 6, tileW, 10);
                  }
                  if (leftTile === TILE.WALL || leftTile === TILE.CRACKED_WALL) {
                    offCtx.fillStyle = 'rgba(3, 2, 5, 0.72)';
                    offCtx.fillRect(px, py, 6, tileH);
                    const lGrad = offCtx.createLinearGradient(px + 6, py, px + 14, py);
                    lGrad.addColorStop(0, 'rgba(3, 2, 5, 0.28)');
                    lGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    offCtx.fillStyle = lGrad;
                    offCtx.fillRect(px + 6, py, 8, tileH);
                  }
                }

                if (
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
          // If the room is smaller than the full-bleed 16:9 viewport, center it cleanly inside tiled dungeon stone
          const targetCamX = (visualPosRef.current.x + 0.5) * tileW - viewW / 2;
          const targetCamY = (visualPosRef.current.y + 0.5) * tileH - viewH / 2;
          const camX =
            worldPxW > viewW
              ? Math.max(0, Math.min(worldPxW - viewW, targetCamX))
              : Math.round(-(viewW - worldPxW) / 2);
          const camY =
            worldPxH > viewH
              ? Math.max(0, Math.min(worldPxH - viewH, targetCamY))
              : Math.round(-(viewH - worldPxH) / 2);
          cameraOffsetRef.current = { x: camX, y: camY };

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.fillStyle = room.isExterior ? '#070a0e' : '#050408';
          ctx.fillRect(0, 0, viewW, viewH);

          // Seamless outer stone masonry fill if viewport exceeds room bounds (eliminates flat black borders)
          if (worldPxW < viewW || worldPxH < viewH) {
            const outerTex = getFloorTileTexture(
              room.floor,
              room.isExterior ? TILE.WALL : TILE.VOID,
              0,
              Boolean(room.isExterior)
            );
            const startTileX = Math.floor(camX / tileW) - 1;
            const endTileX = Math.ceil((camX + viewW) / tileW) + 1;
            const startTileY = Math.floor(camY / tileH) - 1;
            const endTileY = Math.ceil((camY + viewH) / tileH) + 1;
            ctx.save();
            ctx.translate(-camX, -camY);
            for (let ty = startTileY; ty <= endTileY; ty++) {
              for (let tx = startTileX; tx <= endTileX; tx++) {
                if (tx >= 0 && tx < roomW && ty >= 0 && ty < roomH) continue;
                ctx.drawImage(outerTex, tx * tileW, ty * tileH, tileW, tileH);
              }
            }
            ctx.restore();
          }

          ctx.save();
          ctx.translate(-camX, -camY);

          // 1. Blit Cached Static Tile Layer
          ctx.drawImage(offscreenRef.current.canvas, 0, 0);

          // Compute Bresenham Line-of-Sight Visibility Set driven by Dynamic Torchlight (torchTimer)
          const torchTimer = Math.max(0, player.torchTimer ?? 0);
          const torchMax = Math.max(1, player.torchMaxTimer ?? 120);
          const torchRatio = Math.max(0, Math.min(1, torchTimer / torchMax));
          const isTorchLit = torchTimer > 0;
          const isTorchLow = isTorchLit && torchRatio < 0.3;
          const baseIndoorRadius = room.floor === 3 ? 6.8 : 8.6;
          const sightRadius = room.isExterior
            ? 11
            : !isTorchLit
            ? 1.85
            : isTorchLow
            ? 2.3 + (torchRatio / 0.3) * (baseIndoorRadius - 2.3)
            : baseIndoorRadius;

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
              } else if (t === TILE.BLOOD_THRONE) {
                staticPointLights.push({
                  x,
                  y,
                  color: 'rgba(153, 27, 27, 0.36)',
                  coreColor: 'rgba(220, 38, 38, 0.24)',
                  radius: tileW * 3.0,
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
                  (player.usedAltarKeys || []).includes(buildAltarKey(room.id, x, y)) ||
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

          // 1D. Slain Corpses & Floor Blood Pools (drawn below all standing entities so characters never get obscured)
          const corpseList = [
            ...(room.corpses || []),
            ...room.enemies.filter((e) => e.defeated),
          ];
          for (const corpseInst of corpseList) {
            if (!visibleCoords.has(`${corpseInst.x},${corpseInst.y}`) && !corpseInst.isFloorBoss) {
              continue;
            }
            const px = corpseInst.x * tileW;
            const py = corpseInst.y * tileH;
            ctx.fillStyle = 'rgba(135, 20, 20, 0.82)';
            ctx.beginPath();
            ctx.ellipse(px + tileW / 2, py + tileH * 0.56, 19, 11, 0, 0, Math.PI * 2);
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
              ctx.fillText('Xác Quái', px + tileW / 2, py + tileH * 0.56 + 3);
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
                t === TILE.HEXEN_ALTAR ||
                t === TILE.BOOKSHELF ||
                t === TILE.VOID_RIFT ||
                t === TILE.BLOOD_THRONE;
              if (
                !visibleCoords.has(`${x},${y}`) &&
                t !== TILE.HEXEN_ALTAR &&
                t !== TILE.VOID_RIFT &&
                t !== TILE.BLOOD_THRONE
              ) {
                continue;
              }

              // Multi-Tile Standing Landmarks (3x2 Hexen Altar, 1x2 Gothic Bookshelf, 3x3 Void Rift, Vacant Blood Throne)
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
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.beginPath();
                    ctx.ellipse(px + tileW / 2, y * tileH + tileH - 5, tileW * 0.36, 6.2, 0, 0, Math.PI * 2);
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
                      now * 0.0024 + x,
                      room.floor
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

          const buildLimbSeveredSet = (limbs?: {
            leftArm: boolean;
            rightArm: boolean;
            leftLeg: boolean;
            rightLeg: boolean;
          }): Set<string> => {
            const severed = new Set<string>();
            if (!limbs) return severed;
            if (!limbs.leftArm) severed.add('left_arm');
            if (!limbs.rightArm) severed.add('right_arm');
            if (!limbs.leftLeg && !limbs.rightLeg) {
              severed.add('legs');
            } else {
              if (!limbs.leftLeg) severed.add('left_leg');
              if (!limbs.rightLeg) severed.add('right_leg');
            }
            return severed;
          };

          // Parked Dismissed Companions waiting near Hexen Altar
          const parkedCompanions = getParkedCompanionSpots(room, player);
          parkedCompanions.forEach(({ ally, x: cxPos, y: cyPos }, pIdx) => {
            entities.push({
              footY: cyPos,
              draw: () => {
                const px = cxPos * tileW;
                const footCenterY = (cyPos + 0.85) * tileH;
                const allyBob = Math.sin(now * 0.0018 + (pIdx + 3) * 1.1) * 1.4;
                const py = footCenterY - tileH * 1.88 + allyBob;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
                ctx.beginPath();
                ctx.ellipse(px + tileW / 2, footCenterY, tileW * 0.34, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                drawPixelSprite(
                  ctx,
                  ally.spriteKey || ally.classId,
                  px,
                  py,
                  tileW,
                  tileH * 2,
                  buildLimbSeveredSet(ally.limbs),
                  false,
                  false,
                  false,
                  false,
                  now * 0.0022 + pIdx,
                  room.floor
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
                const footCenterY = (coord.y + 0.85) * tileH;
                const allyBob = Math.sin(now * 0.0018 + (idx + 1) * 1.4) * 1.6;
                const py = footCenterY - tileH * 1.88 + allyBob;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
                ctx.beginPath();
                ctx.ellipse(px + tileW / 2, footCenterY, tileW * 0.34, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                drawPixelSprite(
                  ctx,
                  ally.spriteKey || ally.classId,
                  px,
                  py,
                  tileW,
                  tileH * 2,
                  buildLimbSeveredSet(ally.limbs),
                  false,
                  false,
                  false,
                  false,
                  now * 0.0024 + idx,
                  room.floor
                );
              },
            });
          });

          // Player Entity (Smoothly interpolated visualPosRef + smooth ~3.5s idle sine breathing)
          entities.push({
            footY: visualPosRef.current.y,
            draw: () => {
              const px = visualPosRef.current.x * tileW;
              const footCenterY = (visualPosRef.current.y + 0.85) * tileH;
              const playerBob = Math.sin(now * 0.0018) * 1.8;
              const py = footCenterY - tileH * 1.88 + playerBob;
              ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
              ctx.beginPath();
              ctx.ellipse(
                px + tileW / 2,
                footCenterY,
                tileW * 0.37,
                6.5,
                0,
                0,
                Math.PI * 2
              );
              ctx.fill();

              drawPixelSprite(
                ctx,
                player.classId,
                px,
                py,
                tileW,
                tileH * 2,
                buildLimbSeveredSet(player.limbs),
                false,
                false,
                false,
                false,
                now * 0.0024,
                room.floor
              );
            },
          });

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

                // Soft Elliptical Contact Shadow (rgba(0,0,0,0.6)) + Boss Crimson Rim Shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
                ctx.beginPath();
                ctx.ellipse(
                  enemyInst.x * tileW + tileW / 2,
                  enemyInst.y * tileH + tileH - 4,
                  isBoss3x ? tileW * 1.38 : isMiniBoss2x ? tileW * 0.78 : tileW * 0.40,
                  isBoss3x ? 15 : isMiniBoss2x ? 9 : 6.5,
                  0,
                  0,
                  Math.PI * 2
                );
                ctx.fill();
                if (isBoss3x) {
                  ctx.fillStyle = 'rgba(139, 0, 0, 0.38)';
                  ctx.beginPath();
                  ctx.ellipse(
                    enemyInst.x * tileW + tileW / 2,
                    enemyInst.y * tileH + tileH - 4,
                    tileW * 1.25,
                    11,
                    0,
                    0,
                    Math.PI * 2
                  );
                  ctx.fill();
                }

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
                  now * 0.003,
                  room.floor
                );

                // Golden-Yellow Bouncing '!' Alert Indicator (400ms reflex window) / Crimson '!' Chase / Yellow '?' De-Agro
                if (enemyInst.aiState === 'alert') {
                  if (!alertStartMapRef.current[enemyInst.uid]) {
                    alertStartMapRef.current[enemyInst.uid] = now;
                  }
                  const alertElapsed = now - alertStartMapRef.current[enemyInst.uid];
                  const popBounce = -Math.abs(Math.sin(Math.min(1, alertElapsed / 380) * Math.PI * 1.6)) * 13;
                  const scalePop = alertElapsed < 140 ? 1.24 - (alertElapsed / 140) * 0.24 : 1.0;
                  const bx = enemyInst.x * tileW + tileW / 2;
                  const by = py - 14 + popBounce;
                  ctx.save();
                  ctx.translate(bx, by);
                  ctx.scale(scalePop, scalePop);
                  ctx.shadowColor = 'rgba(250, 204, 21, 0.85)';
                  ctx.shadowBlur = 12;
                  ctx.fillStyle = 'rgba(18, 12, 4, 0.92)';
                  ctx.fillRect(-11, -12, 22, 22);
                  ctx.strokeStyle = '#fde047';
                  ctx.lineWidth = 2;
                  ctx.strokeRect(-11, -12, 22, 22);
                  ctx.fillStyle = '#fef08a';
                  ctx.font = '900 17px "Noto Serif", serif';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText('!', 0, -1);
                  ctx.restore();
                } else {
                  if (alertStartMapRef.current[enemyInst.uid]) {
                    delete alertStartMapRef.current[enemyInst.uid];
                  }
                  if (enemyInst.aiState === 'chase') {
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
                  ? 'rgba(14, 8, 24, 0.38)'
                  : room.isExterior
                  ? 'rgba(6, 8, 12, 0.52)'
                  : 'rgba(4, 3, 8, 0.78)';
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

          // 3A. Continuous Pale Light-Gray Drifting Mist Layers across the full viewport & world
          ctx.save();
          const mistSec = now * 0.001;
          const mistStrength = room.isExterior ? 0.68 : room.floor === 3 ? 0.62 : 0.55;
          const mistSpanW = Math.max(worldPxW, viewW);
          const mistSpanH = Math.max(worldPxH, viewH);
          const mistOriginX = Math.min(0, camX);
          const mistOriginY = Math.min(0, camY);

          // Layer 1: Wide drifting pale light-gray fog banks (layered radial clouds)
          const wrapW = mistSpanW + 360;
          const wrapH = mistSpanH + 220;
          for (let m = 0; m < 10; m++) {
            const speedX = 14 + (m % 4) * 5;
            const speedY = (m % 2 === 0 ? 1 : -1) * (3.5 + (m % 3) * 1.5);
            const rawX = m * 173 + mistSec * speedX;
            const rawY = m * 119 + mistSec * speedY + Math.sin(mistSec * 0.45 + m * 1.3) * 26;
            const mx = mistOriginX + (((rawX % wrapW) + wrapW) % wrapW - 180);
            const my = mistOriginY + (((rawY % wrapH) + wrapH) % wrapH - 110);
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
            const bandSpanW = mistSpanW + 420;
            const bxRaw = b * 230 + mistSec * dir * (18 + b * 4);
            const bx = mistOriginX + (((bxRaw % bandSpanW) + bandSpanW) % bandSpanW - 210);
            const by = mistOriginY + ((b + 0.5) / 5) * mistSpanH + Math.cos(mistSec * 0.55 + b) * 18;
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
            const px = mistOriginX + (((pxRaw % mistSpanW) + mistSpanW) % mistSpanW);
            const py = mistOriginY + (((pyRaw % mistSpanH) + mistSpanH) % mistSpanH);
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

          ctx.restore();

          // 4A. Full-Canvas Screen-Space Dynamic Torchlight Radial Vignette (fills 100% of canvas.width x canvas.height with zero rectangular cutoff)
          const playerScreenX = (visualPosRef.current.x + 0.5) * tileW - camX;
          const playerScreenY = (visualPosRef.current.y + 0.3) * tileH - camY;
          if (!room.isExterior) {
            const lanternFlicker = !isTorchLit
              ? 1 + Math.sin(now * 0.004) * 0.02
              : isTorchLow
              ? 0.92 + Math.sin(now * 0.026) * 0.1 + Math.cos(now * 0.043) * 0.06
              : 1 + Math.sin(now * 0.0085) * 0.035 + Math.sin(now * 0.021) * 0.016;
            const innerR = isTorchLit ? tileW * (isTorchLow ? 0.72 : 1.15) : tileW * 0.42;
            const lightRadiusPx = Math.max(tileW * 1.45, sightRadius * tileW * lanternFlicker);
            const torchGrad = ctx.createRadialGradient(
              playerScreenX,
              playerScreenY,
              innerR,
              playerScreenX,
              playerScreenY,
              lightRadiusPx
            );
            if (!isTorchLit) {
              torchGrad.addColorStop(0, 'rgba(30, 24, 38, 0.08)');
              torchGrad.addColorStop(0.45, 'rgba(6, 4, 10, 0.56)');
              torchGrad.addColorStop(0.78, 'rgba(3, 2, 5, 0.82)');
              torchGrad.addColorStop(1, 'rgba(2, 1, 4, 0.90)');
            } else if (room.floor === 3) {
              torchGrad.addColorStop(0, isTorchLow ? 'rgba(216, 180, 254, 0.05)' : 'rgba(255, 206, 138, 0.07)');
              torchGrad.addColorStop(0.48, 'rgba(20, 10, 34, 0.24)');
              torchGrad.addColorStop(0.82, 'rgba(7, 4, 14, 0.68)');
              torchGrad.addColorStop(1, 'rgba(3, 2, 6, 0.84)');
            } else {
              torchGrad.addColorStop(
                0,
                isTorchLow ? 'rgba(245, 158, 11, 0.05)' : 'rgba(255, 198, 115, 0.08)'
              );
              torchGrad.addColorStop(0.45, isTorchLow ? 'rgba(18, 10, 10, 0.30)' : 'rgba(16, 11, 12, 0.16)');
              torchGrad.addColorStop(0.80, 'rgba(5, 4, 8, 0.66)');
              torchGrad.addColorStop(1, 'rgba(3, 2, 5, 0.82)');
            }
            ctx.save();
            ctx.fillStyle = torchGrad;
            ctx.fillRect(0, 0, viewW, viewH);
            ctx.restore();
          } else {
            // Subtle atmospheric edge vignette outdoors covering 100% of canvas.width x canvas.height
            const extGrad = ctx.createRadialGradient(
              playerScreenX,
              playerScreenY,
              tileW * 2.4,
              playerScreenX,
              playerScreenY,
              Math.max(viewW, viewH) * 0.72
            );
            extGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            extGrad.addColorStop(0.7, 'rgba(4, 6, 10, 0.18)');
            extGrad.addColorStop(1, 'rgba(3, 4, 7, 0.62)');
            ctx.save();
            ctx.fillStyle = extGrad;
            ctx.fillRect(0, 0, viewW, viewH);
            ctx.restore();
          }

          // 4B. Proximity Interaction Highlight & Floating Prompt ([F]) — drawn above torchlight vignette for crisp readability
          ctx.save();
          ctx.translate(-camX, -camY);
          const searchOffsets: Array<[number, number]> = [
            [0, 0],
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ];
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
            else if (t === TILE.BLOOD_THRONE) promptLabel = '[F] Ngai Vàng Máu';
            else if (t === TILE.MIASMA_VENT && !room.lootedCoords.includes(cKey))
              promptLabel = '[F] Hấp Thụ Khí';
            else if (t === TILE.RITUAL_CIRCLE) {
              const cMeta = room.ritualCircles?.[cKey];
              const dType = cMeta?.deityType || 'uninscribed';
              const altarKey = buildAltarKey(room.id, ix, iy);
              const isUsed =
                (player.usedAltarKeys || []).includes(altarKey) ||
                Boolean(cMeta?.used) ||
                (dType !== 'uninscribed' && room.lootedCoords.includes(cKey));
              if (isUsed) {
                promptLabel = '[F] Đài Đá Nguội Lạnh';
              } else {
                promptLabel =
                  dType === 'holy_mother'
                    ? '[F] Tế Đàn Thánh Mẫu'
                    : dType === 'demon_lord'
                    ? '[F] Huyết Trận'
                    : dType === 'void_god'
                    ? '[F] Bệ Thờ Hư Vô'
                    : '[F] Đài Đá Trống';
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

              ctx.font = 'bold 12px "Noto Serif", serif';
              const tagW = Math.max(120, Math.ceil(ctx.measureText(promptLabel).width) + 22);
              const tagH = 22;
              const tagX = Math.max(4, Math.min(worldPxW - tagW - 4, px + tileW / 2 - tagW / 2));
              const tagY = Math.max(4, py - 24);
              ctx.fillStyle = 'rgba(12, 9, 16, 0.94)';
              ctx.fillRect(tagX, tagY, tagW, tagH);
              ctx.strokeStyle = '#fbbf24';
              ctx.lineWidth = 1.3;
              ctx.strokeRect(tagX, tagY, tagW, tagH);

              ctx.fillStyle = '#fef08a';
              ctx.textAlign = 'center';
              ctx.fillText(promptLabel, tagX + tagW / 2, tagY + 15);
              ctx.restore();
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
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full flex-1 min-h-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const scaleX = e.currentTarget.width / Math.max(1, rect.width);
          const scaleY = e.currentTarget.height / Math.max(1, rect.height);
          const viewPxX = (e.clientX - rect.left) * scaleX;
          const viewPxY = (e.clientY - rect.top) * scaleY;
          const worldPxX = viewPxX + cameraOffsetRef.current.x;
          const worldPxY = viewPxY + cameraOffsetRef.current.y;
          const tx = Math.floor(worldPxX / CONFIG.TILE_PX);
          const ty = Math.floor(worldPxY / CONFIG.TILE_PX);
          onTileClick(tx, ty);
        }}
      />
    </div>
  );
};

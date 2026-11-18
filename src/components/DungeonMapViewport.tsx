import React, { useEffect, useRef } from 'react';
import { CONFIG } from '../game/config';
import { PlayerState } from '../game/combat';
import {
  getHerbTypeAtCoord,
  hasLineOfSight,
  herbTypeToVariant,
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
  onTileClick: (worldTileX: number, worldTileY: number) => void;
  onEnemyCollidePlayer?: (enemy: MapEnemyInstance) => void;
}

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

export const DungeonMapViewport: React.FC<DungeonMapViewportProps> = ({
  room,
  player,
  playerPos,
  trailCoords,
  animTick,
  isInteractivePaused,
  riftElixirCollected = false,
  onTileClick,
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
                const canRaise =
                  (player.skillLevels?.necromancy || 0) >= 1 &&
                  !corpseInst.corpseRaised &&
                  player.party.length < 3;
                if (!corpseInst.corpseDevoured || !corpseInst.corpseLooted || canRaise) {
                  ctx.fillStyle = !corpseInst.corpseLooted || canRaise ? '#fde047' : '#fca5a5';
                  ctx.font = 'bold 9px "Noto Serif", serif';
                  ctx.textAlign = 'center';
                  ctx.fillText(
                    !corpseInst.corpseLooted || canRaise ? 'Xác Quái [F]' : 'Xác Quái',
                    px + tileW / 2,
                    py + tileH / 2 + 3
                  );
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
                const py =
                  (enemyInst.y + 1) * tileH - drawH + (animTick % 3 === 0 ? -2 : 0);

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

            let promptLabel: string | null = null;

            if (t === TILE.CRATE && !room.lootedCoords.includes(cKey)) promptLabel = '[F] Lục Thùng';
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

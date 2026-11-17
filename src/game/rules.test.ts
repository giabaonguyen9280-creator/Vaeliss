import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from './config';
import { SeededRNG } from './prng';
import { buildRoomLayout, generateWorld, RoomTemplateType, TILE } from './mapGen';
import {
  amputateInfectedLimbWithBoneSaw,
  applyDefaultIntroLoadoutForRemainingSteps,
  applyIntroChoiceToPlayer,
  applySupportItemEffects,
  bloodForgeWeapon,
  canPlayerEquipGear,
  canPlayerEquipShield,
  canPlayerFlee,
  canTargetEnemyLimb,
  canUnequipWeapon,
  computeArmorFactor,
  computeLimbDamagePreview,
  createInitialPlayer,
  devourEnemyCorpse,
  executeCombatItem,
  executeCombatTalk,
  executePlayerSkill,
  executePlayerWeaponAttack,
  exorciseCursedWeapon,
  GEAR_ITEMS,
  getComputedPlayerStats,
  getEnemyMaxTotalHp,
  getEnemyRemainingTotalHp,
  getEnemyStepMultiplier,
  getLimbDebuffBadges,
  getPlayerStepCooldownMs,
  isPlayerPanicking,
  prayAffinityAtHexen,
  regrowLimbAtHexen,
  unlockHexenStatNode,
} from './combat';
import { CombatEngine } from './combatEngine';
import { CHARACTER_INTRO_STEPS, evaluateCanonEnding } from './narrative';

test('CONFIG contains all 26 enemies (15 normal, 8 minibosses, 3 floor bosses), 16 core + 7 canon weapons (23 total), 8 shields, 12 core + en_garde skills (13 total), and 12 lore books', () => {
  const enemies = Object.values(CONFIG.ENEMIES);
  assert.equal(enemies.filter((e) => e.tier === 'normal').length, 15);
  assert.equal(enemies.filter((e) => e.tier === 'miniboss').length, 8);
  assert.equal(enemies.filter((e) => e.tier === 'boss').length, 3);
  assert.equal(Object.keys(CONFIG.WEAPONS).length, 23);
  assert.equal(Object.keys(CONFIG.SHIELDS).length, 8);
  assert.equal(CONFIG.SKILLS.length, 13);
  assert.equal(CONFIG.SKILLS.some((s) => s.id === 'en_garde'), true);
  assert.equal(CONFIG.BOOKS.length, 12);
});

test('Seeded world generation starts at F2_EXTERIOR, includes tutorial enemy & 3 Floor 2 NPCs, and is deterministic', () => {
  const w1 = generateWorld('SEED-ALPHA-99');
  const w2 = generateWorld('SEED-ALPHA-99');
  assert.equal(w1.currentRoomId, 'F2_EXTERIOR');
  assert.equal(w1.rooms.F2_EXTERIOR.isExterior, true);
  assert.equal(
    w1.rooms.F2_EXTERIOR.enemies.some((e) => e.isTutorialGatekeeper),
    true
  );
  assert.deepEqual(w1.rooms.F2_R0.grid, w2.rooms.F2_R0.grid);
  assert.equal(w1.rooms.F2_R0.template, w2.rooms.F2_R0.template);
  assert.equal(w1.rooms.F1_R3.enemies.some((e) => e.templateId === 'demon_lord_vaelis'), true);
});

test('All 6 non-rectangular room templates preserve outer VOID border, wrap WALL around floor, and carve a Secret Chamber with TILE.CHEST behind TILE.CRACKED_WALL', () => {
  const templates: RoomTemplateType[] = [
    'BRIDGE_CHASM',
    'JAGGED_RUIN',
    'DONUT_PIT',
    'ZIGZAG_HALL',
    'CRYPT_ALCOVES',
    'SPLIT_SHORTCUT',
  ];
  const rng = new SeededRNG('ROOM-TEST');
  for (const tpl of templates) {
    const { grid, spawnX, spawnY, secretX, secretY } = buildRoomLayout(tpl, rng);
    assert.equal(grid.length, 13);
    assert.equal(grid[0].length, 17);
    assert.equal(grid[0][0], TILE.VOID);
    assert.equal(grid[12][16], TILE.VOID);
    assert.equal(grid[spawnY][spawnX], TILE.FLOOR);
    assert.equal(grid[secretY][secretX], TILE.CRACKED_WALL);
    const chamberY = Math.max(1, secretY - 1);
    assert.equal(grid[chamberY][secretX], TILE.FLOOR);
    assert.equal(grid[chamberY][secretX + 1], TILE.CHEST);
  }
});

test('All 12 skills execute without crashing across Lv.1..3 even when lockedLimbIds is initially undefined', () => {
  const world = generateWorld('SKILL-TEST');
  const rng = new SeededRNG('SKILL-RNG');

  for (const sk of CONFIG.SKILLS) {
    for (const lv of [1, 2, 3]) {
      const p = createInitialPlayer('fallen_knight');
      p.hp = 120;
      p.mind = 120;
      p.skillLevels[sk.id] = lv;
      const enemy = JSON.parse(JSON.stringify(world.rooms.F2_EXTERIOR.enemies[0]));
      delete enemy.lockedLimbIds;

      const res = executePlayerSkill(p, enemy, sk.id, 'right_arm', rng);
      assert.equal(Array.isArray(res.logs), true);
      assert.equal(res.logs.length > 0, true);
    }
  }
});

test('Class-Specific HP/Mind, Custom Name, Consecutive Normal Attacks after Limb Sever, Bandage Bleed Cure, 5-Slot Equipment, 6 Stats, Hunger >= 50/90, and Corpse Devour operate accurately', () => {
  const pKnight = createInitialPlayer('fallen_knight', 'Vaelen');
  const pNun = createInitialPlayer('forsaken_nun');
  const pHunter = createInitialPlayer('night_hunter');

  assert.equal(pKnight.name, 'Vaelen');
  assert.equal(pKnight.maxHp, 135);
  assert.equal(pKnight.maxMind, 85);
  assert.equal(pNun.maxHp, 90);
  assert.equal(pNun.maxMind, 135);
  assert.equal(pHunter.maxHp, 105);
  assert.equal(pHunter.maxMind, 105);

  const p = pHunter;
  assert.equal(getPlayerStepCooldownMs(p), 220);
  assert.equal(getEnemyStepMultiplier(p), 1);
  assert.equal(canPlayerFlee(p), true);

  const statsNormal = getComputedPlayerStats(p);
  assert.equal(statsNormal.physAtk > 0, true);
  assert.equal(statsNormal.physDefPct > 0, true);
  assert.equal(statsNormal.evasionPct > 0, true);
  assert.equal(statsNormal.critRatePct > 0, true);

  // Consecutive normal attacks: when 1st attack severs right_arm, 2nd attack automatically redirects to torso and still deals damage!
  const world = generateWorld('CONSECUTIVE-ATK-TEST');
  const testEnemy = JSON.parse(JSON.stringify(world.rooms.F2_EXTERIOR.enemies[0]));
  pKnight.equippedWeapon = 'void_shortblade'; // high accuracy & true dmg
  const rightArm = testEnemy.limbs.find((l: { id: string }) => l.id === 'right_arm')!;
  rightArm.hp = 50;
  const hit1 = executePlayerWeaponAttack(pKnight, testEnemy, 'right_arm', new SeededRNG('ATK-1'));
  assert.equal((hit1.lastDealtDmg || 0) > 0, true);
  assert.equal(rightArm.hp, 0);

  // 2nd attack still passes 'right_arm' (severed), and must auto-redirect to 'torso' and deal > 0 damage!
  const hit2 = executePlayerWeaponAttack(pKnight, testEnemy, 'right_arm', new SeededRNG('ATK-2'));
  assert.equal((hit2.lastDealtDmg || 0) > 0, true);
  assert.equal(hit2.targetLimbId, 'torso');

  // Bandage cures bleeding AND prevents re-bleeding during the enemy's counterattack on the same turn
  pKnight.statuses.bleeding = true;
  pKnight.hp = 80;
  pKnight.inventory.bandage = 2;
  const bandageRes = executeCombatItem(pKnight, testEnemy, 'bandage', new SeededRNG('BANDAGE-TURN'));
  assert.equal(pKnight.statuses.bleeding, false);
  assert.equal((pKnight.statuses.bleedImmunityTurns || 0) > 0, true);
  assert.equal(bandageRes.logs.some((l) => l.includes('CẦM MÁU HOÀN TOÀN')), true);

  // Hunger >= 50 reduces physical attack by 25%
  p.hunger = 55;
  const statsHungry = getComputedPlayerStats(p);
  assert.equal(statsHungry.physAtk, Math.round(statsNormal.physAtk * 0.75));

  // Hunger >= 90 sets Evasion = 0, Agility = 0, and Crit Rate = 0%
  p.hunger = 92;
  const statsStarving = getComputedPlayerStats(p);
  assert.equal(statsStarving.evasionPct, 0);
  assert.equal(statsStarving.agility, 0);
  assert.equal(statsStarving.critRatePct, 0);

  // Devouring corpse reduces hunger by 45, adds +20 Corruption, and locks Holy Magic
  const enemy = world.rooms.F2_EXTERIOR.enemies[0];
  enemy.defeated = true;
  p.hunger = 60;
  const devourRes = devourEnemyCorpse(p, enemy);
  assert.equal(devourRes.success, true);
  assert.equal(p.hunger, 15);
  assert.equal(p.corruption, 20);
  assert.equal(p.holyMagicLocked, true);
});

test('Diminishing Returns Armor Curve (ArmorFactor = 1 / (1 + Armor / 50)), Elemental Oil+Fire 2.5x + 150 Burn, Blunt+Acid Stun, and Reticle Badges operate accurately', () => {
  // Armor = 50 (or 0.50 in config) -> ArmorFactor = 1 / (1 + 50/50) = 0.5
  const af50 = computeArmorFactor(0.5, false);
  assert.equal(af50.armorPoints, 50);
  assert.equal(Math.abs(af50.armorFactor - 0.5) < 1e-6, true);

  // Ignore armor -> ArmorFactor = 1.0 (0 armor)
  const afIgnore = computeArmorFactor(0.5, true);
  assert.equal(afIgnore.armorPoints, 0);
  assert.equal(afIgnore.armorFactor, 1);

  const p = createInitialPlayer('blood_cleric');
  p.inventory.purple_vial = 2;
  p.inventory.red_vial = 2;
  const world = generateWorld('REACTION-TEST');
  const enemy = JSON.parse(JSON.stringify(world.rooms.F2_EXTERIOR.enemies[0]));
  const tpl = CONFIG.ENEMIES[enemy.templateId];
  for (const l of enemy.limbs) {
    l.hp = 5000;
    l.maxHp = 5000;
  }

  // Throw Purple Vial (Oil) + Red Vial (Acid) + lock right_arm
  const rng = new SeededRNG('VIAL-REACT');
  executeCombatItem(p, enemy, 'purple_vial', rng);
  executeCombatItem(p, enemy, 'red_vial', rng);
  enemy.lockedLimbIds = { right_arm: 2 };

  const rightArm = enemy.limbs.find((l: { id: string }) => l.id === 'right_arm')!;
  const badgesArm = getLimbDebuffBadges(enemy, 'right_arm');
  const badgesHead = getLimbDebuffBadges(enemy, 'head');
  assert.equal(badgesArm.some((b) => b.type === 'acid'), true);
  assert.equal(badgesArm.some((b) => b.type === 'oil'), true);
  assert.equal(badgesArm.some((b) => b.type === 'locked'), true);
  assert.equal(badgesHead.some((b) => b.type === 'blind'), true);

  // Damage preview reflects 2.5x multiplier when using a Fire/Holy weapon on Oil-covered target
  p.equippedWeapon = 'holy_mother_mace'; // holy weapon with undeadDemonBonus
  const previewOil = computeLimbDamagePreview(p, enemy, tpl, rightArm);
  assert.equal(previewOil.hitPct > 80, true);
  assert.equal(previewOil.minDmg > 400, true);

  // Attacking Oil-covered target with Holy weapon triggers 2.5x damage and sets burnPerTurn = 150, burnTurns = 3
  let hitOil = false;
  for (let i = 0; i < 15; i++) {
    const testOilEnemy = JSON.parse(JSON.stringify(enemy));
    const atkRes = executePlayerWeaponAttack(p, testOilEnemy, 'right_arm', new SeededRNG(`HOLY-OIL-${i}`));
    if ((atkRes.lastDealtDmg || 0) > 0) {
      hitOil = true;
      assert.equal(atkRes.particleType === 'fire' || atkRes.particleType === 'spark', true);
      assert.equal(testOilEnemy.burnPerTurn, 150);
      assert.equal(testOilEnemy.burnTurns, 2); // 3 turns applied, 1 turn ticked during enemy phase
      assert.equal(testOilEnemy.oilCovered, false);
      assert.equal(atkRes.logs.some((l) => l.includes('2.5x') && l.includes('150')), true);
      break;
    }
  }
  assert.equal(hitOil, true);

  // Blunt weapon against Armor-Shredded enemy has +30% Stun chance
  p.equippedWeapon = 'armor_breaker_mace'; // blunt weapon with 0 base stunChance
  let stunnedAtLeastOnce = false;
  for (let i = 0; i < 35; i++) {
    const testEnemy = JSON.parse(JSON.stringify(enemy));
    testEnemy.acidTurns = 3;
    testEnemy.stunTurns = 0;
    const r = executePlayerWeaponAttack(p, testEnemy, 'torso', new SeededRNG(`BLUNT-STUN-${i}`));
    if ((r.lastDealtDmg || 0) > 0 && r.logs.some((l) => l.includes('CHOÁNG'))) {
      stunnedAtLeastOnce = true;
      break;
    }
  }
  assert.equal(stunnedAtLeastOnce, true);
});

test('CombatEngine updates particles with gravity = 0.5, decays screen shake, and resolves turn phases via deltaTime without setTimeout', () => {
  const engine = new CombatEngine();
  engine.spawnImpactEffects(100, 120, 620, true, 'blood');
  assert.equal(engine.particles.length > 0, true);
  assert.equal(engine.slashArcs.length, 1);
  // Crit sets shakeAmplitude = 25px
  assert.equal(engine.shakeAmplitude, 25);

  const initialVy = engine.particles[0].vy;

  // Step 1 frame (~16.667ms -> frameScale = 1.0)
  engine.update(16.667);
  // vy increases by gravity (0.5 * 1.0)
  assert.equal(Math.abs(engine.particles[0].vy - (initialVy + 0.5)) < 0.05, true);
  assert.equal(engine.shakeTimerMs < 420, true);
});

test('Tactical Vials, Total Enemy HP, Combat Talk, and Mini-Boss Puzzles operate accurately', () => {
  const p = createInitialPlayer('night_hunter');
  p.inventory.brown_vial = 2;
  p.inventory.red_vial = 2;
  p.inventory.white_vial = 2;
  p.inventory.rotten_meat = 2;
  p.inventory.bone_saw = 1;

  const world = generateWorld('COMBAT-TEST');
  const krakenRoom = Object.values(world.rooms).find((r) =>
    r.enemies.some((e) => e.templateId === 'astral_kraken')
  )!;
  const kraken = krakenRoom.enemies.find((e) => e.templateId === 'astral_kraken')!;
  const krakenTpl = CONFIG.ENEMIES.astral_kraken;

  // Total HP check
  const maxHp = getEnemyMaxTotalHp(kraken);
  assert.equal(maxHp > 0, true);
  assert.equal(getEnemyRemainingTotalHp(kraken), maxHp);

  // Kraken puzzle: cannot target head until >= 2 tentacles are severed
  assert.equal(canTargetEnemyLimb(kraken, krakenTpl, 'head').allowed, false);
  kraken.limbs.find((l) => l.id === 'tentacle_1')!.hp = 0;
  kraken.limbs.find((l) => l.id === 'tentacle_2')!.hp = 0;
  assert.equal(canTargetEnemyLimb(kraken, krakenTpl, 'head').allowed, true);

  // Brown Vial deals 650-850 explosive damage to torso
  const rng = new SeededRNG('VIAL-RNG');
  const torsoBefore = kraken.limbs.find((l) => l.id === 'torso')!.hp;
  executeCombatItem(p, kraken, 'brown_vial', rng);
  const torsoAfter = kraken.limbs.find((l) => l.id === 'torso')!.hp;
  const dealt = torsoBefore - torsoAfter;
  assert.equal(dealt >= 650 && dealt <= 850, true);

  // Combat Talk executes cleanly
  const talkRes = executeCombatTalk(p, kraken, rng);
  assert.equal(talkRes.logs.length > 0, true);

  // Bone Saw amputates infected limb
  p.limbs.infected.rightLeg = true;
  const sawRes = amputateInfectedLimbWithBoneSaw(p, 'rightLeg');
  assert.equal(sawRes.success, true);
  assert.equal(p.limbs.rightLeg, false);
  assert.equal(p.limbs.infected.rightLeg, false);

  // Dullahan puzzle: severing left_arm blinds him permanently (blindTurns = 99)
  const dullahanRoom = Object.values(world.rooms).find((r) =>
    r.enemies.some((e) => e.templateId === 'dullahan_knight')
  )!;
  const dullahan = dullahanRoom.enemies.find((e) => e.templateId === 'dullahan_knight')!;
  const leftArm = dullahan.limbs.find((l) => l.id === 'left_arm')!;
  leftArm.hp = 10;
  p.equippedWeapon = 'void_shortblade';
  executePlayerWeaponAttack(p, dullahan, 'left_arm', new SeededRNG('HIT-100'));
  assert.equal(leftArm.hp, 0);
  assert.equal(dullahan.blindTurns, 99);
});

test('3-Step Character Intro choices cover all 3 classes and mutate player state, cursed lock, and panic immunity accurately', () => {
  const classes: Array<'fallen_knight' | 'forsaken_nun' | 'night_hunter'> = [
    'fallen_knight',
    'forsaken_nun',
    'night_hunter',
  ];
  for (const cls of classes) {
    assert.equal(CHARACTER_INTRO_STEPS[cls].length, 3);
    for (const step of CHARACTER_INTRO_STEPS[cls]) {
      assert.equal(step.options.length, 3);
    }
  }

  // Alcohol intro gives panicImmune and mindSet = 80
  const pDrink = createInitialPlayer('fallen_knight');
  applyIntroChoiceToPlayer(pDrink, CHARACTER_INTRO_STEPS.fallen_knight[0].options[2]);
  assert.equal(pDrink.mind, 80);
  assert.equal(pDrink.panicImmune, true);
  pDrink.mind = 10;
  assert.equal(isPlayerPanicking(pDrink), false);

  // Without panicImmune, SAN < 30 triggers Hoảng Loạn
  const pPanic = createInitialPlayer('forsaken_nun');
  pPanic.mind = 29;
  assert.equal(isPlayerPanicking(pPanic), true);
  pPanic.mind = 30;
  assert.equal(isPlayerPanicking(pPanic), false);

  // Cursed bannerblade locks unequipping until Exorcism or Arm Amputation
  const pCursed = createInitialPlayer('fallen_knight');
  applyIntroChoiceToPlayer(pCursed, CHARACTER_INTRO_STEPS.fallen_knight[1].options[2]);
  assert.equal(pCursed.cursedLockedWeapon, 'cursed_broken_bannerblade');
  assert.equal(canUnequipWeapon(pCursed).allowed, false);

  // Exorcism fails without energy stones, succeeds with 1 energy stone
  pCursed.energyStones = 0;
  assert.equal(exorciseCursedWeapon(pCursed).success, false);
  pCursed.energyStones = 1;
  assert.equal(exorciseCursedWeapon(pCursed).success, true);
  assert.equal(pCursed.cursedLockedWeapon, null);
  assert.equal(canUnequipWeapon(pCursed).allowed, true);

  // Amputating infected right arm also breaks cursed weapon lock
  const pCursedAmp = createInitialPlayer('fallen_knight');
  applyIntroChoiceToPlayer(pCursedAmp, CHARACTER_INTRO_STEPS.fallen_knight[1].options[2]);
  pCursedAmp.inventory.bone_saw = 1;
  pCursedAmp.limbs.infected.rightArm = true;
  const ampRes = amputateInfectedLimbWithBoneSaw(pCursedAmp, 'rightArm');
  assert.equal(ampRes.success, true);
  assert.equal(pCursedAmp.cursedLockedWeapon, null);

  // Skipping prologue into Exterior grants default loadout & survival items for every class with COR = 0
  for (const clsId of ['fallen_knight', 'forsaken_nun', 'night_hunter'] as const) {
    const pSkip = createInitialPlayer(clsId);
    const skipRes = applyDefaultIntroLoadoutForRemainingSteps(pSkip, 0);
    assert.equal(skipRes.appliedLabels.length, 3);
    assert.equal(pSkip.corruption, 0);
    assert.equal((pSkip.inventory.blue_vial || 0) >= 2, true);
    assert.equal((pSkip.inventory.dried_meat || 0) >= 2, true);
    assert.equal((pSkip.inventory.brown_vial || 0) >= 1, true);
    assert.equal((pSkip.inventory.bandage || 0) >= 2, true);
  }
});

test('Blood Forge (+35%), Hexen Affinities/Nodes/Regrowth, Blue Vial 50% heal, Elixir of Ancients, and Canon Floor NPCs work accurately', () => {
  const p = createInitialPlayer('fallen_knight');
  p.energyStones = 10;
  p.mind = 85;
  const baseAtk = getComputedPlayerStats(p).physAtk;
  const forgeRes = bloodForgeWeapon(p, p.equippedWeapon);
  assert.equal(forgeRes.success, true);
  assert.equal(p.corruption, 15);
  assert.equal(p.affinities.demonicPact, 1);
  const forgedAtk = getComputedPlayerStats(p).physAtk;
  assert.equal(forgedAtk > baseAtk, true);

  // Hexen stat node + pray affinity + limb regrowth
  assert.equal(unlockHexenStatNode(p, 'atk_1').success, true);
  assert.equal(prayAffinityAtHexen(p, 'holyMother').success, true);
  assert.equal(p.affinities.holyMother, 1);
  p.limbs.leftArm = false;
  assert.equal(regrowLimbAtHexen(p, 'leftArm').success, true);
  assert.equal(p.limbs.leftArm, true);

  // Blue vial heals 50% of maxHp & Elixir sets curedPetrification
  p.hp = 10;
  const logs: string[] = [];
  applySupportItemEffects(p, 'blue_vial', logs);
  assert.equal(p.hp, 10 + Math.round(p.maxHp * 0.5));
  applySupportItemEffects(p, 'elixir_of_ancients', logs);
  assert.equal(p.questFlags.curedPetrification, true);

  // Verify world generation includes new canonical NPCs & VOID_RIFT
  const world = generateWorld('CANON-MAP-TEST');
  const allTiles = Object.values(world.rooms).flatMap((r) => r.grid.flat());
  assert.equal(allTiles.includes(TILE.NPC_CHILD_12), true);
  assert.equal(allTiles.includes(TILE.NPC_BROKEN_KNIGHT), true);
  assert.equal(allTiles.includes(TILE.NPC_SMITH), true);
  assert.equal(allTiles.includes(TILE.NPC_GLASS_LADY), true);
  assert.equal(allTiles.includes(TILE.NPC_PHYSICIAN), true);
  assert.equal(allTiles.includes(TILE.NPC_CHRONICLER), true);
  assert.equal(allTiles.includes(TILE.VOID_RIFT), true);
});

test('evaluateCanonEnding resolves all 7 canon endings accurately', () => {
  const base = {
    classId: 'fallen_knight',
    corruption: 20,
    readBookIds: ['book_1', 'book_2', 'book_3', 'book_4'],
    inventory: { void_core: 1, reconstruction_scroll: 1, elixir_of_ancients: 1 },
    learnedSkillIds: ['en_garde'],
    vaelisTalked: true,
    vaelisDefeated: true,
    curedPetrification: false,
    child13Rescued: true,
  };

  assert.equal(evaluateCanonEnding({ ...base, endingAction: 'LEAVE_AFTER_VAELIS' }).id, 'NORMAL_ENDING');
  assert.equal(evaluateCanonEnding({ ...base, corruption: 100, endingAction: 'SIT_THRONE' }).id, 'DARK_ENDING');
  assert.equal(evaluateCanonEnding({ ...base, corruption: 0, endingAction: 'SACRIFICE_CHILD13_RIFT' }).id, 'ORDER_ENDING');
  assert.equal(evaluateCanonEnding({ ...base, endingAction: 'POUR_ELIXIR_CHILD13_RIFT' }).id, 'TRUE_ENDING');
  assert.equal(evaluateCanonEnding({ ...base, classId: 'fallen_knight', corruption: 10, endingAction: 'STAY_BUILD_GRAVES' }).id, 'S_ENDING_KNIGHT');
  assert.equal(evaluateCanonEnding({ ...base, classId: 'forsaken_nun', corruption: 5, endingAction: 'ESCAPE_EXTERIOR_GATE' }).id, 'S_ENDING_NUN');
  assert.equal(evaluateCanonEnding({ ...base, classId: 'night_hunter', curedPetrification: true, endingAction: 'ESCAPE_EXTERIOR_GATE' }).id, 'S_ENDING_HUNTER');
});

test('New 22 equipment items, class/limb/corruption equip restrictions, and solo 3x3 Boss room enemy rules work accurately', () => {
  const pKnight = createInitialPlayer('fallen_knight');
  const pNun = createInitialPlayer('forsaken_nun');
  const pHunter = createInitialPlayer('night_hunter');

  // Verify white_herb is defined in CONFIG.ITEMS
  assert.equal(Boolean(CONFIG.ITEMS.white_herb), true);

  // Verify class restrictions on body armor
  assert.equal(canPlayerEquipGear(pKnight, 'legion_brigandine').allowed, true);
  assert.equal(canPlayerEquipGear(pNun, 'legion_brigandine').allowed, false);
  assert.equal(canPlayerEquipGear(pNun, 'goethe_cassock').allowed, true);
  assert.equal(canPlayerEquipGear(pHunter, 'star_pelt_coat').allowed, true);

  // Verify corruption restrictions on platinum cuirass
  assert.equal(canPlayerEquipGear(pKnight, 'platinum_cuirass').allowed, true);
  pKnight.corruption = 25;
  assert.equal(canPlayerEquipGear(pKnight, 'platinum_cuirass').allowed, false);

  // Verify shield requires an intact free arm
  pKnight.limbs.leftArm = false;
  assert.equal(canPlayerEquipShield(pKnight, 'bulwark_of_the_lamb').allowed, false);

  // Verify solo 3x3 Floor Boss rooms have exactly 1 enemy (the Boss alone)
  const world = generateWorld('BOSS-SOLO-CHECK');
  assert.equal(world.rooms.F2_R4.enemies.length, 1);
  assert.equal(world.rooms.F3_R3.enemies.length, 1);
  assert.equal(world.rooms.F1_R3.enemies.length, 1);
  assert.equal(CONFIG.ENEMIES[world.rooms.F1_R3.enemies[0].templateId].spriteScale, '3x3');
  assert.equal(Object.keys(GEAR_ITEMS).length >= 20, true);
});

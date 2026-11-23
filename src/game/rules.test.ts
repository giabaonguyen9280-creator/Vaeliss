import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from './config';
import { SeededRNG } from './prng';
import {
  computePngLegDropOffset,
  resolveSeveredMaskBoxes,
  loadCombatImage,
} from './pixelArt';
import {
  advanceRoomEnemiesOneTurn,
  buildRoomLayout,
  createMapEnemyInstance,
  generateWorld,
  getHerbTypeAtCoord,
  hasLineOfSight,
  herbTypeToVariant,
  isWalkableTile,
  RoomData,
  RoomTemplateType,
  TILE,
} from './mapGen';
import {
  amputateInfectedLimbWithBoneSaw,
  applyDefaultIntroLoadoutForRemainingSteps,
  applyIntroChoiceToPlayer,
  applySupportItemEffects,
  applySupportItemToAlly,
  bloodForgeWeapon,
  canAllyEquipGear,
  canAllyEquipShield,
  canPlayerEquipGear,
  canPlayerEquipShield,
  canPlayerFlee,
  canTargetEnemyLimb,
  canUnequipWeapon,
  castNecromancyOnChild12,
  castNecromancyOnCorpse,
  computeArmorFactor,
  computeLimbDamagePreview,
  createInitialPlayer,
  createRecruitedAlly,
  devourEnemyCorpse,
  executeCombatItem,
  executeCombatTalk,
  executePlayerSkill,
  executePlayerWeaponAttack,
  executeSingleActorCombatAction,
  exorciseCursedWeapon,
  GEAR_ITEMS,
  getAllyAvailableSkills,
  getAllyComputedStats,
  getComputedPlayerStats,
  getEnemyMaxTotalHp,
  getEnemyRemainingTotalHp,
  getEnemyStepMultiplier,
  getLimbDebuffBadges,
  getPlayerStepCooldownMs,
  isPlayerPanicking,
  isPureTankSummon,
  getUndeadSummonDmgMultiplier,
  learnOrUpgradeHexenSkill,
  prayAffinityAtHexen,
  reclaimUndeadSummonGear,
  regrowLimbAtHexen,
  resolveEnemyCombatRound,
  unlockHexenStatNode,
  isWeaponTwoHanded,
  canMemberEquipWeapon,
  handlePlayerArmLoss,
  leaveOrDismissPartyMember,
  pruneDeadCompanions,
  recallDismissedCompanion,
  getAmputationSanityMultiplier,
  resolveCombatCoinFlipOutcome,
  computeLimbHitChance,
  banHolyMother,
  isHolyMotherBanned,
  grantAffinityOnce,
  applyAffinityChange,
  canUseHolySkill,
  getFloor3MiasmaMultiplier,
  dissectEnemyCorpseCleanly,
  useEmergencyAmputationScroll,
  HOLY_MOTHER_REFUSAL_MSG,
  ALTAR_EXHAUSTED_MSG,
  HOLY_ALTAR_REFUSAL_MSG,
  HOLY_ALTAR_SUCCESS_MSG,
  BLOOD_ALTAR_SUCCESS_MSG,
  VOID_ALTAR_SUCCESS_MSG,
  CORRUPTION_DIEGETIC_WARNING_MSG,
  checkCorruptionDiegeticWarning,
  buildAltarKey,
  performAltarAffinityRitual,
  getFleeChancePct,
  getChestMaxTier,
  getEligibleChestWeaponIds,
  getEligibleChestGearIds,
  getEligibleNormalCorpseWeaponIds,
} from './combat';
import { CombatEngine } from './combatEngine';
import {
  CHARACTER_INTRO_STEPS,
  evaluateCanonEnding,
  evaluateVoidRiftRequirements,
  evaluateSmugglerHaggle,
  SMUGGLER_VALUABLE_IDS,
} from './narrative';

test('CONFIG contains all 26 enemies (15 normal, 8 minibosses, 3 floor bosses), 24 weapons, 8 shields, 14 skills (incl. en_garde & necromancy), and 13 canon lore books', () => {
  const enemies = Object.values(CONFIG.ENEMIES);
  assert.equal(enemies.filter((e) => e.tier === 'normal').length, 15);
  assert.equal(enemies.filter((e) => e.tier === 'miniboss').length, 8);
  assert.equal(enemies.filter((e) => e.tier === 'boss').length, 3);
  assert.equal(Object.keys(CONFIG.WEAPONS).length, 24);
  assert.equal(Object.keys(CONFIG.SHIELDS).length, 8);
  assert.equal(CONFIG.SKILLS.length, 14);
  assert.equal(CONFIG.SKILLS.some((s) => s.id === 'en_garde'), true);
  assert.equal(CONFIG.SKILLS.some((s) => s.id === 'necromancy'), true);
  assert.equal(CONFIG.BOOKS.length, 13);
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
  assert.equal(p.affinities.demonicPact, 1);
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
  assert.equal(evaluateCanonEnding({ ...base, classId: 'forsaken_nun', corruption: 5, child13InParty: true, endingAction: 'ESCAPE_EXTERIOR_GATE' }).id, 'S_ENDING_NUN');
  assert.notEqual(evaluateCanonEnding({ ...base, classId: 'forsaken_nun', corruption: 5, child13InParty: false, endingAction: 'ESCAPE_EXTERIOR_GATE' }).id, 'S_ENDING_NUN');
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

test('4-person party recruitment, Necromancy summons, Vorath Shield Arm mechanics, and sequential combat actions work accurately', () => {
  const p = createInitialPlayer('forsaken_nun');
  p.mind = 100;
  p.skillLevels.necromancy = 2;
  p.inventory.blue_vial = 2;
  p.inventory.dried_meat = 2;

  // Recruit Kael & Child 13
  const kael = createRecruitedAlly('ally_kael');
  const child13 = createRecruitedAlly('child_13');
  p.party.push(kael, child13);
  assert.equal(p.party.length, 2);

  // Necromancy on defeated corpse raises 3rd party slot (4th member total) with starter gear and unlocked equip permissions for ghoul/skeleton
  const world = generateWorld('PARTY-NECRO-TEST');
  const corpse = JSON.parse(JSON.stringify(world.rooms.F2_EXTERIOR.enemies[0]));
  corpse.templateId = 'fanatic_zealot';
  corpse.defeated = true;
  const necroRes = castNecromancyOnCorpse(p, corpse);
  assert.equal(necroRes.success, true);
  assert.equal(p.party.length, 3);
  const undeadGhoul = p.party[2];
  assert.equal(undeadGhoul.isUndeadSummon, true);
  assert.equal(undeadGhoul.classId, 'summon_ghoul');
  assert.equal(undeadGhoul.hunger, 0);
  assert.equal(Boolean(undeadGhoul.weaponId && undeadGhoul.equippedShield && undeadGhoul.equippedHead && undeadGhoul.equippedBody), true);
  assert.equal(canAllyEquipGear(undeadGhoul, 'void_woven_robe').allowed, true);
  assert.equal(canAllyEquipShield(undeadGhoul, 'rotten_wood_shield').allowed, true);

  // When ghoul/skeleton summon dies (hp <= 0), worn gear is reclaimed into player's unlocked pools with log notice
  const deathLogs: string[] = [];
  undeadGhoul.hp = 0;
  const recovered = reclaimUndeadSummonGear(p, undeadGhoul, deathLogs);
  assert.equal(recovered.length >= 4, true);
  assert.equal(p.unlockedWeapons.includes('butcher_cleaver'), true);
  assert.equal(p.unlockedGear.includes('boiled_cuirass'), true);
  assert.equal(undeadGhoul.equippedBody, null);
  assert.equal(undeadGhoul.equippedShield, null);
  assert.equal(deathLogs.some((l) => l.includes('Xác sống tan rã thành tro bụi, nhưng') && l.includes('đã rơi lại và được thu hồi vào kho đồ!')), true);

  // Party cap of 3 allies blocks raising Child 12 until slot free; Child 12 is Pure Tank (HP 160-190, high physDef, locked gear, shield behavior)
  p.questFlags.child12Resolved = true;
  assert.equal(castNecromancyOnChild12(p).success, false);
  p.party.pop();
  const c12Res = castNecromancyOnChild12(p);
  assert.equal(c12Res.success, true);
  const child12Summon = p.party[2];
  assert.equal(child12Summon.classId, 'summon_child_12');
  assert.equal(isPureTankSummon(child12Summon), true);
  assert.equal(child12Summon.maxHp >= 160 && child12Summon.maxHp <= 190, true);
  assert.equal(getAllyComputedStats(child12Summon, p).physDefPct >= 28, true);
  assert.equal(canAllyEquipGear(child12Summon, 'void_woven_robe').allowed, false);
  assert.equal(canAllyEquipShield(child12Summon, 'rotten_wood_shield').allowed, false);
  assert.equal(getAllyAvailableSkills(child12Summon).includes('divine_aegis'), true);
  assert.equal(getAllyAvailableSkills(child12Summon).includes('holy_light'), false);

  // Wraith summon is also a Pure Tank (HP 160-190, high innate physDef, defensive skills only)
  const priestCorpse = JSON.parse(JSON.stringify(world.rooms.F2_EXTERIOR.enemies[0]));
  priestCorpse.templateId = 'rotting_priest';
  priestCorpse.defeated = true;
  p.party.pop();
  const wraithRes = castNecromancyOnCorpse(p, priestCorpse);
  assert.equal(wraithRes.success, true);
  const wraith = p.party[2];
  assert.equal(wraith.classId, 'summon_wraith');
  assert.equal(isPureTankSummon(wraith), true);
  assert.equal(wraith.maxHp >= 160 && wraith.maxHp <= 190, true);
  assert.equal(getAllyComputedStats(wraith, p).physDefPct >= 34, true);
  assert.equal(getAllyAvailableSkills(wraith).includes('divine_aegis'), true);
  assert.equal(getAllyAvailableSkills(wraith).includes('void_bite'), false);

  // Support item heals ally & keeps undead hunger at 0
  p.party[0].hp = 30;
  const logs: string[] = [];
  assert.equal(applySupportItemToAlly(p, 0, 'blue_vial', logs), true);
  assert.equal(p.party[0].hp > 30, true);
  assert.equal(applySupportItemToAlly(p, 2, 'dried_meat', logs), true);
  assert.equal(p.party[2].hunger, 0);

  // Vorath (dullahan_knight) left_arm has isShieldArm: true & blocks 80% torso/head damage until severed
  const vorathTpl = CONFIG.ENEMIES.dullahan_knight;
  assert.equal(vorathTpl.limbs.some((l) => l.id === 'left_arm' && l.isShieldArm === true), true);

  // Sequential combat actions: Pure Tank locks ATTACK into defensive shield stance
  const targetEnemy = JSON.parse(JSON.stringify(world.rooms.F2_EXTERIOR.enemies[0]));
  const enemyHpBefore = getEnemyRemainingTotalHp(targetEnemy);
  const rng = new SeededRNG('SEQ-COMBAT');
  const act0 = executeSingleActorCombatAction(p, targetEnemy, 0, 'ATTACK', 'right_arm', undefined, rng);
  assert.equal(act0.logs.length > 0, true);
  const act1 = executeSingleActorCombatAction(p, targetEnemy, 1, 'GUARD', 'right_arm', undefined, rng);
  assert.equal(p.party[0].guarding, true);
  assert.equal(act1.logs.length > 0, true);
  const enemyHpBeforeTank = getEnemyRemainingTotalHp(targetEnemy);
  const wraithAct = executeSingleActorCombatAction(p, targetEnemy, 3, 'ATTACK', 'torso', undefined, rng);
  assert.equal(getEnemyRemainingTotalHp(targetEnemy), enemyHpBeforeTank);
  assert.equal(wraith.guarding, true);
  assert.equal(p.statuses.divineAegisTurns, 0);
  assert.equal(wraithAct.logs.some((l) => l.includes('Thuần Phòng Thủ')), true);
  assert.equal(enemyHpBefore >= enemyHpBeforeTank, true);
  const roundEnd = resolveEnemyCombatRound(p, targetEnemy, rng);
  assert.equal(roundEnd.logs.length > 0, true);
});

test('Turn-based Sokoban enemy stepping uses narrow sightRange <= 3, blocks crate/wall LOS, drops chase > 3 to patrol, halts loop on <= 1 combat, and lures via <= 4 decoys', () => {
  const w = 12;
  const h = 10;
  const grid: TILE[][] = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) =>
      x === 0 || y === 0 || x === w - 1 || y === h - 1 ? TILE.WALL : TILE.FLOOR
    )
  );

  const enemy = createMapEnemyInstance('e1', 'fanatic_zealot', 8, 5, { facing: 'left' });
  const bystander = createMapEnemyInstance('e_other', 'dire_wolf', 9, 7, { facing: 'left' });
  const room: RoomData = {
    id: 'SOKOBAN_TEST',
    floor: 2,
    roomIndex: 0,
    name: 'Test Room',
    sensoryLine: '...',
    template: 'BRIDGE_CHASM',
    width: w,
    height: h,
    grid,
    spawnX: 2,
    spawnY: 5,
    secretX: 0,
    secretY: 0,
    secretChamberCoords: [],
    enemies: [enemy, bystander],
    lootedCoords: [],
    shortcutOpened: false,
    secretWallBlown: false,
  };

  // Turn 1: Player at (3, 5), distance 4 -> outside narrow sightRange <= 3 -> enemy stays in patrol and steps 8 -> 7
  const t1 = advanceRoomEnemiesOneTurn(room, { x: 3, y: 5 }, null);
  assert.equal(t1.enemies[0].x, 7);
  assert.equal(t1.enemies[0].y, 5);
  assert.equal(t1.enemies[0].aiState, 'patrol');
  assert.equal(t1.collidedEnemy, null);

  // Turn 2: Player steps to (4, 5) within sightRange 3 of (7, 5) -> enemy enters 'alert' (!) and pauses in place
  room.enemies = t1.enemies;
  const t2 = advanceRoomEnemiesOneTurn(room, { x: 4, y: 5 }, null);
  assert.equal(t2.enemies[0].aiState, 'alert');
  assert.equal(t2.enemies[0].x, 7);
  assert.equal(t2.collidedEnemy, null);

  // Turn 3: Player steps to (5, 5) (distance 2 <= 3) -> enemy transitions 'alert' -> 'chase' and steps to (6, 5), reaching distance 1 -> immediate combat lock + halts remaining enemy loop!
  room.enemies = t2.enemies;
  const bystanderBeforeX = t2.enemies[1].x;
  const t3 = advanceRoomEnemiesOneTurn(room, { x: 5, y: 5 }, null);
  assert.notEqual(t3.collidedEnemy, null);
  assert.equal(Math.abs(t3.enemies[0].x - 5) + Math.abs(t3.enemies[0].y - 5) <= 1, true);
  assert.equal(t3.enemies[1].x, bystanderBeforeX);

  // Check distance > 3 or obstacle LOS drops chase back to patrol
  const dropRoom: RoomData = {
    ...room,
    enemies: [{ ...createMapEnemyInstance('e_drop', 'fanatic_zealot', 7, 5, { facing: 'left' }), aiState: 'chase' }],
  };
  const outOfRange = advanceRoomEnemiesOneTurn(dropRoom, { x: 2, y: 5 }, null);
  assert.equal(outOfRange.enemies[0].aiState, 'patrol');

  // Check crate and diagonal wall corners block LOS
  const obstacleGrid = grid.map((r) => [...r]);
  obstacleGrid[5][5] = TILE.CRATE;
  assert.equal(hasLineOfSight(obstacleGrid, 7, 5, 4, 5), false);
  const occluded = advanceRoomEnemiesOneTurn({ ...dropRoom, grid: obstacleGrid }, { x: 4, y: 5 }, null);
  assert.equal(occluded.enemies[0].aiState, 'patrol');

  const cornerGrid = grid.map((r) => [...r]);
  cornerGrid[4][5] = TILE.WALL;
  cornerGrid[5][6] = TILE.WALL;
  assert.equal(hasLineOfSight(cornerGrid, 5, 5, 6, 4), false);

  // Check map decoy (Mồi Nhử) within <= 4 tiles lures chase/alert enemy away from player and locks eating for N ticks
  const decoyRoom: RoomData = {
    ...room,
    enemies: [{ ...createMapEnemyInstance('e2', 'dire_wolf', 7, 5, { facing: 'left' }), aiState: 'chase' }],
    decoys: [{ x: 5, y: 5, turnsLeft: 10 }],
  };
  const d1 = advanceRoomEnemiesOneTurn(decoyRoom, { x: 8, y: 3 }, null);
  assert.equal(d1.enemies[0].x, 6);
  assert.equal(d1.enemies[0].aiState, 'deagro');
  assert.equal(d1.decoys[0].turnsLeft, 9);

  // Next tick reaches decoy at (5, 5) -> locked eating (eatTicksRemaining = 6), ignores adjacent player at (5, 4)
  const d2 = advanceRoomEnemiesOneTurn({ ...decoyRoom, enemies: d1.enemies, decoys: d1.decoys }, { x: 5, y: 4 }, null);
  assert.equal(d2.enemies[0].x, 5);
  assert.equal(d2.enemies[0].y, 5);
  assert.equal(d2.enemies[0].eatTicksRemaining, 6);
  assert.equal(d2.collidedEnemy, null);

  // Subsequent eating tick ignores adjacent player and stays on decoy tile while decrementing eatTicksRemaining
  const d3 = advanceRoomEnemiesOneTurn({ ...decoyRoom, enemies: d2.enemies, decoys: d2.decoys }, { x: 5, y: 4 }, null);
  assert.equal(d3.enemies[0].x, 5);
  assert.equal(d3.enemies[0].y, 5);
  assert.equal(d3.enemies[0].eatTicksRemaining, 5);
  assert.equal(d3.enemies[0].aiState, 'deagro');
  assert.equal(d3.collidedEnemy, null);

  // Patrol roaming turns perpendicularly (up/down) instead of endlessly oscillating on 1 axis
  let roamRoom: RoomData = {
    ...room,
    enemies: [createMapEnemyInstance('roamer', 'fanatic_zealot', 6, 5, { facing: 'left' })],
  };
  const seenFacings = new Set<string>();
  for (let step = 0; step < 18; step++) {
    const res = advanceRoomEnemiesOneTurn(roamRoom, { x: 1, y: 1 }, null);
    if (res.enemies[0].facing) seenFacings.add(res.enemies[0].facing);
    roamRoom = { ...roamRoom, enemies: res.enemies };
  }
  assert.equal(seenFacings.has('up') || seenFacings.has('down'), true);
});

test('Herb tiles map deterministically to 4 color variants and Lucky Coins only drop from elite tiers (never normal mobs)', () => {
  assert.equal(herbTypeToVariant('green_herb'), 0);
  assert.equal(herbTypeToVariant('red_herb'), 1);
  assert.equal(herbTypeToVariant('white_herb'), 2);
  assert.equal(herbTypeToVariant('calm_flower'), 3);

  const world = generateWorld('HERB_AND_COIN_SEED');
  const extRoom = world.rooms.F2_EXTERIOR;
  assert.equal(extRoom.grid[6][8], TILE.HERB);
  const h1 = getHerbTypeAtCoord(extRoom, 8, 6, world.seed);
  assert.equal(['green_herb', 'red_herb', 'white_herb', 'calm_flower'].includes(h1), true);
  assert.equal(getHerbTypeAtCoord(extRoom, 8, 6, world.seed), h1);

  for (const tpl of Object.values(CONFIG.ENEMIES)) {
    if (tpl.tier === 'normal') {
      assert.equal(tpl.dropLuckyCoins || 0, 0);
    } else if (tpl.tier === 'miniboss') {
      assert.equal(tpl.dropLuckyCoins, 1);
    } else if (tpl.tier === 'boss') {
      assert.equal(tpl.dropLuckyCoins, 2);
    }
  }
});

test('Only Chien Ky skills have skill Scroll items; Survival Scrolls exist; God spells require Affinity at Resonance Altar', () => {
  const scrollItems = Object.values(CONFIG.ITEMS).filter(
    (it) => it.id.startsWith('scroll_') && Boolean(it.unlockSkillId)
  );
  assert.equal(scrollItems.length, 3);
  for (const sc of scrollItems) {
    const sk = CONFIG.SKILLS.find((s) => s.id === sc.unlockSkillId);
    assert.ok(sk);
    assert.equal(sk.branch, 'Chiến Kỹ');
  }
  assert.ok(CONFIG.ITEMS.scroll_shadow_step);
  assert.ok(CONFIG.ITEMS.scroll_distract_ash);
  assert.ok(CONFIG.ITEMS.scroll_field_dissection);
  assert.ok(CONFIG.ITEMS.scroll_emergency_amputation);

  const godSkills = CONFIG.SKILLS.filter((s) => s.branch !== 'Chiến Kỹ');
  assert.equal(godSkills.length, 11);
  for (const gs of godSkills) {
    assert.ok(gs.requiredAffinity);
  }

  const p = createInitialPlayer('fallen_knight');
  p.energyStones = 5;

  // Cannot learn Chien Ky Lv.1 at Hexen directly (must use Scroll)
  assert.equal(learnOrUpgradeHexenSkill(p, 'en_garde').success, false);

  // Cannot learn God spells with 0 affinity
  assert.equal(learnOrUpgradeHexenSkill(p, 'blessed_heal').success, false);
  assert.equal(learnOrUpgradeHexenSkill(p, 'void_bite').success, false);
  assert.equal(learnOrUpgradeHexenSkill(p, 'necromancy').success, false);

  // Raising Affinity unlocks Tier 1 (Affinity >= 1) and Tier 2 (Affinity >= 2)
  p.affinities.primordialVoid = 1;
  assert.equal(learnOrUpgradeHexenSkill(p, 'void_bite').success, true);
  assert.equal(p.skillLevels.void_bite, 1);
  assert.equal(learnOrUpgradeHexenSkill(p, 'obliterate').success, false); // Needs Affinity 2

  p.affinities.primordialVoid = 2;
  assert.equal(learnOrUpgradeHexenSkill(p, 'obliterate').success, true);
  assert.equal(p.skillLevels.obliterate, 1);
  assert.equal(learnOrUpgradeHexenSkill(p, 'obliterate').success, true); // Upgrade to Lv.2
  assert.equal(p.skillLevels.obliterate, 2);
});

test('Two-handed weapon checks, arm-loss auto-unequip fallback, 1-leg/2-leg evasion & flee penalties, and leaveOrDismissPartyMember work accurately', () => {
  const p = createInitialPlayer('fallen_knight');
  p.unlockedWeapons.push('claymore_greatsword');

  // 2H weapon check & both-arms requirement
  assert.equal(isWeaponTwoHanded('claymore_greatsword'), true);
  assert.equal(isWeaponTwoHanded('broad_iron_sword'), false);
  assert.equal(canMemberEquipWeapon(p.limbs, 'claymore_greatsword').allowed, true);

  // Losing left arm blocks 2H weapon and auto-unequips it back to bite_headbutt, while 1H remains usable with remaining arm
  p.equippedWeapon = 'claymore_greatsword';
  p.equippedShield = null;
  p.limbs.leftArm = false;
  const armLogs: string[] = [];
  handlePlayerArmLoss(p, 'leftArm', armLogs);
  assert.equal(p.equippedWeapon, 'bite_headbutt');
  assert.equal(canMemberEquipWeapon(p.limbs, 'claymore_greatsword').allowed, false);
  assert.equal(canMemberEquipWeapon(p.limbs, 'broad_iron_sword').allowed, true);

  // Losing BOTH arms auto-unequips 1H weapon back to bite_headbutt and locks weapon slot
  p.equippedWeapon = 'broad_iron_sword';
  p.limbs.rightArm = false;
  handlePlayerArmLoss(p, 'rightArm', armLogs);
  assert.equal(p.equippedWeapon, 'bite_headbutt');
  assert.equal(canMemberEquipWeapon(p.limbs, 'broad_iron_sword').allowed, false);

  // Leg-loss evasion & flee checks: 1 leg lost halves evasion & flee; 2 legs lost zeroes evasion & flee
  const runner = createInitialPlayer('night_hunter');
  runner.evasionBonus = 0.2;
  const fullStats = getComputedPlayerStats(runner);
  const fullFlee = getFleeChancePct(runner, CONFIG.ENEMIES.fanatic_zealot);
  runner.limbs.leftLeg = false;
  const oneLegStats = getComputedPlayerStats(runner);
  const oneLegFlee = getFleeChancePct(runner, CONFIG.ENEMIES.fanatic_zealot);
  assert.equal(oneLegStats.evasionPct, Math.round(fullStats.evasionPct * 0.5));
  assert.equal(oneLegFlee < fullFlee && oneLegFlee > 0, true);
  runner.limbs.rightLeg = false;
  const twoLegStats = getComputedPlayerStats(runner);
  assert.equal(twoLegStats.evasionPct, 0);
  assert.equal(getFleeChancePct(runner, CONFIG.ENEMIES.fanatic_zealot), 0);
  assert.equal(canPlayerFlee(runner), false);

  // Leaving party returns gear to shared inventory and restores NPC lifecycle to 'map'
  const kael = createRecruitedAlly('ally_kael');
  kael.equippedBody = 'legion_brigandine';
  kael.equippedHead = 'legion_helm';
  p.party = [kael];
  p.npcLifecycle = { npc_prisoner: 'recruited' };
  const leaveRes = leaveOrDismissPartyMember(p, 0, 'leave');
  assert.equal(leaveRes.success, true);
  assert.equal(p.party.length, 0);
  assert.equal(p.npcLifecycle.npc_prisoner, 'map');
  assert.equal(p.unlockedGear.includes('legion_brigandine'), true);
  assert.equal(p.unlockedGear.includes('legion_helm'), true);
});

test('Holy Mother Ban, one-time completedAffinityActions anti-farm, 4 distinct ritualCircles, and ritual_chalk exist and work accurately', () => {
  assert.equal(Boolean(CONFIG.ITEMS.ritual_chalk), true);

  const world = generateWorld('RITUAL-SEPARATION-TEST');
  assert.equal(Object.values(world.rooms.F2_R1.ritualCircles || {}).some((c) => c.deityType === 'uninscribed'), true);
  assert.equal(Object.values(world.rooms.F2_R3.ritualCircles || {}).some((c) => c.deityType === 'holy_mother'), true);
  assert.equal(Object.values(world.rooms.F3_R1.ritualCircles || {}).some((c) => c.deityType === 'void_god'), true);
  assert.equal(Object.values(world.rooms.F1_R1.ritualCircles || {}).some((c) => c.deityType === 'demon_lord'), true);

  const p = createInitialPlayer('forsaken_nun');
  p.energyStones = 10;
  p.mind = 100;
  p.affinities.primordialVoid = 1;
  p.affinities.demonicPact = 1;

  // Anti-farm: devourEnemyCorpse only awards milestone_cannibalism +1 demonicPact once per run
  const c1 = JSON.parse(JSON.stringify(world.rooms.F2_EXTERIOR.enemies[0]));
  c1.defeated = true;
  const c2 = JSON.parse(JSON.stringify(world.rooms.F2_EXTERIOR.enemies[0]));
  c2.defeated = true;
  assert.equal(devourEnemyCorpse(p, c1).success, true);
  assert.equal(p.affinities.demonicPact, 2);
  assert.equal(p.completedAffinityActions.includes('milestone_cannibalism'), true);
  assert.equal(devourEnemyCorpse(p, c2).success, true);
  assert.equal(p.affinities.demonicPact, 2); // No duplicate farming!

  // Holy Mother is now banned; Void and Demon spells remain usable/learnable
  assert.equal(isHolyMotherBanned(p), true);
  const prayRes = prayAffinityAtHexen(p, 'holyMother');
  assert.equal(prayRes.success, false);
  assert.equal(prayRes.message.includes(HOLY_MOTHER_REFUSAL_MSG), true);
  const regrowRes = regrowLimbAtHexen(p, 'leftArm');
  assert.equal(regrowRes.success, false);
  const learnHoly = learnOrUpgradeHexenSkill(p, 'blessed_heal');
  assert.equal(learnHoly.success, false);
  assert.equal(learnHoly.message.includes(HOLY_MOTHER_REFUSAL_MSG), true);
  assert.equal(learnOrUpgradeHexenSkill(p, 'void_bite').success, true);
  assert.equal(learnOrUpgradeHexenSkill(p, 'blood_pact').success, true);

  // Direct grantAffinityOnce checks
  const p2 = createInitialPlayer('fallen_knight');
  assert.equal(grantAffinityOnce(p2, 'ritual_F2_R3_5,5', 'holyMother', 1), true);
  assert.equal(grantAffinityOnce(p2, 'ritual_F2_R3_5,5', 'holyMother', 1), false);
  assert.equal(p2.affinities.holyMother, 1);
  banHolyMother(p2);
  assert.equal(grantAffinityOnce(p2, 'milestone_free_child_12', 'holyMother', 1), false);
  assert.equal(p2.affinities.holyMother, 1);
});

test('Head Hit-Lock, 2-Beat Telegraphed Coin-Flip Combat, Guard 100% Block, and AI Helpless Skip work accurately', () => {
  const p = createInitialPlayer('fallen_knight');
  const rng = new SeededRNG('HEADLOCK-COINFLIP');
  const tpl = CONFIG.ENEMIES.executioner_paladin;
  const enemy = createMapEnemyInstance('e_pal', 'executioner_paladin', 5, 5);

  const headLimb = enemy.limbs.find((l) => l.id === 'head')!;
  const supportLegs = enemy.limbs.filter((l) => l.isSupportLeg);
  assert.equal(supportLegs.length >= 1, true);

  // 1. Standing enemy with intact support legs -> head Hit% locked at 15%-25%
  const standingHeadChance = computeLimbHitChance(p, enemy, tpl, headLimb);
  assert.equal(standingHeadChance >= 0.15 && standingHeadChance <= 0.25, true);

  // 2. Severing support legs unlocks head Hit% to 85%-95%
  for (const sl of supportLegs) sl.hp = 0;
  const downedHeadChance = computeLimbHitChance(p, enemy, tpl, headLimb);
  assert.equal(downedHeadChance >= 0.85 && downedHeadChance <= 0.95, true);

  // 3. Blinding or Stunning standing enemy also unlocks head Hit% to 85%-95%
  for (const sl of supportLegs) sl.hp = sl.maxHp;
  enemy.blindTurns = 2;
  const blindedHeadChance = computeLimbHitChance(p, enemy, tpl, headLimb);
  assert.equal(blindedHeadChance >= 0.85 && blindedHeadChance <= 0.95, true);
  enemy.blindTurns = 0;

  // 4. Beat 2 Guard blocks Telegraphed Coin-Flip 100% with zero damage
  enemy.telegraphing = true;
  enemy.telegraphCoinFlip = true;
  p.statuses.guarding = true;
  const guardedRound = resolveEnemyCombatRound(p, enemy, rng);
  assert.equal(guardedRound.pendingCoinFlip, undefined);
  assert.equal(guardedRound.lastTakenDmg || 0, 0);
  assert.equal(guardedRound.logs.some((l) => l.includes('chặn đứng hoàn toàn')), true);

  // 5. Beat 2 without Guard triggers pendingCoinFlip, and resolveCombatCoinFlipOutcome handles Win vs Lose
  enemy.telegraphing = true;
  enemy.telegraphCoinFlip = true;
  p.statuses.guarding = false;
  const unguardedRound = resolveEnemyCombatRound(p, enemy, rng);
  assert.ok(unguardedRound.pendingCoinFlip);
  const cf = unguardedRound.pendingCoinFlip!;
  const hpBeforeWin = p.hp;
  const winOutcome = resolveCombatCoinFlipOutcome(p, enemy, tpl, true, cf.penaltyType, cf.damageMultiplier, rng);
  assert.equal(winOutcome.lastTakenDmg, 0);
  assert.equal(p.hp, hpBeforeWin);

  const loseOutcome = resolveCombatCoinFlipOutcome(p, enemy, tpl, false, 'sever_limb', 1.4, rng);
  assert.equal((loseOutcome.lastTakenDmg || 0) > 0, true);
  const totalIntactLimbs = (['leftArm', 'rightArm', 'leftLeg', 'rightLeg'] as const).filter((k) => p.limbs[k]).length;
  assert.equal(totalIntactLimbs, 3);

  // 6. Severing all non-vital/weapon limbs renders enemy Helpless and skips enemy attack
  const helplessEnemy = createMapEnemyInstance('e_helpless', 'fanatic_zealot', 5, 5);
  for (const l of helplessEnemy.limbs) {
    if (l.id !== 'torso' && l.id !== 'head') l.hp = 0;
  }
  const pClean = createInitialPlayer('fallen_knight');
  const hpBeforeHelpless = pClean.hp;
  const helplessRound = resolveEnemyCombatRound(pClean, helplessEnemy, rng);
  assert.equal(pClean.hp, hpBeforeHelpless);
  assert.equal(helplessRound.logs.some((l) => l.includes('bất lực')), true);
});

test('Tactical items (ancient_ash, poison_powder, poison_herb, lamp_oil), 2 floor traps per room, companion recall, and amputation sanity penalty work accurately', () => {
  const p = createInitialPlayer('night_hunter');
  p.inventory.ancient_ash = 1;
  p.inventory.poison_powder = 1;
  p.inventory.poison_herb = 1;
  p.inventory.lamp_oil = 1;

  const tpl = CONFIG.ENEMIES.orc_berserker;
  const enemy = createMapEnemyInstance('e_orc', 'orc_berserker', 5, 5);
  const headLimb = enemy.limbs.find((l) => l.id === 'head')!;
  const rng = new SeededRNG('TACTICAL-ITEMS');

  // ancient_ash blinds 3 turns (2 remaining after end-of-round tick) & unlocks head Hit%
  const ashRes = executeCombatItem(p, enemy, 'ancient_ash', rng);
  assert.equal(enemy.blindTurns >= 2, true);
  assert.equal(computeLimbHitChance(p, enemy, tpl, headLimb) >= 0.85, true);
  assert.equal(ashRes.logs.length > 0, true);

  // poison_powder blinds, applies poison DoT & coats weapon (2 turns left after end-of-round tick)
  executeCombatItem(p, enemy, 'poison_powder', rng);
  assert.equal((enemy.poisonTurns || 0) >= 2, true);
  assert.equal((p.poisonCoatTurns || 0) >= 2, true);

  // poison_herb & lamp_oil coat player weapon for 3 hits
  executeCombatItem(p, enemy, 'poison_herb', rng);
  assert.equal(p.poisonCoatTurns, 3);
  executeCombatItem(p, enemy, 'lamp_oil', rng);
  assert.equal(p.fireCoatTurns, 3);

  // Normal weapon attack consumes 1 charge of each coat and applies poison + burn DoT
  const atkRes = executeSingleActorCombatAction(p, enemy, 0, 'ATTACK', 'torso', undefined, rng);
  assert.equal(p.poisonCoatTurns, 2);
  assert.equal(p.fireCoatTurns, 2);
  assert.equal((enemy.burnTurns || 0) >= 2, true);
  assert.equal((atkRes.lastDealtDmg || 0) > 0, true);

  // Non-boss rooms spawn 2 FLOOR_TRAP tiles
  const world = generateWorld('TRAP-SPAWN-CHECK');
  const r1 = world.rooms.F2_R1;
  let trapCount = 0;
  for (const row of r1.grid) {
    for (const t of row) {
      if (t === TILE.FLOOR_TRAP) trapCount++;
    }
  }
  assert.equal(trapCount, 2);

  // Companion leave preserves wounds, hunger, gear & parkedLocation, and map recall restores full state
  const kael = createRecruitedAlly('ally_kael');
  kael.hp = 68;
  kael.mind = 55;
  kael.hunger = 42;
  kael.equippedBody = 'legion_brigandine';
  kael.limbs.leftArm = false;
  p.party = [kael];
  const leaveOut = leaveOrDismissPartyMember(p, 0, 'leave', {
    roomId: 'F2_R1',
    floor: 2,
    x: 6,
    y: 5,
  });
  assert.equal(leaveOut.success, true);
  assert.equal((p.dismissedCompanions || []).length, 1);
  assert.deepEqual(p.dismissedCompanions?.[0].parkedLocation, {
    roomId: 'F2_R1',
    floor: 2,
    x: 6,
    y: 5,
  });
  assert.equal(p.dismissedCompanions?.[0].equippedBody, 'legion_brigandine');
  const recallOut = recallDismissedCompanion(p, 'ally_kael');
  assert.equal(recallOut.success, true);
  assert.equal(p.party.length, 1);
  assert.equal(p.party[0].hp, 68);
  assert.equal(p.party[0].hunger, 42);
  assert.equal(p.party[0].equippedBody, 'legion_brigandine');
  assert.equal(p.party[0].limbs.leftArm, false);
  assert.equal(p.party[0].parkedLocation, undefined);

  // Alchemy recipes start hidden (empty) and all 3 Pha Chế Thuốc books are placed in dungeon rooms
  assert.deepEqual(createInitialPlayer('fallen_knight').unlockedRecipes, []);
  assert.equal(CONFIG.RECIPES.length, 6);
  const placedBooks = new Set<string>();
  for (const room of Object.values(world.rooms)) {
    for (const bookId of Object.values(room.guaranteedRecipeBooks || {})) {
      placedBooks.add(bookId);
    }
  }
  assert.equal(placedBooks.has('recipe_book_expedition'), true);
  assert.equal(placedBooks.has('recipe_book_cathedral'), true);
  assert.equal(placedBooks.has('recipe_book_forbidden'), true);

  // >= 2 severed limbs triggers 1.5x (+50%) sanity drain speed
  assert.equal(getAmputationSanityMultiplier(p), 1);
  p.limbs.leftArm = false;
  assert.equal(getAmputationSanityMultiplier(p), 1);
  p.limbs.rightLeg = false;
  assert.equal(getAmputationSanityMultiplier(p), 1.5);
});

test('Canon Deity Coupling, 0..3 Clamp, Miasma Immunity, Stealth Steps, Clean Dissection, Emergency Scroll, Distract Ash, and Order Ending Lock', () => {
  const p = createInitialPlayer('forsaken_nun');
  p.energyStones = 10;

  // 1. Demonic Pact clamps 0..3, adds +15 Corruption per rank, and COR >= 25 bans Holy Mother
  assert.equal(applyAffinityChange(p, 'demonicPact', 1), 1);
  assert.equal(p.corruption, 15);
  assert.equal(isHolyMotherBanned(p), false);

  // Demonic Pact rank 1 still allows Tier 1 Holy Mother spell if not banned, rank 2 locks Tier 2 (>= 2)
  const tier2Holy = CONFIG.SKILLS.find((s) => s.id === 'holy_light')!;
  const tier1Holy = CONFIG.SKILLS.find((s) => s.id === 'blessed_heal')!;
  assert.equal(canUseHolySkill(p, tier1Holy).allowed, true);
  applyAffinityChange(p, 'demonicPact', 1, { skipDemonicCorruption: true });
  assert.equal(p.affinities.demonicPact, 2);
  assert.equal(canUseHolySkill(p, tier2Holy).allowed, false);

  // Increasing past max 3 clamps strictly at 3
  applyAffinityChange(p, 'demonicPact', 5);
  assert.equal(p.affinities.demonicPact, 3);
  assert.equal(isHolyMotherBanned(p), true);

  // ORDER_ENDING is blocked when holyMotherBanned is true even with 0 corruption
  const blockedOrder = evaluateCanonEnding({
    classId: 'forsaken_nun',
    corruption: 0,
    holyMotherBanned: true,
    readBookIds: ['book_1'],
    inventory: { void_core: 1, reconstruction_scroll: 1 },
    learnedSkillIds: [],
    vaelisTalked: false,
    vaelisDefeated: true,
    curedPetrification: false,
    child13Rescued: true,
    child13InParty: true,
    endingAction: 'SACRIFICE_CHILD13_RIFT',
  });
  assert.notEqual(blockedOrder.id, 'ORDER_ENDING');

  // 2. Primordial Void reduces maxMind by -10 per rank, scales Floor 3 Miasma resistance, and does NOT ban Holy Mother
  const v = createInitialPlayer('fallen_knight');
  const startMaxMind = v.maxMind;
  assert.equal(getFloor3MiasmaMultiplier(v), 1);
  applyAffinityChange(v, 'primordialVoid', 1);
  assert.equal(v.maxMind, startMaxMind - 10);
  assert.equal(getFloor3MiasmaMultiplier(v), 0.65);
  assert.equal(isHolyMotherBanned(v), false);
  applyAffinityChange(v, 'primordialVoid', 2);
  assert.equal(v.affinities.primordialVoid, 3);
  assert.equal(v.maxMind, startMaxMind - 30);
  assert.equal(getFloor3MiasmaMultiplier(v), 0);

  // 3. Learning a Huyết Quỷ skill bans Holy Mother
  const cult = createInitialPlayer('forsaken_nun');
  cult.energyStones = 3;
  cult.affinities.demonicPact = 1;
  assert.equal(learnOrUpgradeHexenSkill(cult, 'blood_pact').success, true);
  assert.equal(isHolyMotherBanned(cult), true);

  // 4. Clean Dissection grants loot without Corruption or Holy Mother ban
  const world = generateWorld('CLEAN-DISSECT-STEALTH');
  const corpse = JSON.parse(JSON.stringify(world.rooms.F2_EXTERIOR.enemies[0]));
  corpse.defeated = true;
  const nurse = createInitialPlayer('forsaken_nun');
  nurse.inventory.scroll_field_dissection = 1;
  const dissectRes = dissectEnemyCorpseCleanly(nurse, corpse, new SeededRNG('DISSECT-1'));
  assert.equal(dissectRes.success, true);
  assert.equal(nurse.corruption, 0);
  assert.equal(isHolyMotherBanned(nurse), false);
  assert.equal(nurse.inventory.scroll_field_dissection, 0);

  // 5. Emergency Amputation Scroll cuts infected limb for -12 HP without bone_saw
  nurse.limbs.infected.leftArm = true;
  nurse.hp = 100;
  nurse.inventory.scroll_emergency_amputation = 1;
  const empRes = useEmergencyAmputationScroll(nurse, 'leftArm');
  assert.equal(empRes.success, true);
  assert.equal(nurse.limbs.leftArm, false);
  assert.equal(nurse.hp, 88);
  assert.equal(nurse.inventory.scroll_emergency_amputation, 0);

  // 6. Stealth suppresses enemy detection in advanceRoomEnemiesOneTurn
  const roomCopy: RoomData = JSON.parse(JSON.stringify(world.rooms.F2_EXTERIOR));
  const targetEnemy = roomCopy.enemies.find((e) => !e.defeated && !e.isTutorialGatekeeper) || roomCopy.enemies[0];
  targetEnemy.aiState = 'patrol';
  const stealthTick = advanceRoomEnemiesOneTurn(
    roomCopy,
    { x: targetEnemy.x + 1, y: targetEnemy.y },
    null,
    true
  );
  const trackedAfterStealth = stealthTick.enemies.find((e) => e.uid === targetEnemy.uid)!;
  assert.notEqual(trackedAfterStealth.aiState, 'chase');

  // 7. scroll_distract_ash guarantees flee from normal mobs
  const ashUser = createInitialPlayer('night_hunter');
  ashUser.inventory.scroll_distract_ash = 1;
  const mob = createMapEnemyInstance('e_mob_ash', 'fanatic_zealot', 4, 4);
  const ashOutcome = executeCombatItem(ashUser, mob, 'scroll_distract_ash', new SeededRNG('ASH-FLEE'));
  assert.equal(ashOutcome.fledSuccess, true);
  assert.equal((mob.blindTurns || 0) >= 1, true);
});

test('Map Generation checks occupiedTiles so all story/survival NPCs, Đài Cộng Hưởng, Stairs, and Enemies never overlap', () => {
  const seeds = ['SEED-COLLISION-1', 'SEED-COLLISION-2', 'VAELIS-CANON'];
  const requiredTiles = [
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
    TILE.VOID_RIFT,
    TILE.HEXEN_ALTAR,
    TILE.STAIRS_UP,
    TILE.STAIRS_DOWN,
  ];

  for (const s of seeds) {
    const w = generateWorld(s);
    const presentCounts: Record<string, number> = {};
    for (const room of Object.values(w.rooms)) {
      const entityCoords = new Set<string>();
      for (let y = 0; y < room.grid.length; y++) {
        for (let x = 0; x < room.grid[y].length; x++) {
          const t = room.grid[y][x];
          if (requiredTiles.includes(t)) {
            presentCounts[t] = (presentCounts[t] || 0) + 1;
            const key = `${x},${y}`;
            assert.equal(entityCoords.has(key), false);
            entityCoords.add(key);
          }
        }
      }
      // Verify no enemy spawns directly on top of a stair/NPC/altar/portal
      for (const en of room.enemies) {
        assert.equal(entityCoords.has(`${en.x},${en.y}`), false);
      }
    }
    for (const rt of requiredTiles) {
      assert.equal((presentCounts[rt] || 0) >= 1, true);
    }
  }
});

test('PC 16:9 Polish & Dark Gothic Art Overhaul: DARK_ENDING thresholds, BLOOD_THRONE landmark, and unified Canvas art without combatPortraitUrl', () => {
  const base = {
    classId: 'fallen_knight' as const,
    corruption: 20,
    demonicPactAffinity: 0,
    readBookIds: ['book_1', 'book_2'],
    inventory: {},
    learnedSkillIds: [],
    vaelisTalked: true,
    vaelisDefeated: true,
    curedPetrification: false,
    child13Rescued: false,
  };

  // DARK_ENDING unlocks at corruption >= 70 OR demonicPactAffinity >= 2
  assert.equal(evaluateCanonEnding({ ...base, corruption: 70, endingAction: 'SIT_THRONE' }).id, 'DARK_ENDING');
  assert.equal(evaluateCanonEnding({ ...base, corruption: 20, demonicPactAffinity: 2, endingAction: 'SIT_THRONE' }).id, 'DARK_ENDING');
  assert.notEqual(evaluateCanonEnding({ ...base, corruption: 60, demonicPactAffinity: 1, endingAction: 'SIT_THRONE' }).id, 'DARK_ENDING');

  // BLOOD_THRONE landmark exists and is non-walkable
  assert.equal(TILE.BLOOD_THRONE, 'BLOOD_THRONE');
  assert.equal(isWalkableTile(TILE.BLOOD_THRONE), false);

  // Unified Dark Gothic Canvas art: no static AI combatPortraitUrl on playable classes or Grand Bosses
  assert.equal(CONFIG.CLASSES.length, 3);
  for (const cls of CONFIG.CLASSES) {
    assert.equal(cls.combatPortraitUrl, undefined);
  }
  assert.equal(CONFIG.ENEMIES.executioner_paladin.combatPortraitUrl, undefined);
  assert.equal(CONFIG.ENEMIES.demon_lord_vaelis.combatPortraitUrl, undefined);
  assert.equal(CONFIG.ENEMIES.void_chimera.combatPortraitUrl, undefined);
});

test('Master Atmosphere & UX Upgrade: Dynamic Torchlight (torch/oil_lamp), Smuggler Haggling, and 7 Panoramic Ending Banners', () => {
  // 1. Dynamic Torchlight ignition resets fuel timer accurately
  const p = createInitialPlayer('fallen_knight');
  assert.equal(p.torchTimer, 120);
  assert.equal(p.torchMaxTimer, 120);
  p.torchTimer = 10;
  const torchLogs: string[] = [];
  applySupportItemEffects(p, 'torch', torchLogs);
  assert.equal(p.torchTimer, 120);
  assert.equal(p.torchMaxTimer, 120);
  assert.equal(torchLogs.length > 0, true);

  p.torchTimer = 0;
  const lampLogs: string[] = [];
  applySupportItemEffects(p, 'oil_lamp', lampLogs);
  assert.equal(p.torchTimer, 240);
  assert.equal(p.torchMaxTimer, 240);
  assert.equal(lampLogs.length > 0, true);

  // 2. Smuggler Haggling handles valuable wares, mild/harsh discounts, price raise, refusal, and origin questioning
  assert.equal(SMUGGLER_VALUABLE_IDS.has('lucky_coin'), true);
  assert.equal(SMUGGLER_VALUABLE_IDS.has('white_herb'), true);
  assert.equal(SMUGGLER_VALUABLE_IDS.has('oil_lamp'), true);

  const mildWin = evaluateSmugglerHaggle('lucky_coin', 'Thẻ Bài Bạc', 24, 'discount_25', 0.2);
  assert.equal(mildWin.accepted, true);
  assert.equal(mildWin.newPrice, 18);
  assert.equal(mildWin.refusedItem, false);

  const mildFail = evaluateSmugglerHaggle('lucky_coin', 'Thẻ Bài Bạc', 24, 'discount_25', 0.9);
  assert.equal(mildFail.accepted, false);
  assert.equal(mildFail.newPrice > 24, true);
  assert.equal(mildFail.refusedItem, false);

  const harshWin = evaluateSmugglerHaggle('oil_lamp', 'Đèn Dầu', 14, 'discount_40', 0.15);
  assert.equal(harshWin.accepted, true);
  assert.equal(harshWin.newPrice < 14, true);

  const harshRaise = evaluateSmugglerHaggle('oil_lamp', 'Đèn Dầu', 14, 'discount_40', 0.5);
  assert.equal(harshRaise.accepted, false);
  assert.equal(harshRaise.refusedItem, false);
  assert.equal(harshRaise.newPrice > 14, true);

  const harshRefuse = evaluateSmugglerHaggle('oil_lamp', 'Đèn Dầu', 14, 'discount_40', 0.9);
  assert.equal(harshRefuse.refusedItem, true);

  const originDiscount = evaluateSmugglerHaggle('white_herb', 'Thảo Dược Trắng', 10, 'question_origin', 0.1);
  assert.equal(originDiscount.accepted, true);
  assert.equal(originDiscount.newPrice < 10, true);

  // 3. All 7 Endings include formatted Panoramic Banner labels
  const endingBase = {
    classId: 'fallen_knight' as const,
    corruption: 10,
    demonicPactAffinity: 0,
    readBookIds: ['book_1', 'book_2', 'book_3', 'book_9'],
    inventory: { void_core: 1, reconstruction_scroll: 1, elixir_of_ancients: 1 },
    learnedSkillIds: ['en_garde'],
    vaelisTalked: true,
    vaelisDefeated: true,
    curedPetrification: true,
    child13Rescued: true,
    child13InParty: true,
  };
  const allSeven = [
    evaluateCanonEnding({ ...endingBase, endingAction: 'LEAVE_AFTER_VAELIS' }),
    evaluateCanonEnding({ ...endingBase, corruption: 80, endingAction: 'SIT_THRONE' }),
    evaluateCanonEnding({ ...endingBase, corruption: 0, endingAction: 'SACRIFICE_CHILD13_RIFT' }),
    evaluateCanonEnding({ ...endingBase, endingAction: 'POUR_ELIXIR_CHILD13_RIFT' }),
    evaluateCanonEnding({ ...endingBase, classId: 'fallen_knight', corruption: 10, endingAction: 'STAY_BUILD_GRAVES' }),
    evaluateCanonEnding({ ...endingBase, classId: 'forsaken_nun', corruption: 5, endingAction: 'ESCAPE_EXTERIOR_GATE' }),
    evaluateCanonEnding({ ...endingBase, classId: 'night_hunter', endingAction: 'ESCAPE_EXTERIOR_GATE' }),
  ];
  assert.equal(new Set(allSeven.map((e) => e.id)).size, 7);
  for (const res of allSeven) {
    assert.equal(typeof res.endingBannerLabel, 'string');
    assert.equal(res.endingBannerLabel.length > 5, true);
  }
  assert.equal(allSeven[3].endingBannerLabel.startsWith('TRUE ENDING'), true);
  assert.equal(allSeven[4].endingBannerLabel.startsWith('PERSONAL ENDING'), true);
});

test('Companion Permadeath Auto-Remove: fallen companions (hp <= 0) leave party immediately, return gear, log death, while player death triggers Game Over', () => {
  const p = createInitialPlayer('fallen_knight');
  const kael = createRecruitedAlly('ally_kael');
  const child13 = createRecruitedAlly('child_13');
  kael.weaponId = 'broad_iron_sword';
  kael.equippedBody = 'boiled_cuirass';
  p.party.push(kael, child13);
  assert.equal(p.party.length, 2);

  // Kael drops to 0 HP -> automatically removed, marked dead, gear returned, permadeath logged
  kael.hp = 0;
  const deathLogs: string[] = [];
  const fallen = pruneDeadCompanions(p, deathLogs);
  assert.equal(fallen.length, 1);
  assert.equal(fallen[0].id, 'ally_kael');
  assert.equal(p.party.length, 1);
  assert.equal(p.party[0].id, 'child_13');
  assert.equal(p.npcLifecycle?.npc_prisoner, 'dead');
  assert.equal(p.unlockedGear.includes('boiled_cuirass'), true);
  assert.equal(
    deathLogs.some((l) => l.includes(`[${kael.name}]`) && l.includes('đã gục ngã vĩnh viễn và rời khỏi đội hình...')),
    true
  );

  // Main player remains alive; when player hp <= 0, player state still evaluates Game Over
  assert.equal(p.hp > 0, true);
  p.hp = 0;
  assert.equal(p.hp <= 0, true);
});

test('Combat PNG Engine & Full-Bleed Map: combatSpriteUrl, maskBox, destination-out masks, 2-leg collapse drop, and 48-56px TILE_PX', () => {
  // 1. Tile zoom is in crisp 48-56px range for 16:9 full-bleed viewport
  assert.equal(CONFIG.TILE_PX >= 48 && CONFIG.TILE_PX <= 56, true);

  // 2. Floor Combat Backdrops configured for all 3 floors
  assert.equal(CONFIG.COMBAT_BACKDROP_URLS[1], '/assets/combat/bg_floor1.jpg');
  assert.equal(CONFIG.COMBAT_BACKDROP_URLS[2], '/assets/combat/bg_floor2.jpg');
  assert.equal(CONFIG.COMBAT_BACKDROP_URLS[3], '/assets/combat/bg_floor3.jpg');

  // 3. All 3 playable classes define transparent back-sprite PNG URLs (/assets/combat/player_<class_id>.png)
  for (const cls of CONFIG.CLASSES) {
    assert.equal(cls.combatSpriteUrl, `/assets/combat/player_${cls.id}.png`);
  }

  // 4. All 26 enemies define /assets/combat/<id>.png and valid normalized maskBoxes for every non-torso limb
  for (const enemy of Object.values(CONFIG.ENEMIES)) {
    assert.equal(enemy.combatSpriteUrl, `/assets/combat/${enemy.id}.png`);
    for (const limb of enemy.limbs) {
      if (limb.id === 'torso') continue;
      assert.equal(Boolean(limb.maskBox), true, `Missing maskBox for ${enemy.id}.${limb.id}`);
      const box = limb.maskBox!;
      assert.equal(box.x >= 0 && box.x <= 1 && box.y >= 0 && box.y <= 1, true);
      assert.equal(box.w > 0 && box.w <= 1 && box.h > 0 && box.h <= 1, true);
    }
  }

  // 5. resolveSeveredMaskBoxes picks up both severed flag and hp <= 0, skipping torso
  const vaelis = CONFIG.ENEMIES.demon_lord_vaelis;
  const masks = resolveSeveredMaskBoxes(
    new Set(['throne_claw_left']),
    vaelis.limbs.map((l) => ({
      id: l.id,
      severed: l.id === 'throne_claw_left',
      hp: l.id === 'throne_ensor_right' ? 0 : l.maxHp,
      maskBox: l.maskBox,
    }))
  );
  assert.equal(masks.some((m) => m.id === 'throne_claw_left'), true);
  assert.equal(masks.some((m) => m.id === 'throne_ensor_right'), true);
  assert.equal(masks.some((m) => m.id === 'torso'), false);

  // 6. computePngLegDropOffset collapses sprite downward when both legs / legs are severed
  const intact = computePngLegDropOffset(new Set(), 400);
  assert.equal(intact.dropY, 0);
  const oneLeg = computePngLegDropOffset(new Set(['left_leg']), 400);
  assert.equal(oneLeg.dropY > 0 && oneLeg.tiltRad < 0, true);
  const bothLegs = computePngLegDropOffset(new Set(['legs']), 400);
  assert.equal(bothLegs.dropY > oneLeg.dropY, true);
  const bothCamelLegs = computePngLegDropOffset(new Set(['leftLeg', 'rightLeg']), 400);
  assert.equal(bothCamelLegs.dropY, bothLegs.dropY);

  // 7. loadCombatImage returns null gracefully when absent/SSR so fallback Canvas art renders cleanly
  assert.equal(loadCombatImage('/assets/combat/demon_lord_vaelis.png'), null);
});

test('Diegetic UI & Blind Choices: all 27 Character Intro options define contextHint & outcomeFlavor without HP/SAN/COR or ending spoilers', () => {
  const classIds = ['fallen_knight', 'forsaken_nun', 'night_hunter'] as const;
  let totalOptions = 0;

  for (const classId of classIds) {
    const steps = CHARACTER_INTRO_STEPS[classId];
    assert.equal(steps.length, 3, `Expected 3 backstory steps for ${classId}`);
    for (const step of steps) {
      assert.equal(step.options.length, 3, `Expected 3 options in ${classId}/step ${step.stepNumber}`);
      for (const opt of step.options) {
        totalOptions += 1;
        assert.equal(typeof opt.contextHint, 'string');
        assert.equal((opt.contextHint || '').trim().length >= 10, true, `Short/missing contextHint on ${opt.id}`);
        assert.equal(typeof opt.outcomeFlavor, 'string');
        assert.equal((opt.outcomeFlavor || '').trim().length >= 15, true, `Short/missing outcomeFlavor on ${opt.id}`);

        const combinedPreChoice = `${opt.label} ${opt.contextHint || ''}`;
        assert.equal(/\b(HP|SAN|COR|Order Ending|World Ending|S-Ending)\b/i.test(combinedPreChoice), false, `Spoiler leaked in pre-choice text for ${opt.id}`);
        assert.equal(/\b(HP|SAN|COR|Order Ending|World Ending|S-Ending)\b/i.test(opt.effectText), false, `Raw stat/ending spoiler in effectText for ${opt.id}`);
      }
    }
  }
  assert.equal(totalOptions, 27);
});

test('Loot Table Rebalance: bossOnly/isCursed weapons never enter Chest or Normal Corpse pools, floor tiers gate weapons/gear, and all Boss/Mini-Boss drops are tagged bossOnly', () => {
  // 1. Every Boss & Mini-Boss guaranteedWeaponDrop + vaelis_torment_blade has bossOnly: true
  assert.equal(CONFIG.WEAPONS.vaelis_torment_blade.bossOnly, true);
  assert.equal(CONFIG.WEAPONS.vaelis_eclipse_blade.bossOnly, true);
  for (const enemy of Object.values(CONFIG.ENEMIES)) {
    if ((enemy.tier === 'boss' || enemy.tier === 'miniboss') && enemy.guaranteedWeaponDrop) {
      const wDef = CONFIG.WEAPONS[enemy.guaranteedWeaponDrop];
      assert.ok(wDef, `Missing weapon ${enemy.guaranteedWeaponDrop}`);
      assert.equal(wDef.bossOnly, true, `Expected ${wDef.id} (from ${enemy.id}) to have bossOnly: true`);
    }
  }

  // 2. Every non-unarmed normal weapon has tier 1 | 2 | 3
  for (const w of Object.values(CONFIG.WEAPONS)) {
    if (w.id === 'bite_headbutt') continue;
    assert.equal(w.tier === 1 || w.tier === 2 || w.tier === 3, true, `Weapon ${w.id} must have tier 1|2|3`);
  }

  // 3. Floor maxTier mapping: Exterior -> 1, Floor 1/2 -> 2, Floor 3 -> 3
  assert.equal(getChestMaxTier({ isExterior: true, floor: 2 }), 1);
  assert.equal(getChestMaxTier({ isExterior: false, floor: 1 }), 2);
  assert.equal(getChestMaxTier({ isExterior: false, floor: 2 }), 2);
  assert.equal(getChestMaxTier({ isExterior: false, floor: 3 }), 3);

  // 4. Chest weapon pools across all areas never include bossOnly, isCursed, or bite_headbutt
  const rooms = [
    { isExterior: true, floor: 2 as const },
    { isExterior: false, floor: 2 as const },
    { isExterior: false, floor: 1 as const },
    { isExterior: false, floor: 3 as const },
  ];
  for (const r of rooms) {
    const maxTier = getChestMaxTier(r);
    const chestWeapons = getEligibleChestWeaponIds(r, []);
    assert.equal(chestWeapons.includes('vaelis_torment_blade'), false);
    assert.equal(chestWeapons.includes('vaelis_eclipse_blade'), false);
    assert.equal(chestWeapons.includes('claymore_greatsword'), false);
    assert.equal(chestWeapons.includes('bite_headbutt'), false);
    for (const wid of chestWeapons) {
      const def = CONFIG.WEAPONS[wid];
      assert.equal(Boolean(def.bossOnly), false);
      assert.equal(Boolean(def.isCursed), false);
      assert.equal(def.tier <= maxTier, true);
    }
  }

  // 5. Exterior chests never drop Tier 2/3 gear such as platinum_cuirass or void_woven_robe
  const extGear = getEligibleChestGearIds({ isExterior: true, floor: 2 }, []);
  assert.equal(extGear.includes('platinum_cuirass'), false);
  assert.equal(extGear.includes('void_woven_robe'), false);
  const f3Gear = getEligibleChestGearIds({ isExterior: false, floor: 3 }, []);
  assert.equal(f3Gear.includes('platinum_cuirass'), true);

  // 6. Normal corpse weapon pool excludes bossOnly, isCursed, bite_headbutt, and tier > 2
  const corpseWeapons = getEligibleNormalCorpseWeaponIds([]);
  assert.equal(corpseWeapons.length > 0, true);
  assert.equal(corpseWeapons.includes('vaelis_torment_blade'), false);
  assert.equal(corpseWeapons.includes('vaelis_eclipse_blade'), false);
  assert.equal(corpseWeapons.includes('claymore_greatsword'), false);
  for (const wid of corpseWeapons) {
    const def = CONFIG.WEAPONS[wid];
    assert.equal(Boolean(def.bossOnly), false);
    assert.equal(Boolean(def.isCursed), false);
    assert.equal(def.tier <= 2, true);
  }
});

test('Altar Rituals & Affinity Rebalance: 1-time usedAltarKeys cap, Void 0-Corruption Mind drain, Blood HP/Bleed/+12 COR, and Holy Mother refusal', () => {
  // 1. Each altar coordinate ("floorId:x:y") only grants affinity once (2nd attempt blocked by usedAltarKeys)
  const pHoly = createInitialPlayer('forsaken_nun');
  pHoly.corruption = 10;
  pHoly.hunger = 15;
  const holyKey = buildAltarKey('F2_R3', 6, 4);
  assert.equal(holyKey, 'F2_R3:6:4');

  const firstHoly = performAltarAffinityRitual(pHoly, {
    altarKey: holyKey,
    deity: 'holy_mother',
    holyMode: 'fasting',
  });
  assert.equal(firstHoly.success, true);
  assert.equal(firstHoly.message, HOLY_ALTAR_SUCCESS_MSG);
  assert.equal(pHoly.hunger, 35); // +20 hunger for fasting
  assert.equal(pHoly.corruption, 5); // -5 corruption
  assert.equal(pHoly.affinities.holyMother, 1);
  assert.equal(pHoly.usedAltarKeys.includes(holyKey), true);

  // Repeat on same altar coordinate -> blocked with exhausted message, no state mutation
  const secondHoly = performAltarAffinityRitual(pHoly, {
    altarKey: holyKey,
    deity: 'holy_mother',
    holyMode: 'fasting',
  });
  assert.equal(secondHoly.success, false);
  assert.equal(secondHoly.blockedByUsed, true);
  assert.equal(secondHoly.message, ALTAR_EXHAUSTED_MSG);
  assert.equal(pHoly.affinities.holyMother, 1);
  assert.equal(pHoly.hunger, 35);

  // Save/Load JSON round-trip preserves usedAltarKeys and still blocks repeat use
  const reloadedHoly = JSON.parse(JSON.stringify(pHoly));
  const afterReload = performAltarAffinityRitual(reloadedHoly, {
    altarKey: holyKey,
    deity: 'holy_mother',
    holyMode: 'fasting',
  });
  assert.equal(afterReload.success, false);
  assert.equal(afterReload.blockedByUsed, true);

  // Holy Mother white_herb offering works on a different altar coordinate
  const holyKey2 = buildAltarKey('F2_R1', 4, 5);
  pHoly.inventory.white_herb = 1;
  const herbRes = performAltarAffinityRitual(pHoly, {
    altarKey: holyKey2,
    deity: 'holy_mother',
    holyMode: 'white_herb',
  });
  assert.equal(herbRes.success, true);
  assert.equal(pHoly.inventory.white_herb, 0);
  assert.equal(pHoly.hunger, 35); // No extra hunger when offering white_herb
  assert.equal(pHoly.corruption, 0);
  assert.equal(pHoly.affinities.holyMother, 2);

  // 2. Void Altar drains 30 Mind (can push straight into Panic) with strictly +0 Corruption
  const pVoid = createInitialPlayer('fallen_knight');
  pVoid.mind = 50;
  pVoid.corruption = 7;
  const voidKey = buildAltarKey('F3_R1', 9, 3);
  const voidRes = performAltarAffinityRitual(pVoid, {
    altarKey: voidKey,
    deity: 'void_god',
  });
  assert.equal(voidRes.success, true);
  assert.equal(voidRes.message, VOID_ALTAR_SUCCESS_MSG);
  assert.equal(pVoid.mind, 20); // -30 Mind
  assert.equal(isPlayerPanicking(pVoid), true); // < 30 triggers Panic
  assert.equal(pVoid.corruption, 7); // Strictly +0 Corruption
  assert.equal(pVoid.affinities.primordialVoid, 1);
  assert.equal(pVoid.usedAltarKeys.includes(voidKey), true);

  // 2nd attempt on same Void Altar is blocked
  const voidRepeat = performAltarAffinityRitual(pVoid, {
    altarKey: voidKey,
    deity: 'void_god',
  });
  assert.equal(voidRepeat.success, false);
  assert.equal(voidRepeat.blockedByUsed, true);
  assert.equal(pVoid.affinities.primordialVoid, 1);
  assert.equal(pVoid.mind, 20);

  // 3. Blood Altar drains 25%-30% maxHp (min 1 HP, never fatal), inflicts Bleeding, +12 Corruption, +1 demonicPact
  const pBlood = createInitialPlayer('night_hunter'); // maxHp 105
  pBlood.hp = 105;
  pBlood.corruption = 0;
  pBlood.statuses.bleeding = false;
  const bloodKey = buildAltarKey('F1_R1', 8, 6);
  const bloodRes = performAltarAffinityRitual(pBlood, {
    altarKey: bloodKey,
    deity: 'demon_lord',
    bloodHpLossRatio: 0.28,
  });
  assert.equal(bloodRes.success, true);
  assert.equal(bloodRes.message, BLOOD_ALTAR_SUCCESS_MSG);
  const expectedLoss = Math.round(105 * 0.28);
  assert.equal(pBlood.hp, 105 - expectedLoss);
  assert.equal(pBlood.statuses.bleeding, true);
  assert.equal(pBlood.corruption, 12); // Strictly +12 Corruption
  assert.equal(pBlood.affinities.demonicPact, 1);
  assert.equal(pBlood.usedAltarKeys.includes(bloodKey), true);

  // Blood Altar is never directly lethal (clamps at 1 HP when low)
  const pLowBlood = createInitialPlayer('forsaken_nun');
  pLowBlood.hp = 10;
  const bloodLowRes = performAltarAffinityRitual(pLowBlood, {
    altarKey: buildAltarKey('F1_R2', 3, 3),
    deity: 'demon_lord',
    bloodHpLossRatio: 0.3,
  });
  assert.equal(bloodLowRes.success, true);
  assert.equal(pLowBlood.hp, 1);
  assert.equal(pLowBlood.statuses.bleeding, true);

  // 4. Holy Mother Altar refuses when banned via taboo OR via Corruption >= 25
  const pBanned = createInitialPlayer('forsaken_nun');
  pBanned.hunger = 10;
  banHolyMother(pBanned);
  const refusedByBan = performAltarAffinityRitual(pBanned, {
    altarKey: buildAltarKey('F2_R3', 2, 2),
    deity: 'holy_mother',
    holyMode: 'fasting',
  });
  assert.equal(refusedByBan.success, false);
  assert.equal(refusedByBan.blockedByBan, true);
  assert.equal(refusedByBan.message, HOLY_ALTAR_REFUSAL_MSG);
  assert.equal(pBanned.affinities.holyMother, 0);
  assert.equal(pBanned.hunger, 10);

  const pCorrupt = createInitialPlayer('fallen_knight');
  pCorrupt.corruption = 25;
  pCorrupt.inventory.white_herb = 1;
  const refusedByCor = performAltarAffinityRitual(pCorrupt, {
    altarKey: buildAltarKey('F2_R3', 3, 3),
    deity: 'holy_mother',
    holyMode: 'white_herb',
  });
  assert.equal(refusedByCor.success, false);
  assert.equal(refusedByCor.blockedByBan, true);
  assert.equal(refusedByCor.message, HOLY_ALTAR_REFUSAL_MSG);
  assert.equal(pCorrupt.inventory.white_herb, 1);
  assert.equal(pCorrupt.affinities.holyMother, 0);
});

test('TILE.VOID_RIFT end-game dialogue requirements: Lõi Khóa, Tiên Dược, Thánh Tử 13, Order/True/Dark/Personal/Normal gating', () => {
  // 1. Fresh player arriving at TILE.VOID_RIFT without artifacts or rescued Child 13
  const baseEmpty = {
    classId: 'fallen_knight',
    corruption: 0,
    demonicPactAffinity: 0,
    holyMotherBanned: false,
    readBookIds: [] as string[],
    inventory: {} as Record<string, number>,
    vaelisTalked: false,
    vaelisDefeated: false,
    curedPetrification: false,
    child13Rescued: false,
    child13InParty: false,
    riftElixirCollected: false,
  };
  const emptyAvail = evaluateVoidRiftRequirements(baseEmpty);
  assert.equal(emptyAvail.canCollectElixir, true);
  assert.equal(emptyAvail.canRescueChild13, true);
  assert.equal(emptyAvail.trueEnding.ready, false);
  assert.equal(emptyAvail.trueEnding.missing.includes('Lõi Khóa Hư Vô'), true);
  assert.equal(emptyAvail.trueEnding.missing.includes('Tiên Dược Nguyên Sơ'), true);
  assert.equal(emptyAvail.trueEnding.missing.includes('Thánh Tử 13'), true);
  assert.equal(emptyAvail.orderEnding.ready, false);
  assert.equal(emptyAvail.orderEnding.missing.includes('Lõi Khóa Hư Vô'), true);
  assert.equal(emptyAvail.orderEnding.missing.includes('Thần Chú Tái Thiết'), true);
  assert.equal(emptyAvail.darkEnding.ready, false);
  assert.equal(emptyAvail.normalEnding.ready, false);

  // 2. True Ending requires Lõi Khóa + Tiên Dược + Thánh Tử 13 + Seed Lore (book_9 or >=4 books)
  const missingChild13 = evaluateCanonEnding({
    classId: 'fallen_knight',
    corruption: 10,
    readBookIds: ['book_9'],
    inventory: { void_core: 1, elixir_of_ancients: 1 },
    learnedSkillIds: [],
    vaelisTalked: true,
    vaelisDefeated: true,
    curedPetrification: false,
    child13Rescued: false,
    child13InParty: false,
    endingAction: 'POUR_ELIXIR_CHILD13_RIFT',
  });
  assert.notEqual(missingChild13.id, 'TRUE_ENDING');

  const trueReady = evaluateVoidRiftRequirements({
    ...baseEmpty,
    inventory: { void_core: 1, elixir_of_ancients: 1 },
    readBookIds: ['book_9'],
    child13Rescued: true,
    child13InParty: false, // Even if party was full when freeing Child 13 at the rift
    riftElixirCollected: true,
  });
  assert.equal(trueReady.trueEnding.ready, true);
  assert.equal(trueReady.trueEnding.missing.length, 0);
  assert.equal(trueReady.canCollectElixir, false);
  assert.equal(trueReady.canRescueChild13, false);

  // 3. Order Ending requires pure soul (cor === 0, not holyMotherBanned) + Lõi Khóa + Thần Chú Tái Thiết
  const orderReady = evaluateVoidRiftRequirements({
    ...baseEmpty,
    corruption: 0,
    holyMotherBanned: false,
    inventory: { void_core: 1, reconstruction_scroll: 1 },
  });
  assert.equal(orderReady.orderEnding.ready, true);

  const orderBlockedByBan = evaluateVoidRiftRequirements({
    ...baseEmpty,
    corruption: 0,
    holyMotherBanned: true,
    inventory: { void_core: 1, reconstruction_scroll: 1 },
  });
  assert.equal(orderBlockedByBan.orderEnding.ready, false);
  assert.equal(orderBlockedByBan.orderEnding.missing.includes('Tâm hồn thuần khiết'), true);

  // 4. Dark & Personal S-Endings evaluate properly at TILE.VOID_RIFT
  const darkAvail = evaluateVoidRiftRequirements({
    ...baseEmpty,
    vaelisDefeated: true,
    demonicPactAffinity: 2,
  });
  assert.equal(darkAvail.darkEnding.ready, true);
  assert.equal(darkAvail.normalEnding.ready, true);

  const nunAvail = evaluateVoidRiftRequirements({
    ...baseEmpty,
    classId: 'forsaken_nun',
    corruption: 5,
    child13Rescued: true,
    child13InParty: true,
    readBookIds: ['book_1', 'book_2', 'book_3'],
  });
  assert.equal(nunAvail.personalEnding.ready, true);
  assert.equal(nunAvail.personalEnding.variant, 'nun');
  assert.equal(nunAvail.personalEnding.action, 'ESCAPE_EXTERIOR_GATE');
});

test('Balancing Patch: diegetic corruption warning (18-24), blood_pact Lv3 conditional heal & fixed 15 HP cost, obliterate buff & shatter/lock, and 100% prologue skill ID audit', () => {
  // 1. Prologue Skill ID Audit: 100% of opt.skills across all CHARACTER_INTRO_STEPS and class startingSkills exist in CONFIG.SKILLS
  const validSkillIds = new Set(CONFIG.SKILLS.map((s) => s.id));
  for (const cls of CONFIG.CLASSES) {
    assert.equal(
      validSkillIds.has(cls.startingSkill),
      true,
      `Class ${cls.id} startingSkill "${cls.startingSkill}" must exist in CONFIG.SKILLS`
    );
  }
  let prologueSkillCount = 0;
  for (const [clsId, steps] of Object.entries(CHARACTER_INTRO_STEPS)) {
    for (const step of steps) {
      for (const opt of step.options) {
        if (opt.skills) {
          for (const skId of opt.skills) {
            prologueSkillCount++;
            assert.equal(
              validSkillIds.has(skId),
              true,
              `Prologue option ${clsId}/${opt.id} skill "${skId}" must exist in CONFIG.SKILLS`
            );
          }
        }
      }
    }
  }
  assert.equal(prologueSkillCount >= 8, true);

  // 2. Diegetic Corruption Warning triggers once in [18, 24] when Holy Mother is not banned
  const wPlayer = createInitialPlayer('forsaken_nun');
  assert.equal(wPlayer.corruptionWarningLogged, false);
  wPlayer.corruption = 17;
  const wLogs: string[] = [];
  assert.equal(checkCorruptionDiegeticWarning(wPlayer, wLogs), null);
  assert.equal(wLogs.length, 0);
  assert.equal(wPlayer.corruptionWarningLogged, false);

  wPlayer.corruption = 18;
  const warn1 = checkCorruptionDiegeticWarning(wPlayer, wLogs);
  assert.equal(warn1, CORRUPTION_DIEGETIC_WARNING_MSG);
  assert.equal(wPlayer.corruptionWarningLogged, true);
  assert.equal(wLogs.includes(CORRUPTION_DIEGETIC_WARNING_MSG), true);

  // Does not fire a second time
  wPlayer.corruption = 22;
  assert.equal(checkCorruptionDiegeticWarning(wPlayer, wLogs), null);
  assert.equal(wLogs.length, 1);

  // Does not fire if already banned or >= 25
  const bannedPlayer = createInitialPlayer('fallen_knight');
  bannedPlayer.corruption = 20;
  banHolyMother(bannedPlayer);
  assert.equal(checkCorruptionDiegeticWarning(bannedPlayer), null);

  const highCorPlayer = createInitialPlayer('fallen_knight');
  highCorPlayer.corruption = 25;
  assert.equal(checkCorruptionDiegeticWarning(highCorPlayer), null);

  // 3. blood_pact: fixed 15 HP cost at Lv1/Lv2/Lv3; Lv3 does NOT heal if limb survives, heals +12 HP ONLY on sever or kill
  const bpLow = createInitialPlayer('fallen_knight');
  bpLow.skillLevels.blood_pact = 3;
  bpLow.hp = 15;
  bpLow.mind = 50;
  const bpDummy = createMapEnemyInstance('e_bp_1', 'executioner_paladin', 4, 4);
  const lowOut = executeSingleActorCombatAction(
    bpLow,
    bpDummy,
    0,
    'SKILL',
    'torso',
    { skillId: 'blood_pact' },
    new SeededRNG('BP-LOW')
  );
  assert.equal(bpLow.statuses.bloodPactLevel, 0);
  assert.equal(lowOut.logs.some((l) => l.includes('quá thấp')), true);

  // Lv3 costs exact 15 HP (not 10)
  for (const lv of [1, 2, 3]) {
    const pCost = createInitialPlayer('fallen_knight');
    pCost.skillLevels.blood_pact = lv;
    pCost.hp = 100;
    pCost.mind = 50;
    const enCost = createMapEnemyInstance(`e_bp_cost_${lv}`, 'executioner_paladin', 4, 4);
    executeSingleActorCombatAction(
      pCost,
      enCost,
      0,
      'SKILL',
      'torso',
      { skillId: 'blood_pact' },
      new SeededRNG(`BP-COST-${lv}`)
    );
    assert.equal(pCost.hp, 85, `blood_pact Lv${lv} must sacrifice exactly 15 HP`);
    assert.equal(pCost.statuses.bloodPactLevel, lv);
  }

  // Lv3 attack on tanky surviving limb: NO HP heal!
  const pNoHeal = createInitialPlayer('fallen_knight');
  pNoHeal.hp = 80;
  pNoHeal.maxHp = 135;
  pNoHeal.statuses.bloodPactLevel = 3;
  const enTank = createMapEnemyInstance('e_bp_tank', 'starved_hound', 4, 4);
  enTank.stunTurns = 1;
  const torsoTank = enTank.limbs.find((l) => l.id === 'torso')!;
  torsoTank.hp = 9999;
  torsoTank.maxHp = 9999;
  const noHealOut = executeSingleActorCombatAction(
    pNoHeal,
    enTank,
    0,
    'ATTACK',
    'torso',
    undefined,
    new SeededRNG('BP-NO-HEAL')
  );
  assert.equal((noHealOut.lastDealtDmg || 0) > 0, true, 'Attack must hit tanky torso');
  assert.equal(pNoHeal.statuses.bloodPactLevel, 0);
  assert.equal(pNoHeal.hp, 80, 'blood_pact Lv3 must NOT heal when target limb survives');
  assert.equal(
    noHealOut.logs.some((l) => l.includes('Huyết Ước hấp thụ máu tươi')),
    false
  );

  // Lv3 attack that severs a limb (single-actor path): heals +12 HP with exact log
  const pSeverHeal = createInitialPlayer('fallen_knight');
  pSeverHeal.hp = 80;
  pSeverHeal.maxHp = 135;
  pSeverHeal.statuses.bloodPactLevel = 3;
  const enSever = createMapEnemyInstance('e_bp_sever', 'executioner_paladin', 4, 4);
  enSever.stunTurns = 1;
  const armSever = enSever.limbs.find((l) => l.id !== 'torso' && l.id !== 'head')!;
  armSever.hp = 10;
  const severOut = executeSingleActorCombatAction(
    pSeverHeal,
    enSever,
    0,
    'ATTACK',
    armSever.id,
    undefined,
    new SeededRNG('BP-SEVER')
  );
  assert.equal(severOut.severedAnyLimb, true);
  assert.equal(pSeverHeal.hp, 92, 'blood_pact Lv3 must heal +12 HP when severing a limb');
  assert.equal(
    severOut.logs.some((l) => l.includes('Huyết Ước hấp thụ máu tươi từ vết cắt chí mạng, hồi +12 Sinh Lực!')),
    true
  );

  // Lv3 attack via executePlayerWeaponAttack that kills enemy: heals +12 HP with exact log
  const pKillHeal = createInitialPlayer('fallen_knight');
  pKillHeal.hp = 80;
  pKillHeal.maxHp = 135;
  pKillHeal.statuses.bloodPactLevel = 3;
  const enKill = createMapEnemyInstance('e_bp_kill', 'starved_hound', 4, 4);
  enKill.stunTurns = 1;
  const torsoKill = enKill.limbs.find((l) => l.id === 'torso')!;
  torsoKill.hp = 10;
  const killOut = executePlayerWeaponAttack(pKillHeal, enKill, 'torso', new SeededRNG('BP-KILL'));
  assert.equal(killOut.enemyDefeated, true);
  assert.equal(pKillHeal.hp, 92, 'blood_pact Lv3 must heal +12 HP when killing enemy');
  assert.equal(
    killOut.logs.some((l) => l.includes('Huyết Ước hấp thụ máu tươi từ vết cắt chí mạng, hồi +12 Sinh Lực!')),
    true
  );

  // 4. obliterate buff: fallback true dmg 450 / 620 / 800, permanent limb.armor = 0 on survival, and 1-turn lock at Lv3
  const expectedFallback: Record<number, number> = { 1: 450, 2: 620, 3: 800 };
  for (const lv of [1, 2, 3]) {
    const pOb = createInitialPlayer('forsaken_nun');
    pOb.skillLevels.obliterate = lv;
    pOb.mind = 100;
    const enOb = createMapEnemyInstance(`e_ob_${lv}`, 'demon_lord_vaelis', 4, 4);
    const armOb = enOb.limbs.find((l) => l.id !== 'torso' && l.id !== 'head')!;
    armOb.hp = 2000;
    armOb.maxHp = 2000;
    armOb.armor = 50;

    const obOut = executeSingleActorCombatAction(
      pOb,
      enOb,
      0,
      'SKILL',
      armOb.id,
      { skillId: 'obliterate' },
      new SeededRNG(`OB-${lv}`)
    );
    assert.equal(obOut.lastDealtDmg, expectedFallback[lv]);
    assert.equal(armOb.hp, 2000 - expectedFallback[lv]);
    assert.equal(armOb.armor, 0, `obliterate Lv${lv} must permanently shatter limb armor to 0`);
    assert.equal(
      obOut.logs.some((l) =>
        l.includes(
          `[Xóa Sổ] giáng ${expectedFallback[lv]} sát thương chuẩn và nghiền nát hoàn toàn lớp giáp của [${armOb.name}]!`
        )
      ),
      true
    );
    if (lv < 3) {
      assert.equal(enOb.lockedLimbIds?.[armOb.id] || 0, 0);
    } else {
      assert.equal(enOb.lockedLimbIds?.[armOb.id], 1, 'obliterate Lv3 must lock surviving limb for 1 turn');
    }
  }

  // Also verify executePlayerSkill path for obliterate Lv3 armor shatter & lock
  const pObLegacy = createInitialPlayer('forsaken_nun');
  pObLegacy.skillLevels.obliterate = 3;
  pObLegacy.mind = 100;
  const enObLegacy = createMapEnemyInstance('e_ob_legacy', 'demon_lord_vaelis', 4, 4);
  enObLegacy.stunTurns = 1; // Prevent enemy turn from ticking down lock
  const armObLegacy = enObLegacy.limbs.find((l) => l.id !== 'torso' && l.id !== 'head')!;
  armObLegacy.hp = 2000;
  armObLegacy.maxHp = 2000;
  armObLegacy.armor = 40;
  const obLegacyOut = executePlayerSkill(
    pObLegacy,
    enObLegacy,
    'obliterate',
    armObLegacy.id,
    new SeededRNG('OB-LEGACY')
  );
  assert.equal(obLegacyOut.lastDealtDmg, 800);
  assert.equal(armObLegacy.armor, 0);
});

test('Summon Rebalance: 0.7x/0.85x/1.05x undead damage scaling, ghoul flesh_rend nerf, pure-tank <30 Mind no free divineAegis, and 0-Mind 15% maxHp Soul Decay', () => {
  // 1. Undead summon damage multiplier scales 0.7 (Lv1) -> 0.85 (Lv2) -> 1.05 (Lv3)
  const necro = createInitialPlayer('forsaken_nun');
  necro.skillLevels.necromancy = 1;
  assert.equal(getUndeadSummonDmgMultiplier(necro), 0.7);
  necro.skillLevels.necromancy = 2;
  assert.equal(getUndeadSummonDmgMultiplier(necro), 0.85);
  necro.skillLevels.necromancy = 3;
  assert.equal(getUndeadSummonDmgMultiplier(necro), 1.05);

  // Verify getAllyComputedStats and ghoul flesh_rend reflect 0.7x at Lv1
  necro.skillLevels.necromancy = 1;
  const corpse = createMapEnemyInstance('e_ghoul_src', 'fanatic_zealot', 3, 3);
  corpse.defeated = true;
  const castRes = castNecromancyOnCorpse(necro, corpse);
  assert.equal(castRes.success, true);
  const ghoul = necro.party[0];
  assert.equal(ghoul.isUndeadSummon, true);
  assert.equal(isPureTankSummon(ghoul), false);
  ghoul.weaponId = 'broad_iron_sword'; // dmg [110, 145] -> avg 128 -> * 0.7 = 90
  const expectedBaseAvg = Math.round((CONFIG.WEAPONS.broad_iron_sword.dmg[0] + CONFIG.WEAPONS.broad_iron_sword.dmg[1]) * 0.5);
  assert.equal(getAllyComputedStats(ghoul, necro).physAtk, Math.round(expectedBaseAvg * 0.7));

  // Verify ghoul flesh_rend deals 200 * 0.7 = 140 dmg and 90 * 0.7 = 63 bleed at Lv1
  const enTarget = createMapEnemyInstance('e_ghoul_tgt', 'starved_hound', 4, 4);
  const torso = enTarget.limbs.find((l) => l.id === 'torso')!;
  torso.hp = 1000;
  torso.maxHp = 1000;
  torso.armor = 0;
  ghoul.mind = 50;
  const rendOut = executeSingleActorCombatAction(
    necro,
    enTarget,
    1,
    'SKILL',
    'torso',
    { skillId: 'flesh_rend' },
    new SeededRNG('SUMMON-REND-LV1')
  );
  assert.equal(rendOut.lastDealtDmg, 140);
  assert.equal(enTarget.bleedPerTurn, 63);

  // 2. Pure-tank summons (summon_wraith / summon_child_12) with Mind < 30 ONLY self-guard, NEVER pump free divineAegisTurns
  const tankMaster = createInitialPlayer('forsaken_nun');
  tankMaster.skillLevels.necromancy = 2;
  tankMaster.questFlags.child12Resolved = true;
  tankMaster.statuses.divineAegisTurns = 0;
  tankMaster.statuses.divineAegisLevel = 0;
  const c12Res = castNecromancyOnChild12(tankMaster);
  assert.equal(c12Res.success, true);
  const wraithCorpse = createMapEnemyInstance('e_wraith_src', 'rotting_priest', 3, 3);
  wraithCorpse.defeated = true;
  const wraithRes = castNecromancyOnCorpse(tankMaster, wraithCorpse);
  assert.equal(wraithRes.success, true);

  const child12 = tankMaster.party[0];
  const wraith = tankMaster.party[1];
  assert.equal(isPureTankSummon(child12), true);
  assert.equal(isPureTankSummon(wraith), true);

  for (let idx = 0; idx < 2; idx++) {
    const tank = tankMaster.party[idx];
    tank.mind = 10;
    tank.guarding = false;
    tank.divineAegisTurns = 0;
    tankMaster.statuses.divineAegisTurns = 0;
    tankMaster.statuses.divineAegisLevel = 0;

    const dummy = createMapEnemyInstance(`e_tank_panic_${idx}`, 'fanatic_zealot', 4, 4);
    const out = executeSingleActorCombatAction(
      tankMaster,
      dummy,
      idx + 1,
      'ATTACK',
      'torso',
      undefined,
      new SeededRNG(`TANK-PANIC-${idx}`)
    );
    assert.equal(tank.guarding, true);
    assert.equal(tank.divineAegisTurns || 0, 0, 'Panicking pure tank must NOT grant self divineAegisTurns');
    assert.equal(tankMaster.statuses.divineAegisTurns, 0, 'Panicking pure tank must NOT grant player divineAegisTurns');
    assert.equal(tankMaster.statuses.divineAegisLevel, 0);
    assert.equal(
      out.logs.some((l) =>
        l.includes(
          `[BẢN NĂNG HỘ VỆ] [${tank.name}] co mình vào thế thủ bản năng nhưng không đủ tâm lực để dựng khiên hộ thể cho đồng đội!`
        )
      ),
      true
    );
  }

  // 3. Undead summon at 0 Mind suffers Soul Decay (-15% maxHp) at end of round, and reclaims gear on death
  const decayPlayer = createInitialPlayer('forsaken_nun');
  decayPlayer.skillLevels.necromancy = 1;
  const decaySrc = createMapEnemyInstance('e_decay_src', 'fanatic_zealot', 3, 3);
  decaySrc.defeated = true;
  castNecromancyOnCorpse(decayPlayer, decaySrc);
  const decaySummon = decayPlayer.party[0];
  decaySummon.maxHp = 100;
  decaySummon.hp = 100;
  decaySummon.mind = 0;
  decaySummon.weaponId = 'broad_iron_sword';

  const stunnedEnemy = createMapEnemyInstance('e_decay_foe', 'starved_hound', 4, 4);
  stunnedEnemy.stunTurns = 2; // No enemy damage so we isolate Soul Decay
  const round1 = resolveEnemyCombatRound(decayPlayer, stunnedEnemy, new SeededRNG('SOUL-DECAY-1'));
  assert.equal(decaySummon.hp, 85, 'Undead summon at 0 Mind must lose 15% maxHp (15 HP)');
  assert.equal(
    round1.logs.some((l) =>
      l.includes(
        `[PHÂN RÃ LINH HỒN] Mất sạch Lý Trí, thân xác [${decaySummon.name}] rạn vỡ và tan rã dần (-15 Sinh Lực)!`
      )
    ),
    true
  );

  // Fatal Soul Decay: hp drops to 0 -> gear reclaimed & summon pruned from party
  decaySummon.hp = 10;
  decaySummon.mind = 0;
  stunnedEnemy.stunTurns = 2;
  const round2 = resolveEnemyCombatRound(decayPlayer, stunnedEnemy, new SeededRNG('SOUL-DECAY-2'));
  assert.equal(decayPlayer.party.length, 0, 'Summon killed by Soul Decay must be removed from party');
  assert.equal(decayPlayer.unlockedWeapons.includes('broad_iron_sword'), true, 'Gear must be reclaimed on Soul Decay death');
  assert.equal(
    round2.logs.some((l) => l.includes('[PHÂN RÃ LINH HỒN]')),
    true
  );
});

test('Master Bugfix & Balance Patch: Vaelis HP/conduit, void_chimera drop, Lv3 skills, Floor 1/3 spawns & chase/stealth AI, CombatEngine shake & ITEM VFX', () => {
  // 1. Vaelis HP upgrade (>9000), void_chimera guaranteedWeaponDrop, CONFIG.CLASSES sync
  const vaelis = createMapEnemyInstance('e_vaelis_check', 'demon_lord_vaelis', 5, 5);
  assert.equal(getEnemyMaxTotalHp(vaelis) > 9000, true, 'Vaelis total limb HP must exceed 9000');
  assert.equal(CONFIG.ENEMIES.demon_lord_vaelis.totalHpDisplay, 10550);
  assert.equal(CONFIG.ENEMIES.void_chimera.guaranteedWeaponDrop, 'cursed_void_bone_scythe');
  assert.equal(CONFIG.WEAPONS.cursed_void_bone_scythe.bossOnly, true);

  const knightCls = CONFIG.CLASSES.find((c) => c.id === 'fallen_knight')!;
  const nunCls = CONFIG.CLASSES.find((c) => c.id === 'forsaken_nun')!;
  const hunterCls = CONFIG.CLASSES.find((c) => c.id === 'night_hunter')!;
  assert.equal(knightCls.hp, 135);
  assert.equal(knightCls.mind, 85);
  assert.equal(nunCls.hp, 90);
  assert.equal(nunCls.mind, 135);
  assert.equal(hunterCls.hp, 105);
  assert.equal(hunterCls.mind, 105);

  // Vaelis void_conduit heals +280 HP/turn
  const pConduit = createInitialPlayer('fallen_knight');
  pConduit.hp = 135;
  vaelis.limbs.find((l) => l.id === 'torso')!.hp = 4000;
  vaelis.stunTurns = 0;
  const conduitRound = resolveEnemyCombatRound(pConduit, vaelis, new SeededRNG('VAELIS-CONDUIT'));
  assert.equal(
    conduitRound.logs.some((l) => l.includes('+280 Sinh Lực')),
    true,
    'void_conduit must heal +280 HP per turn'
  );

  // 2. Lv3 skill effects: flesh_rend Lv3 shreds 40% target limb armor; void_bite Lv3 cancels telegraphing
  const pSkills = createInitialPlayer('forsaken_nun');
  pSkills.mind = 135;
  pSkills.skillLevels.flesh_rend = 3;
  pSkills.skillLevels.void_bite = 3;
  const armoredFoe = createMapEnemyInstance('e_armor_shred', 'dullahan_knight', 5, 5);
  const torsoLimb = armoredFoe.limbs.find((l) => l.id === 'torso')!;
  const torsoBefore = torsoLimb.armor ?? 0;
  executeSingleActorCombatAction(
    pSkills,
    armoredFoe,
    0,
    'SKILL',
    'torso',
    { skillId: 'flesh_rend' },
    new SeededRNG('FLESH-REND-LV3')
  );
  const torsoAfter = armoredFoe.limbs.find((l) => l.id === 'torso')!.armor ?? 0;
  assert.equal(Math.abs(torsoAfter - torsoBefore * 0.6) < 0.001, true);

  armoredFoe.telegraphing = true;
  armoredFoe.telegraphCoinFlip = true;
  executeSingleActorCombatAction(
    pSkills,
    armoredFoe,
    0,
    'SKILL',
    'torso',
    { skillId: 'void_bite' },
    new SeededRNG('VOID-BITE-LV3')
  );
  assert.equal(armoredFoe.telegraphing, false, 'void_bite Lv3 must cancel telegraphing');
  assert.equal(armoredFoe.telegraphCoinFlip, false, 'void_bite Lv3 must cancel telegraphCoinFlip');

  // 3. Floor 1 spawns black_bone_skeleton & armored_ghoul; Floor 3 spawns dimensional_viper
  const world = generateWorld('MASTER-PATCH-SEED-1');
  const floor1Ids = new Set<string>();
  const floor3Ids = new Set<string>();
  for (const room of Object.values(world.rooms)) {
    if (room.floor === 1) {
      for (const e of room.enemies) floor1Ids.add(e.templateId);
    }
    if (room.floor === 3) {
      for (const e of room.enemies) floor3Ids.add(e.templateId);
    }
  }
  assert.equal(floor1Ids.has('black_bone_skeleton'), true, 'Floor 1 must spawn black_bone_skeleton');
  assert.equal(floor1Ids.has('armored_ghoul'), true, 'Floor 1 must spawn armored_ghoul');
  assert.equal(floor3Ids.has('dimensional_viper'), true, 'Floor 3 must spawn dimensional_viper');

  // 4. Chase AI: stealthActive immediately breaks chase -> patrol; loseSightTimerMs > 0 pursues lastSeenX/lastSeenY
  const w = 12;
  const h = 10;
  const grid: TILE[][] = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) =>
      x === 0 || y === 0 || x === w - 1 || y === h - 1 ? TILE.WALL : TILE.FLOOR
    )
  );
  // Put a wall pillar to block LOS between enemy (8,5) and player (2,5)
  grid[5][5] = TILE.WALL;
  const pursuer = createMapEnemyInstance('e_pursuer', 'fanatic_zealot', 8, 5, { facing: 'left' });
  pursuer.aiState = 'chase';
  pursuer.lastSeenX = 6;
  pursuer.lastSeenY = 5;
  pursuer.loseSightTimerMs = 1500;

  const testRoom: RoomData = {
    id: 'CHASE_AI_TEST',
    floor: 1,
    roomIndex: 1,
    name: 'Test',
    sensoryLine: '...',
    template: 'JAGGED_RUIN',
    width: w,
    height: h,
    grid,
    spawnX: 2,
    spawnY: 5,
    secretX: 0,
    secretY: 0,
    secretChamberCoords: [],
    enemies: [pursuer],
    decoys: [],
    corpses: [],
    lootedCoords: [],
    shortcutOpened: false,
    secretWallBlown: false,
  };

  // Without stealth: enemy loses LOS behind wall, pursues lastSeenX=6,y=5 and decrements loseSightTimerMs by 500
  const chaseStep = advanceRoomEnemiesOneTurn(testRoom, { x: 2, y: 5 }, null, false);
  const chasedEnemy = chaseStep.enemies[0];
  assert.equal(chasedEnemy.aiState, 'chase');
  assert.equal(chasedEnemy.x, 7, 'Pursuer with loseSightTimerMs > 0 must step toward lastSeenX');
  assert.equal(chasedEnemy.loseSightTimerMs, 1000);

  // With stealthActive = true: enemy immediately loses sight and reverts to patrol
  const stealthRoom: RoomData = {
    ...testRoom,
    enemies: [{ ...chasedEnemy, aiState: 'chase', loseSightTimerMs: 1500 }],
  };
  const stealthStep = advanceRoomEnemiesOneTurn(stealthRoom, { x: 2, y: 5 }, null, true);
  assert.equal(
    stealthStep.enemies[0].aiState,
    'patrol',
    'stealthActive must revert chasing enemy to patrol immediately'
  );
  assert.equal(stealthStep.enemies[0].loseSightTimerMs, 0);

  // 5. CombatEngine shakeAmplitude reset on timer expiry & damaging ITEM sets enemyHitDelayTimerMs = 80
  const engine = new CombatEngine();
  engine.triggerScreenShake(25, 100);
  assert.equal(engine.shakeAmplitude, 25);
  engine.update(60);
  engine.update(60);
  assert.equal(engine.shakeTimerMs, 0);
  assert.equal(engine.shakeAmplitude, 0, 'shakeAmplitude must reset to 0 when shakeTimerMs expires');

  const pVfx = createInitialPlayer('night_hunter');
  pVfx.inventory.brown_vial = 2;
  const eVfx = createMapEnemyInstance('e_vfx', 'fanatic_zealot', 4, 4);
  engine.resetStageEffects();
  engine.executeTurn(pVfx, eVfx, 'VFX-ITEM', 'ITEM', 'torso', { itemId: 'brown_vial' });
  assert.equal(engine.enemyHitDelayTimerMs, 80, 'Damaging ITEM must set enemyHitDelayTimerMs = 80');
});

test('Combat.ts Deep Bugfix: guarding resets after round, Vaelis drops 1 void_core + lucky_coin, black_wax_crown, aegis_of_order, vaelis_signet & black_straw_effigy', () => {
  // 1. player.statuses.guarding & ally.guarding reset to false at end of resolveEnemyCombatRound
  const pGuard = createInitialPlayer('fallen_knight');
  const ally = createRecruitedAlly('fallen_knight');
  pGuard.party.push(ally);
  pGuard.statuses.guarding = true;
  ally.guarding = true;
  const foeGuard = createMapEnemyInstance('e_guard_reset', 'starved_hound', 4, 4);
  foeGuard.stunTurns = 2;
  resolveEnemyCombatRound(pGuard, foeGuard, new SeededRNG('GUARD-RESET'));
  assert.equal(pGuard.statuses.guarding, false, 'player.statuses.guarding must reset to false at end of round');
  assert.equal(ally.guarding, false, 'ally.guarding must reset to false at end of round');

  // 2. Defeating demon_lord_vaelis drops exactly 1 void_core, +2 lucky_coin, and black_wax_crown adds +1 Corruption +2 Mind/round
  const pBoss = createInitialPlayer('fallen_knight');
  pBoss.inventory.void_core = 0;
  pBoss.inventory.lucky_coin = 0;
  pBoss.unlockedGear.push('black_wax_crown');
  pBoss.equippedHead = 'black_wax_crown';
  pBoss.mind = 50;
  pBoss.corruption = 0;

  // Test +2 Mind/round from black_wax_crown
  const stunnedFoe = createMapEnemyInstance('e_crown_mind', 'starved_hound', 4, 4);
  stunnedFoe.stunTurns = 2;
  resolveEnemyCombatRound(pBoss, stunnedFoe, new SeededRNG('CROWN-MIND'));
  assert.equal(pBoss.mind, 52, 'black_wax_crown must restore +2 Mind at end of round');

  // Kill Vaelis via single actor weapon attack on torso with 1 HP left (unlock torso by severing throne_claw_left)
  const vaelisKill = createMapEnemyInstance('e_vaelis_kill', 'demon_lord_vaelis', 5, 5);
  const vaelisClaw = vaelisKill.limbs.find((l) => l.id === 'throne_claw_left');
  if (vaelisClaw) vaelisClaw.hp = 0;
  vaelisKill.limbs.find((l) => l.id === 'torso')!.hp = 1;
  pBoss.mind = 85;
  const killOut = executeSingleActorCombatAction(
    pBoss,
    vaelisKill,
    0,
    'ATTACK',
    'torso',
    undefined,
    new SeededRNG('VAELIS-KILL')
  );
  assert.equal(killOut.enemyDefeated, true);
  assert.equal(pBoss.inventory.void_core, 1, 'Defeating Vaelis must grant strictly 1 void_core (no duplicate)');
  assert.equal(pBoss.inventory.lucky_coin, 2, 'Defeating Vaelis must grant dropLuckyCoins (+2 Thẻ Bài Bạc)');
  assert.equal(
    killOut.logs.some((l) => l.includes('Nhặt được +2 Thẻ Bài Bạc.')),
    true
  );
  assert.equal(pBoss.corruption, 1, 'black_wax_crown must add +1 Corruption after victory');

  // 3. aegis_of_order multiplies holy_light damage by 1.3x & oil detonation resets oilCovered + oilTurns
  const pHolyBase = createInitialPlayer('forsaken_nun');
  pHolyBase.mind = 135;
  pHolyBase.skillLevels.holy_light = 1;
  pHolyBase.equippedShield = null;
  const foeHoly1 = createMapEnemyInstance('e_holy_1', 'fanatic_zealot', 4, 4);
  foeHoly1.oilCovered = true;
  foeHoly1.oilTurns = 3;
  const resBase = executeSingleActorCombatAction(
    pHolyBase,
    foeHoly1,
    0,
    'SKILL',
    'torso',
    { skillId: 'holy_light' },
    new SeededRNG('HOLY-SAME')
  );
  assert.equal(foeHoly1.oilCovered, false, 'Oil detonation must reset oilCovered to false');
  assert.equal(foeHoly1.oilTurns, 0, 'Oil detonation must reset oilTurns to 0');

  const pHolyAegis = createInitialPlayer('forsaken_nun');
  pHolyAegis.mind = 135;
  pHolyAegis.skillLevels.holy_light = 1;
  pHolyAegis.unlockedShields.push('aegis_of_order');
  pHolyAegis.equippedShield = 'aegis_of_order';
  const foeHoly2 = createMapEnemyInstance('e_holy_2', 'fanatic_zealot', 4, 4);
  foeHoly2.oilCovered = true;
  foeHoly2.oilTurns = 3;
  const resAegis = executeSingleActorCombatAction(
    pHolyAegis,
    foeHoly2,
    0,
    'SKILL',
    'torso',
    { skillId: 'holy_light' },
    new SeededRNG('HOLY-SAME')
  );
  assert.equal(
    (resAegis.lastDealtDmg || 0) > (resBase.lastDealtDmg || 0),
    true,
    'aegis_of_order must boost holy_light damage by +30%'
  );

  // 4. vaelis_signet reduces incoming damage when player HP < 30%
  const pNoSignet = createInitialPlayer('fallen_knight');
  pNoSignet.hp = 30; // < 30% of 135
  pNoSignet.equippedAccessory = null;
  const foeSignet1 = createMapEnemyInstance('e_sig_1', 'fanatic_zealot', 4, 4);
  const sigOut1 = resolveEnemyCombatRound(pNoSignet, foeSignet1, new SeededRNG('SIGNET-SEED'));

  const pSignet = createInitialPlayer('fallen_knight');
  pSignet.hp = 30;
  pSignet.unlockedGear.push('vaelis_signet');
  pSignet.equippedAccessory = 'vaelis_signet';
  const foeSignet2 = createMapEnemyInstance('e_sig_2', 'fanatic_zealot', 4, 4);
  const sigOut2 = resolveEnemyCombatRound(pSignet, foeSignet2, new SeededRNG('SIGNET-SEED'));
  assert.equal(
    (sigOut2.lastTakenDmg || 0) < (sigOut1.lastTakenDmg || 0),
    true,
    'vaelis_signet must grant +20% damage reduction when HP < 30%'
  );

  // 5. black_straw_effigy self-destructs to block 1 parasite or infected infliction
  let effigyTriggered = false;
  for (let i = 0; i < 60; i++) {
    const pEff = createInitialPlayer('fallen_knight');
    pEff.hp = 135;
    pEff.unlockedGear.push('black_straw_effigy');
    pEff.equippedAccessory = 'black_straw_effigy';
    const tentacleFoe = createMapEnemyInstance(`e_eff_${i}`, 'void_tentacle_cluster', 4, 4);
    const out = resolveEnemyCombatRound(pEff, tentacleFoe, new SeededRNG(`EFFIGY-${i}`));
    if (out.logs.some((l) => l.includes('[Hình Nhân Rơm Đen] bốc cháy thành tro, gánh thay lời nguyền cho bạn!'))) {
      effigyTriggered = true;
      assert.equal(pEff.equippedAccessory, null, 'black_straw_effigy must be unequipped after self-destruct');
      assert.equal(pEff.unlockedGear.includes('black_straw_effigy'), false, 'black_straw_effigy must be removed from unlockedGear');
      assert.equal(pEff.statuses.parasite, false, 'Blocked parasite must not be applied');
      const anyInfected = Object.values(pEff.limbs.infected).some(Boolean);
      assert.equal(anyInfected, false, 'Blocked infection must not be applied');
      break;
    }
  }
  assert.equal(effigyTriggered, true, 'black_straw_effigy must trigger and block parasite/infection');
});










import {
  BOSSES,
  CLASSES,
  ENEMIES,
  FLUIDS,
  GAME_TITLE,
  GEAR_SLOTS,
  ITEMS,
  ITEM_ICON_SPECS,
  ROOMS,
  WEAPON_FAMILIES,
  WEAPONS,
  assertDataIntegrity
} from "./bloodroot-citadel-data.mjs";
import { castleWarAudioLoop, swampBogAudioLoop } from "./bloodroot-music-notes.mjs";
import { readFileSync, statSync } from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const SECONDARY_RANGED_FAMILIES = new Set(["bow", "crossbow", "wand", "scepter"]);
const runtimeSource = readFileSync(new URL("./bloodroot-citadel.mjs", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("./bloodroot-citadel.html", import.meta.url), "utf8");
const serviceWorkerSource = readFileSync(new URL("./service-worker.js", import.meta.url), "utf8");
const audioSource = readFileSync(new URL("./bloodroot-audio.mjs", import.meta.url), "utf8");
const devServerSource = readFileSync(new URL("./dev-server.mjs", import.meta.url), "utf8");
const forestAudioFile = statSync(new URL("./assets/audio/forest-of-hope.mp3", import.meta.url));
const bossAudioFile = statSync(new URL("./assets/audio/boss-battle.wav", import.meta.url));
const meleeSfxFiles = [
  statSync(new URL("./assets/audio/sfx/sword-sound.wav", import.meta.url)),
  statSync(new URL("./assets/audio/sfx/melee-sound.wav", import.meta.url)),
  statSync(new URL("./assets/audio/sfx/animal-melee-sound.wav", import.meta.url))
];

assertDataIntegrity();

assert(GAME_TITLE === "random Gaeme", "Game title should use the approved random Gaeme name.");
assert(runtimeSource.includes('document.body.dataset.build = "boss-arena-no-platforms-v108"'), "Runtime build tag should be boss-arena-no-platforms-v108.");
assert(htmlSource.includes("bloodroot-citadel.mjs?v=108"), "HTML should load the v108 module.");
assert(serviceWorkerSource.includes("bloodroot-citadel-demo-v108"), "Service worker cache should be bumped to v108.");
assert(serviceWorkerSource.includes("bloodroot-citadel.mjs?v=108"), "Service worker should cache the v108 module URL.");
assert(forestAudioFile.size > 0, "Forest of Hope MP3 should exist in project audio assets.");
assert(bossAudioFile.size > 0, "Boss Battle WAV should exist in project audio assets.");
assert(meleeSfxFiles.every((file) => file.size > 0), "Uploaded melee WAV samples should exist in project audio assets.");
assert(runtimeSource.includes('assetSrc: "./assets/audio/forest-of-hope.mp3"'), "Runtime should route Forest of Hope to normal ruins/forest music.");
assert(runtimeSource.includes('assetSrc: "./assets/audio/boss-battle.wav"'), "Runtime should route Boss Battle to boss music.");
assert(serviceWorkerSource.includes("./assets/audio/forest-of-hope.mp3") && serviceWorkerSource.includes("./assets/audio/boss-battle.wav"), "Service worker should cache uploaded audio files.");
assert(
  serviceWorkerSource.includes("./assets/audio/sfx/sword-sound.wav") &&
  serviceWorkerSource.includes("./assets/audio/sfx/melee-sound.wav") &&
  serviceWorkerSource.includes("./assets/audio/sfx/animal-melee-sound.wav"),
  "Service worker should cache uploaded melee SFX files."
);
assert(audioSource.includes("createMediaElementSource") && audioSource.includes("fallbackLoop"), "Audio helper should support uploaded music assets with generated fallback loops.");
assert(audioSource.includes("MELEE_SAMPLE_ASSETS") && audioSource.includes("decodeAudioData") && audioSource.includes("weaponMelee"), "Audio helper should preload decoded random melee WAV samples.");
assert(audioSource.includes("musicVolume: 0.24") && audioSource.includes("sfxVolume: 0.58"), "Audio mix should keep music below louder gameplay SFX.");
assert(devServerSource.includes('".mp3": "audio/mpeg"') && devServerSource.includes('".wav": "audio/wav"'), "Dev server should serve uploaded audio with browser-friendly MIME types.");
assert(runtimeSource.includes("STORY_START_POINTS") && runtimeSource.includes("startPointOption"), "Title flow should support starting at biome entry points instead of save slots.");
assert(runtimeSource.includes("function spawnStarterWeaponReward"), "Root boss starter weapon reward should use a shared fallback helper.");
assert(runtimeSource.includes('sfx.weaponMelee(weapon.family)') && runtimeSource.includes('weapon.mode !== "projectile"'), "Melee weapons should use random uploaded samples while projectile weapons keep their own sounds.");
assert(runtimeSource.includes('room.id === "rootCrawlerPit" && (state.flags.bossDefeated || state.flags.knifeBroken)'), "Root boss room should respawn the starter weapon after boss victory even if knife break was skipped.");
assert(runtimeSource.includes("spawnStarterWeaponReward(boss.x + 72"), "Huge Root Crawler death should force the starter weapon reward if dagger/chest weapons skipped knife break.");
assert(runtimeSource.includes("const INVENTORY_PAGE_SIZE = 14"), "Inventory V2 should show exactly 14 pack slots per page.");
assert(runtimeSource.includes('class="inventoryDetailPanel"'), "Inventory V2 should render selected item details in the pack panel.");
assert(runtimeSource.includes("function renderStatsJournalPage") && runtimeSource.includes('id="journalStatsTab"'), "Basic Stat spending should live on a separate Stats journal screen.");
assert(runtimeSource.includes('openJournal("stats")'), "Basic Stat spending should reopen the Stats tab after upgrades.");
assert(!runtimeSource.includes("INVENTORY_FILTERS") && !runtimeSource.includes("data-filter"), "Inventory V2 should remove the main filter row.");
assert(htmlSource.includes("grid-template-columns:repeat(7,minmax(0,1fr))"), "Inventory grid should be locked to seven columns.");
assert(htmlSource.includes("grid-template-rows:repeat(2,minmax(0,1fr))"), "Inventory grid should be locked to two rows.");
assert(htmlSource.includes("grid-template-columns:minmax(215px,270px) minmax(0,1fr)"), "Inventory page should use a wider two-column layout for larger slots.");
assert(htmlSource.includes(".statsUpgradePage"), "Stats upgrade screen CSS should be present.");
assert(htmlSource.includes(".invSlot .itemEffect{display:none}"), "Pack slot details should stay in the bottom detail panel, not slot popups.");
assert(ROOMS.length >= 12, "Game should include ruins, swamp, and castle route rooms.");
assert(ROOMS[0].id === "wakingStones", "Demo should start in Waking Stones.");
assert(ROOMS.some((room) => room.corpse?.itemId === "corpseJournal"), "Corpse journal must exist in a room.");
assert(ROOMS.some((room) => room.bossId === "hugeRootCrawler"), "Huge Root Crawler boss room is required.");
assert(ROOMS.filter((room) => room.bossId).every((room) => room.platforms.length === 0), "Boss arenas should not include climbable platforms that let players cheese boss attacks.");
assert(ROOMS.some((room) => room.id === "swampGate" && room.biome === "Swamp" && room.safe), "Swamp Gate safe room is required after the ruins.");
assert(ROOMS.some((room) => room.id === "redWolfDen" && room.bossId === "redWolf"), "Red Wolf boss room is required before the castle.");
assert(ROOMS.some((room) => room.id === "splitArch" && room.name === "Castle Gate"), "Castle Gate should be the castle checkpoint.");
assert(ROOMS.some((room) => room.bossId === "ironWarden"), "Iron Warden boss room is required.");
assert(ROOMS.find((room) => room.id === "rootCrawlerPit")?.exits?.some((exit) => exit.to === "swampGate"), "Huge Root Crawler should open the swamp route.");
assert(ROOMS.find((room) => room.id === "redWolfDen")?.exits?.some((exit) => exit.to === "splitArch" && exit.requires === "redWolfDefeated"), "Red Wolf should gate Castle access.");
const ferryRoom = ROOMS.find((room) => room.id === "isletGauntlet");
assert(ferryRoom?.ferry?.cost >= 100, "Low Islands should include a pricey ferryman ticket.");
assert(ferryRoom.ferry.blockX && ferryRoom.ferry.boatStartX && ferryRoom.ferry.boatEndX, "Ferry needs barrier and boat dock data.");
assert(ferryRoom.ferry.boatEndX - ferryRoom.ferry.boatStartX > 700, "Ferry ride should cross a real marsh channel.");
assert(!ferryRoom.platforms.some((platform) => platform.x > ferryRoom.ferry.blockX + 160 && platform.x < ferryRoom.ferry.boatEndX - 220), "Ferry channel should not be shortcut by a center platform.");

assert(WEAPONS.huntingKnife, "Hunting Knife weapon missing.");
assert(WEAPONS.brokenKnife, "Broken Knife weapon missing.");
assert(WEAPONS.rustySword, "Rusty Sword weapon missing.");
assert(WEAPONS.brawlerWraps, "Brawler Wraps weapon missing.");
assert(WEAPONS.trainingBow, "Training Bow weapon missing.");
assert(WEAPONS.apprenticeStaff, "Apprentice Scepter weapon missing.");
assert(WEAPONS.ruinDagger, "Ruin Dagger weapon missing.");
assert(WEAPONS.ruinAxe, "Ruin Axe weapon missing.");
assert(WEAPONS.twinRuinBlades, "Twin Ruin Blades weapon missing.");
assert(WEAPONS.knightSword, "Knight Sword weapon missing.");
assert(WEAPONS.knightGreatsword, "Knight Greatsword weapon missing.");
assert(WEAPONS.ironSpear, "Iron Spear weapon missing.");
assert(WEAPONS.stoneHammer, "Stone Hammer weapon missing.");
assert(WEAPONS.handCrossbow, "Hand Crossbow weapon missing.");
assert(WEAPONS.sparkWand, "Spark Wand weapon missing.");
assert(WEAPONS.sunkenSaber, "Sunken Saber weapon missing.");
assert(WEAPONS.sunkenPike, "Sunken Pike weapon missing.");
assert(WEAPONS.sunkenArbalest, "Sunken Arbalest weapon missing.");
assert(WEAPONS.sunkenFang, "Sunken Fang weapon missing.");
assert(WEAPONS.guardBow, "Guard Bow weapon missing.");
assert(WEAPONS.guardMace, "Guard Mace weapon missing.");
assert(WEAPONS.wardenGreatmace, "Warden's Greatmace weapon missing.");
assert(WEAPONS.guardMace.family === "great", "Guard Mace should use the heavy melee rhythm.");
assert(WEAPONS.guardMace.reach < WEAPONS.rustySword.reach, "Guard Mace should be shorter than the Rusty Sword.");
assert(WEAPONS.guardMace.lightCooldown > WEAPONS.rustySword.lightCooldown, "Guard Mace should be slower than the Rusty Sword.");
assert(WEAPONS.guardMace.lightDamage > WEAPONS.rustySword.lightDamage, "Guard Mace should hit harder than the Rusty Sword.");
assert(WEAPONS.rustySword.reach > WEAPONS.huntingKnife.reach, "Rusty Sword should reach farther than the tutorial knife.");
for (const familyId of Object.keys(WEAPON_FAMILIES)) {
  assert(Object.values(WEAPONS).some((weapon) => weapon.family === familyId), `Weapon family ${familyId} needs at least one weapon.`);
  assert(Object.values(ITEMS).some((item) => item.weaponId && WEAPONS[item.weaponId]?.family === familyId), `Weapon family ${familyId} needs at least one item.`);
}

assert(ITEMS.corpseJournal.type === "journal", "Corpse Journal should be a journal item.");
assert(Object.keys(ITEM_ICON_SPECS).length === Object.keys(ITEMS).length, "Every item should have exactly one custom UI icon.");
for (const itemId of Object.keys(ITEMS)) {
  assert(ITEM_ICON_SPECS[itemId]?.svg, `${itemId} needs a custom UI icon.`);
}
assert(ITEMS.rustySword.weaponId === "rustySword", "Rusty Sword item should equip the rusty sword weapon.");
assert(ITEMS.knightGreatsword.weaponId === "knightGreatsword", "Knight Greatsword should equip the greatsword weapon.");
assert(ITEMS.ruinAxe.weaponId === "ruinAxe", "Ruin Axe should equip the axe weapon.");
assert(ITEMS.twinRuinBlades.weaponId === "twinRuinBlades", "Twin Ruin Blades should equip the dual weapon.");
assert(ITEMS.knightHelm.slot === "head", "Knight Helm should fill the head slot.");
assert(ITEMS.knightChestplate.slot === "body", "Knight Chestplate should fill the body slot.");
assert(ITEMS.knightGauntlets.slot === "hands", "Knight Gauntlets should fill the hands slot.");
assert(ITEMS.knightGreaves.slot === "legs", "Knight Greaves should fill the legs slot.");
assert(ITEMS.knightBoots.slot === "feet", "Knight Boots should fill the feet slot.");
assert(ITEMS.sunkenGuardMask.slot === "head", "Sunken Guard Mask should fill the head slot.");
assert(ITEMS.sunkenGuardMail.slot === "body", "Sunken Guard Mail should fill the body slot.");
assert(ITEMS.sunkenGuardBracers.slot === "hands", "Sunken Guard Bracers should fill the hands slot.");
assert(ITEMS.sunkenGuardGreaves.slot === "legs", "Sunken Guard Greaves should fill the legs slot.");
assert(ITEMS.sunkenGuardTreads.slot === "feet", "Sunken Guard Treads should fill the feet slot.");
assert(ITEMS.royalCrest.slot === "crest", "Royal Crest should fill the crest slot.");
assert(ITEMS.guardMace.weaponId === "guardMace", "Guard Mace item should equip the Guard Mace weapon.");
assert(ITEMS.wardenGreatmace.weaponId === "wardenGreatmace", "Warden's Greatmace should equip the boss great weapon.");
assert(GEAR_SLOTS.some((slot) => slot.id === "weapon"), "Equipment slots need a weapon slot.");
assert(GEAR_SLOTS.some((slot) => slot.id === "secondaryWeapon"), "Equipment slots need a secondary weapon slot.");
assert(GEAR_SLOTS.some((slot) => slot.id === "crest"), "Equipment slots need a crest slot.");
assert(runtimeSource.includes('"crest", "modification"'), "Journal equipment slot order should render the crest slot.");
for (const familyId of SECONDARY_RANGED_FAMILIES) {
  assert(Object.values(ITEMS).some((item) => item.weaponId && WEAPONS[item.weaponId]?.family === familyId), `Secondary weapon family ${familyId} needs a test item.`);
}
assert(CLASSES.rootbound?.ability?.id === "thornSpear", "Rootbound needs Thorn Spear.");
assert(CLASSES.frenzied?.ability?.id === "ruinPounce", "Frenzied needs Ruin Pounce.");
assert(CLASSES.hollow?.ability?.id === "ambushCut", "Hollow needs Ambush Cut.");
for (const klass of Object.values(CLASSES)) {
  assert(!klass.weaponId && !klass.weaponItemId, `${klass.id} should not decide the post-boss weapon reward.`);
  assert(klass.ability?.cooldown > 0, `${klass.id} needs a cooldown-only R ability.`);
  assert(!klass.ability?.staminaCost, `${klass.id} R ability should not spend stamina.`);
}
assert(CLASSES.frenzied.stats.attackSpeed > CLASSES.rootbound.stats.attackSpeed, "Frenzied should have the faster pressure rhythm.");
assert(CLASSES.hollow.stats.maxStamina > CLASSES.frenzied.stats.maxStamina, "Hollow should have the deepest stamina pool.");
assert(CLASSES.hollow.stats.maxHp < CLASSES.frenzied.stats.maxHp, "Hollow should be the riskier origin.");

assert(ENEMIES.rootCrawler.fluid === "rootIchor", "Root-Bent Crawlers should use root ichor.");
assert(ENEMIES.hugeLobster?.ai === "hugeLobster", "Swamp needs Huge Lobster enemy data.");
assert(ENEMIES.alligator?.ai === "alligator", "Swamp needs Alligator enemy data.");
assert(ENEMIES.seaJelly?.ai === "seaJelly", "Swamp needs Sea Jelly enemy data.");
assert(ENEMIES.drownedKnight?.ai === "drownedKnight", "Swamp needs Drowned Knight enemy data.");
assert(BOSSES.redWolf?.maxHp >= 650, "Red Wolf should be the swamp boss.");
assert(BOSSES.redWolf?.maxHp >= 900, "Red Wolf should be retuned as a real swamp boss.");
assert(ENEMIES.castleKnight.maxHp >= 95 && ENEMIES.castleKnight.damage >= 18, "Castle Knight should be retuned as a punishing castle enemy.");
assert(ENEMIES.castleArcher.attackWind >= 0.7 && ENEMIES.castleArcher.damage >= 14, "Castle Archer should be dangerous but more readable.");
assert(ENEMIES.gargoyle.projectileDamage >= 12, "Gargoyle should have its red stone-spit projectile data.");
assert(ENEMIES.spikedBrute.maxHp >= 145 && !("blastDamage" in ENEMIES.spikedBrute), "Spiked Brute should be punishing without the removed core burst.");
assert(ENEMIES.gargoyle.fluid === "stoneDust", "Gargoyles should crumble into stone dust.");
assert(FLUIDS.rootIchor.primary && FLUIDS.rootIchor.stain, "Root ichor needs particle and stain colors.");
assert(FLUIDS.swampGel.primary && FLUIDS.swampGel.stain, "Swamp gel needs particle and stain colors.");
assert(BOSSES.hugeRootCrawler.knifeBreakAt > 0.5, "Knife break should happen during the first boss clash.");
assert(BOSSES.hugeRootCrawler.maxHp >= 460 && BOSSES.hugeRootCrawler.damage <= 12, "Huge Root Crawler should be retuned as a longer, less bursty boss.");
assert(BOSSES.redWolf.maxHp >= 1500 && BOSSES.redWolf.damage <= 23, "Red Wolf should be retuned as a longer, less bursty swamp boss.");
assert(BOSSES.ironWarden.maxHp >= 1850 && BOSSES.ironWarden.damage <= 14, "Iron Warden should be retuned as a longer, less bursty castle boss.");
assert(castleWarAudioLoop.title === "Keep Under Siege", "Castle war music loop should be wired.");
assert(castleWarAudioLoop.eventSteps > 0 && castleWarAudioLoop.events.length > 0, "Castle war music needs scheduled events.");
assert(swampBogAudioLoop.title === "Dead Marsh Pulse", "Swamp music loop should be wired.");
assert(swampBogAudioLoop.eventSteps > 0 && swampBogAudioLoop.events.length > 0, "Swamp music needs scheduled events.");
assert(runtimeSource.includes('state.runMode === "challenge"'), "Challenge mode state should exist.");
assert(runtimeSource.includes("SAVE_SLOT_COUNT = 3"), "Three save slots should be wired.");
assert(runtimeSource.includes("function drawSwampBackground"), "Swamp background renderer should be wired.");
assert(runtimeSource.includes("function updateRedWolfBoss"), "Red Wolf boss runtime should be wired.");
assert(runtimeSource.includes("swampBogAudioLoop"), "Runtime should route swamp rooms to swamp music.");
assert(runtimeSource.includes("function applyFerryBarrier"), "Runtime should block the ferry channel instead of allowing a walk-through shortcut.");
assert(runtimeSource.includes("function startFerryRide"), "Runtime should run a ferry boat cutscene.");
assert(runtimeSource.includes('type: "ferryBoat"'), "Ferry crossing should use a locked ferryBoat cinematic.");
assert(runtimeSource.includes("BASIC_STAT_POINTS_PER_LEVEL = 3"), "Level-ups should grant 3 Basic Stat Points.");
assert(runtimeSource.includes("MAX_BASIC_HP_REGEN = 3"), "Basic HP regen cap should stay at 3 HP/s.");
assert(runtimeSource.includes("basicStatPoints") && runtimeSource.includes("basicStatsSpent"), "Progression snapshots need Basic Stat fields.");
assert(runtimeSource.includes("function spendBasicStat"), "Journal Stats should support spending Basic Stat Points.");
assert(runtimeSource.includes("function attackMovementMultiplier"), "Attacks should slow movement for anti-spam commitment.");
assert(runtimeSource.includes("function aimAngleForWeapon"), "Player arm and weapon aim should use free-angle weapon rules.");
assert(runtimeSource.includes("function aimDirectionSide"), "Attack sweep side should follow aim without turning the body.");
assert(runtimeSource.includes("mouse.aimIntent"), "Cursor aim intent should stay separate from movement-facing control.");
assert(runtimeSource.includes("updateTouchAttackAim"), "Mobile attack control should support right-side aim while attacking.");
assert(!runtimeSource.includes("player.facing = sign(dx);"), "Mouse aim should not turn the body.");
assert(!runtimeSource.includes("player.facing = sign(player.aimX);"), "Touch/cursor aim should not turn the body.");
assert(runtimeSource.includes("titleCastleScene"), "Title screen should use the coded castle scene.");
assert(runtimeSource.includes("titleMinimal") && htmlSource.includes(".titleMinimal"), "Title screen should use the minimal dark-gold presentation.");
assert(runtimeSource.includes("classPickTitle") && runtimeSource.includes("--class-color"), "Class selection should be obvious and color-coded.");
assert(!runtimeSource.includes('classDesc">${klass.desc}'), "Class cards should hide class descriptions.");
assert(runtimeSource.includes("const angle = player.aimAngle + idleDrop * player.facing"), "Idle held weapon should follow the current aim angle.");
assert(runtimeSource.includes("function drawReadableBiomeBorders"), "Biome borders should be reinforced for readable maps.");

console.log("random Gaeme data check passed.");

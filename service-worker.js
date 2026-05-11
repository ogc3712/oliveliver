const CACHE_NAME = "bloodroot-citadel-demo-v108";
const FILES = [
  "./",
  "./bloodroot-citadel.html",
  "./bloodroot-citadel.mjs",
  "./bloodroot-citadel.mjs?v=108",
  "./bloodroot-citadel-data.mjs",
  "./bloodroot-audio.mjs",
  "./bloodroot-music-notes.mjs",
  "./bloodroot-particle-recipes.mjs",
  "./manifest.webmanifest",
  "./bloodroot-icon.svg",
  "./assets/audio/forest-of-hope.mp3",
  "./assets/audio/boss-battle.wav",
  "./assets/audio/sfx/sword-sound.wav",
  "./assets/audio/sfx/melee-sound.wav",
  "./assets/audio/sfx/animal-melee-sound.wav",
  "./assets/sprites/random-guy-sprite-game-v2-sheet.png",
  "./assets/tiles/mossy-ruin-ground-v2-tile.png",
  "./assets/tiles/mossy-ruin-underfloor-v1-tile.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

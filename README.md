# Senja Skies — Langit Senja

[![best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/ahmadcrypto/best-flight-game-20261126-0057-entry/rank.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/ahmadcrypto/best-flight-game-20261126-0057-entry/reward.svg)](https://make.fun/c/best-flight-game-20261126-0057)

Game terbang 2D original: pesawat fiksi kecil **Camar Senja** terbang di atas
pulau tropis fiktif saat matahari terbenam — sawah, sungai, jalan, kota kecil,
gunung berapi di kejauhan, dan laut di ujung timur. Semua gambar digambar
dengan canvas, semua suara disintesis WebAudio, tanpa file eksternal dan
tanpa request network.

## Cara main

- **W / S** (atau ↑ / ↓): throttle naik / turun
- **A / D** (atau ← / →): menukik / mendaki
- **1 / 2 / 3**: pilih misi di menu (atau klik kartunya)
- **R**: ulangi misi — **P**: jeda — **M**: suara — **Esc**: kembali ke menu
- Tombol di layar (THR±, ▲, ▼) bisa ditekan dengan mouse / sentuhan.

## Misi

1. **Penerbangan Perdana** — lepas landas, lewati 5 ring, mendarat selamat.
2. **Antar Paket Pulau** — bawa paket ke airstrip pulau di ujung timur.
3. **Rally Senja** — 8 ring melawan waktu 150 detik dengan bahan bakar terbatas.

Throttle membeli kecepatan, kecepatan membeli lift, lift membeli ketinggian —
dan bahan bakar membeli semuanya. Terbang terlalu pelan, sayap berhenti
mengangkat dan hidung jatuh. Mendarat terlalu keras, pesawat rusak.
Mendarat di sawah masih mungkin, tapi mahal. Di Rally Senja, throttle penuh
terus-menerus akan menghabiskan bahan bakar sebelum ring terakhir —
hemat throttle di jalan lurus, gas penuh saat mendaki.

## Jalankan lokal

```sh
node serve.ts   # lalu buka http://localhost:8080
```

atau serve folder `game/` dengan static server apa pun. Screenshot pose
deterministik: `?shot=start|play|end|rally`.

## Struktur

- `game/index.html` — halaman game + tombol layar
- `game/src/config.js` — semua konstanta tuning
- `game/src/input.js` — keyboard + tombol mouse
- `game/src/terrain.js` — terrain prosedural (sawah, sungai, kota, gunung)
- `game/src/aircraft.js` — model terbang (throttle, lift, drag, fuel, damage)
- `game/src/rings.js` — ring target + progres misi
- `game/src/instruments.js` — HUD dan gauge analog menyala
- `game/src/render.js` — langit, terrain, pesawat, runway
- `game/src/audio.js` — suara sintetis WebAudio
- `game/src/main.js` — game loop + state menu/terbang/mendarat/crash
- `game/src/shots.js` — pose deterministik untuk screenshot
- `main.ts` — hand-in: salin game/ + screenshots/, tulis dossier.json
- `vendor/makefun-game.ts` — salinan kit, tidak diubah

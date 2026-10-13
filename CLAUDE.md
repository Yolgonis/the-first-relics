# The First Relics (the-first-relics)

Foundry VTT 13 / dnd5e 5.3.3 ticari modülü: affinity ile gelişen 12 efsanevi relic. Yazar Yolgonis; **Patreon'da satılacak** tek modül. Kullanıcıyla Türkçe konuş; modülün kodu, yorumları, README ve CHANGELOG İngilizce. Genel bağlam: `C:\Claude\Vaelora\CLAUDE.md`.

- Foundry'de `Data\modules\the-first-relics` junction'ıyla yüklenir; değişikliği Foundry doğrudan görür.
- GitHub: `Yolgonis/the-first-relics` (gizli; Temmuz 2026'dan beri kullanıcının geçmişi var, force push yapma). Her iş bitince commit + push.
- Kod tek dosyada: `scripts/the-first-relics.js` (~8.300 satır). Relic içeriği `data/relics.json`.
- Test için Foundry içinde: `await FirstRelics.runDiagnostics()`, `FirstRelics.runReleaseCheck()`, `FirstRelics.openDashboard()`, `FirstRelics.openControlPanel()`.

## Sürüm çıkarma

Sürüm numarası beş yerde aynı olmalı: `module.json`, `scripts/the-first-relics.js` (`TFR_VERSION`), `README.md` (başlık ve "Current public version"), `CHANGELOG.md` (`## vX.Y.Z`). Yeni girdiyi CHANGELOG'un en üstüne ekle.

## Çeviri (i18n)

Arayüz metinleri kodda İngilizce kalır ve `TFRT("English text", { placeholder })` ile sarılır; anahtar metnin FNV-1a hash'idir. Şablon metin (`${}`) kullanma, `{ad}` yer tutucusu kullan. Yeni ya da değişen metinden sonra:

```
node tools/i18n-extract.cjs           # lang/en.json'u üretir, eksik çevirileri listeler
# tools/translations/tr.cjs'e İngilizce → Türkçe çeviriyi ekle
node tools/i18n-build-lang.cjs tr     # lang/tr.json'u üretir (yer tutucuları denetler)
```

Terimler: D&D/Foundry terimleri İngilizce (attunement, token, GM, ft, temp HP); modül kavramları Türkçe (Affinity=Yakınlık, Stage=Aşama, Mood=Ruh Hali, Signature=İmza, True Name=Gerçek Ad, dormant/awakened/exalted/final form=uykuda/uyanmış/yüceltilmiş/nihai form). Aşama ve durum kimlikleri veride İngilizce kalır; yalnızca `TFRStageLabel` / `TFRStatusLabel` ile gösterilirken çevrilir.

Henüz çevrilmeyen (2. aşama): `data/relics.json` içeriği (adlar, güçler, lore, ruh halleri), relic güç sohbet kartları, dünyaya yazılan eşya açıklamaları ve journal. Konsol raporları bilerek İngilizce.

Foundry yeni dil dosyalarını dünya yeniden başlatılınca yükler; hızlı test için tarayıcıda `foundry.utils.mergeObject(game.i18n.translations, await (await fetch("/modules/the-first-relics/lang/tr.json")).json())` yalnızca o istemciye yükler.

## Paketleme (Patreon)

```
pwsh tools/package.ps1
```

`dist/the-first-relics-v<sürüm>.zip` üretir (`dist/` git'te yok sayılır). Önce yukarıdaki sürüm tutarlılığını denetler. Yalnızca izin listesindeki yollar pakete girer: `module.json`, `README.md`, `CHANGELOG.md`, `LICENSE.md`, `scripts/`, `styles/`, `lang/`, `data/`, `art/` (contact sheet hariç). Çeviriler eksikse paketlemez. `tools/`, `CLAUDE.md`, `.git*` asla pakete girmez. `module.json` zip kökündedir.

## Lisans

`LICENSE.md` ticari kişisel kullanım lisansı: yeniden dağıtım, satış, değiştirilmiş sürüm yayınlama ve yapay zekâ eğitimi yasak.

## Notlar

- Foundry v13 `DialogV2` içeriği zaten bir `<form>` içine koyar; içeriğe `<form>` yazma (tarayıcı iç içe formu siler ve sınıflar kaybolur). İçerik `cleanHTML` ile süzülür.
- v13 uygulama düğmelerine sabit yükseklik verir; çok satırlı düğmelerde `height: auto` gerekir.

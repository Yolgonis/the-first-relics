# The First Relics (the-first-relics)

Foundry VTT 13 / dnd5e 5.3.3 ticari modülü: affinity ile gelişen 12 efsanevi relic. Yazar Yolgonis; **Patreon'da satılacak** tek modül. Kullanıcıyla Türkçe konuş; modülün kodu, yorumları, README ve CHANGELOG İngilizce. Genel bağlam: `C:\Claude\Vaelora\CLAUDE.md`.

- Foundry'de `Data\modules\the-first-relics` junction'ıyla yüklenir; değişikliği Foundry doğrudan görür.
- GitHub: `Yolgonis/the-first-relics` (gizli; Temmuz 2026'dan beri kullanıcının geçmişi var, force push yapma). Her iş bitince commit + push.
- Kod `src/` altında 27 parçada (`00-core.js` … `26-content-language.js`). Foundry tek dosya yükler: `scripts/the-first-relics.js`, `node tools/build.cjs` ile parçalar dosya adı sırasıyla birleştirilerek üretilir. **`scripts/the-first-relics.js`'i elle düzenleme**; `src/`'yi düzenle, sonra build et ve iki dosyayı birlikte commit et (Foundry junction üzerinden birleşik dosyayı okur). Parçalar tek bir ES module kapsamını paylaşır: import/export yok, sıra önemli (üst düzey `const` ve `TFRRegisterToolbarButton()` gibi çağrılar kendinden önceki parçalara dayanır). Yeni parça eklerken numara ver.
- Relic içeriği `data/relics.json`.
- Test için Foundry içinde: `await FirstRelics.runDiagnostics()`, `FirstRelics.runReleaseCheck()`, `FirstRelics.openDashboard()`, `FirstRelics.openControlPanel()`.

## Sürüm çıkarma

Sürüm numarası beş yerde aynı olmalı: `module.json`, `src/00-core.js` (`TFR_VERSION`, sonra build), `README.md` (başlık ve "Current public version"), `CHANGELOG.md` (`## vX.Y.Z`). Yeni girdiyi CHANGELOG'un en üstüne ekle.

## Çeviri (i18n)

Arayüz metinleri kodda İngilizce kalır ve `TFRT("English text", { placeholder })` ile sarılır; anahtar metnin FNV-1a hash'idir. Şablon metin (`${}`) kullanma, `{ad}` yer tutucusu kullan. Yeni ya da değişen metinden sonra:

```
node tools/build.cjs                  # önce birleşik dosyayı güncelle (i18n araçları onu okur)
node tools/i18n-extract.cjs           # lang/en.json'u üretir, eksik çevirileri listeler
# tools/translations/tr.cjs'e İngilizce → Türkçe çeviriyi ekle
node tools/i18n-build-lang.cjs tr     # lang/tr.json'u üretir (yer tutucuları denetler)
```

Terimler: D&D/Foundry terimleri İngilizce (attunement, token, GM, ft, temp HP); modül kavramları Türkçe (Affinity=Yakınlık, Stage=Aşama, Mood=Ruh Hali, Signature=İmza, True Name=Gerçek Ad, dormant/awakened/exalted/final form=uykuda/uyanmış/yüceltilmiş/nihai form). Aşama ve durum kimlikleri veride İngilizce kalır; yalnızca `TFRStageLabel` / `TFRStatusLabel` ile gösterilirken çevrilir.

Dünyaya yazılan içerik (eşya, açıklama, aktivite, efekt, günlük) istemci dilini değil dünya ayarı `contentLanguage`'i ("Relic content language") kullanır: `TFRContentLanguage()`. Bunu sağlayan, `src/26-content-language.js`'teki senkron derleyici sarmalayıcılarıdır (`TFRContentScoped`); dünyaya metin yazan yeni bir senkron derleyici eklersen oraya da ekle. Sarmalayıcı içinde `TFRT` içerik dilinin `lang/<dil>.json` sözlüğünü kullanır. Relic içeriği `data/i18n/<dil>.json` katmanıyla çevrilir (`tools/i18n-content.cjs extract|build tr`, kaynak `tools/translations/content-tr.cjs`). Dünyada var olan eşyalar oluşturuldukları dilde kalır; Rebuild Existing Relics ile yenilenir. Konsol raporları bilerek İngilizce.

Foundry yeni dil dosyalarını dünya yeniden başlatılınca yükler; hızlı test için tarayıcıda `foundry.utils.mergeObject(game.i18n.translations, await (await fetch("/modules/the-first-relics/lang/tr.json")).json())` yalnızca o istemciye yükler.

## Paketleme (Patreon)

```
pwsh tools/package.ps1
```

`dist/the-first-relics-v<sürüm>.zip` üretir (`dist/` git'te yok sayılır). Önce yukarıdaki sürüm tutarlılığını ve birleşik dosyanın `src/` ile güncel olduğunu denetler. Yalnızca izin listesindeki yollar pakete girer: `module.json`, `README.md`, `CHANGELOG.md`, `LICENSE.md`, `scripts/`, `styles/`, `lang/`, `data/`, `art/` (contact sheet hariç). Çeviriler eksikse paketlemez. `src/`, `tools/`, `CLAUDE.md`, `.git*` asla pakete girmez. `module.json` zip kökündedir.

## Lisans

`LICENSE.md` ticari kişisel kullanım lisansı: yeniden dağıtım, satış, değiştirilmiş sürüm yayınlama ve yapay zekâ eğitimi yasak.

## Notlar

- Foundry v13 `DialogV2` içeriği zaten bir `<form>` içine koyar; içeriğe `<form>` yazma (tarayıcı iç içe formu siler ve sınıflar kaybolur). İçerik `cleanHTML` ile süzülür.
- v13 uygulama düğmelerine sabit yükseklik verir; çok satırlı düğmelerde `height: auto` gerekir.

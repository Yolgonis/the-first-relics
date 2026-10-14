# The First Relics (the-first-relics)

Foundry VTT 13 / dnd5e 5.3.3 modülü: affinity ile gelişen 12 efsanevi relic. Yazar Yolgonis.

**Güncel yön (14.10.2026):** Satış planı askıda; amaç modülü geliştirmek ve güzelleştirmek. Yalnızca İngilizce geliştirilir, Türkçe kapalı (aşağıda). Paketleme ve lisans dosyaları ileride satış için duruyor. Kullanıcıyla Türkçe konuş; modülün kodu, yorumları, README ve CHANGELOG İngilizce. Genel bağlam: `C:\Claude\Vaelora\CLAUDE.md`.

- Foundry'de `Data\modules\the-first-relics` junction'ıyla yüklenir; değişikliği Foundry doğrudan görür.
- GitHub: `Yolgonis/the-first-relics` (gizli; Temmuz 2026'dan beri kullanıcının geçmişi var, force push yapma). Her iş bitince commit + push.
- Kod `src/` altında 27 parçada (`00-core.js` … `26-content-language.js`). Foundry tek dosya yükler: `scripts/the-first-relics.js`, `node tools/build.cjs` ile parçalar dosya adı sırasıyla birleştirilerek üretilir. **`scripts/the-first-relics.js`'i elle düzenleme**; `src/`'yi düzenle, sonra build et ve iki dosyayı birlikte commit et (Foundry junction üzerinden birleşik dosyayı okur). Parçalar tek bir ES module kapsamını paylaşır: import/export yok, sıra önemli (üst düzey `const` ve `TFRRegisterToolbarButton()` gibi çağrılar kendinden önceki parçalara dayanır). Yeni parça eklerken numara ver.
- Relic içeriği `data/relics.json`. Pasif özellikler açıklama metnidir; her zaman açık olanlar `src/04-items.js`'teki `TFR_PASSIVE_EFFECTS` tablosuyla (relic id → pasif sırası → Active Effect değişiklikleri) otomatikleşir. Aşamaya göre açılır, attunement yoksa ya da reddedilmişse dnd5e bastırır; mevcut eşyalar açılışta `TFRSyncAllPassiveEffects` ile güncellenir. Durumsal pasifler GM'dedir.
- Test için Foundry içinde: `await FirstRelics.runDiagnostics()`, `FirstRelics.runReleaseCheck()`, `FirstRelics.openDashboard()`, `FirstRelics.openControlPanel()`.

## Sürüm çıkarma

Sürüm numarası beş yerde aynı olmalı: `module.json`, `src/00-core.js` (`TFR_VERSION`, sonra build), `README.md` (başlık ve "Current public version"), `CHANGELOG.md` (`## vX.Y.Z`). Yeni girdiyi CHANGELOG'un en üstüne ekle.

## Çeviri (i18n)

Modül şimdilik **yalnızca İngilizce**. Türkçe 14.10.2026'da kapatıldı: `lang/tr.json`, `data/i18n/tr.json` ve module.json'daki `tr` dil kaydı kaldırıldı; `TFR_CONTENT_LANGUAGES` yalnızca `en`. Türkçe kaynaklar `tools/translations/tr.cjs` (arayüz) ve `tools/translations/content-tr.cjs` (relic içeriği) içinde duruyor ama İngilizce metin değiştikçe güncellenmiyor; yeniden açarken eksikleri tamamla.

Altyapı yerinde kalıyor, yeni metin yazarken ona uy:
- Arayüz metinleri `TFRT("English text", { placeholder })` ile sarılır; anahtar metnin FNV-1a hash'idir. `TFRT` içinde şablon metin (`${}`) kullanma, `{ad}` yer tutucusu kullan. Metin değişince `node tools/build.cjs` ve `node tools/i18n-extract.cjs` (lang/en.json'u üretir).
- Dünyaya yazılan içerik (eşya, açıklama, aktivite, efekt, günlük) dünya ayarı `contentLanguage`'i kullanır (`TFRContentLanguage()`); dünyaya metin yazan yeni bir senkron derleyici eklersen `src/26-content-language.js`'e de ekle. Tek dil varken ayar gizlidir.
- Relic içeriği `data/relics.json`; çeviri katmanı `data/i18n/<dil>.json`.
- Aşama ve durum kimlikleri veride İngilizce kalır; gösterim `TFRStageLabel` / `TFRStatusLabel` ile.

Türkçeyi yeniden açmak için: çevirileri tamamla, `node tools/i18n-build-lang.cjs tr` ve `node tools/i18n-content.cjs build tr`, `TFR_CONTENT_LANGUAGES`'e ve module.json `languages`'a `tr` ekle. Terimler: D&D/Foundry terimleri İngilizce (attunement, token, GM, ft, temp HP); modül kavramları Türkçe (Affinity=Yakınlık, Stage=Aşama, Mood=Ruh Hali, Signature=İmza, True Name=Gerçek Ad, dormant/awakened/exalted/final form=uykuda/uyanmış/yüceltilmiş/nihai form).

## Paketleme (satış askıda)

```
pwsh tools/package.ps1
```

`dist/the-first-relics-v<sürüm>.zip` üretir (`dist/` git'te yok sayılır). Önce yukarıdaki sürüm tutarlılığını ve birleşik dosyanın `src/` ile güncel olduğunu denetler. Yalnızca izin listesindeki yollar pakete girer: `module.json`, `README.md`, `CHANGELOG.md`, `LICENSE.md`, `scripts/`, `styles/`, `lang/`, `data/`, `art/` (contact sheet hariç). Çeviriler eksikse paketlemez. `src/`, `tools/`, `CLAUDE.md`, `.git*` asla pakete girmez. `module.json` zip kökündedir.

## Lisans

`LICENSE.md` ticari kişisel kullanım lisansı: yeniden dağıtım, satış, değiştirilmiş sürüm yayınlama ve yapay zekâ eğitimi yasak.

## Notlar

- Foundry v13 `DialogV2` içeriği zaten bir `<form>` içine koyar; içeriğe `<form>` yazma (tarayıcı iç içe formu siler ve sınıflar kaybolur). İçerik `cleanHTML` ile süzülür.
- v13 uygulama düğmelerine sabit yükseklik verir; çok satırlı düğmelerde `height: auto` gerekir.

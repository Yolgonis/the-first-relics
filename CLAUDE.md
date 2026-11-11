# The First Relics (the-first-relics)

Foundry VTT 13 / dnd5e 5.3.3 modülü: affinity ile gelişen 12 efsanevi relic. Yazar Yolgonis.

**Güncel yön (14.10.2026):** Satış planı askıda; amaç modülü geliştirmek ve güzelleştirmek. Yalnızca İngilizce geliştirilir, Türkçe kapalı (aşağıda). Paketleme ve lisans dosyaları ileride satış için duruyor. Kullanıcıyla Türkçe konuş; modülün kodu, yorumları, README ve CHANGELOG İngilizce. Genel bağlam: `C:\Claude\Vaelora\CLAUDE.md`.

- Foundry'de `Data\modules\the-first-relics` junction'ıyla yüklenir; değişikliği Foundry doğrudan görür.
- GitHub: `Yolgonis/the-first-relics` (gizli; Temmuz 2026'dan beri kullanıcının geçmişi var, force push yapma). Her iş bitince commit + push.
- Kod `src/` altında 27 gerçek ES modülü (`00-core.js` … `27-passive-triggers.js`; 26 numara boş). **Build adımı yok** (1.4.0'dan beri): Foundry `scripts/the-first-relics.js` giriş dosyasını yükler, o da son parçayı içe aktarır. Her parçanın ilk satırı kendinden önceki parçayı içe aktarır (`import "./NN-önceki.js"`); bu zincir parçaların numara sırasıyla çalışmasını sağlar, kaldırma. Bir parça başka parçadan kullandığı her adı `import { … }` ile alır, başka parçanın kullandığı tanımlarını `export` eder. Başka parçadaki bir fonksiyonu kullanmaya başlarsan import satırına ekle ve tanımına `export` yaz; yoksa çağrıldığı anda "is not defined" hatası verir. İçe aktarılan ad başka parçadan değiştirilemez: paylaşılan bir `let` için sahibi parçaya ayarlayıcı fonksiyon yaz (`TFRSetStartupSync` gibi). Yeni parça eklerken numara ver, ilk satırda öncekini içe aktar, sonraki parçanın zincir satırını ve gerekirse giriş dosyasını güncelle. Değişiklikten sonra `node tools/check-load.mjs` çalıştır: modülü sahte Foundry globalleriyle yükler, eksik export ve yükleme sırası hatalarını yakalar (fonksiyonların içini çalıştırmaz).
- Relic içeriği `data/relics.json`. Pasif özellikler açıklama metnidir; her zaman açık olanlar `src/04-items.js`'teki `TFR_PASSIVE_EFFECTS` tablosuyla (relic id → pasif sırası → Active Effect değişiklikleri) otomatikleşir. Aşamaya göre açılır, attunement yoksa ya da reddedilmişse dnd5e bastırır; mevcut eşyalar açılışta `TFRSyncAllPassiveEffects` ile güncellenir. Müttefik auraları aynı tabloda `aura: { distance, self }` ile tanımlanır ve yalnızca Aura Effects (`auraeffects`) etkinken `auraeffects.aura` tipinde efekt olur; Aura Effects auraları token menzile girince uygular (zaten menzildeki token için uygulamaz). Test ederken token'ı `update({x, y}, { animate: false })` ile taşı; tarayıcı paneli gizliyken animasyonlu taşıma bekler. Olayla tetiklenen pasifler (savaş başı, 0 HP, uzun dinlenme, kehanet büyüsü, iyileştirme, düşman öldürme) `src/27-passive-triggers.js`'te hook'larla çalışır; açıklamadaki işaret için `TFR_PASSIVE_TRIGGERS` tablosuna da eklenir. Uzun dinlenmede bir kezlik kullanımlar eşyada `flags.the-first-relics.passiveUses` içinde tutulur. Kural (kullanıcı, 14.10.2026): GM kararı gerektiren her şey GM'de kalır; kararsız kısmı otomatikleştirilebilen her şey otomatik olur. Tur ve sıra sınırları `TFRActorCombat` ile aktörün savaşına bağlıdır (`game.combat` görüntülenen sahneyi izler). Tanı: `FirstRelics.passiveStatus(actor)`. Kabuk tırnağıyla yazılan `\b` ve `\n` gibi kaçışlar bozulabilir; kaynak düzenlemelerini Edit aracıyla yap. Relic kimliği değişirse `src/06-relic-state.js`'teki `TFR_LEGACY_RELIC_IDS` tablosuna ekle; açılışta `TFRMigrateLegacyRelicIds` dünya verisini taşır.
- Otomatik testler: `node --test "tests/*.test.mjs"` (Foundry gerekmez). `tests/foundry-stub.mjs` sahte Foundry globallerini kurar ve modülün kendi dosyalarına yapılan `fetch`'i depodan karşılar; testler `src/` parçalarını doğrudan içe aktarır. Kapsam: affinity/aşama/ruh hali eşikleri, relic verisinin biçimi ve tablolarla tutarlılığı, sınıf şartlı attunement, kimlik taşıması. Saf mantık ya da tablo değiştirince testi de güncelle; test edilecek tanım dışa açık değilse `export` ekle. Eşya üretimi, aktiviteler ve arayüz yalnızca Foundry içinde denenir.
- Test için Foundry içinde: `await FirstRelics.runDiagnostics()`, `FirstRelics.runReleaseCheck()`, `FirstRelics.openDashboard()`, `FirstRelics.openControlPanel()`.

## Sürüm çıkarma

Sürüm numarası beş yerde aynı olmalı: `module.json`, `src/00-core.js` (`TFR_VERSION`), `README.md` (başlık ve "Current public version"), `CHANGELOG.md` (`## vX.Y.Z`). Yeni girdiyi CHANGELOG'un en üstüne ekle.

## Çeviri (i18n)

Modül şimdilik **yalnızca İngilizce**. Türkçe 14.10.2026'da kapatıldı: `lang/tr.json`, `data/i18n/tr.json` ve module.json'daki `tr` dil kaydı kaldırıldı; `TFR_CONTENT_LANGUAGES` yalnızca `en`. Türkçe kaynaklar `tools/translations/tr.cjs` (arayüz) ve `tools/translations/content-tr.cjs` (relic içeriği) içinde duruyor ama İngilizce metin değiştikçe güncellenmiyor; yeniden açarken eksikleri tamamla.

Altyapı yerinde kalıyor, yeni metin yazarken ona uy:
- Arayüz metinleri `TFRT("English text", { placeholder })` ile sarılır; anahtar metnin FNV-1a hash'idir. `TFRT` içinde şablon metin (`${}`) kullanma, `{ad}` yer tutucusu kullan. Metin değişince `node tools/i18n-extract.cjs` (`src/` parçalarını okuyup lang/en.json'u üretir).
- Dünyaya yazılan içerik (eşya, açıklama, aktivite, efekt, günlük) dünya ayarı `contentLanguage`'i kullanır (`TFRContentLanguage()`); dünyaya metin yazan yeni bir senkron derleyici eklersen tanımlandığı parçanın sonunda `Ad = TFRContentScoped(Ad);` satırıyla sar (01, 03, 04 ve 05. parçaların sonundaki örnekler gibi). Tek dil varken ayar gizlidir.
- Relic içeriği `data/relics.json`; çeviri katmanı `data/i18n/<dil>.json`.
- Aşama ve durum kimlikleri veride İngilizce kalır; gösterim `TFRStageLabel` / `TFRStatusLabel` ile.

Türkçeyi yeniden açmak için: çevirileri tamamla, `node tools/i18n-build-lang.cjs tr` ve `node tools/i18n-content.cjs build tr`, `TFR_CONTENT_LANGUAGES`'e ve module.json `languages`'a `tr` ekle. Terimler: D&D/Foundry terimleri İngilizce (attunement, token, GM, ft, temp HP); modül kavramları Türkçe (Affinity=Yakınlık, Stage=Aşama, Mood=Ruh Hali, Signature=İmza, True Name=Gerçek Ad, dormant/awakened/exalted/final form=uykuda/uyanmış/yüceltilmiş/nihai form).

## Paketleme (satış askıda)

```
pwsh tools/package.ps1
```

`dist/the-first-relics-v<sürüm>.zip` üretir (`dist/` git'te yok sayılır). Önce yukarıdaki sürüm tutarlılığını ve modülün yüklendiğini (`tools/check-load.mjs`) denetler. Yalnızca izin listesindeki yollar pakete girer: `module.json`, `README.md`, `CHANGELOG.md`, `LICENSE.md`, `scripts/`, `src/`, `styles/`, `lang/`, `data/`, `art/` (contact sheet hariç). Çeviriler eksikse paketlemez. `tools/`, `CLAUDE.md`, `.git*` asla pakete girmez. `module.json` zip kökündedir.

## Lisans

`LICENSE.md` ticari kişisel kullanım lisansı: yeniden dağıtım, satış, değiştirilmiş sürüm yayınlama ve yapay zekâ eğitimi yasak.

## Notlar

- Foundry v13 `DialogV2` içeriği zaten bir `<form>` içine koyar; içeriğe `<form>` yazma (tarayıcı iç içe formu siler ve sınıflar kaybolur). İçerik `cleanHTML` ile süzülür.
- v13 uygulama düğmelerine sabit yükseklik verir; çok satırlı düğmelerde `height: auto` gerekir.

# Relic Revizyon Notları (2024 sınıfları)

25.11.2026. Monk (Bands of the Inner Dragon, 0.6.0'da yapıldı) ve Cleric (Vestments of the First Saint) kapsam dışı.

> [!info] Durum (25.11.2026)
> Aşağıdaki 10 relic'in hepsi revize edildi ve canlı Foundry'de denendi:
> - Ranger 0.7.0
> - Wizard 0.8.0
> - Sorcerer 0.9.0
> - Paladin 0.10.0
> - Rogue 0.11.0
> - Druid 0.12.0
> - Bard 0.13.0
> - Barbarian 0.14.0
> - Fighter 0.15.0
> - Warlock 0.16.0
>
> Ayrıntılar `CHANGELOG.md` içinde. Vestments of the First Saint (Cleric) henüz eski haliyle duruyor.

Kaynaklar: EN World, D&D Beyond forumları ve yorumları, RPGBot, Wargamer, Arcane Eye, Dungeonmister. Reddit araması sonuç vermedi. Forum görüşleri topluluk görüşüdür, resmî değildir; bir kısmı 2024 öncesi playtest dönemine ait. Notlar bunları 2024 PHB kurallarıyla birlikte yorumlar.

## Genel bulgular (bütün relic'ler)

Monk revizyonunda çıkan sorunlar diğer kitlerde de var:

1. **Sınıfın kendi döngüsüne dokunmuyor.** Çoğu kit sınıfın ana kaynağını hiç beslemiyor. Barbarian'da Rage, Fighter'da Second Wind/Action Surge/Superiority Dice, Paladin'de spell slot ve Lay on Hands, Ranger'da Hunter's Mark, Rogue'da Sneak Attack ve Cunning Strike, Bard'da Bardic Inspiration, Druid'de Wild Shape, Sorcerer'da Sorcery Points, Warlock'ta Pact slot'ları, Wizard'da Arcane Recovery ve konsantrasyon.
2. **Action harcatan saldırı yetenekleri.** Fighter, Paladin, Ranger, Barbarian ve Rogue Attack action'ını kullanır. "Action: bir saldırı yap, ek hasar" (Rogue'daki Death From Silence gibi) pratikte kullanılmaz. Monk'ta yaptığımız gibi "isabetten sonra, aksiyonsuz" biçimine çevrilmeli.
3. **Tekrar eden korku/charm korumaları.** Aegis (Bastion of Resolve), Crown (Royal Presence, Sovereign Aura, King Eternal), Lyre (Song of Courage, First Song Incarnate), Girdle (Does Not Kneel) ve Vestments aynı şeyi veriyor. Bir partide iki relic olunca boşa çıkıyor.
4. **Sınıfın zaten aldığı özellikleri kopyalamak.** Blood of the First Dragon'daki HP/AC, Draconic Sorcery'nin Draconic Resilience'ıyla aynı. Wings, 14. seviyedeki Dragon Wings ile aynı. Cloak of Fey Paths'teki Nature's Pursuit ve Path of the Wild, Ranger'ın Roving ve Deft Explorer'ıyla çakışıyor. Lyre'deki Song of Rest 2024'te kaldırılmış bir Bard özelliğinin adını taşıyor.
5. **Alt sınıfa bağımlı tasarım.** Mantle'ın neredeyse tamamı yalnızca divination büyülerinde çalışıyor; Evoker, Abjurer ve Illusionist bir şey almıyor. Aegis'in Break the Darkness'ı yalnızca fiend/undead'e karşı.
6. **GM'e kalan "hissetme / bilme" yetenekleri.** Patron's Glance ve Spell Insight gibi yetenekler savaşta değer üretmiyor.

Hedef şablon (Monk'taki gibi): her relic'te sınıfın ana kaynağını geri kazandıran bir yetenek, sınıfın ana saldırı/büyü döngüsünü güçlendiren bir yetenek, bir hayatta kalma özelliği ve bir hasar/etki özelliği olsun. Alt sınıfların hepsinde çalışsın. Mümkün olan otomatik olsun.

---

## Barbarian — Girdle of the Unbroken

**Forumlarda sık geçen şikâyetler**
- 3. ile 9. seviye arasında yeni bir şey almıyor. Brutal Strike (9) kısmen telafi ediyor.
- 2024 canavarlarında B/P/S dışı hasar arttı; Rage resistance'ı bunları kapsamıyor, Barbarian hızlı düşüyor.
- Savaşta ne iyileştirme ne kontrol aracı var; yalnızca hasar ve tank.
- Bonus Action tıkanıyor: Rage ve alt sınıf yetenekleri aynı aksiyonu istiyor.
- Uçan veya uzaktaki düşmana karşı çaresiz kalıyor.

**Alt sınıflar:** Berserker (Frenzy hasarı), Wild Heart (Rage of the Wilds seçenekleri), World Tree (temp HP, müttefik ışınlama, reach), Zealot (Divine Fury, ücretsiz diriliş).

**Mevcut kit sorunları**
- Stand Again (pasif) ile Stand (aktif) ikisi de prone'dan kalkmakla ilgili.
- Unyielding Core'un kapsamı dar (yalnızca itilme/prone/grapple direnişi).
- Avatar'daki "kısa sıçramalarla uçuş" metni belirsiz.
- Rage'e hiç dokunmuyor.

**Revize yönü**
- *Rage:* Rage kullanımı geri kazanma; Rage'i bonus action'sız başlatma (örneğin initiative'de).
- *Hayatta kalma:* Rage sırasında psychic dışında, B/P/S dışı türlere de resistance (forumdaki ana eksik).
- *Hasar:* Brutal Strike'a ek seçenek ya da ek zar; Reckless Attack isabetlerine relic bonusu.
- *Uzak düşman:* Uzaktaki bir düşmanı kendine çekme ya da ona sıçrama (uçana karşı çözüm).

## Fighter — Aegis of the Dawn

**Forumlarda sık geçen şikâyetler**
- Battle Master'ın yüksek seviye özellikleri zayıf ("sınırlı kaynağa +1").
- Champion güçlü ama sade; Eldritch Knight'a çok az şey eklenmiş.
- Genel olarak savaş dışında az araç.

**Alt sınıflar:** Battle Master (Superiority Dice), Champion (geniş critical aralığı), Eldritch Knight (büyü + silah), Psi Warrior (Psionic Energy zarları).

**Mevcut kit sorunları**
- Kit Fighter'dan çok Paladin/koruyucu temalı (radiant, undead).
- Break the Darkness yalnızca fiend/undead'e karşı ve Action harcatıyor.
- Bastion of Resolve, Crown ve Lyre'deki korumaların aynısı.
- Second Wind, Action Surge, Weapon Mastery ve Indomitable'a hiç dokunmuyor.

**Revize yönü**
- *Kaynak:* Second Wind kullanımı geri kazanma; alt sınıf zarını (Superiority / Psionic) geri kazanma; signature'da Action Surge yenileme.
- *Saldırı:* Ek bir Weapon Mastery özelliği; Attack action'da isabet başına relic bonusu.
- *Koruyucu tema:* Guardian's Burden ve First Light korunabilir.
- *Değiştirilecek:* Break the Darkness genel bir "isabetten sonra radiant patlama"ya çevrilmeli.

## Paladin — Crown of the Conqueror

**Forumlarda sık geçen şikâyetler**
- Smite tamamen spell slot'una bağlı; slot bitince hasar biter. Smite büyüleri bonus action'a ve turda bir kullanıma bağlandı.
- Sınıf, Aura of Protection için dip almaya iniyor (multiclass baskısı); 6. seviyeden sonra seçenekler zayıf.
- 4. ve 5. seviye Paladin büyüleri cansız.

**Alt sınıflar:** Devotion, Glory, Ancients, Vengeance.

**Mevcut kit sorunları**
- Üç ayrı korku/charm/WIS save koruması var: Royal Presence, Sovereign Aura, King Eternal.
- Royal Decree aslında Command büyüsü.
- Rally ve March of Kings Action harcatıyor ve masada çözülüyor.
- Smite, Lay on Hands ve Channel Divinity'ye hiç dokunmuyor.

**Revize yönü**
- *Smite:* Slot harcamadan Divine Smite (relic bonusu kadar, uzun dinlenme başına); smite hasarına relic bonusu.
- *İyileştirme:* Lay on Hands havuzuna Paladin seviyesi kadar ek.
- *Channel Divinity:* Kullanım geri kazanma.
- *Aura:* Aura menzili +10 ft (Paladin kimliğiyle uyumlu, tek koruma özelliğine indirilir).
- *Komutan teması:* Banner of Order kalabilir.

## Ranger — Cloak of Fey Paths

**Forumlarda sık geçen şikâyetler (en yoğun şikâyet bu sınıfta)**
- Hunter's Mark hem konsantrasyon hem bonus action istiyor; sınıf özellikleri ona bağlı. Başka konsantrasyon büyüsü seçmek "sınıf özelliklerinden vazgeçmek" anlamına geliyor.
- Hunter's Mark yüksek seviyede ölçeklenmiyor (13, 17 ve 20. seviye iyileştirmeleri yetersiz bulunuyor).
- Gloom Stalker zayıflatıldı; Hunter sade; Beast Master değişmedi.

**Alt sınıflar:** Beast Master, Fey Wanderer, Gloom Stalker, Hunter.

**Mevcut kit sorunları**
- Path of the Wild ve Nature's Pursuit, Ranger'ın kendi arazi ve hız özellikleriyle çakışıyor.
- Hunter's Instinct yalnızca beceri bonusu.
- Fey Step, Fey Wanderer'ın Misty Step'iyle çakışıyor (ama tema olarak uygun).
- Eternal Hunt kısmen GM'de.

**Revize yönü**
- *Hunter's Mark (forumdaki ana talep):* Relic takılıyken Hunter's Mark konsantrasyon gerektirmesin; ya da konsantrasyon bozulunca bir kez korunsun.
- *Aksiyon ekonomisi:* İşareti başka hedefe taşımak aksiyonsuz olsun, bir saldırının parçası olarak.
- *Hasar:* Hunter's Mark zarı büyüsün (d6→d8→d10) ya da işaretli hedefe relic bonusu eklensin.
- *Kaynak:* Favored Enemy (ücretsiz Hunter's Mark) kullanımı geri kazanma.
- *Beast Master:* Hayvan yoldaşına relic bonusu (saldırı ve AC).

## Rogue — Cloak of the Umbral Veil

**Forumlarda sık geçen şikâyetler**
- Turda tek saldırı: Sneak Attack kaçınca tur boşa gidiyor.
- Cunning Strike zar harcatıyor; Vex ve Obscure gibi seçeneklerin değeri sınırlı.
- Poison seçeneğinin metni kötü yazılmış.

**Alt sınıflar:** Arcane Trickster, Assassin, Soulknife, Thief.

**Mevcut kit sorunları**
- Stealth avantajı Expertise ve Steady Aim ile gereksizleşiyor.
- One With Darkness ve Shadow Step loş ışığa/karanlığa bağlı; aydınlık savaşta işe yaramıyor.
- Death From Silence Action harcatıyor; Rogue zaten tek saldırı yapıyor.
- Unseen Hunter yalnızca savaşın ilk saldırısında çalışıyor.

**Revize yönü**
- *Sneak Attack:* Turda bir kez Sneak Attack kaçarsa reaction ile ikinci şans (başka bir tetikleyiciyle ikinci Sneak Attack).
- *Cunning Strike:* Seçenek başına bir zar indirim ya da ücretsiz bir seçenek.
- *Saldırı:* Death From Silence "Sneak Attack isabetinden sonra, aksiyonsuz" olsun.
- *Hayatta kalma:* Uncanny Dodge kullanıldığında ek etki (geri çekilme veya görünmezlik).
- *Tema:* Gölge teması kalsın ama ışığa bağlılık kaldırılsın.

## Bard — Lyre of the First Song

**Forumlarda sık geçen şikâyetler**
- Bardic Inspiration (BI) yalnızca başarısız d20 testinde kullanılabiliyor; büyü odaklı oyunculara değersiz geliyor.
- Font of Inspiration BI'yi spell slot karşılığı geri veriyor; slot baskısı yaratıyor.
- Jack of All Trades artık initiative'e eklenmiyor.
- College of Dance savaşta en güçlü bulunuyor; Cutting Words savaşta zayıf görülüyor.

**Alt sınıflar:** Dance, Glamour, Lore, Valor.

**Mevcut kit sorunları**
- Song of Rest adı 2024'te kaldırılan bir Bard özelliğinden.
- Melody of Unity (aurada save'lere proficiency bonusu) çok güçlü; Aura of Protection'ın kopyası.
- Song of Courage, korku koruması tekrarı.
- BI'ye hiç dokunmuyor.

**Revize yönü**
- *BI ekonomisi:* BI kullanım geri kazanma; BI zarı bir basamak büyüsün.
- *BI kullanımı:* BI başarılı testten önce de verilebilsin (relic istisnası).
- *Alt sınıf:* Alt sınıf BI kullanımına relic bonusu: Cutting Words, Mantle of Inspiration, Dazzling Footwork, Combat Inspiration.
- *Konsantrasyon:* Symphony Eternal korunabilir.
- *Değiştirilecek:* Melody of Unity zayıflatılmalı ya da değiştirilmeli.

## Druid — Heart of Yggdrasil

**Forumlarda sık geçen şikâyetler**
- Wild Shape kullanımı az (2/3/4).
- Moon dışındaki circle'larda Wild Shape asıl iş değil; Stars'ın form'u Wild Shape ile yarışıyor.
- Moon, 2024'te daha zayıf bir şekil değiştiren ama daha iyi bir Druid bulunuyor.
- Sea, Land/Moon/Stars'tan zayıf görülüyor.

**Alt sınıflar:** Land, Moon, Sea, Stars.

**Mevcut kit sorunları**
- Kit neredeyse tamamen iyileştirici; Cleric'in Vestments'ıyla rol çakışması var.
- Wild Shape'e ve konsantrasyona hiç dokunmuyor.
- Forest Guardian'da hasar türünü GM seçiyor.
- Living Sap'in değeri düşük.

**Revize yönü**
- *Wild Shape:* Wild Shape kullanımı geri kazanma; şekil değiştirince relic bonusu × Druid seviyesi kadar temp HP.
- *Alt sınıf aracı:* Wild Shape kullanımını harcayan özellikler bundan da beslenir (Starry Form, Wrath of the Sea, Moon form'ları).
- *Büyü:* Spell slot geri kazanma (Land'in Natural Recovery'si gibi); konsantrasyon koruması.
- *İyileştirme:* İyileştirme teması tek bir özelliğe indirilmeli (Cleric ile çakışmasın).

## Sorcerer — Blood of the First Dragon

**Forumlarda sık geçen şikâyetler**
- Sorcery Point çok fazla şeye harcanıyor ve yetmiyor (büyü slotu, metamagic, alt sınıf).
- Metamagic seçenekleri az.
- Eski alt sınıflar zayıf; Wild Magic GM'e fazla bağımlı.

**Alt sınıflar:** Aberrant, Clockwork, Draconic, Wild Magic.

**Mevcut kit sorunları**
- Draconic Blood ve Ancient Scales, Draconic Sorcery'nin kendisinin verdiği özelliklerle aynı; diğer alt sınıflarda ise sırf "dayanıklılık" oluyor.
- Wings of the First Dragon, Draconic'in 14. seviyesiyle aynı.
- Sorcery Point, metamagic ve Innate Sorcery'ye hiç dokunmuyor.

**Revize yönü**
- *Sorcery Point:* Geri kazanma (forumdaki ana talep).
- *Metamagic:* Turda bir kez 1 SP'lik metamagic ücretsiz (relic bonusu kadar, uzun dinlenme başına).
- *Innate Sorcery:* Ek kullanım.
- *Hayatta kalma:* Konsantrasyon ya da hayatta kalma özelliği (Sorcerer d6 HP).
- *Tema:* Ejderha teması hasar türünde ve avatarda kalsın; bütün alt sınıflarda çalışsın.

## Warlock — Chains of the Patron

**Forumlarda sık geçen şikâyetler**
- Pact slot'u az; Magical Cunning yalnızca yarısını ve uzun dinlenme başına bir kez geri veriyor.
- Hasar Eldritch Blast'a bağımlı; bazı invocation'lar 2024'e uyarlanmamış.
- Pact of the Blade artık otomatik büyülü silah değil.

**Alt sınıflar:** Archfey, Celestial, Fiend, Great Old One.

**Mevcut kit sorunları**
- Patron's Glance ve Read the Fine Print savaşta değer üretmiyor.
- Hasar yetenekleri (Borrowed Power, Borrowed Ruin) iyi.
- Price Paid (öldürünce temp HP) Fiend'in Dark One's Blessing'inin kopyası.
- Price of Eternity'deki slot geri kazanma doğru yönde ama GM'e bağlı.

**Revize yönü**
- *Pact slot:* Geri kazanma (forumdaki ana talep).
- *Invocation:* Ek invocation (relic takılıyken bir tane, sonradan değiştirilebilir).
- *Konsantrasyon:* Hex/Hunger of Hadar gibi konsantrasyon büyüleri için koruma.
- *Hayatta kalma:* Price Paid yerine patron'dan bağımsız bir hayatta kalma özelliği.

## Wizard — Mantle of the First Seer

**Forumlarda sık geçen şikâyetler**
- En düşük HP; erken seviyede kırılgan.
- 2024'te Warlock, Sorcerer ve Bard güçlendi, Wizard güçlenmedi ("Great Wizard Extinction").
- Okullar 3. seviyede açılıyor; Necromancer yok.

**Alt sınıflar:** Abjurer, Diviner, Evoker, Illusionist.

**Mevcut kit sorunları**
- Kitin çoğu yalnızca divination büyülerinde çalışıyor (Perfect Concentration, Living Chronicle, avatarın ücretsiz büyüsü); Diviner dışındaki okullar bir şey almıyor.
- Scholar's Insight yalnızca beceri bonusu.
- Threads of Fate ve Moment of Clarity güçlü ama Diviner'ın Portent'iyle çakışıyor.

**Revize yönü**
- *Spell slot:* Arcane Recovery'ye ek slot seviyesi ya da savaş içinde küçük bir slot geri kazanma.
- *Konsantrasyon:* Bütün büyüler için koruma (yalnızca divination değil).
- *Hayatta kalma:* Shield benzeri bir reaction ya da temp HP (en düşük HP sorunu).
- *Okul çeşitliliği:* Okul özelliğine relic bonusu: Abjurer'ın Arcane Ward'ı, Evoker'ın Potent Cantrip'i, Illusionist ve Diviner'ın özellikleri.
- *Divination teması:* Lore'da ve avatarda kalabilir.

---

## Önerilen sıra

Forumdaki şikâyet yoğunluğu ve mevcut kitin uzaklığına göre:

1. Ranger
2. Wizard
3. Sorcerer
4. Paladin
5. Rogue
6. Druid
7. Bard
8. Barbarian
9. Fighter
10. Warlock

Oyuncu karakterlerindeki relic'ler önce ele alınabilir: Carry'de Mantle, Eril'de Umbral Veil, Luna'da Chains, Verdant Mierna'da Girdle. Bu relic'ler değişirse aktif eşyaları yeniden kurulmalı ve oyunculara değişiklik söylenmeli.

## Kaynaklar

- EN World, A critical analysis of 2024's revised classes: https://www.enworld.org/threads/a-critical-analysis-of-2024s-revised-classes.716565/page-4
- RPGBot, 2024 Barbarian: https://rpgbot.net/dnd5/characters/classes/2024-barbarian/
- EN World, The Battle Master Paradigm: https://www.enworld.org/threads/the-battle-master-paradigm.700358/page-8
- D&D Beyond, 2024 Fighter vs 2014 Fighter: https://www.dndbeyond.com/posts/1746-2024-fighter-vs-2014-fighter-whats-new?comment=28
- D&D Beyond, 2024 Paladin vs 2014 Paladin: https://www.dndbeyond.com/posts/1749-2024-paladin-vs-2014-paladin-whats-new?page=19
- EN World, Aura of Protection normalized?: https://www.enworld.org/goto/post?id=9478557
- EN World, The Problem with Treantmonk's Hunter's Mark: https://www.enworld.org/posts/9856623
- PC Gamer, 2024 Ranger and spells: https://www.pcgamer.com/games/rpg/after-an-icy-response-to-the-d-d-2024-ranger-s-proposed-reliance-on-spells-lead-designer-jeremy-crawford-says-don-t-worry-the-spells-should-help
- RPGBot, 2024 Ranger subclasses: https://rpgbot.net/new-subclasses-guide-for-the-2024-ranger
- EN World, Playtest 6: Rogue and Cunning Strike: https://www.enworld.org/goto/post?id=9058064
- D&D Beyond, 2024 Rogue vs 2014 Rogue: https://www.dndbeyond.com/posts/1752-2024-rogue-vs-2014-rogue-whats-new
- D&D Beyond, 2024 Bard vs 2014 Bard: https://www.dndbeyond.com/posts/1768-2024-bard-vs-2014-bard-whats-new
- Wargamer, 2024 Bard: https://www.wargamer.com/dnd/2024-bard
- D&D Beyond, 2024 Circle of the Moon and Wild Shape: https://www.dndbeyond.com/posts/1755-the-2024-circle-of-the-moon-druid-and-changes-to
- D&D Beyond forum, New 2024 druid a failure?: https://www.dndbeyond.com/forums/class-forums/druid/200590-new-2024-druid-a-failure?comment=63
- RPGBot, 2024 Druid subclasses: https://rpgbot.net/new-subclasses-guide-for-the-2024-druid
- EN World, Can we have the sorcerer fixed now?: https://www.enworld.org/goto/post?id=8748620
- Wargamer, 2024 Sorcerer: https://www.wargamer.com/dnd/2024-sorcerer
- Wargamer, 2024 Warlock: https://www.wargamer.com/dnd/2024-warlock
- Arcane Eye, Warlock 5.5e Guide: https://arcaneeye.com/class-guides/warlock-5-5e-build-guide/
- Dungeonmister, Warlock Subclass Guide 2024: https://dungeonmister.com/guides/classes-in-dungeons-dragons/warlock-subclass-guide-for-dnd-2024/
- EN World, wizard discussion: https://www.enworld.org/goto/post?id=9770219
- Wargamer, 2024 Wizard: https://www.wargamer.com/dnd/2024-wizard
- ComicBook.com, wizard flaw: https://comicbook.com/gaming/feature/dds-best-class-has-one-glaring-flaw-you-didnt-even-know-was-fixed/

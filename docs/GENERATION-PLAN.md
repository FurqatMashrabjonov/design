# Generatsiya sifati rejasi

> Holat: **qabul qilindi, ishlanmoqda** (2026-09-21). Qatorlar Notion'da `G · Generatsiya sifati` bosqichida; jonli holat u yerda va `docs/ROADMAP.md` da. Bu fayl reja, majburiyat emas — qator Notion'dagi "Vazifalar" bazasiga `MVP` bo'lib kirgandagina ishga aylanadi (`CLAUDE.md`, 1–2-qoidalar). Pastdagi ID'lar Notion'ga ko'chirish uchun tayyor.
>
> Qaror: avval generatsiya shu darajada yaxshi bo'lsinki, odamlar skrinshotini o'zi ulashsin. Auth, to'lov, deploy ("santexnika") undan keyin.

## 1. Tezis: namuna oluvchi emas, dizayn kompilyatori

Raqobatchilarning hammasi bir xil ishlaydi: bitta katta prompt → model HTML "chizadi" → foydalanuvchiga ko'rsatiladi. Natija modelning o'rtacha didiga teng. Ular buni kuchli model bilan yopadi.

Biz arzon va tez modelda (`deepseek-chat`) ishlaymiz, shuning uchun model hal qiladigan masalani **kichraytirishimiz** kerak:

```
brief → ilova spetsifikatsiyasi (UX, ma'lumot modeli, oqimlar)      ← LLM, JSON
      → har ekran uchun blueprint (arxetip + bo'limlar + variant)   ← KOD
      → model tekshirilgan komponentlardan ekran yig'adi            ← LLM, kichik prompt
      → normalizer: shell, tokenlar, shrift, ikonka, rasm, grafik   ← KOD
      → brauzerda render → o'lchash → nuqtali tuzatish              ← KOD + 1 ta kichik LLM chaqiruvi
```

Model faqat ikki joyda ijod qiladi: nimani ko'rsatish (spetsifikatsiya) va qanday joylash (kompozitsiya). Qolgan hammasi — piksellar, o'lchamlar, grafiklar, rasmlar, navigatsiya — kodda. Bu `CLAUDE.md` dagi "izchillik promptda emas, kodda" qoidasining butun pipeline'ga kengaytmasi.

**Bizning farqimiz (raqobatchilarda yo'q yoki zaif):**

| # | Farq | Nega muhim |
|---|---|---|
| 1 | Ekranlararo izchillik — nafaqat uslub, **kontent ham** (bitta foydalanuvchi, bitta ma'lumot hamma ekranda) | Eng ko'p shikoyat: "ekranlar har xil odam chizgandek" |
| 2 | Platformaga to'g'ri: Apple HIG / Material qoidalari **o'lchanadi**, va'da qilinmaydi | "HIG tekshiruvidan o'tdi" — marketing uchun ham tayyor gap |
| 3 | Haqiqiy rasmlar, avatarlar, to'g'ri chizilgan grafiklar | Kulrang quti = "AI chizgan" degan birinchi belgi |
| 4 | Promptsiz tahrir (jonli tema bor; keyin — matnni joyida tahrirlash) | Stitch'ning asosiy shikoyati: "har o'zgarish uchun yana prompt" |
| 5 | Loyihadan loyihaga farq qiladigan ko'rinish (variatsiya dvigateli) | "Hammasi bir xil" — sening o'z shikoyating |

## 2. Dalillar: o'z ekranlarimizda nima topildi

`data.db` dagi 39 ta ekrandan 12 tasi headless Chrome'da render qilinib ko'rildi, kod o'qildi.

| # | Topilma | Dalil | Ildiz sabab |
|---|---|---|---|
| F1 | **Dizayn tizimi brendi ilovaga oqib chiqadi.** Kaloriya ilovasi (SnapCal, `duolingo` tizimi) "Lesson complete!" + yashil boyqush + Learn/Practice/Leaderboard navigatsiyasini chizgan | 15–17-ekranlar | `DESIGN.md` 393 qator brend hikoyasi (boyqush, dars, streak — 28 marta). Model uslubni emas, mahsulotni ko'chiradi |
| F2 | **Qo'shimcha so'rov ilova kontekstini yo'qotadi.** "yana bitta qo'sh" → boshqa ilova ekrani, o'z navigatsiyasi bilan | 15–17, 20 | `GenerateController` rejani, navigatsiyani, shell'ni, house style'ni bermaydi — bular faqat `PlanController` da |
| F3 | **39 ta ekranning 39 tasi `root-tab`.** Note Editor, Add Habit, Meal Analysis ham tab deb belgilangan; model o'zi "orqaga" tugmasini chizib, pastda tab bar ham turibdi | `select screen_type,count(*)` → `root-tab\|39` | Planner promptidagi JSON namunada faqat `root-tab` bor; model namunani ko'chiradi. Kodda tekshiruv yo'q |
| F4 | **Navigatsiya ikonkalari doira bo'lib qoladi** (o'rtadagi tugma, Social tabi) | 0–3-ekranlar | `ShellService.ICON_PATHS` da ~35 ikonka; planner boshqa nom bersa → `circle` |
| F5 | **Hamma ilovada bir xil persona:** "Maya Chen / MC" uchta turli loyihada | 0, 5, 25 | Kontent modelning eng ehtimoliy tanlovi; kodda kontent urug'i yo'q |
| F6 | **Bir xil skelet:** kulrang KAPITAL sarlavha → 1px chegarali oq karta → ikonkali qatorlar. Profil ekranlari uch loyihada deyarli bir xil | 0, 5, 10 | Layout varianti yo'q; `temperature` berilmagan; few-shot yo'q |
| F7 | **Rangsiz.** Til o'rganish ilovasida hamma progress qora | 0–3 | `anti-ai-slop.md`: "accent ko'pi bilan 2 marta" — hamma tizimga bir xil taqiq |
| F8 | **Rasm o'rnida kulrang quti + emoji**; grafiklar qo'lda `div` dan — heatmap tasodifiy qora kataklar | 1, 3 | Rasm manbai yo'q. Qoidalar zid: skill `placehold.co` deydi, craft uni taqiqlab mavjud bo'lmagan `.ph-img` ni aytadi |
| F9 | **System prompt 19–26k token** (airbnb: 103 521 belgi) | o'lchandi | 393 qatorli `DESIGN.md` + 9 craft fayl (~1500 qator). Craft'ning ko'pi landing sahifa haqida: hero, pricing, FAQ, forma validatsiyasi |
| F10 | **"make it blue" → yangi ekran** ("Blue Please — Accent Swatch") | 23 | Niyatni ajratish yo'q: tema o'zgarishi LLM generatsiyasiga ketadi, holbuki `theme-override` tayyor |
| F11 | **Model natijasini hech kim ko'rmaydi.** `CritiqueService` HTML matnini baholaydi, renderni emas | kod | Overflow, kesilgan matn, kichik tugma, past kontrast faqat renderda ko'rinadi |

Eslatma (o'zimga tuzoq): macOS'da headless Chrome oynasi 500px dan tor bo'lmaydi, 390px skrinshot o'ngdan kesilgan ko'rinadi. Eval'da ekranni 390px `iframe` ichida render qilish kerak.

## 3. Raqobatchilar: kuchli va zaif tomonlari

| Vosita | Kuchli | Zaif (sharhlar va obzorlardan) | Bizga xulosa |
|---|---|---|---|
| **Google Stitch** | Bepul (350 gen/oy), Gemini, 5 ekrangacha, Figma eksport, rasm/eskiz kirishi | To'g'ridan-to'g'ri tahrir yo'q — "har o'zgarish uchun prompt, chidab bo'lmaydi"; dizayn tizimiga bo'ysunmaydi (brend rangini tashlab, o'zi yashil tanlagan); shrift juftliklari zaif; "ilhom uchun yaxshi, ishlab chiqarish uchun emas" | Narxda yutib bo'lmaydi. Izchillik + promptsiz tahrir bilan yutamiz |
| **Sleek** | Faqat mobil, aniq ICP ("app qura olaman, UI'm xunuk"), 6 haftada $10k MRR, kuniga ~1500 ekran, 4 ekran bepul + bittasi blur | Yopiq; sifat kuchli modelga tayangan; kontent izchilligi yo'q | Pozitsiya va free-tier mexanikasini olamiz. Sifatda pipeline bilan yetib olamiz |
| **ScreenFlow** | Progress ("4 tadan 1-ekran"), Figma/kod eksport va'dasi | Ommaviy ma'lumot kam; "30% chegirma abadiy" — narx bilan kurashyapti | — |
| **Banani** | Ekranlarni avtomatik bog'lab prototip qiladi, PRD kirishi | Web'ga moyil | Oqim bog'lash bizda bor — chuqurlashtiramiz (§P2) |
| **UX Pilot / Uizard** | Figma plagin, katta bepul limit | "Kod eksporti qo'lda tozalashni talab qiladi"; "ekranlar shoshib yig'ilgandek, promptga qaramay" | Sifat — bozorning ochiq yarasi |
| **Figr** | Mavjud dizayn tizimini import, bo'sh/yuklanish/xato holatlari | Enterprise, sekin | Holatlar — `Keyin` (GEN-10) |
| **v0 / Lovable / Bolt** | Kod va deploy | Mobil UI'da "telefon ramkasiga siqilgan desktop layout" | Mobil-birinchi pozitsiyamiz to'g'ri |

Umumiy bo'shliq: **hech kim natijani render qilib o'lchamaydi va hech kim ekranlararo kontentni izchil qilmaydi.** Hamma "bitta chaqiruv, omad" usulida.

## 4. Eng yaxshi prompt va yo'riqnoma tuzilmalaridan saboqlar

**Apple HIG** (`developer.apple.com/design/human-interface-guidelines`). Tuzilishi: platforma → asoslar (layout, tipografiya, rang) → naqshlar → komponentlar. Har komponent sahifasi bir xil: bir jumlali maqsad → "Best practices" (har biri **qalin buyruq + bir-ikki jumla sabab**) → platforma farqlari. Nega ishlaydi: qoida emas, *qaror* beradi ("tab bar navigatsiya uchun, amal uchun emas — amal kerak bo'lsa toolbar"), va har qoidaning sababi yonida.
- HIG sahifalari JS bilan chiziladi, lekin JSON manbasi ochiq: `https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<slug>.json` (`tab-bars`, `layout`, `typography`, … sinab ko'rildi). Undan komponent bo'yicha ixcham qoida kartalari yasaladi.
- Matn mualliflik huquqi bilan himoyalangan: so'zma-so'z ko'chirmaymiz, o'z so'zimiz bilan 5–8 qatorli kartaga distillaymiz.
- O'lchanadigan raqamlar: body 17pt, minimal 11pt; teginish nishoni ≥44pt; 3–5 tab, yorliq bir so'z; tab'ni yashirma/o'chirma; asosiy boshqaruv ekranning o'rta-past qismida (bosh barmoq zonasi); muhim kontent yuqori-chapda; bog'liq narsalar guruhlanadi; progressive disclosure.
- Bizdagi ziddiyat: planner namunasida `isAction` tab ("+") bor — HIG bunga qarshi. Standart holatda o'chiq bo'lsin, faqat arxetip talab qilsa (kamera/skaner ilovasi) yoqilsin.

**Anthropic "frontend aesthetics" bloki** (~400 token). Tashxisi: model "taqsimot markaziga" yiqiladi → AI slop. Davosi: o'lchovlarni nomlab yo'naltirish (tipografiya, rang, harakat, fon), "dominant rang + o'tkir aksent sust palitradan yaxshi", va **bir o'lchovni alohida qulflash** (faqat tipografiya yoki faqat tema) — tezroq va bashoratli. Saboq: 2000 qator taqiq emas, 400 token yo'nalish + kodda qulflangan tema.

**Oshkor bo'lgan system promptlar (v0, Lovable, Bolt, Stitch).** Eng yaxshilari: bo'limlar mas'uliyat bo'yicha ajratilgan, tanqidiy cheklovlar bo'lim boshida, chiqish formati XML teglar bilan bir ma'noli. Stitch: bir thread'da bitta platforma, ko'p ekran rejasini avval ro'yxat qilib tasdiqlatadi, tema o'zgarishini alohida `edit_design` funksiyasiga yuboradi (bizdagi F10 ning aynan davosi). "Hammasini bitta promptda so'rash — generik natijaning birinchi sababi; dizayner kabi qatlamma-qatlam: kayfiyat → rang → tipografiya → layout → komponent."

**Apple'ning UI-generatsiya tadqiqoti (2026).** 21 dizayner, 1460 izoh. Eskiz va to'g'ridan-to'g'ri tahrir ko'rinishidagi fikr izohdan ancha kuchli; atigi 181 ta eskiz-izoh bilan o'qitilgan kichik model GPT-5 dan o'tgan. Saboq: **oz, lekin sifatli "oldin/keyin" juftliklari** — eng qimmat aktiv. Foydalanuvchi tahrirlarini birinchi kundan yig'amiz (§P9).

**UICrit / vizual fikr sikli.** Baholovchi few-shot bilan kalibrlanganda va *renderni* ko'rganda foydali; matnni o'qigan baholovchi — shovqin.

## 5. Reja

Har faza: nima, nega (topilma), fayllar, tayyor mezoni. Hajm: K = ≤1 kun, O' = 2–4 kun, Kat = 5+ kun.

### P0 · O'lchov (hammasidan oldin) — 2 kun
Busiz har o'zgarish taxmin.

| ID | Vazifa | Tayyor mezoni | Hajm |
|---|---|---|---|
| EVAL-01 | 25 ta doimiy brief to'plami (`eval/briefs.json`): 10 ilova turi × turli dizayn tizimi; 5 tasi qisqa/noaniq, 3 tasi o'zbek/rus tilida | Fayl repoda, har brief'da kutilgan arxetiplar yozilgan | K |
| EVAL-02 | `npm run eval`: to'plamni generatsiya qiladi, har ekranni 390px `iframe` da skrinshot qiladi, bitta HTML kontakt-varaq chiqaradi (loyiha × ekran) | Bir buyruq → `eval/out/<sana>/index.html`; oldingi yugurish bilan yonma-yon ko'rinadi | O' |
| EVAL-03 | Deterministik ko'rsatkichlar: lint topilmalari, render auditi (P6), **bir xillik** (bir arxetipli ekranlar DOM teg ketma-ketligining o'xshashligi), token/vaqt/narx | `eval/out/<sana>/metrics.json`; regressiya ko'rinadi | O' |
| EVAL-04 | Ko'r-ko'rona juftlik taqqoslash sahifasi (A/B, qaysi yaxshi?) — o'zing + 3 dizayner tanish | Yutish foizi hisoblanadi | K |

Yangi bog'liqlik qo'shmaslik: tizimdagi Chrome `--headless` + o'rovchi HTML yetadi.

### P1 · Qon to'xtatish: topilgan buglar — 4 kun
Eng arzon, eng ko'zga ko'rinadigan sakrash.

| ID | Vazifa | Topilma | Fayllar | Tayyor mezoni | Hajm |
|---|---|---|---|---|---|
| GEN-17 | `DESIGN.md` → **uslub kartasi** (`STYLE.md`, ≤60 qator): rang rollari, tip, shakl, zichlik, soya, "rang energiyasi". Mahsulot otlari (boyqush, dars…) yo'q | F1, F9 | `design-systems/*/STYLE.md`, `DesignSystemService`, `PromptComposer` | Test: uslub kartasida brend mahsulot lug'ati yo'q; eval'da tizim nomi ekran matnida uchramaydi | O' |
| GEN-18 | Lint: dizayn tizimi brend nomi/maskoti ekran matnida → P0 topilma | F1 | `design-lint.ts` | Test fixture yiqiladi | K |
| GEN-19 | Bitta ekran qo'shish ham to'liq kontekst oladi: reja xulosasi, ekranlar ro'yxati, navigatsiya, house style digest, shell in'ektsiyasi | F2 | `GenerateController`, umumiy `buildScreenContext()` (`PlanController` dan ko'chiriladi) | Mavjud loyihaga qo'shilgan ekran bir xil nav va uslubda; check test | O' |
| GEN-20 | Ekran turi kodda tekshiriladi: har tab'ga aynan bitta `root-tab`; qolganlari `detail-view`/`modal-flow`, `parentScreen` majburiy. Planner namunasiga detail ekran qo'shiladi | F3 | `PlannerService.parsePlan` | Test: 5 ekran/4 tab → kamida 1 detail; ota-onasiz detail rad etiladi | K |
| GEN-21 | Planner ikonkani faqat `ICON_PATHS` kalitlaridan tanlaydi (ro'yxat promptda); noma'lum nom sinonim jadvali orqali xaritalanadi; ro'yxat ~80 ga kengayadi | F4 | `ShellService`, `PlannerService` | Test: hech bir tab `circle` ga tushmaydi | K |
| GEN-22 | Kontent urug'i kodda: persona (ism, avatar, shahar), sana, valyuta — loyiha ID sidan urug'langan, brief tiliga mos | F5 | yangi `lib/content-seed.ts`, `PlanController` | Ikki loyihada har xil persona; bitta loyihaning hamma ekranida bir xil | K |
| GEN-23 | Prompt dietasi: mobil uchun bitta `craft/mobile.md` (≤150 qator), landing qoidalari mobil skill'dan chiqariladi. Maqsad: system prompt ≤6k token | F9 | `skills/mobile-screen/SKILL.md`, `craft/` | O'lchov testi: `composeSystemPrompt(*, 'mobile')` < 24 000 belgi | O' |
| GEN-24 | "Accent ≤2" o'rniga tizim bo'yicha `colorEnergy` (`manifest.json`): minimal=past, duolingo=yuqori. Lint shu qiymatga qarab tekshiradi | F7 | `manifest.json`, `design-lint.ts` | Duolingo ekranida aksent yuzasi ko'p, minimal'da kam | K |
| GEN-25 | `temperature` aniq beriladi (ekran ~0.8, planner ~0.4), eval'da sozlanadi | F6 | `LlmService` | — | K |
| GEN-26 | Rasm qoidasi ziddiyati olib tashlanadi (P5 gacha: faqat CSS gradient + `data-od-img` slot) | F8 | skill, `anti-ai-slop.md` | Repoda `.ph-img` va `placehold.co` yo'q | K |

### P2 · UX miyasi: Planner v2 — 5 kun
"UI UX'ga mos emas" ning davosi. Hozir ekran tavsifi 500 belgili erkin matn.

| ID | Vazifa | Tayyor mezoni | Hajm |
|---|---|---|---|
| UX-01 | **Ekran arxetiplari katalogi** (~20): feed, dashboard, detail, ro'yxat+qidiruv, forma/yaratish, onboarding, paywall, profil, sozlamalar, chat, player, xarita, kamera/skaner, checkout, natija/muvaffaqiyat, statistika, kalendar, kirish, bildirishnomalar, bo'sh holat. Har biri `blueprints/<id>.json`: majburiy/ixtiyoriy bo'limlar, asosiy amal joyi (bosh barmoq zonasi), tegishli HIG kartalari | Katalog repoda; sxema testi | O' |
| UX-02 | **Ilova turi naqshlari** (~12: fitnes, fintex, ijtimoiy, savdo, o'qish, ovqat yetkazish, sayohat, sog'liq, produktivlik, media, bron, marketplace): odatiy ekran to'plami va oqimlar | Planner promptiga faqat mos kelgan turi kiradi | O' |
| UX-03 | Planner har ekran uchun chiqaradi: `archetype`, `userGoal`, `primaryAction`, `sections[] {type, content, priority}`, `linksTo[]`. Hammasi `parsePlan` da tekshiriladi, noto'g'risi tuzatiladi yoki qayta so'raladi | Test: sxemaga mos kelmagan reja o'tmaydi | O' |
| UX-04 | **Ilova ma'lumot modeli:** planner umumiy obyektlarni (foydalanuvchi, 5–8 ta element: odatlar, taomlar, tranzaksiyalar…) namuna yozuvlari bilan beradi; har ekran promptiga shu JSON kiradi | Bosh ekrandagi "Suv ichish" odati detal ekranida ham shu nom va raqam bilan; eval'da tekshiriladi | O' |
| UX-05 | Oqim bog'lari: model `data-od-link="<ekran>"` qo'yadi, preview bosilganda o'tadi (`data-od-tab`/`data-od-back` naqshi) | Preview'da kartadan detalga o'tiladi | K |

UX-04 — asosiy farq: hech bir raqobatchida yo'q, demo'da darhol ko'rinadi.

### P3 · Platforma bilimi: HIG/Material distillati — 3 kun

| ID | Vazifa | Tayyor mezoni | Hajm |
|---|---|---|---|
| HIG-01 | HIG JSON'dan komponent kartalari (o'z so'zimiz bilan, 5–8 qator): tab bar, nav bar, sheet, list, button, text field, search, segmented, toggle, alert, progress. Material 3 uchun ham | `craft/platform/ios/*.md`, `android/*.md` | O' |
| HIG-02 | Promptga faqat ekran arxetipi ishlatadigan kartalar kiradi (blueprint ko'rsatadi) | Prompt byudjeti saqlanadi (≤6k) | K |
| HIG-03 | Raqamlar jadvali → render auditi qoidalari (P6): shrift ≥11px, nishon ≥44px, kontrast ≥4.5:1, tab 3–5, yorliq bir so'z | P6 da ishlatiladi | K |
| HIG-04 | Loyihada platforma tanlovi: iOS / Android (hozir faqat "mobile") — tip shkalasi va nav uslubi shunga qarab | Tanlov shell va tokenlarga ta'sir qiladi | O' |

### P4 · Komponent to'plami: "chizma, yig'" — 8–10 kun
Eng katta sifat va tezlik sakrashi; eng katta ish.

| ID | Vazifa | Tayyor mezoni | Hajm |
|---|---|---|---|
| KIT-01 | `od-kit.css`: tokenlar bilan ishlaydigan ~30 komponent (`od-list-row`, `od-card`, `od-stat`, `od-segmented`, `od-chip`, `od-btn`, `od-input`, `od-avatar`, `od-progress`, `od-sheet`, `od-toggle`, `od-search`, `od-media-card`, `od-carousel`, `od-empty`…). Normalizer shrift kabi in'ektsiya qiladi. Oddiy CSS, Tailwind'ga bog'liq emas | Har komponent 33 tizimda galereya sahifasida to'g'ri ko'rinadi | Kat |
| KIT-02 | Tizim shaxsiyati tokenlar orqali: `--od-border-w`, `--od-shadow-style` (flat/soft/chunky), `--od-density`, `--od-card-style` (bordered/filled/elevated/plain) | Duolingo "chunky", minimal "plain" — bitta markup'dan | O' |
| KIT-03 | **Grafiklar kodda:** `<div data-od-chart="bar" data-values="…">` → normalizer toza SVG chizadi (bar, line, ring, heatmap, sparkline) | F8 dagi tasodifiy heatmap yo'qoladi | O' |
| KIT-04 | Skill: "avval to'plamdan ol; yo'q bo'lsagina o'zing yoz". Har arxetipga to'plamda yozilgan 1 ta oltin namuna (few-shot) | Chiqish tokenlari ~40% kam; eval'da lint o'tish ≥95% | O' |

Xavf: to'plam yana bir xillikka olib kelishi mumkin. Davosi — KIT-02 variantlari va P7.

### P5 · Aktivlar — 2 kun

| ID | Vazifa | Tayyor mezoni | Hajm |
|---|---|---|---|
| AST-01 | Rasm resolver: model `<img data-od-img="cozy cafe interior" data-od-ratio="4:3">` yozadi; normalizer Pexels API orqali URL topadi, `query→url` SQLite'da keshlanadi; xatoda gradient | 200 so'rov/soat bepul, tijoriy foydalanish, attribution shart emas. Kalit faqat serverda | O' |
| AST-02 | Avatarlar: persona urug'idan (DiceBear yoki bosh harflar), rasm so'rovisiz | Har loyihada har xil, ekranlar aro bir xil | K |
| AST-03 | Ilova belgisi: kodda monogramma SVG (aksent + bosh harf) | Onboarding/kirish ekranlarida ishlatiladi | K |
| AST-04 | Rasm sloti o'lchami to'plamda qulflangan (`aspect-ratio`, `object-fit: cover`) | Rasm layout'ni buzmaydi | K |

Unsplash'ga keyin o'tish mumkin (5000/soat, lekin hotlink + attribution majburiy).

### P6 · Ko'zlar: render → o'lcha → tuzat — 4 kun
Serverda Chromium kerak emas: ekran baribir foydalanuvchi brauzerida `iframe` da chiziladi, `frame-height` ko'prigi allaqachon `postMessage` yuboradi.

| ID | Vazifa | Tayyor mezoni | Hajm |
|---|---|---|---|
| EYE-01 | Ko'prikka DOM auditi: gorizontal overflow, kesilgan matn, nishon <44px, shrift <11px, kontrast <4.5, ustma-ust elementlar, nav ostida qolgan kontent, 320px+ bo'sh oraliq, 5 dan ortiq shrift o'lchami, 4px to'rdan tashqari oraliq | Topilmalar `data-od-id` bilan qaytadi; kelgan ma'lumot ishonchsiz deb tekshiriladi | O' |
| EYE-02 | Avto-tuzatish: faqat deterministik topilmalar uchun, aybdor `data-od-id` ga `element-patcher` orqali bitta nuqtali chaqiruv, ko'pi bilan 1 aylanish | Eval'da audit o'tish foizi o'sadi; versiya tarixi ifloslanmaydi | O' |
| EYE-03 | Kodda tuzatsa bo'ladiganlari LLM'siz (nishon o'lchami, minimal shrift, nav bo'shlig'i) | `autofixScreen` kengayadi | K |

Vizual (rasmga qaraydigan) hakam `deepseek-chat` da yo'q. Uni faqat **oflayn eval'da** ishlatish model siyosatini buzmaydi — qaror seniki (§7).

### P7 · Variatsiya dvigateli — 3 kun

| ID | Vazifa | Tayyor mezoni | Hajm |
|---|---|---|---|
| VAR-01 | Loyiha "art-yo'nalishi" urug'i (loyiha ID sidan): karta uslubi, zichlik, sarlavha uslubi, hero ishlovi, tasvir darajasi | Loyiha ichida barqaror, loyihalar aro farqli | O' |
| VAR-02 | Har arxetipga 2–3 layout varianti (profil: hero-sarlavha / ixcham karta / statistika-birinchi); urug' tanlaydi, promptga bitta qator | Eval'da bir xillik ko'rsatkichi belgilangan chegaradan past | O' |
| VAR-03 | Mobilga moslangan ~400 tokenli estetika bloki, 2000 qator taqiq o'rniga | Prompt byudjeti ichida | K |

### P8 · Tahrir sifati — 3 kun

| ID | Vazifa | Topilma | Tayyor mezoni | Hajm |
|---|---|---|---|---|
| EDT-18 | Niyat yo'naltirgich: ekran qo'shish / ekranni tahrirlash / elementni tahrirlash / **temani o'zgartirish**. Avval kalit so'zlar, noaniq bo'lsa bitta JSON chaqiruv | F10 | "make it blue" → `theme-override`, yangi ekran emas | O' |
| EDT-19 | To'liq ekran tahriri butun HTML'ni qayta yozmaydi: qidir/almashtir bloklari yoki element patch | — | Tahrirdan keyin tegilmagan bo'limlar baytma-bayt bir xil; 3–5× tez | O' |

### P9 · Fikr g'ildiragi (yig'ish erta boshlanadi, foydalanish keyin)

| ID | Vazifa | Doira |
|---|---|---|
| FB-01 | 👍/👎 va "qayta yarat" signali (tizim, arxetip, variant) bilan yoziladi | MVP — K |
| FB-02 | Foydalanuvchi tahrirlari "oldin/keyin" juftligi sifatida saqlanadi | MVP — K |
| FB-03 | Yoqqan ekranlar few-shot kutubxonasiga ko'tariladi (qo'lda tasdiq bilan) | Keyin |
| FB-04 | Juftliklardan reward model / fine-tune | Keyin |

## 6. Tartib va muddat

Yakka ishlaganda ~6 hafta. Har faza oxirida `npm run eval` — oldingi bilan yonma-yon.

| Hafta | Ish | Ko'rinadigan natija |
|---|---|---|
| 1 | P0 + P1 | Brend oqishi, doira ikonkalar, "Maya Chen", kontekstsiz qo'shish yo'qoladi; prompt 4× kichik |
| 2 | P5 + P2 (UX-01, 03, 04) | Haqiqiy rasmlar; ekranlar bir-biriga mos kontent bilan |
| 3 | P2 qolgani + P3 | To'g'ri ekran turlari va oqimlar; HIG kartalari |
| 4–5 | P4 | Komponent to'plami, kodda grafiklar, few-shot |
| 6 | P6 + P7 + P8 | Audit sikli, variatsiya, aqlli tahrir |

Agar faqat 2 hafta bo'lsa: **P0 + P1 + P5 + UX-04.** Eng arzon va eng ko'p ko'rinadigan qism shu.

Muvaffaqiyat mezonlari (eval to'plamida):
- render auditi va lint o'tish ≥95% ekran;
- brend oqishi 0; `circle` ikonka 0; kontent izchilligi 100%;
- bir xillik ko'rsatkichi bazaviy o'lchovdan ≥30% past;
- bir xil brief'larda Stitch/Sleek natijasiga qarshi ko'r-ko'rona yutish ≥50%;
- ilova (5 ekran) narxi va p50 vaqti hozirgidan yomon emas.

## 7. Sendan kerak bo'lgan qarorlar

1. **Doira.** P0–P8 qatorlari Notion'ga `MVP` bo'lib kirsinmi va B1 (hisoblar) dan oldinga qo'yilsinmi? Shu sessiyada Notion'ga ulanish yo'q edi — qatorlar qo'shilmadi.
2. **Model siyosati.** Ishlab chiqarishda `deepseek-chat` qoladi. Savol: (a) oflayn eval'da vizual hakam modelidan foydalanamizmi; (b) P0 tayyor bo'lgach, anchor ekranni kuchliroq modelda sinab, ko'r-ko'rona A/B qilamizmi? Anchor house style'ni belgilaydi, qolgan ekranlar unga ergashadi — bitta qimmat chaqiruv butun ilovani ko'taradi. Raqam ko'rmaguncha siyosat o'zgarmaydi.
3. **`isAction` tab.** HIG'ga zid. Standart o'chiq, faqat skaner/kamera arxetipida yoqilsinmi?
4. **Platforma tanlovi** (HIG-04): iOS/Android ajratish MVP'mi yoki hozircha faqat iOS?

## 8. Manbalar

- Apple HIG: [Getting started](https://developer.apple.com/design/human-interface-guidelines/getting-started), [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars), [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Anthropic — Prompting for frontend aesthetics](https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics), [Improving frontend design through Skills](https://claude.com/blog/improving-frontend-design-through-skills), [Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [Apple UI-generatsiya tadqiqoti — 9to5Mac](https://9to5mac.com/2026/02/05/designers-teach-ai-to-generate-better-ui-in-new-apple-study/), [UICrit](https://arxiv.org/pdf/2407.08850)
- [Oshkor bo'lgan system promptlar tahlili](https://dev.to/franciscoferreiraff/i-evaluated-the-leaked-system-prompts-of-the-biggest-ai-coding-tools-heres-what-i-found-3bo1), [Stitch system prompt tahlili](https://dev.to/yang_ella_f2a3e16ccb54550/google-stitch-system-prompt-leaked-analysis-and-insights-23dp), [UI prompt framework](https://gendesigns.ai/blog/ai-prompts-for-ui-design-complete-framework)
- Stitch: [TDP obzori](https://designproject.io/blog/google-stitch-review/), [Moda obzori](https://moda.app/blog/google-stitch-review), [narx va limitlar](https://www.banani.co/blog/google-stitch-pricing-and-credits)
- Sleek: [Indie Hackers](https://www.indiehackers.com/post/tech/hitting-10k-mrr-in-six-weeks-with-an-ai-design-tool-pEvmU5qkWS6ny0AR9SUv), [marketing tahlili](https://marketingcrafted.com/case-studies/sleek-design), [2026 reyting](https://sleek.design/blog/best-ai-tools-mobile-app-design-2026-ranking)
- [Netguru — AI UI vositalari taqqoslash](https://www.netguru.com/blog/ai-ui-design), [Banani — UX Pilot obzori](https://www.banani.co/blog/uxpilot-ai-review), [AIDesigner — mobil vositalar](https://www.aidesigner.ai/blog/best-ai-mobile-app-design-tools)
- [Bepul rasm API'lari 2026](https://siliconbased.dev/free-image-apis), [Unsplash API](https://unsplash.com/documentation)

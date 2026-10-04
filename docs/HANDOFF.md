# Topshiriq: ishni boshqa kompyuterda davom ettirish

> Yozilgan: 2026-09-21, yangilangan 2026-10-02. Eng yangi ish: **`konsta`** branch. **Boshlash: §00000 — billing tayyor, PRC-05 qaror kutmoqda.**
> (Eskisi: `canvas-planner` branch — HTML davri.) Bu fayl — qayerda to'xtaganimiz, nima ochiq, qanday davom etish. Rejaning o'zi Notion'da ("Vazifalar" bazasi); bu yerda faqat holat. **Ertaga boshlash: §00 — Konsta UI + JSX (KON-01 sinovi).**

## 000000. ENG SO'NGGI (2026-10-04): bepul beta — to'lovlar o'chirilgan, feedback — branch `konsta`

- **PAY-01…04:** Admin → Settings → **Selling**: Payments on/off (prod'da standart **off**). Off'da pricing/billing/
  upgrade hech kimga ko'rinmaydi, checkout rad etiladi, loyiha soni va export cheklanmaydi; yagona chegara — kreditlar.
  Yangi akkaunt `credits.signup` (standart 60 = 4 ilova) oladi. Kredit tugasa "Request more credits" → Admin → **Beta**
  sahifasida Grant/Dismiss. Migratsiya **0012_beta**.
- **FDB-10:** birinchi ilovadan keyin canvas'da feedback kartasi (bir marta), account menyusida "Send feedback";
  javoblar Admin → Beta'da.
- **Ishga tushirish:** deploy'dan keyin Admin → Settings → Access → **Open to everyone**. Bank hisobi ochilgach
  Selling → Payments on (Polar qadamlar pastdagi §00000'da).
- **Ochiq:** Grant bosilganda foydalanuvchiga email ketmaydi; ACC-06 (bittalab invite) `Keyin`da; LCH-02 Notion'da
  yopilmagan (FDB-10 uni qoplaydi); jarayon videosini egasi o'zi yozadi (SaffronHop: screenspell.app/s/BgVUuMtQnxQ).
- Commit qilinmagan lokal fayllar (shu laptopda): `docs/brand/posts/stillora/`, `eval/photo-cache.json`,
  `docs/brand/videos/saffronhop-process-*.mp4` (yaroqsiz qoralama).

## 00000. ENG SO'NGGI (2026-10-02): billing va pricing — branch `konsta`

**Tayyor (hammasi push qilingan, oxirgi commit `feat(pricing): PRC-04`):**
- BIL-20…25: `/pricing` waitlist rejimida ham ochiq; `/billing` sahifasi (tarif, oylik kredit bar, paketlar,
  tarix); dashboard sidebar'da `UpgradePanel`; upgrade dialogida Monthly/Yearly; `LowCredits` qatori;
  checkout ochilmasa `PaymentsSoonDialog` (waitlist `ref=payments`); Admin → Settings → Payments (Polar holati).
- PRC-02: Free'da 3 ta export (server sanaydi, `export_uses`, migratsiya **0011**). PRC-03: Free egasining share
  linkida "Made with Screenspell", pullikda toza. PRC-04: yangi pricing sahifasi (kartalar, kalkulyator,
  taqqoslash, FAQ). Narxlar o'zgarmadi: $12/$24, yillik $9/$17.

**Ochiq — PRC-05 (Pro'da premium model), egasining qarori kerak:**
- GPT-6 Sol eval'da Luna'dan yaxshi emas (2 yutdi / 2 durang / 2 yutqazdi, 3.26 vs 3.14, ~20× qimmat;
  `eval/out/gpt6-sol`). Pro'ning 3000 krediti Sol'da ~18 app, Luna'da ~200.
- Lokal Anthropic/Gemini kaliti yo'q (`.env`da faqat OpenAI, DeepSeek). Variant: Anthropic kaliti berilsa
  `npm run eval -- --label prc05 --model claude-sonnet-5 --vs onb01` + `npm run judge -- prc05 --vs onb01`
  (~$2–3). Yutmasa — PRC-05 `Keyin`ga.

**Egasi qiladigan ishlar (prod):**
- Polar onboarding: nom Screenspell, support email (Cloudflare Email Routing → `hello@screenspell.app`),
  bank hisobi (USD/SWIFT, lotin yozuvidagi ism). Org hali `checkout_payments: false`.
- Railway: `POLAR_SERVER=production`, prod Polar token admin panelga; webhook secret'ni almashtirish.
- Deploy'da migratsiya 0011 ishga tushishi kerak.

**Kontent:** post skill'i (`social-posts`), videolar (`reel.mjs`), captionlar Google Drive "Screenspell Content"
papkasida; ssenariylar Notion "Post ssenariylari" bazasida. Postlar faqat **prod**da (screenspell.app) qilinadi.

**Yangi laptopda:** `git checkout konsta && git pull`, `npm install`, `npm run build:runtime`, `.env` (kalitlar,
`DATABASE_URL`, `SECRETS_KEY`), Postgres'da migratsiyalar, `npm run dev`. Push: 
`git -c credential.helper='!gh auth git-credential' push origin konsta`.

## 0000. ENG SO'NGGI (2026-09-28 kech): Apple HIG bo'yicha generatsiyani to'g'rilash — branch `konsta`

**Muammo:** model Konsta komponentlarini nomini biladi, lekin to'g'ri ishlatmaydi (ListItem List'dan tashqarida,
BlockTitle Block ichida, ikki marta chevron, sariq kartada oq matn, `text-[13px]` o'ylab topilgan o'lchamlar).
**Tadqiqot:** Apple HIG (rasmiy), `ehmo/platform-design-skills` (HIG → skill, 10 bo'lim, Correct/Incorrect juftliklari),
`dickwu/apple-design-skill` (5 linzali review), Konsta kitchen-sink (36 ta rasmiy React misol). Nusxalar
scratchpad'da edi — yangi laptopda kerak bo'lsa GitHub'dan qayta oling. Reja Notion'da: **HIG-10…17**.

**Tayyor:**
- **HIG-10 — JSX lint** (`src/lib/jsx-lint.ts`, `drawScreen`da compile'dan oldin). Bitta to'g'ri javobli xatolar
  kodda tuzatiladi (ikkinchi chevron, tint/Hero ustida `text-white`, Block'da `px-4`, yolg'iz `bg-white`, <11px matn);
  qarorli xatolar `[jsx-lint]` log + eval'da `hig`/`higByRule`. Compiler mavjud bo'lmagan `<Komponent/>` ni rad etadi
  (bitta retry). 9 ta Streakflow ekranida: 5 tuzatish, 4 haqiqiy topilma, 9/9 compile.
- **HIG-12 — kit xatoga chidamli**: `runtime/type-scale.css` (`text-large-title`…`text-caption2`, `text-figure`),
  `runtime/kit/on-color.js` (`onColor`: oq ≥3:1 bo'lsa oq, aks holda qora), `<Hero color as="button">` (matn rangini
  o'zi tanlaydi), Tile va `gradient()` ham shunga o'tdi. KIT.md, SKILL.md, misollar yangilandi. Eval: `adHocText`,
  `namedText`. Headless Chrome'da tekshirildi.

**Keyingi (Notion tartibida):**
1. **HIG-11 (Jarayonda)** — `skills/mobile-screen-jsx/SKILL.md` ni HIG-first qayta yozish, ≤8k belgi, platform-neytral
   (iOS va Material). Hozirgi skill "Dribbble / rang bilan jasur / gradient / emoji" ga undaydi — HIG bilan zid joylarini
   olib tashlash: 1–2 prominent tugma, inset grouped list, chevron faqat navigatsiyaga, tab screen'da large title,
   44pt tap, 4.5:1 kontrast, onboarding ≤3 sahifa. Mezon: eval'da HIG topilmalari −60%, hakamda yutqazmaydi.
   `npm run eval -- --label hig11 --vs <oldingi>` + `npm run judge`.
2. **HIG-13** — HIG → Konsta foydalanish kartalari (kitchen-sink misollari + ehmo formati: qoida, to'g'ri/noto'g'ri JSX).
3. Keyin (Doira=Keyin): HIG-14 eval HIG jadvali + hakam linzalari, HIG-15 lint topilmalari → bitta tuzatish chaqiruvi,
   HIG-16 Material paritet, HIG-17 planner ma'lumot izchilligi (sanalar, palitra kalitlari).

**Eslatmalar:**
- Yangi laptopda: `git checkout konsta && git pull`, `npm install`, **`npm run build:runtime`** (runtime/dist gitignored —
  qurilmasa hamma ekran "runtime is not built" bilan yiqiladi), `LLM_PROVIDER=claude-cli npm run dev`.
- Eval'dagi headless Chrome tekshiruvini O'CHIRMANG (foydalanuvchi qarori).
- DeepSeek balansi tugagan — eval/sinov `LLM_PROVIDER=claude-cli` (Haiku) bilan.
- `controllers.check.ts:261` (admin overview `newUsers`) ba'zan vaqt oynasi sabab yiqiladi — qayta ishga tushirsa o'tadi.
- Headless Chrome'da `screenDocument` sahifasini lokal ko'rish uchun blob import ishlamaydi: kodni alohida `.js` qilib
  bering va `/api/rt/v*/…` ni `runtime/dist` ga (ikonlar uchun `.js` qo'shib) moslovchi statik server ishlating.

## 000. HOZIRGI HOLAT (2026-09-28): faqat Konsta, HTML pipeline o'chirildi — branch `konsta`

- Ilovada endi bitta yo'l bor: brief → planner (JSON) → har ekran JSX (Konsta + @od/kit) → server compile → sandbox
  iframe. Eski HTML kodi git tarixida (`canvas-planner` branch'i).
- Ishga tushirish: `npm install`, `npm run build:runtime` (runtime/dist), `LLM_PROVIDER=claude-cli npm run dev`.
- Ishlayotgani (brauzerda tekshirildi): plan + 8 ekran ~34 s, preview navigatsiyasi (tab/push/back), chat edit, undo,
  versiyalar ‹ ›, qayta chizish, o'chirish.
- 2026-09-28 (2): emoji ruxsat etildi, eval + judge qo'shildi (`npm run eval`, `npm run judge`, `eval/out/BEST` =
  rich-v3), generatsiya kuchaytirildi (palitra, emoji, onboarding, 4 ta namuna ekran, yangi kit figuralari), HTML
  qoldiqlari va 31 ta eski HTML loyiha o'chirildi (zaxira: scratchpad'dagi `design-before-html-delete.dump`).
- Ochiq: (1) judge absolyut bahosi 2.79/5 — eng ko'p takrorlanadigan xatolar: sarlavhaning kartaga yopishishi,
  ilova ichida ma'lumot mos kelmasligi (savat ≠ checkout), bir xil narsaning ekranlar orasida boshqa rang/ikonkada
  bo'lishi; (2) fotosuratlar KON-12 bilan qaytdi (Pexels, soatiga 200 so'rov — ko'p foydalanuvchida Pexels'dan limit oshirishni so'rash kerak); (3) accent'ni o'zgartirish UI'si yo'q; (4) CLAUDE.md'dagi UI palitra/kontrast testlari (`new-features.check`)
  o'chgan; (5) `claude-cli` rejimida model dasturchining ismi/emailini bilib, profilga qo'yishi mumkin (faqat lokal).

## 00. YANGI YO'NALISH (2026-09-27): Konsta UI + to'liq JSX — shu yerdan davom et

**Qaror (foydalanuvchi, KON-00):** ekranlar endi HTML emas — model **React JSX** yozadi, komponentlar
**Konsta UI v5** (iOS 26 + Material 2025, Tailwind v4). Eski HTML yo'li mavjud loyihalar uchun qoladi
(`screens.format = 'html'`), yangilari `jsx`. Maqsad: $1k MRR.

**Nega (o'lchangan, 2026-09-27):**
- Sinovlar (bir xil 4 brief, Haiku): daisyUI 5 — barqaror, lekin shablon; Framework7 v9 — MCP'dan olingan
  rasmiy markup ma'lumotnomasi bilan juda yaxshi, lekin 1.3 MB va sandbox'da JS yiqiladi (localStorage/
  serviceWorker shim kerak); **Konsta UI — eng chiroyli, ~110 KB gz, sandbox'da o'zi ishlaydi.**
- Etalon: **`prototypes/vita-konsta/`** — qo'lda yozilgan to'liq ilova (odat + qadam + suv), 23 ekran,
  jonli prototip (push/pop, dark mode, aksent, sheet/dialog/toast). `cd prototypes/vita-konsta && npm i && npm run dev`.
  `src/ui.jsx` (Ring, Bars, Area, WaterGlass, Avatar, Tile, Confetti, CountUp) — `@od/kit` urug'i.
- Token: ekran kodi ~2.8k belgi ≈ **850–950 token** (model uchun ~1 300 deb hisoblang) — HTML'da **~4 900**
  (bazaviy o'lchov: 244 ekranda 1.2M). 20 ekranli ilova DeepSeek'da ~$0.03 (HTML ~$0.07), ekran ~4–5 s (HTML ~14 s).
- Server build (o'lchangan, `@tailwindcss/node` + `@tailwindcss/oxide` + `rolldown/experimental` transform):
  JSX→JS **2 ms**, Tailwind init 340 ms bir marta, keyin **2–22 ms**/ekran. Server model kodini **bajarmaydi**.
- CDN'siz variant ham ishladi (sandbox ichida): React 19 esm.sh + `konsta@5/react` esm.sh + `htm` + `@tailwindcss/browser@4`.
  Topilmalar: **React 19'da UMD yo'q** (faqat ESM); Konsta Vue/Svelte esm.sh'da 404; Konsta temasidagi
  `@plugin "../plugin-colors.js"` brauzer Tailwind'ida ishlamaydi → `--k-color-*` ni server aksentdan hisoblaydi.
  Bu yo'l faqat "bitta HTML eksport" uchun; mahsulotda runtime o'zimizning CDN'dan.
- Muqobillar (GitHub ⭐): Ionic 52.7k (zaxira — shadow DOM tahrirni qiyinlashtiradi), Framework7 18.8k,
  Vant 24.4k / Quasar 27.2k / Ant Mobile 12k (iOS emas), Konsta 4.3k (muallif nolimits4web — Framework7/Swiper).
  Konsta'ning rasmiy MCP'si yo'q (faqat community "capacitor-stack") — API'ni `node_modules/konsta/react/types` dan o'qing.

**Arxitektura (qisqa):**
1. Planner (o'zgarmaydi) → har ekran uchun model JSX yozadi (Konsta + `@od/kit`, ma'lumot rejadan).
2. `ScreenCompiler` (server): oxc parse → import whitelist (`react`, `konsta/react`, `@od/kit`, ikonlar) →
   JSX→JS → Tailwind (warm compiler, ilova bo'yicha bitta CSS). Saqlanadi: `source_jsx` (haqiqat),
   `compiled_js` (kesh), `runtime_version` (abadiy), `projects.app_css`.
3. `runtime.vN.[hash].js` (React+ReactDOM+Konsta+od-kit, ≤150 KB gz) — deploy'da Vite bilan, immutable CDN, CORS `*`.
4. Ko'rsatish: `<iframe sandbox="allow-scripts" src="https://screens.<domen>/s/:id">` (same-origin YO'Q) +
   header `Content-Security-Policy: sandbox allow-scripts; connect-src 'none'; …`. Tema render paytida.
5. Preview = bitta iframe'da butun ilova + navigator (Vita kabi). Eksport = React+Vite zip yoki bitta HTML.

**Navbat (Notion, Tartib bo'yicha):** KON-01 sinov → KON-02 runtime → KON-03 compiler → KON-04 /s/:id + CSP →
KON-05 prompt + Konsta ma'lumotnomasi → KON-06 DB + flag → KON-07 kanvas/preview → KON-08 tahrir/undo →
KON-09 eksport → KON-10 thumbnail/eval. KON-11 (Android) — Keyin. EVAL-05 (hakam) KON-01 ni baholash uchun.

**KON-01 sinovi — aniq qadamlar:**
1. `@od/kit` = `prototypes/vita-konsta/src/ui.jsx` + `nav.jsx` + mount (App theme="ios", aksent, dark).
2. Konsta API ma'lumotnomasi: `node_modules/konsta/react/types/*.d.ts` dan qisqa hujjat (props + 1 misol har komponentga)
   — Framework7'da xuddi shunday ma'lumotnoma xatolarni keskin kamaytirgan edi.
3. Model (DeepSeek; balans tugagan bo'lsa `LLM_PROVIDER=claude-cli`) Vita'ning 8+ ekranini JSX'da yozadi.
4. ScreenCompiler (scratch) → sandbox iframe → skrinshot (`prototypes/vita-konsta/shoot.sh` usuli).
5. Solishtirish: etalon (qo'lda) · model JSX · hozirgi HTML pipeline. Mezon: ≥95% kompilyatsiya, ≤1.5k token/ekran,
   hakamda HTML'dan yutish. Natijani foydalanuvchiga rasm bilan ko'rsat.

**Qolgan holat:**
- **DeepSeek balansi tugagan** (2026-09-25) — to'ldirilishi kerak. Gemini kaliti bepul tarifda (3.8 Flash 20 so'rov/kun).
- `html-wip` branch (push qilingan, birlashtirilmagan): 32 ta STYLE.md tuzatishi (mono raqam / caps eyebrow
  ziddiyati) + GQ-41 RepairService (`GEN_REPAIR=1`) — o'lchanmagan. HTML yo'li uchun kerak bo'lsa o'lchab birlashtiring.
- `lp06-precompile` branch — to'xtatilgan (LP-06 Keyin).
- Hakam: `eval/judge.ts` endi juftlikni ikkala tartibda so'raydi, `--vs best` / `--best` (eval/out/BEST).
- Framework7 MCP shu kompyuterda o'rnatilgan (`claude mcp add --transport http framework7 https://framework7.io/mcp`) —
  endi kerak emas, Konsta tanlandi.

## 0. (oldingi) 2026-09-25 kechki holat

Eng yangi ish: **`canvas-planner`** (oxirgi commit `b9d5b16`, push qilingan). Alohida WIP branch: **`lp06-precompile`**
(`b398a4d`, push qilingan, **birlashtirilmagan**).

### Bugun qilingan (hammasi `canvas-planner`da, CHANGELOG'da batafsil)
- **KIT-04 (Jarayonda):** kit v2 (~40+ blok), 33+ namuna ekran (`blueprints/exemplars/`, brief'da kit eskizi o'rnini
  egallaydi), `SKILL.md`da "kit'dan qur, `od-` nom ixtiro qilma" qoidasi, kit geometriyasi haqiqiy ilovalar bo'yicha
  o'lchangan (`kit/REFERENCE.md`), tab ekrani raqam o'rniga katta sarlavha bilan ochiladi, raqamlar 56–64px.
  Tuzatilgan buglar: ```artifact wrapper sizishi, ixtiro qilingan `od-` klass uslubsiz qolishi, audit rasm ustidagi
  matnni xato deb sanashi, linter kit jadvalini ham baholashi (lint 0% ko'rsatardi).
- **KIT-07 (Tayyor):** Kit 2026 — sheet/drawer/menyu/swipe/toast/glass/dialog/skeleton/chat/social kirish;
  yangi `sheet` arxetipi (planner filtr/ulashish/tez qo'shish/yon menyuni ota ekran ustida rejalaydi); xarita
  telefon balandligida chiziladi (to'liq ekranda kattalashmaydi); `map-b`/`map-c` namunalari.
- **SHR-03 (Tayyor):** preview'da ekran almashishi 1–6 ms (routing yo'q, har ekranning doimiy iframe'i, push/pop/fade).
- **Oxirgi commit:** ekran ichidagi `<a href>`/forma endi studioga olib bormaydi (`lib/nav-guard.ts`, hamma kadrda);
  qutidan keng katta raqam render vaqtida sig'guncha kichrayadi (eski ekranlarga ham); **stickerlar o'chirildi**
  (foydalanuvchi so'rovi — prompt/blueprint'da yo'q, renderer eski ekranlar uchun qoladi).

### O'lchovlar (eval, 4 brief: feast-two, dribbble-wallet, dribbble-plants, dribbble-focus)
| | DeepSeek ertalab | DeepSeek kechqurun | Haiku ertalab | Haiku oxirgi |
|---|---|---|---|---|
| audit toza | 0.56 | **0.91** | 0.79 | 0.75–0.92 |
| kit ulushi | 0.39 | 0.43 | 0.37 | 0.60–0.65 |
| lint toza | 0.74 | 0.61* | 0.29 | 0.38–0.58 |
*DeepSeek lint tushishi `accent-energy-mismatch`dan edi — u kit jadvalidan kelgan va keyin tuzatildi (qayta o'ynatishda 0.61).
24 ekranlik run'lar orasida shovqin katta — yakuniy xulosani ko'z bilan (sheet PNG) ham tekshir.

### Keyingi qadamlar (tartib bilan)
1. **LP-06 (Jarayonda, `lp06-precompile` branch):** saqlashda Tailwind (CDN'ning o'zi — v3.4, `tailwindcss-v3` npm
   alias) va Lucide ikonalarini oldindan kompilyatsiya qilish; `src/lib/precompile.ts`, `scripts/precompile-screens.ts`
   (backfill, standart dry-run). **Tekshirilmagan:** CDN bilan piksel solishtiruvi va vaqt o'lchovi to'xtatilgan.
   Davom: branch'ni ol → `npm install` → 20+ saqlangan ekranni CDN va precompile bilan render qilib piksel-diff (<0.5%)
   va yuklanish vaqtini o'lcha → testlar → birlashtir. Backfill'ni `--write` bilan faqat foydalanuvchi roziligida.
   Maqsad: ekran birinchi ochilishi ~3 s → <0.5 s (98% ekran 400 KB Tailwind CDN yuklaydi).
2. **DeepSeek kit ulushi 43%** (Haiku 60%): DeepSeek kit'ni kamroq ishlatadi — arxetipga mos 5–6 kit blokining qisqa
   ro'yxatini brief'ga qo'shishni sinash (eval: avval claude-cli, keyin DeepSeek ~$0.09).
3. **"Chala HTML" xatosi** (~1/4 run'da bitta ekran): endi `[plan] incomplete HTML` log'ida javob oxiri yoziladi —
   Telescope'dan sababni top.
4. Kichik: chatdan "filtr paneli qo'sh" hali `sheet` bo'lmaydi (`slotForAddedScreen`); nav-guard'ni haqiqiy login
   havolali ekranda brauzerda bir bosib tekshir.
5. **Foydalanuvchidan kutilayotgan:** Nova karta burchagi 28 → 24px?; Gummble 7 kunlik sinovini bekor qilish
   (davom etmasak); Gemini kaliti (LLM-06, Admin → API keys).

### Ish usuli (bugun kelishilgan)
- Eval'lar **`LLM_PROVIDER=claude-cli`** bilan (Haiku, bepul), asosiy natija DeepSeek'da bir marta qayta tekshiriladi.
- Gummble MCP ulangan (7 kunlik sinov): `search_flows`, `get_app`, `get_screen_details_batch` ishlaydi;
  `search_screens` buzuq. Haqiqiy ekranlar faqat ilhom/o'lchov uchun — repoga saqlanmaydi.
- Foydalanuvchi telefonda bo'lsa — natijani rasm bilan yubor (SendUserFile).

## 0b. (oldingi) Keyingi asosiy ish: generatsiya sifatini super optimallashtirish (2026-09-25)

Foydalanuvchi qarori: **endi asosiy ish — faqat generatsiya sifati.** Qolgan hamma narsa (deploy,
marketing, muharrir) shundan keyin.

**Oxirgi holat (commit `22f1a68`, `canvas-planner` = `main`):**
- GQ-38 (standart onboarding), GQ-39 (har tizimning o'z bar shakllari) tayyor. Bar endi skrollda
  yig'ilmaydi, shakl loyiha id si bo'yicha tanlanadi (ilova nomi emas), island Search doirasiga
  joy qoldiradi — brauzerda tekshirilgan.
- Bar tahlili: 7 shakl faqat qobig'i bilan farq qiladi, ichidagi tab bir xil (ingichka ikonka +
  11px kulrang yozuv, aktiv holat 14% tint). Taklif **GQ-40** (Notion, `Keyin`): aktiv tabda ichi
  to'la ikonka, har tizimning o'z bar tokenlari, Lumen uchun haqiqiy glass. **Foydalanuvchidan
  so'raladi: GQ-40 ni MVP ga o'tkazish.**
- Model A/B (2 brief: food-delivery, fit-tracker), eval asboblari endi repoda:
  `npm run eval -- --model <id>`, `LLM_SCREEN_THINKING=1`, `LLM_PLAN_THINKING=1`. (A call that fails before its first token is retried once on the same model when no fallback is set.)

  | | DeepSeek off (hozirgi) | DeepSeek thinking | Gemini 3.1 Flash-Lite |
  |---|---|---|---|
  | Ekranlar | 12/12 | 11/12 | 8/11 (bepul tarif 503) |
  | Ilova vaqti | 48s | 479s | 38s |
  | Narx (2 ilova) | $0.053 | $0.293 | $0.036 |
  | Lint toza / audit toza | 25% / 58% | 82% / 100% | 86% / 71% |

  Xulosa: thinking sifatni oshiradi, lekin 10× sekin va 5.5× qimmat (32k chekda 12 dan 7 ekran
  yarim qoldi) — mahsulotga emas. Muhim signal: **thinking o'chiq DeepSeek'ning lint/audit
  topilmalari ko'p** — asosiy optimallashtirish shu yerda. Gemini 3.8 Flash bepul tarifda
  (20 so'rov/kun) sinalmadi; to'liq sinov LLM-06 da, kalitga billing ulangandan keyin.
- **Gemini kaliti:** `.env` da `GEMINI_API_KEY` (gitda yo'q). Chatda ochiq yozilgan — AI Studio'da
  yangisiga almashtirilsin, yangi kompyuterda `.env` ga (yoki Admin → API keys) qo'lda kiritilsin.

**Reja (Notion tartibida, ochiq MVP G qatorlari):**
1. **KIT-04 (Jarayonda) — avval shu tugaydi.** Mezon: chiqish tokenlari −40%, lint ≥95%.
   A/B dagi eng ko'p lint qoidalari: `caps-eyebrow`, `mono-for-data`, `opacity-dimmed-text`,
   `middle-dot-meta`, `accent-energy-mismatch`, `identical-card-stack`. Har birini: bitta to'g'ri
   javobi bo'lsa — `autofixScreen` da kod bilan; aks holda input (blueprint / pattern / kit
   eskizi / `craft/mobile.md` da zaifroq qoidaning o'rniga). Render audit: `low-contrast`,
   `overlap`, `small-target`.
2. **GEN-27** — ekran "Untitled" bo'lib qolmasin (kichik).
3. **GQ-17** — planner'ga "bitta jasur harakat" maydoni.
4. **GQ-27** — hero sticker tavsiya qilsin.
5. **LLM-06** — har model eval'dan o'tadi (Gemini 3.8 Flash / 3.1 Flash-Lite, billing bilan).

**Ish usuli (har o'zgarish):**
1. Bazaviy o'lchov: `npm run eval -- --label baseline --concurrency 2` (barcha brief, ~20 daqiqa,
   ~$1). 2026-09-25 da eski kompyuterda boshlangan edi (`eval/out/*-baseline-0925`), lekin
   `eval/out` gitda yo'q — **yangi kompyuterda bazaviy o'lchovni qaytadan yurgiz.**
2. O'zgarish → `npm run eval -- --only <brieflar> --label <nima>` bilan tez takror, keyin to'liq run.
3. `compare.html` va metrics delta (lint `cleanShare`, `audit.cleanShare`, `usage.completionTokens`,
   `sameness`, `time`) + vizual hakam (`npm run judge`, `claude -p`, pul sarflamaydi).
4. Mezon yaxshilanmasa — rad etiladi. `npm run check` va `npx tsc --noEmit` toza bo'lishi shart
   (TST-01 admin overview testi ba'zan tasodifan yiqiladi — ma'lum, `Keyin`).

## 1. Yangi kompyuterda sozlash

```bash
git clone https://github.com/FurqatMashrabjonov/design.git
cd design
git checkout canvas-planner         # eng yangi ish shu yerda (generation-quality eski)
npm install
createdb design                     # Postgres 17 (brew install postgresql@17); jadvallar birinchi ishga tushishda yaratiladi
cp .env.example .env                # keyin kalitlarni qo'lda yoz (pastda)
npm run check && npx tsc --noEmit   # ikkalasi ham toza bo'lishi kerak
npm run dev                         # http://localhost:3000
```

- **Node 24** kerak (testlar `.ts` fayllarni to'g'ridan-to'g'ri `node` bilan ishga tushiradi).
- **`.env`** gitda yo'q (ataylab). Kalitlar: `DEEPSEEK_API_KEY`, `PEXELS_API_KEY`, va kirish uchun `BETTER_AUTH_URL=http://localhost:3000`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (redirect: `http://localhost:3000/api/auth/callback/google`), `ADMIN_EMAILS`. Eski kompyuterdagi `.env` ni xavfsiz yo'l bilan ko'chir — chatga, gitga, Notion'ga yozma. Google consent ekranida ilova nomi hali "ieltsai.uz" (Cloud Console'da to'g'rilash kerak).
- **Push**: `gh auth refresh -h github.com -s workflow` (workflow scope kerak, `.github/` bor), va macOS keychain eski tokenni qaytarsa: `git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin canvas-planner`. **CI (INF-08) GitHub billing qulfi tufayli ishlamayapti** — Bloklangan.
- **Baza — Postgres** (INF-10, 2026-09-24): `DATABASE_URL` (standart `postgres://localhost:5432/design`). Loyihalar gitda yo'q — yangi kompyuterga `pg_dump design | psql design` bilan ko'chir. Eski SQLite `data.db` bo'lsa: bo'sh bazaga `node --env-file-if-exists=.env --import ./eval/alias-hook.mjs scripts/sqlite-to-pg.ts data.db` (jadvallar sonini solishtiradi). Testlar va eval o'z vaqtinchalik bazasida (`DB_FRESH=1`).
- **Push:** `gh auth login` qil, keyin `git -c credential.helper='!gh auth git-credential' push origin generation-quality`. Eski kompyuterda `gh` agent shell PATH'ida yo'q edi, shuning uchun to'liq yo'l ishlatilgan: `!/opt/homebrew/bin/gh auth git-credential`.
- **API kalitlari**: Admin → Settings → API keys'dan kiritiladi (`.env`'dagidan ustun, shifrlangan). Buning uchun `.env`'da `SECRETS_KEY` bo'lishi shart — uni eski kompyuterdan ko'chiring, aks holda panelda saqlangan kalitlarni qayta kiritish kerak.
- **To'lovlar (Polar, sandbox)**: `.env`'da `POLAR_ACCESS_TOKEN`, `POLAR_SERVER=sandbox`, `POLAR_WEBHOOK_SECRET`. Mahsulotlar sandbox'da yaratilgan; yangi muhitda `node --env-file=.env --import ./eval/alias-hook.mjs scripts/polar-products.ts`. Webhook localhost'ga **ngrok** orqali keladi: `ngrok http 3000`, keyin Polar'da (Settings → Webhooks yoki API `POST /v1/webhooks/endpoints`) URL'ni `https://<ngrok>/api/polar-webhook` ga yangilang — ngrok URL'i har ishga tushganda o'zgaradi, secret esa endpoint'ga bog'liq. Test karta: `4242 4242 4242 4242`. Production uchun alohida hisob va token (BIL-03).
- **Notion MCP** (Claude Code uchun): `claude mcp add --transport http notion https://mcp.notion.com/mcp`, keyin `/mcp` da login.

## 2. Hozirgi holat

Ikki bosqich parallel: **G · Generatsiya sifati** (`docs/archive/GENERATION-PLAN.md`) va **M · Muharrir UX** (`docs/archive/EDITOR-PLAN.md`). Foydalanuvchi qarori: avval muharrir, keyin generatsiyaning qolgani.

| Bosqich | Tayyor | Qolgan |
|---|---|---|
| G · Generatsiya | EVAL-01…04, GEN-17…26, AST-01…04, UX-03…05 | UX-01/02 (blueprint'lar), HIG-01…03, KIT-01…04, EYE-01…03, VAR-01…03, FB-01/02 |
| M · Muharrir | M0 (EDT-20/21/16/22, GEN-08), M1 (CHAT-01…08, GEN-09, EDT-29), M2 (EDT-23, 24, 17, 25, 26, 18, 19, 31), M3 (EDT-09, EDT-12), M4 (EDT-27, 11, 28, 30), M5 (EDT-10, 32, EXP-03, THM-08), THM-02/03 | — |

Batafsil — `docs/CHANGELOG.md` (eng yangisi tepada), Notion'da "Muharrir doskasi" va "Generatsiya doskasi" ko'rinishlari.

## 2b. 2026-09-23 sessiyasi: nima o'rganildi va qayerda to'xtadik

Kun bo'yi bitta savolga javob izladik: *nega shuncha o'zgarishdan keyin ham oddiy "habit tracker app"
dabdala chiqadi?* Javob quvurda emas, **o'lchovda** edi.

**Eng muhim topilma: biz noto'g'ri raqamni optimallashtirib kelganmiz.** `npm run eval` statik CSS
tekshiruvini (`lint.cleanShare = 0.65`) ko'rsatardi, brauzerda ishlaydigan render audit esa metrikaga
umuman kirmagan edi. Qo'yganda **0.25** chiqdi — 24 ekrandan 18 tasida ko'z ko'radigan nuqson.
Audit endi `npm run eval` ning o'z metrikasida (`metrics.audit`), `OD_SKIP_AUDIT=1` bilan o'chadi.

Yo'l-yo'lakay auditning o'zida uchta xato topildi va tuzatildi: u **500 pikselda** o'lchayotgan edi
(headless Chrome 390px oyna ocholmaydi — endi 390px iframe ichida), prob ishga tushmasa **`[]`
qaytarardi** (ya'ni "toza ekran" deb ko'rsatardi — endi `throw`), va yarim shaffof qatlamlarni
o'tkazib yuborardi (skrimdagi oq matn skrim **ortidagi** oq sahifaga solishtirilardi).

Natija: `cleanShare` **0.25 → 0.833**, hammasi generatsiyasiz, $0 ga (tuzatishlar deterministik
bo'lgani uchun saqlangan ekranlarga qayta qo'llab o'lchandi).

**Uchta tajriba, uchta xulosa:**

| Nima qildik | Natija | Xulosa |
|---|---|---|
| KIT-05: promptga komponent qiymatlarini qo'shdik | kit ishlatish 0.61 → **0.24**, lint 0.65 → 0.48 | promptga material qo'shish **ishlamaydi** |
| FAB: chiqqan HTML geometriyasini yamadik | uch urinish, to'liq yechim yo'q | chiqishni qayta joylashtirish **ishlamaydi** |
| GQ-09: kirishdagi jadvalni tuzatdik | kulrang Notion → iliq Retro, sifat tushmadi | **richag kirishda** |

KIT-05 butunlay qaytarildi. FAB tuzatishi ham qaytarildi, faqat `covered-text` o'lchovi qoldi.
Shundan `CLAUDE.md` ga yangi arxitektura qoidasi yozildi: **kod qo'sha oladi va almashtira oladi,
lekin qayta joylashtirmaydi.**

**GQ-09 nima edi:** `BY_APP_TYPE` jadvalida 48 nomzod katagidan atigi 3 tasi `high` rang energiyali,
va `productivity` bilan `marketplace` da to'rttasi ham `low` edi. `"habit"` so'zi `productivity` da
turardi — ya'ni **bu mahsulot yaratadigan har bir habit tracker kulrang bo'lishi kafolatlangan** edi.
Endi `app-patterns/habits.json` o'z turi, nomzodlari `duolingo|bento|doodle|retro`, va test hech bir
ilova turining to'liq kulrang bo'lishiga yo'l qo'ymaydi.

### Keyingi ish: palitrani model o'ylab topsin (kelishilgan, hali boshlanmagan)

Foydalanuvchi bilan kelishuv: dizayn tizimini majburlash **shiftni pasaytiryapti**. Buni o'lchadik —
33 tizimning rang qamrovi:

```
ko'k 200-260   ████████████ 12   (37%)
qizil 0-30     ████████ 8
yashil         ███ 3
to'q sariq     █ 1      pushti █ 1      sariq █ 1
fon: yorug' 25 · to'q 7          pastel: 0 · yorqin 23
```

Katalogning 62% i ko'k va qizil; pastel **umuman yo'q**. Shu teshik bugun boshqa bir xatoni ham
tushuntirdi: pushti reference rasm berilganda ko'k Cal chiqqan edi — chunki katalogda **bitta**
pushti tizim bor va `matchSystem` eng yaqinini tanlaydi.

**Kelishilgan shakl** (A/B qilinadi, hali yozilmagan):

1. Planner chaqiruvi (allaqachon bitta va bir marta ishlaydi) reja bilan birga **palitra** qaytaradi:
   accent, bg, surface, fg, radius, shrift juftligi, xarakter — shu ilova uchun o'ylab topilgan.
2. Kod uni tekshiradi va AA ga keltiradi. **Bu qatlam bugun yozildi va tayyor**: kontrast algoritmi,
   `--od-*-text` hisoblash (rangli chip fonlari bilan birga), yuza-siyoh matritsasi — hech biri
   tizimga bog'liq emas, istalgan palitrada ishlaydi.
3. Tasdiqlangan palitra hammaga bitta bir xil `:root` bo'lib kiradi — xuddi hozirgi tizim kabi.
   Ya'ni **bitta ilova = bitta palitra**, 6 ta mustaqil chaqiruv bir-biriga zid ketmaydi.

**Nega "tizim butunlay bo'lmasin" emas:** 6 ekran 6 ta mustaqil LLM namunasi. Har biri o'zi tanlasa,
6 xil ilova chiqadi. Sleek'ning skrinshoti aynan shuni ko'rsatadi — 5 ekrandan 2 tasi to'q binafsha,
3 tasi oq-to'q sariq, nav panellari ham har xil. Ular xarakterni izchillik hisobiga sotib olishgan.

**Ochiq xavflar:** (a) AI palitralari o'zaro o'xshab ketishi mumkin — `sameness.crossBriefMean` buni
darhol ko'rsatadi; (b) dizayn tizimi faqat rang emas (shrift shkalasi, radius, soya tili, zichlik),
model rangni beradi, hunarni avtomatik bermaydi. Shuning uchun 33 tizim o'chirilmaydi — namuna
bo'lib qoladi.

**Sinash usuli** (foydalanuvchi tanlagan): bitta prompt — `"habit tracker app"`, uch so'z, o'zgartirmasdan —
ideal bo'lguncha aylantiramiz. Har 3–4 tuzatishdan keyin bir marta 4-briefli eval (~$0.10) faqat
"buzmadikmi" deb tekshirish uchun.

### Bitta prompt bilan topilgan, hali ochiq nuqsonlar

Ikkala ilovada ham takrorlandi (Streakly/notion va HabitLoop/retro):

1. **FAB oxirgi kartaning matnini yopadi** — `covered-text` bilan o'lchanadi. Tuzatish **kirishda**
   bo'lishi kerak (`list` blueprintida asosiy amal inline joylashsin), kodda emas — sinab ko'rildi,
   ishlamadi.
2. **Qidiruv lupasi maydondan tashqarida yolg'iz turadi** — markup xatosi, hali tegilmagan.
3. **Uzun nom ellipsissiz kesiladi** (`"No phone after 1..."`).
4. **Qahramon lahza yo'q** — streak `12 days` bo'lib qator ichida 14px turibdi. Sleek'da o'sha raqam
   ~120px. Bu Sleek bilan asosiy farq va u blueprintga bitta maydon bo'lib tushadi: *qaysi bo'lim
   qahramon va qanchalik katta*.

`od-kit.css` ning iOS o'lchamidagi switch'i (51×31) `small-target` beradi va bu **ma'lum cheklov**:
`input` `::after` ola olmaydi, kattalashtirish esa chizilgan boshqaruvni buzadi.

## 2c. 2026-09-24 sessiyasi: 2026 hunar qatlami, hakam, komponent varag'i — qayerda to'xtadik

Bitta prompt bilan ishladik: **"make habit tracker"**, har qadamda Chrome'da skrinshot, foydalanuvchi
ko'rib tasdiqladi ("zor bro menga yoqdi" — Nova). Nima qilindi (hammasi `docs/CHANGELOG.md` da, Notion'da Tayyor):

- **GQ-10** planner palitrasi → kodda AA'ga ta'mirlanadi (`lib/palette.ts`, `lib/color.ts`), faqat `design_system_auto` loyihalarda.
- **GQ-13 Nova** — 2026 flagman tizimi (Instrument Serif + Geist), iste'mol turlarida ruletka ×3.
- **GQ-18…GQ-25** — iOS 26 shisha tab bar (21px, skrollda yig'iladi), bento, duotone ikonka, katta sarlavhali header, soft-3D sticker slotlari, telefon shkalasi 34/17/15/13/11, harakat tokenlari, Nova dark.
- **GQ-08 hakam** — `eval/judge-project.ts`: kanvas loyihalarini `claude -p` vision bilan baholaydi, `--vs` juftlik, `--renormalize` (bugungi shell/kit saqlangan HTML ustiga). Topgan uchta nuqson tuzatildi: pill kontentni yopadi (clearance +40), sarlavha takrori (`dropDuplicateTitle`), ekran nomida ilova nomi (`screenTitle` — planner, saqlash, qo'shish yo'llarida).
- **GQ-16 komponent varag'i** (oxirgi ish, Tayyor): `ComponentSheetService` — kit markup'i rejaning entity'lari bilan to'ldirilib har ekranga `# HOUSE STYLE` bo'lib kiradi. Anchor-first aylanish va CSS digest **olib tashlandi**, 6 ekran parallel (33 s). Natija: kit ishlatish 24 → 214 (Doodle) / 174 (Nova), o'z CSS 65 KB → 44 KB, hakam koherensiya 3 → 4, juftlikda oldingi yugurishni yutdi.

Hakam ballari (1–5, Claude): Ritual/bento 3.33 · Nova 3-qadam 3.83 · yakuniy 3.00 (bugungi shell bilan 3.67) · GQ-16 Doodle 3.33 (koherensiya 4). **Ochiq:** ekranlar orasida *raqamlar* mos emas ("3 of 5 done" vs "5 of 6 remaining", "47 of 180" vs "34 check-ins") — entity'lar nomlarni beradi, jamlanma sonlarni emas (GQ-28, Keyin). Hero o'lchami yugurishdan yugurishga o'zgaradi; sticker sloti 0 marta (GQ-27); palitra yashilga moyil (GQ-26, bugungi Nova yugurishi amber berdi — bitta namuna); FAB (EYE-08); emoji ikonka o'rnida (model).

Ish usuli eslatmalari: LLM'siz qayta-render harness (scratchpad'da edi, repoda yo'q — kerak bo'lsa `judge-project.ts --renormalize` shu ishni qiladi); brauzerda ikkita Chrome ulangan bo'lsa localhost'ga faqat bittasi yetadi; reja darvozasi `localStorage['od:plan-gate']` (bu sessiyada `off` edi; kalitni o'chirgandan keyin ham bosh sahifadan yuborilgan brief darvozasiz chizildi — tekshirish kerak); nazorat tajribasi uchun chizishdan oldin bazada `design_system='nova'` qo'yilardi.

## 3. Keyingi ish

0. **Hozirgi navbat (Tartib bo'yicha)**: GQ-26 (palitra namunasi placeholder, ottenka xilma-xilligi) → GQ-27 (hero maydoni sticker tavsiya qilsin) → qolgan G qatorlari. Har biri "make habit tracker" bilan bir yugurish + `eval/judge-project.ts <id> --vs <id>,<oldingi>` (oldingi eng yaxshi: `6e8e4f08` Nova/GQ-16 — `eval/out/projects/` faqat shu kompyuterda, gitda yo'q). Yangi kompyuterda `data.db` bo'lmasa, birinchi yugurish bazaviy bo'ladi.
1. **Generatsiya (G)**: UX-01 (`blueprints/`) va UX-02 (`app-patterns/`) tayyor. VAR-02, HIG-03, EYE-03, KIT-03 (`lib/charts.ts`) ham tayyor. KIT-01 (`kit/od-kit.css`, hali modelga aytilmagan) ham tayyor. Keyingisi: KIT-02 (tizim shaxsiyati tokenlarda), KIT-04 (modelga "avval to'plamdan ol" + oltin namunalar — kit shu bilan ishga tushadi), EYE-01/02, HIG-01/02, VAR-01/03, FB-01/02. Ochiq savol foydalanuvchiga: 5 tizimda `--muted`, 10 tizimda asosiy tugma kontrasti brend tokenlarida <4.5. Eval Claude obunasida ham yuradi (`LLM_PROVIDER=claude-cli npm run eval …`, bitta brief ~8–10 daqiqa); natijalar faqat Claude run'lari bilan solishtiriladi, ishga tushirishdan oldin asosiy o'zgarishlar DeepSeek'da qayta tekshiriladi. Har o'zgarish eval bilan; bazaviy o'lchov uchun oldingi commit'ni `git worktree` da xuddi shu `--only` brieflar bilan yurgizish (node_modules va .env symlink), natijani `eval/out` ga ko'chirib solishtirish. Muharrir rejasi tugagan. Deploy (AUTH, limitlar, Postgres, hosting) generatsiyadan keyin. M4 to'liq tayyor (EDT-27, 11, 28, 30). Foydalanuvchi qarori (2026-09-22): avval muharrir qatorlari tugaydi, keyin generatsiya (G) qatorlari, deploy undan keyin. M3 tayyor: `‹ v3 ›` (`screens.version_id`), Cmd+Z/Shift+Cmd+Z (`lib/undo-stack.ts`, soft delete `screens.deleted_at`, redo = revert'ning revert'i).
   Qaror (foydalanuvchi, 2026-09-24): Postgres'ga o'tildi (INF-10). Production'da qaysi xizmat (Supabase, Neon yoki o'z serveri) — INF-02.
2. Keyin M5 (yo'l ko'rsatkich, Preview · Share · Export menyusi, zip eksport, dizayn tizimi namunasi), so'ng generatsiyaning qolgani.
3. Ma'lum cheklov: bo'laklab tahrirlashda (EDT-19) bitta qiymat bir necha joyda bo'lsa, model ba'zan bir joyni unutadi — agent jurnalida "Listed as affected but not edited" bo'lib ko'rinadi. "Replace photo" haqiqiy Pexels bilan brauzerda hali bosib ko'rilmagan.

## 4. Loyiha qoidalari va o'rganilgan narsalar

`CLAUDE.md` — ish kelishuvi va arxitektura qoidalari (majburiy o'qing). Undan tashqari eski kompyuterdagi Claude xotirasida bo'lgan, lekin repoda yo'q narsalar:

- **Foydalanuvchi**: yakka founder, o'zbekcha yozadi (javob ham o'zbekcha), halol baho va dalilga asoslangan tavsiya kutadi. Hujjatlar (CHANGELOG, ROADMAP, rejalar) o'zbekcha, kod izohlari inglizcha.
- **Qoidalarni buzish mumkin, agar sifatga xizmat qilsa** (foydalanuvchi ruxsati): `Tartib` tartibidan chiqish yoki ro'yxatda yo'q ishni qilish mumkin — qaysi qoida va nega buzilganini bir qatorda ayt va keyin Notion'ga qator qo'sh. Buzilmaydi: `check`/`tsc` toza, generatsiya o'zgarishi eval bilan, CHANGELOG yozuvi, faqat so'ralganda commit/push.
- **Model**: faqat DeepSeek V4 Flash (`deepseek-flash`) va `thinking: { type: 'disabled' }` — `LlmService` da pin qilingan. Nomi bilan chaqirilsa thinking standart yoqiq va reasoning tokenlari pulli. `deepseek-v4-pro` ishlatilmaydi.
- **DeepSeek balansini tejash**: UI yoki oqimni qo'lda sinash uchun `.env` ga `LLM_PROVIDER=claude-cli` — generatsiya o'z Claude Code obunang orqali ketadi (faqat lokal; eval va production rad etadi). Eval uchun olib tashla. Eval'da har safar bazaviy variantni qayta yurgizma — saqlangan natija bilan solishtir; deterministik o'zgarishni (autofix, lint) saqlangan ekranlarga LLM'siz qayta qo'llab tekshir.
- **Eval narxi**: to'liq `npm run eval` (25 brief) ≈ **$1.1**. Iteratsiyada `--only id,id` (1 brief ≈ $0.04). To'liq yugurishdan oldin narxini ayt. API 402/429 "balance" qaytarsa — to'xta va balansni to'ldirishni so'ra, qayta urinma. Pexels bepul, lekin 200 so'rov/soat.
- **Brauzerda sinash**: asosiy bazaga tegmaslik uchun alohida baza bilan alohida port: `createdb design_try && DATABASE_URL=postgres://localhost:5432/design_try npx vite dev --port 3115`. Claude'ning brauzer tab'i odatda fonda (`visibilityState: hidden`) — koordinata bo'yicha bosish va skrinshot ishonchsiz; natijani DOM va bazadan o'qish ishonchliroq. Sandbox'li iframe ichini sinash uchun uning `srcdoc` iga test skript qo'shiladi.
- **Commit qilishdan oldin `git stash` ishlatma** — bir marta ishlayotgan o'zgarishlarni o'chirib yuborgan (fsck bilan tiklangan).
- **Commit oxiri**: `Co-Authored-By: ...` qatori (Claude Code o'zi qo'yadi).

## 5. Tez eslatma: tizim qanday ishlaydi

- Reja: `PlannerService` (planner v2: `requested/covers` qamrov + bitta tuzatish aylanishi, har ekranga `archetype/userGoal/primaryAction/sections/linksTo`, umumiy `entities` ma'lumot modeli → `projects.plan`).
- Ekran: `PromptComposer` (mobil prompt ≤24k belgi, `STYLE.md` + `craft/mobile.md`) → `ScreenContext.screenBrief` (ilova konteksti, shell shartnomasi, `APP CONTENT`, `APP DATA`) → DeepSeek → `normalizeScreen` → `ImageService.resolveImages` (Pexels, avatarlar, monogramma) → lint → saqlash.
- Muharrir: `ScreenFrame` + `lib/edit-bridge.ts` (iframe ichida), elementlar `lib/element-ops.ts` `annotateElements` bilan (saqlanmaydi, har safar hisoblanadi), qo'l tahrirlari `ElementController`, suhbat `messages` jadvali (`lib/agent-messages.ts`), "Undo this step" — `HistoryController.revertMessage`.
- Testlar: `npm run check` (services, database, new-features, element-ops, image, controllers — DeepSeek stub bilan, eval).

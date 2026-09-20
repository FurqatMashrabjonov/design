# Changelog

Newest first. One entry per completed change: what changed, files touched, how it was verified.
Entries before 2026-09-19 were backfilled from git history and have no verification notes.

## 2026-09-20

### Kadr balandligi kontent bo'yicha o'lchanadi — EDT-15
Har kadr qat'iy 390×844 edi, shuning uchun uzun ekranning yarmi kanvasda umuman ko'rinmasdi. Endi kadr o'z ekraniga moslanib o'sadi (Streakly loyihasida 1189–1606px).

Sahifani ota-oynadan o'lchab bo'lmaydi: generatsiya HTML i sandbox ichida ishlaydi va `contentDocument` yopiq. Shuning uchun sahifa o'zini o'lchab, balandlikni `postMessage` bilan chiqaradi — tema va prototip ko'priklari ishlatadigan naqshning o'zi. Kelgan raqam ishonchsiz: u `clampFrameHeight` bilan qurilma balandligi va 12000px orasiga qisiladi, keyin bazaga yoziladi.

Ikkita tuzoq ushlandi:
- **O'zini o'zi oziqlantiruvchi o'lchov.** `min-height:100dvh` yozgan ekran biz bergan kadr balandligiga cho'ziladi va o'shani qaytaradi — kadr o'sa oladi, lekin hech qachon qisqara olmaydi. Shuning uchun o'lchashdan oldin viewport birliklari `--od-frame-vh` ga qaytariladi va root quti qurilma balandligida ushlab turiladi.
- **`documentElement.scrollHeight` yaramaydi.** U hujjatning scroll qutisi, ya'ni hech qachon kadrdan kichik emas. Brauzerda sinaganda kadr 3000px da qotib qoldi. O'lchov `body` qutisiga o'tkazilgach, 3000 → 1189 ga to'g'ri qisqardi.

Bu — saqlangan HTML ustidan render paytidagi o'zgartirish (`lib/theme-override.ts` kabi), shuning uchun eski loyihalar ham qamrab olinadi va ekranlar bazada qayta yozilmaydi. Ko'rish sahifasi haqiqiy telefon simulyatsiyasi bo'lgani uchun tegilmagan — 844px da qoladi.
- Fayllar: `src/lib/frame-height.ts` (yangi), `src/ScreenFrame.tsx`, `src/routes/p.$projectId.tsx`, `src/app/Models/Screen.ts`, `src/app/Http/Controllers/ProjectController.ts`, `src/server/fns.ts`, `src/database/schema.ts`, `src/database/migrate.ts`, `src/database/migrations/0008_add_screen_height.ts`, `new-features.check.ts`.
- Tekshirildi: `npm run check` va `tsc` toza. Har yangi tasdiq tegishli regressiyada yiqiladi (qurilma pol qiymati olib tashlanganda, style atributlari qayta yozilmaganda, root quti ushlanmaganda) — buzuq holatlar vaqtincha yasalib, fayl aynan tiklandi. Chrome'da Streakly loyihasida: beshta kadr har xil balandlikda to'liq ko'rinadi, "fit" hammasini qamraydi, balandliklar bazaga yozildi. Chekka holat: bazaga qo'lda 3000px qo'yib yuklanganda kadr 1189px ga qaytdi. Ko'rish sahifasida iframe 844px va probe yo'q; konsolda xato yo'q.

### CI, oqimni to'xtatish va kalitlar auditi — INF-08, LIM-04, SEC-04
- **INF-08 · CI.** `.github/workflows/ci.yml`: har push va PR'da `npm ci`, `npm run check`, `npm run build`, `tsc`. Workflow'ni toza nusxada (`node_modules`, `.env`, `data.db` siz) to'rt qadamiga qadar qo'lda takrorladim. Birinchi variantda `tsc` qizil chiqardi: `routeTree.gen.ts` gitignore'da va faqat dev/build paytida yaratiladi. Shuning uchun `build` typecheck'dan oldin turadi; bu production build'ni ham har push'da tekshiradi. GitHub Actions'ning o'zi bu yerda ishga tushirilmadi, shuning uchun birinchi haqiqiy run'ni push'dan keyin kuzatish kerak.
- **LIM-04 · Oqimni to'xtatish.** Avval tab yopilsa ham LLM chaqiruvi oxirigacha ketardi va token sarflanardi. `streamCompletion` endi `AbortSignal` qabul qilib `fetch`ga uzatadi; ikkala controller'da javob oqimi `cancel()` bo'lganda signal beriladi; `PlanController` foydalanuvchi ketgach yangi (pullik) ekranlarni boshlamaydi. Test soxta `fetch` bilan: signal `fetch`ga yetadi va abort'dan keyin oqim to'xtaydi.
- **SEC-04 · Kalitlar.** Yig'ilgan brauzer fayllarida kalit qiymati ham, `DEEPSEEK` so'zi ham yo'q; `process.env` faqat `LlmService`da. `npm run check` endi brauzerga tegishli barcha fayllarni skanerlaydi.
- Fayllar: `.github/workflows/ci.yml`, `src/app/Services/LlmService.ts`, `GenerateController.ts`, `PlanController.ts`, `new-features.check.ts`.
- Tekshirildi: har bir yangi test haqiqiy kodda o'tadi va tegishli buzilishda yiqiladi (signal olib tashlanganda, komponentga `process.env` qo'shilganda); barcha buzilgan fayllar tiklandi.

### Generatsiya HTML i sandbox ichida qoladi — SEC-03
Model yozgan JavaScript ishlaydi, shuning uchun `allow-same-origin` berilsa u bizning origin'imiz sifatida ishlab, sessiya cookie'sini o'qiy va API'ni foydalanuvchi nomidan chaqira olardi. Audit: kodda faqat 2 ta `<iframe>` (canvas va ko'rish sahifasi), ikkalasi `sandbox="allow-scripts"`, `allow-same-origin` va `dangerouslySetInnerHTML` hech qayerda yo'q. Kafolat regressiyadan himoyalandi: `npm run check` endi `src/` dagi har bir faylni skanerlaydi.
- Fayllar: `src/app/Services/new-features.check.ts`.
- Tekshirildi: test haqiqiy kodda o'tadi; `allow-same-origin` qo'shilganda va sandbox butunlay olib tashlanganda ikkalasida ham yiqiladi (buzuq holatlar vaqtincha yasalib, fayl tiklandi). Birinchi urinishda testning o'zida xato chiqdi (`readFileSync` e'lon qilinishidan oldin ishlatilgan) va buzuq holat sinovi uni aynan shu tufayli ushladi.

### Production build ishlaydi — INF-03
`vite build` avval hech qachon sinalmagan edi. U muvaffaqiyatli o'tdi, lekin faqat `fetch` handler chiqaradi, o'zi port tinglamaydi — production'da serverni ishga tushiradigan hech narsa yo'q edi. `server.prod.mjs` qo'shildi: `srvx` (TanStack Start allaqachon unga tayanadi, yangi bog'liqlik yo'q) bilan handler'ni portga ulaydi va `dist/client` ni beradi. `npm start` skripti qo'shildi. `PORT` va `HOST` muhit o'zgaruvchilaridan olinadi.
- Fayllar: `server.prod.mjs`, `package.json`, `src/app/Services/new-features.check.ts`.
- Tekshirildi: `npm run check`, `tsc`, va production serverda — sahifalar 200, statik fayl to'g'ri MIME turi bilan, brauzerda hydration ishladi (5 iframe, Preview faol, konsolda xato yo'q), haqiqiy 5 ekranli generatsiya bazaga yozildi.
- Eslatma: `better-sqlite3` bundle'ga kirmaydi (tashqi bog'liqlik), demak deploy qilinadigan mashinada `npm ci` ishlashi shart.
- Sinov paytida "cascade ishlamadi" deb o'ylandi, lekin bu test usulining xatosi edi: SQLite'da `foreign_keys` har ulanish uchun alohida, `sqlite3` CLI uni yoqmaydi. Ilova ulanishi (`connection.ts:9`) yoqadi va cascade to'g'ri ishlashi tasdiqlandi.

### Tartib shoshilinchlik bo'yicha qayta belgilandi
Notion'dagi 15 ta qatorning **Tartib**i o'zgardi. Sabab: (1) bog'liqligi yo'q va katta noma'lumni yopadigan ishlar birinchi (INF-03, SEC-03, SEC-04, LIM-04, INF-08); (2) to'lov do'konini tasdiqlash kunlab kutiladi va jonli Shartlar/Maxfiylik sahifalarini talab qiladi, shuning uchun deploy, huquqiy sahifalar va BIL-01/BIL-03 mahsulotni sayqallashdan oldin turadi. Bosqich (B0–B7) yorliqlari o'zgarmadi — ular mavzu bo'yicha guruh, Tartib esa ijro tartibi.

### Notion reja o'zbek tilida, modullar va Liquid Glass tahlili
Reja Notion'ga ko'chirildi va butunlay o'zbekchaga o'girildi: **Vazifalar** database'i (119 qator, 19 modulga ikki tomonlama bog'langan), **Modullar** database'i (har modul sahifasida maqsad, submodullar va o'sha modulning vazifalari), raqobatchilar taqqoslash sahifasi va reja bosh sahifasi. Ko'rinishlar: qurish tartibi, doska, submodullar va bosqichlar bo'yicha. Endi Notion asosiy manba, `docs/ROADMAP.md` esa undan olingan nusxa.
- Liquid Glass (iOS 26) tahlil qilindi va brauzerda sinab ko'rildi. Xulosa: muzlagan shisha hamma brauzerda ishlaydi; sinish `feDisplacementMap` ni `backdrop-filter` da talab qiladi va faqat Chromium'da ishlaydi; Safari `backdrop-filter` ichida CSS o'zgaruvchilarini qo'llab-quvvatlamaydi. Effekt bizning sandbox iframe + transform muhitimizda sinaldi va ishladi. Ro'yxatga `THM-07` bo'lib `Keyin` sifatida qo'shildi.
- Fayllar: `CLAUDE.md` (asosiy manba endi Notion), `docs/ROADMAP.md` (o'zbekcha, 119 qator).
- Tekshirildi: faqat hujjat va reja. Notion'dagi qatorlar soni va ID lar takrorlanmasligi so'rov bilan tasdiqlandi.

## 2026-09-19

### Scope discipline: CLAUDE.md, roadmap, changelog, competitors
Added `CLAUDE.md` (working agreement: only build `MVP` rows from the roadmap, no unlisted features, log every change), `docs/ROADMAP.md` (every feature A–Z with scope and status; the Scope column is a proposal for the user to edit), `docs/CHANGELOG.md` (this file, backfilled from git), and `docs/COMPETITORS.md` (Sleek dashboard/editor, ScreenFlow, Stitch/Banani/v0/Lovable/Figma Make/Figr, with a take-or-skip table tied to roadmap rows).
- Files: `CLAUDE.md`, `docs/ROADMAP.md`, `docs/CHANGELOG.md`, `docs/COMPETITORS.md`.
- Verified: documentation only. Roadmap statuses cross-checked against the code and git log; dev port confirmed from `vite.config.ts`.

### Live theme override — THM-01
Config tab gets a Theme panel: accent colour, corner preset (Sharp / Soft / Round), heading and body font from 17 Google Fonts. Applied at render time as a stylesheet after each screen's own `:root`; stored HTML is never rewritten and Reset deletes the override. Editor frames update through `postMessage` (no iframe reload); preview, export, copy and code view use a static overlay. Only a hex colour and allowlisted ids are stored; CSS is generated from them and the controller sanitizes again.
- Files: `src/lib/theme-override.ts`, `src/components/canvas/ThemePanel.tsx`, `src/ScreenFrame.tsx`, `src/routes/p.$projectId.tsx`, `src/routes/preview.$projectId.tsx`, migration `0007_add_project_theme`, `Project`/`ProjectController`/`fns.ts`.
- Verified: `npm run check` (incl. hostile-input test), `tsc`, Chrome — colour + corners + fonts changed all five screens at once, persisted across reload and in preview, Reset restored the original.
- Commit `db6d208`.

### Full-page clickable preview — CAN-05
`/preview/:id`: one device frame on a dark stage, arrows and arrow keys step through screens, tab bar / action button / Back work inside the app, current screen lives in `?s=`. Editor Preview button opens it in a new tab. Removed the earlier in-canvas preview mode.
- Files: `src/routes/preview.$projectId.tsx`, `src/lib/preview-bridge.ts`, `src/components/canvas/TopBar.tsx`, `src/routes/p.$projectId.tsx`.
- Persisting planner output: migration `0006_add_navigation_columns` stores each screen's role, tab and parent, and the project's navigation.
- Fixed: shell nav/header now use inline styles only. A screen written in plain CSS rendered the class-styled nav as an unpositioned block off-screen, trapping the preview on it.
- Verified: `npm run check`, `tsc`, Chrome — tab taps, action button, arrow keys, deep link, editor round trip.
- Commit `00b88ac`.

### Cross-screen coherence in code — GEN-03, GEN-04, GEN-05, GEN-06, GEN-07
Parallel screens drifted (different accents, hand-drawn icons at 1.5–2.5px, one screen loading Inter while its sibling fell back to a system font). Consistency moved from prompt wording into code:
- `ShellService`: bottom nav / detail header as literal HTML from a lucide path map.
- `screen-normalizer`: canonical `:root`, webfont link, shell, unified icon stroke, lucide boot.
- `design-lint`: 8 checks; autofixes indigo accents and literal font stacks.
- `PlanController`: anchor screen first, siblings seeded with its style digest.
- `tokens.css` for `minimal`, `brutalist`, `midnight`; webfont `@import` for 32 systems with open substitutes for proprietary faces.
- Verified: `npm run check`, `tsc`, real multi-screen generation against DeepSeek (lint clean, tokens/fonts matched across screens).
- Commit `e5c88d9`.

## 2026-09-18

- `d40428f` — 30+ design systems, skills, critique jury, element editing, app coherence (GEN-04, GEN-08, CAN-07).
- `015902b` — misc changes.
- `19a0c34` — screen and project CRUD: hover toolbar, rename, duplicate, delete (CAN-02).
- `1032a0e` — fix canvas zoom leaking to whole-page browser zoom (CAN-01).
- `9ba7d6f` — restructure into Laravel-style layers: `app/{Models,Services,Http/Controllers}`, `database/migrations`.
- `bc98c4c` — History tab: per-screen version snapshots and restore (CAN-03).
- `57f296b` — multi-screen planner: one brief to 3–5 designed screens (GEN-02).
- `3ef8561` — rebuild UI on shadcn: infinite canvas, drag-to-position, in-place edit (CAN-01).
- `5a4e5d4` — adopt `craft/` rules + skill composition architecture.
- `f5bf76f` — streaming generation, design system picker, canvas zoom (GEN-01).
- `0640c66` — ignore `.idea`.
- `4f29865` — prompt to HTML screen with DeepSeek, SQLite, sandboxed preview (GEN-01).

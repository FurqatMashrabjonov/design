# Muharrir (kanvas) UX rejasi

> Holat: **taklif** (2026-09-21). Manbalar: muharrir kodi to'liq o'qildi (`routes/p.$projectId.tsx`, `components/canvas/*`, `ScreenFrame.tsx`, `lib/element-*`), brauzerda ishlatib ko'rildi, Sleek va Stitch muharrirlarining skrinshotlari (foydalanuvchidan) va obzorlar.
>
> Generatsiya endi yaxshi ekran beradi. Lekin foydalanuvchi vaqtining 90% i **birinchi generatsiyadan keyin** o'tadi: nimanidir o'zgartiradi, qaytaradi, solishtiradi. Hozir bizda aynan shu qism eng zaif.

## 1. Sleek va Stitch nimani to'g'ri qilgan

Uchta tamoyil. Ikkalasining muharriri shu uchtasi ustiga qurilgan:

1. **Agent nima qilganini doim bilasan.** Stitch'da chap panel — suhbat: agent har qadamdan keyin nima qurganini yozadi ("Topic Dashboard: … Exam Mode Setup: …"), pastda holat chipi va ochiladigan **"Agent jurnali"**. Sleek'da chat doimiy va tanlangan ekran kirish maydonida chip bo'lib turadi.
2. **Nimani ko'rsatsang, o'sha o'zgaradi.** Stitch: o'ngda asboblar ustuni — tanlash, **soha belgilash** (marquee), **qalam** (annotate), qo'l, rasm, tema. Matnni bosib to'g'ridan-to'g'ri yozasan, rangni bosib almashtirasan — bu tahrirlar generatsiya limitidan yemaydi. Prompt maydoni kanvas ustida, markazda; ustida **keyingi qadam takliflari** ("Change the colors of the Activity Map").
3. **Hech narsa yo'qolmaydi.** Sleek: har kadr ustida `‹ v3 ›` — versiyalar orasida bir bosishda yurish. Stitch: pastda undo/redo. Natija: foydalanuvchi qo'rqmasdan sinaydi.

Qo'shimcha, ikkalasida ham bor: chat **chapda**, kanvas o'ngda; kadrlar qurilma ramkasisiz, kontent balandligida; yuqorida faqat Preview / Share / Export; pastda tanlash/qo'l + zoom + fit; Stitch kanvasida ekranlardan tashqari **dizayn tizimi taxtasi** va **talablar hujjati** ham kadr bo'lib turadi.

## 2. Bizning muharrir: audit

| # | Topilma | Dalil | Og'irlik |
|---|---|---|---|
| E1 | **Suhbat tarixi yo'q.** "Chat" tabida faqat kirish maydoni. Agent nima qilgani, qaysi so'rov qaysi ekranni o'zgartirgani — hech qayerda. Reja kartasi (`PlanCard`) faqat birinchi generatsiya paytida, sahifa yangilansa yo'qoladi | `p.$projectId.tsx:316–319`: chat = `PlanCard` + `PromptBox`; bazada xabarlar jadvali yo'q | Kritik |
| E2 | **Element tanlash noto'g'ri ekranni nishonga olishi mumkin.** Har `ScreenFrame` `message` hodisasini manbasini tekshirmasdan tinglaydi; 7 kadr bo'lsa 7 handler ishlaydi va har biri o'z ekranini "tanlangan" qiladi — qaysi biri yutishi tasodif | `ScreenFrame.tsx:60–70`, `e.source` tekshiruvi yo'q. Brauzerda tasdiqlandi: sahifaning o'zidan yuborilgan soxta xabar hech qaysi kadr tanlanmagan holda "Restaurant Feed" ni tanladi va `Target: [header]` qo'ydi | Kritik (bug) |
| E3 | **Elementni tahrirlash 4 qadam va qo'pol.** Ekranni tanla → chatdagi "Select Element" tugmasi → elementni bos → prompt yoz. Tanlanadigan narsa faqat yirik bloklar (`header`, `section`, `nav`…): tugma, matn, rasm, karta tanlanmaydi | `element-annotator.ts:28`: faqat `header\|nav\|main\|section\|article\|aside\|footer\|form\|div`(semantik klassli) | Yuqori |
| E4 | **To'g'ridan-to'g'ri tahrir yo'q.** Bitta so'zni o'zgartirish uchun ham LLM chaqiruvi (15–20 soniya, pul) | kod | Yuqori |
| E5 | **Undo/redo yo'q, versiyalar yashirin.** Versiyalar bor, lekin alohida "History" tabida, faqat tanlangan ekran uchun, faqat "Restore". Kadr ustida `‹ v3 ›` yo'q, Cmd+Z yo'q | `HistoryPanel.tsx`; `EDT-09`, `EDT-12` hali ochiq | Yuqori |
| E6 | **Generatsiyani to'xtatib bo'lmaydi va jarayon ko'rinmaydi.** Ishlayotganda kirish maydoni butunlay o'chadi; "Stop" yo'q (serverda abort tayyor — LIM-04, UI'da tugma yo'q); xato kirish ostida mayda qizil matn | `PromptBox.tsx`: `disabled={busy}`; `GEN-08/09` ochiq | Yuqori |
| E7 | **Kanvas ochilganda 100% zoom** — 6 ekranli loyihada 2.5 ta kadr ko'rinadi, qolgani ekrandan tashqarida | `Canvas.tsx:30`: `{ scale: 1, x: 80, y: 80 }`; avtomatik `fit` yo'q. Skrinshotda ko'rinadi | O'rta |
| E8 | **Kadrni har joyidan ushlab sudraladi.** Ekranni bosib tanlamoqchi bo'lsang, ozgina qimirlasa — ko'chadi. Tanlash/qo'l asbobi yo'q, Space bilan surish yo'q | `Canvas.tsx:166`: butun kadr `onPointerDown`; `EDT-11` ochiq | O'rta |
| E9 | **Klaviatura yo'q.** Delete, Cmd+Z, Cmd+D, Cmd+0/1, Esc, strelkalar — hech biri | kod | O'rta |
| E10 | **To'rt tab: Chat / Jury / Config / History.** "Jury" — eksperimental hakam (EDT-08 `Keyin` edi), asosiy joyni egallab turibdi. "Config" da asosan tema + o'zgartirib bo'lmaydigan ikki nishon. "History" suhbatdan uzilgan | `Sidebar.tsx` | O'rta |
| E11 | **"make it blue" yangi ekran yaratadi**, tema o'zgarmaydi (`data.db` da "Blue Please — Accent Swatch") | `EDT-18` ochiq | Yuqori |
| E12 | **To'liq ekran tahriri butun HTML'ni qayta yozadi** — tegilmagan joylar ham o'zgaradi, 15–20s | `EDT-19` ochiq | O'rta |
| E13 | **"Reload" chalg'itadi:** kontekst menyusidagi Reload ekranni qayta yaratmaydi — eski promptni *tahrir* sifatida qayta yuboradi | `p.$projectId.tsx:160–172` | O'rta |
| E14 | **Yuqori panel:** loyihani o'chirish (qizil savat) Export yonida, bir bosishlik masofada; Export hech narsa tanlanmagan bo'lsa sababsiz o'chiq; faqat bitta ekran HTML'i; Share yo'q | `TopBar.tsx` | O'rta |
| E15 | Har element tanlanganda `toast` chiqadi — shovqin | `p.$projectId.tsx:277` | Past |
| E16 | Ekranlar ro'yxati — yuqori chapdagi dropdown; tanlaganda kanvas o'sha kadrga **bormaydi** | `ScreensList.tsx`, `onSelect={setSelected}` | O'rta |
| E17 | Yuborish faqat Cmd+Enter; Enter yangi qator. Hamma chat mahsulotlarida aksincha | `PromptBox.tsx:44` | Past |
| E18 | Keyingi qadam takliflari yo'q; bo'sh chat foydalanuvchiga nima qilish mumkinligini aytmaydi | kod | O'rta |
| E19 | Kanvasda kadr ichini aylantirib (scroll) bo'lmaydi — iframe `pointer-events-none` | `ScreenFrame.tsx:151` | Past (kadr kontent balandligida, shuning uchun og'ir emas) |
| E20 | Bir nechta ekranni tanlab bo'lmaydi (birga ko'chirish, o'chirish, "shu uchtasini o'zgartir") | kod | Past |

**Yaxshi tomonlar (saqlanadi):** kontent balandligidagi kadrlar, jonli tema (regeneratsiyasiz), kontekst menyusi, versiyalar bazada bor, bosiladigan preview, oqimli (streaming) jonli kadr.

## 3. Nimani olib tashlaymiz

Sen aytganingdek — ko'p narsa qo'shilgan. Har qo'shimcha tab asosiy ishdan joy oladi.

| Narsa | Qaror | Sabab |
|---|---|---|
| **Jury** tabi | Yashiriladi (kod qoladi, `Keyin`) | Render'ni emas, HTML matnini baholaydi (F11). EYE-01 auditi kelganda o'rnini oladi |
| **Config** tabi | **Theme** ga aylanadi; Device / Design system nishonlari yuqori panelda allaqachon bor | Takror |
| **History** tabi | Yo'qoladi: versiyalar kadr ustidagi `‹ v3 ›` ga va suhbat xabarlaridagi "shundan oldingi holatga qayt" ga ko'chadi | Tarix — suhbatning bir qismi, alohida joy emas |
| Yuqoridagi qizil savat | `⋯` menyusi ichiga | Xavfli amal bir bosishlik bo'lmasin |
| Element tanlanganda `toast` | Olib tashlanadi | Tanlov kadrda va chipda ko'rinadi |

Natija: **Chat** va **Theme** — Sleek'dagidek ikkita tab.

## 4. Reja

Hajm: K ≤ 1 kun, O' 2–3 kun. ID'lar mavjud qatorlar bilan to'qnashmaydi; `(bor)` — yo'l xaritasida allaqachon turgan qator.

### M0 · Buglar — 1 kun
| ID | Vazifa | Tayyor mezoni |
|---|---|---|
| EDT-20 | `ScreenFrame` xabarni faqat o'z iframe'idan qabul qiladi (`e.source`) | Test + brauzer: 3-ekrandagi element 3-ekranni nishonga oladi; begona `postMessage` hech narsa qilmaydi |
| EDT-21 | Kanvas ochilganda va generatsiya tugaganda avtomatik `fit`; `EDT-16 (bor)` — har xil balandlik hisobga olinadi | 6 ekranli loyiha ochilganda hamma kadr ko'rinadi |
| EDT-22 | "Reload" ikkiga ajraladi: **Regenerate** (spetsifikatsiyadan noldan, rejali ekran uchun) va oddiy qayta urinish; `GEN-08 (bor)` xato kadrida "Qayta urinish" | Xato kadr o'z joyidan tiklanadi |

### M1 · Agent suhbati — 3 kun (eng katta farq)
| ID | Vazifa | Tayyor mezoni |
|---|---|---|
| CHAT-01 | `messages` jadvali: loyiha, rol (user/agent), matn, tur (plan / add / edit / element / theme / error), ta'sirlangan `screenId`lar va `versionId`lar, vaqt, davomiylik | Migratsiya; sahifa yangilansa suhbat joyida |
| CHAT-02 | **Agent javobi kodda yoziladi, LLM'siz**: reja uchun — ilova xulosasi, ekranlar ro'yxati, ma'lumot modeli ("6 ta taom, 4 ta restoran"); tahrir uchun — "`Home` · header yangilandi · v3". Planner v2 bu ma'lumotni allaqachon beradi | Har so'rovdan keyin tushunarli javob, 0 token |
| CHAT-03 | Xabardagi ekran chipi bosilsa — kanvas o'sha kadrga boradi (`E16` ham yopiladi: ro'yxatdan tanlash ham) | Bosish → kadr markazda, tanlangan |
| CHAT-04 | Xabarda "**Shundan oldingi holatga qayt**" — o'sha so'rov tegizgan ekranlarni avvalgi versiyasiga qaytaradi | Bitta bosish bilan butun so'rov bekor qilinadi |
| CHAT-05 | Jarayon va to'xtatish: "3/6 ekran chizilmoqda", **Stop** tugmasi (serverdagi abort'ga ulanadi), kirish maydoni yozish uchun ochiq qoladi | Stop bosilganda token sarfi to'xtaydi; tayyor ekranlar qoladi |
| CHAT-06 | `GEN-09 (bor)`: xato — suhbatda qizil xabar, sababi va "Qayta urinish" bilan | 402/429/timeout har biri o'z matni bilan |
| CHAT-07 | **Agent jurnali** (ochiladigan): reja JSON'i qisqacha, tuzatish aylanishi bo'ldimi, lint topilmalari, nechta rasm topildi, vaqt, token. Ma'lumotlar serverda bor — faqat ko'rsatish | Stitch'dagi "Журнал агента" ning o'xshashi; bizniki aniqroq, chunki pipeline'imiz deterministik |
| CHAT-08 | **Keyingi qadam takliflari** (kirish ustida 2–3 chip), kodda: root ekrani yo'q tab → "`Stats` ekranini qo'sh"; `linksTo` dagi chizilmagan ekran → "`Order Tracking` ni chiz"; aks holda "Bo'sh holatini ko'rsat", "Qorong'i variant" | Chip bosilsa prompt to'ladi |

### M2 · To'g'ridan-to'g'ri ishlash — 4 kun
| ID | Vazifa | Tayyor mezoni |
|---|---|---|
| EDT-23 | **Har mazmunli element tanlanadi:** annotator tugma, havola, sarlavha, paragraf, `li`, rasm, input, kartalarni ham belgilaydi; mavjud ekranlar uchun render paytida (saqlangan HTML qayta yozilmaydi) | Tugmani bosib tanlasa bo'ladi |
| EDT-24 | **Tanlash tartibi, tugmasiz:** bir bosish — ekran; tanlangan ekranda bosish — element; Esc — bir pog'ona yuqori. Hover'da kontur va element nomi | "Select Element" tugmasi yo'qoladi |
| EDT-17 (bor) | Tanlangan element yonida suzuvchi panel: kichik AI kirish maydoni + tezkor amallar | Panel kanvas zoom'iga to'g'ri ergashadi |
| EDT-25 | **Matnni joyida tahrirlash, LLM'siz:** ikki marta bosish → `contenteditable` → Enter/blur → server faqat o'sha elementning matnini almashtiradi → yangi versiya | 0 token, <100ms |
| EDT-26 | Tezkor amallar, LLM'siz: elementni o'chirish, nusxalash, yuqoriga/pastga surish; rasm uchun — "Boshqa rasm" (so'rovni tahrirlab qayta qidirish, `ImageService`) | Har biri versiya yaratadi |
| EDT-18 (bor) | Niyat yo'naltirgich: tema so'rovi → `theme-override`, yangi ekran emas | "make it blue" tema rangini o'zgartiradi |
| EDT-19 (bor) | To'liq ekran tahriri butun HTML'ni qayta yozmaydi | Tegilmagan bo'limlar baytma-bayt bir xil |

### M3 · Hech narsa yo'qolmaydi — 2 kun
| ID | Vazifa | Tayyor mezoni |
|---|---|---|
| EDT-09 (bor) | Kadr ustida `‹ v3 ›` va tanlangan kadr paneli (kod, yuklab olish, nusxa, regenerate, `⋯`) | Strelka bilan versiyalar orasida yuriladi, har biri darhol ko'rinadi |
| EDT-12 (bor, `Keyin` → MVP) | Undo/redo: Cmd+Z / Shift+Cmd+Z — ekran kontenti, o'chirish, ko'chirish, tema | O'chirilgan ekran Cmd+Z bilan qaytadi |

### M4 · Kanvas ergonomikasi — 2 kun
| ID | Vazifa | Tayyor mezoni |
|---|---|---|
| EDT-11 (bor) | Tanlash / qo'l asboblari; Space ushlab surish | Qo'l rejimida kadr ko'chmaydi |
| EDT-27 | Kadr faqat **sarlavhasidagi tutqichdan** (`⠿`) sudraladi; kadr ichini bosish — tanlash | Tasodifan ko'chirish yo'qoladi |
| EDT-28 | Klaviatura: Delete, Cmd+D, Cmd+0 (fit), Cmd+1 (100%), Shift+1 (tanlanganiga zoom), Esc, ←/→ ekranlar orasida, `/` — promptga fokus; `?` — yorliqlar ro'yxati | Yorliqlar matn maydonida yozayotganda ishlamaydi |
| EDT-29 | Enter — yuborish, Shift+Enter — yangi qator | — |
| EDT-30 | Bir nechta ekranni tanlash (Shift+bosish, ramka bilan): birga ko'chirish/o'chirish; prompt ularning hammasiga | Chipda "3 ekran" |

### M5 · Tartib va yuqori panel — 1–2 kun
| ID | Vazifa | Tayyor mezoni |
|---|---|---|
| EDT-31 | Chat **chapga**, kanvas o'ngga; panel yig'iladi; tablar: Chat / Theme (§3) | Ikkala raqobatchidagi odat |
| EDT-10 (bor, `Keyin` → MVP) | Yo'l ko'rsatkich: Loyihalar › nom (nom joyida tahrirlanadi) | — |
| EDT-32 | Yuqori o'ng: **Preview · Share · Export**; Export — menyu: shu ekran HTML / hamma ekranlar zip (`EXP-03 (bor)`) / HTML nusxalash; o'chirish `⋯` ichida | Hech narsa tanlanmagan bo'lsa ham Export ishlaydi |
| THM-08 (bor) | Kanvasda **dizayn tizimi kadri** (palitra, shriftlar, radius, komponent namunalari) — tokenlardan kodda yig'iladi | Tema o'zgarganda darhol yangilanadi |

### Keyin
Annotate (qalam bilan chizib ko'rsatish), rasm/skrinshot kiritish (`GEN-11`, ko'rish modeli kerak), ovoz, kanvasda talablar hujjati kadri, izohlar.

## 5. Tartib

| Hafta | Ish | Foydalanuvchi nimani his qiladi |
|---|---|---|
| 1 | M0 + M1 | "Agent nima qilganini ko'ryapman, to'xtata olaman, qaytara olaman" |
| 2 | M2 | "Nimani bossam, o'sha o'zgaradi; matnni o'zim yozaman" |
| 3 | M3 + M4 + M5 | "Figma'dagidek qulay, hech narsa yo'qolmaydi" |

Agar faqat bir hafta bo'lsa: **M0 + CHAT-01…05 + EDT-25 + EDT-09.** Eng ko'p seziladigan to'rtta narsa: suhbat tarixi, Stop, matnni joyida tahrirlash, versiya strelkalari.

Bizning ustunligimiz: CHAT-02, CHAT-07, CHAT-08, EDT-25, EDT-26 — hammasi **LLM'siz**. Raqobatchilarda agent javobi va jurnali model chiqishi; bizda pipeline deterministik bo'lgani uchun bu ma'lumot tekin va aniq.

## 6. Sendan qarorlar

1. **Jury va History tablarini olib tashlashga** rozimisan (kod qoladi, UI'dan yashiriladi)?
2. **Chatni chapga ko'chirish** (EDT-31) — odat bo'yicha to'g'ri, lekin ko'zga eng ko'p tashlanadigan o'zgarish. Hozir qilaylikmi yoki oxirida?
3. Generatsiya rejasidagi qolgan 19 qator (UX-01/02, KIT, EYE, VAR…) — muharrir rejasidan **keyin**mi, yoki orasiga UX-01/02 ni qistiramizmi?

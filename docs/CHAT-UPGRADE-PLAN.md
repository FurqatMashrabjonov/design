# Chat panelini agent darajasiga ko'tarish — tahlil va reja

> Yozilgan: 2026-09-23. Manbalar: bizning `ChatPanel.tsx` / `PromptBox.tsx` / `routes/p.$projectId.tsx` kodi; Lovable (Plan mode, "questions tool", Approve/Skip), Google Stitch (agent savol beradi, tanqid qiladi, rejimlar), Sleek (oddiy chat, rasm biriktirish); Claude / ChatGPT / Cursor'dagi umumqabul qilingan odatlar.

## 1. Hozir bizda nima bor (kod bo'yicha, halol)

| Narsa | Holat |
|---|---|
| Xabarlar | Ikki rol. Agent kartasi: matn, ekran chiplari (kanvasga olib boradi), yig'iladigan "Agent log · 12s", "Undo this step". Yaxshi asos. |
| Ish jarayoni | Bitta spinner + matn ("Working on…", "Checking the screens…"). Reja paytida `PlanCard`. Nima bo'layotgani ko'rinmaydi — faqat "kutib turing". |
| **Stop** | `PromptBox` Stop'ni faqat o'zining `busy` holatida ko'rsatadi (submit promise'i tugaguncha). Dashboard'dan boshlangan reja uchun quti band emas → Stop **kartaning ichidagi kichik underline link** bo'lib qoladi. Sen aytgan xato aynan shu: Stop yuborish tugmasining o'rnida bo'lishi kerak, har qanday ish paytida. |
| Navbat | Ish paytida yozsang — hech narsa bo'lmaydi (tugma o'chiq). Claude/ChatGPT'da xabar navbatga tushadi. |
| Xabar amallari | Yo'q: nusxalash, tahrirlab qayta yuborish, qayta urinish. Xato kartasida "Retry" yo'q. |
| Savol berish | Yo'q. Qisqa brief to'g'ridan-to'g'ri planerga ketadi. |
| Skroll | Har yangi xabarda pastga sakraydi — odam yuqorida o'qiyotgan bo'lsa ham. |
| Takliflar | Bor (`lib/suggestions.ts` chiplari), lekin quti tepasida statik turadi. |
| Biriktirma | Yo'q (Sleek'da rasm bor). |

Muhim arxitektura fakti: **agent xabarlari model tomonidan emas, kod tomonidan yoziladi** (`lib/agent-messages.ts`) — shuning uchun "thinking" deb model tokenlarini oqizib bo'lmaydi va kerak ham emas. Bizda uning o'rniga aniq **hodisalar oqimi** bor: `plan → screen_start → screen_delta → screen_image → screen_done / screen_error → done`, tahrirda `<affects>` va `<edit>` qismlari. Agent "o'ylayotgani"ni shu hodisalar bilan ko'rsatamiz — bu halol va deterministik.

## 2. Raqobatchilar nima qiladi

- **Claude / ChatGPT** (etalon odatlar): Stop tugmasi yuborish tugmasining o'zi; ish paytida yozilgan xabar navbatga tushadi; javob bo'laklar bilan oqadi; "reasoning" yig'iladigan blok; har xabarda copy / edit & resend / retry; Esc — to'xtatish; pastga skroll pillasi.
- **Cursor** (agent etaloni): javob emas, **qadamlar ro'yxati** oqadi ("Reading…", "Editing…", "Running…"), har qadam yig'iladi; tugagach o'zgargan fayllar ro'yxati va "Undo"; xatoda "Retry".
- **Lovable**: uch rejim (Chat / Plan / Build) quti yonidagi tanlagichda; Plan rejimida agent **savol beradi** ("questions tool"), reja alohida karta bo'lib chiqadi, **Approve / Skip** tugmalari, tasdiqlansa Build boshlanadi; har javob ostida "Credits used". ([Plan mode](https://docs.lovable.dev/features/plan-mode), [Chat mode & questions](https://lovable.dev/blog/chat-mode-and-questions))
- **Google Stitch**: agent kerak bo'lsa aniqlashtiruvchi savol beradi, dizayn tanqidi qiladi ("bu tugmaning kontrasti yetarli emas"), jonli yangilaydi; Thinking rejimi alohida. ([Stitch 2.0 sharhi](https://muratesmer.com/blog/google-stitch-review-2026/), [NxCode guide](https://www.nxcode.io/resources/news/google-stitch-complete-guide-vibe-design-2026))
- **Sleek**: oddiy chat — "What changes do you want to make?", rasm biriktirish, dumaloq yuborish tugmasi. Bizdan ancha oldinda emas; farq generatsiya paytidagi animatsiyada edi (LP-01…05 bilan yopilgan).

Xulosa: bozor standarti — **oddiy "so'rov → javob" emas, ko'rinadigan qadamlar, to'xtatish/navbat/qaytarish boshqaruvi va kerak bo'lganda savol.**

## 3. Reja

Tartib — foydalanuvchi eng ko'p his qiladigan narsadan boshlab.

### CHAT-01 · Stop yuborish tugmasining o'zida, har qanday ish paytida (0.25 kun)
`PromptBox` o'zining `busy` holatiga emas, route'dan keladigan bitta `running` manbaiga qaraydi: `working || planning || planRunning || checking`. Ish borida yuborish tugmasi Stop'ga aylanadi (to'rtburchak ikonka, aksent rangida, bosilsa to'xtaydi); `Esc` ham to'xtatadi; kartalar ichidagi underline "Stop" linklari yo'qoladi. Quti tepasidagi placeholder ham bir manbadan ("Designing your screens…").

### CHAT-02 · Jonli faoliyat kartasi — agent hozir nima qilyapti (0.75 kun)
Spinner o'rniga hodisalardan quriladigan qadamlar ro'yxati:
```
● Planning the app                          4s
● Drawing 6 screens
  ✓ Home · ✓ Search · ◐ Cart (photos)  · ○ Profile …
◐ Checking the screens
```
Har qadam: holat belgisi, nomi, o'tgan vaqt; ekran qatori bosilsa kanvas o'sha kadrga boradi. Tahrirda: "Editing 3 parts of Cart" va qismlar nomi (`<affects>` dan). Tugagach karta **yakuniy agent xabarining "Agent log"iga aylanadi** — ya'ni jonli ko'rinish va log bir xil ma'lumot, ikkita manba emas. Model tokeni ko'rsatilmaydi (arxitektura qoidasi).

### CHAT-03 · Navbat (0.25 kun)
Ish paytida yozilgan xabar "Queued" belgisi bilan qutining tepasida turadi (bekor qilish ✕ bilan), ish tugagach avtomatik yuboriladi. Server baribir bir vaqtda bittasini qabul qiladi (`guardGeneration`), demak navbat mijozda bo'lishi shart — hozir odam shunchaki kutib o'tiradi.

### CHAT-04 · Xabar amallari (0.5 kun)
Foydalanuvchi xabari ustida: **Edit & resend** (matn qutiga qaytadi), **Copy**. Agent xabari: **Retry** (o'sha so'rovni qayta yuboradi — regenerate yo'li orqali), **Copy**. Xato kartasi: katta **Retry** tugmasi (hozir faqat matn). Bo'sh qutida `↑` — oxirgi xabarni qaytaradi.

### CHAT-05 · Skroll odobi (0.25 kun)
Pastga faqat odam allaqachon pastda bo'lsa yopishadi; yuqorida o'qiyotgan bo'lsa **"↓ New activity"** pillasi chiqadi. Yangi agent xabari qisqa ta'kid bilan keladi.

### CHAT-06 · Natija kartasi (0.5 kun)
Tahrirdan keyin agent xabarida **oldin / keyin** juft eskizi (`EditPairService` va versiyalar allaqachon bor — faqat ko'rsatish kerak), "Undo" link emas, tugma. Takliflar chiplari qutining tepasida emas, **oxirgi agent xabarining ostida** — "endi nima?" savoliga javob sifatida.

### CHAT-07 · Qisqa briefga savol — modelsiz (0.5 kun)
"make habit tracker app" kabi qisqa brief (`screenCountAsked` yo'q, so'z kam, uslub so'zi yo'q) planerga ketishidan oldin chatda **bitta savol kartasi**: 3 ta yo'nalish chipi (masalan *Streaks & playful* · *Calm & minimal* · *Numbers & stats*) + "Skip". Tanlov briefga matn bo'lib qo'shiladi, art direction va dizayn tizimi tanloviga urug' beradi. **Nol token**, bir bosish, natija foydalanuvchiniki bo'lib qoladi. Lovable'ning "questions tool"ining arzon, deterministik versiyasi; model bilan savol berish keyinroq (`Keyin`).

### CHAT-08 · Rejani tasdiqlash darvozasi (0.5 kun)
Reja kelgach chizish avtomatik boshlanmaydi: `PlanCard`da ekranlar ro'yxati **tahrirlanadi** (nomini o'zgartirish, ekranni olib tashlash) va **Draw 6 screens / Change plan** tugmalari. Noto'g'ri reja bilan 6 ekran chizib tokenni kuydirmaymiz. Lovable'ning Approve/Skip'i. Sozlamada o'chirib qo'yish mumkin ("tasdiqlamasdan chiz").

**Jami ~3.5 kun.** CHAT-01…05 — mexanika, savolsiz kerak (2 kun). CHAT-06 — sayqal. CHAT-07 va CHAT-08 — mahsulot qarori (oqimga bitta qadam qo'shadi).

## 4. Qilinmaydi (hozir)

- **Model tokenlarini "thinking" deb oqizish** — xabarlar kodda yoziladi, bu qoida; hodisalar yetarli va halolroq.
- **Rasm biriktirish** ("shunga o'xshatib qil") — DeepSeek Flash'da vision yo'q; vision model qo'shilsa `Keyin`.
- **Ovozli kanvas** (Stitch) — hozir emas.
- **Chat / Plan / Build rejim tanlagichi** — bizda tahrir va reja allaqachon alohida yo'llar; CHAT-08 darvozasi shu ehtiyojni yopadi, uchinchi rejim kerak emas.
- **Kredit ko'rsatkichi har xabarda** — B4 (pul ishlash) fazasida limitlar bilan birga.

## 5. Sendan kerak

1. CHAT-01…05 `MVP`ga (tavsiya: ha, 2 kun).
2. CHAT-07 (qisqa briefga 3 chipli savol) va CHAT-08 (rejani tasdiqlash) — oqimga qadam qo'shadi. Tavsiya: **CHAT-08 ha** (tokenni tejaydi, xato rejani oldini oladi), **CHAT-07** sinovdan keyin.

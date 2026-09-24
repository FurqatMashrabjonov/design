# Pastki navigatsiya (island) va ui-skills tahlili

> Yozilgan: 2026-09-23. Ikki manba: (1) Sleek'da generatsiya qilingan 5 ta ilova ekranlari, (2) [ui-skills.com](https://www.ui-skills.com/) — AI agentlar uchun UI skill'lari katalogi.

## 1. Pastki panel: bizda 2019, ularda 2026

### 1.1 Sleek nima chiqaryapti (5 ta namunadan)

| Ilova | Panel | Faol holat |
|---|---|---|
| Ember Fitness | Oq **suzuvchi orol**, to'liq pill radius, yumshoq soya, chetdan ~16px, 3 ta tab, ikonka + KICHIK KATTA HARF yorliq | Ikonka va yorliq ortida **aksent rangli pill** |
| Weather (kawaii) | Oq orol, radius ~28px, 4 ta tab | Ikonka ortida **rangli doira** + rangli yorliq |
| Recipes | **Tor, markazlashgan** yarim shaffof pill (blur), 4 ta ikonka, yorliqsiz | Faqat ikonka rangi |
| Expense (mono) | **Qora pill**, markazda ko'tarilgan oq FAB (+), yorliqsiz | Oq ikonka |
| Meditation (dark) | Qora orol, 5 ta ikonka | Ikonka ostida **nuqta** |

Umumiy shartnoma: **chetdan 12–16px ichkarida turadi, pastdan 12–20px (+ safe-area), radius 24px dan pill gacha, soya bor, fon ba'zan yarim shaffof + blur, faol tab rang bilan emas — pill / doira / nuqta bilan belgilanadi.**

### 1.2 Bizda

`ShellService.buildBottomNav` bitta shakl chiqaradi va boshqasi yo'q:

```
position:fixed; left:0; right:0; bottom:0; height:64px;
background:var(--surface); border-top:1px solid var(--border)
```

Ya'ni chetdan chetga, burchaksiz, soyasiz, tepasida chiziq — iOS 12 ko'rinishi. Har bir generatsiya qilingan ilovada **aynan shu**. Bu bitta joyda tuzatiladigan, lekin har bir ekranga ta'sir qiladigan eng arzon sifat yutug'i: pastki panel har ekranda ko'rinadi, demak butun ilovaning "yili" shu bir elementdan o'qiladi.

### 1.3 Reja — NAV-01…04

**NAV-01 · Panel variantlari (0.5 kun).** `buildBottomNav` variantlar bilan:
- `island` (standart): `left:12px;right:12px;bottom:12px;border-radius:28px;box-shadow:0 8px 24px -12px rgba(0,0,0,.35),0 1px 2px rgba(0,0,0,.06)`, chegara o'rniga soya, `padding-bottom` ichida safe-area.
- `pill`: tor va markazlashgan (`left:50%;transform:translateX(-50%)`), faqat ikonkalar, yarim shaffof `color-mix` + `backdrop-filter:blur(12px)`.
- `contrast`: to'q panel (qora/`--fg` aralashmasi), oq ikonkalar — ochiq rangli ilovalar uchun kuchli qarama-qarshilik.
- `bar`: hozirgi chetdan-chetga shakl, faqat "tizim" ko'rinishidagi ilovalar uchun qoladi.

Variant **kodda tanlanadi**, model tanlamaydi: `BlueprintService.variant` dagi FNV-1a urug'i bilan (ilova nomi), lekin dizayn tizimi chekloviga bo'ysunadi (to'q tizim `contrast` olmaydi, glassmorphism `pill` ga moyil). Shunda bitta ilova izchil, turli ilovalar turlicha.

**NAV-02 · Faol holat (0.25 kun).** Rangni almashtirish o'rniga: `island`/`bar` da ikonka+yorliq ortida aksentning 12% aralashmasi bilan pill; `pill`/`contrast` da ikonka ostida 4px nuqta. Yorliqsiz variantda `aria-label` majburiy (hozir ham bor).

**NAV-03 · Tagida bo'sh joy va o'lchovlar (0.25 kun).** `NAV_CLEARANCE` endi doimiy emas, variantdan kelib chiqadi (orol pastdan 12px ko'tarilgani uchun ko'proq joy kerak: 64 + 12 + 24 ≈ 100px). `ScreenContext` promptiga shu son boradi, `screen-normalizer` ham shu sonni qo'yadi, `frame-height` o'zgarmaydi.

**NAV-04 · O'lchov (0.25 kun).** `eval/metrics.ts` ga `shell.navStyle` (variantlar taqsimoti) va `shell.navOverlap` (panel ostida matn qolib ketganmi — render audit'dagi `overlap` bilan) qo'shiladi. Bu generatsiya o'zgarishi, shuning uchun eval bilan baholanadi (4 brief kifoya: bar → island farqi ko'zga tashlanadi).

**Jami ~1.25 kun.** Bitta fayl (`ShellService`) va uning ikki mijozi o'zgaradi; promptga bitta ham yangi qoida qo'shilmaydi — arxitektura qoidamiz shuni talab qiladi ("izchillik kod bilan, prompt bilan emas").

## 2. ui-skills.com — nima bor va bizga nima beradi

Sayt — **agentlar uchun UI skill'lari katalogi** (`npx ui-skills`, MCP server ham bor). Uch qism: **Skills** (19 ta), **Design.md** (Vercel, Atlassian, Clerk, Ant Design, Nuxt, Firecrawl… kompaniyalarning dizayn hujjatlari), **Playbook/Learn** (qisqa, aniq qoidalar).

### 2.1 Generatsiya uchun olinadigan aniq qoidalar

`anthropics/frontend-design` (eng yaqini — bizning `craft/mobile.md` bilan bir ishni qiladi):
- 1–2 shrift oilasi, ikkitasi bo'lsa aniq farqli; satr uzunligi 80 belgidan kam.
- **4–6 ta nomlangan rang** — ochiq palitra emas.
- "Generik AI estetikasi" belgilari: bir xil yumaloq kartalar to'plami, har sarlavha ustida **tracked-out CAPS eyebrow**, o'rta nuqtali meta qatorlar, monospace yorliqlar, har bo'limda fade-and-slide animatsiya.
- **Diqqat: "issiq krem (#F4F1EA) + terracotta (#D97757)" aynan "AI default" deb nomlangan.** Bizning yangi studio palitramiz issiq krem, lekin aksenti yashil — shunga qaramay generatsiya qilingan ekranlarda bu juftlikdan qochish kerak (bizning `art-direction` va dizayn tizimlari buni allaqachon boshqaradi, lekin linterga belgi qo'shsa bo'ladi).
- Harakat: bitta uyushgan sahifa-yuklash ketma-ketligi, har bo'limga sochilgan effekt emas.

`jakubkrehel/better-ui` — sonlari bor, bizning `autofixScreen` va `craft/mobile.md` ga to'g'ri tushadi:
- **Konsentrik radius**: ichki radius = tashqi radius − padding.
- Bosilganda **`scale(0.96)`** (0.95 va pastini ishlatma).
- Tez-tez bo'ladigan o'zaro ta'sirlarda **≤150ms** (opacity/color).
- Kirish animatsiyalarida semantik bloklar orasida **~100ms stagger**, `ease-out`.
- Rasm ustida **1px past shaffoflikdagi outline** (`oklch(0 0 0 /.1)` light, `oklch(1 0 0 /.1)` dark) — bizning rasm slotlariga bevosita mos.
- Ikonka chizig'i matn og'irligiga bog'liq: 400 → 1.5px, 600 → 2px.

`Playbook` (bizning `lib/hig-rules.ts` bilan bir tilda):
- 44px teginish maydoni (bizda bor), ko'rinadigan fokus halqasi (bizda yo'q!).
- `aspect-ratio` bilan layout sakrashining oldini olish (bizda bor).
- Raqamlarga **`tabular-nums`** (bizda yo'q — narx, statistika, vaqt ustunlari uchun aynan kerak).
- Sarlavhaga `text-balance`, matnga `text-pretty` (bizda yo'q, bitta CSS qatori).
- **Bitta ko'rinishda bitta aksent rang** (linter qoidasi bo'la oladi).
- UI yorliqlari **sentence case** (bizning CAPS eyebrow'larimizga qarshi — yuqoridagi "AI tell" bilan bir xil gap).
- Modal orqa foni blur emas, qattiq rang (ishlash uchun).

### 2.2 Reja — CRAFT-01…03

**CRAFT-01 · Deterministik qoidalar `autofixScreen` ga (0.5 kun).** Prompt emas, kod: raqamli ustunlarga `font-variant-numeric:tabular-nums`, `h1..h3` ga `text-wrap:balance`, uzun paragraflarga `text-pretty`, rasm slotlariga 1px outline, bosish holati uchun `:active{transform:scale(.96)}` (faqat tugmalarga, `prefers-reduced-motion` bilan), fokus halqasi. Har biri bitta to'g'ri javobi bor tuzatish — qoidamiz bo'yicha aynan shu yerga tegishli.

**CRAFT-02 · `craft/mobile.md` ni almashtirish (0.25 kun).** Fayl 150 qatordan oshmaydi, shuning uchun **zaif qoidalar chiqadi, kuchlilari kiradi**: konsentrik radius, 1–2 shrift, 4–6 rang, "CAPS eyebrow va monospace meta qatorlaridan qochish", bitta ko'rinish — bitta aksent, sentence case. Kelgan har bir qoida — qaror + sababi.

**CRAFT-03 · Linterga "generik AI" hisoblagichlari (0.25 kun).** `eval/metrics.ts`: `tells.capsEyebrow`, `tells.uniformCards`, `tells.middleDotMeta`, `tells.creamTerracotta`. Avval o'lchaymiz, keyin tuzatamiz — bu bizning odatimiz ("har nosozlikka avval hisoblagich").

## 3. Saytimiz uchun (marketing, hozir emas)

- **Design.md** bo'limi — kompaniyalar o'z dizayn hujjatini ochiq qo'yadi. Bizda har dizayn tizimining `DESIGN.md`/`STYLE.md` si bor; ularni ommaviy galereya qilib chiqarish SEO va ishonch beradi ("33 ta tizim, har birining qoidalari ochiq").
- **Playbook/Learn** formati — bitta qoida, bitta kod misoli, bitta sahifa. Bizning `lib/hig-rules.ts` va linter qoidalari aynan shunday kontentga aylanadi va har biri mahsulotga havola beradi.
- **Skill sifatida chiqish**: ui-skills katalogi GitHub'dagi jamoat skill'larini qabul qiladi. "Design AI" skill'i (bizning blueprint + shell shartnomasi) — tarqatish kanali, Claude Code / Cursor foydalanuvchilari orqali. Sleek'da ham aynan shu bor ("Use Agent Skill", "Copy AI Prompt").

## 4. Qaror kerak

1. NAV-01…04 — `MVP` ga olamizmi? (Tavsiya: ha, 1.25 kun, har ekranga ta'sir qiladi.)
2. CRAFT-01…03 — `MVP` ga olamizmi? (Tavsiya: CRAFT-01 va CRAFT-03 ha; CRAFT-02 promptni qayta yozish, eval bilan tekshiriladi.)
3. Saytdagi Design.md/Playbook bo'limlari va ui-skills'ga skill chiqarish — `Keyin` (marketing fazasi).

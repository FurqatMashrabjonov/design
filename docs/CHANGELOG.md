# Changelog

Newest first. One entry per completed change: what changed, files touched, how it was verified.
Entries before 2026-09-19 were backfilled from git history and have no verification notes.

## 2026-09-24

### Kredit daftari (BIL-04)

Kreditlar foydalanuvchida saqlanadigan son emas, **daftar**. Har bir harakat — berish, band
qilish, qaytarish, sotib olish — butun sonli `delta`'ga ega bitta qator. Balans = qatorlar
yig'indisi, shuning uchun uni har doim tushuntirish mumkin va u hech qachon "suzib" ketmaydi.
- `credit_ledger` jadvali (migratsiya 0022) va `Credit` modeli: `balance`, `add`, `ofAction`,
  `history`.
- **`ref` unikal.** To'lov hodisasi yoki ro'yxatdan o'tish kabi tashqi sabab ikki marta kelsa ham
  kredit bir marta beriladi (BIL-10 webhook'i shunga tayanadi).
- **Admin:**
  - Foydalanuvchi sahifasida kredit balansi, qo'lda berish yoki olish (sababi bilan,
    `admin_actions` jurnaliga yoziladi) va harakatlar tarixi.
  - Foydalanuvchilar jadvalida 👍/👎 o'rniga "Credits" ustuni.

Fayllar: `migrations/0022_create_credit_ledger.ts`, `migrate.ts`, `schema.ts`,
`app/Models/Credit.ts`, `AdminController.ts`, `admin-fns.ts`, `AdminStatsService.ts`,
`admin.users.index.tsx`, `admin.users.$userId.tsx`, `controllers.check.ts`, CLAUDE.md.

Tekshiruv: `npm run check`, `npx tsc --noEmit` toza. Testlar: balans = yig'indi, bir xil `ref`
ikkinchi marta yozilmaydi, amal bo'yicha netto, kasr son rad etiladi, admin berishi jurnalda.
Brauzerda: "1.5" rad etildi (xabar chiqdi), "+1000 · founder testing" yozildi, balans va tarix
yangilandi.

### Aniq xarajat: har chaqiruvda model, narx jadvali model bo'yicha (LLM-05)

Kreditlar haqiqiy xarajatga qarab narxlanadi, shuning uchun har chaqiruv o'zi nimaga tushganini
biladi:
- **`PRICES` model bo'yicha** (DeepSeek Flash, Gemini 3.1 Flash-Lite, Gemini 2.5 Flash,
  Claude Haiku 4.5, Claude Sonnet 5; ro'yxat narxlari 2026-09-24). DeepSeek'ning band soati
  (2×) faqat DeepSeek'ga qo'llanadi. Claude'ning keshga yozishi o'z narxida hisoblanadi.
- **Narxi yo'q model rad etiladi**: `costOf` xato beradi, uni tekin deb hisoblamaydi.
  `DEEPSEEK_MODEL` narxlanmaydigan bo'lsa, server umuman ishga tushmaydi — pulli chaqiruvdan
  keyin emas, oldin to'xtaydi.
- **`llm_calls`** jadvaliga yangi ustunlar: `model`, `cache_write_tokens`, `action_id`.
  Migratsiya 0021 eski qatorlarni to'ldiradi (174 ta `deepseek-flash`, 19 ta `claude-cli`).
- **Bitta himoyalangan so'rov = bitta amal.** `guardGeneration` amal id'sini yaratadi, amal ichidagi
  har bir chaqiruv shu id bilan yoziladi. `UsageService.actionCost(id)` amalning haqiqiy $
  xarajatini beradi — kredit daftari (BIL-04) shunga qarab hisoblaydi.
- Admin Generations'da "Provider" ustuni o'rniga "Model".

Fayllar: `LlmService.ts`, `UsageService.ts`, `server/guard.ts`, `database/schema.ts`,
`migrations/0021_add_llm_call_model.ts`, `migrate.ts`, `AdminStatsService.ts`,
`admin.generations.tsx`, testlar (`new-features.check.ts`, `controllers.check.ts`), CLAUDE.md.

Tekshiruv: `npm run check`, `npx tsc --noEmit` toza. Testlar tekshiradi: har model narxining
arifmetikasi, band soat faqat DeepSeek'da, keshga yozish narxi, noma'lum model rad etilishi,
chaqiruvning `model` va `action_id`'si, `actionCost` yig'indisi. Real bazada migratsiya ishladi.
Brauzerda real tahrir (PennyWise → Home): chaqiruv `deepseek-flash`, o'z `action_id`'si,
$0.0031 bilan yozildi; admin'da Model ustuni ko'rinadi.

### Admin panel minimal: 4 bo'lim (ADM-09)

Pul bosqichidan oldin admin kerakli narsaga qisqartirildi. **6 bo'lim → 4:** Overview, Users,
Generations, Settings (Controls endi Settings deb ataladi).

Olib tashlandi:
- **Feedback sahifasi** va "Export edit pairs" tugmasi. Ular MVP'dan keyingi FB-qatorlariga
  xizmat qilardi; 👍/👎 ma'lumoti bazada qoladi, juftliklarni `eval/export-pairs.ts` chiqaradi.
- **Loyihalar ro'yxati**. Loyiha sahifasi qoldi: unga foydalanuvchi, generatsiya va xato
  sahifalaridan kiriladi, "orqaga" havolasi endi egasining sahifasiga olib boradi.
- **Overview**: 8 ta KPI → 4 ta (yangi foydalanuvchi, faol foydalanuvchi, ekranlar, LLM xarajati).
  Xato ulushi "Right now" paneliga ko'chdi; chaqiruvlar grafigi olib tashlandi.
- **Generations**: provayder filtri va dizayn tizimi / arxetip bo'yicha feedback jadvallari.
- Server tomonda endi ko'rsatilmaydigan so'rovlar: `projects()`, `feedback()`, `bySystem`,
  `byArchetype`, feedback KPI'lari, chaqiruvlar seriyasi.

Keyin qo'shiladi: kredit balansi va kredit berish (BIL-04), model tanlovi (LLM-07).

Fayllar: `src/routes/admin*.tsx` (feedback va projects.index o'chirildi, controls → settings),
`src/server/admin-fns.ts`, `AdminController.ts`, `AdminStatsService.ts`.

Tekshiruv: `npm run check`, `npx tsc --noEmit` toza. Brauzerda: 4 bo'lim, Overview, "Only errors"
filtri, loyiha sahifasi va egasiga qaytish havolasi, Settings; eski `/admin/feedback` 404 beradi.

### Sticker hero raqam ustiga tushmaydi (GQ-37)

Real mahsulot sinovida (PennyWise) sticker `$9,540.40` ustiga tushgan edi. Ikki naqsh topildi:
figura bilan bir flex-qatorda (figura `nowrap`, 64px sticker joyini yeydi va figura uning ostiga
toshadi) yoki `position:absolute` bilan figura qatorining burchagida. Ikkalasining ildizi bitta:
GQ-31 figura o'lchamini **to'liq kenglik** uchun hisoblaydi, sticker esa shu qatordan joy oladi.

Tuzatish kirishda (arxitektura qoidasi: kod qayta joylashtirmaydi): blueprint'ning HERO MOMENT
jumlasi endi stickerni label qatoriga yoki figuradan yuqoridagi alohida qatorga qo'yadi, "hech qachon
figura qatorida va uning ustida emas", sababi bilan.

Fayllar: `src/app/Services/BlueprintService.ts`.

Tekshiruv: bir martalik brauzer o'lchovi (390px iframe, sticker va eng katta raqamli matnning
to'rtburchaklari). Oldingi 5 run: sticker'li 29 ekrandan **13 tasi figura qatorida**, 2 tasi
figuraga tegadi. Tuzatishdan keyin graphite3 + lumen3: **0/6**, tegish 0. Audit cleanShare
graphite 0.667 → 0.75, lumen 0.65 → 0.579 — lumen'dagi yangi overflow'lar gorizontal
scroller va detal qatorlarida, sticker yoki hero bilan bog'liq emas (±0.2 variance).
`npm run check`, `npx tsc --noEmit` toza.

### Misollar va landing — 5 ta telefon tizimi (GQ-36)

Dashboard'dagi "Need a start?" va landing hali eski brend tizimlarini (Nike, Stripe, Midnight...)
ko'rsatardi — mahsulot endi ularni avtomatik tanlamaydi, ya'ni vitrina va'da qilgan narsani odam
olmasdi. Endi beshta misol, har biri o'z tizimida bitta promptdan chiqqan haqiqiy ekranlar:
Stride (Volt), Ripple (Ember), Nestaway (Lumen), Plum Ledger (Graphite), Folio (Nova). Muqovalar
audit toza ekranlardan tanlandi (sticker/legend ustma-ust tushgan, nav matnni yopgan ekranlar
chetda qoldi). Misol bosilsa prompt to'ladi va loyiha o'sha tizim bilan yaratiladi.

Yo'l-yo'lakay: misol kartasi `<button>` bo'lgani uchun bir qatorli tavsif kontentni vertikal
markazlab rasmni pastga surardi — `flex flex-col`. Landing'dagi ikki eskirgan jumla: "33 systems"
(son eskirgan) va "Pick a design system" (composer'da picker yo'q, DS-01).

Fayllar: `src/Landing.tsx` (SETS, hero va coherence qatori SETS'dan), `src/Dashboard.tsx`,
`public/showcase/*` (eski 24 fayl o'chirildi, 23 yangi, 940K).

Tekshiruv: `npm run check` (figma fixture'lari yangi showcase'da: 100%), `npx tsc --noEmit` toza;
brauzerda dashboard — 5 karta, "Expense tracker" bosilganda prompt to'ldi va `graphite` tanlandi;
landing cookie'siz headless Chrome'da — hero, coherence va 5 tab yangi ekranlarni ko'rsatadi.

### Tozalash: o'lik kod, takrorlar, desktop yo'li va o'ylab topilgan palitra (CLN-01)

Kun bo'yi ko'p narsa qo'shildi, shuning uchun kod DRY / KISS / YAGNI bo'yicha ko'rib chiqildi. Har bir
o'chirish dalil bilan: import grafi, chaqiruvchilar ro'yxati, va 38 ta tizimning mobil system prompti
bosqichma-bosqich **bayt-bayt taqqoslandi** — to'rt bosqichning hammasidan keyin o'zgargan prompt: **0**.

**Jami: 68 fayl, −3487 / +89 qator. Kod (ts/tsx): sof −1404 qator. Prompt matni: −1994 qator.**

**1. O'lik kod.** `CritiqueService` (hech kim import qilmasdi); 4 ta ishlatilmagan shadcn komponenti;
`fixFindings`/`auto` avtomatik tuzatish yo'li (hech bir klient yubormasdi) va uni o'lchagan
`eval/fix-audit.ts`; **kanvasdagi har bir iframe ichida ishlagan render audit** — `onAudit` ni hech bir
ota-komponent bermasdi, ya'ni har ekran to'liq DOM auditini ishga tushirib natijani hech kim
tinglamaydigan joyga yuborardi. Audit endi faqat eval'da (headless, `AUDIT_SOURCE`).

**2. DRY.** FNV-1a hash **6 nusxada** edi → `lib/hash.ts`. Rang matematikasi (luminance, toRgb)
DesignSystemService va theme-override'da takrorlangan edi → `lib/color.ts`. `render-audit` o'z
nusxasini saqlaydi — u iframe ichida matn sifatida ishlaydi va import qila olmaydi.

**3. Desktop yo'li (YAGNI).** Har bir loyiha `device: 'mobile'` bilan yaratiladi, lekin kodda desktop
promtining butun yo'li turardi: 11 ta web skill, 10 ta uzun craft essesi, `DESIGN.md` ni promptga
berish, sidebar shartnomasi, `SkillService` (ro'yxati dashboard'ga yuborilardi, klient o'qimasdi).
Endi bitta skill (`mobile-screen`), bitta shell yo'li.

**4. O'ylab topilgan palitra (GQ-10, GQ-26) — butunlay.** GQ-33 dan beri sukut bo'yicha o'chiq edi,
lekin planner har rejada modeldan palitra va ottenka yo'nalishini **hali ham so'rardi** va javobni
tashlab yuborardi. `lib/palette.ts` (388 qator), `palette.check.ts`, `hueDirection`, planner
promptining 6-qoidasi, `readTokensRootFor`, `Project.savePalette` olib tashlandi. Bazadagi `palette`
ustuni qoladi (SQLite'da ustun o'chirish murakkab), lekin endi o'qilmaydi — eski loyihalar o'z
tizimining ranglarida chiziladi.

**5. `matchSystem`** endi faqat telefon uchun yozilgan tizimlarni (manifestda `category: "Mobile"`)
solishtiradi: pushti → Ember, qora+lime → Volt, ko'k yorug' → Lumen, krem+terrakota → Nova. Avval
rasm veb-brend paketiga tushishi mumkin edi.

**6. Hujjatlar.** 12 ta tugagan reja `docs/archive/` ga. CLAUDE.md'dagi desktop, craft esselari,
kanvas auditi va palitra haqidagi eskirgan qoidalar yangilandi.

**Tekshiruv va muhim yon topilma.** Planner prompti o'zgargani uchun Volt'ning uchta briefi qayta
yurgizildi: **0.524**. Oldin 0.81 edi, shuning uchun o'sha kod bilan yana yurgizildi: **0.750**.
Rejalar deyarli bir xil (arxetiplar to'plami bir xil, bo'limlar 4.1 va 4.2). Xulosa: regressiya yo'q,
lekin **21 ekranlik bitta eval ±0.2 tebranadi**. Bugungi tizimlararo taqqoslashlar (Nova 0.70,
Lumen 0.65, Graphite 0.667, Ember 0.571, Volt 0.81) asosan shu shovqin ichida — tartiblash uchun har
tizimga kamida 2–3 yugurish kerak.

Tekshirildi: `npm run check` va `npx tsc --noEmit` toza; mobil promptlar 4 bosqichdan keyin ham
o'zgarmagan; ikkita eval.


### Volt — qora sport tizimi (GQ-35)

Sleek galereyasidagi ~42 presetni oilalarga ajratganda eng katta javobsiz oila shu chiqdi: 7 ta
preset (Neon Running, Neon Strength, Neon Sneaker, Neon Nightlife, Pulse Performance…) — qora fon,
bitta electric-lime aksent, qisiq qalin qiya bosh harfli sarlavhalar.

Volt: qora pog'onali yuzalar (Graphite'dagi kabi — qora ustida soya ko'rinmaydi), lime **fon**
sifatida — start kartasi, asosiy tugma, faol tab, bitta ajratilgan ustun — ustida qora matn (17:1).
Sarlavhalar Barlow Condensed 800, qiya va bosh harflar bilan, ekran avval plakat bo'lib o'qiladi.
Graphite tinch asbob, Volt ataylab baland — lekin bir vaqtda faqat ikki joyda. Panel chetdan
chetga qotirilgan.

Uslub kartasida "volt" so'zi rang nomi sifatida uchragan edi va brend-sizish testi uni ushladi;
kartada rang "electric lime" deb ataladi.

Uchta brief (yugurish, kuch, krossovka do'koni): **`cleanShare 0.81`** — beshta tizim ichida eng
yuqori. `capsEyebrow: 5` — model sport uslubida kichik yorliqlarni ham bosh harf bilan yozgan.
Foydalanuvchi bahosi: "volt is fantastic".

Avtomatik tanlov: fitness → volt, ember, graphite; media → volt, graphite, lumen; commerce'ga
qo'shildi.

Tegilgan fayllar: `design-systems/volt/*` (yangi), `src/app/Services/ShellService.ts`,
`src/app/Services/DesignSystemService.ts`, `src/app/Services/new-features.check.ts`,
`eval/briefs-volt3.json`.
Tekshirildi: `npm run check` va `npx tsc --noEmit` toza; uchta brief 390px'da ko'z bilan.


### Ember — soft tonal tizimi; o'ylab topilgan palitra endi ixtiyoriy (GQ-33, GQ-34)

**GQ-33 — eng muhimi.** Real ilovada (dashboard → auto) planner o'ylab topgan palitra hali ham
tizimning o'z ranglari ustiga yozilardi. Foydalanuvchiga ko'rsatilgan Nova/Lumen/Graphite
taqqoslashlari eval orqali qilingan edi — eval `designSystemAuto` ni yoqmaydi, shuning uchun u yerda
palitra ishlamasdi. Ya'ni **mahsulot foydalanuvchi tasdiqlagan narsani ko'rsatmayotgan edi**: real
foydalanuvchi Nova o'rniga o'sha 60% to'yingan teal siyohni olardi. "Palitra bayroq ortiga"
kelishilgan edi, men bajarmagan ekanman. Endi `OD_INVENT_PALETTE=1` bilan yoqiladi, sukut bo'yicha
o'chiq.

**GQ-34 — Ember.** Sleek'dagi "Ember Fitness" presetidan olingan to'rtinchi mobil tizim: bitta
yumshoq marjon va uning tuslari **yuza** sifatida (qahramon karta, ustunlar, faollik to'ri),
neytral siyoh, bitta og'ir geometrik sans (Manrope, raqamlar 800), katta yumshoq burchaklar,
chegarasiz kartalar, suzuvchi panel. Nova aksentni "taqinchoq" qilib ishlatadi (8–12%), Ember u
bilan quradi (20–30%).

Asosiy qaror: **marjon ustida matn to'q, oq emas.** Asl dizayndagi oq matn marjon ustida 2.67:1 —
katta shrift uchun ham AA'dan past. Oq o'tishi uchun marjonni `#ca4821` gacha to'qlashtirish kerak,
bu esa Nova'ning terrakotasi. Rang — identitet, matn rangi esa unga bo'ysunadi (6.81:1).

Yo'l-yo'lakay EYE-06 dagi "brend rangi matn sifatida → o'lchangan token" almashtirishida ikki teshik
topildi va yopildi: u faqat `<style>` bloklarini ko'rardi (inline `style="…"` ni emas — 10 ta) va
faqat `var(--accent)` ni ushlardi (`--accent-active`/`--accent-hover` ni emas — 9 ta). Shell'ning
faol tab yozuvi ham xom aksent edi — manbada o'lchangan tokenga o'tkazildi (faqat yozuv; nuqta fon
bo'lib qoladi).

Uchta brief (habit, fitness, food): `cleanShare 0.524`, tuzatishlardan keyin saqlangan ekranlarda
generatsiyasiz qayta o'lchov `0.571`, low-contrast 5 → 3. **Ochiq:** 7 ta overlap — model kichik
plitkada yorliq va raqamni yonma-yon qo'yadi; bu joylashuv xatosi, kirishda tuzatiladi. 16
stickerdan 9 tasi `fire`.

Tegilgan fayllar: `design-systems/ember/*` (yangi), `src/app/Http/Controllers/PlanController.ts`,
`src/app/Services/ShellService.ts`, `src/app/Services/DesignSystemService.ts`,
`src/lib/design-lint.ts`, `src/app/Services/new-features.check.ts`,
`src/app/Services/services.check.ts`, `src/app/Http/Controllers/controllers.check.ts`,
`eval/briefs-ember3.json`.
Tekshirildi: `npm run check` va `npx tsc --noEmit` toza; uchta brief 390px'da ko'z bilan.


### Graphite, va avtomatik tanlov telefon uchun yozilgan tizimlarga o'tdi (GQ-32)

Uchinchi mobil tizim va ataylab boshqa registr. Nova iliq, Lumen yorug' va shaffof — **Graphite
asbob**: to'q neytral pog'onali yuzalar, soya o'rniga nozik chiziq, zich shkala, raqamlar mono
yuzda, bitta amber signal.

Nega soya emas: to'q fonda drop shadow ko'rinmaydi, shuning uchun yorug' tizimning to'q portlari
yassi chiqadi. Bu yerda chuqurlik **yuza pog'onasi + bir piksellik yorug' chekka** dan keladi.
Panel ham boshqacha qotirilgan — Lumen suzadi, Graphite yopishadi: asbob o'z chrome'ini kiyadi.

**Avtomatik tanlov endi ruletka emas.** `BY_APP_TYPE` faqat telefon uchun yozilgan uchta tizimni
taklif qiladi; 31 ta brend paketi chiqarildi — ular veb-sayt uchun yozilgan va buni ko'rsatib
turibdi. Har turga 2–3 nomzod qoldi, ya'ni bir turdagi ikki loyiha hamon farq qiladi.

Brend tizimlari yo'qolmadi, lekin ularga yetish yo'li o'zgardi: `namedSystem` brief brendni **aniq
taqqoslash** bilan atasa ishlaydi — `like Notion`, `Airbnb-style`, `inspired by Stripe`. Shunchaki
eslatish hisoblanmaydi, aks holda "track my apple intake" Apple tizimini olardi. Avvalgi izohimda
"brend nomi STYLE_WORDS orqali ishlaydi" deb yozgandim — bu **noto'g'ri** edi, `STYLE_WORDS` da
faqat uslub sifatlari bor; da'voni to'g'ri qilish o'rniga uni haqiqatga aylantirdim.

Eski `reachable.size >= 20` testi ("avtomatik tanlov katalogning ko'pini qamrasin") aynan tashlab
yuborilgan strategiyani kodlab qo'ygan edi. Almashtirildi: avtomatik tanlov **faqat** telefon uchun
yozilgan tizimlarni taklif qilishi, har turda kamida ikkitasi bo'lishi, va brend nomi faqat
taqqoslash bilan ishlashi tekshiriladi.

**Yo'l-yo'lakay bizning xatomiz:** donut halqaning 4 ta overlap topilmasi — `lib/charts.ts`
legendani **o'zi chizadi**, model esa yana bittasini yozgan, chunki prompt buni aytmagan edi.
Arxitektura qoidamiz: *prompt modelga kod qo'yadigan narsani chizmaslikni aytadi.* Tuzatildi.

Uchta brief Graphite'da: `audit cleanShare 0.667`, kit 20/20 ekranda, blok/ekran 6.17, 1 xato.

Tegilgan fayllar: `design-systems/graphite/*` (yangi), `src/app/Services/DesignSystemService.ts`,
`src/app/Services/ShellService.ts`, `src/app/Services/PromptComposer.ts`,
`src/app/Services/new-features.check.ts`, `src/app/Http/Controllers/controllers.check.ts`,
`eval/briefs-graphite3.json`.
Tekshirildi: `npm run check` va `npx tsc --noEmit` toza; uchta brief yugurtirilib 390px'da
ko'z bilan solishtirildi.


### Lumen — iOS 26 tizimi, va chrome nega tizimga bo'ysunmagani (GQ-29, GQ-31)

Foydalanuvchi so'radi: Nova'ga o'xshagan, o'z qoidalariga ega, 2026 uchun premium tizim yana bormi.
Katalogni o'lchadim: **32 tizimdan 31 tasi "Bundled OpenDesign package"** — veb-brend skinlari
(Nike, Airbnb, Stripe…), qoidalari sayt uchun yozilgan. Kategoriyasi `Mobile` bo'lgan yagona tizim —
Nova. Ya'ni bizga yana brend emas, yana **mobil yo'nalish** kerak edi.

Research (manbalar `docs/`da emas, chat tarixida): 2026 uchun uchta haqiqiy yo'nalish — Apple'ning
**Liquid Glass** (2026-sentyabrdan barcha iOS ilovalar uchun majburiy), **quiet luxury / calm tonal**,
va **engineered dark**. Birinchisi eng asoslisi, shuning uchun u yozildi.

**Lumen** (`design-systems/lumen/`): noshaffof tinch kontent qatlami ostida suzuvchi shisha boshqaruv
qatlami. Shisha shisha ustiga qo'yilmaydi. Burchaklar konsentrik. Nova'dan ataylab farq qiladi —
sovuq yorug' neytrallar, **bitta** shrift (qahramon = vazn + tracking, ikkinchi yuz emas), blur 28px
+ saturate 180%. Siyoh shkalasi qo'lda 9% to'yinganlikda yozildi, hosiladan olinmadi: hosila
yorug'lik oshgani sari to'yinganlikni saqlab qoladi va `--muted` ni 24% ga chiqaradi.

**Birinchi sinov muvaffaqiyatsiz chiqdi va sababi qimmatli edi.** 20 ekrandan 20 tasida
`backdrop-filter` bor edi, lekin foydalanuvchi "nega Liquid Glass ishlatmading" deb so'radi — va haq
edi. Ikki sabab:

1. **Panelni model emas, `ShellService` quradi, va u tizimni o'qimaydi.** Lumen `BY_SYSTEM` jadvalida
   yo'q edi, shuning uchun `fintech → utility → bar` tushdi. `bar` esa noshaffof, to'liq kenglikda,
   chetga yopishgan — ya'ni aynan Lumen'ning o'z uslub kartasi taqiqlagan narsa. **Tizimning eng
   tanilgan elementi hech qachon chizilmadi.**
2. **Oq ustida blur — oq.** `backdrop-filter` faqat ostida rangli narsa o'tsa ko'rinadi.

Tuzatish ikkalasi ham kodda, chunki chrome kodniki:
- `PINNED_BY_SYSTEM` — o'zligi chrome'da bo'lgan tizim shaklni qotiradi. Lumen doim `island`.
  Ruletka tizimni tashlab yuborish bilan teng edi.
- `--od-nav-tint` — panel yuzadan qanchasini saqlashi endi tizim tokeni (avval hamma uchun qat'iy
  78%, ya'ni deyarli noshaffof). Lumen 56% qo'yadi. Hech narsa ko'rinmaydigan shisha — yumaloq
  to'rtburchak.

| | oldin | keyin |
|---|---|---|
| audit cleanShare | 0.45 | **0.65** |
| overflow | 13 | **2** |
| panel shakli | `bar` (noshaffof) | `island` (shisha, 20/20) |

**GQ-31 — qahramon raqam ekranga sig'sin.** O'sha 13 ta overflow'ning asosiy sababi Lumen emas,
`blueprints/dashboard.json` dagi `hero.size: "80–112px"` edi. Brauzerda o'lchadim (390px ekran,
20px gutter): `$213` 100px'da 222px joy oladi, `$298.89` — 393px, `$4,218.40` — 469px. Ya'ni uzun
figura eski o'lchamda **sig'ishi mumkin emas**. Serif ikki barobar tor (284px), Nova shuning uchun
qutulib qolgan — omad edi, qoida emas.

Endi o'lcham belgilar soniga bog'langan: 5 tagacha 88–112px, 6–7 ta 72–88px, 8+ 56–72px. Bu
`dashboard`, `stats`, `result`, `detail` va `paywall` blueprintlariga tushdi va hamma tizimga foyda.

Tegilgan fayllar: `design-systems/lumen/*` (yangi), `src/app/Services/ShellService.ts`,
5 ta `blueprints/*.json`, `src/app/Services/new-features.check.ts`,
`src/app/Services/services.check.ts`, `eval/run.ts` (`--briefs` bayrog'i),
`eval/briefs-nova3.json`, `eval/briefs-lumen3.json`.
Tekshirildi: `npm run check` va `npx tsc --noEmit` toza; uchta brief Nova va Lumen'da yugurtirildi
(har biri $0.078), ekranlar 390px'da chizilib ko'z bilan solishtirildi.


### Palitra ottenkasi kodda tanlanadi — GQ-26

To'rt generatsiya ketma-ket yashil qaytargandi: moss, moss, `#2e7d32`, `#7a9e5f`. Sabab modelda
emas, **promptda** — uchta langar bor edi:

1. JSON namunasi haqiqiy hex olib yurardi (`"accent": "#c05e3c"`), va birinchi yugurish uni
   **aynan nusxalagan**.
2. 6-qoida misol sifatida `terracotta, ochre, moss, plum, sand, teal` deb sanardi — ikki yugurish
   so'zma-so'z `moss` qaytardi.
3. `"Do not reach for indigo, violet or a generic blue unless the brief asks"` uchta oilani nomi
   bilan o'chirardi, ya'ni jazolanmagan yagona javob sifatida tuproqli o'rta qismni qoldirardi.

**Tuzatish `artDirection` naqshi bo'yicha:** `lib/palette.ts` da `hueDirection(seed, appType)` —
yetti ottenka oilasi (clay, amber, moss, teal, ink, plum, rose), har ilova turiga g'ildirak bo'ylab
tarqatilgan 3–4 nomzod, urug' loyiha id'si. Xuddi `navStyle` va blueprint variantlari kabi: namuna
oluvchidan xilma-xillik so'rash xilma-xillik bermaydi, shuning uchun u **qurilish bo'yicha**
ta'minlanadi.

Yo'nalish **so'rov xabariga** qo'shiladi, system promptga emas — prompt keshlangan va bu har
loyihada boshqacha. Matnning o'zi ustuvorlikni aytadi: *"brief boshqa rang yoki kayfiyat aytsa,
brief yutadi va sen bu qatorni e'tiborsiz qoldirasan"*. Namunadagi hexlar `#rrggbb` ga, so'z
ro'yxati va taqiq olib tashlandi.

**O'lchov (2000 UUID, `habits` turi):** moss 25.9% · amber 25.2% · rose 24.8% · teal 24.1%.
5 ta ketma-ket loyihada kamida 3 xil oila — **82%** holatda. To'liq kafolat uchun oxirgi N loyihaning
ottenkasini bazadan o'qish kerak bo'lardi; holatsiz deterministik funksiya 82% ga yetadi va u yetarli
deb baholandi.

**Haqiqiy yugurish** (`"make habit tracker"`): kod `teal` dedi, model `#14b8a6` (173°) qaytardi —
to'rt yashildan keyin birinchi marta boshqa oila. Ilova: HabitFlow, doodle, character
"calm, focused, encouraging, vibrant". Audit `cleanShare 0.5` (`covered-text: 1`, `small-target: 2`) —
FAB hali ochiq (EYE-08). Halol eslatma: bu **bitta namuna**, model yo'nalishga bir marta bo'ysundi.

Tegilgan fayllar: `src/lib/palette.ts`, `src/lib/palette.check.ts`,
`src/app/Services/PlannerService.ts`, `src/app/Http/Controllers/PlanController.ts`.
Tekshirildi: `npm run check` va `npx tsc --noEmit` toza; brauzerda bitta generatsiya.

## 2026-09-24

### Komponent varag'i kirish sifatida: uy uslubi CSS emas, markup — GQ-16

Diagnoz avval: uka ekranlar anchor ekranning **birinchi 1200 belgi CSS'ini** olardi — `* {box-sizing}`,
`body`, `.today-page`, `.greeting-name` — karta, qator, tugma hech qachon shu chegaraga yetmasdi.
Oxirgi Nova yugurishida (0ba67d83) 6 ekrandan 4 tasi kit klassini 0 marta ishlatib, har biri
12–32 KB o'z CSS'ini yozgan edi. Model klass ro'yxatiga emas, **namunaga** ergashadi.

Yangi: `ComponentSheetService.componentSheet(entities)` — kit markup'i (bo'lim sarlavhasi, ikki
ro'yxat qatori rejaning o'z item'lari bilan, bento karta + sparkline, tugmalar, chip/qidiruv/switch)
~2.3k belgi, `SHEET_BUDGET` 2600 (KIT-05: ko'p material sifatni tushiradi). `screenBrief` uni
`# HOUSE STYLE — this app's components` ostida `html` blok qilib beradi ("paste, change only the
words"). PlanController: **anchor-first aylanish va `extractStyleDigest` olib tashlandi**, 6 ekran
parallel (`mapLimit 3`), 33 s. GenerateController (qo'shish/qayta chizish) xuddi shu varaqni
saqlangan reja entity'laridan quradi. `data-od-link` varaqda yo'q (placeholder ko'chirilardi).

Natija ("make habit tracker", ikki yugurish):
- kit ishlatish **24 → 214** (Doodle 0b7a5d98) / **174** (Nova 6e8e4f08 "Stride", amber palitra); har ekranda ≥5;
- o'z CSS 65 KB → 44 KB;
- hakam: Doodle 3.33, koherensiya **3 → 4**, juftlikda oldingi Nova'ni yutdi (slight); Nova "Stride"
  **3.50** (hierarchy 3.5, spacing 3.83, polish 3.67, fidelity 4.17, koherensiya 4, app 4), juftlikda
  oldingi Nova'ni **clear** yutdi — "one warm design system across all six screens".
- Hakam topgan yangi nuqson: jamlanma raqamlar ekranlar orasida mos emas ("3 of 5 done" vs "5 of 6
  remaining"; "47 of 180" vs "34 check-ins") → GQ-28 (Keyin). FAB hali qator ustida (EYE-08);
  Habit Detail sarlavhasi umumiy ("Habit Detail", habit nomi emas); Settings'da sahifa sarlavhasi yo'q.

- Fayllar: `src/app/Services/ComponentSheetService.ts` (yangi), `src/app/Services/ScreenContext.ts`, `src/app/Http/Controllers/PlanController.ts`, `src/app/Http/Controllers/GenerateController.ts`, `src/lib/screen-normalizer.ts` (digest o'chirildi), `src/app/Services/services.check.ts`, `src/app/Http/Controllers/controllers.check.ts`, `src/app/Services/new-features.check.ts`, `CLAUDE.md` (arxitektura qoidasi).
- Tekshirildi: `npm run check` (varaq: entity nomlari, escape, byudjet, deterministik, bo'sh reja; brief `# HOUSE STYLE` + html blok; regenerate brief'ida `od-row__title">Pad Thai`) va `tsc` toza. Chrome: ikki haqiqiy generatsiya, bazadan kit sanovi, `eval/judge-project.ts … --vs` ikkalasi uchun.

### Vizual hakam kanvas loyihalarida, va u topgan uchta nuqson tuzatildi — GQ-08

`eval/judge-project.ts`: eval yugurishi emas, `data.db`'dagi loyihalar (habit tracker iteratsiyalari)
skrinshot qilinib (`--virtual-time-budget`, animatsiya muzlatilgan — birinchi yugurishda hakam
"near-zero opacity grid" deb kirish animatsiyasining o'rtasini ko'rgan edi) rubrika bo'yicha
baholanadi; `--vs a,b` tasodifiy tartibda juftlik; `--renormalize` saqlangan HTML ustiga bugungi
shell/kit/tokenlarni qo'yib baholaydi (qayta generatsiyasiz "oldin/keyin"). `eval/briefs.json`
+8 `dribbble-*` brief (36). `eval/judge.ts` `ask` eksport qilindi.

Natijalar (Claude hakam, 1–5). Saqlangan HTML: baseline Ritual/bento 3.33 (koherensiya 3), Nova
3-qadam 3.83 (4, eng yaxshi), yakuniy 3.00 (3). Bugungi shell bilan (`-rn`): Nova 3.67 (4),
yakuniy 3.67 (4) — yakuniy +0.67. Juftlik baseline vs yakuniy-rn: baseline "clear" yutdi — sabab:
emoji + chiziqli ikonka aralash, sarlavha takrori, kesilgan matn, suzuvchi pill kontent ustida.

Hakam topgan va kodda tuzatilgan:
- **Pill/island kontentni yopadi** — `navClearance`: suzuvchi bar uchun 88+40px.
- **Sarlavha ikki marta** — `dropDuplicateTitle` (normalizer): kiritilgan header'dan keyingi birinchi
  h1/h2 sarlavha bilan bir xil bo'lsa (regisr, bo'shliq, "— App" qo'shimchasi e'tiborsiz) olib
  tashlanadi. `controllers.check` regenerate testi endi `<h1>Cart — GoBite</h1>` tushishini kutadi.
- **Ekran nomida ilova nomi** ("Habit Detail — Streakly", "Streakly — Achievements", "Feast Home") —
  header uni 34px'da chizardi. `screenTitle(name, appName)` `parsePlan`'da nom, parent va
  linksTo'ga birdek qo'llanadi (havola o'z ekranini topaverishi uchun). Saqlangan ekran nomi ham
  modelning `<title>`idan ("Streakly — Today") ilova nomisiz olinadi — PlanController'da va
  qo'shilgan/qayta chizilgan ekranda (GenerateController; yangi loyiha sarlavhasi tegilmaydi).

Hakam artefakti (bilib qo'yish): skrinshot faqat birinchi 844px — suzuvchi pill har doim
qandaydir qator ustida turadi va hakam buni "yopadi" deb sanaydi; bar uslubi uchun bu jarima
doimiy. Ochiq qolgan: emoji ikonka o'rnida (model), FAB (EYE-08), kesilgan yorliqlar.

- Fayllar: `eval/judge-project.ts` (yangi), `eval/judge.ts`, `eval/briefs.json`, `eval/eval.check.ts`, `src/app/Services/ShellService.ts`, `src/lib/screen-normalizer.ts`, `src/app/Services/ScreenContext.ts`, `src/app/Services/PlannerService.ts`, `src/app/Services/new-features.check.ts`, `src/app/Services/services.check.ts`, `src/app/Http/Controllers/controllers.check.ts`.
- Tekshirildi: `npm run check` (Judge Regressions: clearance, sarlavha takrori; parsePlan nomlari — 5 holat, havola/parent hal bo'ladi; trimToBrief "Feast Home"→"Home") va `tsc` toza. Hakam ikki marta yugurdi (saqlangan, `-rn`); hisobotlar `eval/out/projects/<id>[-rn]/judge.json`.

### 2026 to'plami yakuniy generatsiyada — GQ-18…GQ-25 birga, "make habit tracker"

Sakkiz qadam (bar, bento, ikonka, sarlavha, sticker, shkala, harakat, dark) har biri LLM'siz
qayta-render bilan alohida ko'rilgan edi; bu haqiqiy generatsiya ularni birga sinadi
(0ba67d83, Nova majburlangan — ruletka Doodle bergan edi, palitra planner'dan: yashil
`#2e7d32`, "calm, natural, encouraging").

Ishlagan: suzuvchi shisha pill bar 21px yuqorida, duotone faol tab; serif hero'lar (Detail 12,
Progress 18, Achievements 14); katta sarlavhali detail; Settings jim; Progress `stats/d` bento
variantini oldi (model "Bento Stats" deb nomladi).

Ishlamagan yoki kuzatilgan — halol:
- **Today hero kichik** (halqa ichida ~28px, avvalgi Nova generatsiyasida 88 edi). Spec'da HERO
  satri bor; model bo'ysunmadi. Ehtimollik — GQ-08 hakam bilan o'lchanadi, prompt bilan emas.
- **Sticker sloti 6 ekranda 0 marta.** Prompt'da paragraf bor, lekin blueprint hero'lar stickerni
  aytmaydi; modelning o'zi ishlatmaydi. Yechim kirishda: hero maydoniga "sticker: fire" kabi
  tavsiya (Keyin qatori).
- **Kit klasslari yana deyarli yo'q** (od-row 5, qolgani 0) — kit'dagi harakat/duotone/bento
  qoidalari bu ekranlarga yetmayapti. GQ-16 (komponent varag'i) zarur.
- **Palitra to'rt generatsiyada yashil oilasi** (moss, moss, yashil, yashil) — prompt namunasi
  va "earthy" so'zi langar; namunani placeholder qilish va ottenka xilma-xilligi (Keyin qatori).
- O'lchov: `font-size: Npx` sanovi tokenlarni ko'rmaydi — hakam kerak.

- Tekshirildi: `npm run check` va `tsc` toza (har qadamda). Chrome: kanvas va Today skrinshotlari yuborildi; bazadan har ekranning arxetip/varianti, hero, sticker, bento, kit sanovi.

### Nova to'q rejimda: yorug' qirra bilan chuqurlik, planner'ga "dark" ishorasi — GQ-25

To'q sahifada to'q soya ko'rinmaydi. `paletteDeclarations` palitra to'q bo'lsa (`bg` L<0.5)
`--elev-ring`, `--elev-raised`, `--od-card-shadow`, `--od-btn-shadow` ni yorug' qirra + chuqur
soya variantiga almashtiradi; yorug' palitrada tizimning o'z chuqurlik tokenlari tegilmaydi.
Nova `STYLE.md` to'q palitrani ta'riflaydi; planner prompti brief "dark, night, sleep, focus,
cinema" desa to'q fon va yorqin accent tanlashni aytadi.

- Fayllar: `src/lib/palette.ts`, `src/lib/palette.check.ts`, `design-systems/nova/STYLE.md`, `src/app/Services/PlannerService.ts`.
- Tekshirildi: `npm run check` (to'q palitrada tokenlar, yorug'da yo'q, Nova root orqali ikkala holat, STYLE va planner matni) va `tsc` toza. Chrome'da Nova + to'q palitra namunasi (lime/#0c0d0b): kartalar yorug' qirra bilan, AA nuqson 0.

### Harakat token sifatida: prujinali bosish, sirpanuvchi switch, faol tab "pop" — GQ-24

Material 3 Expressive'dan olingan fikr: harakat va shakl dizayn tokeni, bezak emas. Kit'ga
`prefers-reduced-motion: no-preference` ostida bitta blok: tugma, chip, ikonka tugmasi, segment,
stepper bosilganda `scale(.96)` (qator `.985`) — `--motion-press` (120ms) va `--ease-spring`
(ozgina overshoot) bilan; holat ranglari `--motion-fast` bilan kesishadi; switch dumalog'i
`--motion-base` prujinasi bilan sirpanadi; progress kengligi yumshoq. Standart qiymatlar
tokenlarga ichki — har tizim bir xil hisni oladi, Nova o'zinikini aytadi. Suzuvchi barda faol
tab belgisi ochilganda prujina bilan "pop" qiladi. Kit hech qanday kirish animatsiyasi
qo'shmaydi — craft §8 dagi "bitta kirish ketma-ketligi" qoidasi buzilmaydi.

Kuzatuv: Nova generatsiyasi kit klasslarini deyarli ishlatmagan (`od-btn` 0, `od-switch` 0,
`od-row` 0, faqat `od-segmented`) — model o'z CSS'ini yozgan. Bu GQ-16 (komponent varag'i
kirish sifatida) qanchalik zarurligini ko'rsatadi; Notion'da GQ-16 izohiga yozildi.

- Fayllar: `kit/od-kit.css`, `design-systems/nova/tokens.css`, `src/app/Services/ShellService.ts`, `new-features.check.ts`.
- Tekshirildi: `npm run check` (reduced-motion bloki, scale qoidasi, prujina tokeni standart bilan, switch, Nova tokenlari, nav pop, kirish animatsiyasi yo'q) va `tsc` toza. Chrome'da sintetik kit sahifasida hisoblangan `transition`: tugma/chip/segment `transform 0.12s cubic-bezier(0.34, 1.3, 0.64, 1)`, ranglar 0.14s, switch dumalog'i `transform 0.22s` prujina.

### Telefon shrift shkalasi va display og'irligi tokenlarda — GQ-23

iOS 26 shkalasi raqamlarda: tana 17 (kamida 15), ikkilamchi 15, izoh 13, tab yorlig'i 11, ekran
sarlavhasi 34, hero 64–96. `craft/mobile.md` §2 shuni aytadi (avval "15–17, 13–14" veb shkalasi
edi); Nova tokenlari 17/15/13 ga o'tdi. Yo'l-yo'lakay haqiqiy nuqson topildi: kit `.od-stat__value`,
`.od-price`, `.od-hero__title` ni `font-weight: 700` bilan chizardi — Instrument Serif'ning
bitta og'irligi bor, brauzer uni **soxta qalin** qilardi. Endi og'irlik `--od-display-weight`
(standart 700 — katalog tizimlari o'zgarmaydi; Nova 400), bo'lim sarlavhasi `--od-heading-weight`
va `--od-heading-font` (Nova: tana shrifti, 600) orqali; `font-optical-sizing: auto`.

Byudjet yana: craft bulleti 50 belgi uzayib vercel promptini 24 004 ga chiqardi — jumla qisqardi
(23 977). Bu chegara endi har o'zgarishda sinaladi.

- Fayllar: `craft/mobile.md`, `design-systems/nova/tokens.css`, `kit/od-kit.css`, `new-features.check.ts`.
- Tekshirildi: `npm run check` (craft shkalasi, Nova tokenlari, uch kit qoidasida og'irlik tokeni, sarlavha shrifti/og'irligi tokeni, katalog tizimi tegilmagan) va `tsc` toza. Chrome'da Progress qayta-render: "Progress" va "31" serif o'z og'irligida, tana 17px.

### Stickerlar kodda: 12 ta soft-3D SVG glif, token rangida — GQ-21

2026 ekranida 2020 dagi emoji o'rnida soft-3D glif turadi — streak kartasida olov, achievement'da
kubok, bo'sh holatda barg. Raster generatsiya qila olmaymiz, emoji esa ko'ruvchi platformasida
chiziladi (va lint taqiqlaydi). Shuning uchun slot: model `<div data-od-sticker="fire">` yozadi,
`lib/stickers.ts` uni SVG bilan chizadi — ton rangida gradientli yumaloq plitka, ichki yorug'lik,
o'sha tonda yumshoq soya, oq glif. 12 nom, 4 ton (`data-tone`), o'lcham slot kengligidan,
noma'lum nom → sparkle (hech qachon bo'sh emas), idempotent. Grafik va xarita kabi `autofixScreen`
ichida chiziladi; `hand-drawn-icon` linti chizilgan stickerni istisno qiladi (aks holda o'zimiz
chizgan SVG "qo'lda chizilgan" deb qaytardi). Prompt'ga slot paragrafi qo'shildi.

**Byudjet jangi.** Paragraf 24 000 belgilik mobil prompt byudjetini to'rt tizimda (vercel,
supabase, cursor, raycast — uslub kartalari eng uzun) 100–285 belgiga oshirib yubordi. Uch
aylanishda paragraf 700 → 388 belgiga tushdi va umumiy shartnomadagi ortiqcha so'zlar
qisqardi (grafik namunasi, xarita, ikonka, shrift jumlalari — ma'no o'zgarmagan). Eng uzun
prompt endi 23 954. Bu byudjet haqiqatan chegarada turganini ko'rsatadi — keyingi prompt
qo'shimchasi avval nimanidir olib tashlashi kerak.

- Fayllar: `src/lib/stickers.ts` (yangi), `src/lib/design-lint.ts`, `src/app/Services/PromptComposer.ts`, `new-features.check.ts`.
- Tekshirildi: `npm run check` (12 glif, gradient+soya, token rangi, tashqi havola yo'q, ton, fallback, o'lcham, idempotentlik, autofix chizadi, lint istisnosi, prompt'da slot bor) va `tsc` toza. Chrome'da demo: 12×4 sticker Nova tokenlarida, joyida — streak kartasi va bo'sh holat. Saqlangan ekranlarda slot yo'q (model hali bilmasdi), shuning uchun haqiqiy ishlatilishi keyingi generatsiyada ko'rinadi.

### Detail sarlavhasi: katta serif title, scroll'da yig'iladi, chiziq o'rniga shisha qirra — GQ-19

iOS 26 nav bar ikki qatorli: tepada orqaga tugma va (avval ko'rinmas) kichik sarlavha, pastda
katta sarlavha; scroll'da katta qator yig'iladi, kichigi markazda paydo bo'ladi; chegara chizig'i
o'rniga blur va yumshoq qirra. `buildDetailHeader` endi aynan shu: 34px `var(--font-display)`
(Nova'da serif) katta sarlavha, 17px kichik sarlavha `opacity:0` dan boshlanadi, sarlavha
shisha (`backdrop-filter`), `border-bottom` yo'q; `<header>` ichida yig'ilish skripti — 28px dan
keyin katta qator `max-height:0`, kichik sarlavha ko'rinadi, `box-shadow` bilan 1px yumshoq
chiziq paydo bo'ladi; `prefers-reduced-motion` da o'tishlarsiz. Markerlar (`data-od-id`,
`data-od-shell`, `data-od-back`, `position:sticky;top:0`) o'zgarmagan — prototip ko'prigi va
normalizatorning header tanishi buzilmaydi.

- Fayllar: `src/app/Services/ShellService.ts`, `new-features.check.ts`.
- Tekshirildi: `npm run check` (34px display, 17px kichik, boshida yashirin, shisha, hairline yo'q, bitta skript, reduced-motion, markerlar, faqat inline uslub, sticky) va `tsc` toza. Chrome'da Habit Detail qayta-render: ochilganda serif katta sarlavha; 5 tik pastga surilgach katta qator yo'qoldi, kichik sarlavha markazda, yumshoq qirra. Birinchi skrinshot o'tish o'rtasida tushdi — bir soniyadan keyingi yakuniy holat to'g'ri.

### Ikonka muomalasi: stroke tizimdan, duotone CSS bilan, faol tabda chizish — GQ-20

Kutubxona almashtirilmadi — 2026 ko'rinishining 80% i *muomala*: `iconSvg` endi stroke'ni
`--icon-stroke` dan oladi (lucide `createIcons` allaqachon shunday qilardi, shell gliflari 2px
da qotib qolgan edi); kit'da `.od-row__lead svg`, `.od-icon-btn svg`, `.od-empty__icon svg` ga
`fill: color-mix(currentColor var(--od-icon-duotone, 14%))` — Phosphor duotone ko'rinishi,
tizim `0%` bilan o'chira oladi; bo'sh holat ikonka konteyneri ham `--od-icon-*` tokenlarini
o'qiydi (kulrang doira Nova'da squircle bo'ladi). Suzuvchi bar ichida `<style>` bloki: faol tab
glifi duotone va sahifa ochilganda `stroke-dashoffset` bilan o'zini chizib keladi (SF Symbols 7
"draw"), `prefers-reduced-motion` da harakatsiz. Selektorlar `[aria-current=page]` ko'rinishida
— mavjud test faol tabni `aria-current="page"` sonidan topadi va uslub bloki tabga o'xshab
qolmasligi kerak (birinchi urinishda aynan shu yiqildi).

- Fayllar: `src/app/Services/ShellService.ts`, `kit/od-kit.css`, `new-features.check.ts`.
- Tekshirildi: `npm run check` (stroke tokeni, duotone selektori, keyframes + reduced-motion, bitta uslub bloki, `bar` tegilmagan, kit qoidalari) va `tsc` toza. Nova ekranlari qayta-render: faol tab glifi yengil to'ldirish bilan, qator ikonkalari tinted squircle'da.

### Bento qoidalari: blueprint varianti va `identical-card-stack` linti — GQ-22

Bento 2026 ning asosiy layout naqshi: ierarxiya o'lcham orqali, joylashuv orqali emas — bitta keng
qahramon plitka, keyin har biri bitta ish qiladigan kvadratlar, 12–16px bo'shliq, ≤5 plitka.
`dashboard`, `stats`, `profile` blueprint'lariga `d` (bento) varianti qo'shildi; variantlar 2–4
bo'ldi (test moslandi). Modelga "bir xil kartalar to'plami" taqiqi allaqachon `mobile.md` §11
da bor edi — lekin hech narsa uni ushlamasdi. Endi lint: to'rt yoki undan ko'p **ketma-ket, bir
xil klassli** `od-card` aka-uka (orasida boshqa element bo'lmasa) — `identical-card-stack`
topilmasi, nechta ekani bilan. `od-bento` ichidagi bir xil kvadratlar istisno — u yerda bu
maqsad. DOM'siz: teglar bo'yicha yurib, har ochiq element o'z bolalaridagi ketma-ketlikni
sanaydi; `<style>`/`<script>` avval olib tashlanadi, shuning uchun CSS'dagi `.od-card` sanalmaydi.

Saqlangan uchta habit tracker (Nova, Retro, Doodle) da topilma yo'q — model bu ilovalarda ro'yxat
va qatorlarni ishlatgan; qoida qo'riqchi bo'lib qoladi. Bento varianti generatsiyaga ta'sir
qiladi, shuning uchun GQ-20 bilan birga bitta haqiqiy generatsiyada ko'riladi.

- Fayllar: `src/lib/design-lint.ts`, `blueprints/{dashboard,stats,profile}.json`, `src/app/Services/services.check.ts`, `new-features.check.ts`.
- Tekshirildi: `npm run check` (4 ta = topilma, 3 ta yo'q, sarlavha uzadi, bento istisno, har xil klass emas, ichma-ich joylashganda ham sanaydi, CSS sanalmaydi) va `tsc` toza.

### iOS 26 tab bar: 21px inset, shisha qirra, scroll'da yig'ilish, qidiruv oroli — GQ-18

Tadqiqot: iOS 26 da bar chetga yopishgan emas — chetlardan 21pt ichkarida suzuvchi kapsula, shisha
materialda; pastga scroll'da faqat faol tabga yig'iladi; Search alohida dumaloq orol; shisha faqat
navigatsiya qatlamiga. `ShellService` da: `island`/`pill` 21px inset; shisha = blur + `saturate`
+ yuqori qirrada `inset 0 1px 0 rgba(255,255,255,.45)` — aynan shu chiziq "material" hissini
beradi, to'liq sinishsiz; `<nav>` ichida yig'ilish skripti (faol tabdan boshqasini yashiradi,
yuqoriga scroll'da qaytaradi, `prefers-reduced-motion` da harakatsiz) — nav ichida bo'lgani
uchun qayta-normalizatsiyada bar bilan birga almashadi; `search` tabi `island`/`pill` da o'ngda
alohida shisha doira (`data-od-search`), lekin hali ham `data-od-tab` — prototip ko'prigi va
shell shartnomasi o'zgarmaydi. `bar`/`contrast` tegilmagan (utility ilovalar).

**LLM'siz qayta-render vositasi** (scratchpad `rerender.ts`): loyihaning saqlangan ekranlariga
bugungi shell/kit/tokenlarni qayta qo'llab `/tmp` ga yozadi — modelning kompozitsiyasi qoladi,
faqat bizning hunar o'zgaradi; $0, soniyalarda. Har keyingi qadam shu bilan ko'riladi.

- Fayllar: `src/app/Services/ShellService.ts`, `src/app/Services/new-features.check.ts`.
- Tekshirildi: `npm run check` (21px, qirra, bitta skript, reduced-motion, qidiruv oroli, `bar`/`contrast` tegilmagan) va `tsc` toza. Chrome'da Nova ekranlari qayta-render: bar 21px yuqorida, shisha ko'rinadi; alohida sahifada pastga surilganda pill faqat faol tabga qisqardi, yuqoriga surilganda qaytdi. Bitta ortiqcha tasdiq (nav'lar faqat faol tabda farqlashi) allaqachon mavjud test bilan qoplangani uchun olib tashlandi.

### Nova — 2026 flagman mobil tizimi — GQ-13, "make habit tracker" bilan

Foydalanuvchi: "stillar, font, ikonlar juda eski, 2026 emas". Sabab modelda emas — bizning
deterministik qatlamda: 33 tizimning ko'pi veb-brend nusxasi; habit tracker uchun auto tanlov
retro/doodle/bento/duolingo (ataylab g'alati tizimlar); `od-kit` 1px chegara va 12px burchak;
64px tekis tab bar; ikonka 2px outline kulrang doirada. Model faqat kompozitsiya qiladi.

**Nova** (`design-systems/nova/`): stone-tinted neytrallar, squircle 14/20/28px, kartalar
chegarasiz ikki qatlamli yumshoq soya bilan, Instrument Serif (hero va sarlavha) + Geist,
`--text-4xl: 88px`, `--icon-stroke: 1.75`, shisha `--od-blur: blur(20px)`. Ranglar
`lib/palette.ts` dan AA bilan olingan; auto tanlovda ular planner palitrasi bilan almashadi va
faqat hunar qoladi — aynan shu maqsad. Shrift URL'lari curl bilan tekshirildi (ikkalasi 200).

Kit: `.od-icon-btn` endi `--od-icon-radius/-bg/-fg` tokenlarini o'qiydi (standart ko'rinish
o'zgarmagan, Nova tinted squircle qo'yadi); yangi `.od-bento` + `.od-bento__wide`,
`.od-card--glass`; halqa diagramma 3.5 → 5.5 qalinlik. Galereyaga "Bento" namunasi
(testi shuni talab qildi). Prompt'dagi kit ro'yxatiga yangi klasslar kirdi.

Auto tanlov: `nova` consumer turlarda ro'yxatda **uch marta** — flagman standart ko'rinish
(200 seed'da 93 = 47%), xarakter tizimlari qoladi, shuning uchun bir xil brief doim bitta
tizim bermaydi. `ShellService` Nova'ni `consumer` (orol/pill bar) deb biladi.

**Tajriba nazorati.** Ikki urinishda ruletka Duolingo va Doodle berdi. Duolingo generatsiyasi
foydali chiqdi: Settings jim qoldi (16px — QUIET_ROOTS ishladi), hero'lar 76/96/76, model
bento'ni o'zi ishlatdi. Uchinchisida rejani chizishdan oldin loyihaning tizimi bazada `nova`
ga qo'yildi — o'zgaruvchi faqat tizim. Server nova bilan chizgani bazadan tasdiqlandi
(birinchi ekran `--font-display: "Instrument Serif"`).

**Natija (f3682a79, Nova, moss `#587a4a` / krem):** serif hero'lar — Today "4 streaks alive"
88px, Detail "12", Progress "31", Achievements "3 unlocked"; suzuvchi orol tab bar; chegarasiz
squircle kartalar; tinted-squircle ikonkalar; bento uch ekranda; Settings jim. Qolgan: FAB (+)
hali chiziladi (EYE-08 ma'lum), palitra yana yashil-ko'k oilasida.

Bir o'lchov eslatmasi: "eng katta font" ko'rsatkichim faqat `font-size: Npx` literal'ni sanaydi;
Nova'da model tokenlarni (`var(--text-4xl)`) ishlatgani uchun Detail 17px, Progress 11px deb
ko'rsatdi — skrinshot esa 88px ni ko'rsatadi. Ko'rsatkich tokenlarni ham hisoblashi kerak.

Brauzer eslatmasi: server qayta ishga tushgandan keyingi birinchi sahifada klaviatura yozuvi
yutildi; React'ga mos `value` setter + `input` hodisasi ishladi.

- Fayllar: `design-systems/nova/{tokens.css,STYLE.md,DESIGN.md,manifest.json}`, `kit/od-kit.css`, `kit/samples.ts`, `src/lib/charts.ts`, `src/app/Services/{DesignSystemService,ShellService,PromptComposer}.ts`, `src/app/Http/Controllers/controllers.check.ts`.
- Tekshirildi: `npm run check` (style card shakli, tokenlar AA, kit galereyasi, auto shortlist) va `tsc` toza. Chrome'da to'liq generatsiya; kanvas va Today skrinshotlari yuborildi.
- GQ-13 `Jarayonda`: foydalanuvchi tasdig'i kutilmoqda.

### Qahramon lahza: blueprint'da nima va necha piksel — GQ-15, ikki generatsiya bilan

Sleek bilan asosiy farq bitta raqamda edi: ularda streak ~120px, bizda 14px qator ichida. 12 ta
blueprint'da "hero" so'zi bor edi, lekin faqat *nima* ekani — *qanchalik katta* ekani yo'q, va
"katta" o'z holicha 14px bo'lib chiqaverdi. Endi sakkiz blueprint (dashboard, stats, detail,
result, profile, player, paywall, onboarding) `hero: { what, size }` ko'taradi, `size` piksel
oralig'i, va `BlueprintService.brief` uni `HERO MOMENT:` satri bilan spec'ga yozadi: sahifadagi
eng katta narsa, hech narsa unga ikki shrift o'lchamidan yaqin kelmaydi.

**Birinchi generatsiya (7d8cc425, Doodle, moss `#7a9e5f`):** hero ishlagan joyda ishladi —
Detail 64px, Progress 76px. Lekin planner Today'ni `dashboard` emas, **`list`** deb belgiladi,
`list` blueprint'i esa jim (to'g'ri: tranzaksiyalar ro'yxati baqirmasligi kerak). Bosh ekran 28px
bilan qoldi. Yechim blueprint'da emas, kodda: `screenSpec` root tab ekraniga arxetipidan qat'i
nazar hero beradi — tab bu manzil, u ilovaning bosh raqamini ko'taradi.

**Ikkinchi generatsiya (a176142f, Retro, moss `#5f8b6f`):** Today **28 → 88px**, Detail 88,
Achievements 84. Ikki kamchilik chiqdi va ikkalasi ham halol yozildi: (1) Settings ham 84px raqam
oldi — root-tab zaxirasi jim bo'lishi kerak bo'lgan tab'larga ham tegdi; `QUIET_ROOTS`
(settings, search, chat, camera, map) qo'shildi, test bilan; keyingi generatsiyada ko'rinadi.
(2) Progress spec'ida hero bor edi, model e'tiborsiz qoldirdi (24px) — birinchi generatsiyada
76px bergan edi. Bu ehtimollik, prompt emas; hakam (GQ-08) bilan o'lchanadi.

Today yaqindan yana ikki nuqson ko'rsatdi: halqa "3 done" deydi, raqam 0/5 — ma'lumot zid; va
"12-DAY MEDITATION STREAK" tracked-out kapital yorliq — `mobile.md` §11 taqiqlagan belgi, lint
uni hali ushlamaydi. Ikkalasi alohida qator uchun nomzod.

Yo'l-yo'lakay: "Create Habit" ekrani avvalgi generatsiyada `Untitled` bo'lib chiqqan edi
(`<title></title>` bo'sh) — GEN-27 sifatida yozildi. Va bu safar planner reja tasdig'ini so'radi
("Draw 6 screens") — CHAT-08 oqimi; brauzerda bosildi.

- Fayllar: `blueprints/{dashboard,stats,detail,result,profile,player,paywall,onboarding}.json`, `src/app/Services/BlueprintService.ts`, `src/app/Services/ScreenContext.ts`, `src/app/Services/services.check.ts`.
- Tekshirildi: `npm run check` va `tsc` toza (hero shakli, px oralig'i, spec'ga yetishi, root-tab zaxirasi, jim tab'lar). Chrome'da ikki to'liq generatsiya; bazadan har ekranning eng katta `font-size` i o'lchandi; kanvas va Today skrinshotlari yuborildi.
- GQ-15 `Jarayonda` qoladi: foydalanuvchi tasdig'i kutilmoqda.

### Palitra generatsiyaga kirdi — GQ-10 (3/3), brauzerda "make habit tracker" bilan

Planner o'ylab topgan palitra endi haqiqatan ekranlarga tushadi. Qoida: **faqat tizim avtomatik
tanlangan bo'lsa** (`projects.design_system_auto`). Odam tizimni qo'lda tanlagan bo'lsa — bu uning
qarori, ranglar tegilmaydi. Palitra AA ga keltirilib bir marta `projects.palette` ga yoziladi;
keyin chizilgan yoki haftalar o'tib qo'shilgan har ekran o'sha bitta `:root` ni oladi.

Tizim o'z hunarini saqlaydi: `applyPaletteToRoot` katalog `:root` ining ustiga faqat rang (va
radius) tokenlarini yozadi — shrift shkalasi, bo'shliqlar, harakat, soyalar tizimniki. Ya'ni
generatsiya qilingan palitra generik skelet ustida emas, haqiqiy tizimning suyaklarida yuradi.

To'rt o'qish nuqtasi bitta resolver'ga o'tdi (`DesignSystemService.readTokensRootFor`): reja
chizish, keyin qo'shilgan/tahrirlangan ekran, prompt (model chizayotgan ranglarini ko'rishi shart)
va kanvasdagi dizayn tizimi kadri. Regressiya qo'riqchisi: bu fayllarda yalang'och katalog
`readTokensRoot(` chaqiruvi qolmasligi, va qo'lda tanlangan tizim qayta bo'yalmasligi.

**Brauzerda, bitta o'zgarmas prompt:**

| | 0-qadam (bazaviy) | 1-qadam (palitra) |
|---|---|---|
| Ilova | Ritual · bento | Streakly · doodle |
| Ranglar | katalog ko'ki | terracotta `#ba5b3a` / krem `#faf6f2`, "warm, gentle, hand-made, steady" |
| 6 ekranda `--accent` | tizimniki | hammasida `#ba5b3a` (bazadan tekshirildi) |
| Qahramon lahza | yo'q (raqamlar qatorda) | hali yo'q — 2-qadam |

**Ikki halol kuzatuv.** (1) Model qaytargan to'rt rang prompt'dagi JSON namunasi bilan aynan bir
xil chiqdi (`#c05e3c`→`#ba5b3a`, `#faf6f2`, `#ffffff`, `#2b2422`). Alohida ikki chaqiruvda boshqa
ranglar kelgan edi, demak doimiy nusxalash emas, lekin namuna kuchli langar — keyingi qadamda
namunadagi aniq qiymatlar placeholder'ga almashadi. (2) Birinchi urinishda ikkinchi generatsiya
umuman boshlanmadi: server qayta ishga tushgach client bundle buzilgan (`Failed to fetch
dynamically imported module`), Enter hech narsa qilmagan, kuzatuvchim esa eski loyihani ushlab
"palitra yo'q" deb ko'rsatdi. Sahifani qayta yuklash kifoya qildi; kuzatuvchi endi `created_at`
bo'yicha filtrlaydi.

- Fayllar: `src/database/migrations/0020_add_project_palette.ts`, `schema.ts`, `migrate.ts`, `src/app/Models/Project.ts`, `src/app/Services/DesignSystemService.ts`, `PromptComposer.ts`, `src/app/Http/Controllers/{Plan,Generate,Project}Controller.ts`, `src/lib/palette.ts` (`applyPaletteToRoot`, `parsePalette`), `palette.check.ts`, `new-features.check.ts`.
- Tekshirildi: `npm run check` va `tsc` toza. Chrome'da to'liq oqim: kirish (sehrli havola), prompt, 6 ekran, kanvas va preview skrinshotlari foydalanuvchiga yuborildi. Bazada har ekranning `:root` i palitrani ko'taradi.
- GQ-10 `Jarayonda` qoladi: foydalanuvchi vizual tasdig'i va hakam A/B (GQ-08) kutilmoqda.

### Planner palitrani qaytaradi — GQ-10 (2/3)

Planner prompti endi oltinchi qadam sifatida palitra so'raydi: to'rt rang, burchak hissi va uch-to'rt
so'zlik xarakter. Promptda ikki narsa ataylab aytilgan — butun spektrdan tanlash (indigo va generik
ko'kdan qochish, chunki katalogning 62% i shunday) va **xavfsizlik uchun emas, xarakter uchun
tanlash**, chunki kontrast keyin kodda ta'mirlanadi. Ikkinchisi bo'lmasa model o'zini cheklab,
xuddi katalog kabi xavfsiz kulranglarga qaytadi.

`parsePlan` palitrani `readProposal` orqali o'tkazadi va u to'liq o'qilmasa **butunlay tashlab
yuboradi**. Yarim palitra — kulrangga qaytish, ya'ni aynan shu qator bartaraf qilayotgan nuqson;
palitra bo'lmasa loyiha avvalgidek kuratsiya qilingan tizimda qoladi.

**Ikki marta haqiqiy planner chaqiruvi bilan tekshirildi** (`"habit tracker app"`, o'zgarmas):

| | accent | xarakter | AA nuqson |
|---|---|---|---|
| 1-chaqiruv | `#d97a3d` to'q sariq | warm, gentle, encouraging, earthy | 0 |
| 2-chaqiruv | `#2a9d8f` teal | calm, encouraging, minimal, warm | 0 |

Ikkalasi ham ko'k emas, ikkalasi ham ta'mirdan keyin bitta ham AA nuqsonisiz o'tdi.

Yo'l-yo'lakay bitta shubhani tekshirdim: model `appType` ni `productivity` deb qaytardi, holbuki
GQ-09 `habits` ni alohida tur qilgan edi. Nuqson emas — `AppPatternService` naqshni `appType` dan
emas, brief so'zlaridan tanlaydi, va `"habit tracker app"` to'g'ri `habits` ga tushadi.

- Fayllar: `src/app/Services/PlannerService.ts`, `src/app/Services/services.check.ts`.
- Tekshirildi: `npm run check` va `tsc` toza. Test tasdig'i validatsiya chetlab o'tilganda yiqiladi (buzuq holat vaqtincha yasalib, fayl tiklandi). Palitra hali hech qayerda ishlatilmayapti, shuning uchun ekran generatsiyasi o'zgarmagan va eval talab qilinmaydi.
- Qoldi (3/3): palitra hamma ekranga bitta `:root` bo'lib kirsin. **Bu generatsiyani o'zgartiradi**, demak eval bilan o'lchanadi.

### Palitra qatlami: rang matematikasi va AA ta'mirlash — GQ-10 (1/3)

GQ-10 ning birinchi bo'lagi: model o'ylab topgan palitrani qabul qilib, undan to'liq token to'plamini
chiqaradigan va AA ni majburlaydigan modul. Generatsiyaga hali ulanmagan, shuning uchun sifatga
ta'sir qilmaydi va eval talab qilmaydi.

**Nega model faqat beshta rang beradi.** Olti ekran — olti mustaqil namuna. Ekran o'zi tanlay
oladigan har narsa — olti ekran kelishmaydigan narsa. Planner bir marta ishlaydi, demak u
tanlagan palitra hammaga umumiy bo'la oladigan yagona narsa. Model **hukm** beradi (ottenka,
kayfiyat, burchak hissi); **hunar** kodda qoladi: siyoh rampasi, chegaralar, hover holatlari,
rangli chip ustidagi matn. Aynan shu joyda kirish imkoniyati yutiladi yoki yo'qotiladi, va oltmish
tokenni boshida ushlab turishi so'ralgan model ularni sezilmas tarzda buzadi.

Butun matematika bitta qoidaga bo'ysunadi: **rang yorug'likda harakatlanadi, ottenkada hech qachon**.
Palitra — bu xarakter haqidagi hukm; swatch'ni AA gacha qoraytirish hukmni saqlaydi, uni xavfsiz
kulrangga almashtirish esa aynan shu testdan o'tib, hukmni axlatga tashlaydi.

Tasodifiy 400 ta palitra bilan sinaldi — har bir siyoh/yuza jufti, har bir rangli chip va
to'ldirilgan tugma AA dan o'tadi. Shu sinov ikkita haqiqiy teshik topdi:

- **O'rta tonli accent.** Oq rang qoraygan sari o'qilarli bo'ladi, qora esa yorishgan sari — demak
  eng yomon holat o'rtada: o'rta tonli accent na oqni, na qorani ko'taradi (4.35:1). `usableAccent`
  uni o'zi og'gan tomonga o'rtadan uzoqlashtiradi.
- **O'rta tonli sahifa.** Hech qanday rangdagi AA matnni ko'tara olmaydi. Fon va yuza ottenkasi
  saqlangan holda ishlaydigan yorug'lik diapazoniga tortiladi.

Uchinchisi chegaraviy xato edi: `mix` butun bo'lmagan kanal qaytarardi, ya'ni o'lchangan fon CSS'ga
yoziladigan rangdan bir hilol yaxshiroq edi — endigina maqsadga yetgan juftni yana ostiga tushirish
uchun shuning o'zi yetarli.

- Fayllar: `src/lib/color.ts` (yangi), `src/lib/palette.ts` (yangi), `src/lib/palette.check.ts` (yangi), `package.json`.
- Tekshirildi: `npm run check` (yangi `palette.check.ts` bilan) va `tsc` toza. Uchala kafolat tegishli regressiyada yiqiladi — `usableAccent` olib tashlanganda, yuza diapazoni olib tashlanganda va `mix` yaxlitlanmaganda; buzuq holatlar vaqtincha yasalib, fayllar aynan tiklandi.
- Qoldi (GQ-10 `Jarayonda`): planner palitrani qaytarsin (2/3), palitra `:root` bo'lib generatsiyaga kirsin (3/3). Uchinchi qadam generatsiyani o'zgartiradi, demak eval bilan o'lchanadi.

## 2026-09-23

### FAB kartani yopadi: o'lchovga qo'shildi, tuzatish qaytarildi — EYE-08

Ikkala ilovada ham bir xil: FAB oxirgi kartaning gapini yopadi. Uch marta tuzatishga urindim va
uchalasi ham noto'g'ri yo'l bo'lib chiqdi.

1. **Pastki padding qo'shdim** (112 → 156px). Noto'g'ri: `position: fixed` element skrollning
   o'rtasida ham kontent ustida turadi, hujjat oxiridagi padding unga ta'sir qilmaydi.
2. **FAB'ni nav klirensidan yuqoriga ko'chirdim** (84 → 128px) va qutisiga joy ajratdim.
   O'lchandi — nav orolchasi bilan to'qnashuv ketdi, progress chizig'i ochildi, lekin karta matni
   hali ham yopiq.
3. Uchinchi urinishga o'tishdan oldin foydalanuvchi to'xtatdi va haq edi.

**Xulosa, va u endi arxitektura qoidasi:** uch urinish va to'liq yechim yo'qligi — "mulohazali
tuzatish" ning imzosi. Men modelning niyatini taxmin qilib uning qutisini ko'chirayotgan edim.
Statik CSS `position: fixed` element **nima ustida** turishini bila olmaydi; buni faqat chizilgan
sahifa biladi.

Qaytarildi: `findFab`, `FAB_GAP`, `data-od-fab` qoidasi va `applyNavClearance` dagi o'zgarish —
`screen-normalizer.ts` commit holatiga qaytdi.

**Qoldi:** `lib/render-audit.ts` da yangi `covered-text` qoidasi. Kichik `position: fixed` quti
(160×96 dan kichik, ya'ni panel emas, suzuvchi tugma) matn ustida tursa xabar beradi. Bu tahrirlash
emas, o'lchash — va u darhol ishladi:

| | avval | `covered-text` bilan |
|---|---|---|
| HabitLoop | 0.833 | **0.667** (covered-text: 1) |
| Streakly | 0.833 | **0.667** (covered-text: 1) |

Raqam tushdi, chunki avval ko'rmagan nuqsonni endi ko'ryapmiz. Bu regressiya emas, o'lchovning
to'g'rilanishi.

Keyingi qadam kodda emas, **kirishda**: agar bu raqam yomon tursa, `list` arxetipining blueprinti
asosiy amalni inline joylashtirishni aniqroq aytadi, shunda model FAB chizishga sabab topmaydi.
Shell shartnomasi FAB'ni allaqachon taqiqlaydi va model uni 2 ilovadan 2 tasida chizdi, ya'ni
taqiq so'zi ishlamayapti — lekin taqiqni kuchaytirish ham promptni kuchaytirish, bu esa bugun
KIT-05 da sinovdan o'tmagan yo'l.

Tegilgan fayllar: `src/lib/render-audit.ts`, `CLAUDE.md` (arxitektura qoidasi).
Tekshirildi: `npm run check` va `npx tsc --noEmit` toza; qoida ikkala ilovaning 12 ekranida
o'lchandi va FABsiz ekranlarda ishlamasligi tasdiqlandi.


### Audit telefon kengligida o'lchamayotgan ekan, va shift jadvalda qulflangan ekan — EYE-07, GQ-09

**Ikkita xato, ikkalasi ham meniki.**

**1. Audit 390 emas, 500 pikselda o'lchagan.** Headless Chrome 500px'dan tor oyna ocholmaydi, shuning
uchun `--window-size=390,844` jimgina 500'da chizgan. Bugungi barcha raqamlarim shu kenglikda edi.
Ekran endi 500px'lik host ichidagi **390px iframe**'ga joylanadi, prob o'sha iframe ichida ishlaydi va
host natijani chiqarib oladi. Qayta o'lchov: 24 ekranda `cleanShare` **0.833** — sarlavha raqam
o'zgarmadi, lekin 500'da yashiringan bitta `overflow` chiqdi.

Yo'l-yo'lakay: prob ishga tushmasa `[]` qaytarardi, ya'ni **butunlay toza ekran** deb ko'rsatardi.
Bu o'lchovda eng xavfli xato turi. Endi prob javob bermasa `throw` bo'ladi, jim o'tmaydi.

**2. Xarakterning shifti `BY_APP_TYPE` jadvalida qulflangan edi.** 12 ilova turi × 4 nomzod = 48 katak,
ulardan **atigi 3 tasi** `high` rang energiyali. Ikki tur — `productivity` va `marketplace` — to'rttasi
ham `low`. Va `"habit"` so'zi `productivity` da turardi.

Ya'ni **bu mahsulot yaratadigan har bir habit tracker kulrang bo'lishi kafolatlangan** edi. Omadsizlik
emas: `notion | linear-app | cal | shadcn`, to'rttasi ham eng quruq tizimlarimiz. Hech qanday urug',
hech qanday so'z bu jadvaldan qochib chiqolmasdi.

Qilingani:
- `app-patterns/habits.json` — habit tracker o'z turi. Task manager Linear'ga o'xshashi kerak, habit
  tracker esa yo'q; ikkalasini bir turga tiqish birini doim noto'g'ri qiladi. Patternning o'zi
  streakni hissiy markaz deb yozadi va `Achievements` ekranini taklif qiladi.
- `habits: ['duolingo', 'bento', 'doodle', 'retro']` — to'rttasi ham rangli.
- `productivity`: `shadcn` → `bento`; `marketplace`: `minimal` → `bento`.
- Test: **hech bir ilova turida hamma nomzod `low` bo'lolmaydi**, va habit briflari (en/uz/ru)
  `habits` ga tushishi shart, task manager esa `productivity` da qolishi shart.

**O'lchandi — bir xil prompt, "habit tracker app":**

| | oldin (Streakly) | keyin (HabitLoop) |
|---|---|---|
| tizim | notion | **retro** |
| fon / aksent | oq / ko'k | iliq krem / terrakota |
| ekranlar | Habits, Stats | **Awards** qo'shildi, streak har qatorda |
| audit cleanShare | 0.833 | 0.833 |

Sifat raqami o'zgarmadi, xarakter o'zgardi — aynan shu kerak edi.

**Ochiq qolgan, ikkala ilovada ham takrorlangan:** FAB progress kartasi ustiga tushib matnni yopadi;
qidiruv lupasi maydondan tashqarida yolg'iz turadi; uzun habit nomi ellipsissiz kesiladi.

Tegilgan fayllar: `eval/audit.ts`, `app-patterns/habits.json` (yangi),
`app-patterns/productivity.json`, `app-patterns/media.json`,
`src/app/Services/DesignSystemService.ts`, `src/app/Services/new-features.check.ts`,
`src/app/Services/services.check.ts`.
Tekshirildi: `npm run check` va `npx tsc --noEmit` toza; brauzerda bir xil prompt bilan ikki ilova
yaratildi va ikkalasi ham 390px'da audit qilindi.


### Qolgan past kontrastlarning sababi topildi — EYE-06

EYE-05 audit'ni 0.25 dan 0.50 ga ko'targandi, 17 ta past kontrast esa aniqlanmay qolgandi. Har bir
topilmaning **haqiqiy rangi va haqiqiy foni**ni brauzerdan o'qib chiqdim. Tasodifiy emas edi —
to'rt sinf, hammasi kodda:

**1. Brend rangi to'g'ridan-to'g'ri matn rangi sifatida.** Model `.delta--up { color: var(--success) }`
yozadi va 3.30:1 chiqadi. Bizning arxitektura qoidamiz buni allaqachon taqiqlaydi
("`--od-*-text` mixlaridan o'tadi, hech qachon xom `var(--accent)` emas") — lekin hech narsa
majbur qilmasdi. Endi `autofixScreen` sahifaning o'z CSS'ida `color: var(--success)` ni
`var(--od-success-text)` ga aylantiradi. `background`, `border-color`, `--accent-on` va kit'ning
o'z yulduzchasi tegilmaydi.

**2. `--surface-warm` hech qachon o'lchanmagan yuza edi.** 20 tizim uni aniqlaydi, `od-icon-btn`
unga bo'yaladi, kontrast testimizda esa faqat `--bg` va `--surface` bor edi. Shu teshik ortida
**16 ta siyoh/yuza jufti** AA dan past turgan. Test endi uchala yuzani ham tekshiradi.

**3. Rangli chip ustidagi matn.** `od-kit.css` teglarni rol rangining 12–15% i bilan bo'yaydi, matn
esa yalang yuzada emas, o'sha rangli fonda o'tiradi. `--surface` da o'tadigan chip o'z fonida
4.39:1 edi. Endi `--od-*-text` **rangli fon ham hisobga olib** hisoblanadi (104 ta token qayta
hisoblandi, 30 tizimda), test ham shu tintni alohida yuza sifatida tekshiradi.

**4. Rasm ustidagi oq yorliq.** `.hero__tag { color:#fff; background: rgba(17,17,19,.42) }` —
42% qoraytirish yorug' rasm ustida hech narsa yashirmaydi. `autofixStreen` endi yorug' matn
ostidagi qora skrimning alfasini 0.75 ga ko'taradi (faqat qora skrim, faqat yorug' matn ostida).

**Auditning o'zida ikkita xato topildi:**
- **Yarim shaffof qatlamlar o'tkazib yuborilardi.** Alfa 230 dan past bo'lsa fon "hisoblanmas"
  edi, shuning uchun skrimdagi oq yorliq skrim **ortidagi** sahifaga solishtirilardi — oq ustida
  oq, 1.00:1. Aynan skrim uni o'qilarli qiladi. Endi qatlamlar orqadan oldinga qo'shib chiqiladi.
- **SVG ichidagi elementlar "ekrandan chiqdi" deb belgilanardi.** `preserveAspectRatio="slice"`
  bilan chizilgan xarita bolalari ataylab kadrdan kengroq; ularni CSS emas, viewBox kesadi.

**Natija — o'sha 24 ekranda, generatsiyasiz, $0:**

| | boshlanishida | EYE-05 dan keyin | EYE-06 dan keyin |
|---|---|---|---|
| audit cleanShare | 0.25 | 0.50 | **0.833** |
| low-contrast | 22 | 17 | **1** |
| small-target | 9 | 2 | **2** |
| overflow | 1 | 1 | **0** |

**Narxi:** `--od-*-text` tokenlari brend rangidan o'rtacha 16% to'yinganlik yo'qotadi (eng yomoni
duolingo, 47%). Bu **faqat matnga** tegadi — tugma, fon, chegara, ikonka o'z rangida qoladi.

**Qolgan 5 ta topilma, halol ro'yxat:**
- 2 × `51×31` — bu `od-kit.css` ning iOS o'lchamidagi switch'i. `input` `::after` ola olmaydi, uni
  kattalashtirish esa chizilgan boshqaruvni buzadi (bizning qoidamiz: tuzatish qutini o'stirmaydi).
  To'g'ri yechim — switch'ni `<label>` qatoriga o'rash, lekin markup'ni model yozadi.
- 2 × `clipped-text` — matn ellipsissiz kesilgan. Elementning haqiqiy kengligini bilish kerak,
  ya'ni faqat render paytida.
- 1 × oq matn to'g'ridan-to'g'ri rasm ustida, skrimsiz.

Uchala sinf ham faqat chizilgan sahifada ko'rinadi — ya'ni endi ular **har eval runda raqam
sifatida chiqadi** (`metrics.audit`), taxmin sifatida emas.

Tegilgan fayllar: `src/lib/design-lint.ts`, `src/lib/render-audit.ts`,
`src/app/Services/new-features.check.ts`, 30+ `design-systems/*/tokens.css`.
Tekshirildi: `npm run check` va `npx tsc --noEmit` toza; audit 24 ekranda to'rt marta qayta
o'lchandi. Eslatma: bir nechta tokens.css izohi avvalgi almashtirishda noto'g'ri o'zgargandi —
izohga tegmaydigan tuzatuvchi bilan qaytarildi va `cal`/`claude` dagi ikki izoh haqiqatga
moslandi.


### Ko'z ko'radigan nuqsonlar — EYE-05 (biz noto'g'ri raqamni optimallashtirgan ekanmiz)

Savol: "nega shuncha o'zgarishdan keyin ham habit tracker dabdala chiqadi?" Javob quvurda emas,
**o'lchovda** edi. `npm run eval` bizga `lint.cleanShare = 0.65` deydi — bu statik CSS tekshiruvi.
Brauzerda, haqiqiy piksellarda ishlaydigan render audit hech qachon eval metrikasiga qo'shilmagan
edi. Oxirgi runga qo'yganimda: **`cleanShare = 0.25`** — 24 ekrandan 18 tasida ko'z ko'radigan
nuqson. Uch yil emas, uchta aniq kod teshigi:

**1. Asosiy tugmaning yozuvi 12 tizimda o'qilmaydi.** Audit `3.52:1` ni olti marta ketma-ket
qaytardi — bu `airbnb` ning oq yozuvi qizil tugmada. Kontrast testimiz `--fg`, `--muted`, `--meta`
ni `--bg` va `--surface` ga solishtiradi; `--accent` ham yuza ekanini, `--accent-on` esa uning
ustidagi yozuv ekanini hech kim tekshirmagan. Duolingo 2.09:1 bilan yuribdi. 10 tizimda qora yozuv
4.5 dan yuqori o'tadi (brend rangi tegilmaydi), 2 chegaraviysida aksent 2% qoraytirildi.

**2. `opacity` kontrastni jimgina o'ldiradi.** `.is-locked { opacity: .72 }` — token o'zi AA dan
o'tadi, konteyner shaffof bo'lgach 4.29:1. Token testi buni ko'ra olmaydi, chunki tokenda hech
narsa o'zgarmagan. Yangi lint qoidasi: `opacity-dimmed-text`.

**3. 44px tap zonasi faqat `<button>` ga qo'yilardi.** Buzilgan elementlarning hammasi havola edi:
`<a class="od-icon-btn" data-od-link="Stats">` 24px kenglikda, "See all" esa `43×44` — bir piksel
yetmaydi. Endi `a[data-od-link]`, `[role=button]` va `label` ham oladi. Havola faqat
`data-od-link` bilan kiradi: gap ichidagi havolaga 44px ustki qatlam qo'yish yon so'zlarni bosib
qolardi. `input` (ya'ni `.od-switch`) `::after` ololmaydi, shuning uchun u tashqarida — uni
majburlash chizilgan qutini kattalashtirardi, bu qoidamizga zid.

**Bundan tashqari:** `--od-*-text` mixlari (brend rangi matn sifatida) `od-kit.css` da 33 tizim
uchun bitta qat'iy 45% da yozilgan edi. O'lchadim: 125 rang-roldan 15 tasiga bu **kam**, qolgan
110 tasiga **ko'p** — ya'ni brend rangi behuda yuviladi. Endi har tizim o'z o'lchangan qiymatini
`tokens.css` da saqlaydi. `--border` ni matn rangi sifatida ishlatish ham lintga tushdi
(bitta ekranda ajratuvchi nuqta 1.26:1 edi).

**O'lchandi, generatsiyasiz.** 1 va 3 deterministik post-processing, shuning uchun o'sha 24 ta
saqlangan ekranga qayta qo'llab o'lchadim — **$0, bitta LLM chaqiruvisiz**:

| | avval | keyin |
|---|---|---|
| audit cleanShare | 0.25 | **0.50** |
| small-target | 9 | **2** |
| low-contrast | 22 | 17 |

Qolgan 17 ta past kontrast **hali aniqlanmagan** — `--od-*-text` tuzatilgandan keyin ham
o'zgarmadi, ya'ni sabab boshqa joyda (ehtimol rangli/aralash fonlar ustidagi matn, bu esa hech
qayerda o'lchanmaydi). Buni keyingi qadam sifatida ochiq qoldiryapman.

**Eng muhimi:** render audit endi `npm run eval` ning o'z metrikasida (`metrics.audit`).
`OD_SKIP_AUDIT=1` bilan o'chiriladi. Shusiz biz yana ko'rinmaydigan narsani "yaxshilab" yurardik.

Tegilgan fayllar: 12 ta `design-systems/*/tokens.css` (accent), 32 tasi (`--od-*-text`),
`src/lib/design-lint.ts`, `src/app/Services/new-features.check.ts`,
`src/app/Services/DesignSystemService.ts`, `src/app/Services/PromptComposer.ts`, `eval/run.ts`.
Tekshirildi: `npm run check` va `npx tsc --noEmit` toza; audit 24 ekranda qayta o'lchandi.
Eslatma: yangi tokenlar `vercel` ning tizim promptini 24 010 ga chiqargandi — `--od-*` tokenlari
endi promptga kirmaydi (modelda ular kerak emas, ular kit ichida o'qiladi), 23 778.


### KIT-05 sinovdan o'tmadi — modelga komponent qiymatlarini matn bilan berish sifatni pasaytiradi

Farazim: uslub kartasi brendni so'z bilan ta'riflaydi, lekin tugmaning padding'i qancha ekanini hech
qachon aytmaydi, shuning uchun model o'zicha taxmin qiladi. Har dizayn tizimi uchun `COMPONENTS.md`
(button/input/card/badge qiymatlari, o'sha tizimning tokenlarida) yozib, ekran brifiga arxetipga
qarab qo'shdim; blueprint kit eskizining matnini ham "bu klasslar allaqachon uslublangan" deb
o'zgartirdim.

**Avval o'lchadim:** 159 ekrandan 57 tasi (36%) `od-` klasslarini ishlatgan, medianasi 0; qolganlari
o'rtacha 57 ta o'z CSS qoidasini yozgan. Muammo haqiqiy. Shuning uchun `eval/metrics.ts` ga `kit`
hisoblagichi qo'shildi (`screensUsing`, `blocksMean`, `ownRules`) — arxitektura qoidasi: har bir
ma'lum nosozlikka avval hisoblagich.

**Uchta run, bir xil 4 brief, bir xil provider (deepseek):**

| | baseline | + karta | kartasiz, faqat yangi matn |
|---|---|---|---|
| kit ishlatgan ekran | **0.609** | 0.240 | 0.500 |
| ekranga kit bloklari | **2.13** | 0.64 | 1.25 |
| o'z CSS qoidalari | **57.5** | 62.7 | 61.1 |
| lint toza | **0.652** | 0.480 | 0.542 |
| caps-eyebrow tell | **4** | 8 | 4 |

Karta modelni kitdan uzoqlashtirgan (61% → 24%) va o'z CSS'ini ko'proq yozishga undagan — chunki
kartaning o'zi "o'z klass nomingizni yozing" deb aytadi. Ustiga ustak, `text-transform: uppercase` va
`letter-spacing` qiymatlari kartada bor edi, ya'ni biz lint qiladigan "generatsiya izlari"ni modelga
qo'lga tutqazdik: `caps-eyebrow` 4 → 8. Matnni qayta yozish ham yutmadi (0.609 → 0.500).

**Xulosa:** promptga ko'proq CSS berish noto'g'ri richag. Bu bizning o'z arxitektura qoidamizni
buzadi — "bitta to'g'ri javobi bor narsa kodda qo'llanadi, prompt so'zi bilan emas". Hammasi
qaytarildi: `COMPONENTS.md` fayllari, `tools/extract-components.ts`, `readComponents`,
`componentKinds`, brif sloti, testi va `NOTICE` o'zgarishi o'chirildi.

**Qolgani:** `eval/metrics.ts` dagi `kit` hisoblagichi. O'lchov qoladi, chunki muammo qolyapti:
ekranlarning ~40% i kitni umuman ishlatmaydi va hech narsa uni majbur qilmaydi.

Tegilgan fayllar: `eval/metrics.ts`.
Tekshirildi: `npm run check` va `npx tsc --noEmit` toza; uchta 4-briefli eval
(`eval/out/2026-09-23-10-07-think-off`, `…-12-37-kit05`, `…-kit05-nocard`), jami ~$0.30.


### Havola rasm endi ko'rinishni ham belgilaydi — IMG-02 (IMG-01 ning tuzatilishi)
Foydalanuvchi pushti, qalin harfli, o'ynoqi habit tracker skrinshotini berib "same as in the image" dedi va **tinch ko'k minimalizm** oldi. Uchta xato, uchalasi ham quvurda:

1. **Dizayn tizimi rasm o'qilishidan oldin tanlanardi.** `createProject` tizimni faqat matndan tanlaydi; "make habit tracker app, same as in the image given" da uslub so'zi yo'q, shuning uchun `productivity` nomzodlaridan `cal` tushdi. Rasm keyinroq, reja runida o'qilardi — o'shanda kech edi.
2. **Men rangni ataylab taqiqlagandim.** `describeReference` promptida "Never give hex values or colour names", `referenceBlock` da esa "Keep this app's own design tokens". Model rasmni to'g'ri o'qidi (*"bold, playful, and energetic"*), quvur esa unga rangni tashlab, Cal tokenlarini saqlashni aytdi.
3. Halqa yonidagi matn ustiga chiqib ketardi.

**Endi:**
- `readReference` matn emas, **tuzilgan javob** qaytaradi: `accent`, `background`, `corners`, `type`, `mood`, va kompozitsiya matni. Model faqat o'qiydi.
- `matchSystem` (DesignSystemService) rasmni 33 tizimning **har biriga solishtiradi**: fon yorug'ligi (×2.0), aksent ottenkasi (×2.0), uslub kartasidagi kayfiyat so'zlari (−0.22) va shrift xarakteri (−0.18, faqat kartaning "## Type" bo'limidan — aks holda rang tavsifidagi "near-black" noto'g'ri mos kelardi). Qaror kodda, arifmetika bilan — bir xil rasm doim bir xil tizimga tushadi.
- `themeFromReference` rasmning aksentini va burchak radiusini tema override'iga qo'yadi. Kulrang "aksent" — bu aksent yo'qligi, majburlanmaydi.
- Bularning hammasi **birorta ekran chizilishidan oldin** bo'ladi: tizim almashtiriladi (`Project.saveDesignSystem`), tema qo'yiladi, keyin planner ishlaydi.
- **Halqa chegaralandi**: `max-width:100%` (ilgari `aspect-ratio` uni o'z ustunidan kengroq qilib, yonidagi matnni yopib qo'yardi) va markaz matni `overflow:hidden` bilan doira ichida qoladi; 14 belgidan uzun yorliq markazga umuman yozilmaydi.
- **Natija** (foydalanuvchining aynan o'sha prompti va rasmi, haqiqiy DeepSeek): matndan `cal` → rasmdan **`neobrutalism`**, aksent `#f55fa8`, dumaloq burchaklar. 6 ekran 62 soniyada: qalin katta harfli sarlavhalar, pushti tugmalar, o'ynoqi shakllar.
- Fayllar: `app/Services/{ReferenceService,DesignSystemService,PendingPlans,ScreenContext}.ts`, `app/Models/Project.ts`, `app/Http/Controllers/{Plan,Generate}Controller.ts`, `lib/charts.ts`, `app/Services/new-features.check.ts`.
- Tekshirildi: `npm run check` exit 0 (yangi testlar: rasm haqiqiy tizimga tushadi va doim bir xiliga, to'q rasm to'q tizimga, rangsiz rasm fikr bildirmaydi, kulrang aksent majburlanmaydi, model JSON'i himoyalangan holda o'qiladi, halqa o'z ustunidan chiqmaydi, uzun yorliq markazga yozilmaydi), `tsc` toza, uchdan-uchga sinov skrinshotlar bilan.

### Uslub tanlovi qutidan olindi, avtomatik tanlov kengaydi, boshlash qutisiga havola rasm — DS-01, DS-02, IMG-01
Reja: `docs/REFERENCE-AND-AUTO-STYLE-PLAN.md`.

- **DS-01** `BY_APP_TYPE` endi bitta tizim emas, **3–4 nomzod**, va loyiha id'sidan urug'lanib bittasi tanlanadi (`artDirection` va `navStyle` bilan bir xil FNV-1a). Sabab o'lchangan: har "habit tracker" **doim `notion`**, har "food delivery" **doim `airbnb`** olardi, va 33 tizimdan **21 tasi avtomatik tanlovda hech qachon chiqmasdi**. Endi ilova turlaridan **24 tasi** yetib boradi, uslub so'zlari bilan 26 ga chiqadi. Briefda uslub aytilsa (`STYLE_WORDS`) — u baribir ustun.
- **DS-02** `SystemPicker` boshlash qutisidan olib tashlandi; tanlov **yo'qolmadi** — Tema panelida qoladi, ya'ni odam natijani ko'rgach almashtiradi (Sleek va Stitch yo'li: avval natija, keyin sozlash). Ideya kartalari o'z tizimini olib kelishda davom etadi — ular natija namunasi, bosilganda o'sha natija qaytishi kerak.
- **IMG-01** boshlash qutisiga qisqich qo'shildi va **rasm bir marta o'qiladi**: `ReferenceService.describeReference` bitta vision chaqiruvida rasmni qisqa yozma yo'nalishga aylantiradi (tartib, bo'shliq ritmi, tipografika pog'onalari, shakllar, kayfiyat — brend nomi, matn va rang **olinmaydi**), matn `projects.plan` ga saqlanadi va `referenceBlock` orqali **har ekran briefiga** boradi. Rasmning o'zi saqlanmaydi va qayta yuborilmaydi.
  - Nega shunday: rasm har chaqiruvda prompt tokeni sifatida to'lanadi va **hech qachon kesh hiti bo'lmaydi**; 7+ chaqiruvli runda uni har ekranga qo'shish qimmat, va parallel chaqiruvlar uni bir xil tushunadi degan umid — aynan bu kodbaza rad etadigan yondashuv. Narxi: ilovaga bitta qo'shimcha chaqiruv (2.6s, ~$0.0002).
  - Rasm dashboarddan loyiha sahifasiga sessiya xotirasi orqali o'tadi (`PENDING_IMAGES`), bir marta o'qiladi va tozalanadi — reload qayta to'lamaydi. Tasdiqlash darvozasi (CHAT-08) yozma yo'nalishni saqlaydi, ya'ni tasdiq rasmni qayta o'qimaydi. Chatdan keyin qo'shilgan ekran ham o'sha yo'nalishni oladi.
- **Uchdan-uchga sinov** (haqiqiy DeepSeek, "Step counter app, 3 ta ekran" + halqa skrinshoti): yozma yo'nalish 2.6 soniyada chiqdi, 3 ekrandan **2 tasi** katta markaziy halqa bilan boshlanadi, halqa ichida uch pog'onali matn — tavsif aytgan tuzilish. Havoladagi yashil rang ham, "lessons" matni ham o'tmadi: ilova o'z ko'k aksenti va o'z qadam ma'lumoti bilan chiqdi.
- Fayllar: `app/Services/{DesignSystemService,ReferenceService,PendingPlans,ScreenContext}.ts`, `app/Http/Controllers/{Project,Plan,Generate}Controller.ts`, `generatePlan.ts`, `Dashboard.tsx`, `Landing.tsx`, `routes/p.$projectId.tsx`, `eval/run.ts`, `app/Services/new-features.check.ts`, `app/Http/Controllers/controllers.check.ts`.
- Tekshirildi: `npm run check` exit 0 (yangi testlar: bir xil brief ikki xil tizim beradi, tanlov bitta loyiha uchun barqaror, uslub so'zi ustun, katalogning katta qismi yetib boradi; nomzodlar ilova turiga mos), `tsc` toza, DeepSeek'da uchdan-uchga sinov skrinshot bilan. **Dashboard UI'si brauzerda tekshirilmadi** — Chrome kengaytmasi javob bermadi.

### Rasm tushunish: chatga skrinshot biriktirib "shunga o'xshatib qil" — LLM-02
- `deepseek-flash` rasmni o'zi o'qiydi, shuning uchun provayder almashtirilmadi. Jonli tasdiq: sen yuborgan halqa skrinshotini modelga berdim va u nuqsonni o'zi aytdi — *"the '8' is vertically squashed and overlapping, while the 'lessons done' text spills outside the ring"*.
- **Oqim:** quti ostidagi qisqich (yoki qutiga to'g'ridan-to'g'ri **paste**) → eskizlar ko'rinadi → xabar bilan birga ketadi. Rasm **o'sha bitta so'rovga** tegishli: rasm prompt tokeni sifatida hisoblanadi va **hech qachon kesh hiti bo'lmaydi**, shuning uchun uni butun reja runiga emas, faqat o'zi so'ralgan chaqiruvga bog'ladim.
- **Chegaralar** (`lib/ref-images.ts`, yangi): eng ko'pi 2 ta rasm, har biri ≤1 MB, faqat `png/jpeg/webp` data URL. Uzoq URL olinmaydi (server model nomidan tarmoqqa chiqmaydi), `svg` rad etiladi — u hujjat, rasm emas. Mos kelmagani xatolik emas, jimgina tashlanadi.
- **Ramka:** `refImageNote` modelga rasm nima uchun ekanini aytadi — "layout, spacing, type scale va kayfiyatni yo'nalish sifatida ol, lekin ilovaning o'z ma'lumoti, matni va tokenlarini saqla". Bu shart edi: usiz model rasmni nusxalaydigan kontent deb biladi.
- **Uchdan-uchga sinov** (haqiqiy DeepSeek, PlantCare ilovasining "Reminders" ekrani): model halqani qo'shdi, lekin **o'z ilovasining ma'lumotini** ishlatdi ("2 of 6 tasks done today", havoladagi "8 of 12 lessons" emas), **o'z aksent rangini** oldi (ko'k, havoladagi yashil emas) va havoladagi nuqsonni takrorlamadi. 5.2 soniya, 43 KB skrinshot = 348 prompt tokeni.
- Lokal provayder (`claude-cli`) rasmni ko'ra olmaydi, shuning uchun unga rasm biriktirilgani matn bilan aytiladi.
- Fayllar: `lib/ref-images.ts` (yangi), `app/Services/LlmService.ts`, `app/Http/Controllers/GenerateController.ts`, `generate.ts`, `PromptBox.tsx`, `routes/p.$projectId.tsx`, `app/Services/new-features.check.ts`.
- Tekshirildi: `npm run check` exit 0 (yangi testlar: ikkala shakl qabul qilinadi, ikkitadan ortiq ketmaydi, uzoq URL va svg rad etiladi, hajm chegarasi, ramka matni), `tsc` toza, DeepSeek'da uchdan-uchga sinov skrinshot bilan.

### Narx jadvali haqiqiy DeepSeek raqamlariga, thinking chaqiruv joyiga qarab, 'generik AI' qoidalari linterga — LLM-03, LLM-01, QLT-06

- **LLM-03** `PRICE` endi `deepseek-flash` ning haqiqiy narxi: off-peak $0.15 kirish / $0.003 kesh / $0.60 chiqish, peak ikki barobar (`PRICE_PEAK`), va `isPeak()` soatga qaraydi (01:00–04:00 va 06:00–10:00 UTC, dushanba–juma). Eskisi $0.27/$1.10 edi — off-peak xarajatni **1.9×** oshirib ko'rsatardi, ya'ni kunlik byudjet qo'riqchisi ham, evaldagi baho ham noto'g'ri edi. `costOf` endi vaqtni oladi; eval bahosi off-peak asosiy stavkada beriladi.
- **LLM-01** thinking moduldagi doimiy emas, chaqiruv joyining qarori: ekran chizishda doim o'chiq, plannerda `LLM_PLAN_THINKING=1` bilan yoqiladi — **A/B dan keyin standart holda o'chiq qoldirildi**. 4 briefli A/B (DeepSeek, 2026-09-23): thinking yoqiq bo'lganda **ikkita brief umuman ekran chizmadi**. Sabab kodda takrorlandi: reasoning tokenlari JSON bilan bir xil chiqish byudjetidan yeydi, planner `max_tokens: 4000` ga urilib yarim JSON qaytardi (`Unexpected end of JSON input`). Endi thinking yoqiq bo'lsa chegara 12 000 ga ko'tariladi, ya'ni bayroq plannerni jimgina buzmaydi. Tuzatilgandan keyin bir xil briefda o'lchandi: **o'chiq — 6 ekran, 8.8s, 2 283 token; yoqiq — 5 ekran, 43.6s, 10 658 token.** Besh barobar chiqish, besh barobar kutish, rejasi kichikroq. Sabab o'lchangan: reasoning tokenlari **chiqish** sifatida hisoblanadi, chiqish esa ilovaning qimmat yarmi (~47k token); bitta rejada yoqiq 8 924 token / 89s, o'chiq 2 075 / 17s. Haqiqiy API'da ham tasdiqlandi: bir xil trivial so'rovda 10 → 43 chiqish tokeni.
- **QLT-06** linterga uchta yangi qoida: `caps-eyebrow` (kichik + tracked-out + uppercase — ya'ni sarlavha ustidagi yorliq, dizayn tizimi so'ragan katta uppercase sarlavha emas), `mono-for-data`, `middle-dot-meta` (to'rt va undan ortiq fakt o'rta nuqta bilan). Sabab: 28 briefli evalda bular `craft/mobile.md` da nomma-nom taqiqlangan bo'lsa ham 62 / 46 / 46 ekranda chiqdi. In'ektsiya qilingan shell qoidalardan chiqarilgan.
- Fayllar: `app/Services/LlmService.ts`, `lib/design-lint.ts`, `eval/metrics.ts`, `eval/eval.check.ts`, `app/Services/new-features.check.ts`, `app/Http/Controllers/controllers.check.ts`.
- Tekshirildi: `npm run check` exit 0 (yangi testlar: narx jadvali va peak soati, bir xil chaqiruv peakda ikki barobar, uchta yangi lint qoidasi, Nike uslubidagi uppercase sarlavha va in'ektsiya qilingan panel **belgilanmaydi**), `tsc` toza. DeepSeek API'da ikkala thinking rejimi jonli sinaldi (200 OK).

### Evaldan chiqqan beshta tuzatish — panel xarakteri, kontrast, halqa, teginish maydoni, rasm fallback'i
28 briefli Sonnet eval (187 ekran, `eval/out/2026-09-23-08-04-sonnet28`) va foydalanuvchi topgan ikki nuqsonning sababini qidirish natijasi. Hammasi kodda, promptga tegilmadi.

- **Panel shakli endi ilovaning xarakteridan** (`ShellService.navStyle`): `NAV_SETS` (utility / consumer / playful / bold) + dizayn tizimi va ilova turi bo'yicha jadval. `bar` rotatsiyaga qaytdi. Sabab: 28 ilovadan 15 tasi (54%) orol bo'lib chiqqandi va chetdan chetga panel umuman chiqmasdi — men Sleek'ning 5 ta skrinshotiga qarab "orol" ni qonun qilib qo'ygan edim. Chat, bank, notes kabi ilovalarda to'liq kenglikdagi panel to'g'ri yechim. Noto'g'ri test ("bar rotatsiyada yo'q") xarakter testiga almashtirildi.
- **Matn tokenlari AA dan o'tadi**: 23 ta `tokens.css` da `--meta` (va bir nechta `--muted`, `--fg-2`) ottenkasi saqlangan holda 4.5:1 ga ko'tarildi. Sabab: `--meta` 19 tizimda 2.05–3.5:1 edi, `craft/mobile.md` esa modelga aynan shu tokenni "metadata uchun" deb buyuradi, shuning uchun 187 ekranning 74 %ida past kontrast bor edi (median 3.0). `new-features.check.ts` endi har tizimning `--fg`, `--fg-2`, `--muted`, `--meta` tokenini `--bg` va `--surface` ga qarshi o'lchaydi.
- **Halqa ikkinchi markaz yozmaydi** (`lib/charts.ts`): sahifaning o'zi `position:absolute; inset:0` bilan markaz chizgan bo'lsa (CSS klasslaridan aniqlanadi), faqat yoy chiziladi. Sabab: foydalanuvchi ekranida "8 lessons" bizning markazimiz, "of 12 / lessons done" sahifaniki — ikkalasi ustma-ust tushgandi. Yo'l-yo'lakay `renderCharts` dagi xato tuzatildi: `SLOT` regexida to'rt guruh bor, offset argumenti noto'g'ri o'qilayotgan edi.
- **Teginish maydoni ko'rinadigan qutini kattalashtirmaydi** (`autofixScreen`): 44px `::after` endi ikonkali tugmalardan tashqari **barcha** tugmalarga beriladi. Sabab: audit "small-target" degach model `style="min-height:44px"` yozgandi, 44px trek ichidagi tugma 8px bo'rtib chiqqandi — foydalanuvchi yuborgan segmented skrinshoti aynan shu.
- **Rasm kelmasa, ustidagi matn o'qiladi** (`lib/image-slots.ts`): fallback bloki endi `--fg` ning 62–78 % aralashmasi — rasm o'rnini bosadigan to'q sirt. Sabab: och blokda oq sarlavha 1.00:1 bo'lib yo'qolardi.

- Fayllar: `app/Services/{ShellService,ScreenContext}.ts`, `app/Http/Controllers/{Plan,Generate}Controller.ts`, `lib/{charts,design-lint,image-slots}.ts`, `design-systems/*/tokens.css` (23), `app/Services/new-features.check.ts`.
- Tekshirildi: `npm run check` exit 0 (yangi testlar: xarakter bo'yicha panel tanlovi, har tizimning matn tokenlari AA, halqa ikkinchi markaz yozmasligi, matnli tugmaga ko'rinmas target, `min-height` yozilmasligi), `tsc` toza. **Brauzer**: foydalanuvchi yuborgan ikki ekran ta'mirlangan quvurdan qayta o'tkazilib, oldin/keyin yonma-yon render qilindi — halqadagi ustma-ust matn va trekdan bo'rtib chiqqan pill ikkalasi ham yo'qoldi.

### Generatsiyadan keyingi avtomatik tuzatish olib tashlandi (EYE-04 orqaga qaytarildi)
- Sabab: har ekran uchun qo'shimcha model chaqiruvi va kutish vaqti, foydasi esa isbotlanmagan. Birinchi generatsiya qanday chiqsa shunday qoladi.
- Olib tashlandi: `routes/p.$projectId.tsx` dagi avtomatik tuzatish effekti, `audits` va `checking` holatlari, modul darajasidagi `autoFixed` qo'riqchisi, kadrdan keladigan `onAudit` ulanishi va `ActivityCard` dagi "Checking the screens" qadami.
- Qoldi: serverdagi `fixFindings` + `auto: true` yo'li (chaqiruvchisi yo'q, lekin mexanizm va testlari joyida), `lib/render-audit.ts` va `eval/audit.ts` — sifatni **o'lchash** uchun kerak, tuzatish uchun emas.
- Fayllar: `routes/p.$projectId.tsx`, `components/canvas/ActivityCard.tsx`, `generate.ts`, `CLAUDE.md`.
- Tekshirildi: `npm run check` exit 0, `tsc` toza.

### Chat agent darajasiga ko'tarildi — CHAT-01…06, CHAT-08 (tahlil: `docs/CHAT-UPGRADE-PLAN.md`)
- **CHAT-01** Stop endi yuborish tugmasining o'zida, har qanday ish paytida: `running = working || planning || planRunning || checking` route'da bitta manba, `PromptBox` unga qaraydi (o'zining promise'iga emas — dashboard'dan boshlangan reja shu qutidan o'tmagan edi). `Esc` ham to'xtatadi (qutida ham, sahifada ham). Kartalar ichidagi underline "Stop" linklari yo'qoldi. Yuborilgan matn darhol tozalanadi, xatoda qaytadi.
- **CHAT-02** `components/canvas/ActivityCard.tsx` (yangi): spinner o'rniga qadamlar — "Planning the app · 8s", "Planned ✓ / Drawing 3 screens · 18s" har ekran holati va topilgan rasmlar soni bilan (qator bosilsa kanvas o'sha kadrga boradi), tahrirda "Working on “X” · Editing 2 parts: …" (`<affects>` dan, `parseAffects`), "Checking the screens". Manba faqat hodisalar va sahifa holati — model tokeni emas; tugagach o'sha faktlar agent xabarining "Agent log"ida.
- **CHAT-03** Ish paytida yozilgan xabar "Queued" bo'lib qutining tepasida turadi (✕ bilan), ish tugashi bilan avtomatik yuboriladi (`queued` + effekt). Server baribir bittasini qabul qiladi.
- **CHAT-04** Foydalanuvchi xabari ustida Edit & resend (matn qutiga qaytadi) va Copy; agent xabarida "Ask again" (oldingi so'rovni qayta yuboradi) va Copy; xato kartasida "Try again" tugmasi; bo'sh qutida `↑` oxirgi so'rovni qaytaradi.
- **CHAT-05** Skroll faqat o'quvchi pastda bo'lsa yopishadi; yuqorida bo'lsa "↓ N new / New activity" pillasi.
- **CHAT-06** O'zgargan ekran uchun agent xabarida **Before → After** eskizlari (`/api/thumb/$screenId?v=<versionId>` — snapshot'dagi HTML, o'sha egalik tekshiruvi bilan); Undo/Redo link emas, tugma; takliflar chiplari qutining tepasidan oxirgi agent xabarining ostiga ko'chdi.
- **CHAT-08** Rejani tasdiqlash darvozasi: `generatePlan` so'rovi `{ brief, gate }` yoki `{ approve: { keep, names } }`. `PlanController` `gate` bilan rejani yuborib `awaiting` bilan to'xtaydi, reja `PendingPlans` da (xotirada, 30 daqiqa) kutadi; tasdiqda `editPlan` (PlannerService) — olib tashlangan ekranlar ketadi, nomlar qoladi, slotlar/tablar `settleScreens` bilan qayta to'g'rilanadi — va kanvas ushlab turgan kadr id'lari bilan chiziladi. So'rov xabari bir marta yoziladi (rejada), javob chizilgach. Reja yo'q bo'lsa 409. Gate'siz (eval, eski API) hech narsa o'zgarmaydi. Kartada nomni o'zgartirish, ✕ bilan olib tashlash, "Draw N screens", Discard, "Don't ask next time" (`od:plan-gate`).
- CHAT-07 (qisqa briefga savol chiplari) `Keyin`da qoldi — sinovdan keyin.
- Fayllar: `PromptBox.tsx`, `components/canvas/{ChatPanel,ActivityCard}.tsx`, `routes/p.$projectId.tsx`, `routes/api/thumb/$screenId.ts`, `generatePlan.ts`, `app/Http/Controllers/PlanController.ts`, `app/Services/{PendingPlans,PlannerService}.ts`, `app/Http/Controllers/controllers.check.ts`.
- Tekshirildi: `npm run check` exit 0 (yangi testlar: gate'da `plan` + `awaiting` va hech qanday ekran yo'q, so'rov xabari bir marta; tasdiqda olib tashlangan ekran yo'q, nom saqlangan, kadr id'lari o'sha, `done`gacha chiziladi, kutayotgan reja yo'q bo'lsa 409; gate'siz eski xatti-harakat), `tsc` toza. **Brauzer** (:3100, Haiku): dashboard'dan "Plant care app…" → "Planning the app · 8s" va Stop yuborish tugmasida → tasdiqlash kartasi (PlantCare, 4 ekran) → "Profile" olib tashlandi, 1-ekran "My Plants" deb nomlandi → "Draw 3 screens" → "Planned ✓ / Drawing 3 screens" har ekran holati bilan → ish paytida yozilgan "Add a reminders screen" Queued bo'lib turdi va reja tugagach o'zi ketdi → xabar ustida Edit/Copy, "Checked “My Plants”…" xabarida Before → After, Undo tugma, takliflar ostida → tahrirda "Working on “Watering Schedule” · Editing 2 parts: todaytimeline, upcomingtimeline".

### Lokal provayderda "planning" qotib qolishi — thinking o'chirildi
- Sabab: `claude -p` Haiku bilan ham uzun o'ylash bloki yozardi. O'lchandi: bitta reja uchun 8 924 chiqish tokeni va **89 soniya** — foydalanuvchi buni qotib qolgan deb o'ylaydi. Model siyosatimizda thinking o'chiq (DeepSeek'da ham), lekin CLI yo'lida bu majburlanmagan edi.
- Endi `claudeCli` bola jarayoniga `MAX_THINKING_TOKENS=0` beradi (muhitdagi qiymat bo'lsa u yutadi). O'lchov: 8 924 → 2 075 token, 89s → **17s** (bir xil brief, "make habit tracker app").
- Fayllar: `app/Services/LlmService.ts`.
- Tekshirildi: planner uch marta ishga tushirildi (89s thinking bilan, 32s `MAX_THINKING_TOKENS=0` bilan qo'lda, 17s kod ichida), `npm run check` exit 0, `tsc` toza.

### Kadrlar telefon burchagini oldi
- Sabab: UI-02 dan keyin ekranlar to'g'ri burchakli to'rtburchak bo'lib qoldi — HTML parchasiga o'xshardi, qurilmaga emas.
- Endi qurilma kengligidagi kadr 40px burchak oladi (haqiqiy telefonnikiga yaqin), keng kadr (dizayn tizimi namunasi) 16px karta burchagida qoladi. Chizilmagan ekran o'rni va "chizilmadi" holati ham xuddi shu burchakni oladi, shuning uchun joy egallab turgan narsa kadrdan farq qilmaydi. Suzuvchi panel chetdan 12px ichkarida bo'lgani uchun burchakka kesilmaydi.
- Fayllar: `ScreenFrame.tsx`, `routes/p.$projectId.tsx`.
- Tekshirildi: `npm run check` exit 0, `tsc` toza, brauzerda (Verdant, 7 ekran) — burchaklar bukildi, ichki kontent kesilmadi.

### Lokal `claude-cli` provayderi standart holda Haiku 4.5 da ishlaydi
- Sabab: Sonnet bilan bitta ekran juda sekin chizilardi, lokal sinov esa o'zgarish tushgan-tushmaganini ko'rish uchun kerak, sifat uchun emas.
- Endi `claudeCli` doim `--model` beradi: `CLAUDE_CLI_MODEL` bo'lmasa `claude-haiku-4-5-20251001`. Kattaroq model kerak bo'lsa o'sha o'zgaruvchi bilan almashtiriladi. DeepSeek yo'liga ta'sir qilmaydi.
- Fayllar: `app/Services/LlmService.ts`, `CLAUDE.md`.
- Tekshirildi: `tsc` toza, `npm run check` exit 0.

### Pastki panel orol bo'ldi, ui-skills qoidalari kodga tushdi, ommaviy sahifalar — NAV-01…04, CRAFT-01…03, MKT-06/07 (tahlil: `docs/NAV-AND-CRAFT-PLAN.md`)
- Sabab: Sleek generatsiyalarida pastki panel doim suzuvchi orol, bizda esa `left:0;right:0;border-top` — iOS 12 ko'rinishi har ilovada. Panel har ekranda ko'rinadi, shuning uchun ilovaning "yili" shundan o'qiladi.
- **NAV-01** `ShellService`: `buildBottomNav` endi to'rt shakl chiqaradi — `island` (chetdan 12px, radius 28px, soya + `--fg` ning 8% hairline'i, yorliqli), `pill` (tor, markazda, yarim shaffof + blur, yorliqsiz), `contrast` (`--fg` bilan to'ldirilgan pill, `--bg` ikonkalar — to'q tizimda o'zi teskari bo'ladi), `bar` (eski). `navStyle(seed, tabCount)` FNV-1a bilan ilova nomidan tanlaydi (6+ tab bo'lsa yorliqsiz shakllar), model tanlamaydi; `PlanController` va `GenerateController` bir xil urug'ni ishlatadi (loyiha nomi = ilova nomi), shuning uchun keyin qo'shilgan ekran ham o'sha panelni quradi.
- **NAV-02**: faol tab endi shakl — yorliqli shakllarda ikonka+yorliq ortida `color-mix(--accent 14%)` pill, yorliqsizlarida ostida 4px nuqta; yorliqsiz tabda `aria-label` majburiy. Markazdagi harakat tugmasi `contrast` da `--bg` fonini oladi, aks holda fonga singib ketardi.
- **NAV-03** `navClearance(style)`: orol uchun 112px, eski bar uchun 88px; son promptga (`shellContract`) va normalizatorga bir manbadan boradi.
- **NAV-04** `eval/metrics.ts`: `shell.navStyle` (variantlar taqsimoti) va `shell.navWithoutClearance`.
- **CRAFT-01** `autofixScreen` ga bitta `data-od-craft` varag'i: raqamlarga `tabular-nums`, `h1..h3` ga `text-wrap:balance`, matnga `pretty`, rasm slotlariga `--fg` ning 10% outline'i, `:focus-visible` halqasi, bosilganda `scale(.96)` (faqat `prefers-reduced-motion: no-preference` ichida). Hammasi nol xususiyatli `:where()`, `!important` yo'q — sahifa o'zi belgilagan bo'lsa, sahifa yutadi.
- **CRAFT-02** `craft/mobile.md`: yangi "tells" bo'limi (CAPS eyebrow, o'rta nuqtali meta qatorlar, monospace yorliqlar, bir xil kartalar tarmog'i, dekorativ raqamlash), 1–2 shrift oilasi, 4–6 rang, bitta uyushgan kirish animatsiyasi (~100ms). Budjet saqlanishi uchun 11 ta zaifroq qoida qisqartirildi/olib tashlandi (kodga o'tgan `tabular-nums` qatori ham) — mobil system prompt 24 000 belgidan past.
- **CRAFT-03** `eval/metrics.ts` `tells`: `capsEyebrow`, `middleDotMeta`, `monoLabels`, `creamTerracotta`.
- **MKT-06** ommaviy sahifalar: `/systems` (33 tizim, tokenlardan chizilgan swatch), `/systems/$id` (uslub kartasi + o'sha tizimning jonli palitrasi, "Design an app in this style" tugmasi prompt bilan), `/playbook` (`src/content/playbook.ts` — har qoida: qoida, sababi va **qayerda majburlanishi**). Landing navigatsiyasiga ikkalasi qo'shildi.
- **MKT-07** `skill/mobile-app-screens/`: SKILL.md + `references/{shell,checklist}.md` — ui-skills katalogiga chiqarish uchun tayyor, lekin **nashr qilinmadi** (tashqi harakat, ruxsat kerak).
- Fayllar: `app/Services/{ShellService,ScreenContext}.ts`, `app/Http/Controllers/{Plan,Generate}Controller.ts`, `lib/design-lint.ts`, `craft/mobile.md`, `eval/metrics.ts`, `server/fns.ts`, `routes/{systems.index,systems.$id,playbook}.tsx` (yangi), `content/playbook.ts` (yangi), `Landing.tsx`, `app/Services/new-features.check.ts`, `skill/**` (yangi).
- Tekshirildi: `npm run check` (exit 0; yangi testlar: variantlar barqaror va turli ilovalarga turlicha tushadi, har shaklda `position:fixed`, qattiq oq yo'q, class yo'q, yorliqsizda `aria-label`, clearance eski bardan katta; craft varag'i bir marta qo'shiladi, `!important` yo'q, idempotent), `tsc` toza. **Brauzer**: to'rt shakl haqiqiy "Verdant — Shop" ekranida yonma-yon render qilindi (skrinshot) — orolning hairline'i to'q ekranda ko'rinadi, `contrast` oq pill bo'lib teskari bo'ladi, `pill` da nuqta ko'rinadi; `/systems`, `/systems/neobrutalism` (uslub kartasi + jonli palitra) va `/playbook` ochildi.

### Studio o'z palitrasi va kanvas ko'rinishi — UI-01…06 (tahlil: `docs/UI-THEME-PLAN.md`)
- Sabab: chrome shadcn standartida edi — xromasi nol kulranglar, deyarli qora "primary", 10px burchak. Sleek o'lchandi: ularda bitta **iliq** ramp (light va dark shundan olinadi) va rang faqat 3–4 boshqaruvda.
- **UI-01** `styles.css`: iliq (qum) ramp `#fdfcf8 … #100e0c`, matn `#34302c` (sof qora emas), dark fon `#100e0c` (sof qora emas), brend rangi `#0d9d78` (dark'da `#14b892`), `--radius: 1rem`, yangi `--canvas` / `--canvas-dot`. Sof kulrang qolmagani test bilan qo'riqlanadi.
- **UI-02** `ScreenFrame`: ekran endi kartada emas — ramka, burchak va `shadow-sm` o'rniga faqat "qog'oz" soyasi; kanvas foni `--canvas`, nuqtalar `--canvas-dot`.
- **UI-03**: tanlangan kadr ostida `390×1746` o'lcham yorlig'i; element ustida uning teg nomi (`od:hover_element` bridge xabari, teg va rect tekshiriladi); kadr asboblari tanlanganda doimiy ko'rinadi, hover'da miltillamaydi. Element ajratish rangi ham brend rangiga o'tdi.
- **UI-04** `ThemePanel`: Accent · Colours · Corners · Fonts bo'limlari yig'iladi (`<details>`), har rangda nima ekanini aytadigan izoh (`COLOR_TOKENS.hint`), accent namunasiga sichqoncha tekkanda kanvas darhol o'sha rangni ko'rsatadi va chiqqanda qaytadi — **saqlanmaydi** (`onPreview`, `themePreview`, hech qanday yozuv yo'q).
- **UI-05**: landing va dashboard qattiq yozilgan `black/…`, `bg-white`, `#FAFAF7` o'rniga tokenlarni ishlatadi; prompt qutisi `rounded-2xl`. Telefon maketi va qorong'i showcase bo'limi o'z ranglarida qoldi (ular atayin).
- **UI-06** `components/ThemeToggle.tsx` (yangi): bitta tugma — bosilsa light va dark orasida almashadi, menyu yo'q (birinchi versiyada Light/Dark/System menyusi edi, foydalanuvchi tanlovni ortiqcha deb topdi). Dashboard va studio tepa panelida bir xil; `__root.tsx` skripti saqlangan holatni birinchi chizishdan oldin qo'llaydi, shuning uchun oq miltillash yo'q.
- Fayllar: `styles.css`, `ScreenFrame.tsx`, `lib/edit-bridge.ts`, `lib/theme-override.ts`, `components/ThemeToggle.tsx` (yangi), `components/canvas/{Canvas,ThemePanel,FrameToolbar,TopBar}.tsx`, `routes/p.$projectId.tsx`, `routes/__root.tsx`, `Landing.tsx`, `Dashboard.tsx`, `PromptBox.tsx`, `app/Services/new-features.check.ts`.
- Tekshirildi: `npm run check` (exit 0, yangi test: rampda `oklch(x 0 0)` yo'q, `--canvas` ikki qiymatda, kadr kartadan chiqqan, root skripti `prefers-color-scheme`ni biladi), `tsc` toza. **Brauzer** (:3100): kanvas iliq va nuqtali, kadrlar ramkasiz, tanlovda `390×1746` yorlig'i va teg nomi (`p`) chiqdi; tema panelida bo'limlar yig'ildi, qizil namunaga hover — hamma ekran qizil bo'ldi, chiqqanda yashilga qaytdi (saqlanmadi); dashboard light va dark ikkalasida, Light/Dark/System menyusi ishladi; landing SSR javobida `black/…` va `#FAFAF7` qolmadi.

### Dizayn tizimi namunasi endi keng kadr, telefon shaklida emas (THM-09)
- Sabab: namuna 390×1100 (telefon kengligi) chizilardi, kanvasda oddiy ekranga o'xshab ketardi.
- Endi: kadr 900×640 (`DS_FRAME`), ichidagi tartib ikki ustun — chapda Colour va Radius, o'ngda Type va Components (`lib/ds-sample.ts` dagi `.cols`). `ScreenFrame` ixtiyoriy `width` oladi (standart — qurilma kengligi); keng kadr o'z balandligida qoladi, qurilma balandligiga cho'zilmaydi.
- Fayllar: `lib/ds-sample.ts`, `ScreenFrame.tsx`, `routes/p.$projectId.tsx`, `lib/element-ops.check.ts`.
- Tekshirildi: `npm run check` (exit 0, yangi tasdiq: ikki ustun), `tsc` toza. O'lchov: 900px kengligida kontent balandligi 587px (apple, midnight, brutalist — uchchalasida bir xil), gorizontal toshish yo'q, kadr 640px. **Brauzer** (:3100, Shopify tizimi): kadr ekranlardan aniq ajralib turadi, hech narsa kesilmaydi; Theme panelida accent o'zgartirilganda namuna darhol qayta bo'yaldi va hex qiymati (#db2777) ham yangilandi.

### Audit natijalari foydalanuvchiga ko'rsatilmaydi — o'zimiz tekshirib tuzatamiz (EYE-04)
- Sabab: kadr ustidagi "N ta muammo · Fix these N" chipi foydalanuvchiga nuqsonlar ro'yxatini ko'rsatardi — bu uning ishi emas. Ekran tayyor bo'lishi kerak, tekshiruv bizniki.
- Endi: chip, uning menyusi va `AUDIT_LABEL` interfeysdan olib tashlandi. Ekran render bo'lib joylashgandan keyin kanvas o'zi tuzatadi (`p.$projectId.tsx` effekti), har ekran uchun bir marta — qo'riqchi (`autoFixed`) komponentdan tashqarida, chunki React'ning development qayta-mount'i aks holda tuzatishni takrorlardi (Shop v2 va v3 bo'lib qolgandi). Oqimda faqat "Checking the screens…" qatori ko'rinadi.
- Suhbatda endi faqat agent gapiradi: `auto: true` so'rovda foydalanuvchi nomidan "Fix N problems…" xabarini yozmaydi, agent xabari esa "Checked “X” and fixed N rendering problems — now vN." Tuzatib bo'lmagani ekranda emas, log'da qoladi.
- Fayllar: `components/canvas/FrameToolbar.tsx`, `routes/p.$projectId.tsx`, `app/Http/Controllers/GenerateController.ts`, `generate.ts`, `app/Http/Controllers/controllers.check.ts`, `CLAUDE.md`.
- Tekshirildi: `npm run check` (exit 0) — yangi test: avtomatik tuzatishda bitta agent xabari qo'shiladi, foydalanuvchi nomidan hech narsa yozilmaydi; `tsc` toza. **Brauzer** (:3100, Verdant loyihasi): chip yo'q; bir ekranga ataylab past kontrastli qator qo'yildi — sahifa ochilgach o'zi tuzatildi (v2 → v3, bitta versiya, `#ededed` yo'qoldi), suhbatda faqat "Checked “Verdant Search Screen” and fixed 1 rendering problem — now v3."

### Figma'ga nusxalash bitta ekran bilan cheklanmaydi — FIG-06
- Sabab: `copyToFigma` bitta `screenId` olardi, shuning uchun bir nechta ekran tanlangan bo'lsa ham faqat bittasi ketardi.
- Endi: kadr menyusidan — o'sha ekran, agar u tanlanganlar ichida bo'lsa hammasi; eksport menyusida "Copy all screens to Figma" — butun ilova. Har ekran alohida nomlangan guruh (Figma'da alohida frame), kanvasdagi joyida (`odTreesToSvg`, chap-yuqoriga normallashtiriladi, id'lar ekranlar bo'ylab takrorlanmaydi).
- Fayllar: `lib/figma-svg.ts`, `lib/figma-copy.ts`, `lib/figma-svg.check.ts` (yangi), `routes/p.$projectId.tsx`, `components/canvas/TopBar.tsx`, `package.json`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: doska kengligi va balandligi, ekran boshiga bitta guruh, ikkinchisining joyi, bitta ekran bo'lsa oddiy SVG, id'lar noyob, rasm har URL uchun bir marta va chizilgan o'lchamda olinadi. **Brauzer** (:3100): eksport menyusidan butun ilova — 6 ekran, 428 guruh, 35 rasm, 1.3 MB; ikki ekran tanlab kadr menyusidan — 2 ekran, 1.0 MB. To'rt ekranli doska render qilib ko'rildi (skrinshot).

## 2026-09-22

### "Copy to Figma" — FIG-01, FIG-02, FIG-05 (reja: `docs/FIGMA-EXPORT-PLAN.md`)
- **FIG-01** `lib/figma-serialize.ts`: ekran o'z frame'i ichida (brauzer allaqachon joylashtirgan holda) neytral qatlam daraxtiga (`ODTree`) o'qiladi — frame'lar (fon, gradient, chegara, burchaklar, soya, clip), flex konteynerlar uchun layout (yo'nalish, gap, padding, tekislash — plagin Auto Layout'ga aylantiradi), matn (shrift, o'lcham, og'irlik, qator balandligi, rang, **har chizilgan satr alohida**), rasmlar (URL, object-fit), ikonka/grafik/xarita — ranglari hal qilingan SVG. Ranglar canvas orqali (oklab/color-mix ham). Qatlam nomlari markerlardan: "Tab bar", "Photo · …", "Chart · bar", "Icon · …", "Button · …". Ko'rinmas (opacity 0) elementlar o'tmaydi. Editor frame'lari `od:serialize` so'roviga javob beradi (`SERIALIZE_BRIDGE`, javob `parseTree` bilan tekshiriladi).
- **FIG-02** `lib/figma-svg.ts` + `lib/figma-copy.ts`: daraxt → bitta SVG (nomlangan guruhlar, to'rtburchak/yo'llar, `<text>`+`<tspan>` satrlari, clip'langan rasmlar, feDropShadow, ichki SVG ikonkalar); rasmlar Pexels'dan chizilgan o'lchamning 2 barobarida olinib base64 bo'lib ichiga joylanadi (Figma o'zi yuklamaydi). Frame ⋯ menyusi va o'ng tugma menyusida "Copy to Figma" → clipboard'ga SVG matni, Figma'da ⌘V — tahrirlanadigan qatlamlar. Cheklov: Auto Layout yo'q (FIG-03 plagini bilan).
- **FIG-05** `eval/figma.check.ts` (`npm run check` ichida): showcase ekranlarini 390px frame'da serializatsiya qilib, sahifaning o'zi ko'rsatgan matn, rasm va ikonkalar bilan solishtiradi.
- Fayllar: `lib/figma-serialize.ts`, `lib/figma-svg.ts`, `lib/figma-copy.ts`, `eval/figma.check.ts` (yangi); `ScreenFrame.tsx` (`serializeScreen`), `FrameToolbar.tsx`, `FrameContextMenu.tsx`, `routes/p.$projectId.tsx`, `package.json`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Qamrov (6 ekran, har ilovadan): **matn 100%, rasm 100%, ikonka 100%, flex → Auto Layout 99%**. SVG va asl ekran yonma-yon render (skrinshot): tuzilish, ranglar, ikonkalar, grafik va avatar/rasmlar mos. Brauzer (:3100): ⋯ → "Copy to Figma" → clipboard'da 55 matn satri, 7 rasm (hammasi ichida), 12 ikonka, 87 guruh; hajm 1 MB → rasmlarni 2x o'lchamda olish bilan 492 KB. Birinchi o'lchovdagi "ikonka 6/9" hisoblagich xatosi edi (opacity 0 ota element) — hisoblagich `checkVisibility` ga o'tkazildi. **Sinalmagan:** Figma'ning o'zida paste — sen bir marta tekshirishing kerak.

### Jonli preview: kod ko'rinmaydi, reload yo'q, skelet, rasmlar va balandlik oqim paytida — LP-01…05 (+ rasm/balandlik)
- **Tashxis** (ikki haqiqiy xom oqim yozib olindi — `eval/fixtures/streams/`; jonli DeepSeek generatsiyasi kuzatildi): 47 kadrdan 9 tasida (19%) **bizning** tema listener skriptimiz matn bo'lib chiqardi — `withLiveTheme` uni `</body>` yo'q chala HTML oxiriga qo'shardi va oqim teg/atribut o'rtasida uzilganda skript atributga tushardi; kadrlarning 40–52% oq (model avval 8–10 KB CSS yozadi, body oxirida); har 600 ms `srcDoc` almashib iframe to'liq qayta yuklanardi (Tailwind CDN qayta, brauzer 45 s muzlab qoldi); tugaganda yana reload, rasmlar va balandlik esa faqat oxirida.
- **LP-01** `lib/partial-html.ts` `repairPartialHtml`: preamble tashlanadi, oxirgi tugallanmagan teg/entity kesiladi, ochiq `<style>/<script>/<svg>/<!--` butunlay olib tashlanadi, hujjat yopiladi; streaming frame'ga hech qanday skript qo'shilmaydi.
- **LP-02** `lib/stream-frame.ts`: streaming frame bir marta ochiladi (skelet + runtime), keyin ota oyna repaired HTML'ni `postMessage` qiladi; runtime `<style>` matnini joyida yangilaydi, tashqi skript/stylesheet'ni (Tailwind, Lucide, shriftlar) bir marta qo'shadi, body'ni **idiomorph** (0BSD, `src/lib/vendor/idiomorph.ts` ga inline) bilan morph qiladi. Yangilanish 300 ms.
- **LP-03**: CSS bosqichida skelet shimmer va "Thinking… / Styling…" yozuvi; yangi tugunlar 240 ms reveal; frame chegarasi "nafas oladi" (`od-stream-ring`); rasm sloti yuklanguncha shimmer (alt matn ko'rinmaydi); `prefers-reduced-motion` hurmat qilinadi.
- **LP-04**: server ekran id'larini reja paytida beradi (`plan.screenIds`), canvas plan frame'ini shu id bilan kalitlaydi va ekran/plan frame'larini id bo'yicha tartiblaydi (iframe DOM'da ko'chsa qayta yuklanadi; dizayn tizimi frame'i oxirga); tugaganda haqiqiy ekran ostidagi yangi iframe'da yuklanadi, oqim frame'i tepada qolib 300 ms da so'nadi — reload ko'rinmaydi; canvas rasmlari darhol yuklanadi (`loading="lazy"` annotatsiyadan keyin olib tashlanadi).
- **Rasmlar oqim paytida** (foydalanuvchi so'rovi): `<img data-od-img>` tegi tugashi bilan server rasmni izlaydi (`prefetchImage`, kesh bilan), `screen_image` voqeasi bilan URL frame'ga boradi va o'sha zahoti qo'yiladi; saqlangan ekran xuddi shu keshdan xuddi shu rasmni oladi.
- **Balandlik oqim paytida** (foydalanuvchi so'rovi): runtime hujjat balandligini yuborib turadi, frame silliq o'sadi; saqlangan frame shu balandlikdan boshlaydi (keyin sakramaydi).
- **LP-05** `eval/stream.check.ts` (`npm run check` ichida, ~5 s): fixture oqimlarini headless Chrome'da haqiqiy runtime orqali o'ynatadi va sanaydi.
- Fayllar: `lib/partial-html.ts`, `lib/stream-frame.ts`, `lib/vendor/idiomorph.ts`, `eval/stream.check.ts`, `lib/partial-html.check.ts`, `eval/fixtures/streams/*` (yangi); `ScreenFrame.tsx`, `routes/p.$projectId.tsx`, `PlanController.ts`, `ImageService.ts`, `generatePlan.ts`, `styles.css`, `package.json`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Fixture o'lchovi (DeepSeek / Claude): **kodli kadr 0 / 0, bo'sh kadr 0 / 0, iframe load 1 / 1, rasmlar 5/5 / 5/5, balandlik 844→1033 / 844→2389**. Brauzer (DeepSeek, :3101, 3 ta to'liq generatsiya): oqim paytida streaming iframe'lar 0 marta qayta yuklandi, skelet va "Thinking…" ko'rindi, rasmlar ekran yozilayotganda paydo bo'ldi, frame'lar o'sdi; tugaganda 6/6 ekran crossfade bilan almashdi. Birinchi versiyada skelet 0 px balandlikda chizilmagani (html{height} yo'q) va runtime'dagi regex template literal ichida qochirilmagani (rasm 0/5) harness bilan topilib tuzatildi.

### Brief sanagan ekranlar soni hurmat qilinadi — GQ-06
- Sabab ("Feast"): brief "presented on two smartphone screens" degan, reja 6 ta ekran chizdi.
- `screenCountAsked` (en "two smartphone screens" / "3 screens", uz "ikki ekranli", "3 ta ekran", ru "4 экрана"; "screen time tracker", "two-factor auth screen", 6 dan ortiq son — hisob emas) va `trimToBrief`: rejani shu songa qisqartiradi — so'ralgan ekranlarni qamraganlar birinchi, keyin qolganlari tartibda; slotlar, linklar, tablar va tab nomlari qayta moslanadi (`settleScreens` — `parsePlan` ham shuni ishlatadi). `planScreens` ham asosiy, ham tuzatish rejasiga qo'llaydi.
- Eval to'plamiga 3 ta brief (28 ta): `feast-two` (foydalanuvchining Feast brief'i), `courier-map` (xarita + dark theme), `uz-three` (o'zbekcha, "3 ta ekran", yashil, yumaloq); uchalasi `designSystem: "auto"` — eval ham mahsulot kabi tanlaydi.
- Fayllar: `PlannerService.ts`, `eval/briefs.json`, `eval/run.ts`, `eval/eval.check.ts`, `services.check.ts`, `CLAUDE.md`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: son aniqlanadi va yolg'on mosliklar yo'q; 6 ekranli Feast rejasi → aynan "Feast Home" va "Cart", tablar Home/Cart, olib tashlangan ekranlarga linklar yo'q, asl reja o'zgarmaydi, son bo'lmasa qisqartirish yo'q.

### Xarita kodda chiziladi — GQ-04
- Sabab ("Feast" Order Tracking): model xaritani `data-od-img="city street map…"` deb so'radi, Pexels ko'cha fotosini berdi. Saqlangan run'larda xaritalar yo foto (har run'da 1 ta), yo qo'lda chizilgan div "doodle" (`map-doodle`, `map-preview__lines`).
- `lib/maps.ts` `renderMaps` (`autofixScreen` ichida, grafiklardan keyin, rasm qidiruvidan oldin): `<div data-od-map data-pins="…" data-route data-you>` → token ranglaridagi tekis ko'cha rejasi SVG (ko'chalar, park, suv, yorliqli pinlar, accent marshrut, "siz shu yerdasiz" nuqtasi), deterministik — bir ekran har renderda bir xil. "map / route / directions" so'ragan rasm sloti xarita slotiga aylantiriladi (klass va stil saqlanadi). Standart o'lcham nol spetsifiklikdagi qoidada (konteynerni to'ldiradi, kamida 200px) — birinchi variantdagi inline 220px modelning 58vh zonasini bosib ketgani skrinshotda ko'rindi va shu bilan tuzatildi. Mobil prompt'ga bitta qator (prompt 23.1k, byudjet 24k).
- Eval metrikasi `maps.drawn`, `maps.photoAsMap`.
- Fayllar: `lib/maps.ts` (yangi), `lib/design-lint.ts`, `PromptComposer.ts`, `eval/metrics.ts`, `services.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: pin yorliqlari, accent marshrut, faqat token ranglar, modelning balandligi saqlanadi, idempotent va deterministik, xarita foto sloti xaritaga aylanadi, boshqa rasmlarga tegilmaydi. **LLM'siz qayta qo'llash:** Feast Order Tracking — ko'cha fotosi o'rnida zonani to'ldirgan ko'cha rejasi, modelning o'z pin yorliqlari ustida (skrinshot).

### Dizayn tizimi avtomatik tanlanadi ("Auto") — GQ-03
- Sabab: tanlanmasa hamma loyiha `minimal` (ko'k, oddiy) bo'lib qolardi — ovqat ilovasi ham, bank ham bir xil ko'rinardi.
- `DesignSystemService.autoFor(brief, appType)`: brief nomlagan uslub (neo-brutalism, glass, neon, retro, hand-drawn, bento, luxury, dark theme, playful/kids, minimal) ustun; aks holda ilova turi (`AppPatternService.classify`): fintech → stripe, food-delivery / marketplace / booking / travel → airbnb, commerce → shopify, fitness → nike, health → apple, learning → duolingo, media → spotify, productivity → notion, social → apple; hech narsa bo'lmasa minimal. `createProject` endi `designSystem: 'auto'` va `brief` qabul qiladi, server tanlaydi. Dashboard'da standart tanlov "Auto" (tanlagichda birinchi karta); landing'dan kelgan prompt ham "Auto".
- Reja kartasiga "Stop generating" qo'shildi: dashboard'dan boshlangan rejada prompt maydonining Stop tugmasi yo'q edi (GQ-07 bilan birga — Stop endi `stopPlan`).
- Fayllar: `DesignSystemService.ts`, `ProjectController.ts`, `server/fns.ts`, `Dashboard.tsx`, `routes/index.tsx`, `routes/p.$projectId.tsx`, `controllers.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: ovqat → airbnb, neobank → stripe, til o'rganish → duolingo, "neo-brutalist" → neobrutalism (turdan ustun), "dark theme" → midnight, hech narsa → minimal, qo'lda tanlangani saqlanadi. **Brauzer** (:3100, Claude): tanlagich "Auto"; "Language learning…" → `duolingo`; "Crypto wallet with a dark theme…" → `midnight`; reja saqlangach reja kartasidagi "Stop generating" → run to'xtadi (0 ekran, chatda "Stopped before the rest were drawn", `stopped: true`). Bir run kod o'zgarganda Vite SSR qayta yuklanib yo'qoldi — faqat dev hodisasi (bitta jarayonli server, `PlanRuns` xotirada).

### Brief so'ragan rang va burchaklar loyiha temasiga aylanadi — GQ-02
- Sabab ("Feast"): brief "light color palette with yellow accents, rounded corners" degan, natija `minimal` tizimining ko'k rangida chiqdi — brief'dagi uslub so'zlari hech qayerda o'qilmasdi.
- `briefStyle(brief)` (`lib/intent.ts`): `#hex` har qayerda; rang so'zi (en/uz/ru, chatdagi ro'yxat bilan bir xil) faqat accent so'zi yonida — "yellow accents", "primary colour: teal", "buttons in orange", "sariq rangli"; "a red wine shop", "green owl mascot", "Yellow taxi", "Black Friday" — mavzu, rang emas. Burchaklar: "rounded corners / pill-shaped" → round, "sharp/square corners, brutalist" → sharp. `PlanController` reja boshida natijani loyiha temasi qiladi (render vaqtida hamma ekranga qo'llanadi) — faqat tema bo'sh bo'lsa, qo'lda qo'yilgani almashtirilmaydi; agent jurnalida "From the brief: accent yellow, rounded corners".
- Sariq accent `#ca8a04` (xantal) → `#eab308` (yorqin; tema qatlami ustiga qora matn qo'yadi) — chatdagi "make it yellow" ham shu.
- Fayllar: `lib/intent.ts`, `PlanController.ts`, `services.check.ts`, `controllers.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: Feast brief'i → `{accent: #eab308, radius: round}`, hex, "primary colour", 4 ta mavzu so'zi rangga aylanmaydi; reja temani saqlaydi va jurnalga yozadi; qo'lda qo'yilgan tema saqlanadi.

### Sahifa yopilsa ham ilova oxirigacha chiziladi — GQ-07
- Sabab (foydalanuvchining "LingoLoop" loyihasi): reja tuzilib pul to'langandan keyin sahifa yangilangan yoki yopilgan — oqim bekor qilinishi generatsiyani to'xtatardi, natija 0 ekran.
- Endi rejali run sahifaga bog'lanmagan: oqim bekor qilinsa voqealar yuborilmaydi, chizish davom etadi (`PlanController`, `X-OD-Detached` sarlavhasi). To'xtatish faqat Stop orqali: yangi `POST /api/stop-plan` (shu sayt, kirgan, o'z loyihasi) → `PlanRuns.stop`. `guardGeneration` detached run uchun "bir vaqtda bitta" qulfini sahifa yopilganda emas, run haqiqatan tugaganda ochadi (`finish`). Loyihaga qaytgan odam "Still designing this app…" va Stop'ni ko'radi, kanvas har 3 soniyada yangilanadi (`show().planRunning`). Tahrir (bitta ekran) avvalgidek: sahifa yopilsa to'xtaydi.
- Fayllar: `app/Services/PlanRuns.ts`, `routes/api/stop-plan.ts` (yangi); `PlanController.ts`, `server/guard.ts`, `routes/api/generate-plan.ts`, `ProjectController.ts`, `routes/p.$projectId.tsx`, `controllers.check.ts`, `new-features.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: javob oqimi darhol bekor qilinsa ham ikkala rejali ekran saqlanadi, `onFinish` bir marta chaqiriladi, chatda "Stopped" yo'q; Stop kutib turgan run'ni to'xtatadi — ekran chizilmaydi, chat "stopped" deydi. **Brauzer** (:3100, Claude): dashboard'dan "tip calculator" → reja saqlangach sahifa yangilandi → banner chiqdi, run davom etdi va 4/4 ekran saqlandi, chat "Designed 4 screens". Jonli run'da Stop brauzerda sinalmadi (run Stop'dan oldin tugadi) — unit test qamraydi.

### Tab o'z ekraniga zid nomlanmaydi — GQ-05
- Sabab ("Feast"): rejalashtiruvchi Cart ekranini `profile` tabiga bog'lagan; `assignScreenSlots` aniq da'voni tekshirmay qabul qilgan — Cart ekranida pastki panelda "Profile" yonardi.
- `alignTabLabels` (`parsePlan` ichida): bo'lim so'zlari guruhlari (home/today/feed…, cart/basket…, profile/account, orders/tracking…, stats/progress/history… va h.k.); root ekran nomi bir guruhga, tabi boshqa guruhga tegishli bo'lsa, tab ekranning bo'lim so'zini va unga mos ikonkani oladi. Bir guruh ichidagi sinonimlar ("Today" → "Home", "Order Tracking" → "Orders"), ilova nomidagi so'zlar ("Nova Wallet"), birlik/ko'plik va boshqa yozuvdagi nomlar tegilmaydi.
- Fayllar: `app/Services/PlannerService.ts`, `services.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Test: Cart → "Cart" + `shopping-cart`, sinonim saqlanadi, kirillcha nom tegilmaydi. **Saqlangan rejalarda qayta qo'llash** (4 baza, 125 root ekran): birinchi, so'z mosligiga asoslangan variant 18 ta tabni o'zgartirardi — ko'pi to'g'ri sinonimlar edi, shuning uchun guruhli qoidaga o'tildi; yakuniy qoida faqat 1 ta tabni o'zgartiradi — aynan Feast'dagi Profile → Cart.

### Rasm sloti qulfi model bergan o'lchamni buzmaydi — GQ-01
- Sabab (foydalanuvchining "Feast" Cart ekranida topildi): rasm sloti to'ldirilganda inline `display:block;width:100%;aspect-ratio:4/3` qo'yilardi; inline stil modelning `.cart-thumb{width:64px}` klassidan ustun — ro'yxatdagi kichik rasm butun qatorni egallab, matn 0px ustunga siqilardi. Rasm topilmagan zaxira blokida ham, avatar (40px) va logo (56px) standart o'lchamlarida ham shu muammo.
- Endi standart o'lchamlar nol spetsifiklikdagi `:where(...)` qoidasida (`SLOT_CSS`, sahifa `<head>` iga bir marta, sahifaning o'z stillaridan oldin); inline'da faqat `object-fit` va fon rangi qoladi — model klass bilan bergan har qanday o'lcham yutadi.
- Render auditiga `squeezed-text` qoidasi: matn tor ustunga siqilgan (ko'rinish filtridan oldin tekshiriladi, chunki siqilgan blok 0px bo'lishi mumkin; sr-only va ataylab tor ustunlar hisobga olinmaydi). "Fix these N" uni tuzatishni biladi (`min-width:0; flex:1` matnga, `flex:none` qo'shniga).
- Fayllar: `lib/image-slots.ts`, `lib/render-audit.ts`, `components/canvas/FrameToolbar.tsx`, `image.check.ts`, `element-ops.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: klass o'lchami bor rasmda inline o'lcham yo'q, standart qoida bitta va sahifa stillaridan oldin, avatar/logo standarti qoida orqali, `squeezed-text` topilma va Fix ko'rsatmasi. **LLM'siz qayta qo'llash**: Feast Cart — rasmlar 64px, matn to'liq (skrinshot); saqlangan DeepSeek eval ekranlari (`var02-variants`, 54 ta) — `squeezed-text` 12 → 3; qolgan 3 tasida model rasmga umuman o'lcham bermagan (endi audit topadi va Fix tuzatadi). Claude run'ida (26 ta) topilgan 2 ta yolg'on topilma (sr-only label, ataylab tor vaqt ustuni) qoidani aniqlashtirib yo'qotildi.

### Faqat mobil: desktop loyiha yaratish olib tashlandi
- Yangi loyiha doim `mobile` (`ProjectController.store`, `/api/generate`, `createProject` endi qurilma qabul qilmaydi); dashboard'dagi qurilma tanlovi olib tashlandi. Eski desktop loyihalar ochiladi va ko'rinadi. Desktop prompt yo'li kodda qoldi — tozalash GQ-12.
- Fayllar: `ProjectController.ts`, `GenerateController.ts`, `server/fns.ts`, `Dashboard.tsx`, `routes/index.tsx`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza.
- Reja: `docs/GENERATION-QUALITY-PLAN-2.md` (foydalanuvchining "Feast" va "LingoLoop" generatsiyalari tahlili, GQ-01…12 `Keyin` bo'lib Notion'ga qo'shildi).

### Admin panel — ADM-01…08, OBS-05 (reja: `docs/ADMIN-PLAN.md`)
- **Kirish (ADM-01).** Better Auth `admin` plagini (migratsiya 0019: `user.role`, `banned`, `ban_reason`, `ban_expires`, `session.impersonated_by`, `admin_actions`, `settings`, `messages(project_id, created_at)` indeksi). Admin — `role = 'admin'` yoki `ADMIN_EMAILS` dagi email (`isAdmin`). `requireAdmin()` — boshqaga 404; `/admin` route `beforeLoad` da tekshiradi, sahifa sarlavhasi ham faqat adminga (`head()` rad etilganga ham ishlaydi). Har admin server funksiyasi (`server/admin-fns.ts`) `requireAdmin` va validatsiya bilan. Hisob menyusida adminga "Admin panel".
- **Overview (ADM-02).** 24 soat / 7 / 30 kun KPI'lari oldingi davrga nisbatan (yangi va faol foydalanuvchilar, ekranlar, xarajat, loyihalar, chaqiruvlar, xato ulushi, 👍 ulushi), "Right now" (pauza, hozir ishlayotganlar, bugungi xarajat va byudjet, o'rtacha vaqt), aktivatsiya (loyiha qilgan, 2+, ertasi kuni qaytgan), 30 kunlik grafiklar (Recharts), oxirgi xatolar.
- **Users (ADM-03, OBS-05).** Saralanadigan va qidiriladigan jadval (holat, qo'shilgan, oxirgi kirish, loyiha, ekran, 24 soat chaqiruv, xarajat, 👍/👎); foydalanuvchi sahifasi — loyihalar rasm bilan, harakatlar tarixi, chaqiruvlar, 30 kunlik grafik.
- **Amallar (ADM-04).** Ban (sabab bilan, hamma sessiyalar o'chadi, qayta kira olmaydi — plagin 403; `userFrom` banned'ni kirmagan deb hisoblaydi), unban, hamma joydan chiqarish, admin qilish yoki olish (o'zini emas), foydalanuvchiga alohida kunlik limit. Hammasi tasdiq va jurnal bilan.
- **Projects (ADM-05).** Hamma loyihalar egasi bilan; loyiha sahifasi faqat o'qish uchun — ekranlar (`/api/thumb` endi adminga ham ochiq), reja va ma'lumot modeli, suhbat. HTML sahifa bilan birga yuborilmaydi.
- **Generations (ADM-06).** `llm_calls` jurnali (faqat xatolar, provayder filtri), xatoli ekranlar sababi bo'yicha, dizayn tizimi va arxetip kesimi.
- **Feedback (ADM-07).** 👎 va qayta chizilgan ekranlar galereyasi; "Export edit pairs" — JSONL yuklab olish.
- **Controls (ADM-08).** `settings` jadvali: pauza, kunlik chaqiruv limiti, kunlik byudjet — deploysiz; `UsageService.limits()` sozlamani env/koddan ustun qo'yadi (env `GENERATION_PAUSED=1` baribir to'xtatadi); tizim ma'lumoti; admin jurnali.
- `@tanstack/react-table` o'rniga o'z `DataTable` (v9 API'si butunlay o'zgargan, bizga saralash/qidiruv/sahifalash yetadi); yangi bog'liqlik faqat `recharts`.
- Fayllar: `database/migrations/0019_add_admin.ts`, `app/Models/{Setting,AdminAction,User}.ts`, `app/Services/AdminStatsService.ts`, `app/Http/Controllers/AdminController.ts`, `server/admin-fns.ts`, `admin/ui.tsx`, `routes/admin*.tsx` (8 ta) — yangi; `AuthService.ts`, `server/auth.ts`, `UsageService.ts`, `ProjectController.ts`, `routes/api/thumb/$screenId.ts`, `AccountMenu.tsx`, `Dashboard.tsx` (eksportlar), `schema.ts`, `migrate.ts`, `controllers.check.ts`, `.env.example`.
- Tekshirildi: `npm run check` (3 marta ketma-ket exit 0 — joriy davr chegarasi shu soniyada yozilgan qatorni tashlab yuborayotgani topildi va tuzatildi), `tsc` toza. Testlar: `ADMIN_EMAILS`/rol, ban sababi bilan va sessiyalar o'chadi, o'zini ban/admin'dan chiqarib bo'lmaydi, paneldagi pauza generatsiyani 503 qiladi, noto'g'ri qiymat rad etiladi, foydalanuvchi limiti global'dan ustun, tozalansa default, har yozuv jurnalda, 30 kunlik qator. **Brauzer** (:3100, data.db nusxasi): mehmon va oddiy foydalanuvchiga `/admin` — Not Found; admin: Overview KPI va grafiklar; Users → foydalanuvchi → Ban ("test ban") → bazada `banned=1`, sessiyalar 0, shu foydalanuvchi email havolasi bilan kira olmadi (403) → Unban; limit 300 → `settings` da, keyin default; Controls → Pause → egasining loyihasiga `/api/generate` 503 → Resume; Generations jadvali; loyiha sahifasi (7 ekran, reja, suhbat); Feedback kartasi (sinov qatori bilan, keyin o'chirildi) va eksport ("2 pairs exported"); 390px da 6 sahifaning hech biri toshmaydi (Generations'da topilgan 44px toshish tuzatildi).
- **Qolgan:** bloklangan odam kirmoqchi bo'lsa oddiy 403 sahifani ko'radi (tushuntirishsiz); impersonatsiya, ogohlantirishlar, CSV — `Keyin`.

### Platforma kartalari, art-yo'nalish va estetika bloki yakunlandi — HIG-01, HIG-02, VAR-01, VAR-03
- Art-yo'nalish accent miqdorini hal qilmaydi: `friendly` yo'nalishida doiralar sokin tizimda neytral rangda, accent faqat yorqin tizimda; blokda "accent miqdori — dizayn tizimining qarori" (`src/lib/art-direction.ts`).
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. **Eval (Claude):** `higvar-claude` (4 brief) kit02 bazasiga nisbatan — bir turdagi ekranlar o'xshashligi 0.197 → 0.144 (−27%), rasmli ekranlar 15% → 19%, qo'lda chizilgan grafik 2 → 1, xato 0; lekin accent-energy ogohlantirishi 3 → 5. Tuzatishdan keyin `energy-claude` (2 brief): lint toza ulush 0.667 → 0.769, fit-tracker'dagi mismatch yo'qoldi. Qolgan habit-quest mismatch'lari (Midnight — past energiyali tizim, o'yinli ilova) bazada ham bor edi — yo'nalishdan emas. `dataItemsUsedShare` pasayishi Stride'da: rejadagi "Mon – Rest" kabi birlashgan nomlar ekranda bo'lib yoziladi, metrika aniq satr qidiradi — ma'lumot yo'qolgani emas. Ishga tushirishdan oldin DeepSeek'da bitta kichik qayta tekshiruv qoladi.

### Dashboard — DSH-03…12 (reja: `docs/DASHBOARD-PLAN.md`)
- **Qobiq (DSH-10).** Chap yon panel: logo, Home / Projects / Examples, "Recent" (oxirgi 6 loyiha, kichik rasm va "2 hours ago" bilan), pastda kunlik limit va hisob. Telefonda panel yashiriladi, yuqorida logo, tema tugmasi va avatar.
- **Jonli kichik rasm (DSH-11).** Yangi route `/api/thumb/$screenId`: faqat egasiga (boshqaga va kirmaganga 404), loyiha temasi qo'llanadi, `Content-Security-Policy: sandbox allow-scripts` — to'g'ridan-to'g'ri ochilsa ham generatsiya HTML'i bizning origin'da ishlamaydi. Kartada `loading="lazy"` iframe — loader'ga HTML kirmaydi.
- **Karta (DSH-04).** Birinchi ekran (telefon ramkasida yoki desktop), nom, "N screens · 2 hours ago", dizayn tizimi rang nuqtasi, ⭐, ⋯ (Rename, Delete tasdiq bilan). Tartib — oxirgi o'zgarish bo'yicha. `Project.cardsForUser`: bo'sh (xato) va o'chirilgan ekranlar sanalmaydi, muqova — birinchi ko'rinadigan ekran, oxirgi o'zgarish — eng yangi xabar (har o'zgarish xabar yozadi).
- **Qidiruv, sevimlilar, grid/ro'yxat (DSH-05, DSH-08).** Migratsiya 0018 `projects.favorite`, `favoriteProject` server funksiyasi (`requireProject`). Ko'rinish tanlovi `localStorage` da.
- **Dizayn tizimi kartalari (DSH-07).** Nomlar ro'yxati o'rniga 33 ta karta: tizimning foni, shrifti bilan "Aa", accent va kategoriya. `DesignSystemService` endi `swatch` beradi (`swatchOf`: `tokens.css` izohlaridagi yozuvlar emas, birinchi to'g'ri qiymat; faqat literal rang va oddiy shrift nomi o'tadi).
- **Ilhom kartalari va bo'sh holat (DSH-03, DSH-06).** 4 ta karta — landingdagi haqiqiy natijalar; bosilsa tavsif va tizim to'ldiriladi (generatsiya o'zi boshlanmaydi). Loyihasi yo'q odamda loyihalar bo'limi yo'q, sarlavha "New here? Start from one of these".
- **Limit (DSH-12).** "Today N / 150" progress; 80% da sariq, 100% da qizil va izoh. `UsageService.callsToday` — limit tekshiruvi ham shuni ishlatadi.
- **Qorong'i rejim (DSH-09).** Tugma, tanlov `localStorage` da, `<head>` dagi kichik skript birinchi chizishdan oldin qo'yadi (oq miltillash yo'q). Muharrir ham shadcn tokenlari bilan qorong'i bo'ladi; landing o'z ranglarida qoladi.
- Qurilma standart qiymati endi `iPhone` (avval `desktop`).
- Fayllar: `src/Dashboard.tsx`, `src/routes/api/thumb/$screenId.ts`, `database/migrations/0018_add_favorite_to_projects.ts` (yangi); `routes/index.tsx`, `routes/__root.tsx`, `Landing.tsx` (`Phone`, `SETS` eksport), `Models/Project.ts`, `ProjectController.ts`, `DesignSystemService.ts`, `UsageService.ts`, `server/fns.ts`, `schema.ts`, `migrate.ts`, `controllers.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: karta sanog'i (xato va o'chirilgan ekran yo'q), muqova, faqat o'z loyihalari, yulduz saqlanadi, swatch izohni emas deklaratsiyani oladi va `var()`/`url()` ni o'tkazmaydi. **Brauzer** (data.db nusxasi, :3100): 12 loyiha kartasi haqiqiy ekranlar bilan; `/api/thumb` egasiga 200 va CSP bilan, cookie'siz 404, yo'q id 404; ⭐ → Favorites'da faqat shu loyiha, bazada `favorite=1`; qidiruv "zzz" → "No projects match", "lingua" → bitta; ro'yxat ko'rinishi va eslab qolinishi; ilhom kartasi → tavsif va "Stripe" to'ldirildi; 33 kartali tanlagich; qorong'i rejim qayta yuklaganda ham qoladi (muharrir ham); yangi hisob — bo'sh holat, 0/150; 390px da toshish yo'q.

### Landing sahifa, birinchi versiya — MKT-01 (jarayonda)
- `/` kirmagan mehmonga landingni, kirgan foydalanuvchiga dashboard'ni ko'rsatadi (bir URL; `beforeLoad` endi `/login` ga yo'naltirmaydi, loader faqat kirganda ishlaydi). Muharrir va preview hali ham himoyalangan.
- Landing (`src/Landing.tsx`, reja: `docs/LANDING-DASHBOARD-PLAN.md`, "Studio ink" yo'nalishi, faqat inglizcha): hero (sarlavha + tavsif maydoni + 4 ta taklif chipi + haqiqiy ekranli 3 telefon), "Every screen agrees" (bitta ilovaning 5 ekrani + 4 dalil), qorong'i galereya (4 ta ilova, tab bilan, prompt ko'rsatiladi), 3 qadam, imkoniyatlar bento, FAQ (`<details>`), yakuniy chaqiruv, footer. Hamma ekranlar soxta emas — eval run'idan (`2026-09-22-09-34-higvar-claude`) `public/showcase/` ga ko'chirilgan va `sandbox="allow-scripts"` iframe'da kichraytirib ko'rsatiladi.
- "Prompt birinchi, kirish keyin": landingda yozilgan tavsif `sessionStorage` da saqlanadi, kirilgach dashboard darhol mobil loyiha yaratib generatsiyani boshlaydi.
- Brend nomi hali tanlanmagan — `BRAND` konstantasi (`Landing.tsx`).
- Fayllar: `src/Landing.tsx` (yangi), `public/showcase/*.html` (24 ekran, 792 KB), `src/routes/index.tsx`, `src/styles.css`.
- Tekshirildi: `tsc` toza, `npm run check` (exit 0). Brauzer (data.db nusxasi, :3100): mehmon `/` da landing (5 bo'lim sarlavhasi, 6 FAQ, gorizontal toshish yo'q); 390px kenglikda ham toshish yo'q; tavsif yozib "Design it" → `/login?next=/`, prompt saqlangan → email havola → `/p/…` ochildi, bazada `mobile` loyiha va birinchi xabar aynan shu prompt. Qolgan: narxlar bloki, OG rasm (MKT-02), huquqiy havolalar (LEG), brend.

### Hisoblar, egalik, xavfsizlik va limitlar — B1 (AUTH-01/02/05–09, OWN-01…05), B2 (SEC-01/02, LIM-01…03, OBS-01)
- **Kirish (Better Auth 1.7.5, Drizzle + SQLite).** Google yoki emailga havola; parol saqlanmaydi (AUTH-01). Migratsiya 0016: `user`, `session`, `account`, `verification` va `projects.user_id`. `AuthService` (sessiya 30 kun), `/api/auth/*` route, `lib/auth-client.ts`. `/login` sahifasi: "Continue with Google" (kalit bo'lsa), email havola, "Check your email" holati, `next` faqat ichki yo'l. Email provayderi hali yo'q (EML-01): devda havola server logiga chiqadi, productionda rad etiladi — AUTH-04 `Bloklangan`.
- **Egalik (OWN-01…05).** Har server funksiyasi `requireUser` / `requireProject` / `requireScreen` (`server/auth.ts`) orqali: loyiha faqat egasiga, begonaga 404 (borligini ham aytmaydi). `/api/generate` va `/api/generate-plan` — `server/guard.ts`: kirish, egalik, keyin controller. Ko'rish sahifasi ham himoyalangan (OWN-04). Hisoblardan oldingi loyihalar birinchi kirgan odamga o'tadi (`Project.adoptOrphans`, Better Auth user-create hook). Bosh sahifa, muharrir, preview — `beforeLoad` bilan `/login?next=…` ga (AUTH-07). Controller'lar chaqiruvchiga ishonadi — eval va testlar ularni to'g'ridan-to'g'ri chaqiradi.
- **Hisob (AUTH-08/09).** Bosh sahifa va muharrir yuqori panelida avatar (rasm yoki bosh harflar): ism, email, Sign out, Delete account → tasdiq → foydalanuvchi o'chadi, loyihalar, ekranlar, versiyalar, xabarlar, sessiyalar cascade bilan.
- **Xavfsizlik (SEC-01/02).** Server funksiyalarining kirishi `server/validate.ts` bilan (id, matn uzunligi, son, ruxsat etilgan qiymatlar) — noto'g'ri bo'lsa 400, controller ishlamaydi. Streaming POST'lar boshqa `origin` dan kelsa 403; server funksiyalari Better Auth'ning `SameSite=Lax` cookie'lari bilan himoyalangan. Klientdan ixtiyoriy HTML qabul qilib saqlaydigan va himoyasiz qolgan eski "critique" funksiyalari (UI'da ishlatilmaydi) va `CritiquePanel.tsx` o'chirildi.
- **Xarajat va limitlar (OBS-01, LIM-01…03).** Migratsiya 0017 `llm_calls`: har model chaqiruvi — foydalanuvchi, loyiha (so'rov konteksti `AsyncLocalStorage` bilan, controller'lar o'zgarmagan), provayder, tokenlar, narx (`LlmService.PRICE`/`costOf`, obuna chaqiruvlari $0), vaqt, natija, xato. `LlmService` har chaqiruvni bir marta xabar qiladi (`onLlmCall`, qanday tugashidan qat'i nazar). `UsageService.refusal`: kuniga 150 chaqiruv foydalanuvchiga (`LIMIT_CALLS_PER_DAY`), bir vaqtda bitta generatsiya (oqim tugaguncha yoki Stop), butun servis uchun kunlik byudjet $5 (`LLM_DAILY_BUDGET_USD`), to'xtatish tugmasi `GENERATION_PAUSED=1` — hammasi odam tilidagi xabar bilan (429 / 503).
- Fayllar: `database/migrations/0016_create_auth_tables.ts`, `0017_create_llm_calls_table.ts`, `app/Services/AuthService.ts`, `UsageService.ts`, `app/Http/Controllers/AccountController.ts`, `server/auth.ts`, `server/guard.ts`, `server/validate.ts`, `lib/auth-client.ts`, `routes/login.tsx`, `routes/api/auth/$.ts`, `components/AccountMenu.tsx` (yangi); `schema.ts`, `migrate.ts`, `Models/Project.ts`, `ProjectController.ts`, `GenerateController.ts`, `LlmService.ts`, `server/fns.ts`, `routes/index.tsx`, `routes/p.$projectId.tsx`, `routes/preview.$projectId.tsx`, `routes/api/generate*.ts`, `TopBar.tsx`, `eval/metrics.ts`, `.env.example`, `controllers.check.ts`; o'chirildi `CritiquePanel.tsx`. Yangi bog'liqlik: `better-auth`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: faqat egasi topadi va ro'yxatlaydi, yetim loyihalar birinchi foydalanuvchiga (egasi borlari emas), hisob o'chirilsa loyiha va ekranlar o'chadi (boshqalarniki qoladi); validatorlar; har model chaqiruvi foydalanuvchi va loyiha bilan yoziladi, tokenlar, narx formulasi, xatoli chaqiruv xato bilan; bitta generatsiya, kunlik limit, kunlik byudjet, to'xtatish tugmasi. **Brauzer va curl** (haqiqiy `data.db` nusxasi, alohida port): kirmagan holda `/` → `/login?next=/`, `/api/generate` 401, boshqa origin'dan 403; email havola (logdan) → kirildi, 11 ta eski loyiha shu hisobga o'tdi; ikkinchi foydalanuvchi: 0 loyiha, birinchisining loyihasini ochganda "Project not found", generatsiya 404; ikkinchisi hisobini o'chirdi → `user` jadvalida faqat birinchisi, loyihalar joyida; Google so'rovi to'g'ri client va `…/api/auth/callback/google` bilan shakllandi; `GENERATION_PAUSED=1` bilan generatsiya 503 va odam tilidagi xabar; kirgan egasi muharrirni ochdi (8 kadr) va nomni o'zgartirdi. **Sinalmagan:** Google orqali haqiqiy kirish (redirect faqat :3000 ga ro'yxatdan o'tgan, u portda foydalanuvchining dev serveri ishlab turibdi) — AUTH-03 `Jarayonda`.

### Har dizayn tizimiga kit xarakteri — KIT-02
- `od-kit.css` endi bir nechta "xarakter" o'zgaruvchisidan o'qiydi (`--od-card-bg`, `--od-card-border`, `--od-card-shadow`, `--od-control-border`, `--od-btn-shadow`, `--od-btn-weight`, `--od-row-min`, `--od-blur`); standart qiymatlar `:where(:root)` ichida — nol spetsifiklik, tizimning `:root` i tartibdan qat'i nazar yutadi (birinchi versiyada kit standartlari tizimnikini bosib ketgani galereyada ko'rindi va shu bilan tuzatildi). 22 tizim `tokens.css` da o'z xarakterini oldi: duolingo — "chunky" (pastki qattiq soyali tugmalar, 2px chegaralar, 800 qalinlik, baland qatorlar), neobrutalism / retro / doodle — qalin qora chegara va siljigan soya, brutalist — soyasiz qalin chegara, minimal / vercel / linear / notion / github — tekis, zich, glassmorphism — shaffof, blur, oq chiziq, neon — accent nur, apple / material / stripe / airbnb — o'z yumshoq soyalari. Duolingo'ning juda yorqin yashil accent'i matn sifatida qoraytirildi (`--od-accent-text`).
- Ixcham kit boshqaruvlari (chip, segmented, kichik tugma, stepper, "See all") chizilgan o'lchamini saqlab, ko'rinmas 44px bosish maydonini oldi.
- Fayllar: `kit/od-kit.css`, 22 × `design-systems/*/tokens.css`.
- Tekshirildi: `npm run check` (exit 0). Galereya (duolingo / minimal / neobrutalism / glassmorphism yonma-yon, skrinshot): bir xil markup to'rt xil ko'rinadi; hisoblangan uslublar — duolingo tugmasi `0 4px 0` soyali, neobrutalism karta 3px chegara va `3px 3px 0` soya, minimal soyasiz. 33 tizim kontrast tekshiruvi: kit ranglari faqat duolingo'da <4.5 edi — tuzatildi. **Eval (Claude, 4 brief):** tuzilmaviy o'xshashlik o'zgarmadi (0.108 → 0.106) — kutilgan, xarakter CSS'da, `sameness` teglar tuzilmasini o'lchaydi; `bottomBarShare` 0.89 → 1.0, `dataItemsUsedShare` 0.83 → 1.0, xato 3 → 0. Render auditi: `small-target` 28 → 11, toza ekranlar 7% → 22% (44px maydon saqlangan 27 ekranga qayta qo'llanib o'lchandi, LLM'siz).

### Audit topgan xatolarni bitta chaqiruv bilan tuzatish — EYE-02
- Audit chipida "Fix these N": audit topilmalari (`parseAudit` bilan qayta tekshirilib) server'da bitta ko'rsatmaga aylanadi (`fixInstruction`: har topilma — aybdor `data-od-id`, nima topilgani va qanday tuzatiladi; "faqat shu elementlar, qolgani o'zgarmaydi"; elementi yo'q topilmalar tashlanadi, 12 tagacha) va **bitta bo'laklab tahrir chaqiruvi** bo'lib ketadi (EDT-19 yo'li). Natija — bitta versiya, suhbatda bitta juftlik ("Fix 3 problems found in the rendered screen" → nima o'zgargani), "Undo this step" va ⌘Z bilan qaytadi. Qayta audit aylanishi yo'q (≤1). Tuzatiladigan narsa bo'lmasa 400, token sarflanmaydi.
- `eval/fix-audit.ts`: run bazasining nusxasida audit → haqiqiy `GenerateController` orqali fix → yana audit.
- Fayllar: `lib/render-audit.ts` (`fixInstruction`), `GenerateController.ts`, `generate.ts`, `FrameToolbar.tsx`, `routes/p.$projectId.tsx`, `eval/audit.ts`, `eval/fix-audit.ts`, `controllers.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Test: barcha topilmalar uchun bitta chaqiruv, ko'rsatmada element va usul bor, elementsiz topilma yo'q, element bo'laklab tuzatildi, bitta versiya, suhbat matni, tuzatadigan narsa yo'q — 400. **Haqiqiy o'lchov (Claude):** faqat bitta ekran ulgurdi — "Leaderboard" 4 topilma → 0 (4 element bo'laklab, 1.5 KB); qolgan 5 ekranda Claude obunasi limiti tugadi ("monthly spend limit … resets 2pm"), shuning uchun kengroq o'lchov keyin.

### KIT-04 (jarayonda): modelga kit va har arxetipga eskiz
- System promptda "Component kit" bandi (prompt 22.3k, byudjet 24k), har blueprint'da `kit` eskizi (od- klasslar bilan, `[bracket]` o'rnida ilova ma'lumoti) — ekran brief'iga qo'shiladi; qolib ketgan `[placeholder]` — `kit-placeholder` lint xatosi. Normalizer sahifaning `od-` klasslarni qayta bezaydigan oddiy qoidalarini olib tashlaydi (`dropKitRules`, @media ichida ham; `.promo .od-btn` kabi kompozitsiya qoladi).
- **O'lchov (Claude, 4 brief, KIT-03 run'i bilan):** 1-urinish — model kit'ni ishlatdi (ekranda ~30 `od-` klass), lekin CSS qoidalarining 28 foizi kit klasslarini qayta yozardi: model yozgan hajm o'zgarmadi (17.0k → 17.0k belgi). Taqiq + normalizer bilan 2-urinish: **model yozgan hajm −8%** (16.96k → 15.63k), `bottomBarShare` 0.75 → 0.89, kod chizgan grafiklar 16 → 20. Salbiy: ekran 25% sekinroq (101s → 126s), `crossBriefMean` 0.092 → 0.108 (kit ekranlarni bir-biriga yaqinlashtiradi), lint 1.0 → 0.92 (`accent-energy-mismatch` 2), `dataItemsUsedShare` 1.0 → 0.83; habit-quest'da Claude limiti tufayli 3 xato. **Reja mezonlari (tokenlar −40%, lint ≥95%) bajarilmadi** — qator `Jarayonda` qoladi; KIT-02 (tizim xarakteri) dan keyin qayta o'lchanadi.

### Render auditi: faqat chizilgan sahifa ko'rsatadigan xatolar — EYE-01
- `lib/render-audit.ts`: ekran ichida ishlaydigan audit, har topilma **aybdor elementning `data-od-id`** si bilan (EYE-02 aynan shu element tahririga uzatadi). Qoidalar: `overflow` (o'ng chetdan chiqqan; fixed va gorizontal scroller mumkin), `clipped-text` (ellipsis'siz kesilgan matn), `small-target` (44px dan kichik tugma/havola/checkbox; autofix'ning ko'rinmas hit area'si hisobga olinadi), `low-contrast` (matn rangi orqasidagi haqiqiy fonga nisbatan, piksel orqali — `color-mix` ham; orqada rasm yoki gradient bo'lsa baholanmaydi; katta matn uchun 3:1), `overlap` (bir-birini o'z ichiga olmagan ikki matn ustma-ust; sticky/fixed panel ostidan o'tgan kontent — dizayn bo'yicha, hisoblanmaydi). Raqamlar `hig-rules.ts` dan. Shell tekshirilmaydi.
- Muharrirda: har kadr srcdoc'iga (saqlanmaydi) audit qo'shiladi, shriftlar yuklangach ishlaydi va `od:audit` yuboradi; `parseAudit` sandbox'dan kelganni tekshiradi (faqat ma'lum qoidalar, id token shaklida, 40 tagacha). Kadr sarlavhasida ⚠ N chipi, bosilsa ro'yxat ("Text too faint — +$3,200.00 2.46:1").
- Eval uchun: `eval/audit.ts <run>` — har ekranni headless Chrome'da 390 px'da ochadi va qoidalar bo'yicha sanaydi (`--json` — hammasi).
- Fayllar: `lib/render-audit.ts`, `eval/audit.ts` (yangi); `ScreenFrame.tsx`, `FrameToolbar.tsx`, `routes/p.$projectId.tsx`, `lib/element-ops.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Test: noto'g'ri qoida/id/detail tozalanadi, 40 cheklov, HIG raqamlari, manba haqiqiy JavaScript. KIT-03 Claude run'ida (25 ekran): toza 12%; `low-contrast` 54, `overlap` 9, `small-target` 11 — namunalar haqiqiy (oq fonda och yashil "+$3,200.00" 2.46:1, 40px balandlikdagi segmented tugmalar). Birinchi versiyada sticky pastki panel ostidagi kontent "overlap" bo'lib chiqardi — tuzatildi (15 → 9). Chrome'da Nimbus Bank kadrlarida chiplar: Home 5, Transaction Detail 2, Spending 1, Transfer Result 1; Home ro'yxatida "Whole Foods Market / Groceries · Sep 21" overlap — tekshirildi, haqiqiy: sarlavha va meta inline span, ustma-ust turishi kerak edi.

### Fikr signallari: 👍/👎, "qayta yarat" va tahrir juftliklari — FB-01, FB-02
- **FB-01.** Kadr asboblarida 👍/👎 (hover'da; baholangan kadrda doim ko'rinadi, bosilgani to'ldirilgan; qayta bosish — bekor). `feedback` jadvali (migratsiya 0015): ekran, qiymat (`up` / `down` / `regenerate`), dizayn tizimi, **arxetip va layout varianti** — ekran spec'idagi "Screen pattern (detail, layout b)" dan o'qiladi (`patternOf`), shuning uchun signal uni chizgan naqshga bog'lanadi. Bir ekranga bitta baho (oxirgisi); chizilgan ekranni qayta yaratish har safar alohida `regenerate` qatori (yiqilgan ekranni qayta urinish — signal emas). Brauzerdan kelgan qiymat faqat `up` / `down` / `null`; ekran faqat o'z loyihasida.
- **FB-02.** Qo'shimcha saqlash yo'q: suhbat har o'zgarishni undan **oldingi** snapshot bilan allaqachon yozadi. `EditPairService.forProject` har o'zgarish uchun juftlik yig'adi — oldin = o'sha snapshot, keyin = ekranning keyingi snapshot'i yoki hozirgi holati, so'rov = oldingi user xabari (qo'l tahririda — uning o'z tavsifi), plus tizim, arxetip, variant va "keyin bekor qilingan" belgisi (eng aniq salbiy signal). `eval/export-pairs.ts` — JSONL eksport (`DB_PATH=… node --import ./eval/alias-hook.mjs eval/export-pairs.ts > pairs.jsonl`).
- Fayllar: `database/migrations/0015_create_feedback_table.ts`, `app/Models/Feedback.ts`, `app/Http/Controllers/FeedbackController.ts`, `app/Services/EditPairService.ts`, `eval/export-pairs.ts` (yangi); `schema.ts`, `migrate.ts`, `GenerateController.ts`, `ProjectController.ts`, `server/fns.ts`, `FrameToolbar.tsx`, `routes/p.$projectId.tsx`, `controllers.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: `patternOf` (variant bilan / siz / null), up → down — oxirgisi, bitta qator tizim/arxetip/variant bilan, null tozalaydi, noto'g'ri qiymat va begona loyiha rad, loyiha yuklanganda `rating`; chizilgan ekranni qayta yaratish `regenerate` yozadi; juftliklar to'liq, qo'l tahriri o'z tavsifi bilan, bekor qilingani belgilangan, model tahriri odam so'zlari bilan. Chrome'da: 👍 → bosilgan, 👎 → faqat u, yana 👎 → ikkalasi bo'sh, 👍 → bazada `up` (tizim midnight; chatdan qo'shilgan ekranning spec'i yo'q, shuning uchun arxetip bo'sh — to'g'ri). Haqiqiy `data.db` nusxasidan eksport: 2 juftlik (element, direct).

### Umumiy komponent to'plami `od-kit.css` — KIT-01
- `kit/od-kit.css`: 32 komponent, faqat tokenlar bilan (`var(--surface)`, `var(--radius-md)`, `color-mix` …): page / stack / grid / carousel / divider, hero, section header, button (secondary, ghost, danger, sm, block), icon button, card (flat, media), media box, banner (success / warn / danger), list + row (lead, title, sub, trail, chevron), key-value (total), timeline, chip, tag (4 holat), badge, avatar (3 o'lcham), rating, stat (delta up / down), price, progress, field (label, help, error), input / textarea, search, segmented, switch, stepper, empty state, sticky bottom bar. Nomlash: blok / `__element` / `--modifier`.
- Accent va status ranglari **matn sifatida** `--fg` tomon aralashtiriladi (`--od-accent-text` va boshq.): yorqin brend rang (airbnb, duolingo) yoki och yashil kichik matn sifatida o'qilmas edi; qorong'i tizimda `--fg` och bo'lgani uchun aralash ochroq bo'ladi — ikki tomonda ham kontrast oshadi.
- Normalizer (`normalizeKit`, `NormalizeOptions.kitCss`, `KitService.css()` — izohlarsiz, 14.5 KB) sahifa `od-` klassini ishlatgandagina qo'shadi, `<head>` dan keyin birinchi — sahifaning o'z uslubi kit'ni bosib o'tishi mumkin. Ishlatmasa — hech narsa (bo'sh bayt yo'q); ishlatish to'xtasa — olib tashlanadi. Hozircha model kit'ni bilmaydi (bu KIT-04), shuning uchun generatsiya o'zgarmadi: 79 ta saqlangan eval ekranida `normalizeKit` hech narsani o'zgartirmadi.
- Galereya: `kit/samples.ts` (har komponent namunasi — KIT-04 da modelga ko'rsatiladigan markup ham shu) va `kit/gallery.ts` → `eval/out/kit-gallery/<tizim>.html` (33 tizim).
- Fayllar: `kit/od-kit.css`, `kit/samples.ts`, `kit/gallery.ts`, `app/Services/KitService.ts` (yangi); `lib/screen-normalizer.ts`, `PlanController.ts`, `GenerateController.ts`, `new-features.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Test: izohlar olib tashlangan, literal rang faqat `#fff` (danger ustidagi matn, switch tugmachasi), namunadagi har klass kit'da bor, kit'ning har bloki galereyada bor, ≥30 blok; injeksiya sahifa uslubidan oldin, idempotent, `od-` yo'q — varaq yo'q, `food-card` `od-` emas, ishlatilmay qolsa olib tashlanadi. **Chrome'da 33 tizimning hammasi avtomatik tekshirildi** (390 px, piksel rangidan WCAG kontrast): gorizontal overflow 0; kit o'zi tanlagan ranglar (ghost tugma, teg, havola, delta, faol chip, segmented) 27 tizimda to'liq ≥4.5 (aralashtirishdan oldin 3 tizim edi). Qolgani tizimlarning o'z tokenlari: `--muted` cal, intercom, doodle, dashboard, duolingo'da oq fonda 3.5–4.5; asosiy tugmaning `--accent-on` / `--accent` jufti 10 tizimda <4.5 (masalan duolingo 2.1, airbnb 3.5) — bu brend qiymatlari, kit emas; alohida qaror kerak.

### Grafiklar kodda: `data-od-chart` slotlari — KIT-03
- Model grafikni chizmaydi: bo'sh slot va ma'lumot yozadi (`<div data-od-chart="bar" data-values="…" data-labels="…" data-highlight="5">`), `lib/charts.ts` uni SVG/HTML qilib chizadi. Turlar: `bar`, `line`, `area`, `sparkline`, `donut` (legenda va foizlar bilan), `ring` (qiymat / max, markazda son), `heatmap` (streak kalendari, `data-columns`). Geometriya qiymatlardan hisoblanadi (eng katta ustun = 100%), ranglar faqat tokenlar (`var(--accent)`, `color-mix`) — tema o'zgartiradi, qorong'i tizimda ham to'g'ri. Chiziq qalinligi cho'zilganda o'zgarmaydi (`vector-effect`), oxirgi nuqta HTML (yumaloq qoladi). Belgilar decode qilinib, qayta escape qilinadi; noma'lum tur, yetarli qiymat yo'q yoki ichida element bor slot — tegilmaydi. Idempotent.
- `autofixScreen` chaqiradi — rejadagi, chatdan qo'shilgan, tahrir, regenerate — hamma yo'l shu yerdan o'tadi. Promptda "Charts" bandi: grafik chizma, slot yoz; `craft/mobile.md` dagi "o'z svg'ing grafik uchun" qoidasi almashtirildi (prompt byudjeti ichida).
- Yangi eval metrikalari: `charts.slots`, `charts.handDrawnScreens` (ikonka/logo bo'lmagan, ma'lumot chizgan svg yoki foizli balandlikdagi div minoralari).
- Eval endi Claude obunasida ham yuradi (foydalanuvchi qarori): `run.json` provayderni yozadi, solishtirish faqat bir xil provayder ichida.
- Fayllar: `lib/charts.ts` (yangi), `lib/design-lint.ts`, `PromptComposer.ts`, `craft/mobile.md`, `eval/metrics.ts`, `eval/run.ts`, `LlmService.ts`, `lib/element-ops.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: ustun balandliklari qiymatga mos, ajratilgan ustun to'liq accent, belgilar, standart balandlik, idempotent; area min→max, modelning balandligi saqlanadi; ring 72/28; donut foizlari, belgi bir marta decode/escape; heatmap katak soni; noto'g'ri slotlar tegilmaydi; kodlangan teg matn bo'lib qoladi. Chrome'da har tur airbnb va midnight tizimida chizildi (skrinshot). **Eval, Claude Sonnet** (4 brief: fit-tracker, bank-neo, crypto-wallet, habit-quest; bazaviy — oldingi commit `d151d3f` worktree'da, xuddi shu provayder): model chizgan grafikli ekranlar **4 → 0**, kod chizgan grafiklar **0 → 16** (ring 7, bar 3, area 2, donut 2, line 1, sparkline 1), lint 100% toza (o'zgarmadi), ma'lumot ishlatilishi 0.89 → 1.0. DeepSeek'da hali tekshirilmagan — ishga tushirishdan oldin kichik DeepSeek o'lchovi kerak.

### Lokal sinov uchun Claude Code provayderi — DEV-01
- DeepSeek balansi tugayotgani uchun (foydalanuvchi so'rovi): `.env` da `LLM_PROVIDER=claude-cli` bo'lsa, `LlmService` generatsiyani dasturchining o'z Claude Code obunasi orqali (`claude -p`, stream-json) yuboradi — API balansi sarflanmaydi. Tool'lar yo'q, sozlamalar, hook'lar, MCP va sessiya fayllari yuklanmaydi, loyiha CLAUDE.md o'qilmasligi uchun temp papkadan ishga tushadi, bizning system prompt Claude Code'nikini almashtiradi, user xabari stdin orqali. Muhitdan `ANTHROPIC_API_KEY` olib tashlanadi — doim obuna, hech qachon API hisobi. Stop (AbortController) jarayonni o'ldiradi. Planner uchun JSON matndan kesib olinadi (`jsonOnly`). Model — CLI'niki yoki `CLAUDE_CLI_MODEL`.
- **Faqat lokal, faqat sinov:** `NODE_ENV=production` da xato beradi (obuna shaxsiy, boshqa odamlarning so'rovlariga xizmat qila olmaydi); `npm run eval` bu provayder bilan ishga tushmaydi — promptlar DeepSeek uchun sozlangan, Claude natijasi DeepSeek haqida hech narsa demaydi.
- Qoida bo'yicha: bu qator roadmap'da yo'q edi — foydalanuvchi aniq so'radi, Notion'ga DEV-01 (MVP, Tayyor) qilib qo'shildi.
- Fayllar: `app/Services/LlmService.ts`, `.env.example`, `eval/run.ts`, `services.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. To'g'ridan-to'g'ri: stream `<p>ok</p>` (2.8s, usage keldi), JSON `{"a":1,"b":[2,3]}`, 1.5s da abort → `AbortError`; eval `LLM_PROVIDER=claude-cli` bilan rad etdi. Chrome'da dev server shu provayder bilan (eval bazasining nusxasi, HabitLoop): chatdan "Add a settings screen with notification toggles and a dark mode switch" → "Settings — HabitLoop" (15 KB) yaratildi, detail header shelli injektsiya qilingan, 17 ta toggle, lint toza, suhbatda agent xabari.

### Platforma raqamlari bitta faylda, kichik matn va ikonka tugmalari kodda tuzatiladi — HIG-03, EYE-03
- **HIG-03.** `lib/hig-rules.ts`: minimal shrift 11px, matn 15–17px, bosish nishoni 44px, kontrast 4.5 / 3 (katta matn 24px dan), tablar 2–5, nishonlar orasi 8px — Apple HIG va Material 3 raqamlari, o'z so'zimiz bilan. Linter, autofix va keyingi render auditi (EYE-01) shu yerdan o'qiydi. Yangi lint qoidasi `tiny-text` (11px dan kichik `font-size` va Tailwind `text-[Npx]`; `font-size: 0` — ataylab yashirish, hisoblanmaydi; token bloki tekshirilmaydi).
- **EYE-03.** `autofixScreen` kengaydi: 11px dan kichik shrift 11px ga ko'tariladi (token bloki, 0 va qonuniy o'lchamlar tegilmaydi); faqat ikonkadan iborat har tugmaga ko'rinmas 44×44 bosish maydoni (`::after`, markazlangan, `max(100%, 44px)` — katta tugmani kichraytirmaydi). `position: relative` `:where()` ichida — ekranning o'zi qo'ygan `position` (fixed FAB) ustun qoladi. Klassiga ekran allaqachon `::after`/`::before` qo'ygan tugma (badge nuqtasi) chetlab o'tiladi. Nav bo'shlig'i allaqachon normalizer'da (`navClearance`). Idempotent.
- Fayllar: `lib/hig-rules.ts` (yangi), `lib/design-lint.ts`, `new-features.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Test: 9 / 8.5 / 10px belgilanadi, 0 yo'q; autofix 11px ga ko'taradi, token/0/12px tegilmaydi, keyin topilma yo'q; bitta hit-area qoidasi, 44px minimum, idempotent, tugmasiz ekranda yo'q, badge'li klass chetlab o'tiladi. **Saqlangan 143 eval ekranida qayta ishlatildi** (LLM'siz): toza lint 120/143 → 139/143, `tiny-text` 21 → 0 (ekranlarning ~15 foizida bor edi). Chrome'da (bank ekrani, oldin/keyin): o'zgargan o'lchamlar faqat 11px ga ko'tarilgan matn qatorlari; 24×24 ikonka tugmasi markazdan 18px da ham bosiladi, 30px da — yo'q.

### Har arxetipga 3 layout varianti, ilova bo'yicha tanlanadi — VAR-02
- Har blueprint'ga 3 variant (`variants`): masalan feed — katta kartalar oqimi / ikki ustunli grid / tahririy (bitta hero + qatorlar); detail — to'liq rasm hero / avval sarlavha va galereya lentasi / ixcham sarlavha + faktlar jadvali. `BlueprintService.variant(arxetip, ilova nomi)` FNV-1a bilan barqaror tanlaydi: bitta ilovada bir arxetipning hamma ekrani bitta layoutda (izchil), boshqa ilova boshqa layoutga tushadi. Spec'da "layout b: … Use this layout, not the most common one." `PlanController` `screenSpec(s, plan.appName)`.
- Fayllar: `blueprints/*.json` (variantlar), `BlueprintService.ts`, `ScreenContext.ts`, `PlanController.ts`, `services.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Test: har arxetipda 2–3 noyob variant, bir ilova — doim bir xil variant (katta-kichik harf, bo'shliq farqsiz), 10 ilova ≥2 xil variantga tushadi. **Eval** (8 brief: fit-tracker, bank-neo, food-delivery, social-photo, shop-sneakers, hotel-booking, habit-quest, music-player; bazaviy — oldingi commit `b71ce7e` git worktree'da, xuddi shu brieflar): **bir turdagi ekranlar o'xshashligi `sameness.sameKindMean` 0.14 → 0.09 (−36%)** — reja mezoni (≥30%) shu ko'rsatkichda bajarildi; umumiy `crossBriefMean` o'zgarmadi (0.076 → 0.075). `bottomBarShare` 0.70 → 0.76, `dataItemsUsedShare` 0.86 → 0.93. Salbiy: `tiny-text` 6 → 11 (endi EYE-03 tuzatadi), `hand-drawn-icon` 0 → 3, bitta `fetch failed` (tarmoq) va fit-tracker'da bitta qamralmagan ekran (planner, variantlarga aloqasi yo'q). Narx ~$0.75.

### Ilova turi naqshlari: 12 tur, brief kodda tasniflanadi — UX-02
- `app-patterns/<tur>.json` (food-delivery, marketplace, commerce, fintech, fitness, health, booking, travel, social, learning, productivity, media): asosiy sikl, odatiy 4–6 ekran (arxetipi bilan), odatiy oqimlar, odatiy ma'lumot, "o'tkazib yuborma". Kalit so'zlar inglizcha, o'zbekcha va ruscha.
- `AppPatternService.classify(brief)` rejadan **oldin**, kodda: so'z boshidan moslik (qisqa kalit so'z butun so'z bo'lishi kerak — "card" ≠ "cardio"; uzuni qo'shimchalarni qamraydi — "тренировки"), ibora ikki ball, tenglikda aniqroq tur yutadi (food-delivery > commerce), o'zbek apostroflari (ʻ ’ ') bir xil. Mos kelmasa — naqsh yo'q (noto'g'ri naqshdan yaxshi). Faqat mos kelgan bitta naqsh planner so'roviga (user xabari, system prompt keshini buzmaydi) qo'shiladi.
- Birinchi o'lchovda bank brief'ida naqshdagi pul o'tkazish oqimi so'ralgan "spending analytics" ekranini siqib chiqardi (`uncovered` 0 → 1). Naqsh matni qat'iylashtirildi: faqat brief ochiq qoldirgan joylar uchun, so'ralgan ekran hech qachon tushirilmaydi, birlashtirilmaydi, almashtirilmaydi — qayta o'lchovda analytics ham, transfer natijasi ham bor.
- 25 eval brief'idan 22 tasi tasniflanadi; recipe-book, chat-team, vague-parking, uz-taxi — naqshsiz (to'g'ri: mos tur yo'q).
- Fayllar: `app-patterns/*.json` (12, yangi), `app/Services/AppPatternService.ts` (yangi), `PlannerService.ts`, `services.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Test: 12 naqsh, noyob ustuvorlik, har ekran arxetipi planner lug'atida, qisqa brief; tasnif — food-delivery commerce'dan ustun, bank, o'zbekcha (ʻ bilan), ruscha qo'shimcha, "recipe steps" fitness emas, "cardio" fintech emas, parking — yo'q, bo'sh — yo'q. **Eval** (qat'iylashtirilgandan keyin; 5 brief: bank-neo, vague-todo, vague-dating, podcast, meditation; bazaviy — xuddi shu brieflar UX-01 dan oldingi kodda): arxetip recall 14/15 = 14/15, qamralmagan ekran 0 = 0; vague-dating'ga kutilgan `profile` qo'shildi, vague-todo'da turli arxetiplar 3/6 → 6/6 (calendar, stats), bank'da so'ralgan stats saqlanib transfer natijasi qo'shildi; noaniq brieflarda `bottomBarShare` 0.14 → 1.0 (UX-01 bilan birga). Kamchilik: podcast rejasida `player` tushib qoldi (bazada bor edi), bitta `invented-metrics` lint. Namuna kichik — ta'siri o'rtacha, lekin qamrov yomonlashmadi. Narx ~$0.9 (uch o'lchov + ikki bazaviy).

### Ekran arxetiplari katalogi: 20 blueprint — UX-01
- `blueprints/<arxetip>.json` — planner'ning har arxetipi uchun bitta (dashboard, feed, list, detail, search, form, checkout, result, stats, profile, settings, chat, player, map, camera, calendar, notifications, onboarding, auth, paywall): maqsad, tuzilma (1–2 gap), majburiy va ixtiyoriy bo'limlar, asosiy amal joyi (`bottom-bar` / `inline` / `header` / `none`), 2–4 ta "qilma" va tegishli HIG kartalari nomi (HIG-01/02 uchun). Brend nomlari yo'q.
- `BlueprintService` (id tekshiriladi, keshlanadi) va `screenSpec` rejalashtirilgan har ekranning spec'iga o'z arxetipining naqshini qo'shadi (~4 qator: tuzilma, "must show", amal joyi, "avoid"). Rejaning o'z bo'limlari qaysi kontent ekanini aytadi, blueprint — qanday tuzilma. Spec saqlanadi, shuning uchun Regenerate ham xuddi shu naqsh bilan chizadi.
- Yangi eval metrikasi `plan.bottomBarShare`: naqshi amalni pastki panelga qo'yadigan ekranlardan (detail, checkout, form, result, chat, map, onboarding, paywall, camera) nechtasida shelldan boshqa narsa pastga mahkamlangan (`eval/metrics.ts` `pinnedBottom`).
- Fayllar: `blueprints/*.json` (20, yangi), `app/Services/BlueprintService.ts` (yangi), `ScreenContext.ts`, `eval/metrics.ts`, `services.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Test: har arxetipga aynan bitta fayl, sxema (uzunliklar, 2–6 majburiy bo'lim, amal joyi, 2–4 "avoid", HIG nomlari ma'lum ro'yxatdan), qisqa brief (<900 belgi), brend yo'q, `../` id rad. **Eval** (6 brief: food-delivery, bank-neo, habit-quest, hotel-booking, music-player, vague-todo; bazaviy — blueprint'dan oldingi commit `eb515cb` git worktree'da, xuddi shu brieflar): `bottomBarShare` **0.69 → 0.93** (9/13 → 13/14), `dataItemsUsedShare` 0.83 → 0.91, vaqt o'zgarmadi, narx ~$0.28. Salbiy: `sameness.crossBriefMean` 0.049 → 0.075 (ekranlar tuzilmasi bir-biriga yaqinlashdi — kutilgan, VAR-02 layout variantlari shuni hal qiladi); lint 3 ta topilma (emoji, qo'lda chizilgan ikonka, token) — keyingi yugurishda (UX-02) 0, ya'ni shovqin.

### Tema: har rang tokeni, radius slayderi, Round/Squircle — THM-02, THM-03
- **THM-02.** Theme panelida "Colours": Background, Card/surface, Surface 2, Text, Secondary text, Muted, Border, Success, Warning, Danger — har biri rang tanlagich, joriy qiymat (tizimniki kulrang, o'zgartirilgani qora) va alohida "qaytarish". Bu 33 tizimning hammasi belgilaydigan tokenlar. `Theme.colors` faqat ma'lum tokenlar va hex qiymatlarni o'tkazadi (`sanitizeTheme`), `themeCss` har birini o'z tokeniga yozadi — ekranlar, dizayn tizimi kadri, eksport bir xil yo'l bilan yangilanadi. Tizim qiymatlari `tokens.root` dan o'qiladi.
- **THM-03.** Burchaklar: 0–40 px slayder (`radiusPx` = o'rta radius; kichigi ×0.6, kattasi ×1.5), "Default" — tizimnikiga qaytish; chatdagi "rounder corners" preset'i slayderni bekor qiladi (aks holda uning ortida yashirinib qolardi). Round / Squircle: squircle `@supports (corner-shape: squircle)` ichida — radius ×1.5 (squircle bir xil radiusda tekisroq ko'rinadi) va `corner-shape: squircle`; Safari va Firefox blokni o'tkazib yuboradi va oddiy yumaloq burchak qoladi — bu zaxira.
- Bir surish (400 ms ichidagi o'zgarishlar) = bitta `⌘Z` qadami (EDT-12 dagi kabi).
- Fayllar: `lib/theme-override.ts`, `components/canvas/ThemePanel.tsx`, `ProjectController.ts`, `routes/p.$projectId.tsx`, `new-features.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: begona token/qiymat tashlanadi, bo'sh `colors` tashlanadi, radius 0–40 ga siqiladi, noma'lum shakl tashlanadi; har rang o'z tokeniga; slayder sm/lg ni hisoblaydi va preset'dan ustun; 0 px haqiqiy qiymat; squircle faqat `@supports` ichida. Chrome'da (eval nusxasi, Airbnb tizimi): panelda 10 rang tizim qiymatlari bilan (#ffffff, #f7f7f7, #222222 …), slayder 14 px'dan boshlandi (tizimning `--radius-md`); fon #0b0b0c, matn #f5f5f5, slayder 4→26, Squircle → bazada `{"radiusPx":26,"shape":"squircle","colors":{"bg":"#0b0b0c","fg":"#f5f5f5"}}`; `⌘Z` → `{}` (butun surish bitta qadam), redo → qaytdi; fonning "qaytarish" tugmasi → faqat `bg` ketdi.

### Kanvasda dizayn tizimi kadri — THM-08
- Ekranlarning chap tomonida "Design system" kadri: palitra (tizim belgilagan har rang tokeni, qiymati bilan), shriftlar (sarlavha va matn oilasi, o'lchamlar), radiuslar, komponentlar (asosiy/ikkilamchi/matnli tugma, input, karta, teglar). `lib/ds-sample.ts` uni tizimning o'z `:root` tokenlaridan kodda yig'adi — generatsiya yo'q, bazaga yozilmaydi. Hamma narsa `var(--token)` bilan chizilgan, shuning uchun Theme paneli uni ekranlar bilan bir xil yo'l bilan darhol o'zgartiradi; yozilgan qiymatlar hisoblangan uslubdan qayta o'qiladi (tema kelganidan keyin).
- Kadr ko'chirilmaydi, tanlanmaydi, ramka/strelka/eksport/Delete uni ko'rmaydi (ekran emas). Faqat Google Fonts havolalari ulanadi.
- Fayllar: `lib/ds-sample.ts` (yangi), `ProjectController.ts` (`show` tokenlarni qaytaradi), `routes/p.$projectId.tsx`, `lib/element-ops.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Test: tokenlar sahifaning o'z `:root`i, faqat mavjud tokenlarga swatch/radius, begona shrift URL'i tashlanadi, nom escape, tokenlardan tashqari qattiq rang yo'q. Chrome: kanvasda kadr bor (8 figura, ekranlar hamon 7); fonda turgan tab iframe'larni chizmagani uchun namuna alohida sahifa sifatida ochildi — airbnb, midnight, duolingo, 390 px'da balandlik 1031–1042 (kadr 1100); airbnb'da `--accent` #ff385c → theme xabari (`od:theme`, #2563eb, radius 2px) → yozilgan qiymat #2563eb, tugma foni rgb(37,99,235), radius 2px; midnight (qorong'u) skrinshotda to'g'ri. Yo'lda: qiymatlarni yangilash `requestAnimationFrame` dan `setTimeout` ga o'tdi (rAF fonda ishlamaydi va tema tinglovchisidan oldin ishlashi mumkin edi).

### Yuqori panel: Projects › nom, Preview · Share · Export, butun ilova zip — EDT-10, EDT-32, EXP-03
- **EDT-10.** Orqaga strelka o'rniga yo'l ko'rsatkich: "Projects › GoBite". Nom — joyida tahrirlanadigan maydon (bosish → yozish → Enter/fokusdan chiqish saqlaydi, Esc bekor qiladi, bo'sh nom e'tiborsiz, 80 belgi). `ProjectController.rename`, `renameProject` fn; nomlash `⌘Z` bilan qaytadi. Maydon tahrirlanmayotganda saqlangan nomni ko'rsatadi — undo darhol ko'rinadi. Reja oqayotganda (loyiha hali "Untitled") reja nomini ko'rsatadi. Keyingi ekranlar yangi nom bilan yaratiladi.
- **EDT-32.** O'ngda: Preview · Share · Export ▾ · `⋯`. Export menyusi hech narsa tanlanmagan bo'lsa ham ishlaydi: "Whole app (.zip)", keyin tanlangan ekran uchun "This screen (.html)" va "Copy HTML" (ekran tanlanmagan yoki bir nechta tanlangan bo'lsa o'chiq, sababi yozilgan). Loyihani o'chirish qizil savatdan `⋯ › Delete project` ichiga ko'chdi. Share — preview havolasini nusxalaydi ("Anyone with the link can view"): hisoblar yo'q, shuning uchun havola hozir hammaga ochiq — haqiqiy ulashish SHR-02 da.
- **EXP-03.** `lib/export-app.ts`: har chizilgan ekran o'z HTML fayli (`screens/<nom>.html`), tema ichiga yozilgan, plus `index.html` ro'yxat. Fayllar preview'dagidek bir-biriga bog'langan: tab, Back va `data-od-link` bosilsa kerakli fayl ochiladi — zip oflayn ishlaydigan bosiladigan prototip. Havolalar eksport paytida preview'ning o'z resolverlari (`screenForTab/Back`, `screenByName`) bilan hal qilinadi, faylda faqat jadval. Fayl nomlari ASCII (macOS'ning `unzip` i UTF-8 nomlarni buzadi); kirill nomli ekran `screen.html`, `screen-2.html` bo'ladi. `lib/zip.ts`: bog'liqliksiz zip yozuvchi (store, siqilmagan — 7 ekran ≈ 150 KB), UTF-8 nomlar, CRC32.
- Fayllar: `lib/zip.ts`, `lib/export-app.ts` (yangi); `components/canvas/TopBar.tsx`, `routes/p.$projectId.tsx`, `ProjectController.ts`, `server/fns.ts`, `lib/element-ops.check.ts`, `controllers.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: CRC32 Node'niki bilan teng, zip tuzilmasi (EOCD, markaziy katalog → lokal sarlavhalar, UTF-8 nomlar); eksport — kanvas tartibi, noyob nomlar, yiqilgan ekran yo'q, index escape, havola/tab/Back fayllarga hal qilinadi, entity'lar decode, tema bor, ASCII nomlar; rename — trim, bo'sh rad, 80 belgi, yo'q loyiha. `unzip -t` real GoBite eksportida (8 fayl) — xatosiz; har faylning jadvali to'g'ri (masalan Feed: tab home/orders, link Menu/Dish). Chrome'da: yuqori panel Projects › GoBite · Preview · Share · Export · `⋯`; Export menyusi: zip + "Select a screen for these" + ikki o'chiq element; zip bosildi → `gobite.zip`, `application/zip`, 8 yozuv, 151 KB; nomlash (focusin/focusout hodisalari bilan) → bazada "GoBite Pro" → `⌘Z` → "GoBite" → redo → "GoBite Pro"; bo'sh va Esc — o'zgarmadi. Ochilgan eksport lokal serverda: Feed'da `--accent` #2563eb (tema), "Restaurant Menu" havolasi Menu faylini ochdi, uning Back'i Feed'ga qaytardi.

### Bir nechta ekranni tanlash: Shift+bosish, ramka, birga ko'chirish/o'chirish, prompt hammasiga — EDT-30
- Tanlov endi to'plam (`selectedIds`, oxirgisi asosiy). Shift+bosish qo'shadi/olib tashlaydi; tanlash rejimida bo'sh joydan sudrash — ramka (tekkan kadrlar tanlanadi, Shift bilan qo'shiladi; oddiy bosish tanlovni bekor qiladi). Bo'sh joydan surish endi faqat qo'l/Space bilan — Figma'dagidek. `framesIn` (`src/canvas.ts`) testlangan.
- Tanlangan kadrlardan birining `⠿` tutqichi hammasini birga ko'chiradi (tanlanmagan kadr yolg'iz ko'chadi); `Delete` va `⌘D` hammasiga; har biri bitta undo qadami. Bir nechta tanlanganda kadr ichiga kirilmaydi (`ScreenFrame.solo=false` — halqa bor, pointer yo'q), element tanlovi tozalanadi.
- Chatda chip "N screens" (nomlari tooltip'da), placeholder "Describe a change for all N screens…"; so'rov har ekranga alohida tahrir sifatida bitta Stop ostida parallel ketadi (`run()` endi ro'yxat qabul qiladi). Har ekranning o'z agent xabari va o'z undo qadami bor. Halol cheklov: bitta umumiy xabar emas — bu `GenerateController`da N ekranli so'rovni talab qiladi, hozircha kerak emas.
- Fayllar: `components/canvas/Canvas.tsx`, `src/canvas.ts`, `ScreenFrame.tsx`, `routes/p.$projectId.tsx`, `ShortcutsDialog.tsx`, `lib/element-ops.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Chrome'da (eval bazasining nusxasi, GoBite): Shift+bosish → "2 screens", ikkala halqa, faol iframe 0; yana Shift+bosish → olib tashlandi; `Delete` → 5 kadr → `⌘Z` → 7 (bitta qadam); `⌘D` ikkitasiga → 9 kadr, 2 ta "copy" → `⌘Z` → 7; ramka (sintetik pointer) → chizildi, Search + Orders tanlandi; tutqichdan guruh sudrash → ikkalasi +274 (DOM va baza), `⌘Z` → ikkalasi joyiga; **haqiqiy DeepSeek**: ikki ekranga "Change the main page heading text to Hello" → ikkalasi v2, ikkalasida "Hello", ikki agent xabari, ikki `⌘Z` ikkalasini qaytardi. Brauzer asbobi haqiqiy sudrashni yetkazmagani uchun ramka va guruh sudrash sintetik pointer hodisalari bilan (ular `setPointerCapture` da kutilgan NotFoundError beradi — sinov artefakti).

### Klaviatura yorliqlari va `?` ro'yxati — EDT-28
- Kanvasda: `←`/`→` ekranlar orasida (x bo'yicha, aylanib; hech narsa tanlanmagan bo'lsa birinchi/oxirgi) va kanvas o'sha kadrga boradi; `Delete`/`⌫` tanlangan ekranni o'chiradi (toast: "Deleted “…” — ⌘Z brings it back"; element tanlangan bo'lsa yoki ish ketayotganda emas); `⌘D` nusxa; `⌘0` hammasini sig'dirish; `⌘1` 100%; `⇧1` tanlangan ekranga zoom; `/` promptga fokus; `?` yorliqlar ro'yxati (`ShortcutsDialog`, pastki paneldagi klaviatura tugmasi ham ochadi). `V`/`H`/Space (EDT-11) va `⌘Z` (EDT-12) shu ro'yxatda. Matn maydoni, dialog yoki menyuda hech biri ishlamaydi.
- Zoom yorliqlari `Canvas.tsx` da (view o'sha yerda), qolganlari `routes/p.$projectId.tsx` da; `PromptBox` textarea'si `data-prompt-input` bilan topiladi.
- Fayllar: `components/canvas/ShortcutsDialog.tsx` (yangi), `Canvas.tsx`, `PromptBox.tsx`, `routes/p.$projectId.tsx`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Chrome'da (eval bazasining nusxasi, sintetik klavishlar + haqiqiy Esc): `→` Restaurant Feed → `→` Restaurant Menu → `←` → `←` aylanib Search; `⌘0` view o'zgardi (fit), `⌘1` scale 1, `⇧1` scale 0.47 (tanlanganiga); `⌘D` 8 ekran, "… copy"; `Delete` 7 ekran, tanlov yo'q, toast; `⌘Z` 8; `/` prompt fokusda; textarea ichida `?` dialog ochmadi; tashqarida `?` "Keyboard shortcuts" dialogi; haqiqiy Esc yopdi (sintetik Esc Radix'ni yopmaydi — asbob cheklovi).

### Tanlash / qo'l asboblari, Space bilan surish — EDT-11
- Pastki panelda ikki asbob: strelka (tanlash, `V`) va qo'l (`H`). Qo'l rejimida kadrlar umuman pointer olmaydi (`pointer-events-none`): istalgan joydan bosib sudrash kanvasni suradi, hech narsa tanlanmaydi va ko'chmaydi, tanlov o'zgarmaydi. Space ushlab turilganda vaqtincha qo'l, qo'yib yuborilganda avvalgi asbob; oyna fokusni yo'qotsa (Cmd+Tab) qo'l "yopishib" qolmaydi. Matn maydoni, dialog yoki menyuda `V`/`H`/Space ularniki.
- Kursor: qo'lda `grab`, tanlashda odatiy. Fon sudrash tanlash rejimida ham suradi (ramka bilan tanlash — EDT-30).
- Fayllar: `components/canvas/Canvas.tsx`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Chrome'da (eval bazasining nusxasi): sintetik `h` → qo'l yoqildi, `v` → o'chdi, Space bosib turilganda yoqiq va kadrlar `pointer-events-none`, qo'yib yuborilganda o'chdi, textarea ichida `h` ta'sir qilmadi; qo'l tugmasi bosildi → kadr ustidan haqiqiy sudrash: kanvas surildi (translate 105→283, 70→188), kadr joyida (908,0), tanlov yo'q; tanlash rejimiga qaytib kadr bosildi → tanlandi, joyida. Eslatma: brauzer asbobi sahifa ochilgandan keyingi birinchi haqiqiy bosishlarni ba'zan yetkazmaydi — bir necha marta qayta urinildi; kod tomonidan xato yo'q.

### Kadr faqat `⠿` tutqichdan sudraladi; kadr ichini bosish — tanlash — EDT-27
- Kadr har joyidan sudralardi: tanlamoqchi bo'lib bosganda bir-ikki piksel qimirlasa ekran ko'chib ketardi. Endi `Canvas` sudrashni faqat `data-canvas-handle` dan boshlaydi — kadr sarlavhasidagi `⠿` (`FrameHandle`, `FrameToolbar.tsx`); yiqilgan kadr sarlavhasida ham bor. Kadrning qolgan joyini bosish — tanlash, xolos (fon ham surilmaydi).
- Yo'lda: kadr sudralayotganda kanvas balandliklarga ergashib o'zini qayta "fit" qilardi (faqat pan/zoom uni to'xtatardi) — endi kadrni joylashtirish ham foydalanuvchining tartibi hisoblanadi.
- Fayllar: `components/canvas/Canvas.tsx`, `FrameToolbar.tsx`, `routes/p.$projectId.tsx`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Chrome'da (eval bazasining nusxasi): kadr tanasidan sudrash — pozitsiya o'zgarmadi (DOM va baza 1362,0); `⠿` dan sudrash — ko'chdi va saqlandi (pointer jurnali: `down@svg(handle)`, `up … captured=true`; baza 1200,389); kadr tanasini bosish — tanlandi (ring va "Editing" chipi), joyidan qimirlamadi. Eslatma: 36% zoom'da tutqich ~9 px, brauzer asbobi bilan nishonga olish beqaror — sinovda o'lchash va bosish orasida bir necha marta yon DIV'ga tushdi; bu asbob cheklovi, kod emas.

### Cmd+Z / Shift+Cmd+Z: ekran kontenti, o'chirish, ko'chirish, nomlash, nusxa, tema — EDT-12
- Bekor qilish faqat suhbatdagi "Undo this step" tugmasi edi, va o'chirilgan ekran butunlay yo'qolardi. Endi `lib/undo-stack.ts`: har amal o'zining teskarisini biladigan qadam qoldiradi; Cmd+Z uni qaytaradi va redo tomoniga o'tkazadi, Shift+Cmd+Z qaytadan qiladi, yangi amal redo tomonini tozalaydi (har muharrirdagidek). Qadamlar serverni chaqiradi — bekor qilinadigan narsa saqlangan holat.
- **Kanvas amallari** o'z teskarisi bilan yoziladi: o'chirish ↔ tiklash, ko'chirish ↔ orqaga ko'chirish, nomlash ↔ eski nom, nusxa ↔ nusxani o'chirish, versiya strelkasi ↔ qarama-qarshi strelka, Theme panelidagi o'zgarish (bir surish = bir qadam, boshlangan temadan).
- **Suhbat yozgan o'zgarishlar** (qo'l tahrirlari, model tahrirlari, "make it blue") yangi agent xabaridan olinadi va o'sha stack'ka tushadi: undo = xabarni revert qilish; revert xabari nima qilganini xuddi shu shaklda yozadi (`removed` / `created` / `versionId` / `previousTheme`), shuning uchun **redo = revert'ning revert'i**. `revertMessage` endi `revert` turidagi xabarlarga ham ishlaydi va yangi xabar ID sini qaytaradi; chatda revert xabarida "Redo this step".
- **O'chirilgan ekran qatori qoladi** (`screens.deleted_at`, migratsiya 0014) — versiyalari bilan; `forProject` va `positions` uni ko'rsatmaydi, `find` topadi (tiklash uchun). O'chirish dialogi endi "⌘Z brings it back" deydi. `ScreenController.restore`, `restoreScreen` fn.
- Cmd+Z tanlangan kadr ichida bosilsa ham ishlaydi: ko'prik `od:undo` yuboradi (`ScreenFrame.onUndo`). Matn maydoni, dialog yoki menyu ichida Cmd+Z ularniki, kanvasniki emas.
- Yo'lda tuzatilgan: kadrni sudragandan keyin kanvas o'z mahalliy pozitsiyasini abadiy saqlab qolardi — undo bazani qaytarsa ham kadr joyida turardi. Endi mahalliy pozitsiya qaysi props'dan sudralganini eslaydi va props o'zgargach (saqlash yetib keldi yoki undo) unutiladi; ko'chirish saqlangach loyiha qayta yuklanadi.
- Fayllar: `lib/undo-stack.ts`, `database/migrations/0014_add_screen_deleted_at.ts` (yangi); `schema.ts`, `migrate.ts`, `Models/Screen.ts`, `HistoryController.ts`, `ScreenController.ts`, `server/fns.ts`, `lib/agent-messages.ts`, `lib/edit-bridge.ts`, `ScreenFrame.tsx`, `Canvas.tsx`, `FrameToolbar.tsx`, `ChatPanel.tsx`, `routes/p.$projectId.tsx`, `controllers.check.ts`, `element-ops.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: stack (undo/redo tartibi, yangi qadam redo'ni tozalaydi, yiqilgan qadam tashlanadi va xato chiqadi, xabar zanjiri m1 → rev(m1) → rev(rev(m1))); controller: qo'shilgan ekranni olib tashlash → qatori qoladi, ro'yxatdan chiqadi → revert'ning revert'i qaytaradi ("Brought back …") → yana olib tashlash; kontent o'zgarishining redo'si yozib boriladi; tema undo → redo; soft delete ro'yxat va joylashuv hisobida yo'q, restore qaytaradi, boshqa loyihadan rad. Chrome'da (eval bazasining nusxasi, GoBite): "Search" o'chirildi (dialog matni yangi) → 6 kadr → Cmd+Z → 7 → Shift+Cmd+Z → 6 → Cmd+Z → 7; nomlash "Menu Renamed" → Cmd+Z textarea ichida e'tiborsiz → tashqarida eski nom → redo → undo; "make it blue" → Cmd+Z → bazada tema `{}` … → redo → `{accent:#2563eb}`, chatda "Put the theme back…", "Applied the theme change again."; kadr haqiqiy sudrash (1362,0 → 1870,405, bazada ham) → haqiqiy Cmd+Z → 1362,0 (baza va DOM) → redo → undo; tanlangan kadr ichida fokus bilan Shift+Cmd+Z → redo ishladi.
- Kuzatuv: iframe'lar birinchi ochilishda 5–10 soniya oq turdi (Google Fonts stylesheet'i render'ni bloklaydi, 7 kadr birdan) — bu o'zgarishga aloqasi yo'q, alohida qator uchun nomzod.

### Kadr ustida `‹ v3 ›` versiya strelkalari va `⋯` menyu; History tabi olib tashlandi — EDT-09
- Versiyalar alohida "History" tabida, faqat tanlangan ekran uchun, faqat "Restore" edi. Endi har kadr sarlavhasida `‹ v2 ›` (versiya bittadan ko'p bo'lsa): strelka bosilsa ekran o'sha versiyani darhol ko'rsatadi, nomi ham o'shaniki; chegarada strelka o'chadi. Ekran qaysi versiyani ko'rsatayotgani `screens.version_id` da saqlanadi (migratsiya 0013) — `‹` dan keyin `›` aniq qaytadi, HTML tengligidan taxmin qilinmaydi.
- Eng yangi ishdan orqaga qadam avval uni ham versiya qilib saqlaydi — hech narsa yo'qolmaydi. Eski versiya ko'rsatilib turganda tahrir qilinsa, o'sha versiyadan davom etadi: `captureFrom` uni qayta nusxalamaydi (ko'rsatilayotgan versiya allaqachon snapshot), yangi kontent yana "eng yangi ish" bo'ladi (`updateContent` cursor'ni tozalaydi). Strelka suhbatga yozilmaydi: uning bekor qilinishi — qarama-qarshi strelka.
- Versiya tartibi: `created_at` sekundlarda bo'lgani uchun bir sekunddagi ikki snapshot tasodifiy tartiblanardi — endi `rowid` bilan aniq. `forScreen` eng eskisidan boshlaydi (indeks 0 = v1).
- Kadr asboblari: hover'da Rename / Duplicate / Delete / `⋯` (Regenerate, Copy HTML, View code, Download HTML); o'ng tugma menyusi ham shu to'rt amalni oladi ("Show history" o'rniga "Download HTML"). Sidebar: Chat / Theme. `HistoryPanel.tsx`, `getScreenVersions`, `restoreVersion`, `HistoryController.restore/versions` o'chirildi.
- Fayllar: `database/migrations/0013_add_screen_version_cursor.ts` (yangi), `schema.ts`, `migrate.ts`, `Models/Screen.ts`, `Models/ScreenVersion.ts`, `HistoryController.ts`, `ProjectController.ts`, `server/fns.ts`, `components/canvas/FrameToolbar.tsx`, `FrameContextMenu.tsx`, `Sidebar.tsx`, `routes/p.$projectId.tsx`, `controllers.check.ts`; `HistoryPanel.tsx` o'chirildi.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Test: 2 snapshot + eng yangi ish = 3/3; `‹` → 2/3 (eng yangi ish saqlanadi, 3 snapshot), `‹` → 1/3, yana `‹` — joyida; `›` `›` → 3/3, yana `›` — joyida, yurish snapshot qo'shmaydi; v2 da tahrir → nusxa emas, cursor null, 4/4; versiyasiz ekranda `‹` hech narsa qilmaydi; boshqa loyihadan rad. Chrome'da (eval bazasining nusxasi, ikki test versiya qo'shilgan GoBite): kadrda `‹ v3 ›` ko'rindi, History tabi yo'q; `‹` → "Version 2 of 3", iframe'da v2 HTML, nom "… v2"; `‹` → 1/3, `‹` o'chiq; yana `‹` — o'zgarmadi; `›` `›` → 3/3 eng yangi HTML, `›` o'chiq; bazada `version_id` eng yangi ishning snapshot'iga ko'rsatadi, 3 ta versiya; `⋯` menyu ochildi: Regenerate · Copy HTML · View code · Download HTML.

### Ekranni bo'laklab tahrirlash: 16–22s → 1,3–3s — EDT-19; Esc tasdiqlandi — EDT-24
- **EDT-19.** Ekran tahriri butun HTML'ni qayta yozardi: model har safar ~20–30 KB chiqarib, 16–22 soniya ketardi, so'ralmagan joylar ham "suzib" ketishi mumkin edi. Endi model faqat o'zgargan qismlarni qaytaradi — `<edit target="…">`, `op="delete"`, `after/before="…"` — kanvas ko'rsatadigan o'sha `data-od-id`lar bilan (`lib/screen-patch.ts`). Server ularni `annotateElements(screen.html)` ustiga splice qiladi: qolgan hamma narsa baytma-bayt o'zgarmaydi. Mos kelmagan, shell ichidagi yoki boshqa tahrir bilan ustma-ust tushgan bo'laklar tashlanadi va jurnalga yoziladi; hech biri mos kelmasa ekran o'zgarmaydi va suhbatda xato. Butun layout o'zgarsa yoki qiymatlarni sahifaning `<script>`i hisoblasa — model to'liq hujjat qaytaradi (eski yo'l zaxira bo'lib qoldi).
- Model avval `<affects>` qatorida ta'sirlangan elementlarni sanaydi; sanab, lekin tahrirlamaganlari jurnalga "Listed as affected but not edited: … — check them" bo'lib tushadi. Suhbat javobi o'zgargan qismlarni aytadi ("Updated “Home” — now v3: Heading “…”"), jurnalda "1.3 KB returned instead of the whole 27 KB screen".
- Ekran tahriri paytida kadr yarim yozilgan oqim bilan almashtirilmaydi (bo'laklar sahifa emas).
- **EDT-24.** Esc brauzerda tasdiqlandi: iframe ichida birinchi bosish elementdan, ikkinchisi ekrandan chiqaradi; sahifada ham. Kechagi "tab qotishi" 4 ta HMR sikli (komponent va route fayli, ekran tanlangan holda) bilan qayta hosil qilinmadi — ehtimol soxta test event'i bergan (tuzatilgan) xato va route qayta yuklanishining ustma-ust tushishi.
- Fayllar: `src/lib/screen-patch.ts` (yangi), `GenerateController.ts`, `lib/agent-messages.ts`, `routes/p.$projectId.tsx`, `lib/element-ops.check.ts`, `controllers.check.ts`, `docs/HANDOFF.md`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: bo'laklarni ajratish (fence ichida ham), qo'llash tartibi (almashtirilgan elementdan keyingi qo'shish yangi versiyadan keyin tushadi), ichma-ich va yo'q maqsadlar tashlanadi, shell va tegilmagan qism baytma-bayt; controller: model izohlangan ekran va shartnomani ko'radi, tegilmagan qism o'zgarmaydi, hech narsa mos kelmasa ekran o'zgarmaydi, to'liq hujjat hamon ishlaydi, "affects" farqi jurnalda. **Haqiqiy DeepSeek**, eval bazasining nusxasida, eski usul (to'liq qayta yozish) bilan bir xil so'rovlar: nomini o'zgartirish 18.8s → 1.5–2.0s, bo'limni o'chirish 15.9–16.5s → 1.3–2.3s, promo maydon qo'shish 22.1s → 3.2s — hammasi to'g'ri. Qiymat bir necha joyda bo'lgan so'rovlar: "yetkazish narxi $3.49, jami yangilansin" — `<affects>` bilan model to'liq hujjatni tanladi (script summalarni hisoblaydi), ikkala "Total" ham $29.47 (to'g'ri); "5 of 8 tasks done" — ikki yugurishning birida karta + ro'yxat + tugma tahrirlandi (script ishlagandan keyin ham hammasi izchil, 10s), ikkinchisida karta to'g'ri, lekin ro'yxat sarlavhasidagi eski "2 of 5 done" qoldi. Chrome'da chat orqali: ekran tanlandi → so'rov → 3.0s, kadr almashtirilmadi, yangi sarlavha kadrda.
- **Cheklov (halol):** bitta qiymat bir necha joyda turgan so'rovlarda model ba'zan bir joyni unutadi — kod buni to'liq majburlay olmaydi; "affects" jurnali uni ko'rinadigan qiladi. Kerak bo'lsa keyingi qadam: bunday so'rovlar uchun tahrirdan keyin ikkinchi arzon tekshiruv chaqiruvi.

## 2026-09-21

### Muharrir M2 (qisman): element bilan to'g'ridan-to'g'ri ishlash, "make it blue", sidebar chapda — EDT-23, EDT-24, EDT-17, EDT-25, EDT-26, EDT-18, EDT-31
- **EDT-23 · Har mazmunli element tanlanadi.** `lib/html-tree.ts` (yangi): original satr ustidagi minimal HTML daraxti (element chegaralari offset sifatida) — tahrir faqat o'zgargan baytlarni almashtiradi. `lib/element-ops.ts` (yangi): `annotateElements` tugma, havola, sarlavha, matn, rasm, input, karta (klass ishorasi bo'yicha) va tuzilma bloklariga deterministik `data-od-id` beradi; shell, ikonkalar, svg va script'ga tegmaydi. Brauzer render qilishda, server tahrirdan oldin **bir xil saqlangan HTML'da** ishlatadi — ID saqlanmasa ham ikkalasi bir xil ID'ga keladi. Idempotent. Model yozgan takroriy ID'lar (351 eval ekranidan 16 tasida ikkita "hero") va token bo'lmagan ID'lar ("Hero Section") deterministik qayta nomlanadi.
- **EDT-24 · "Select Element" tugmasi yo'q.** `lib/edit-bridge.ts` (yangi) har kadrda doim bor va xabar bilan yoqiladi — ekran tanlanganda iframe endi qayta yuklanmaydi. Bosish — ekran, tanlangan ekranda bosish — element (hover'da kontur), Esc — bir pog'ona yuqori. Tanlangan kadr ustida g'ildirak kanvasga uzatiladi (pan/zoom ishlashda davom etadi).
- **EDT-17 · Element yonida suzuvchi panel** (`ElementPanel`): element nomi ("Heading “Dinner, sorted”"), "Ask AI to change this…", Edit text, Replace photo, Duplicate, Move up/down, Delete. Kanvas zoom'idan qat'i nazar o'z o'lchamida (`--canvas-scale`).
- **EDT-25 · Matnni joyida tahrirlash, LLM'siz.** Ikki marta bosish → yozish → Enter; server faqat elementning o'z matnini almashtiradi (yonidagi ikonka qoladi, matn escape qilinadi). Ichida boshqa matnli element bo'lsa tahrir taklif qilinmaydi (odam boshqa joydagi matnni qayta yozgan bo'lardi) — brauzer va server bir xil qoida.
- **EDT-26 · Tezkor amallar LLM'siz:** o'chirish (qatori bilan), nusxalash (yangi ID'lar bilan), yuqoriga/pastga surish, rasmni yangi tavsif bilan almashtirish (Pexels, topilmasa halol bo'sh blok). Har biri versiya va suhbatda "Undo this step" li xabar (`kind: direct`) yaratadi.
- **EDT-18 · Niyat yo'naltirgich** (`lib/intent.ts`): "make it blue", "#ff8800 accent", "rounder corners", "ko'k qil", "сделай зелёным" → tema, darhol, hamma ekranga, generatsiyasiz; suhbatda xabar va "Undo this step" (oldingi tema saqlanadi). Ekran qismini aytgan so'rov ("make the header blue") yoki element tanlangan bo'lsa — generatsiya. Kirill uchun `\b` ishlamaydi — Unicode chegaralari.
- **EDT-31 · Sidebar chapda,** yig'iladi (tanlov eslab qolinadi); tablar Chat / Theme / History; Jury UI'dan olindi (kod qoldi). History tabi EDT-09 (kadr ustidagi versiya strelkalari) kelguncha qoladi.
- LLM orqali element tahriri endi o'sha annotatsiyalangan ID'lardan foydalanadi (eskirgan element — 409, token sarflanmaydi) va javobda element nomini aytadi. Element tahriri paytida ekran yarim yozilgan snippet bilan almashtirilmaydi.
- Yo'lda tuzatilgan: bir millisekundda yozilgan xabarlar tasodifiy tartiblanardi — ID'lar endi monoton; `data-od-img` regex'i `data-od-img-resolved` ni yeb qo'yardi.
- Fayllar: `lib/html-tree.ts`, `lib/element-ops.ts`, `lib/element-ops.check.ts`, `lib/edit-bridge.ts`, `lib/intent.ts`, `ElementController.ts`, `components/canvas/ElementPanel.tsx` (yangi); `ScreenFrame.tsx`, `Canvas.tsx`, `Sidebar.tsx`, `routes/p.$projectId.tsx`, `GenerateController.ts`, `ProjectController.ts`, `HistoryController.ts`, `Models/Message.ts`, `lib/agent-messages.ts`, `ChatPanel.tsx`, `server/fns.ts`, testlar, `package.json`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. `element-ops.check.ts`: daraxt (raw text, izohlar, void, yopilmagan teglar), annotatsiya (ID'lar, shell tegilmaydi, faqat atribut qo'shiladi, idempotent, takror/token bo'lmagan ID'lar), matn/o'chirish/nusxa/surish/rasm. 351 haqiqiy eval ekranida: 0 xato, ekran boshiga ~51 tanlanadigan element, ~21 tahrirlanadigan matn, ~13ms. `controllers.check.ts`: element controller (LLM chaqiruvisiz, versiya va xabar, qaytarish, boshqa loyiha rad), LLM element tahriri bir xil ID'lar bilan va 409, tema chatdan (yig'iladi, birma-bir qaytariladi). `services.check.ts`: intent (15 holat). Chrome'da (eval bazasining nusxasi): sidebar chapda; ekran tanlandi → iframe ichidagi haqiqiy ko'prik orqali sarlavha bosildi → panel "Heading …" bilan chiqdi → ikki marta bosish → matn yozildi → Enter → bazada saqlandi, versiya bor, suhbatda "Changed text on “Search — GoBite”: “Search” → “Dinner, sorted”."; Duplicate → Move down → Delete → Undo (bazada: to'rtta `direct` xabar, Delete qaytarilgan); "make it blue" → 7 kadr (yangi ekran yo'q), tema kadrlarda, undo → tema `{}`.
- **Tekshirilmagan / ochiq:** Esc brauzerda tasdiqlanmadi (sinovdagi soxta event `document` ga yuborilgan, handler `closest` da yiqildi — handler mustahkamlandi, qayta sinab ko'rilmadi). HMR qayta yuklashidan keyin fonda turgan tab ikki marta javob bermay qoldi; dev server qayta ishga tushgach sahifa javob berdi — sababi aniqlanmadi, qo'lda tekshirish kerak. EDT-19 (to'liq ekran tahriri butun HTML'ni qayta yozmasligi) boshlanmadi.

### Muharrir M1: agent suhbati — CHAT-01…08, GEN-09, EDT-29
"Chat" tabida faqat kirish maydoni bor edi: agent nima qilgani, qaysi so'rov qaysi ekranni o'zgartirgani hech qayerda ko'rinmasdi, reja kartasi sahifa yangilansa yo'qolardi.
- **CHAT-01 · Suhbat bazada.** `messages` jadvali (0012): rol, tur (`plan / add / edit / element / regenerate / revert / error`), matn, `meta` — ta'sirlangan ekranlar, har biri uchun o'zgarishdan **oldin** olingan versiya ID si, jurnal, davomiylik. Suhbatni controllerlar ish jarayonida yozadi; outright rad etilgan so'rov (404) iz qoldirmaydi.
- **CHAT-02 · Agent javobi kodda, 0 token** (`lib/agent-messages.ts`). Reja: "GoBite — … · Designed 6 screens: … · Tabs: Home · Orders · Every screen shares one set of data: 6 dishes and 4 restaurants". O'zgarish: "Updated “header” on “Home” — now v3", "Added “Welcome” under “Restaurant Feed”", "Redrew … The previous design is kept as v1". Hamma fakt pipeline'da bor, shuning uchun javob aniq va tekin.
- **CHAT-03 · Ekran chipi va ro'yxat — kanvas o'sha kadrga boradi** (`Canvas focus`): kadr markazga, 35–100% oralig'ida to'liq ko'rinadigan zoom'da.
- **CHAT-04 · "Undo this step".** Agent xabari o'zgartirgan ekranlarni o'sha xabardan oldingi versiyaga qaytaradi (joriy dizayn ham versiya bo'lib qoladi), yaratgan ekranni o'chiradi; xabar chizib qo'yiladi va "Removed … / Went back to …" yoziladi. Reja xabari qaytarilmaydi — bu ilovani o'chirish bo'lardi. Bir qadam bir marta qaytariladi; boshqa loyihaning xabari bilan ishlamaydi.
- **CHAT-05 · Stop va jarayon.** Yuborish tugmasi ish paytida Stop ga aylanadi (so'rov `AbortController` bilan uziladi → server oqimi yopiladi → LLM chaqiruvi to'xtaydi). Kirish maydoni ish paytida ham yozish uchun ochiq. Suhbatda "Stopped — nothing was changed."
- **GEN-09 / CHAT-06 · Xatolar odam tilida** (`friendlyError`): 402 → hisobda mablag' tugagan, 429 → limit, incomplete HTML → model to'xtab qolgan, tarmoq, 5xx. Xom matn jurnalda qoladi. Xato — suhbatda qizil xabar; tushgan kadrda ham shu matn.
- **CHAT-07 · Agent jurnali** (ochiladigan): reja (arxetiplar, tablar, ma'lumot obyektlari, vaqt), brief qamrovi va tuzatish aylanishi bo'lgan-bo'lmagani, har ekran — vaqt, hajm, lint, topilgan rasmlar; tokenlar (`LlmService` endi usage'ni chaqiruvchiga ham beradi). Stitch'dagi "Agent jurnali" ning o'xshashi, lekin bizniki deterministik.
- **CHAT-08 · Keyingi qadam takliflari** (`lib/suggestions.ts`), loyihadagi faktlardan: root ekrani yo'q tab → "Design the Orders tab"; `data-od-link` ko'rsatgan, lekin chizilmagan ekran → "Design the “Order Tracking” screen" (eng ko'p havola qilingani birinchi); so'ng umumiylari. Chip promptni to'ldiradi.
- **EDT-29** · Enter — yuborish, Shift+Enter — yangi qator (IME yozayotganda emas). Element tanlangandagi `toast` olib tashlandi.
- Fayllar: `0012_create_messages_table.ts`, `Models/Message.ts`, `lib/agent-messages.ts`, `lib/suggestions.ts`, `components/canvas/ChatPanel.tsx` (yangi); `PlanController.ts`, `GenerateController.ts`, `HistoryController.ts`, `ProjectController.ts`, `server/fns.ts`, `LlmService.ts`, `PlannerService.ts`, `Models/ScreenVersion.ts`, `schema.ts`, `migrate.ts`, `PromptBox.tsx`, `generate.ts`, `generatePlan.ts`, `Canvas.tsx`, `routes/p.$projectId.tsx`, testlar.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. `controllers.check.ts`: suhbat ketma-ketligi, versiyaga ishora, jurnal, odam tilidagi xato + jurnaldagi xom matn; qaytarish ekranni aynan o'sha snapshot'ga qaytaradi va qaytarilgan dizaynni saqlaydi; ikkinchi marta va begona loyihadan — rad; qo'shilgan ekran qaytarilsa o'chadi; reja suhbati va uning qaytarilmasligi. `services.check.ts`: javob matnlari (ko'plik: dishes, categories, boxes), xato xaritasi, takliflar tartibi. Chrome'da (eval bazasining nusxasi, 3114-port, haqiqiy DeepSeek): bo'sh holat va chiplar; chip → prompt to'ldi → yuborildi → "Designing a new screen…" + Stop ko'rindi, kirish maydoni ochiq; 12 soniyada "Added “GoBite — Welcome” under “GoBite — Restaurant Feed”." + chip + jurnal ("11.8s, 11 KB, 1 photo", "Tokens: 6,641 in (5,120 cached), 3,228 out"); chip bosilganda zoom 32% → 96% va ekran tanlandi; "Undo this step" → kadrlar 8 → 7, xabar chizildi, "Removed …" qo'shildi, Undo qayta taklif qilinmadi; ikkinchi so'rov 3 soniyada Stop qilindi → "Stopped — nothing was changed.", kadrlar 7; sahifa yangilangach suhbat joyida.

### Muharrir M0: buglar — EDT-20, EDT-21, EDT-16, EDT-22, GEN-08
`docs/EDITOR-PLAN.md` qabul qilindi (Jury/History tablarini olib tashlash, chatni chapga ko'chirish, generatsiya rejasining qolgani muharrirdan keyin — foydalanuvchi rozi). Qatorlar Notion'da yangi `M · Muharrir UX` bosqichida (21 yangi + 12 mavjud qator ko'chirildi), "Muharrir doskasi" ko'rinishi bilan.
- **EDT-20 · Element tanlash boshqa ekranga ketardi.** Har `ScreenFrame` bitta `window` da `message` tinglaydi va manbani tekshirmasdi: 7 kadr — 7 javob, har biri o'z ekranini "tanlangan" qilardi. Endi kadr faqat o'z iframe'idan kelgan xabarni qabul qiladi (`e.source`). Balandlik xabarlari ham endi 7 marta emas, bir marta ishlanadi.
- **EDT-21 / EDT-16 · Kanvas hamma kadrni ko'rsatib ochiladi.** Avval 100% da ochilardi — 6 ekrandan 2.5 tasi ko'rinardi. Endi loyiha ochilganda va ekranlar to'plami o'zgarganda `fit` (100% dan oshmaydi). Kadrlar haqiqiy balandligini render'dan keyin bildiradi, shuning uchun birinchi `fit` tor chiqardi (7 kadrdan 5 tasi sig'di) — endi foydalanuvchi ko'rinishni o'zi surmaguncha kanvas ularga ergashadi.
- **EDT-22 · "Reload" → "Regenerate".** Eski Reload ekranni qayta yaratmasdi — oxirgi promptni *tahrir* sifatida qayta yuborardi. Regenerate ekranni saqlangan **spetsifikatsiyasidan** (`screens.spec`, 0011 migratsiya — `prompt` har tahrirda ustidan yoziladi) o'z slotida, ilova konteksti, shell va ma'lumot modeli bilan qayta chizadi; joriy dizayn versiyaga o'tadi.
- **GEN-08 · Tushgan ekran o'z joyida qoladi.** Rejali yugurishda chizilmagan ekran ilgari shunchaki mavjud bo'lmasdi (6 ekranli reja jimgina 5 taga aylanardi). Endi u `html=''`, `error` va `spec` bilan saqlanadi; kanvasda o'z slotida "This screen was not drawn · sabab · Try again / Remove" kartasi. Preview va eval bunday ekranlarni o'tkazib yuboradi.
- Yo'l-yo'lakay: nusxalangan detail ekran `root-tab` bo'lib qolardi (tur va ota-ona ko'chirilmasdi) — tuzatildi. Test topgan bug: provayder birinchi baytdan oldin rad etsa (402/429), xato ekranga yozilmasdi — endi yoziladi.
- Fayllar: `ScreenFrame.tsx`, `components/canvas/Canvas.tsx`, `FrameContextMenu.tsx`, `routes/p.$projectId.tsx`, `routes/preview.$projectId.tsx`, `generate.ts`, `GenerateController.ts`, `PlanController.ts`, `ScreenController.ts`, `Models/Screen.ts`, `schema.ts`, `migrate.ts`, `0011_add_screen_spec_and_error.ts` (yangi), `controllers.check.ts` (yangi), `new-features.check.ts`, `eval/run.ts`, `package.json`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Yangi `controllers.check.ts` (DeepSeek stub, xotiradagi baza): qayta urinish saqlangan spec'dan va ilova kontekstidan chiziladi, ekran o'zining "qo'shnisi" sifatida sanalmaydi, slotiga mos header oladi, `prompt` ustidan yozilmaydi, tushgan ekrandan versiya olinmaydi, chizilganidan olinadi; muvaffaqiyatsiz urinish oxirgi yaxshi dizaynni qoldiradi va sababni yozadi; rejali yugurish tushgan ekranni slot, tur, ota-ona va spec bilan saqlaydi. Chrome'da (eval bazasining nusxasi, 3113-port): begona `postMessage` endi hech narsani tanlamaydi (avval "Restaurant Feed" ni tanlardi); loyiha 34% da ochilib 7/7 kadr to'liq ko'rinadi (tuzatishdan oldin 5/7); qo'lda "tushgan" qilingan Cart ekrani o'z slotida xato kartasi bilan chiqdi, "Try again" haqiqiy DeepSeek orqali uni qayta chizdi — 23 KB, xato tozalandi, shell bor, ma'lumot modelidagi "Pad Thai" ishlatilgan.

### Muharrir UX auditi va rejasi (taklif) — hujjat, kod o'zgarmadi
`docs/EDITOR-PLAN.md`: muharrir kodi to'liq o'qildi, brauzerda ishlatildi, Sleek va Stitch muharrirlarining skrinshotlari bilan solishtirildi. 20 ta topilma (suhbat tarixi yo'q, elementni tahrirlash 4 qadam va qo'pol, undo/versiya strelkalari yo'q, Stop yo'q, kanvas 100% da ochiladi, 4 ta tab…), olib tashlanadiganlar ro'yxati va M0–M5 fazalari.
- Tasdiqlangan bug (E2): `ScreenFrame` `od:select_element` xabarining manbasini tekshirmaydi — sahifaning o'zidan yuborilgan soxta xabar hech qaysi kadr tanlanmagan holda "Restaurant Feed" ni tanlab, `Target: [header]` qo'ydi. Ko'p ekranli loyihada element tahriri noto'g'ri ekranga ketishi mumkin. Tuzatish — rejada EDT-20.
- Fayllar: `docs/EDITOR-PLAN.md` (yangi).
- Tekshirildi: eval bazasining nusxasida alohida dev server (3112-port), `data.db` ga tegilmadi.

### Prototipda kontent ichidagi bosishlar ishlaydi — UX-05
Preview'da faqat tab bar va "orqaga" ishlardi; taom kartasini bossang hech narsa bo'lmasdi — eng tabiiy harakat o'lik edi.
- Planner v2 har ekranga `linksTo` beradi, `screenSpec` modelga `data-od-link="<ekran nomi>"` qo'yishni aytadi. Ko'prik (`preview-bridge.ts`) endi `[data-od-link]` bosilishini ham ushlab, `od:navigate_link` yuboradi; preview sahifasi ekranni topib o'tadi.
- **`screenByName`.** Reja nomi "Dish Detail", bazadagi nom esa modelning sarlavhasi — "Dish Detail — GoBite". Moslash: aniq → biri ikkinchisining ichida → so'zlarning ≥60% i. Topilmasa — hech narsa (ro'yxatdagi ko'p qatorlarning ortida ekran yo'q; xato ekranga o'tishdan ko'ra jim turish yaxshi). Shu funksiya "orqaga" ni ham tuzatdi: u ilgari faqat aniq nom bilan ishlardi va deyarli doim birinchi root ekranga tushardi.
- Fayllar: `src/lib/preview-bridge.ts`, `src/routes/preview.$projectId.tsx`, `new-features.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: reja nomi sarlavha ichidan topiladi; `&amp;` va tinish belgilari farq qilmaydi; so'zlarning ko'pi yetarli; chizilmagan ekran — `undefined`; "orqaga" uzunroq sarlavhali ota-onani topadi. Chrome'da, `plan2` dagi GoBite loyihasida (eval bazasining nusxasi bilan alohida dev server, `data.db` ga tegilmadi): sandbox ichidagi haqiqiy `click` → "1 / 7 · Restaurant Feed" dan "2 / 7 · Restaurant Menu" ga, keyin "Cart &amp; Checkout" havolasi → "4 / 7 · Cart & Checkout", "Order Tracking" → "5 / 7"; URL `?s=` yangilandi. Chekka holatlar: chizilmagan ekranga havola ("Live Chat Support") va o'ziga havola — joyida qoladi. Eslatma: tab fonda (`visibilityState: hidden`) bo'lgani uchun koordinata bo'yicha bosish ishlamadi; bosish iframe ichidan skript bilan chaqirildi — hodisa zanjiri o'sha.

### Planner v2: har ekranning ishi, brief qamrovi va bitta ma'lumot modeli — UX-03, UX-04
Piksellar tuzalgach eval'da qolgan eng katta muammo reja edi: brief "savat va checkout, jonli kuzatuv" so'rasa, planner Search / Orders / Profile berardi; 5 ekranga 5 tab ochardi; har ekran o'z kontentini to'qirdi (feed'dagi taom detalda boshqa nom, boshqa narx).
- **Qamrov.** Planner avval brief so'ragan ekranlarni `requested[]` ga yozadi, har ekran `covers` bilan qaysi birini bajarishini aytadi. `parsePlan` qoplanmaganini hisoblaydi (`uncovered`), `planScreens` esa **bitta tuzatish aylanishi** qiladi: "bular tushib qoldi; avval hech kim so'ramagan profile/settings/search'ni almashtir". Tuzatilgan reja faqat kamroq tushirgan bo'lsa qabul qilinadi.
- **Spetsifikatsiya.** Har ekran: `archetype` (20 talik yopiq ro'yxat; noma'lumi nomdan, keyin turdan taxmin qilinadi), `userGoal`, `primaryAction`, `sections[]` (tepadan pastga), `linksTo[]` (faqat rejadagi boshqa ekran nomlari qoladi). `screenSpec()` buni chizuvchi modelga tayyor qaror qilib beradi — u endi nima chizishni emas, qanday chizishni hal qiladi.
- **Ma'lumot modeli (UX-04).** `entities[]`: 1–3 tur, har birida aniq qiymatli obyektlar. `dataBlock()` uni har ekran promptiga "yagona manba" sifatida qo'yadi. `projects.plan` ustunida saqlanadi (0010 migratsiya), shuning uchun chatdan keyin qo'shilgan ekran ham o'sha taomlar/tranzaksiyalardan foydalanadi.
- **Kodda:** root ekrani yo'q tab'lar olib tashlanadi (kamida 2 tab qolsa) — prototipda hech qayerga olib bormaydigan tab xato bo'lib ko'rinadi; ekranlar chegarasi 5 → 6; planner `max_tokens` 1024 → 4000 (v2 JSON 1024 da kesilardi).
- Eval: reja `plan` hodisasidan olinadi; yangi `plan.*` metrikalari — `archetypeRecall` (brief'dagi `expect` bilan multiset solishtirish — planner'ning o'z bahosiga tayanmaydi), `uncoveredScreens`, `tabsMean`, `dataItemsUsedShare`, `dataItemsOnTwoScreensShare`.
- **Tartibdan chetga chiqildi** (foydalanuvchi ruxsati bilan): `Tartib` bo'yicha avval UX-01/02 (kataloglar) turardi. Avval sxema va o'lchov qilindi, chunki kataloglarning foydasini faqat shu orqali o'lchash mumkin.
- Fayllar: `PlannerService.ts`, `ScreenContext.ts`, `LlmService.ts` (`maxTokens`), `PlanController.ts`, `GenerateController.ts`, `Project.ts`, `schema.ts`, `migrate.ts`, `0010_add_project_plan.ts` (yangi), `services.check.ts`, `eval/run.ts`, `eval/metrics.ts`, `eval/sheet.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: qoplanmagan so'rov hisobotga tushadi; `covers` faqat haqiqiy indekslar; noma'lum archetype taxmin qilinadi; havolalar haqiqiy nomga keltiriladi, o'ziga va yo'q ekranga havola tashlanadi; o'lik tab'lar kesiladi; entity'lar tozalanadi (faqat satr, bo'sh tur/obyekt yo'q); eski shakldagi reja hamon ishlaydi; saqlangan reja buzuq JSON'ga chidamli. Eval (`plan2`: food-delivery, notes-ai, bank-neo, vague-todo): so'ralgan 15 ekrandan **0 tasi tushib qoldi**, `archetypeRecall` 0.94, tab o'rtacha 3, `root-tab` ulushi 0.67 → 0.44, ma'lumot obyektlarining 83% i ekranlarda ishlatilgan, **56% i ikki va undan ortiq ekranda**; lint toza 0.72 → 1.0. Varaqda: food-delivery — Feed → Bangkok Garden menyusi → Pad Thai ($12.99) → Savat ($28.97) → Kuzatuv ($28.97) → Buyurtmalar ($28.97): bitta hikoya, bir xil raqamlar. 4 brief + 4 qo'shilgan ekran $0.20.
- Qoldi: bitta ekran "incomplete HTML" bilan tushdi (25 tadan 1; GEN-08 qayta urinish tugmasi shu uchun); vague-todo'da qo'shilgan ekran mavjud "Task Detail" ni takrorladi.

### Ilova belgisi kodda chiziladi — AST-03
Model logotipni har ekranda boshqacha to'qirdi (yoki emoji qo'yardi). Endi `<img data-od-logo alt="">` sloti: `applyLogo` ilova nomidan monogramma yasaydi ("LingoStreak" → LS, "Nova Bank" → NB, "Продукты24" → П) — `var(--accent)` fonli, `var(--accent-on)` matnli, `var(--font-display)` dagi yumaloq kvadrat. Tokenlardan chizilgani uchun jonli temaga ergashadi va har ekranda bir xil.
- `resolveImages(html, signal, { name })` — ilova nomi ikkala controller'dan keladi (yangi bitta ekranli loyihada — ekranning o'z sarlavhasi). Logo va avatar slotlari hech qachon foto sifatida qidirilmaydi.
- `APP CONTENT` blokiga bitta qator: logoni qayerda ishlatish va "o'zing chizma".
- Fayllar: `lib/image-slots.ts`, `ImageService.ts`, `PlanController.ts`, `GenerateController.ts`, `lib/content-seed.ts`, `image.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: monogramma (camelCase, ikki so'z, kirill, bo'sh nom), model o'lchami saqlanadi, o'lchamsizga 56px, atribut matn ichida emas — teg ichida qidiriladi, `aria-label` escape qilinadi, idempotent. Eval (`ast03`: meditation, vague-dating): "Shelf Life" ilovasining ikki ekranida bir xil "SL" belgisi; 12 ekran, xato 0, $0.08.

### Avatarlar: bir odam — bir yuz, hamma ekranda — AST-02
Feed, chat, reyting ekranlarida odamlar bosh harfli doiralar edi — eng "jonsiz" joy.
- Shartnoma: `<img data-od-avatar="Full Name" alt="Full Name">`, o'lchami CSS'da. `ImageService` portretni ikki hovuzdan oladi (`woman portrait face` / `man portrait face`, har biri **bir marta** so'raladi, 40 tagacha yuz, `image_cache` da `avatar:<jins>:<n>`), indeks — ismning xeshi, shuning uchun bir odam har ekranda va keyin qo'shilgan ekranda ham o'sha yuz bilan chiqadi. 128×128 kvadrat kesim, doira, `object-fit:cover`.
- **Yuz ismga mos bo'lishi uchun** `content-seed` dagi ismlar jins bo'yicha ajratildi (`genderOf`). Faqat urug'langan odamlar (foydalanuvchi + cast) yuz oladi; model o'zi to'qigan ism uchun jins noma'lum — u tanga tashlab tanlangan portret emas, token rangli doirada bosh harflar oladi. Yo'l-yo'lakay tuzatildi: ruscha familiya endi ismning oxirgi harfiga emas, jinsga qarab moslanadi ("Никита" → "Соколов", avval "Соколова" bo'lardi).
- Avatar slotlari foto sloti sifatida qidirilmaydi (aks holda `alt="Zainab Novak"` bo'yicha tasodifiy rasm topilardi).
- Eslatma: ismlar ro'yxati tuzilishi o'zgargani uchun mavjud loyihalarning urug'langan foydalanuvchisi o'zgaradi (hali launch'dan oldinmiz).
- Fayllar: `lib/image-slots.ts`, `ImageService.ts`, `lib/content-seed.ts`, `craft/mobile.md`, `skills/mobile-screen`, `skills/web-screen`, `image.check.ts`, `services.check.ts`, `eval/metrics.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: bir odam — bir yuz; model bergan o'lcham saqlanadi, o'lchamsizga 40px; portret yo'q → bosh harflar; idempotent; ayol ismi ayollar hovuzidan; har jinsga bitta so'rov, keyin keshdan (kalitsiz ham); to'qima ism → bosh harflar va so'rov ketmaydi. Eval (`ast02`: lang-learn, social-photo, chat-team): 78 ta yuz, 0 ta bosh harf, standart persona 2 → 0, placeholder URL 42 → 0. Varaqda: reyting, feed, chat ro'yxati, DM'lar — yuzlar bilan, bir odam ekranlar aro bir xil.

### Model: DeepSeek V4 Flash, thinking o'chiq — aniq pin qilindi
Foydalanuvchi so'rovi: xarajat past tursin, faqat v4-flash. Tekshirdim (`GET /models` va sinov chaqiruvlari): API'da ikkita model bor — `deepseek-flash` va `deepseek-v4-pro`. Biz ishlatib kelgan `deepseek-chat` — aslida `deepseek-flash` ning thinking o'chirilgan taxallusi, ya'ni shu paytgacha ham flash'da edik. Lekin `deepseek-flash` ni **nomi bilan** chaqirsa thinking standart yoqiq keladi ("17*23" ga 1 token o'rniga 22 token, 20 tasi reasoning) — reasoning tokenlari chiqish narxida hisoblanadi va oqimning birinchi baytini kechiktiradi.
- `LlmService`: `model: 'deepseek-flash'` + `thinking: { type: 'disabled' }` ikkala chaqiruvda. Taxallus qayta yo'naltirilsa ham xatti-harakat o'zgarmaydi.
- `CLAUDE.md` model siyosati va `.env.example` yangilandi.
- Fayllar: `LlmService.ts`, `new-features.check.ts`, `CLAUDE.md`, `.env.example`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza; test so'rov tanasida model va `thinking: disabled` ni tekshiradi. Haqiqiy yugurish (`flashpin`, 1 brief): 5 ekran, 52s, ekran p50 16.0s, $0.035 — oldingidek.

### Haqiqiy rasmlar: model tasvirlaydi, kod topadi — GEN-26, AST-01, AST-04
Baseline'dagi eng ko'zga tashlanadigan kamchilik — rasm o'rnida "592 × 333" yozuvli kulrang qutilar. Model ishlaydigan rasm URL'ini bila olmaydi; qoidalar esa bir-biriga zid edi: skill `placehold.co` ni buyurardi, craft uni taqiqlab, repoda umuman yo'q `.ph-img` klassini tavsiya qilardi.
- **Shartnoma (GEN-26):** model `<img data-od-img="grilled salmon bowl, top view" alt="…">` yozadi — `src` siz. Mobil va web skill, `craft/mobile.md`, `anti-ai-slop.md` endi bir xil gapiradi; `placehold.co` va `.ph-img` repodan chiqdi. Odamlar avatari — doira ichida bosh harflar (GEN-22 dagi persona bilan mos).
- **Resolver (AST-01):** `lib/image-slots.ts` (sof: slotlarni topish, so'rovni normallashtirish, natijani qo'yish) + `ImageService` (Pexels qidiruvi) + `image_cache` jadvali (0009 migratsiya). Bir so'rov — umrida bitta API chaqiruv; bo'sh natija ham eslab qolinadi, provayder xatosi (429, timeout) esa **eslab qolinmaydi**. Model baribir placeholder CDN yozsa (`placehold.co`, `picsum`, …), u ham slot deb olinadi va `alt` bo'yicha to'ldiriladi. Ikkala controller saqlashdan oldin chaqiradi.
- **Xavfsizlik:** kalit faqat serverda, header'da ketadi (URL'da emas); API qaytargan URL faqat `https://images.pexels.com/` bilan boshlansa qabul qilinadi; `avg_color` hex ekanligi tekshiriladi; so'rov matni harf-raqamga tozalanadi.
- **Slot qutisi qulflangan (AST-04):** har to'ldirilgan rasmga `object-fit:cover; display:block; width:100%` va o'lcham berilmagan bo'lsa `aspect-ratio:4/3`, yuklanguncha fon — rasmning o'rtacha rangi. Rasm layout'ni hal qilmaydi. Rasm topilmasa — singan rasm emas, `var(--surface)`→`var(--border)` gradientli blok (`data-od-img-fallback`), `alt` `aria-label` ga o'tadi.
- Eval metrikasi: `images.filled / fallbackBlocks / placeholderUrls / screensWithPhoto`.
- Yo'lda: GEN-18 qoidasi soxta signal berdi — nike uslubidagi krossovka do'koni "Nike Air Max 90" sotadi va bu oqish emas. Brend atamalari endi faqat `<title>` da (ilova o'zini shunday atasa) tekshiriladi; nike'ning `anywhere` ro'yxati bo'shatildi. `data.db` dagi uchta haqiqiy oqish hali ham topiladi.
- Fayllar: `src/lib/image-slots.ts`, `src/app/Services/ImageService.ts`, `src/app/Models/ImageCache.ts`, `0009_create_image_cache_table.ts` (yangi), `migrate.ts`, `schema.ts`, `PlanController.ts`, `GenerateController.ts`, `design-lint.ts`, `leak-terms.json`, `skills/mobile-screen`, `skills/web-screen`, `craft/mobile.md`, `craft/anti-ai-slop.md`, `image.check.ts` (yangi), `eval/metrics.ts`, `.env.example`, `package.json`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. `image.check.ts` (soxta `fetch`, xotiradagi baza): so'rov tozalanadi va 80 belgida kesiladi; placeholder CDN — slot, to'ldirilgan `src` va `data:` — emas; takroriy so'rov bitta chaqiruv; begona host rad etiladi; bo'sh natija keshlanadi, 429 keshlanmaydi; kalitsiz — so'rov ketmaydi, blok chiqadi; idempotent. Eval (`ast01`: food-delivery, recipe-book, shop-sneakers, travel-planner, baseline bilan): placeholder URL **77 → 0**, to'ldirilgan rasm 0 → 124, fallback blok 1, ekranlarning 88% ida foto; ekran p50 22.1s → 17.7s, xato 0. Varaqda: taomlar, retseptlar, krossovkalar, shaharlar — so'rovga mos fotolar, layout buzilmagan.
- Eslatma: Pexels bepul tarifi 200 so'rov/soat — to'liq 25-brief eval bir soatda undan oshishi mumkin (oshsa, bloklar chiqadi, yugurish yiqilmaydi). Pexels shartlari foto ko'rsatilgan joyda "Photos provided by Pexels" havolasini so'raydi — landing/eksportga qo'shiladi (MKT-01, EXP-03).
- Shu bilan birga: `title` bermagan artifact endi "Untitled" emas — o'z `<title>` i, bo'lmasa birinchi `h1`/`h2` bilan nomlanadi (eval'da qo'shilgan ekranlardan biri "Untitled" bo'lib chiqqan edi; test qo'shildi).
- Ko'rindi, keyinroq: sayohat ekranida bitta ulkan o'lchamsiz ikonka (EYE-01 auditi ushlashi kerak).

### Temperature aniq yozildi va o'lchandi — GEN-25
`LlmService` temperature'ni umuman bermasdi (provayder standarti). Endi ikkalasi kodda: ekran 1.0, planner 1.0, eval A/B uchun `LLM_TEMPERATURE_SCREEN` / `LLM_TEMPERATURE_PLAN` env bilan almashtiriladi.
- **Topilma: temperature bu yerda dastak emas.** 4 brief × 20 ekran, 0.6 / 1.0 / 1.3: lint toza 0.90 / 0.95 / 0.95, turli ilovalardagi bir xil turdagi ekranlar o'xshashligi 0.133 / 0.127 / 0.137, ekran p50 17.3 / 18.2 / 18.1s, o'rtacha HTML 23.2k / 22.6k / 23.1k belgi — hammasi shovqin ichida. "Hamma ekran bir xil" ni sampling bilan davolab bo'lmaydi; xilma-xillik kodda tanlangan variantlardan keladi (VAR-01/02). Shuning uchun 1.0 qoldi.
- Ko'z bilan solishtirish uchun: `eval/out/<…>-t13/ab.html` — 1.3 va 0.6 ko'r-ko'rona juftlangan.
- Fayllar: `src/app/Services/LlmService.ts`.
- Tekshirildi: `tsc` toza; ikki eval yugurishi (`t06`, `t13`, `--no-add`), `gen23` bilan shu 4 brief bo'yicha solishtirildi. `t06` dagi 1 xato — incomplete HTML, temperature'ga bog'lab bo'lmaydi (n=1).

### Accent byudjeti dizayn tizimiga qarab — GEN-24
"`var(--accent)` ko'pi bilan ikki marta" hamma tizimga bir xil taqiq edi: til o'rganish ilovasida hamma progress qora chiqqan, holbuki duolingo uslubida ekranning uchdan biri yashil bo'lishi kerak.
- Qiymat manbai bitta: har `STYLE.md` ning "Colour energy: low | medium | high" qatori (`DesignSystemService.readColorEnergy`). `manifest.json` ga ikkinchi nusxa yozilmadi — uchta tizimda manifest yo'q, va ikki manba bir-biridan uzoqlashadi.
- Prompt tomoni GEN-23 da: `craft/mobile.md` "accent'ni kartaning Colour energy qatoriga qarab sarfla" deydi, tekis chegara olib tashlangan (test ushlab turadi).
- Lint `accent-energy-mismatch` (`warn`): yuqori energiyali tizimda accent deyarli yo'q (<4 murojaat) yoki past energiyalida hamma joyda (>20). Chegaralar o'lchovdan: 228 eval ekranida mediana 6 / 7 / 11 (low / medium / high), lekin taqsimotlar kuchli ustma-ust — shuning uchun faqat chekkalar. Bu murojaatlar soni, bo'yalgan yuza emas; render auditi (EYE-01) kelganda almashtiriladi.
- Fayllar: `src/lib/design-lint.ts`, `DesignSystemService.ts`, `PlanController.ts`, `eval/metrics.ts`, `services.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Testlar: har 33 karta energiyasini aytadi; duolingo `high`, minimal `low`; chegaralarning ikki tomoni; `medium` hech qachon yonmaydi; shell'dagi accent sanalmaydi; skill va craft'da tekis chegara yo'q. Mavjud yugurishlarda: baseline'da 2 ta topilma, `gen23` da 0.

### Mobil system prompt 78k → 18k belgi — GEN-23
GEN-17 dan keyin ham mobil prompt ~78 000 belgi edi: to'qqizta craft fayl (~1200 qator) — WCAG'ning yurisdiksiyalar bo'yicha huquqiy tahlili, React forma kutubxonalari, Android predictive-back API'si, landing sahifa bo'limlari. Statik telefon ekrani chizayotgan tez model uchun bu shovqin: qoidalar bir-birini bosib ketadi va model hammasining o'rtachasini chiqaradi.
- `craft/mobile.md` (yangi, 83 qator): o'n bo'lim — bitta ekran bitta ish, ierarxiya va tip, rang, layout va teginish, komponentlar, kontent, ikonkalar, harakat, accessibility, ilova ichida. Apple HIG uslubida yozilgan: har qoida — **qaror + sababi**, o'lchanadigan raqamlar bilan (body ≥15px, hech narsa <11px, nishon ≥44px, 16px chekka, 4px shkala, kontrast 4.5:1). Linter majburlaydigan hamma narsa (indigo, emoji ikonka, qo'lda SVG, token'siz rang, filler matn, to'qima metrika) saqlangan.
- "Accent ko'pi bilan 2 marta" olib tashlandi: o'rniga "uslub kartasining Colour energy qatoriga qarab sarfla" — past energiyali tizimni accent'ga bo'yash ham, yuqori energiyalini kulrang qoldirish ham xato.
- `skills/mobile-screen/SKILL.md` endi faqat `[mobile]` ni talab qiladi. Eski craft fayllar web skill'lar uchun joyida.
- Yo'lda: qo'shilgan ekranlardan birida sahifa pastida xom markdown chiqdi ("### Monthly Budget at a Glance…") — model `</html>` dan keyin tushuntirish yozgan. `extractArtifact` endi hujjatdan keyingi hamma narsani tashlaydi.
- Fayllar: `craft/mobile.md` (yangi), `skills/mobile-screen/SKILL.md`, `src/artifact.ts`, `services.check.ts`, `new-features.check.ts`.
- Tekshirildi: `npm run check` (exit 0), `tsc` toza. Test: har 33 tizim uchun mobil prompt < 24 000 belgi (hozir ~18k ≈ 4.6k token); `mobile.md` ≤150 qator; web esselari mobil promptda yo'q; `</html>` dan keyingi matn tashlanadi. Eval (`gen23`, 6 brief, baseline bilan, shu 6 brief bo'yicha): lint toza 0.73 → 0.97, `undefined-token` 4 → 1, brend oqishi 1 → 0, `fallbackIcons` 24 → 0, standart persona 3 → 0, `root-tab` ulushi 0.77 → 0.53, ekran p50 19.7s → 17.5s, xato 0. Varaqni ko'zdan kechirdim: sifat tushmadi — uslublar aniq (nike qora-oq siqiq sarlavhalar, duolingo yashil halqalar, midnight to'q), detal ekranlar ko'paydi, layout'lar xilma-xilroq. 6 brief + 6 qo'shilgan ekran $0.27 turdi.

### Ilova aholisi kodda tanlanadi — GEN-22
"Maya Chen" uchta begona loyihada foydalanuvchi bo'lib chiqqan; bitta ilovaning ekranlari ham har xil ism tanlashi mumkin edi.
- `lib/content-seed.ts`: `(projectId, til, kun)` dan sof funksiya — tizimga kirgan foydalanuvchi (ism, bosh harflar, email, shahar), 6 kishilik "cast" (do'stlar, jo'natuvchilar, reyting), bugungi sana va pul formati. Uch til: `en`, `uz` (so'm, Toshkent…), `ru` (₽, familiya ayol ismiga moslanadi). Til brief matnidan aniqlanadi (kirill → `ru`; "ilova/uchun/tilida…" → `uz`).
- Blok `screenBrief` orqali har ekran promptiga kiradi — rejali yugurishda ham, keyin qo'shilgan ekranda ham, shuning uchun bir oy keyin qo'shilgan ekran ham o'sha foydalanuvchini oladi.
- Tuzoq: qo'shilgan ekran uchun til avval chat xabaridan ham o'qilardi — o'zbekcha "yana bitta ekran qo'sh" ingliz tilidagi bank ilovasiga "Madina Abdullayeva" ni olib kirdi. Endi til faqat ilovaning mavjud ekranidan o'qiladi: odamlar ingliz ilovasining keyingi ekranini o'z tilida so'raydi.
- Fayllar: `src/lib/content-seed.ts` (yangi), `ScreenContext.ts`, `PlanController.ts`, `GenerateController.ts`, `services.check.ts`.
- Tekshirildi: `npm run check`, `tsc` toza. Testlar: bir loyiha — bir xil cast; 8 loyihada kamida 6 xil foydalanuvchi; cast'da takror va foydalanuvchining o'zi yo'q; til aniqlash uch tilda; kirill ism ham email oladi; ruscha familiya jinsga mos. Eval (`gen22`: bank-neo, uz-taxi, ru-delivery): bank ilovasining 6 ekranida bitta foydalanuvchi ("Zainab Novak" ×9) va o'z cast'i; `defaultPersonaBriefs` 1 → 0; o'zbek ilovasida so'm va o'zbek ismlari; rus ilovasida ₽, bir xil shahar va foydalanuvchining bosh harflari ("ТО") hamma ekranda.

### Ekran turlari kodda rost qilinadi — GEN-20
`data.db` dagi 39 ekranning 39 tasi `root-tab` edi: muharrir ham, checkout ham tab bar bilan chizilgan, ikki ekran bitta tab'ni yoritgan. Planner promptidagi JSON namunada faqat `root-tab` bor edi — model namunani ko'chirardi, kodda esa hech narsa tekshirilmasdi.
- `assignScreenSlots` (`parsePlan` ichida): tab'ni birinchi da'vo qilgan ekran oladi; tab'siz yoki noto'g'ri tab'li root ekran bo'sh tab'ni oladi (avval nomi mos kelganini, keyin navbatdagisini); tab'i band yoki tab qolmagan ekran `detail-view` ga aylanadi va tab'ning egasidan "push" qilinadi. Har `detail-view`/`modal-flow` ning ota-onasi — mavjud, boshqa ekran (katta-kichik harfga qaramay topiladi, topilmasa birinchi root). Root ekransiz reja birinchi ekranni kirish nuqtasi qiladi.
- Planner prompti: "tab'ga AYNAN BITTA root ekran; ekran ichidagi biror narsani bosganda ochiladigan hamma narsa — detail", va namunaga `parentScreen` li detail ekran qo'shildi.
- `eval/run.ts`: "oldingi" yugurish endi eng ko'p umumiy briefga ega bo'lgani (teng bo'lsa — eng yangisi).
- Fayllar: `PlannerService.ts`, `services.check.ts`, `eval/run.ts`.
- Tekshirildi: `npm run check`, `tsc` toza. Testlar: tarixiy holat (hammasi root, tab takrorlangan) → bitta tab bitta root, yutqazgan ekran yutganidan push qilinadi; tab'siz va noto'g'ri tab'li root nomiga mos bo'sh tab'ni oladi; 4 tab'ga 5 root → kamida 1 detail; yetim, o'zini ota-ona qilgan va tab yoritgan detail'lar tuzatiladi. Eval (`gen20`, 4 brief, baseline bilan): detalsiz brieflar 1 → 0, `root-tab` ulushi 0.80 → 0.67, lint toza 0.75 → 1.0, brend oqishi 1 → 0, `fallbackIcons` 20 → 0.
- Qoldi (UX-02/03): planner 5 ekranga 5 tab ochib, hammasini root qilishi mumkin (food-delivery, notes-ai) — bu endi tur xatosi emas, reja sifati. Qiziq tomoni: GEN-19 dagi "yetishmayotgan ekranni chiz" aynan o'sha bo'shliqni to'ldirdi ("Product Detail", "Note Detail").

### Qo'shilgan ekran o'z ilovasiga qo'shiladi — GEN-19
Chatdagi "yana bitta qo'sh" `GenerateController` ga yalang'och prompt bo'lib borardi: ilova nomi, ekranlar, navigatsiya, house style — hech narsa. Natijada kaloriya ilovasiga boshqa ilovaning ekrani, o'z tab bar'i bilan qo'shilgan (`data.db` dagi uchta "Lesson Complete" ekrani).
- `app/Services/ScreenContext.ts` (yangi): `shellContract`, `shellPartsFor`, `screenBrief` `PlanController` dan ko'chirildi va ikkala yo'l shulardan foydalanadi — rejali yugurishning prompt matni o'zgarmadi.
- Navigatsiyasi bor loyihaga ekran qo'shilganda: ilova nomi, mavjud ekranlar ro'yxati, shell shartnomasi, anchor ekrandan olingan house style digest, va "nom aytilmagan bo'lsa — ilovada yetishmayotgan eng foydali ekranni chiz, ro'yxatdagini qayta chizma". Shell kodda in'ektsiya qilinadi, `screenType` / `activeTabId` / `parentScreenName` bazaga yoziladi (preview'da "orqaga" ishlaydi).
- `slotForAddedScreen`: so'rov bo'sh tab'ning yorlig'ini aytsa — o'sha tab'ning root ekrani; aks holda birinchi tab ostidagi detail ekran. Band tab'ga ikkinchi root ekran hech qachon berilmaydi.
- Eval endi bu yo'lni ham o'lchaydi: har briefdan keyin haqiqiy `GenerateController` ga "yana bitta ekran qo'sh" yuboriladi (`--no-add` o'chiradi); varaqda `added` belgisi, metrikada `addedScreens` / `addedWithoutShell`.

Tekshirish paytida ikkita eski bug chiqdi va tuzatildi:
- **Detail header qator-flex `body` ichida ekran yonida tor ustun bo'lib qolardi.** Model 390px ustunni markazlash uchun `body{display:flex;justify-content:center}` yozadi; header `body` ning birinchi bolasi bo'lib in'ektsiya qilinadi va kontentni o'ngga surib chiqaradi. `normalizeShell` endi bunday `body` ni ustunga o'tkazadi (`<style data-od-shell="stack">`). Baseline'da 34 detail ekrandan 1 tasi, oxirgi ikki yugurishda 2 tasi shunday edi.
- **Sarlavhadagi `&amp;` ochilmasdi**: "Profile &amp; Goals" kanvasda aynan shunday ko'rinardi va header ichida ikkinchi marta escape qilinardi. `extractArtifact` endi sarlavhani oddiy matnga aylantiradi.
- Fayllar: `ScreenContext.ts` (yangi), `GenerateController.ts`, `PlanController.ts`, `lib/screen-normalizer.ts`, `artifact.ts`, `services.check.ts`, `eval/run.ts`, `eval/sheet.ts`, `eval/metrics.ts`.
- Tekshirildi: `npm run check`, `tsc` toza. Testlar: noaniq so'rov → birinchi tab ostida detail; bo'sh tab nomi → o'sha tab; band tab → detail; yorliq butun so'z bo'lib mos keladi; header `data-od-back` ota ekranni ko'rsatadi; desktopda shell yo'q; buzuq navigation JSON → `null`; qator-flex/grid/Tailwind `flex` body aniqlanadi, `flex-col` va blok body tegilmaydi, tuzatish idempotent, tab bar uchun qo'llanmaydi. Eval (`gen19`, 2 brief): ikkala qo'shilgan ekran o'z ilovasida ("SnapCal AI — Add Another Serving", "TaskFlow — New Task"), o'sha uslubda, `addedWithoutShell` 0. Header tuzatishi headless Chrome'da oldin/keyin skrinshot bilan ko'rildi.

### Lint: ekran o'z dizayn tizimining kompaniyasini atasa — P0 — GEN-18
GEN-17 oqishning manbasini yopdi; bu qator uni o'lchaydi, toki qaytsa ko'rinsin.
- `design-systems/leak-terms.json`: 23 tizim uchun qo'lda saralangan ikki ro'yxat. `brand` — faqat ilova **o'zini atagan** joyda oqish (`<title>`, `h1`–`h3`), chunki "Pay with Stripe" yoki "Sign in with GitHub" oddiy matn. `anywhere` — begunoh ishlatilishi yo'q atamalar ("Cybertruck", "Super Duolingo", "Become a host"). Distillator bergan xom ro'yxat (shrift nomlari, rang nomlari, "Inter", "Explore") ishlatilmadi — u har ikkinchi ekranda yolg'on signal berardi.
- `lintScreen(html, { leakTerms })` → `design-system-brand-leak`, `error`. Atamalar berilmasa qoida jim. `PlanController` va eval metrikasi (`bugs.brandLeakScreens`) shu qoidadan foydalanadi — eval'dagi vaqtinchalik regex olib tashlandi.
- Fayllar: `design-systems/leak-terms.json` (yangi), `src/lib/design-lint.ts`, `DesignSystemService.ts`, `PlanController.ts`, `eval/metrics.ts`, `services.check.ts`, `eval/eval.check.ts`.
- Tekshirildi: `npm run check`, `tsc` toza. Testlar: sarlavhadagi "Duolingo" va heading'dagi "Duo" yiqitadi; "duo-tone" va "Production" yiqitmaydi; paragrafdagi "Stripe" toza, `h1` dagi "Stripe" — oqish; atamasiz tizim hech qachon yonmaydi; fayldagi har ID mavjud tizim; fayl tizimlar ro'yxatiga tushmaydi. Haqiqiy ma'lumotda: `data.db` dagi 39 ekrandan aynan o'sha 3 ta "Lesson Complete — Duolingo" ekranini topdi, boshqa hech narsa; baseline'dagi 104 ekrandan 1 ta ("Guest favorite" nishoni, airbnb).

### Mobil prompt dizayn tizimining ko'rinishini oladi, kompaniyasini emas — GEN-17
`DESIGN.md` — brend hujjati (393 qatorgacha): maskot, mahsulot, funksiya nomlari. Uni butunligicha olgan model uslubni emas, mahsulotni ko'chirardi — `duolingo` tizimidagi kaloriya ilovasi boyqush va "Lesson complete" chizgan.
- Har 33 tizimga `STYLE.md` — **uslub kartasi**, ≤60 qator, bir xil tuzilma: Mood, Colour energy (low/medium/high), Colour use, Type, Shape and depth, Layout and density, Signature moves, Avoid. Neytral nom bilan ("Chunky Playful Green", "Monochrome Athletic Editorial"), brend va mahsulot otlarisiz, ranglar faqat `tokens.css` dagi `var(--…)` orqali, hex yo'q, 44px dan past boshqaruv yo'q, ikonka chizish haqida gap yo'q.
- Kartalar bir martalik skript bilan `DESIGN.md` + `tokens.css` dan `deepseek-chat` orqali distillandi (~$0.1) va repoga **statik fayl** sifatida kirdi — ish vaqtida LLM yo'q. Shartnomani kod ushlab turadi: yangi yoki qo'lda yozilgan karta ham shu testdan o'tishi kerak.
- `DesignSystemService.readStyleCard()`; mobil system prompt va element tahriri kartani o'qiydi. Desktop `DESIGN.md` da qoldi — eval faqat mobilni o'lchaydi, o'lchanmagan yo'lni o'zgartirmadim.
- Yo'lda: distillatorning birinchi varianti `:root` ni `tokens.css` boshidagi izohdan topib, 5 tizimda (apple, airbnb, cursor, nike, tesla) modelga bo'sh token ro'yxati bergan — model manba hujjatdagi mavjud bo'lmagan tokenlarni yozgan. Validator buni ushladi; izohlar olib tashlangach beshalasi toza chiqdi.
- Fayllar: `design-systems/*/STYLE.md` (33 yangi), `DesignSystemService.ts`, `PromptComposer.ts`, `services.check.ts`, `eval/run.ts` (delta endi faqat ikki yugurishda ham bor brieflar bo'yicha hisoblanadi — `--only` bilan ishlaganda olma bilan olma solishtiriladi).
- Tekshirildi: `npm run check`, `tsc` toza. Test har tizim uchun: karta bor, ≤60 qator, 7 bo'lim, hex yo'q, har `var(--x)` `tokens.css` da mavjud, brend nomi yo'q; `duolingo` mobil promptida owl/Duo/Duolingo/mascot yo'q; desktop hali `DESIGN.md`. Eval (`gen17`, 4 brief: nike, duolingo, midnight, airbnb): uslub saqlangan (nike — siqiq bosh harfli sarlavhalar, duolingo — 4px pastki qirrali yashil tugmalar, kontent esa kaloriya haqida), brend oqishi 0, `fallbackIcons` 3 → 0, ekran p50 21.2s → 18.7s. Bitta ekran tarmoq xatosi (`fetch failed`) bilan tushdi — kodga aloqasi yo'q.
- Ko'rindi, keyingi qatorlarga: rasm o'rnida "592 × 333" qutilari (AST-01); system prompt hali ~78k belgi, chunki craft fayllar ustun (GEN-23); food-delivery rejasi savat/checkout o'rniga Search/Orders/Profile bergan (UX-02/03).

### Tab ikonkalari hech qachon doiraga tushmaydi — GEN-21
Baseline eval'da 104 ekranda **69 ta** yalang'och doira chiqdi: planner `users`, `file-text`, `mic`, `library` kabi to'g'ri lucide nomlarini berardi, lekin `ShellService` da atigi 37 ta ikonka bor edi va qolgani `circle` ga tushardi.
- Ikonka geometriyasi `shell-icons.ts` ga ko'chdi: 108 ta, `lucide-react` ning o'z node'laridan olingan (qo'lda ko'chirilmagan). Kalitlar — planner ishlatadigan klassik nomlar (`home`, `bar-chart-2`), lucide ularni qayta nomlagan bo'lsa ham.
- `resolveIcon(name, label)`: aniq nom → nomning sinonimi (`profile-outline` → `user`) → tab yorlig'ining sinonimi (`Leaderboard` → `trophy`) → `grid`. Modelning o'zi yozgan `circle` ham noma'lum deb qaraladi. `parsePlan` shu orqali o'tkazadi, ya'ni bazaga faqat chiziladigan nom yoziladi.
- Planner promptiga ruxsat etilgan nomlar ro'yxati kiradi (kodda ro'yxat o'zgarsa, prompt ham o'zgaradi).
- **`isAction` tab standart holatda o'chiq.** Apple HIG: tab bar navigatsiya uchun, amal uchun emas. Ko'tarilgan markaziy tugma faqat "ushlash" ikonkasiga (`camera`, `scan`, `scan-line`, `qr-code`, `mic`) va ko'pi bilan bitta tab'ga beriladi — bu kodda majburlanadi, promptdagi namunadan "+" tab olib tashlandi.
- Fayllar: `src/app/Services/shell-icons.ts` (yangi), `ShellService.ts`, `PlannerService.ts`, `services.check.ts`.
- Tekshirildi: `npm run check` va `tsc` toza. Testlar: baseline'da planner bergan 38 ta nomning har biri o'zi bo'lib chiziladi; har sinonim mavjud ikonkaga ishora qiladi; `plus` + `isAction` ko'tarilmaydi, ikkita capture tab'dan faqat bittasi ko'tariladi; tab bar'da fallback doira yo'q. Eval'da tasdiqlash (`fallbackIcons` 69 → 0) DeepSeek balansi to'ldirilgach qilinadi — hozir API 402 qaytaryapti.

### Eval to'plami va o'lchov — EVAL-01, EVAL-02, EVAL-03, EVAL-04
Generatsiyadagi har o'zgarish endi bitta hand-picked prompt bilan emas, 25 ta doimiy brief bilan baholanadi.

- **EVAL-01.** `eval/briefs.json`: 25 brief, 13 ilova turi, 20 dizayn tizimi, 5 tasi noaniq ("todo app"), 3 tasi o'zbek/rus tilida, har birida kutilgan arxetiplar.
- **EVAL-02.** `npm run eval` haqiqiy `PlanController.stream` ni jarayon ichida, alohida SQLite faylida (`DB_PATH`) chaqiradi — pipeline nusxasi emas, foydalanuvchi oladigan narsaning o'zi, va `data.db` ifloslanmaydi. `eval/alias-hook.mjs` oddiy `node` ga `@/` va kengaytmasiz importlarni Vite'siz yechib beradi (yangi bog'liqlik yo'q). Natija: `index.html` (har ekran jonli, sandbox'li 390px iframe), oldingi yugurish bilan `compare.html`, va `sheet-N.png`.
- **EVAL-03.** `eval/metrics.ts`: lint o'tish ulushi, ilovalar aro strukturaviy bir xillik, ma'lum buglar hisoblagichlari (brend oqishi, `circle` ikonka, standart persona, `root-tab` ulushi), vaqt, token va taxminiy narx (`LlmService` endi `include_usage` bilan usage'ni tinglovchiga beradi). Oldingi yugurishga nisbatan o'zgargan har raqam konsolda va sahifada chiqadi. `--from <run>` generatsiyasiz qayta hisoblaydi.
- **EVAL-04.** `ab.html`: ikki yugurish ko'r-ko'rona juftlanadi (qaysi biri "A" ekani brief ID xeshi bilan almashadi), ovozlar `localStorage` da, hisob faqat "Reveal" dan keyin.

Yo'lda ushlangan uchta tuzoq:
- **Bir xillik metrikasi birinchi variantda ko'r edi.** `chuqurlik:teg` 4-gramlari har juftlikni begona ko'rsatdi (0.021). Baseline'da besh variant sinaldi; faqat teg 4-gramlari "turli ilovalardagi profil ekranlari" ni tasodifiy juftlikdan eng yaxshi ajratdi (1.55×). Shu tanlandi va `sameKindMean` qo'shildi — VAR-02 ning maqsadi shu raqam.
- **100+ jonli iframe'li sahifani headless Chrome chizib bo'lmadi** (osilib qoldi). Skrinshot endi 5 briefdan bo'lib olinadi va xatosi yugurishni yiqitmaydi.
- **DeepSeek balans kamayganda parallel so'rovni 5 tagacha cheklaydi.** Baseline oxiridagi 5 brief 429 oldi. `--concurrency` standart qiymati 1 ga tushirildi (bitta brief o'zi 3 ta ekranni parallel chizadi).

Baseline (`2026-09-21-09-59-baseline`, 22 brief, 104 ekran, ~$1.0, ekran p50 18.6s): `circle` ikonka **69**, standart persona 6/22 briefda, lint toza 82.7% (13 ta qo'lda chizilgan ikonka), `root-tab` 67%, detalsiz 2 brief, `sameKindMean` 0.072. Brend oqishi reja yo'lida 0 — u bitta ekran qo'shish yo'lida (GEN-19) chiqadi.
- Fayllar: `eval/` (yangi: `briefs.json`, `run.ts`, `sheet.ts`, `metrics.ts`, `alias-hook.mjs`, `eval.check.ts`), `src/database/connection.ts` (`DB_PATH`), `src/app/Services/LlmService.ts` (usage), `package.json`, `tsconfig.json` (`eval` typecheck'da), `.gitignore`, `CLAUDE.md`, `docs/ROADMAP.md`.
- Tekshirildi: `npm run check` (yangi `eval/eval.check.ts` bilan) va `tsc` toza. Haqiqiy yugurish: 1 brief smoke (5 ekran, 51s), keyin to'liq baseline. Chrome'da `ab.html`: ovoz berish va ovozni o'zgartirish, qayta yuklagandan keyin tiklanish, "Reveal" hisobi ("… won 1, … won 1, ties 1 — 3 of 22 rated"), yugurish nomlari ko'rinadigan matnda yo'q; 208 iframe yuklanadi. Chekka holat: API'da yiqilgan (0 ekranli) yugurish keyingi taqqoslashda "oldingi" bo'lib qolmaydi.
- Ochiq: DeepSeek balansi tugadi (402). To'ldirilmaguncha eval va generatsiya ishlamaydi; baseline'da oxirgi 5 brief yo'q.

### Generatsiya sifati rejasi (taklif) — hujjat, kod o'zgarmadi
Yo'nalish o'zgardi: avval generatsiya sifati, keyin hisoblar/to'lov/deploy. `docs/GENERATION-PLAN.md` yozildi: o'z ekranlarimizdagi 11 ta topilma (brend oqishi, kontekstsiz ekran qo'shish, 39/39 `root-tab`, `circle` ikonkalar, bir xil persona, 19–26k tokenli system prompt va h.k.), raqobatchilar tahlili, Apple HIG va prompt tuzilmalari saboqlari, P0–P9 fazalari Notion'ga ko'chirishga tayyor ID'lar bilan.
- Fayllar: `docs/GENERATION-PLAN.md` (yangi).
- Tekshirildi: topilmalar `data.db` dagi 39 ekrandan 12 tasini headless Chrome'da render qilib va `sqlite3` so'rovlari bilan tasdiqlandi; prompt hajmi `composeSystemPrompt` ni chaqirib o'lchandi. Notion'ga ulanish yo'q edi — qatorlar bazaga hali qo'shilmagan, `docs/ROADMAP.md` o'zgarmadi.

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
- **INF-08 · CI.** `.github/workflows/ci.yml`: har push va PR'da `npm ci`, `npm run check`, `npm run build`, `tsc`. Workflow'ni toza nusxada (`node_modules`, `.env`, `data.db` siz) to'rt qadamiga qadar qo'lda takrorladim. Birinchi variantda `tsc` qizil chiqardi: `routeTree.gen.ts` gitignore'da va faqat dev/build paytida yaratiladi. Shuning uchun `build` typecheck'dan oldin turadi; bu production build'ni ham har push'da tekshiradi. Push'dan keyingi birinchi haqiqiy run kuzatildi va u ishga tushmadi: GitHub "account is locked due to a billing issue" deb job'ni 2 soniyada to'xtatdi. Bu kodga aloqador emas, lekin CI amalda hech narsani tekshirmayapti, shuning uchun INF-08 `Bloklangan` holatiga qaytarildi.
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

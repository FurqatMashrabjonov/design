# Changelog

Newest first. One entry per completed change: what changed, files touched, how it was verified.
Entries before 2026-09-19 were backfilled from git history and have no verification notes.

## 2026-09-21

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

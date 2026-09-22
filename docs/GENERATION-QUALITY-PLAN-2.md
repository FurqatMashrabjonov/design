# Generatsiya sifati: ikkinchi bosqich rejasi

> Yozilgan: 2026-09-22. Sabab: foydalanuvchining o'zi 1–2 ta generatsiya qildi va sifat yoqmadi. Qaror: desktop mahsulotdan olib tashlandi, faqat mobil UI.
> Manba: `data.db` dagi haqiqiy loyihalar ("Feast", "LingoLoop"), ularning HTML'i, bitta 6 ekranli ilovaning headless Chrome skrinshoti va ochiq tadqiqotlar.

## 0. Allaqachon qilindi: desktop olib tashlandi

- Yangi loyiha doim `mobile` bo'ladi (`ProjectController.store`, `/api/generate`, `createProject`).
- Dashboard'da qurilma tanlovi yo'q.
- Eski desktop loyihalar ochiladi va ko'rinadi.
- **Hali qolgani:** desktop prompt yo'li (web skill'lar, `DESIGN.md` → desktop prompt) kodda turibdi, lekin endi unga hech narsa murojaat qilmaydi. Tozalash **Q3** da.

## 1. Tashxis: "Feast" nimasi yomon chiqdi

**Brief:** Dribbble shotining batafsil tavsifi. Ikki ekran: "Food Offer" sarlavhali home va cart. **Sariq accent**, yumaloq burchaklar, sifatli ovqat rasmlari, gradient fon.

**Natija:** 6 ta ekran, `minimal` tizimida, **ko'k** accent.

| # | Nima ko'rinadi | Sabab (kodda tekshirildi) | Turi |
|---|---|---|---|
| 1 | **Cart'da rasm butun kenglikka cho'zilgan, matn o'ng chetda 1 harfli ustunga siqilgan** | `ImageService` rasmni "qulflaganda" inline `width:100%; aspect-ratio:4/3` qo'yadi. Inline stil modelning `.cart-thumb {width:64px}` klassidan ustun turadi. **Ro'yxatdagi har bir kichik rasmga ta'sir qiladi** | Deterministik bug |
| 2 | **Brief'dagi sariq accent e'tiborsiz qoldi, ko'k chiqdi** | Brief'dagi rang va kayfiyat so'zlari hech qayerda o'qilmaydi. Dizayn tizimi standart holatda `minimal` bo'lib, ko'k rangi hammasidan ustun turadi | Deterministik bo'shliq |
| 3 | **Order Tracking'da xarita o'rniga ko'cha fotosurati** | Model xaritani `data-od-img="city street map…"` deb yozdi, Pexels esa ko'cha rasmini topdi. Xarita uchun slot yo'q | Deterministik bo'shliq |
| 4 | **Cart ekranida pastki panelda "Profile" tabi yonib turibdi** | Rejada Cart `root-tab` bo'lib `profile` tabini egallagan. `parsePlan` har tabda bitta root borligini tekshiradi, lekin **ekran tab nomiga mos kelishini tekshirmaydi** | Deterministik bug |
| 5 | Brief 2 ta ekranni aniq sanab bergan, 6 ta chiqdi | Rejalashtiruvchi so'ralgan ekranlarni qamraydi va yana qo'shadi. Sanab berilgan ro'yxat chegara deb qaralmaydi | Qoida |
| 6 | Umumiy ko'rinish **"to'g'ri, lekin oddiy"**: hammasi oq kartalar, bir xil og'irlik, chuqurlik yo'q, "Dribbble" jilosi yo'q | (a) `minimal` standart tizimi; (b) arzon model (DeepSeek Flash, thinking o'chiq) va ko'rish qobiliyati yo'q; (c) **eval estetikani o'lchamaydi**, metrikalar yaxshilanadi, ko'z esa farqni sezmaydi; (d) arxetiplarga "oltin namuna" yo'q (KIT-04 yakunlanmagan) | Tizimli |
| 7 | Dish Detail'da sarlavha yonida hero'ning kichik takrori, narx/yetkazish/reyting zerikarli 2×2 grid'da | Blueprint "stats grid" bo'limini beradi, model uni to'g'ridan-to'g'ri chizadi | Prompt / blueprint |

**"LingoLoop": 0 ekran.** Reja tuzildi (8 ta DeepSeek chaqiruvi muvaffaqiyatli), keyin "Stopped before the rest were drawn". `PlanController` mijoz sahifani tark etsa (yangilash, orqaga, tab yopish) generatsiyani to'xtatadi, pul tejash uchun shunday qilingan. Natijada odam reja uchun pul to'laydi-yu, ilova olmaydi. **Bu sifat emas, lekin "yomon chiqdi" taassurotini beradi.**

## 2. Tadqiqot: nima haqiqatan yordam beradi

1. **Ko'rish orqali tanqid va tuzatish (visual critique loop).** Ekran render qilinadi, skrinshot vision modelga beriladi, u tuzilgan tanqid qaytaradi, keyin bitta tuzatish chaqiruvi. WebDev Arena so'rovlarida 3 sikl bilan **~18% sifat o'sishi** qayd etilgan ([Vision-Guided Iterative Refinement, 2026](https://arxiv.org/abs/2604.05839)). Birinchi sikl eng ko'p foyda beradi. Bizda buning yarmi bor: render audit va "Fix these N" (EYE-01/02), lekin ular faqat o'lchanadigan xatolarni ko'radi, estetikani emas.
2. **Model tanlovi.** Design Arena'da mobil ilova dizayni bo'yicha Claude modellari yetakchi ([Design Arena leaderboard](https://www.designarena.ai/leaderboard), [llm-stats](https://llm-stats.com/best-ai-for-ui-design)). DeepSeek V4 Flash oddiy kodda yaqin turadi, lekin **ko'rish qobiliyati yo'q**: skrinshotni ko'rib tanqid qila olmaydi ([MindStudio](https://www.mindstudio.ai/blog/deepseek-v4-flash-vs-claude-sonnet-comparison-agents), [BenchLM](https://benchlm.ai/compare/claude-sonnet-4-6-vs-deepseek-v4-flash)). Tavsiya qilinadigan gibrid: hajmli ish Flash'da, ko'rish kerak bo'lgan qism kuchliroq modelda.
3. **Dizayner fikri va namuna.** Eng katta sifat sakrashi namunalardan (reference) va aniq fikrdan keladi ([Improving UI Generation Models from Designer Feedback, CHI 2026](https://arxiv.org/html/2509.16779)). Bu bizning "oltin namuna" va 👍/👎 → juftliklar yo'nalishimizni tasdiqlaydi.
4. **Olomon didi sizning foydalanuvchingiz emas.** Reyting faqat qisqa ro'yxat tuzishga yaraydi. O'z brief'larimizda pairwise solishtirish kerak ([Design Arena guide](https://shaffaybajwa.com/design-arena-ai-guide/)). Demak eval'ga **ko'z bilan baho** (vizual hakam) qo'shilishi shart.

## 3. Reja

Tartib: avval bir kunda tuzaladigan va ko'zga eng ko'p tashlanadigan buglar, keyin estetikani o'lchaydigan asbob (busiz keyingi o'zgarishlarni baholab bo'lmaydi), keyin sifat richaglari.

### Q0: deterministik tuzatishlar (~1–1.5 kun, LLM talab qilmaydi)

| ID | Nima | Qanday tekshiriladi |
|---|---|---|
| **Q0-1** | **Rasm slotini qulflash kenglikni buzmasin.** Inline `width:100%` o'rniga `max-width:100%`, modelning o'lchami (klass yoki atribut) saqlanadi. `aspect-ratio` faqat balandlik berilmagan rasmga. Yangi render audit qoidasi: `squeezed-text` (qatordagi matn ustuni 25% dan tor) | Saqlangan eval ekranlariga LLM'siz qayta qo'llash. Feast Cart qayta render: rasmlar 64px. Eval metrikasi `audit.squeezedText` |
| **Q0-2** | **Brief'dagi uslub so'zlari mavzuga aylanadi.** "sariq accent", "qorong'i", "yumaloq", "gradient", `#hex` kabi so'zlardan loyiha yaratilayotganda theme override hosil bo'ladi. Mavjud `routeIntent`/theme parseri qayta ishlatiladi. Foydalanuvchi aniq tizim tanlamagan bo'lsa ustun turadi | Test: brief'dan accent. Eval metrikasi `brief.accentHonored` (so'ralgan rang ekranda bormi) |
| **Q0-3** | **"Auto" dizayn tizimi standart bo'ladi.** Tizim ilova turi va brief kayfiyatiga qarab tanlanadi (AppPatternService + tokenlar), `minimal` bo'lib qolib ketmaydi. Qo'lda tanlash ham saqlanadi | Eval: tizimlar taqsimoti, `sameness` |
| **Q0-4** | **Xarita sloti:** `<div data-od-map data-route="…" data-pins="…">`, kod token ranglarida stillashtirilgan SVG xarita (ko'chalar, marshrut, pinlar) chizadi. Grafiklar bilan bir xil yondashuv. `data-od-img` da "map" so'zi bo'lsa normalizer uni xarita slotiga aylantiradi | Eval metrikasi `maps.photoAsMap` → 0 |
| **Q0-5** | **Tab va root ekran mosligi.** `parsePlan` da root ekran nomi tab nomiga mos kelmasa: tab ekran nomi bilan qayta nomlanadi va ikonka lug'atdan olinadi, yoki (Cart kabi) ekran `detail`/`modal` ga tushiriladi | Test, plus eval metrikasi `plan.tabMismatch` |
| **Q0-6** | **Sanab berilgan ekranlar chegara bo'ladi.** Brief ekranlarni aniq sanasa ("two screens: home and cart"), reja aynan shularni chizadi, qo'shimcha faqat navigatsiya uchun shart bo'lsa | Eval'ga 3 ta shunday brief qo'shiladi |
| **Q0-7** | **Sahifa yopilsa ham generatsiya davom etadi.** Reja tuzilgach ekranlar serverda chizilib saqlanaveradi; qaytib kelgan odam tayyor ilovani ko'radi. Limit va byudjet `guardGeneration` da qoladi. Faqat Stop tugmasi to'xtatadi | Test: oqim uzilgandan keyin ham ekranlar saqlanadi |

### Q1: estetikani o'lchash (~1 kun)

- **Vizual hakam** (`eval/judge.ts`):
  - har ekran skrinshoti (bizda headless Chrome bor) va brief bilan birga;
  - **faqat eval'da va lokal**, Claude obunasi orqali (`claude -p` vision), mahsulotga ta'sir qilmaydi.
- **Rubrika, 1–5 ball:** ierarxiya, bo'shliq va ritm, jilo va chuqurlik, brief'ga sodiqlik (rang, bo'limlar), ilova izchilligi. Qo'shimcha: oldingi run bilan **pairwise** "qaysi yaxshiroq".
- **Yangi brief'lar:** 8 ta "Dribbble darajasidagi" brief (Feast kabi batafsil, rang va kayfiyat bilan), 25 talik to'plamga qo'shiladi.
- **Hakamning o'zini tekshirish:** sen 10 ta ekranni o'zing baholaysan, hakam bahosi bilan solishtiramiz. Mos kelmasa rubrika to'g'rilanadi.

### Q2: sifat richaglari (~2–3 kun, har biri Q1 bilan baholanadi)

| ID | Nima | Kutilgan ta'sir | Narx |
|---|---|---|---|
| **Q2-1** | **Oltin namunalar (KIT-04 yakuni).** Har arxetipga 1–2 ta eng yaxshi ekran (hakam bahosi eng yuqori, Claude natijalaridan), qisqa "tuzilma + uslub eslatmasi" ko'rinishida prompt'ga | Oddiylik kamayadi, ekranlar Dribbble'ga yaqinlashadi | Prompt +~1–2k token (kesh bilan arzon) |
| **Q2-2** | **Mobil uchun yangi "jilo" tizimlari:** soft-gradient, playful-bold, dark-premium, warm-food. Hozirgi 33 tizimning ko'pi veb-brend nusxasi | Food, fitness, finance ilovalari uchun to'g'ri kayfiyat | 0 |
| **Q2-3** | **Vizual tanqid sikli (1 marta).** Render → vision model tanqidi (3–6 ta aniq element-darajali tuzatish) → bitta DeepSeek tahrir chaqiruvi (mavjud edit-by-parts) | Tadqiqotda ~18% (3 sikl). 1 sikl eng arzon va eng foydali | Ekraniga +~$0.015 (vision) + ~$0.004 (tuzatish). 6 ekranli ilova **+~$0.12** |
| **Q2-4** | **Anchor ekran kuchliroq modelda.** Birinchi (home) ekran kuchli modelda chiziladi, uning "house style digest"i qolganlariga beriladi (bizda bor) | Butun ilovaning uslub darajasi ko'tariladi | Ilovasiga **+~$0.10**. Hozir 6 ekran ≈ $0.045 (ekraniga ~$0.0066) |

**Model siyosati:** `CLAUDE.md` hozir faqat DeepSeek Flash'ga ruxsat beradi. Q2-3 va Q2-4 uchun siyosatni o'zgartirish kerak, bu **sening qaroring** (7-bo'lim). Buning o'rniga avval Q0 + Q1 + Q2-1 + Q2-2 (pulsiz richaglar) qilinadi va hakam bilan o'lchanadi. Farq yetmasa, pulli richaglar qo'shiladi.

### Q3: tozalash (~0.5 kun)

- Desktop prompt yo'li, web skill'lar va `DESIGN.md` → desktop bog'lanishi o'chiriladi.
- `CLAUDE.md` va testlar yangilanadi.
- Eval brief'larida desktop yo'q (tekshirildi).

## 4. Qanday bilamiz, yaxshi bo'ldimi

- **Q0:** metrikalar `squeezedText`, `photoAsMap`, `tabMismatch` → 0; `accentHonored` → ≥90%. Feast brief'i qayta generatsiya qilinib, oldin/keyin yonma-yon ko'rsatiladi.
- **Q1 va undan keyin:** hakam o'rtachasi va pairwise yutuq ulushi. Har o'zgarish oldingi run'ga nisbatan kamida +0.3 ball yoki ≥60% yutuq bo'lishi kerak.
- **Yakuniy:** sen o'zing 3 ta brief bilan generatsiya qilasan va "yaxshi" deysan.

## 5. Tartib va muddat

1. **Q0** (1–1.5 kun): Q0-1, Q0-5 va Q0-7 birinchi. Eng ko'zga tashlanadigan buglar shular.
2. **Q1** (1 kun).
3. **Q2-1 va Q2-2** (1.5 kun), hakam bilan o'lchanadi.
4. Natijaga qarab **Q2-3/Q2-4** (1 kun, qaroring bilan).
5. **Q3** (0.5 kun).

Jami ~4–5 kun. Q0 dan keyin Feast brief'ini qayta generatsiya qilib ko'rsataman.

## 6. Roadmap

Yangi qatorlar Q0-1…Q3 qoida bo'yicha `Keyin` bo'lib qo'shiladi. KIT-04 Q2-1 ichiga kiradi.

## 7. Sendan kerakli qarorlar

1. **Q0 va Q1 ni MVP'ga olib, hozir boshlaymizmi?** (Tavsiya: ha.)
2. **Vizual hakam eval'da Claude obunasi orqali ishlaydi**, faqat lokal va mahsulotga ta'sirsiz. Rozimisan?
3. **Pulli richaglar** (Q2-3 vizual tanqid, Q2-4 kuchli anchor) uchun ilovasiga **+$0.10–0.22** gacha to'lashga tayyormisan? Bu model siyosatini o'zgartiradi. Tavsiya: avval pulsizlarini o'lchaymiz, keyin hal qilamiz.
4. **Sahifa yopilganda generatsiya davom etsinmi** (Q0-7)? Pul biroz ko'proq ketadi, lekin odam ilovasiz qolmaydi. (Tavsiya: ha.)

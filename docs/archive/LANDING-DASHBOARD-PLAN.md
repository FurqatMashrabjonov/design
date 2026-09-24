# Landing va dashboard rejasi

> Yozilgan: 2026-09-22. Manba: `concurrents-screenshots/` dagi 6 ta to'liq sahifali skrinshot (Sleek, Screenflow va Stitch'ning landing hamda dashboard sahifalari), roadmap'dagi mavjud qatorlar (MKT, DSH, SHR, LEG) va SaaS aktivatsiya bo'yicha ochiq tadqiqotlar. Maqsad: birinchi 20–50 foydalanuvchini jalb qiladigan, ko'rgan zahoti "bu boshqacha va yaxshiroq" degan taassurot qoldiradigan landing va dashboard.

---

## 1. Konkurentlar: nimani yaxshi qiladi, nimani qilmaydi

### Sleek (sleek.design): iliq, "dizayner qo'li" hissi
**Landing:**
- Krem fon va to'q sariq accent, hero ortida yumshoq to'lqin.
- Sarlavha: "Design mobile apps **in minutes** ⚡", accent rangda.
- Hero'ning o'zida tavsif maydoni: rasm biriktirish, "Auto", "Match a design" (uslub namunalari).
- Ostida "Need inspiration?": 4 ta karta, har biri nom, bir qator tavsif va uslub tegi (`NEO-BRUTALISM`, `GLASSMORPHISM`).
- **"Browse References":** nomlangan tayyor ilova to'plamlari ("Ember Fitness", "Neon Running", "Luminous Health", "Warm Storybook"), har biri 3 ta telefon ekrani. Bu landingning eng kuchli qismi: mahsulot natijasini birdan ko'rsatadi.
- Katta tirnoqli bitta testimonial (solo founder), muhim so'zlari accent rangda.
- Video demo ("See Sleek in Action").
- 3 ta imkoniyat kartasi: generate, edit, export.
- 10 ta savolli FAQ: SEO uchun yozilgan ("vs Figma", "Claude Code bilan ishlaydimi?").
- Oxirida yana tavsif maydoni bilan chaqiruv.
- Footer SEO mashinasi: "vs Google Stitch", "vs Figma AI" solishtirish sahifalari va 8 ta bepul vosita (icon generator, App Store screenshot). Bular organik trafik olib keladi.

**Dashboard:**
- Chapda yon panel: Projects, Usage, API Keys, References; pastda promo karta ("AI agents"), Upgrade tugmasi, hisob.
- Markazda "Start generating your app designs", tavsif maydoni va ilhom kartalari.
- "My Projects": All / Favourites, qidiruv, grid yoki ro'yxat.
- **Kamchiligi:** loyiha kartasida faqat bosh harflar bor, rasm yo'q.

### Screenflow (screenflow.dev): texnik, "tez" va ijtimoiy isbot
**Landing:**
- Tepada promo lenta ("30% off forever").
- Setkali fon. Sarlavhada kursiv serif urg'u: "Design your apps *10x faster* with AI".
- Tavsif maydoni, ostida tayyor tugmalar ("Try: Travel Planner App…") va "Free to start · No credit card required".
- **Ijtimoiy isbot:** 4 ta avatar, 5 yulduz, "Loved by 6,200+ vibedesigners".
- Brauzer ramkasidagi mahsulot videosi.
- Yaratilgan ekranlar lentasi (marquee).
- "How it works" 3 qadam, har birida katta vizual.
- "Get inspired" galereyasi.
- Testimonial devori: 3 ustunli masonry, chetlari xiralashgan.
- FAQ, "What should we *design* today?" chaqiruvi, footer.

**Dashboard:**
- "Good afternoon, Furqat!" salomlashuvi.
- 4 ta raqam kartasi: loyihalar, ekranlar, bu hafta, kreditlar va progress.
- "Quick actions": New Project, All Projects.
- **Kamchiligi:** "Recent projects" kartalarida rasm o'rnida kulrang placeholder turadi, landingdagi "My Projects" bo'limida ham. Bu mahsulot o'z natijasini ko'rsata olmayotganini bildiradi.

### Stitch (Google): kinematik, qorong'i, "katta brend"
**Landing:**
- Qora fon, nuqtali setka, binafsha va ko'k nur to'lqini.
- "Design at the speed of AI" katta, ingichka shriftda.
- Tavsif maydoni: App/Web almashtirgich, palitra, model rejimi ("Balanced"), ovoz.
- "Generating new ideas" animatsiyasi.
- "Get started with templates" karuseli.
- Bento imkoniyatlar (Easy edits, Export code, Build with Gemini, Own your design), "Vibe design is here" va FAQ.

**Dashboard:**
- Chapda loyihalar tarixi, sanalar bo'yicha guruhlangan ("Kecha", "Oxirgi 7 kun"), **har loyihada kichik rasm**.
- Markazda tavsif maydoni va "Ideas" karuseli.

### Umumiy xulosa
- **Uchalasida ham bor (majburiy):**
  - hero'ning o'zida tavsif maydoni;
  - tayyor boshlang'ich takliflar;
  - natija galereyasi;
  - "3 qadam" yoki imkoniyatlar bo'limi;
  - FAQ;
  - oxirida yana chaqiruv;
  - dashboard'da tavsif maydoni va loyihalar.
- **Hech birida yo'q (bizning imkoniyatimiz):**
  1. **Landingda jonli, bosiladigan prototip yo'q.** Hammasi statik rasm yoki video ko'rsatadi. Bizda preview va zip eksport bor, landingga haqiqiy bosiladigan ilovani qo'yish mumkin.
  2. **"Ekranlar bir-biriga mos" isboti yo'q**: bitta ma'lumot, bitta navigatsiya, bitta uslub. Bizning asosiy farqimiz shu (izchillik kodda ta'minlanadi), lekin konkurentlar buni ko'rsatmaydi.
  3. **Tahrirning oldin/keyin ko'rinishi yo'q**: elementni bosib o'zgartirish, undo, versiya strelkalari.
  4. **Loyiha kartalarida haqiqiy rasm** faqat Stitch'da bor. Screenflow bu yerda ochiq zaif.
  5. *(Ko'p tillilik: 2026-09-22 qarori bilan kerak emas, sayt faqat inglizcha.)*
  6. **Kirmasdan sinab ko'rish** hech birida to'liq yo'q: hammasi tavsif maydonidan keyin kirishni so'raydi. Biz yozilgan tavsifni saqlab, kirishdan keyin generatsiyani o'zi davom ettiradigan qilishimiz mumkin.

---

## 2. Pozitsiya va xabar

**Bir gapda:** *Tavsif yozasiz va bir-biriga mos, bosiladigan butun ilovani olasiz: bitta ma'lumot, bitta uslub, har bir elementini keyin o'zgartirish mumkin.*

**Sarlavha variantlari** (A/B uchun):
1. "Bitta tavsif. Butun ilova." / "One prompt. A whole app, not a pile of screens."
2. "Ilovangizni bir daqiqada ko'ring, bosib ko'ring, o'zgartiring."
3. "App designs that actually belong together."

**Kimlar uchun:**
- asosiy auditoriya: solo founder va indie developer (Sleek va Screenflow testimoniallari ham shu auditoriyadan);
- ikkinchi navbatda: dizayner va o'quvchi, mahalliy IT kurslar.

**Uchta dalil**, landingning har qismi shu uchtasini ko'rsatadi:
1. **Izchil**: tab bar, header, ma'lumot va rasmlar hamma ekranda bir xil.
2. **Jonli**: prototip darhol bosiladi, oflayn zip bo'lib yuklanadi.
3. **Boshqariladigan**: istalgan elementni bosib o'zgartirish, ⌘Z, versiyalar, 33 dizayn tizimi va tema.

**Halollik chegarasi:**
- Soxta raqam ("6,200+ users") va soxta testimonial ishlatilmaydi. Screenflow'dagi "10x faster" kabi isbotsiz raqam bizning `invented-metrics` qoidamizga ham zid.
- Ijtimoiy isbot beta davomida haqiqiy odamlardan yig'iladi. Ungacha o'rnini haqiqiy natijalar galereyasi va "Made with {brend}" misollari egallaydi.

---

## 3. Vizual yo'nalish

**Ranglar:** konkurentlar allaqachon egallagan: Sleek iliq krem va to'q sariq, Screenflow oq va binafsha, Stitch qora va binafsha-ko'k nur. Ulardan ajralib turish kerak. Ikki variant:

- **A: "Studio ink"** (tavsiya qilaman).
  - Fon: iliq oq (#FAFAF7) va siyoh qora (#0E0F12).
  - Bitta yorqin accent: elektrik lime (#C6F24E) yoki "signal" ko'k (#2F6BFF).
  - Grafik motiv: telefon ramkalari va ular orasidagi **bog'lovchi chiziqlar** (oqim xaritasi). Bu "ilova bir butun" g'oyasini vizual ko'rsatadi.
  - Yorug' va qorong'i rejim teng darajada ishlaydi.
- **B: "Aurora dark".** Qorong'i asos va rangli yumshoq nur, Stitch'ga yaqin. Chiroyli, lekin Google'ga o'xshab qolish xavfi bor.

**Tipografiya:**
- sarlavhalar: geometrik grotesk, masalan Geist yoki "Plus Jakarta Sans" 700, ixcham trekking;
- bitta so'z urg'u uchun kursiv serif (Instrument Serif). Screenflow shunday qiladi, lekin urg'uni accent rangdagi chiziq bilan birga ishlatamiz;
- raqamlar: tabular.

**Harakat:**
- hero'dagi telefonlar sekin suzadi;
- bog'lovchi chiziqlar navbat bilan yonadi;
- "generatsiya" holatida haqiqiy agent jurnalidagi qatorlar ketma-ket paydo bo'ladi (bizning jurnal o'zi shunday tuzilgan);
- `prefers-reduced-motion` yoqilgan bo'lsa, harakat o'chadi.

**Brend nomi va logotip hali yo'q.** Hozir mahsulot "Design" deb ataladi. Bu landingdan oldin hal qilinishi kerak bo'lgan birinchi qaror (6-bo'limga qarang).

---

## 4. Landing: bo'limma-bo'lim

Marshrut: kirmagan mehmon `/` da landingni ko'radi, kirgan foydalanuvchi `/` dan dashboard'ga o'tadi (yoki dashboard `/app` da bo'ladi). SSR, har bo'lim alohida komponent, rasm va iframe'lar lazy yuklanadi.

| # | Bo'lim | Tarkib | Nega |
|---|---|---|---|
| 0 | **Navigatsiya** | Logo · Examples · Pricing · FAQ · Sign in · **Start free** | Konkurentlarda ham shunday |
| 1 | **Hero** | Sarlavha (1 so'z urg'uli), bir qator izoh, **tavsif maydoni** (qurilma, dizayn tizimi rasmli tanlagichi, "Design it"), ostida 4 ta tayyor taklif chipi, "Free during beta · No card". O'ngda yoki orqada: 3 ta telefon kadri, ular orasida bog'lovchi chiziqlar | Birinchi 3–5 soniyada mahsulot nima qilishini ko'rsatadi. Tavsif yozilsa u saqlanadi, kirilgach generatsiya darhol boshlanadi ("prompt-first signup") |
| 2 | **Jonli demo: "Bosib ko'ring"** | Haqiqiy yaratilgan ilova preview'i (bizning `/preview` ko'prigimiz), telefon ramkasida: tablar, Back va kartalar ishlaydi. Yonida 3 ta tab: Fitness, Bank, Food. Pastda "Bu bitta tavsifdan yaratilgan: «…»" | Hech bir konkurentda yo'q. "Izchil" va "jonli" dalilini bir vaqtda beradi |
| 3 | **"Hammasi bir-biriga mos"** | Bitta ilovaning 5 ekrani yonma-yon, ustida annotatsiyalar: "bir xil tab bar", "Pad Thai — $12.99 hamma joyda bir xil", "haqiqiy rasmlar", "bitta uslub". Chiziqlar ekranlarni bog'laydi | Asosiy farqimizni ko'rinadigan qiladi |
| 4 | **Tahrir: oldin/keyin** | Kichik interaktiv sahna: element bosiladi → panel → "make it blue" yoki matn tahriri → natija; ostida `‹ v2 ›` va ⌘Z. Video emas, CSS/JS animatsiya | Uchinchi dalil: boshqariladigan |
| 5 | **Galereya "Made with …"** | 6–8 ta nomlangan ilova to'plami (Sleek'ning References formati), har biri 3 ekran va dizayn tizimi tegi. Bosilsa to'liq preview ochiladi. Kontent eval'dagi eng yaxshi natijalardan qo'lda tanlanadi (soxta emas, haqiqatan bizniki) | Mahsulot sifatining isboti. Keyinchalik "Remix" (shu tavsifdan boshlash) |
| 6 | **3 qadam** | 1) Tasvirlang, 2) Butun ilova tayyor (reja, ekranlar, rasmlar), 3) Bosing, o'zgartiring, eksport qiling. Har qadamda haqiqiy UI bo'lagi | Uchala konkurentda ham bor, standart |
| 7 | **Imkoniyatlar bento** | 6 ta karta: 33 dizayn tizimi va tema (kichik jonli swatch), kodda chizilgan grafiklar, render auditi va "Fix", zip prototip, versiyalar va undo, bitta so'rovda butun ilova | Sleek va Stitch bento'si, lekin har kartada haqiqiy natija |
| 8 | **Solishtirish** | Halol jadval: "Bizda / Odatiy AI dizayn vositasi": izchil ma'lumot, bosiladigan prototip, element tahriri, zip eksport. Brend nomlarisiz, keyinroq alohida SEO sahifalar | Sleek'ning "vs" sahifalari SEO uchun ishlaydi, landingda qisqasi yetadi |
| 9 | **Narxlar** | Beta davomida: "Bepul beta, kuniga N generatsiya" va "Pro: tez kunda" (email yig'ish). BIL-12 tayyor bo'lgach haqiqiy tariflar | Narx ko'rinmasa, odam "qimmatdir" deb ketadi |
| 10 | **Ijtimoiy isbot** | Beta'dan keyin haqiqiy iqtiboslar. Ungacha bo'lim yashirin | Soxta testimonial ishlatilmaydi |
| 11 | **FAQ** | 8–10 savol (nima u, bepulmi, Figma'ga eksport, kodga eksport, qaysi ilovalar, dizayn tajribasi kerakmi, ma'lumotlarim kimniki), FAQPage schema bilan | SEO va e'tirozlarni yopish |
| 12 | **Yakuniy chaqiruv** | "Bugun nimani loyihalaymiz?" + yana tavsif maydoni | Uchalasida ham bor |
| 13 | **Footer** | Mahsulot, resurslar, huquqiy (Terms, Privacy, Refund, Contact), ijtimoiy tarmoqlar | LEG-01…04 ga bog'liq |

**Konversiya mexanikasi:**
- **Tavsif birinchi, kirish keyin.** Mehmon tavsif yozib "Design it" bosadi. Tavsif `sessionStorage` va bazada vaqtincha saqlanadi, odam kiradi va generatsiya darhol boshlanadi.
  - Kirishdan oldin generatsiya qilinmaydi. Sababi pul: DeepSeek xarajati va limitlar kirishga bog'langan.
- **Bitta asosiy harakat.** Har bo'limdagi tugma bitta joyga olib boradi: hero'dagi tavsif maydoni yoki "Start free".
- **O'lchov.** OBS-04 hodisalari: landing ko'rildi, tavsif yozildi, kirish boshlandi, kirildi, birinchi generatsiya tugadi, ikkinchi sessiya.

---

## 5. Dashboard: bo'limma-bo'lim

| Qism | Tarkib | Konkurentdan farqi |
|---|---|---|
| **Qobiq** (DSH-10) | Chapda yig'iladigan yon panel: Projects, Examples (galereya), Usage, Settings. Pastda hisob va beta limiti progressi. Tepada qidiruv va yorug'/qorong'i rejim tugmasi (DSH-09) | Sleek formati. Tor ekranda panel yig'iladi |
| **Salomlashuv va tavsif maydoni** | "Good afternoon, Furqat" (vaqtga qarab), katta tavsif maydoni. **Dizayn tizimi endi ro'yxat emas, rasmli kartalardan tanlanadi** (DSH-07, hozir `Keyin`; MVP ga ko'chirishni taklif qilaman): har karta tizimning 3 rangi, shrifti va kichik kit namunasi | Konkurentlarda uslub faqat matn tegi. Bizda tizim ko'rinib turadi |
| **Ilhom kartalari** (DSH-03) | 4–6 ta karta: nom, bir qator tavsif, dizayn tizimi tegi, orqa fonda o'sha tizimning gradienti. Bosilsa tavsif va tizim to'ldiriladi | Sleek bilan teng, lekin tizimga haqiqatan bog'langan |
| **Loyihalar** (DSH-02/04/05/08) | Grid: **har kartada birinchi ekranning haqiqiy kichik rasmi**, nom, "N kun oldin", ekranlar soni, dizayn tizimi nuqtasi. Qidiruv, sevimlilar, grid yoki ro'yxat, `⋯` menyu (nomlash, nusxa, o'chirish, ulashish) | Screenflow'da kulrang placeholder, Sleek'da bosh harflar. Bizda haqiqiy rasm |
| **Bo'sh holat** (DSH-06) | Yangi foydalanuvchi uchun bitta harakat: "Birinchi ilovangiz", uchta ilhom kartasi va galereyadagi bitta namuna loyiha "ichini ko'rish uchun". Kanva'ning shablonli bo'sh holati birinchi sessiyadagi yaratishni 40% dan 75% gacha oshirgani aytiladi | Tadqiqot: bo'sh sahifaga tushgan foydalanuvchining 84% i yo'qoladi |
| **Usage** | Bugungi va 24 soatlik limit, oxirgi generatsiyalar (`llm_calls` dan, B2 tayyor) | Screenflow'ning kredit kartasi o'rnida. Pul qismi keyin (BIL) |

**Kichik rasmlar qanday olinadi:**
1. **Birinchi bosqich:** kartada birinchi ekranning `srcdoc` iframe'i, `transform: scale()` bilan kichraytirilgan va faqat ko'rinish sohasiga kirganda yuklanadi. Server tomonda hech narsa qo'shilmaydi, har doim yangi, temani ham oladi.
2. **Loyiha soni ko'paysa:** saqlashda (yoki kerak bo'lganda) PNG kichik rasm, headless Chrome yoki Playwright bilan, keshlanadi.

---

## 6. Sendan kerakli qarorlar

1. **Brend nomi va domen.** Landing va logo shunga bog'liq. Kerak bo'lsa 10 ta variant va bo'sh domenlarni tekshirib beraman.
2. **Vizual yo'nalish:** A "Studio ink" (tavsiya) yoki B "Aurora dark".
3. ~~Tillar~~: hal qilindi, faqat EN.
4. **Kirmasdan generatsiya:** yo'q (tavsiya, xarajat sababli). Yoki mehmonga bitta bepul ekran (ko'proq konversiya, lekin suiiste'mol xavfi va CAPTCHA kerak bo'ladi).
5. **Galereya:** eval natijalaridan eng yaxshi 6–8 ilovani qo'lda tanlaymizmi yoki sen o'zing tavsif berasanmi?

---

## 7. Roadmap: qatorlar va tartib

**Mavjud qatorlar** (MVP): MKT-01 landing, MKT-02 SEO va OG rasm, MKT-03 demo video, DSH-03 ilhom kartalari, DSH-04 loyiha kartasi, DSH-05 qidiruv, DSH-06 bo'sh holat, DSH-09 qorong'i rejim, DSH-10 qobiq, SHR-02 ulashish havolasi, LEG-01…04.

**Yangi qatorlar.** Qoida bo'yicha avval `Keyin` bo'lib Notion'ga tushadi, sen tasdiqlasang MVP'ga o'tadi:

| ID | Vazifa | Hajm | Nega kerak |
|---|---|---|---|
| LND-01 | Brend: nom, logo, rang va tipografiya tokenlari (`app` uchun alohida tema) | K | Landing va dashboard uchun bitta vizual til |
| LND-02 | Landing marshruti: mehmonga landing, kirganga dashboard; SSR, faqat inglizcha matn | O' | MKT-01 ning asosi |
| LND-03 | Hero: tavsif maydoni, telefonlar va bog'lovchi chiziqlar animatsiyasi, "tavsif birinchi, kirish keyin" | O' | Asosiy konversiya nuqtasi |
| LND-04 | Jonli demo: landingda bosiladigan haqiqiy ilova (preview ko'prigi, 3 ta tab) | O' | Konkurentlarda yo'q |
| LND-05 | "Hammasi mos" bo'limi: annotatsiyali 5 ekran | K | Asosiy farqni ko'rsatadi |
| LND-06 | Tahrir oldin/keyin sahnasi (CSS/JS, videosiz) | K | Uchinchi dalil |
| LND-07 | Galereya: tanlangan ilova to'plamlari, bosilsa preview, "Remix" | O' | Sifat isboti. SHR-02 bilan bog'liq |
| LND-08 | Imkoniyatlar bento, solishtirish jadvali, FAQ (schema bilan), yakuniy chaqiruv, footer | O' | Standart bo'limlar |
| DSH-07 → MVP | Dizayn tizimini rasmli kartalardan tanlash | K | Tanlov ko'rinadigan bo'ladi |
| DSH-08 → MVP | Sevimlilar, grid yoki ro'yxat | K | Loyiha ko'paysa kerak |
| DSH-11 | Loyiha kartasida haqiqiy kichik rasm (lazy iframe, keyin PNG kesh) | K | Screenflow'ning zaif joyi, bizning kuchli joyimiz |
| DSH-12 | Usage sahifasi (`llm_calls` dan) | K | Limitlarni ko'rinadigan qiladi |

**Tartib va muddat** (taxminan, bitta odam):
1. LND-01 brend qarori va tokenlar: 0.5 kun (sening javobing kerak).
2. Dashboard: DSH-10, DSH-11, DSH-04/05/08, DSH-07, DSH-03, DSH-06, DSH-09, DSH-12. ~2 kun. Kirgan foydalanuvchi har kuni ko'radigan sahifa.
3. Landing: LND-02, 03, 04, 05, 06, 07, 08. ~3 kun.
4. MKT-02 (OG rasm va meta), MKT-03 (demo GIF), LEG-01…04 (footer'dagi sahifalar). ~1 kun.
5. OBS-04 analitika hodisalari: 0.5 kun.

Jami ~7 ish kuni. Deploy (B5) bilan parallel ketishi mumkin: landing'ga domen kerak, domen esa deploy'ga bog'liq.

**Muvaffaqiyat mezonlari** (beta davomida o'lchanadi):
- landingga kelgandan tavsif yozguncha ≥15%;
- tavsif yozgandan kirishni yakunlaguncha ≥50%;
- kirgandan birinchi generatsiya tugaguncha ≥70%;
- 7 kun ichida qaytib kelish ≥25%;
- Lighthouse: Performance ≥90, Accessibility ≥95;
- mobil landing ham to'liq ishlaydi.

---

## 8. Manbalar

- Konkurent skrinshotlari: `concurrents-screenshots/` (sleek.design, screenflow.dev, stitch.withgoogle.com; landing va dashboard, 2026-09-22).
- Bo'sh holat va aktivatsiya: [Empty States in UX — Kompassify](https://kompassify.com/blog/empty-states-guide), [SaaS Empty State Design — Pixxen](https://pixxen.com/blog/saas-empty-state-design/), [Empty State UX — SaaSFactor](https://www.saasfactor.co/blogs/empty-state-ux-turn-blank-screens-into-higher-activation-and-saas-revenue), [SaaS Onboarding Best Practices — DesignRevision](https://designrevision.com/blog/saas-onboarding-best-practices).
- Landing konversiyasi: [How to Build High-Converting AI Landing Pages in 2026 — Unicorn Platform](https://unicornplatform.com/blog/ai-landing-pages-in-2026/), [Good landing page conversion rate 2026 — involve.me](https://www.involve.me/blog/landing-page-conversion-rate).

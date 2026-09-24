# Jonli preview rejasi: generatsiya paytida ekran qanday ko'rinadi

> Yozilgan: 2026-09-22. Sabab: foydalanuvchi Google Stitch bilan solishtirdi. Bizda generatsiya paytida (1) ekranda HTML/JS kod matn bo'lib ko'rinib qoladi, (2) Stitch'dagi kabi chiroyli animatsiya yo'q, (3) har o'zgarishda sahifa qayta yuklanadi, raqobatchilarda esa silliq.
> Manba: ikkita haqiqiy xom oqim yozib olindi (`eval/fixtures/streams/feast-home-{claude,deepseek}.json`, vaqt belgilari bilan) va brauzerda UI kabi 600 ms qadam bilan qayta o'ynatildi; jonli DeepSeek generatsiyasi kuzatildi (47 kadr).

## 1. Tashxis: nima bo'lyapti

| # | Ko'rinadigan muammo | O'lchov | Sabab (kodda) |
|---|---|---|---|
| 1 | **Ekranda kod matn bo'lib ko'rinadi** ("window.addEventListener('message'…", CSS qoidalari) | Jonli DeepSeek: 47 kadrdan **9 tasida** (19%) | `ScreenFrame` chala HTML'ga ham to'liq hujjatdagidek skriptlar qo'shadi: `withLiveTheme` → `inject(html, 'body', LIVE_LISTENER)`, `</body>` yo'q bo'lsa **oxiriga qo'shib qo'yadi**. Oqim teg yoki atribut o'rtasida uzilgan bo'lsa (`<span class="pri`), `<script id="__od_theme_listener">` atribut qiymatiga kiradi; skript ichidagi birinchi `"` atributni, keyingi `>` tegni yopadi, qolgan JS matn bo'lib chiqadi. Xuddi shu yo'l tahrir bridge'i va audit skriptida ham bor (ular faqat `editable` da qo'shiladi, lekin mexanizm bir xil). DeepSeek "Here is a complete…" deb boshlaganda birinchi kadrda shu jumla ko'rinadi (fence hali kelmagan) |
| 2 | **Uzoq oq/bo'sh ekran, keyin hammasi birdan paydo bo'ladi** | Kadrlarning **40–52%** bo'sh. DeepSeek: 16.3 s dan 10.0 s CSS (`</style>` 10.0 s da, body 10.0 s dan keyin); Claude: 234 s dan 214 s CSS | Model avval 8–10 KB CSS yozadi, body oxirida keladi. CSS bosqichida ko'rsatadigan narsa yo'q, biz oq iframe yoki `Skeleton` ko'rsatamiz. Stitch shu paytda "o'rab olish" animatsiyasini ko'rsatadi |
| 3 | **Har 600 ms da butun sahifa qayta yuklanadi**: oq miltillash, shriftlar qayta chiziladi, scroll yo'qoladi | Jonli generatsiyada brauzer 45 s **muzlab qoldi** (3 kadr × har 600 ms × Tailwind CDN JIT qayta ishga tushishi) | `ScreenFrame` `srcDoc` ni almashtiradi (`useThrottled(html, 600)`); srcdoc har almashganda iframe **to'liq qayta yuklanadi**: `<script src="https://cdn.tailwindcss.com">` qayta yuklanadi va butun DOM'ni qayta kompilyatsiya qiladi, Google Fonts qayta so'raladi, skriptlar qayta ishga tushadi. Tugagach `router.invalidate()` → `plan-i` frame o'rniga haqiqiy ekran frame'i keladi (yana reload), keyin rasm URL'lari bilan yana bir versiya |
| 4 | Tugagan ekran "sakraydi": avval rasmsiz, keyin rasmlar bilan | — | Rasmlar oqim tugagach `resolveImages` da qo'yiladi va saqlanadi; frame yangi HTML bilan qayta yuklanadi |

**Xulosa:** uchala shikoyat bitta ildizga borib taqaladi: *chala HTML'ga to'liq hujjatdek munosabat va har yangilanishda iframe'ni qayta yuklash*. Raqobatchilar iframe'ni **bir marta** ochib, ichini kichik patch'lar bilan yangilaydi.

## 2. Tadqiqot: raqobatchilar va amaliyot

- **Iframe bir marta ochiladi, keyin patch'lanadi.** LobeHub'ning `HtmlPreview` komponenti "har tokenda iframe'ni qayta ishga tushirmaslik" uchun sandboxed iframe'ni bir marta o'rnatadi ([Lobe UI HtmlPreview](https://ui.lobehub.com/components/html-preview)). LLM → DOM qatlam haqidagi maqola: har chunk'da `innerHTML` almashtirish butun sahifani miltillatadi; kerak bo'lgani DOM diff (morphdom/idiomorph) va **faqat yangi tugunlarni animatsiya qilish** ([The Missing Layer Between LLMs and Your DOM](https://dev.to/helmuthdu/the-missing-layer-between-llms-and-your-dom-18bl)).
- **Idiomorph**: bitta DOM daraxtini boshqasiga "morph" qiladigan ~5 KB kutubxona, id'larni saqlaydi, holatni (scroll, fokus) yo'qotmaydi; HTMX 4 ga standart kiritilgan ([idiomorph](https://github.com/bigskysoftware/idiomorph), [HTMX 4.0](https://www.infoworld.com/article/4150864/htmx-4-0-hypermedia-finds-a-new-gear.html)).
- **Chala HTML'ni tuzatib ko'rsatish**: htmlstream va shunga o'xshash vositalar ochiq qolgan teglarni yopib, faqat tugallangan tugunlarni qo'shadi ([htmlstream](https://github.com/Alphanimble/htmlstream)). Brauzerning o'zi ham oqimli HTML'ni bo'lak-bo'lak render qiladi; yangi `streamHTMLUnsafe` API shu uchun ([InfoQ, 2026](https://www.infoq.com/news/2026/09/native-deferred-html-streaming/)). Bizga tashqi kutubxona shart emas: tugallanmagan oxirgi tegni tashlash + ochiq `<style>/<script>` ni yopish 30 qatorli funksiya.
- **Stitch**: Gemini 2.5 Flash bilan sekundlarda generatsiya qiladi; ochiq manbalar animatsiya mexanikasini yozmaydi ([Google Labs blog](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/), [Codecademy guide](https://www.codecademy.com/article/google-stitch-tutorial-ai-powered-ui-design-tool)). Sening kuzatuving bo'yicha: generatsiya paytida frame va uning ichidagi elementlar animatsiya bilan "o'raladi" — ya'ni **skelet + paydo bo'lish (reveal) animatsiyasi**, kod emas. Buni kodda qilish arzon: bizda arxetip blueprint'i bor, skelet shakli undan olinadi.

## 3. Reja

Tartib: avval kod ko'rinishini yo'qotish (bir kunlik, eng uyatli bug), keyin reload'siz oqim (asosiy ish), keyin animatsiya.

### LP-01: chala HTML'ga skript qo'shilmaydi, tugallanmagan qism ko'rsatilmaydi (0.5 kun)

- `lib/partial-html.ts` → `repairPartialHtml(text)`:
  - preamble matn (fence'gacha) tashlanadi; `<!doctype` yoki `<html` dan boshlanadi;
  - oxiridagi **tugallanmagan teg** (`<span class="pri`) va tugallanmagan **matn tuguni** kesiladi (faqat oxirgi yopilgan `>` gacha);
  - ochiq `<style>` yoki `<script>` ichida uzilgan bo'lsa — o'sha blok butunlay olib tashlanadi (yarim CSS qoidasi hammani buzadi, yarim JS xato beradi);
  - `</body></html>` qo'shiladi.
- Streaming frame'ga **hech qanday bridge/listener** qo'shilmaydi; tema faqat statik `<style>` sifatida `</head>` bo'lsa head'ga, bo'lmasa qo'shilmaydi.
- Test: ikkala fixture oqimini 2% qadam bilan kesib, har kadrda ko'rinadigan matnda kod naqshi yo'qligi (`{`, `;`, `addEventListener`, `<`), bitta ham `<script id="__od_theme_listener">` matn sifatida yo'q.

### LP-02: iframe bir marta ochiladi, ichi patch'lanadi (1 kun)

- Streaming frame'da `srcDoc` **bir marta** beriladi: bo'sh hujjat + `<style data-od-stream>` + kichik morph skripti (idiomorph, MIT, vendorlanadi `src/lib/vendor/idiomorph.min.js`, ~5 KB) + shimmer CSS.
- Ota oyna har yangilanishda `postMessage({type:'od:stream', head, body})` yuboradi (faqat o'z iframe'iga, mavjud `e.source` qoidasi bilan). Frame ichida:
  - `<style>` matni `textContent` bilan yangilanadi (reload yo'q);
  - `<script src>` (Tailwind CDN, Lucide) **bir marta** qo'shiladi, qayta emas — Tailwind CDN o'zi MutationObserver bilan yangi klasslarni kompilyatsiya qiladi;
  - `body` idiomorph bilan morph qilinadi: mavjud tugunlar joyida qoladi, scroll saqlanadi, faqat yangi tugunlar qo'shiladi.
- Yangilanish chastotasi vaqt bo'yicha emas, **mazmun bo'yicha**: kamida bitta yangi tugallangan element paydo bo'lganda (odatda 300–800 ms).
- Test: fixture oqimini o'ynatganda iframe `load` hodisasi **1 marta**; scroll saqlanadi; Tailwind skripti bitta.

### LP-03: generatsiya animatsiyasi, Stitch darajasida (1 kun)

- **CSS bosqichi** (body hali yo'q, vaqtning ~60%): frame ichida arxetip skeleti (blueprint bo'limlaridan: header, kartalar, ro'yxat qatorlari, tab bar) shimmer bilan; pastda bosqich yozuvi oqim holatidan hisoblanadi: "Styling…" (`<style>` ichida) → "Laying out…" (body) → "Adding photos…" (`resolveImages`) → "Checking…" (lint/audit). Model chaqirilmaydi, hammasi oqim pozitsiyasidan.
- **Body bosqichi**: idiomorph qo'shgan har yangi tugun `data-od-new` oladi → 220 ms `opacity 0→1, translateY(6px)→0`; skelet bloklari haqiqiy kontent kelgan sari bittalab yo'qoladi (birinchi haqiqiy `section`/`main` bolasi kelganda skelet olib tashlanadi).
- **Frame chegarasi**: hozirgi `ring-2` o'rniga aylanuvchi gradient chiziq (conic-gradient, 2 s), tugaganda 300 ms da oddiy chegaraga o'tadi.
- `prefers-reduced-motion` da animatsiya o'chadi.
- Test: skelet arxetipga qarab tanlanadi; bosqich yozuvi oqim pozitsiyasidan to'g'ri.

### LP-04: tugaganda ham reload yo'q (0.5 kun)

- `screen_done` kelganda `plan-i` frame **o'sha iframe bilan** haqiqiy ekranga aylanadi: canvas'da frame kaliti reja indeksidan `screenId` ga o'tadi, iframe qayta yaratilmaydi; saqlangan yakuniy HTML (normalizer, rasmlar, annotatsiya bilan) **morph** qilinadi, rasmlar `img` yuklanganda fade-in.
- Tahrir bridge'i, audit va tema listener'i shu paytda **postMessage bilan** o'rnatiladi (skript matnini frame ichida `document.createElement('script')` bilan qo'shish), srcdoc almashtirilmaydi.
- Chat orqali tahrir (edit-by-parts) ham shu yo'ldan: yangi HTML morph, o'zgargan element highlight.
- Test: reja → ekran → tahrir bo'ylab iframe `load` soni 1.

### LP-05: o'lchov (0.5 kun, LP-01 bilan birga boshlanadi)

- `eval/stream.check.ts`: fixture oqimlarini headless Chrome'da o'ynatadi va sanaydi: **kodli kadrlar** (maqsad 0), **bo'sh kadrlar** (maqsad: CSS bosqichida skelet, ya'ni 0 oq kadr), **iframe reload soni** (maqsad 1), birinchi ko'rinadigan kontentgacha vaqt.
- Yangi xom oqim yozib olish skripti (`eval/capture-stream.ts`) — provayder o'zgarganda fixture yangilanadi.

**Jami ~3.5 kun.** LP-01 va LP-05 birinchi kun.

## 4. Qilinmaydi

- Model chiqishini o'zgartirish ("CSS'ni oxirida yoz" degan prompt) — CSS bosqichi baribir bo'ladi, faqat joyi o'zgaradi; sifatga xavf.
- Serverda render qilib rasm yuborish — kechikish va xarajat, foyda yo'q.
- Har tokenda yangilash — ko'z uchun 300–800 ms yetadi, tezroq bo'lsa Tailwind JIT ortidan yetolmaydi.

## 5. Sendan kerakli qarorlar

1. LP-01…05 ni MVP'ga olib hozir boshlaymizmi? (Tavsiya: ha, GQ-08 vizual hakam tugallangan, qolgan GQ'lar keyin.)
2. **idiomorph** (MIT, ~5 KB, vendorlanadi) qabulmi? Yagona yangi bog'liqlik; o'zimiz yozsak 300+ qator va xatoga moyil.
3. Animatsiya uslubi: skelet + reveal + aylanuvchi chegara (tavsiya) yoki faqat skelet + reveal?

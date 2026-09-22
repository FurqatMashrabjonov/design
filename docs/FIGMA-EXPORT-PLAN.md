# Figma'ga eksport rejasi ("Copy to Figma")

> Yozilgan: 2026-09-22. Maqsad: foydalanuvchi ekranni (yoki butun ilovani) bir bosishda Figma'ga olib o'tadi va u yerda **tahrirlanadigan** qatlamlarni oladi: frame'lar, matn, rasmlar, ikonkalar, iloji bo'lsa Auto Layout bilan. Rasm yoki bitta vektor blok emas.

## 1. Raqobatchilar va bozor

| Kim | Qanday | Nima saqlanadi | Kamchiligi |
|---|---|---|---|
| **Google Stitch** | "Copy to Figma" + rasmiy **Stitch to Figma** plagini: ekranni nusxalaysan, Figma'da plagin ochiladi va joylaydi ([plagin](https://www.figma.com/community/plugin/1577379704241183556/stitch-to-figma), [uithings](https://uithings.com/what-is-google-stitch)) | Ichma-ich qatlamlar, **Auto Layout**, nomlangan qatlamlar, tahrirlanadigan matn ([Medium](https://medium.com/@0xmega/google-stitch-tutorial-2026-the-tool-that-made-figmas-stock-drop-10-in-a-day-7a051b77a591)) | Bittadan ekran; ba'zi rejimlarda tugma yo'q; natija asliga har doim ham mos emas, qatlam tuzilishi noqulay ([html.to.design blog](https://html.to.design/blog/from-google-stitch-to-figma/)) |
| **html.to.design** (divRIOTS) | Plagin yoki brauzer kengaytmasi, istalgan sahifani ushlaydi; "Copy to clipboard" rejimi ham bor ([docs](https://html.to.design/docs/from-claude-ai-to-figma/), [plagin](https://www.figma.com/community/plugin/1159123024924461424/html-to-design-by-divriots-import-websites-to-figma-designs-web-html-css)) | Eng yuqori aniqlik, tartibli qatlamlar | Pullik, tashqi vosita |
| **Builder.io** | Chrome kengaytmasi DOM elementini ushlaydi, Figma plaginiga import ([blog](https://www.builder.io/blog/html-to-design)) | Elementlar, matn, rasmlar | Ikki vosita kerak |
| **Ochiq manba** | `@builder.io/html-to-figma`, `sergcen/html-to-figma`, `mike2151/html-to-figma`: brauzerda DOM'dan hisoblangan stillar bilan node daraxti, Figma plagini uni yaratadi ([sergcen](https://github.com/sergcen/html-to-figma), [mike2151](https://github.com/mike2151/html-to-figma)). Figit esa plagin'siz paste va'da qiladi ([figit](https://www.figit.design/)) | Frame, matn, rasm; Auto Layout'ni ba'zilari qiladi | Ko'pi eskirgan, Tailwind CDN / zamonaviy CSS bilan sinalmagan |

**Xulosa:** bozor standarti — **brauzerda DOM'ni hisoblangan stillar bilan o'qish → neytral node daraxti → Figma Plugin API bilan native node yaratish**. Stitch aynan shunday: tugma + rasmiy plagin. Figma REST API node yarata olmaydi, shuning uchun plagin'siz yo'llar ikkita:
1. **SVG paste**: Figma nusxalangan SVG'ni vektor va matn qatlamlari qilib qabul qiladi. Ishonchli, lekin Auto Layout yo'q, matn ba'zan bo'linadi.
2. **Figma'ning ichki clipboard formati** (`text/html` ichida base64 "kiwi" binari). Hujjatlashtirilmagan, teskari muhandislik; Figma yangilanganda buziladi. Tavsiya qilmayman.

## 2. Bizning ustunliklarimiz

- Har ekran **o'z iframe'ida brauzerda render qilinadi**: hisoblangan stillar (`getComputedStyle`), aniq koordinatalar, Tailwind kompilyatsiya qilingan holda, bizda tayyor.
- Kod markerlari bor: `data-od-shell` (tab bar/header), `data-od-img`, `data-od-icon`/Lucide, `data-od-chart`, `data-od-map`, `data-od-id` (element id). Ular Figma'da **ma'noli qatlam nomlari** beradi ("Tab bar", "Photo · cappuccino", "Chart · bar"). Hech bir raqobatchida bu yo'q.
- Tokenlar (`--accent`, `--surface`…) ma'lum, ya'ni Figma **Variables/Styles** yaratish mumkin (keyingi bosqich).
- Butun ilova rejasi bor: bitta bosishda **hamma ekranlar**, yonma-yon, prototip bog'lanishlari (`data-od-link`) bilan. Stitch bittadan qiladi.

## 3. Reja

### FIG-01: frame ichidagi serializer (1 kun), qolgan hamma narsaning asosi
- `lib/figma-serialize.ts`: frame ichida ishlaydigan skript (edit bridge'ga postMessage buyrug'i: `od:serialize`).
  - Ko'rinadigan DOM'ni aylanib, har element uchun: `rect`, `background` (rang, gradient, rasm), `border` va `radius`, `shadow`, `opacity`, `overflow`;
  - matn tugunlari: shrift oilasi, o'lcham, og'irlik, qator balandligi, harf oralig'i, rang, tekislash, **haqiqiy satr kengligi** (`Range.getBoundingClientRect`);
  - `img`: URL (Pexels) va `object-fit`;
  - Lucide `<svg>` va chizilgan grafik/xarita: **SVG manbasi** (vektor bo'lib keladi);
  - flex konteynerlar: `direction`, `gap`, `padding`, `justify/align` — **Auto Layout xaritasi uchun**;
  - marker'lardan qatlam nomi.
- Natija: neytral `ODNode` daraxti (JSON, versiyalangan, sxema testlangan). Tashqi kutubxona yo'q. Ochiq manbalardagi yondashuv, lekin bizning markerlar va Tailwind'ga moslangan.
- Test: bir nechta saqlangan eval ekranida daraxt hosil bo'ladi, har matn va rasm tushib qolmaydi, o'lchamlar render bilan ±1 px.

### FIG-02: "Copy as SVG" — plagin'siz, darhol ishlaydi (0.5 kun)
- `ODNode` → toza SVG: `<rect>` (fill, stroke, rx), `<text>`/`<tspan>` (har satr alohida, shriftlar bilan), `<image href>` (Pexels URL yoki base64), ikonkalar va grafiklar SVG'ning o'zi; guruhlar va qatlam nomlari `id`/`data-name` orqali.
- Frame menyusida va eksport menyusida "Copy to Figma (SVG)": clipboard'ga `image/svg+xml` + matn. Figma'da ⌘V — tahrirlanadigan vektor va matn qatlamlari.
- Cheklov (halol): Auto Layout yo'q, faqat absolyut joylashuv.
- Test: SVG valid, har `<text>` render matni bilan bir xil; Figma'ga qo'lda paste qilib tekshirish (sen, 1 marta).

### FIG-03: Figma plagini "Open Design → Figma" — Stitch darajasi (2 kun)
- `figma-plugin/` (manifest, `code.ts`, kichik UI). Foydalanuvchi bizda **"Copy to Figma"** bosadi, clipboard'ga `ODNode` JSON tushadi (maxsus prefiks bilan). Figma'da plagin ochiladi, paste qilinadi (yoki plagin clipboard'ni o'zi o'qiydi) va:
  - `figma.createFrame()`, flex konteynerlar uchun **Auto Layout** (`layoutMode`, `itemSpacing`, `padding*`, `primaryAxisAlignItems`…); flex bo'lmagani absolyut;
  - `createText()` + `loadFontAsync` (Google Fonts nomlari; topilmasa Inter'ga tushadi, qatlam izohida asl shrift);
  - rasmlar: `figma.createImageAsync(url)` → `IMAGE` fill;
  - ikonka, grafik, xarita: `createNodeFromSvg`;
  - qatlam nomlari marker'lardan, tab bar va header alohida guruh.
- **Butun ilova**: hamma ekranlar yonma-yon frame'lar sifatida; `data-od-link` → Figma prototip reaksiyalari (bosilsa keyingi ekran).
- Figma Community'ga nashr: ko'rib chiqish odatda bir necha kun. Ungacha "development plugin" sifatida manifest faylini import qilish yo'li bilan ishlaydi.
- Test: `ODNode` → plagin chaqiruvlari xaritasi birlik testlari (Figma API mock); qo'lda 3 ta ekranni import qilish.

### FIG-04: dizayn tizimi Figma'ga (0.5 kun, FIG-03 dan keyin)
- Tokenlar → Figma **Variables** (`accent`, `surface`, `fg`…) va matn stillari; node'lar fill'i variable'ga bog'lanadi. Figma'da temani almashtirish butun ilovani qayta bo'yaydi.

### FIG-05: o'lchov (FIG-01 bilan birga)
- `eval/figma.check.ts`: saqlangan eval ekranlarida serializer qamrovi: matnlar, rasmlar, ikonkalar ulushi; Auto Layout'ga tushgan konteynerlar ulushi; SVG va render solishtirmasi (piksel farqi).

**Jami ~4–4.5 kun.** Tartib: FIG-01 → FIG-02 (plagin'siz, darhol foyda) → FIG-03 (asosiy) → FIG-04.

## 4. Qilinmaydi

- Figma'ning ichki clipboard formati (kiwi): hujjatlashtirilmagan, Figma yangilanganda buziladi, ToS xavfi.
- Serverda headless render qilib eksport: brauzerdagi render allaqachon aniq, server xarajat va kechikish qo'shadi.
- `.fig` fayl generatsiya qilish: format yopiq.

## 5. Sendan kerakli qarorlar

1. FIG-01…05 ni MVP'ga olamizmi yoki `Keyin`da qoladimi? (Tavsiya: FIG-01+02 MVP — bir yarim kunda plagin'siz "Copy to Figma"; FIG-03 beta'dan keyin, chunki plagin Community ko'rigidan o'tishi kerak.)
2. Plagin nomi va Figma akkaunti: plagin sening Figma akkaunting nomidan nashr qilinadi.
3. Bepul tarifda ham bormi yoki Pro imkoniyatmi? (Raqobatchilarda odatda bepul — o'sish kanali.)

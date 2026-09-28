# Eksport rejasi: kod va Figma (Konsta davri)

> Yozilgan: 2026-09-28. Eski eksport (EXP-01…03, FIG-01/02/05/06) HTML pipeline bilan birga o'chirilgan. Bu reja
> ularni Konsta/JSX asosida qayta quradi. Eski kod git tarixida: `src/lib/figma-serialize.ts`, `figma-svg.ts`,
> `figma-copy.ts`, `export-app.ts`, `zip.ts`, `eval/figma.check.ts`, `docs/archive/FIGMA-EXPORT-PLAN.md`.

## 1. Hozir qo'limizda nima bor

| Narsa | Qayerda | Eksport uchun ma'nosi |
|---|---|---|
| Har ekranning **React/JSX manbasi** | `screens.html` | Haqiqiy kod — model yozgani, o'zgartirilmagan |
| Kit manbasi (Ring, Photo, useNav, AppTabbar…) | `runtime/kit/*.jsx` | Studio ishlatadigan kodning o'zi — eksportga ko'chiriladi |
| Plan: tablar, ekran id'lari, parent'lar, palitra, data | `projects.plan`, `navigation` | Navigator, tab bar, prototip bog'lanishlari |
| Tema: accent, dark, platform | `projects.theme` | Eksport qilingan ilova shu ko'rinishda ochiladi |
| Foto URL'lari | `image_cache` | `photos.json` — ilova rasmlari bilan ochiladi |
| Brauzerda render qilingan DOM | har frame iframe'i | Figma uchun: hisoblangan stil, aniq koordinata |
| rolldown, Tailwind compiler, Konsta, React | serverda o'rnatilgan | Bitta HTML faylga bundle qilish mumkin |
| Eski ODNode serializer + SVG yozuvchi | git tarixi | DOM'ga umumiy — 80% qayta ishlatiladi |
| Tarif chegarasi `PLAN_LIMITS.export` | `lib/credit-prices.ts` | Eksport pullik tariflarda (qaror sizda) |

**Asosiy xulosa:** HTML davrida "kod eksporti" CDN'li HTML fayllar edi. Endi bizda **haqiqiy React ilova** bor. Stitch
HTML/Tailwind beradi, v0 React beradi — biz React + native iOS/Android komponentlar (Konsta) beramiz, u `npm run dev`
bilan darhol ishlaydi. Bu eng katta farqlovchi xususiyat va eng arzoni: kod allaqachon yozilgan.

## 2. Kod eksporti

### CODE-01: React + Vite loyiha (.zip) — 1 kun
```
<app-name>/
  package.json        react 19, react-dom, konsta 5, lucide-react, tailwindcss 4, @tailwindcss/vite, vite, @vitejs/plugin-react
  vite.config.js      '@od/kit' → ./src/kit
  index.html
  README.md           npm install && npm run dev; qaysi ekran qayerda
  src/main.jsx        <App theme=ios|material dark> + Navigator (stack: push/pop, tablar), accent → Konsta tokenlari
  src/kit/ui.jsx      runtime/kit/ui.jsx nusxasi
  src/kit/nav.jsx     useNav: postMessage o'rniga ilova ichidagi stack (Vita prototipidagi Navigator — push/pop animatsiyasi bilan)
  src/screens/*.jsx   har ekran manbasi o'zgarishsiz (slug nomi bilan)
  src/photos.json     keshdagi Pexels URL'lari
  src/styles.css      tailwind + konsta theme + vs-* harakatlar
```
- Kit'ning **ikki xil `nav`i**: studio (frame ↔ host postMessage) va eksport (ilova ichida stack). `useNav` API bir xil,
  shuning uchun ekran kodi o'zgarmaydi.
- Zip serverda yig'iladi (eski `zip.ts` qayta ishlatiladi), `GET /api/export/$projectId?format=react` (egasi yoki admin).
- **Test:** saqlangan eval ilovasini eksport qilib, vaqtinchalik papkada `vite build` — xatosiz o'tishi shart
  (npm install o'rniga repo'ning node_modules'iga symlink, internetsiz). Bu `npm run check`ga kiradi.

### CODE-02: Bitta faylli HTML prototip — 0.5–1 kun
- CODE-01 loyihasining o'zi serverda rolldown bilan bundle qilinadi → bitta `index.html` (JS va CSS ichida). Internetsiz
  ochiladi (fotolar URL; ixtiyoriy: base64 qilib ichiga joylash). Mijozga yuborish, Notion/Slack'ga qo'yish uchun.
- Bir pipeline: bir xil fayllar, faqat oxirida bundle.

### CODE-03: Ekran kodini ko'rish va nusxalash — 0.3 kun
- Frame menyusida "View code": ekranning JSX'i (sintaksis rangli), "Copy". Eski `CodeDialog` git'da bor.

## 3. Figma eksporti

### FIG-10: serializer runtime ichiga — 0.5 kun
- Eski `SERIALIZE_SOURCE` (DOM → ODNode: rect, fill, gradient, border, radius, soya, matn satrlari, rasm, SVG, flex
  layout) deyarli o'zgarishsiz. U HTML sahifaga inject qilinardi, endi kit ichida: frame `od:serialize` xabarini oladi
  va daraxtni qaytaradi (faqat parent'dan, `e.source` tekshiruvi bilan).
- Qatlam nomlari yangi markerlardan: Konsta klasslari (`k-navbar` → "Navbar", `k-tabbar` → "Tab bar", `k-list-item` →
  "Row · Morning run", `k-button` → "Button · Save"), kit (`Photo` → "Photo · grilled chicken salad", `Ring` → "Ring"),
  lucide `<svg class="lucide-flame">` → "Icon · flame".
- Holat: serializer ekranni joriy temada (iOS/Android, light/dark) va to'liq balandlikda o'qiydi.

### FIG-11: "Copy to Figma" (SVG paste, plagin'siz) — 0.5 kun
- Eski `figma-svg.ts` + `figma-copy.ts` qayta ishlatiladi: ODNode → SVG (guruhlar nomlangan, matn haqiqiy matn, foto
  base64 bilan ichida, ikonkalar vektor). Clipboard'ga; Figma'da ⌘V → tahrirlanadigan qatlamlar.
- Bitta ekran, tanlanganlar yoki butun ilova (canvas'dagi joylashuvi bilan). Frame menyusi va top bar'dagi Export menyusi.
- Cheklov (halol): Auto Layout yo'q; `backdrop-filter` (Konsta Glass) va blur Figma SVG'da yo'q → oddiy fill bo'ladi.
- **Test:** eski `eval/figma.check.ts` qayta: headless Chrome'da eval ekranlari seriallanadi — har matn, rasm va ikonka
  daraxtda bor, koordinatalar render bilan ±1 px, SVG valid.

### FIG-12: Figma plagini — Auto Layout, matn stillari, prototip — 2–3 kun (keyinroq)
- Stitch darajasi: flex konteynerlar → Auto Layout, `createText` + shriftlar, `createImageAsync`, ikonkalar SVG'dan.
- **Butun ilova + prototip bog'lanishlari**: planda push/pop/tab grafi bor → Figma reaksiyalari avtomatik.
- **Variables**: palitra `C`, accent, light/dark → Figma Variables (mode'lar bilan: Light/Dark). iOS/Android ikkala
  variant alohida sahifa sifatida.
- Figma Community ko'rigi bir necha kun; ungacha "development plugin" sifatida ishlaydi. Plagin sizning Figma akkauntingiz
  nomidan nashr qilinadi.

## 3b. Tayyor yechimlar (research, 2026-09-28)

| Yechim | Nima | Bizga |
|---|---|---|
| **code.to.design API** (divRIOTS, html.to.design dvigateli, ~3 mln foydalanuvchi) | HTML/CSS/JS → Figma'ning **native clipboard** ma'lumoti (Auto Layout bilan) yoki plagin ma'lumoti; `/html-multi` bitta chaqiruvda 4 ekran; `theme: light/dark`; kredit bilan pullik | Eng tez yo'l Stitch darajasiga (plagin'siz, Auto Layout bilan). Kamchiligi: har eksport pullik kredit, foydalanuvchi ekrani uchinchi tomonga yuboriladi, tashqi bog'liqlik |
| Ochiq manba `html-to-figma` (sergcen, mike2151, auto-layout DEV plugin) | DOM → Figma node; plagin kerak | Eski FIG-01 bizniki bilan bir xil yondashuv; yangi narsa bermaydi |
| Stitch | Copy + rasmiy "Stitch to Figma" plagini, Auto Layout bilan, ekranma-ekran | FIG-12 aynan shu yo'l |

Tavsiya: FIG-11 (o'zimizning SVG, bepul, darhol) + ixtiyoriy **FIG-13: code.to.design orqali "Copy to Figma (Auto Layout)"** pullik
tariflar uchun — plagin yozish va Community ko'rigini kutishdan tezroq. Keyin, hajm oshsa, FIG-12 o'z plaginimiz.

## 4. Qilinmaydi

- Figma'ning ichki clipboard formati (kiwi binari): hujjatlashtirilmagan, yangilanishda buziladi.
- Serverda headless render qilib Figma eksporti: brauzerdagi render allaqachon aniq va bepul.
- Expo / React Native eksporti: Konsta — web komponentlar; RN'ga o'tkazish qayta yozish degani (alohida qaror).

## 5. Tartib va hajm

| # | Qator | Hajm | Nima beradi |
|---|---|---|---|
| 1 | CODE-01 React + Vite zip | 1 kun | Eng katta qiymat: ishlaydigan ilova kodi |
| 2 | CODE-03 View / copy code | 0.3 kun | Bitta ekran kodi darhol |
| 3 | FIG-10 + FIG-11 Copy to Figma (SVG) | 1 kun | Plagin'siz Figma, bitta yoki hamma ekran |
| 4 | CODE-02 Bitta HTML prototip | 0.5–1 kun | Yuborib bo'ladigan offline prototip |
| 5 | FIG-12 Figma plagini | 2–3 kun | Auto Layout, Variables, prototip |

Jami 1–4: ~3 kun. 5 alohida (Community ko'rigi bor).

## 6. Sizdan kerakli qarorlar

1. Qaysi qatorlar MVP'ga? Tavsiya: 1–4 MVP, FIG-12 `Keyin`.
2. Eksport bepulmi yoki pullik tariflardami? Kod bor (`PLAN_LIMITS.export`: Starter va Pro). Tavsiya: **Copy to Figma
   va View code bepul** (o'sish kanali, Stitch ham bepul), **React zip va HTML prototip pullik**.
3. Eksport qilingan kod litsenziyasi: foydalanuvchiniki (FAQ'dagi "designs are yours" bilan bir xil) — README'ga yoziladi.

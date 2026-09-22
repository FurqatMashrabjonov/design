# Dashboard rejasi

> Yozilgan: 2026-09-22. Manba: `concurrents-screenshots/` dagi Sleek, Screenflow va Stitch dashboard skrinshotlari va hozirgi `src/routes/index.tsx`. Landing bilan bir xil vizual til: "Studio ink" (`src/Landing.tsx`), faqat inglizcha. Umumiy kontekst: `docs/LANDING-DASHBOARD-PLAN.md`.

## 1. Hozir qanday

Dashboard `max-w-3xl` o'lchamdagi bitta ustundan iborat:

- "What do you want to design?" sarlavhasi;
- tavsif maydoni, ichida ikkita select (qurilma, dizayn tizimi nomi);
- loyihalar grid'i. Kartada rasm o'rnida kulrang telefon shakli, nom va ikkita badge.

**Yo'q narsalar:**

- yon panel, qidiruv, sevimlilar;
- loyihaning haqiqiy rasmi, "qachon" ma'lumoti;
- ilhom kartalari, bo'sh holat, limit ko'rsatkichi, qorong'i rejim.

**Qurilma tanlovi standart holatda `desktop` turibdi, mahsulot esa mobil.**

## 2. Konkurentlar dashboard'i

| | Sleek | Screenflow | Stitch |
|---|---|---|---|
| **Qobiq** | Chap yon panel: Projects, Usage, API Keys, References. Pastda promo karta, Upgrade, hisob | Chap panel: Overview, Projects, Billing. Pastda upgrade kartasi, "Free · 12 credits", hisob | Chap panel **loyiha tarixi bo'lib ishlaydi**: sanalar bo'yicha guruhlar ("Kecha", "Oxirgi 7 kun", "Shu yil", "Misollar"), qidiruv, "Mening / Men bilan ulashilgan" tablari |
| **Markaz** | "Start generating your app designs", tavsif maydoni (rasm biriktirish, Auto, "Match a design"), 4 ta ilhom kartasi (nom, tavsif, uslub tegi, pastel gradient) | "Good afternoon, Furqat!", 4 ta raqam kartasi (loyihalar, ekranlar, bu hafta, kreditlar va progress), quick actions (New Project qora, All Projects oq) | Katta sarlavha, tavsif maydoni (App/Web, palitra, model rejimi, mikrofon), 3 ta taklif chipi, "Ideas" karuseli (katta rasmli kartalar) |
| **Loyihalar** | "My Projects": All / Favourites, qidiruv, grid yoki ro'yxat. Kartada **bosh harflar**, nom, "Created 5 days ago", ⭐ va ⋯ | "Recent projects": **kulrang placeholder**, nom, promptning birinchi qatori, sana, "View all" | Chap panelda **kichik haqiqiy rasm**, nom, qurilma belgisi va sana |
| **Zaif joyi** | Loyiha ko'rinmaydi, faqat harflar | Rasm yo'q, raqam kartalari bo'sh akkauntda ma'nosiz ("0 new") | Panel uzun ro'yxatga aylanadi, markazdagi joy bo'sh turadi |

**Olinadigan narsalar:**

- Sleek'dan: panel tuzilishi va ilhom kartalari.
- Screenflow'dan: salomlashuv va limit progressi. Kredit o'rnida bizda kunlik limit.
- Stitch'dan: haqiqiy kichik rasm va sana bo'yicha tanish tartib.

**Olinmaydigan narsalar:**

- bo'sh raqam kartalari: "Projects 3, Screens 12" hech narsa qildirmaydi;
- promo va "Upgrade" bloklari: billing yo'q, beta bepul;
- API keys bo'limi.

## 3. Maqsad

1. **Birinchi kirgan odam 10 soniya ichida generatsiya boshlaydi.** Tadqiqotlarga ko'ra bo'sh sahifa eng katta yo'qotish nuqtasi. Bitta harakat, tayyor misollar bilan.
2. **Qaytib kelgan odam o'z loyihasini ko'rib taniydi.** Rasm, nom va "2 soat oldin" bilan.
3. **Limit ko'rinib turadi.** 150 ta chaqiruvlik limit kutilmaganda tugamasligi kerak.

## 4. Tuzilish

```
┌──────────────┬───────────────────────────────────────────────────────────┐
│ ▣ Design     │                                               ☾   (avatar) │
│              │                                                             │
│ ⌂ Home       │          Good afternoon, Furqat                             │
│ ▦ Projects   │          What should we design today?                       │
│ ✦ Examples   │   ┌─────────────────────────────────────────────────────┐  │
│              │   │ Describe your app…                                   │  │
│ RECENT       │   │                                                      │  │
│ ▢ Stride     │   │ [📱 iPhone ▾] [◐ Nike ▾ (swatch)]        [Design it ↑] │  │
│ ▢ Nova Bank  │   └─────────────────────────────────────────────────────┘  │
│ ▢ HabitQuest │                                                             │
│              │   Need a start?                                             │
│              │   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│              │   │phone   │ │phone   │ │phone   │ │phone   │  4 ta karta   │
│              │   │Run club│ │Neobank │ │Recipes │ │Meditate│               │
│              │   │·Nike   │ │·Stripe │ │·Airbnb │ │·Calm   │               │
│              │   └────────┘ └────────┘ └────────┘ └────────┘               │
│              │                                                             │
│ ──────────── │   Your projects        [All | ★ Favourites]  [🔍 Search] ▦ ☰ │
│ Today        │   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                        │
│ 37 / 150 ▓▓░ │   │ live │ │ live │ │ live │ │ live │  first screen          │
│              │   │thumb │ │thumb │ │thumb │ │thumb │  (iframe)              │
│ (F) Furqat ▾ │   │Stride│ │Nova  │ │...   │ │...   │  name · 6 screens · 2h │
└──────────────┴───────────────────────────────────────────────────────────┘
```

**Yon panel (DSH-10):**
- 240px, `md` dan kichik ekranda yig'iladi.
- Tepada logo. Home, Projects, Examples.
- **Recent:** oxirgi 5 loyiha, har biri kichik rasm va nom bilan (Stitch uslubi).
- Pastda kunlik limit progressi ("Today 37 / 150") va hisob menyusi (`AccountMenu` shu yerga ko'chadi).

**Yuqori panel:** qorong'i rejim tugmasi (DSH-09) va avatar.

**Hero:**
- Vaqtga qarab salomlashuv va ism.
- Landingdagi tavsif maydoni (`HeroPrompt`). Ikki farqi bor:
  - **Qurilma:** standart `iPhone`. Desktop menyu ichida qoladi.
  - **Dizayn tizimi (DSH-07):** oddiy select o'rniga popover. Ichida 33 ta kartaning har birida tizimning 3 ta rang nuqtasi, shrifti bilan "Aa" va nomi turadi. Kategoriya bo'yicha guruhlanadi, "Auto" birinchi turadi.

**Ilhom kartalari (DSH-03):**
- 4 ta karta, har biri tayyor prompt va dizayn tizimi.
- Kartada o'sha uslubdagi **haqiqiy ekran rasmi** turadi (`public/showcase/` dan). Sleek'da faqat pastel gradient.
- Bosilganda tavsif maydoni va tizim to'ldiriladi, fokus maydonga o'tadi. Generatsiya o'zi boshlanmaydi: odam ko'rib, o'zgartirib yuboradi.

**Loyihalar (DSH-04/05/08/11):**
- All / Favourites, nom bo'yicha qidiruv, grid yoki ro'yxat.
- **Karta:**
  - birinchi ekranning **jonli kichik rasmi**;
  - nom, "6 screens", "2h ago";
  - dizayn tizimi rang nuqtasi;
  - ⭐ va ⋯ menyusi (Rename, Duplicate, Delete).
- **Ro'yxat ko'rinishi:** kichik rasm, nom, tizim, ekranlar soni va sana ustunlari.
- **Tartib:** oxirgi o'zgarish bo'yicha, yaratilgan sana bo'yicha emas.

**Bo'sh holat (DSH-06):**
- Loyiha yo'q bo'lsa "Your projects" bo'limi yashiriladi.
- Hero ostida bitta qator: "New here? Start from an example — or open one to look inside".
- Namuna loyihani ochish (read-only preview) keyin qo'shiladi. Hozircha galereyadagi to'plamlar landingda bor.

## 5. Ma'lumot va server tomoni

| Kerak | Qanday | Nega shunday |
|---|---|---|
| Kichik rasm | Yangi route `/api/thumb/$screenId`: `requireScreen` bilan egasini tekshiradi, saqlangan HTML'ni qaytaradi (`Cache-Control: private, max-age=60`). Kartada `<iframe loading="lazy" sandbox="allow-scripts">` va scale | Loader'ga har loyihaning 30 KB lik HTML'i kirmaydi. Faqat ko'ringan kartalar yuklanadi. Landingdagi `Phone` komponenti shu yerda ham ishlatiladi. Rasm doim yangi, render qilish yoki PNG saqlash kerak emas |
| Birinchi ekran, ekranlar soni, oxirgi o'zgarish | `Project.forUser` bitta so'rovda qo'shadi: `html` bo'sh bo'lmagan, o'chirilmagan ekranlar soni, birinchi yaratilgan ekran id (`min(created_at)`), oxirgi o'zgarish — ekranlar va versiyalarning eng yangi `created_at` i (`screens` da `updated_at` yo'q) | Arxitektura qoidasi: bo'sh `html` va `deleted_at` bo'lgan qatorlar ro'yxatga kirmaydi |
| Sevimlilar | Migratsiya 0018: `projects.favorite INTEGER DEFAULT 0`. `toggleFavorite` server funksiyasi (`requireProject`) | Kichik va aniq ish. Undo kerak emas: bir bosishda qaytariladi |
| Limit | `UsageService` dan `callsToday(userId)` va `LIMIT_CALLS_PER_DAY`. `getHome` qaytaradi | `llm_calls` allaqachon yozilyapti (B2) |
| Nomlash / nusxa / o'chirish | Rename va Delete bor. Duplicate: loyiha, ekranlar va navigatsiyani nusxalash, versiyalar ko'chmaydi | Duplicate kichik, lekin tasdig'ing kerak: yangi imkoniyat |
| Qorong'i rejim | `class="dark"` `<html>` da, tanlov `localStorage` da. Birinchi chizishdan oldin qo'yiladigan kichik inline skript bilan, aks holda sahifa oq miltillaydi. Landing hozircha faqat yorug' | shadcn tokenlarida `.dark` allaqachon bor |

## 6. Bosqichlar

| # | Qator | Nima | Hajm | Tekshiruv |
|---|---|---|---|---|
| 1 | **DSH-10** qobiq | Yon panel, yuqori panel, `AccountMenu` ko'chadi, mobil'da yig'iladi. "Studio ink" tokenlari (oq fon, qora tugmalar, lime urg'u) | O'rta | Brauzer: 1440 va 390 px |
| 2 | **DSH-11** *(yangi)* jonli kichik rasm | `/api/thumb` route, `forUser` kengayadi, `Phone` umumiy komponentga chiqadi | Kichik | Test: begona ekran 404, bo'sh ekran chiqmaydi. Brauzer: rasm chiqadi |
| 3 | **DSH-04** karta | Rasm, nom, ekranlar soni, "2h ago", tizim nuqtasi, ⋯ menyu. Oxirgi o'zgarish bo'yicha tartib | Kichik | Brauzer |
| 4 | **DSH-05** qidiruv | Klientda nom bo'yicha filtr. Hech narsa topilmasa "No projects match" | Kichik | Brauzer: topildi va topilmadi |
| 5 | **DSH-08** sevimlilar, grid/ro'yxat | Migratsiya 0018, `toggleFavorite`. Ko'rinish tanlovi `localStorage` da | Kichik | Test: faqat egasi o'zgartiradi. Brauzer |
| 6 | **DSH-07** dizayn tizimi kartalari | Popover grid: `tokens.css` dan 3 ta rang va shrift (`DesignSystemService` da `swatch` maydoni) | Kichik | Brauzer: tanlandi, loyiha shu tizim bilan yaratildi |
| 7 | **DSH-03** ilhom kartalari | 4 ta karta, showcase ekrani, bosilganda maydon va tizim to'ldiriladi | Kichik | Brauzer |
| 8 | **DSH-06** bo'sh holat | Yangi hisob: loyihalar bo'limi yo'q, ilhom kartalari ko'rinadi | Kichik | Yangi hisob bilan brauzer |
| 9 | **DSH-12** *(yangi)* limit ko'rsatkichi | Paneldagi "Today 37/150". 80% dan oshsa sariq, 100% da qizil va "Resets at 00:00 UTC" | Kichik | Test: `callsToday`. Brauzer |
| 10 | **DSH-09** qorong'i rejim | Tugma, `localStorage`, inline skript, miltillash yo'q | Kichik | Brauzer: qayta yuklaganda ham qorong'i |

**Jami ~2 ish kuni.** Tartib: avval odam har kuni ko'radigan narsalar (qobiq, rasm, karta), keyin yangi odam uchun (ilhom kartalari, bo'sh holat), oxirida sayqal.

**Qilinmaydi:**
- raqam kartalari (Screenflow);
- Upgrade va promo (billing yo'q);
- API keys;
- ulashilgan loyihalar tabi (SHR);
- sana guruhlari (5 ta "Recent" yetadi);
- papkalar va teglar.

## 7. Sendan kerakli qarorlar

1. **DSH-07 va DSH-08 ni `Keyin` dan `MVP` ga ko'chiramizmi?** Ikkalasi ham kichik va dashboard'ni to'liq qiladi. Tavsiya: ha.
2. **DSH-11 (jonli rasm) va DSH-12 (limit) yangi qatorlar.** Qoida bo'yicha avval `Keyin` bo'lib qo'shiladi. MVP'ga olamizmi? Tavsiya: ha. Rasm eng ko'zga tashlanadigan farqimiz.
3. **Duplicate** (⋯ menyuda loyiha nusxasi) kerakmi yoki keyinga qoladimi? Tavsiya: keyinga.

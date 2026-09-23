# Studio UI va tema rejasi (sleek.design tahlili)

> Yozilgan: 2026-09-23. Maqsad: bizning studio (kanvas, dashboard, panellar) "shadcn standart oq-qora" ko'rinishidan chiqib, o'z brendi bor mahsulotga o'xshashi. Raqobatchi sifatida **sleek.design** tirik akkaunt bilan o'rganildi — ranglar ko'z bilan emas, `getComputedStyle` bilan o'lchab olindi.

## 1. Sleek nimani qanday qilgan (o'lchangan)

### 1.1 Palitra — asosiy saboq: **neytral ranglar neytral emas, iliq**

| Token | Light | Dark |
|---|---|---|
| `--background` | `#ffffff` | `#0d0807` |
| `--foreground` | `#2e2726` (qora emas!) | `#ece7dc` (oq emas!) |
| `--card` | `#fffefa` | `#1d1716` |
| `--sidebar` | `#fffdf5` (krem) | `#1d1716` |
| `--muted` / `--accent` | `#ece7dc` | `#2e2726` |
| `--muted-foreground` | `#7a6f6d` | `#dbd7cf` |
| `--border` | `#dbd7cf` | `#48403f` |
| `--input` | `#f7f4ee` | `#2e2726` |
| `--primary` | `#f54a00` | `#f54a00` (bir xil) |
| `--ring` | `#ff8904` | — |
| `--destructive` | `#e7000b` | — |
| `--radius` | `1.25rem` (20px) | bir xil |

Ya'ni bitta **iliq (stone/sand) ramp**: `#fffdf5 → #fffefa → #f7f4ee → #ece7dc → #dbd7cf → #7a6f6d → #48403f → #2e2726 → #1d1716 → #0d0807`. Light rejim uning yuqori qismini, dark rejim pastini oladi. Hech qayerda sof `#000` yoki sof kulrang yo'q. Aynan shu narsa "oq-qora hunuk" hissini yo'q qiladi — orange emas.

**Orange juda kam ishlatiladi**: Export tugmasi, chat'dagi yuborish tugmasi, radius slayderining to'ldirilgan qismi, "Design it" tugmasi, logotip. Qolgan hamma joy iliq neytral. Sabab aniq: kanvasdagi generatsiya qilingan ekranlar rang-barang, studio ularni bosib ketmasligi kerak.

Shriftlar: marketing — Schibsted Grotesk; app ichida tema shriftlari Inter / Plus Jakarta Sans.

### 1.2 Kanvas

- Fon: iliq krem + nuqta tarmoq. Dark rejimda — iliq qora + nuqta.
- **Kadrda ramka ham, soya ham, burchak ham yo'q** — ekran to'g'ridan-to'g'ri kanvasda turadi. Bizda esa har kadr `border + shadow + rounded-xl` ichida, shuning uchun 6 ta "karta" ko'rinadi, dizayn emas.
- Kadr ustida faqat bitta yupqa qator: sudrash nuqtalari (⠿) · nomi · `‹ v3 ›` versiya o'tkagichi. Har doim ko'rinadi, lekin juda past kontrastda.
- Ekran tanlansa: o'sha qator **suzuvchi asboblar paneliga** aylanadi — `</>` (kod), Figma, tashqarida ochish, yuklash, qurilma, `…`; ekran atrofida ingichka ko'k tanlov ramkasi va pastda **`440x956` o'lcham yorlig'i**; sichqoncha element ustida bo'lsa element ajratiladi va tepasida teg nomi (`div`) chiqadi.
- `…` menyusi: Reload · Copy Component · Duplicate · Rename · **Show Layers** · Delete.
- Bir nechta ekran tanlansa o'ngda suzuvchi panel: "1 screen selected", "Hold ⌘ and click…", tanlanganlar ro'yxati, "Screenshot Settings — PNG · 2x · Transparent", "Download Screenshots".
- Pastda markazda asboblar pillasi: tanlash/qo'l · zoom −/50%/+ · fit. (Bizdagi bilan bir xil.)
- Tema panelida rang qatoriga sichqoncha tekkanda **kanvasdagi ekranlar darhol o'sha rang bilan ko'rsatiladi** (preview), qo'yib yuborilsa eski holiga qaytadi.

### 1.3 Tema paneli (bizning THM bilan solishtirish uchun)

Chapda `Chat | Theme` segmenti, tepada **`‹ Version 3 ›`** — tema versiyalari. Keyin yig'iladigan bo'limlar:
- **Fonts**: Body va Headings — ikkita dropdown.
- **Corners**: `Radius` slayderi + raqam maydoni (`1,25`), `Shape: Round | Squircle`.
- **Colors**: har biri dumaloq namuna + nomi + `ⓘ` tooltip: Background, Foreground, Primary, Primary Foreground, Secondary, Secondary Foreground, Muted Foreground, Accent, Card, Card Foreground, Border, Input.

Bizda deyarli hammasi bor (accent qatori, ranglar ro'yxati, radius, Round/Square, ikkita shrift). Yo'q narsalar: tema versiyalari, Squircle, tooltip'lar, yig'iladigan bo'limlar, hover-preview.

### 1.4 Dashboard

Krem sidebar (Projects · Usage · API Keys · References), markazda katta sarlavha + prompt qutisi (20px burchak, ichida `Auto` dizayn tizimi pillasi, "Match a design", orange "Design it ▶"), "Need inspiration?" — 4 ta gradient karta va ostida kichik **mono uppercase** uslub yorlig'i (`NEO-BRUTALISM`), pastda "My Projects": `All Projects | Favourites`, qidiruv, grid/list, karta ichida ikki harfli avatar + nom + "Created 6 days ago" + yulduzcha + `…`. Chap pastda upsell kartasi, Upgrade tugmasi, akkaunt qatori.

Bizning dashboard tuzilishi bunga juda yaqin (DSH qatorlari shundan olingan edi) — farq faqat ranglarda va burchaklarda.

### 1.5 Pul ishlash yuzalari (kuzatuv, hozir qurilmaydi)

Qulflangan ekran kanvasda blur + "🔒 Upgrade to unlock screen" chipi bilan turadi; Export menyusida "Exporting 3 of 8 screens: upgrade to export all". Ya'ni cheklov ishni to'xtatmaydi, ko'rsatadi.

## 2. Bizdagi holat (o'lchangan)

`src/styles.css` — shadcn'ning standart qiymatlari, **xromasi nol**: `--background: oklch(1 0 0)`, `--foreground: oklch(0.145 0 0)`, `--primary: oklch(0.205 0 0)` (deyarli qora), `--muted: oklch(0.97 0 0)`, `--radius: 0.625rem` (10px). Shrift — Geist. Ya'ni brend rangi umuman yo'q: "asosiy tugma" qora, "accent" kulrang. Dark rejim ham sof kulrang.

Kanvas: har kadr `rounded-xl border shadow-sm` — ekranlar karta ichida. Kadr sarlavhasi oddiy kulrang matn. Tanlovda ko'k ring bor, lekin o'lcham yorlig'i va element tegi yo'q.

## 3. Reja

Tartib muhim: **UI-01 hammasining asosi** — qolganlari tokenlarni ishlatadi.

### UI-01 · Iliq neytral ramp + brend rangi (0.5 kun)
`src/styles.css` dagi `:root` va `.dark` to'liq almashtiriladi: 10 pog'onali iliq ramp (stone), `--foreground` sof qora emas, `--background` dark rejimda sof qora emas; `--primary` — brend rangi (§5 dagi qaror), `--primary-foreground` oq; `--ring` primary'ning ochiq varianti; `--radius: 1rem`. Sof `#fff`/`#000` va `oklch(x 0 0)` qolmaydi (test bilan tekshiriladi). Tayyor mezoni: dashboard, kanvas, panellar, landing bitta iliq palitrada; light va dark ikkalasi ham.

### UI-02 · Kanvasdan karta ramkasini olib tashlash (0.5 kun)
`ScreenFrame`: `border`/`shadow`/`rounded-xl` o'rniga ekran to'g'ridan-to'g'ri kanvasda; kadr fonida nozik "qog'oz" soyasi (`0 1px 2px` darajasida, faqat light'da). Kanvas foni iliq + nuqta tarmoq. Kadr sarlavhasi: sudrash nuqtalari · nom · `‹ v ›` versiya o'tkagichi bitta qatorda, past kontrastda. Tayyor mezoni: 6 ekranli loyihada ko'z faqat dizaynlarni ko'radi, "kartalar"ni emas.

### UI-03 · Tanlov holati: o'lcham yorlig'i va element tegi (0.5 kun)
Tanlangan kadr ostida `390x844` yorlig'i; element ustida — mavjud ko'rsatkichga teg nomi qo'shiladi (`annotateElements` allaqachon `data-od-id` beradi, teg nomi ham shu yerda). Asboblar paneli hover'da emas, **tanlovda** chiqadi (hozir hover'da miltillaydi).

### UI-04 · Tema paneli sayqali (0.5 kun)
Yig'iladigan bo'limlar (Fonts · Corners · Colors), har rang qatorida `ⓘ` tooltip ("Primary — asosiy tugmalar va faol holatlar"), rang qatoriga hover'da kanvasda jonli preview (`lib/theme-override.ts` allaqachon xabar bilan yuboradi — hover'da yuborib, chiqishda qaytarish kifoya). Squircle kiritilmaydi (§4).

### UI-05 · Dashboard va landing tokenlarga o'tadi (0.5 kun)
Prompt qutisi 20px burchak, iliq border va `--input` foni; ideya kartalari ostida mono uppercase uslub yorlig'i; sidebar `--sidebar` (krem); "Upgrade" va asosiy harakat — brend rangida, qolgani neytral. Faqat token almashtirish, tuzilish o'zgarmaydi.

### UI-06 · Studio uchun Light/Dark/System (0.3 kun)
Hozir `od:theme` faqat ikki holat va tugmasi yo'q joyda. Tepa panelga quyosh ikonkasi + uch bandli menyu (Light / Dark / System), tanlov saqlanadi (`__root.tsx` dagi skript allaqachon flash'ning oldini oladi).

**Jami ~2.8 kun.**

## 4. Qilinmaydi

- **Sleek'ning orange'ini aynan olish** — bir xil bozorda bir xil rang nusxa bo'lib ko'rinadi. Iliq ramp olinadi (bu texnik yechim), rang o'ziniki bo'ladi.
- **Squircle** — `border-radius` bilan chiqmaydi, har elementga SVG mask kerak; generatsiya sifatiga ta'siri yo'q. `Keyin`.
- **Tema versiyalari** (`‹ Version 3 ›`) — bizda tema o'zgarishi allaqachon Cmd+Z bilan qaytariladi; alohida versiya tarixi hozir ortiqcha. `Keyin`.
- **Show Layers paneli** — FIG-01 daraxti bor, lekin panel FIG-03 plagini bilan birga mantiqiy. `Keyin`.
- Qulflangan ekran / eksport cheklovi ko'rinishlari — B4 (pul ishlash) fazasida.

## 5. Sendan kerak bo'lgan qaror: brend rangi

Iliq neytral ramp hamma variantda bir xil qoladi; farq faqat asosiy rangda (u 3–4 ta joyda ishlatiladi):

| Variant | Hex | Fikr |
|---|---|---|
| **A. Yashil-teal** (tavsiya) | `#0d9d78` / hover `#0b8467` | Iliq qum + yashil — bu nishada hech kimda yo'q (Sleek orange, Stitch ko'k-siyoh, Lovable pushti-orange, v0 qora). Light va dark'da bir xil ishlaydi, generatsiya qilingan ekranlarning rangi bilan urishmaydi. |
| B. Indigo-siyoh | `#5b5bd6` | Xavfsiz, "developer tool" hissi, lekin Stitch va Linear bilan bir yo'lakda. |
| C. Marjon-qizil | `#ff4d3d` | Kuchli va iliq rampga juda mos, lekin Sleek'ning orange'iga yaqin ko'rinadi. |
| D. O'zingnikini ayt | — | Brend rangi allaqachon boshda bo'lsa. |

Qolgan ikki savol: (1) UI-01…06 `MVP` ga kiradimi yoki `Keyin`da qoladimi; (2) shrift Geist'da qoladimi yoki display uchun boshqasi (masalan Schibsted Grotesk yoki Instrument Sans) qo'shilsinmi.

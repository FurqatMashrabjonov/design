# Admin panel rejasi

> Yozilgan: 2026-09-22. Maqsad: asoschi hamma narsani bitta joydan ko'radi:
> - kim ro'yxatdan o'tdi va nima qilyapti;
> - qancha pul ketyapti;
> - qaysi generatsiya buzildi va nega;
> - odamlar nimani yoqtirmayapti.
>
> Kerak bo'lsa bitta tugma bilan to'xtatadi yoki bloklaydi.

## 1. `kiranism/tanstack-start-dashboard`: ishlatamizmi?

**Repo nima:** TanStack Start + React 19 + Tailwind 4 + shadcn shabloni. Ichida TanStack Query, Table, Form, Recharts, Zustand, kbar, dnd-kit bor. Sahifalari: overview, jadvallar, kanban, chat, bildirishnomalar, formalar, 10+ tema. MIT litsenziya, ~750 yulduz, 19 commit. Auth va baza yo'q, faqat UI shablon.

**Xulosa: butun shablonni olib kirmaymiz, faqat naqshlarini olamiz.**

- **Stek bizniki bilan bir xil** (TanStack Start, shadcn, Tailwind 4). Shuning uchun shablon beradigan asosiy narsa tayyor sahifa ko'rinishi, yangi texnologiya emas.
- **Olib kirsak 7 ta yangi kutubxona keladi** (Query, Zustand, kbar, dnd-kit, Form, Recharts, Table) va boshqacha papka tuzilishi. Bizda Models → Services → Controllers → `server/fns.ts` qatlamlari bor. Kanban, chat, formalar va Pokemon demo admin uchun kerak emas.
- **Olinadigan narsalar:**
  1. **Sahifa qobig'i:** yon panel, sarlavha, KPI kartalari. Buni o'zimiz dashboard'da yozdik, xuddi shunday qilamiz.
  2. **Ma'lumot jadvali:** `@tanstack/react-table` + shadcn `data-table` naqshi. Bitta yangi kutubxona, jadvallarda saralash, filtr va sahifalash uchun.
  3. **Grafiklar:** shadcn `chart` komponenti (Recharts ustida). Bitta yangi kutubxona. Kunlik grafiklar uchun o'zimizning SVG ham yetardi, lekin tooltip va o'qlar bilan Recharts arzonroq tushadi.
- Jami **2 ta yangi kutubxona**. Server funksiyalari va baza so'rovlari hozirgi qatlamlarda qoladi.
- **Amalda (2026-09-22):** `@tanstack/react-table` 9-versiyaga chiqib, API'si butunlay o'zgargan edi. Saralash, qidiruv va sahifalash uchun ~40 qatorli o'z `DataTable` imiz (`src/admin/ui.tsx`) yetdi, shuning uchun faqat `recharts` qo'shildi.

## 2. Bizda allaqachon qanday ma'lumot bor

| Jadval | Nimani ko'rsatadi |
|---|---|
| `user`, `session`, `account` | Kim, qachon qo'shildi, oxirgi marta qachon kirdi, Google yoki email orqali |
| `projects`, `screens`, `screen_versions` | Nechta loyiha va ekran, qaysi dizayn tizimi va qurilma, qaysi ekranlar xato bilan qoldi (`error`), o'chirilganlar |
| `messages` | Har bir harakat: plan, edit, regenerate, revert, xato. Foydalanuvchi mahsulot bilan nima qilayotgani |
| `llm_calls` | Har model chaqiruvi: kim, qaysi loyiha, provayder, tokenlar, narx, vaqt, natija, xato matni |
| `feedback` | 👍/👎 va qayta generatsiya, dizayn tizimi, arxetip va variant bilan |
| `image_cache` | Pexels keshi |

**Yo'q narsalar:**
- landing tashriflari va funnel (OBS-04);
- server xatolari paneli (OBS-03);
- sayt tushsa ogohlantirish (OBS-02).

Admin panel ularning o'rnini bosmaydi, lekin o'sha ma'lumotlar keyin shu panelga ulanadi.

## 3. Kirish huquqi va xavfsizlik

- **Better Auth `admin` plugini** (1.7.5 da bor):
  - `user.role`, `banned`, `banReason`, `banExpires` maydonlari;
  - `session.impersonatedBy`;
  - tayyor `listUsers`, `setRole`, `banUser` (sessiyalarni ham o'chiradi) va `impersonateUser` API'lari.
  - Migratsiya 0019 shu ustunlarni qo'shadi.
- **Birinchi admin:** `.env` dagi `ADMIN_EMAILS=...`. Shu email bilan kirgan odam avtomatik `admin` bo'ladi. Keyin boshqa adminlarni panel ichidan tayinlash mumkin.
- **`requireAdmin()`** (`server/auth.ts`): admin bo'lmagan odam **404** oladi, xuddi begona loyihadagidek. Admin panel borligi ham oshkor qilinmaydi.
  - `/admin/*` route'lari `beforeLoad` da tekshiriladi.
  - Admin server funksiyalarining har biri `requireAdmin` bilan ochiladi.
  - Admin sahifalari alohida `server/admin-fns.ts` faylida turadi.
- **Admin harakatlari jurnali** (`admin_actions`): kim, qachon, nima qildi (ban, pauza, limit, rol). Bloklash yoki to'xtatish izsiz qolmasligi kerak.
- **Foydalanuvchi dizaynini ko'rish** faqat o'qish uchun (read-only). Bu Privacy Policy'da aytiladi (LEG-02): "support va sifat uchun loyihalaringizni ko'rishimiz mumkin".
- **Impersonatsiya** (foydalanuvchi nomidan kirish) kuchli, lekin xavfli. `Keyin` ga qoldiriladi.

## 4. Sahifalar

Yo'l: `/admin`. Qobiq dashboard bilan bir xil: yon panel, qorong'i rejim.

### 4.1 Overview: bir qarashda holat
- **KPI kartalari** (bugun, 7 kun, 30 kun, oldingi davr bilan solishtirib):
  - yangi foydalanuvchilar;
  - faol foydalanuvchilar (24 soatda kirgan yoki generatsiya qilgan);
  - yaratilgan loyihalar va ekranlar;
  - **LLM xarajati va kunlik byudjet ($5)**;
  - generatsiyalarning xato ulushi;
  - o'rtacha ekran vaqti;
  - 👍 ulushi.
- **Grafiklar** (30 kun, kunlik): ro'yxatdan o'tish, generatsiya, xarajat (provayder bo'yicha), xatolar.
- **Aktivatsiya:** ro'yxatdan o'tganlardan qanchasi birinchi loyihani yaratdi, qanchasi 2+ loyiha qildi, qanchasi ertasi kuni qaytdi.
- **"Hozir"** bloki:
  - ishlayotgan generatsiyalar (`UsageService` dagi `running`);
  - oxirgi 10 ta xato;
  - pauza holati.

### 4.2 Users
- **Jadval:** avatar, email, qachon qo'shildi, oxirgi kirish, kirish usuli, loyihalar, ekranlar, 24 soatdagi chaqiruvlar, jami xarajat, 👍/👎, holat (faol yoki bloklangan). Qidiruv, saralash, filtr ("bugun qo'shilgan", "limitga yetgan", "bloklangan").
- **Foydalanuvchi sahifasi:**
  - loyihalari kichik rasmlari bilan;
  - so'nggi harakatlari (`messages`);
  - chaqiruvlar jurnali va kunlik xarajat grafigi;
  - feedback.
- **Amallar** (hammasi jurnalga yoziladi, xavflilari tasdiq bilan):
  - bloklash yoki blokdan chiqarish;
  - sessiyalarni o'chirish;
  - admin qilish;
  - shu foydalanuvchiga alohida kunlik limit.
- Shu bo'lim **OBS-05** ni ham yopadi: foydalanuvchilar xarajat bo'yicha.

### 4.3 Projects
- **Hamma loyihalar** kichik rasm bilan (dashboard kartasi, egasi ko'rsatilgan). Filtrlar: dizayn tizimi, qurilma, sana, "xatoli ekrani bor".
- **Loyiha sahifasi, faqat o'qish:**
  - ekranlar kanvasda emas, grid'da;
  - reja va ma'lumot modeli (`projects.plan`);
  - suhbat tarixi.
- Mavjud `ProjectController.show` ishlatiladi, muharrir ochilmaydi.

### 4.4 Generations: sifat va xatolar
- **`llm_calls` jurnali:** vaqt, foydalanuvchi, loyiha, provayder, tokenlar, narx, davomiylik, natija. Xato bo'lsa matni ham. Filtr: faqat xatolar, provayder, sekinlar (P95 dan yuqori).
- **Xatoli ekranlar:** `screens.error` bo'lgan qatorlar, xato turlari bo'yicha guruhlangan ("incomplete HTML", "provider 500" ...).
- **Dizayn tizimi va arxetip kesimi:** qaysi tizimda qayta generatsiya ko'p, qaysi arxetipda 👎 ko'p. Bu eval'ga yangi masala bo'lib boradi.

### 4.5 Feedback
- 👎 va qayta generatsiya qilingan ekranlar kichik rasmlari bilan. Yonida dizayn tizimi, arxetip va variant.
- **"Export pairs"** tugmasi: `EditPairService` bilan tahrirdan oldingi va keyingi juftliklarni yuklab olish (hozir `eval/export-pairs.ts` bilan qilinadi).

### 4.6 Controls
- **Generatsiyani to'xtatish:** hozirgi `GENERATION_PAUSED` env o'rniga bazadagi `settings` jadvaliga o'tadi. Tugma bilan, deploy qilmasdan yoqiladi. Env ham ishlashda davom etadi va ustun turadi.
- **Limitlar:** kunlik chaqiruvlar soni va kunlik byudjet ko'rsatiladi va o'zgartiriladi (xuddi shu `settings` orqali). Foydalanuvchiga alohida limit ham shu yerda.
- **Tizim:**
  - baza hajmi;
  - rasm keshi soni;
  - joriy commit;
  - LLM provayderi (DeepSeek yoki claude-cli; production'da faqat DeepSeek).
- **Admin harakatlari jurnali.**

## 5. Texnik tomoni

- **Qatlamlar:**
  - `app/Services/AdminStatsService.ts`: agregat so'rovlar;
  - `app/Http/Controllers/AdminController.ts`;
  - `server/admin-fns.ts`: `requireAdmin` + validatsiya;
  - `routes/admin/*.tsx`.
- **Postgres'ga o'tishga tayyor bo'lish:** kunlik guruhlash bitta yordamchida (`dayBucket`) turadi. SQLite'da `date(created_at,'unixepoch')`, Postgres'da `to_timestamp(...)::date`, o'tganda shu bitta joy o'zgaradi. Boshqa so'rovlar Drizzle orqali.
- **Tezlik:** hozir ma'lumot kam, har ochilganda hisoblash yetadi. Kerak bo'lsa `llm_calls(created_at)`, `llm_calls(user_id)` va `messages(project_id, created_at)` indekslari qo'shiladi. Oldindan hisoblab qo'yiladigan jadvallar hozircha kerak emas.
- **Kichik rasmlar:** `/api/thumb` hozir faqat egasiga ochiq, admin uchun ham ruxsat qo'shiladi (`requireAdmin` yo'li). Sandbox va CSP shu holicha qoladi.
- **Testlar:** admin bo'lmagan odamga har admin funksiyasi 404 qaytaradi; bloklangan foydalanuvchi generatsiya qila olmaydi; bazadagi pauza `refusal` ga ta'sir qiladi; KPI hisoblari kichik test bazasida to'g'ri chiqadi.

## 6. Bosqichlar va qatorlar

| # | Qator | Nima | Hajm |
|---|---|---|---|
| 1 | **ADM-01** Kirish va qobiq | Better Auth admin plugini, migratsiya 0019, `ADMIN_EMAILS`, `requireAdmin` (404), `/admin` qobig'i, `admin_actions` jurnali | O'rta |
| 2 | **ADM-02** Overview | KPI kartalari (davr solishtiruvi bilan), 4 ta kunlik grafik, aktivatsiya, "Hozir" bloki | O'rta |
| 3 | **ADM-03** Users (+ OBS-05) | Jadval, foydalanuvchi sahifasi, xarajat | O'rta |
| 4 | **ADM-04** Foydalanuvchi amallari | Ban/unban, sessiyalarni o'chirish, rol, alohida limit, hammasi jurnal va tasdiq bilan | Kichik |
| 5 | **ADM-05** Projects | Hamma loyihalar, faqat o'qiladigan loyiha sahifasi | Kichik |
| 6 | **ADM-06** Generations | `llm_calls` jurnali, xatoli ekranlar, tizim va arxetip kesimi | O'rta |
| 7 | **ADM-07** Feedback | 👎 va regenerate galereyasi, juftliklarni eksport | Kichik |
| 8 | **ADM-08** Controls | `settings` jadvali: pauza, limitlar, byudjet; tizim ma'lumoti | Kichik |

**Jami ~3–4 ish kuni.** Tartib shunday, chunki beta boshlanganda birinchi kuniyoq kerak bo'ladiganlar oldin turadi:
1. kirish va Overview;
2. Users va bloklash;
3. Controls (pauza);
4. qolgani.

**Keyinga qoladi:**
- impersonatsiya;
- adminga email yoki Telegram ogohlantirishlari (OBS-02/03 bilan birga);
- landing funnel (OBS-04);
- billing va kreditlar (BIL);
- CSV eksport.

## 7. Sendan kerakli qarorlar

1. **ADM-01…08 ni MVP'ga olamizmi?** Qoida bo'yicha avval `Keyin` bo'lib qo'shildi. Tavsiyam: ha, betadan oldin kamida ADM-01…04 va ADM-08. Busiz betada nima bo'layotganini ko'rmaysan.
2. **Shablon:** butun `tanstack-start-dashboard` emas, faqat 2 ta kutubxona (`@tanstack/react-table`, `recharts`). Rozimisan?
3. **Admin email:** `.env` ga `ADMIN_EMAILS=mashrabjonovfurqat@gmail.com` qo'yamizmi?

# Topshiriq: ishni boshqa kompyuterda davom ettirish

> Yozilgan: 2026-09-21, yangilangan 2026-09-23. Eng yangi ish: `generation-quality` branch. Bu fayl — qayerda to'xtaganimiz, nima ochiq, qanday davom etish. Rejaning o'zi Notion'da ("Vazifalar" bazasi); bu yerda faqat holat.

## 1. Yangi kompyuterda sozlash

```bash
git clone https://github.com/FurqatMashrabjonov/design.git
cd design
git checkout generation-quality     # eng yangi ish shu yerda (canvas-planner orqada qolishi mumkin)
npm install
cp .env.example .env                # keyin kalitlarni qo'lda yoz (pastda)
npm run check && npx tsc --noEmit   # ikkalasi ham toza bo'lishi kerak
npm run dev                         # http://localhost:3000
```

- **Node 24** kerak (testlar `.ts` fayllarni to'g'ridan-to'g'ri `node` bilan ishga tushiradi).
- **`.env`** gitda yo'q (ataylab). Ikki kalit kerak: `DEEPSEEK_API_KEY` (platform.deepseek.com) va `PEXELS_API_KEY` (pexels.com/api, bepul). Eski kompyuterdagi `.env` ni xavfsiz yo'l bilan ko'chir — chatga, gitga, Notion'ga yozma.
- **`data.db`** (sening loyihalaring) ham gitda yo'q — yangi kompyuterda bo'sh baza bilan boshlanadi. Eski loyihalar kerak bo'lsa `data.db` faylini qo'lda ko'chir (server o'chiq paytda).
- **Push:** `gh auth login` qil, keyin `git -c credential.helper='!gh auth git-credential' push origin generation-quality`. Eski kompyuterda `gh` agent shell PATH'ida yo'q edi, shuning uchun to'liq yo'l ishlatilgan: `!/opt/homebrew/bin/gh auth git-credential`.
- **Notion MCP** (Claude Code uchun): `claude mcp add --transport http notion https://mcp.notion.com/mcp`, keyin `/mcp` da login.

## 2. Hozirgi holat

Ikki bosqich parallel: **G · Generatsiya sifati** (`docs/GENERATION-PLAN.md`) va **M · Muharrir UX** (`docs/EDITOR-PLAN.md`). Foydalanuvchi qarori: avval muharrir, keyin generatsiyaning qolgani.

| Bosqich | Tayyor | Qolgan |
|---|---|---|
| G · Generatsiya | EVAL-01…04, GEN-17…26, AST-01…04, UX-03…05 | UX-01/02 (blueprint'lar), HIG-01…03, KIT-01…04, EYE-01…03, VAR-01…03, FB-01/02 |
| M · Muharrir | M0 (EDT-20/21/16/22, GEN-08), M1 (CHAT-01…08, GEN-09, EDT-29), M2 (EDT-23, 24, 17, 25, 26, 18, 19, 31), M3 (EDT-09, EDT-12), M4 (EDT-27, 11, 28, 30), M5 (EDT-10, 32, EXP-03, THM-08), THM-02/03 | — |

Batafsil — `docs/CHANGELOG.md` (eng yangisi tepada), Notion'da "Muharrir doskasi" va "Generatsiya doskasi" ko'rinishlari.

## 2b. 2026-09-23 sessiyasi: nima o'rganildi va qayerda to'xtadik

Kun bo'yi bitta savolga javob izladik: *nega shuncha o'zgarishdan keyin ham oddiy "habit tracker app"
dabdala chiqadi?* Javob quvurda emas, **o'lchovda** edi.

**Eng muhim topilma: biz noto'g'ri raqamni optimallashtirib kelganmiz.** `npm run eval` statik CSS
tekshiruvini (`lint.cleanShare = 0.65`) ko'rsatardi, brauzerda ishlaydigan render audit esa metrikaga
umuman kirmagan edi. Qo'yganda **0.25** chiqdi — 24 ekrandan 18 tasida ko'z ko'radigan nuqson.
Audit endi `npm run eval` ning o'z metrikasida (`metrics.audit`), `OD_SKIP_AUDIT=1` bilan o'chadi.

Yo'l-yo'lakay auditning o'zida uchta xato topildi va tuzatildi: u **500 pikselda** o'lchayotgan edi
(headless Chrome 390px oyna ocholmaydi — endi 390px iframe ichida), prob ishga tushmasa **`[]`
qaytarardi** (ya'ni "toza ekran" deb ko'rsatardi — endi `throw`), va yarim shaffof qatlamlarni
o'tkazib yuborardi (skrimdagi oq matn skrim **ortidagi** oq sahifaga solishtirilardi).

Natija: `cleanShare` **0.25 → 0.833**, hammasi generatsiyasiz, $0 ga (tuzatishlar deterministik
bo'lgani uchun saqlangan ekranlarga qayta qo'llab o'lchandi).

**Uchta tajriba, uchta xulosa:**

| Nima qildik | Natija | Xulosa |
|---|---|---|
| KIT-05: promptga komponent qiymatlarini qo'shdik | kit ishlatish 0.61 → **0.24**, lint 0.65 → 0.48 | promptga material qo'shish **ishlamaydi** |
| FAB: chiqqan HTML geometriyasini yamadik | uch urinish, to'liq yechim yo'q | chiqishni qayta joylashtirish **ishlamaydi** |
| GQ-09: kirishdagi jadvalni tuzatdik | kulrang Notion → iliq Retro, sifat tushmadi | **richag kirishda** |

KIT-05 butunlay qaytarildi. FAB tuzatishi ham qaytarildi, faqat `covered-text` o'lchovi qoldi.
Shundan `CLAUDE.md` ga yangi arxitektura qoidasi yozildi: **kod qo'sha oladi va almashtira oladi,
lekin qayta joylashtirmaydi.**

**GQ-09 nima edi:** `BY_APP_TYPE` jadvalida 48 nomzod katagidan atigi 3 tasi `high` rang energiyali,
va `productivity` bilan `marketplace` da to'rttasi ham `low` edi. `"habit"` so'zi `productivity` da
turardi — ya'ni **bu mahsulot yaratadigan har bir habit tracker kulrang bo'lishi kafolatlangan** edi.
Endi `app-patterns/habits.json` o'z turi, nomzodlari `duolingo|bento|doodle|retro`, va test hech bir
ilova turining to'liq kulrang bo'lishiga yo'l qo'ymaydi.

### Keyingi ish: palitrani model o'ylab topsin (kelishilgan, hali boshlanmagan)

Foydalanuvchi bilan kelishuv: dizayn tizimini majburlash **shiftni pasaytiryapti**. Buni o'lchadik —
33 tizimning rang qamrovi:

```
ko'k 200-260   ████████████ 12   (37%)
qizil 0-30     ████████ 8
yashil         ███ 3
to'q sariq     █ 1      pushti █ 1      sariq █ 1
fon: yorug' 25 · to'q 7          pastel: 0 · yorqin 23
```

Katalogning 62% i ko'k va qizil; pastel **umuman yo'q**. Shu teshik bugun boshqa bir xatoni ham
tushuntirdi: pushti reference rasm berilganda ko'k Cal chiqqan edi — chunki katalogda **bitta**
pushti tizim bor va `matchSystem` eng yaqinini tanlaydi.

**Kelishilgan shakl** (A/B qilinadi, hali yozilmagan):

1. Planner chaqiruvi (allaqachon bitta va bir marta ishlaydi) reja bilan birga **palitra** qaytaradi:
   accent, bg, surface, fg, radius, shrift juftligi, xarakter — shu ilova uchun o'ylab topilgan.
2. Kod uni tekshiradi va AA ga keltiradi. **Bu qatlam bugun yozildi va tayyor**: kontrast algoritmi,
   `--od-*-text` hisoblash (rangli chip fonlari bilan birga), yuza-siyoh matritsasi — hech biri
   tizimga bog'liq emas, istalgan palitrada ishlaydi.
3. Tasdiqlangan palitra hammaga bitta bir xil `:root` bo'lib kiradi — xuddi hozirgi tizim kabi.
   Ya'ni **bitta ilova = bitta palitra**, 6 ta mustaqil chaqiruv bir-biriga zid ketmaydi.

**Nega "tizim butunlay bo'lmasin" emas:** 6 ekran 6 ta mustaqil LLM namunasi. Har biri o'zi tanlasa,
6 xil ilova chiqadi. Sleek'ning skrinshoti aynan shuni ko'rsatadi — 5 ekrandan 2 tasi to'q binafsha,
3 tasi oq-to'q sariq, nav panellari ham har xil. Ular xarakterni izchillik hisobiga sotib olishgan.

**Ochiq xavflar:** (a) AI palitralari o'zaro o'xshab ketishi mumkin — `sameness.crossBriefMean` buni
darhol ko'rsatadi; (b) dizayn tizimi faqat rang emas (shrift shkalasi, radius, soya tili, zichlik),
model rangni beradi, hunarni avtomatik bermaydi. Shuning uchun 33 tizim o'chirilmaydi — namuna
bo'lib qoladi.

**Sinash usuli** (foydalanuvchi tanlagan): bitta prompt — `"habit tracker app"`, uch so'z, o'zgartirmasdan —
ideal bo'lguncha aylantiramiz. Har 3–4 tuzatishdan keyin bir marta 4-briefli eval (~$0.10) faqat
"buzmadikmi" deb tekshirish uchun.

### Bitta prompt bilan topilgan, hali ochiq nuqsonlar

Ikkala ilovada ham takrorlandi (Streakly/notion va HabitLoop/retro):

1. **FAB oxirgi kartaning matnini yopadi** — `covered-text` bilan o'lchanadi. Tuzatish **kirishda**
   bo'lishi kerak (`list` blueprintida asosiy amal inline joylashsin), kodda emas — sinab ko'rildi,
   ishlamadi.
2. **Qidiruv lupasi maydondan tashqarida yolg'iz turadi** — markup xatosi, hali tegilmagan.
3. **Uzun nom ellipsissiz kesiladi** (`"No phone after 1..."`).
4. **Qahramon lahza yo'q** — streak `12 days` bo'lib qator ichida 14px turibdi. Sleek'da o'sha raqam
   ~120px. Bu Sleek bilan asosiy farq va u blueprintga bitta maydon bo'lib tushadi: *qaysi bo'lim
   qahramon va qanchalik katta*.

`od-kit.css` ning iOS o'lchamidagi switch'i (51×31) `small-target` beradi va bu **ma'lum cheklov**:
`input` `::after` ola olmaydi, kattalashtirish esa chizilgan boshqaruvni buzadi.

## 3. Keyingi ish

1. **Generatsiya (G)**: UX-01 (`blueprints/`) va UX-02 (`app-patterns/`) tayyor. VAR-02, HIG-03, EYE-03, KIT-03 (`lib/charts.ts`) ham tayyor. KIT-01 (`kit/od-kit.css`, hali modelga aytilmagan) ham tayyor. Keyingisi: KIT-02 (tizim shaxsiyati tokenlarda), KIT-04 (modelga "avval to'plamdan ol" + oltin namunalar — kit shu bilan ishga tushadi), EYE-01/02, HIG-01/02, VAR-01/03, FB-01/02. Ochiq savol foydalanuvchiga: 5 tizimda `--muted`, 10 tizimda asosiy tugma kontrasti brend tokenlarida <4.5. Eval Claude obunasida ham yuradi (`LLM_PROVIDER=claude-cli npm run eval …`, bitta brief ~8–10 daqiqa); natijalar faqat Claude run'lari bilan solishtiriladi, ishga tushirishdan oldin asosiy o'zgarishlar DeepSeek'da qayta tekshiriladi. Har o'zgarish eval bilan; bazaviy o'lchov uchun oldingi commit'ni `git worktree` da xuddi shu `--only` brieflar bilan yurgizish (node_modules va .env symlink), natijani `eval/out` ga ko'chirib solishtirish. Muharrir rejasi tugagan. Deploy (AUTH, limitlar, Postgres, hosting) generatsiyadan keyin. M4 to'liq tayyor (EDT-27, 11, 28, 30). Foydalanuvchi qarori (2026-09-22): avval muharrir qatorlari tugaydi, keyin generatsiya (G) qatorlari, deploy undan keyin. M3 tayyor: `‹ v3 ›` (`screens.version_id`), Cmd+Z/Shift+Cmd+Z (`lib/undo-stack.ts`, soft delete `screens.deleted_at`, redo = revert'ning revert'i).
   Qaror (foydalanuvchi, 2026-09-22): Postgres'ga (Supabase yoki Neon) o'tish **keyin**, INF-02 qatorida — hozir SQLite qoladi.
2. Keyin M5 (yo'l ko'rsatkich, Preview · Share · Export menyusi, zip eksport, dizayn tizimi namunasi), so'ng generatsiyaning qolgani.
3. Ma'lum cheklov: bo'laklab tahrirlashda (EDT-19) bitta qiymat bir necha joyda bo'lsa, model ba'zan bir joyni unutadi — agent jurnalida "Listed as affected but not edited" bo'lib ko'rinadi. "Replace photo" haqiqiy Pexels bilan brauzerda hali bosib ko'rilmagan.

## 4. Loyiha qoidalari va o'rganilgan narsalar

`CLAUDE.md` — ish kelishuvi va arxitektura qoidalari (majburiy o'qing). Undan tashqari eski kompyuterdagi Claude xotirasida bo'lgan, lekin repoda yo'q narsalar:

- **Foydalanuvchi**: yakka founder, o'zbekcha yozadi (javob ham o'zbekcha), halol baho va dalilga asoslangan tavsiya kutadi. Hujjatlar (CHANGELOG, ROADMAP, rejalar) o'zbekcha, kod izohlari inglizcha.
- **Qoidalarni buzish mumkin, agar sifatga xizmat qilsa** (foydalanuvchi ruxsati): `Tartib` tartibidan chiqish yoki ro'yxatda yo'q ishni qilish mumkin — qaysi qoida va nega buzilganini bir qatorda ayt va keyin Notion'ga qator qo'sh. Buzilmaydi: `check`/`tsc` toza, generatsiya o'zgarishi eval bilan, CHANGELOG yozuvi, faqat so'ralganda commit/push.
- **Model**: faqat DeepSeek V4 Flash (`deepseek-flash`) va `thinking: { type: 'disabled' }` — `LlmService` da pin qilingan. Nomi bilan chaqirilsa thinking standart yoqiq va reasoning tokenlari pulli. `deepseek-v4-pro` ishlatilmaydi.
- **DeepSeek balansini tejash**: UI yoki oqimni qo'lda sinash uchun `.env` ga `LLM_PROVIDER=claude-cli` — generatsiya o'z Claude Code obunang orqali ketadi (faqat lokal; eval va production rad etadi). Eval uchun olib tashla. Eval'da har safar bazaviy variantni qayta yurgizma — saqlangan natija bilan solishtir; deterministik o'zgarishni (autofix, lint) saqlangan ekranlarga LLM'siz qayta qo'llab tekshir.
- **Eval narxi**: to'liq `npm run eval` (25 brief) ≈ **$1.1**. Iteratsiyada `--only id,id` (1 brief ≈ $0.04). To'liq yugurishdan oldin narxini ayt. API 402/429 "balance" qaytarsa — to'xta va balansni to'ldirishni so'ra, qayta urinma. Pexels bepul, lekin 200 so'rov/soat.
- **Brauzerda sinash**: `data.db` ga tegmaslik uchun eval bazasining nusxasi bilan alohida port: `cp eval/out/<run>/eval.db /tmp/x.db && DB_PATH=/tmp/x.db npx vite dev --port 3115`. Claude'ning brauzer tab'i odatda fonda (`visibilityState: hidden`) — koordinata bo'yicha bosish va skrinshot ishonchsiz; natijani DOM va bazadan o'qish ishonchliroq. Sandbox'li iframe ichini sinash uchun uning `srcdoc` iga test skript qo'shiladi.
- **Commit qilishdan oldin `git stash` ishlatma** — bir marta ishlayotgan o'zgarishlarni o'chirib yuborgan (fsck bilan tiklangan).
- **Commit oxiri**: `Co-Authored-By: ...` qatori (Claude Code o'zi qo'yadi).

## 5. Tez eslatma: tizim qanday ishlaydi

- Reja: `PlannerService` (planner v2: `requested/covers` qamrov + bitta tuzatish aylanishi, har ekranga `archetype/userGoal/primaryAction/sections/linksTo`, umumiy `entities` ma'lumot modeli → `projects.plan`).
- Ekran: `PromptComposer` (mobil prompt ≤24k belgi, `STYLE.md` + `craft/mobile.md`) → `ScreenContext.screenBrief` (ilova konteksti, shell shartnomasi, `APP CONTENT`, `APP DATA`) → DeepSeek → `normalizeScreen` → `ImageService.resolveImages` (Pexels, avatarlar, monogramma) → lint → saqlash.
- Muharrir: `ScreenFrame` + `lib/edit-bridge.ts` (iframe ichida), elementlar `lib/element-ops.ts` `annotateElements` bilan (saqlanmaydi, har safar hisoblanadi), qo'l tahrirlari `ElementController`, suhbat `messages` jadvali (`lib/agent-messages.ts`), "Undo this step" — `HistoryController.revertMessage`.
- Testlar: `npm run check` (services, database, new-features, element-ops, image, controllers — DeepSeek stub bilan, eval).

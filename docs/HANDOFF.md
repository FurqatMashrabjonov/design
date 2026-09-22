# Topshiriq: ishni boshqa kompyuterda davom ettirish

> Yozilgan: 2026-09-21, yangilangan 2026-09-22. Eng yangi ish: `generation-quality` branch. Bu fayl — qayerda to'xtaganimiz, nima ochiq, qanday davom etish. Rejaning o'zi Notion'da ("Vazifalar" bazasi); bu yerda faqat holat.

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

## 3. Keyingi ish

1. **Generatsiya (G)**: UX-01 (`blueprints/`) va UX-02 (`app-patterns/`) tayyor. Keyingisi tavsiya bo'yicha: VAR-02 (UX-01 ekranlarni bir-biriga yaqinlashtirdi — sameness 0.049 → 0.075), HIG-03 + EYE-03, KIT-03, keyin KIT-01, EYE-01/02, FB. Har o'zgarish eval bilan; bazaviy o'lchov uchun oldingi commit'ni `git worktree` da xuddi shu `--only` brieflar bilan yurgizish (node_modules va .env symlink), natijani `eval/out` ga ko'chirib solishtirish. Muharrir rejasi tugagan. Deploy (AUTH, limitlar, Postgres, hosting) generatsiyadan keyin. M4 to'liq tayyor (EDT-27, 11, 28, 30). Foydalanuvchi qarori (2026-09-22): avval muharrir qatorlari tugaydi, keyin generatsiya (G) qatorlari, deploy undan keyin. M3 tayyor: `‹ v3 ›` (`screens.version_id`), Cmd+Z/Shift+Cmd+Z (`lib/undo-stack.ts`, soft delete `screens.deleted_at`, redo = revert'ning revert'i).
   Qaror (foydalanuvchi, 2026-09-22): Postgres'ga (Supabase yoki Neon) o'tish **keyin**, INF-02 qatorida — hozir SQLite qoladi.
2. Keyin M5 (yo'l ko'rsatkich, Preview · Share · Export menyusi, zip eksport, dizayn tizimi namunasi), so'ng generatsiyaning qolgani.
3. Ma'lum cheklov: bo'laklab tahrirlashda (EDT-19) bitta qiymat bir necha joyda bo'lsa, model ba'zan bir joyni unutadi — agent jurnalida "Listed as affected but not edited" bo'lib ko'rinadi. "Replace photo" haqiqiy Pexels bilan brauzerda hali bosib ko'rilmagan.

## 4. Loyiha qoidalari va o'rganilgan narsalar

`CLAUDE.md` — ish kelishuvi va arxitektura qoidalari (majburiy o'qing). Undan tashqari eski kompyuterdagi Claude xotirasida bo'lgan, lekin repoda yo'q narsalar:

- **Foydalanuvchi**: yakka founder, o'zbekcha yozadi (javob ham o'zbekcha), halol baho va dalilga asoslangan tavsiya kutadi. Hujjatlar (CHANGELOG, ROADMAP, rejalar) o'zbekcha, kod izohlari inglizcha.
- **Qoidalarni buzish mumkin, agar sifatga xizmat qilsa** (foydalanuvchi ruxsati): `Tartib` tartibidan chiqish yoki ro'yxatda yo'q ishni qilish mumkin — qaysi qoida va nega buzilganini bir qatorda ayt va keyin Notion'ga qator qo'sh. Buzilmaydi: `check`/`tsc` toza, generatsiya o'zgarishi eval bilan, CHANGELOG yozuvi, faqat so'ralganda commit/push.
- **Model**: faqat DeepSeek V4 Flash (`deepseek-flash`) va `thinking: { type: 'disabled' }` — `LlmService` da pin qilingan. Nomi bilan chaqirilsa thinking standart yoqiq va reasoning tokenlari pulli. `deepseek-v4-pro` ishlatilmaydi.
- **Eval narxi**: to'liq `npm run eval` (25 brief) ≈ **$1.1**. Iteratsiyada `--only id,id` (1 brief ≈ $0.04). To'liq yugurishdan oldin narxini ayt. API 402/429 "balance" qaytarsa — to'xta va balansni to'ldirishni so'ra, qayta urinma. Pexels bepul, lekin 200 so'rov/soat.
- **Brauzerda sinash**: `data.db` ga tegmaslik uchun eval bazasining nusxasi bilan alohida port: `cp eval/out/<run>/eval.db /tmp/x.db && DB_PATH=/tmp/x.db npx vite dev --port 3115`. Claude'ning brauzer tab'i odatda fonda (`visibilityState: hidden`) — koordinata bo'yicha bosish va skrinshot ishonchsiz; natijani DOM va bazadan o'qish ishonchliroq. Sandbox'li iframe ichini sinash uchun uning `srcdoc` iga test skript qo'shiladi.
- **Commit qilishdan oldin `git stash` ishlatma** — bir marta ishlayotgan o'zgarishlarni o'chirib yuborgan (fsck bilan tiklangan).
- **Commit oxiri**: `Co-Authored-By: ...` qatori (Claude Code o'zi qo'yadi).

## 5. Tez eslatma: tizim qanday ishlaydi

- Reja: `PlannerService` (planner v2: `requested/covers` qamrov + bitta tuzatish aylanishi, har ekranga `archetype/userGoal/primaryAction/sections/linksTo`, umumiy `entities` ma'lumot modeli → `projects.plan`).
- Ekran: `PromptComposer` (mobil prompt ≤24k belgi, `STYLE.md` + `craft/mobile.md`) → `ScreenContext.screenBrief` (ilova konteksti, shell shartnomasi, `APP CONTENT`, `APP DATA`) → DeepSeek → `normalizeScreen` → `ImageService.resolveImages` (Pexels, avatarlar, monogramma) → lint → saqlash.
- Muharrir: `ScreenFrame` + `lib/edit-bridge.ts` (iframe ichida), elementlar `lib/element-ops.ts` `annotateElements` bilan (saqlanmaydi, har safar hisoblanadi), qo'l tahrirlari `ElementController`, suhbat `messages` jadvali (`lib/agent-messages.ts`), "Undo this step" — `HistoryController.revertMessage`.
- Testlar: `npm run check` (services, database, new-features, element-ops, image, controllers — DeepSeek stub bilan, eval).

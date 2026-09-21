# Topshiriq: ishni boshqa kompyuterda davom ettirish

> Yozilgan: 2026-09-21. Oxirgi commit: `1e17968` (`generation-quality` branch). Bu fayl — qayerda to'xtaganimiz, nima ochiq, qanday davom etish. Rejaning o'zi Notion'da ("Vazifalar" bazasi); bu yerda faqat holat.

## 1. Yangi kompyuterda sozlash

```bash
git clone https://github.com/FurqatMashrabjonov/design.git
cd design
git checkout generation-quality     # eng yangi ish shu yerda (canvas-planner undan 1 commit orqada)
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
| M · Muharrir | M0 (EDT-20/21/16/22, GEN-08), M1 (CHAT-01…08, GEN-09, EDT-29), M2 dan: EDT-23, EDT-17, EDT-25, EDT-26, EDT-18, EDT-31 | **EDT-24 (Jarayonda)**, EDT-19, M3 (EDT-09, EDT-12), M4 (EDT-11, 27, 28, 30), M5 (EDT-10, 32, EXP-03, THM-08) |

Batafsil — `docs/CHANGELOG.md` (eng yangisi tepada), Notion'da "Muharrir doskasi" va "Generatsiya doskasi" ko'rinishlari.

## 3. Ochiq qolgan narsalar (birinchi navbatda shu)

1. **Muharrirni qo'lda sinab ko'r.** Ekranni bos → elementni bos (panel chiqadi) → ikki marta bosib matnni o'zgartir → Enter → Esc, Esc. Oxirgi sessiyada:
   - **Esc brauzerda tasdiqlanmagan** (EDT-24 shu sabab `Jarayonda`). Handler tuzatilgan, qayta sinalmagan.
   - **Fonda turgan brauzer tab'i dev server qayta yuklagandan (HMR) keyin ikki marta javob bermay qoldi.** Server qayta ishga tushgach normal ishladi. Sababi aniqlanmagan. Qotib qolsa — birinchi gumon: `ScreenFrame` ↔ `edit-bridge` xabarlari yoki `Canvas` dagi `extent` bo'yicha avtomatik `fit` effekti.
   - "Replace photo" haqiqiy Pexels bilan brauzerda bosib ko'rilmagan (testda faqat kalitsiz holati bor).
2. **EDT-19**: to'liq ekran tahriri hali butun HTML'ni qayta yozadi. G'oya: model faqat o'zgargan `data-od-id` bloklarni qaytaradi, server `annotateElements` + splice bilan qo'yadi; blok topilmasa — to'liq qayta yozishga qaytadi.
3. Keyin **M3**: kadr ustida `‹ v3 ›` versiya strelkalari (EDT-09) va Cmd+Z / Shift+Cmd+Z (EDT-12). EDT-09 tayyor bo'lgach sidebar'dagi **History** tabini olib tashla (foydalanuvchi rozi).

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

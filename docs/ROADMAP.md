# Reja (MVP)

> **Asosiy manba — Notion'dagi [Design AI — MVP rejasi](https://app.notion.com/p/3e039db48ef981bb9c26e3b652eeebaa) sahifasi.** Bu fayl undan olingan nusxa, Notion bo'lmasa ham rejani o'qish uchun. Doira va Holatni Notion'da o'zgartiring.

Doira: `MVP` hozir quriladi · `Keyin` hozir emas · `Bekor` qilinmaydi. Holat: `Tayyor` · `Jarayonda` · `Rejada` · `Bloklangan`. Qatorlar qurish tartibida.

## B0 · Tayyor

| ID | Vazifa | Modul / Submodul | Doira | Holat | Hajmi | Bog'liq | Tayyor mezoni |
|---|---|---|---|---|---|---|---|
| GEN-01 | Tavsifdan bitta HTML ekran, oqim bilan | Generatsiya / Asosiy | MVP | Tayyor |  |  |  |
| GEN-02 | Bitta tavsifdan ko'p ekranli ilova (3–5 ekran) | Generatsiya / Asosiy | MVP | Tayyor |  |  |  |
| GEN-03 | Avval anchor ekran, qolganlari uning uslubi bilan | Generatsiya / Izchillik | MVP | Tayyor |  |  |  |
| GEN-04 | Tokenlar va shriftli 33 ta dizayn tizimi | Generatsiya / Dizayn tizimlari | MVP | Tayyor |  |  |  |
| GEN-05 | Umumiy navigatsiya (pastki panel, sarlavha) kod bilan quriladi | Generatsiya / Izchillik | MVP | Tayyor |  |  |  |
| GEN-06 | Normalizator: tokenlar, shriftlar, ikonkalar, navigatsiya | Generatsiya / Izchillik | MVP | Tayyor |  |  |  |
| GEN-07 | Avtomatik tuzatuvchi dizayn linteri | Generatsiya / Sifat | MVP | Tayyor |  |  |  |
| EDT-01 | Cheksiz canvas: surish, kattalashtirish, ekranlarni sudrash | Muharrir / Kanvas | MVP | Tayyor |  |  |  |
| EDT-02 | Ekranni qayta nomlash, nusxalash, o'chirish | Muharrir / Kanvas | MVP | Tayyor |  |  |  |
| EDT-03 | Ekranlar ro'yxati paneli | Muharrir / Kanvas | MVP | Tayyor |  |  |  |
| EDT-04 | Bitta qismni tanlab, buyruq bilan o'zgartirish | Muharrir / Tahrirlash | MVP | Tayyor |  |  |  |
| EDT-05 | Butun ekranni buyruq bilan o'zgartirish | Muharrir / Tahrirlash | MVP | Tayyor |  |  |  |
| EDT-06 | Tanlangan ekranga bog'langan chat paneli | Muharrir / Tahrirlash | MVP | Tayyor |  |  |  |
| EDT-07 | Har ekran uchun versiyalar tarixi va qaytarish | Muharrir / Tarix | MVP | Tayyor |  |  |  |
| EDT-08 | Dizayn hakamlari (baholash va tuzatilgan HTML) | Muharrir / Sifat | Keyin | Tayyor |  |  |  |
| THM-01 | Jonli tema: accent rang, burchaklar, shriftlar | Tema / Tema | MVP | Tayyor |  |  |  |
| SHR-01 | To'liq sahifali bosiladigan ko'rish (/preview/:id) | Ko'rish va ulashish / Ko'rish | MVP | Tayyor |  |  |  |
| DSH-01 | Qurilma va dizayn tizimi tanlanadigan tavsif maydoni | Bosh sahifa / Bosh sahifa | MVP | Tayyor |  |  |  |
| DSH-02 | Loyihalar ro'yxati | Bosh sahifa / Loyihalar | MVP | Tayyor |  |  |  |
| EXP-01 | Bitta ekranni HTML qilib yuklab olish (tema bilan) | Eksport / Fayllar | MVP | Tayyor |  |  |  |
| EXP-02 | HTML ni nusxalash, kodni ko'rish (tema bilan) | Eksport / Fayllar | MVP | Tayyor |  |  |  |
| INF-01 | SQLite va raqamlangan migratsiyalar | Infratuzilma / Ma'lumotlar bazasi | MVP | Tayyor |  |  |  |

## G · Generatsiya sifati

> 2026-09-21: yo'nalish o'zgardi — avval generatsiya sifati, keyin B1–B6. Tafsilot: `docs/GENERATION-PLAN.md`. Bu bosqich qatorlari `Tartib` bo'yicha B1 dan oldin turadi.

| ID | Vazifa | Modul / Submodul | Doira | Holat | Hajmi | Bog'liq | Tayyor mezoni |
|---|---|---|---|---|---|---|---|
| EVAL-01 | 25 ta doimiy brief to'plami (eval/briefs.json) | Generatsiya / Sifat | MVP | Tayyor | Kichik |  | Fayl repoda; 10+ ilova turi × turli dizayn tizimi; 5 tasi qisqa/noaniq, 3 tasi o'zbek/rus tilida; kutilgan arxetiplar yozilgan |
| EVAL-02 | npm run eval: generatsiya → 390px iframe → kontakt-varaq | Generatsiya / Sifat | MVP | Tayyor | O'rta | EVAL-01 | Bir buyruq → eval/out/<label>/index.html; oldingi yugurish bilan yonma-yon (compare.html) |
| EVAL-03 | Deterministik eval ko'rsatkichlari: lint, bir xillik, token/vaqt/narx | Generatsiya / Sifat | MVP | Tayyor | O'rta | EVAL-02 | metrics.json; regressiya oldingi yugurishga nisbatan ko'rinadi |
| EVAL-04 | Ko'r-ko'rona A/B taqqoslash sahifasi | Generatsiya / Sifat | MVP | Tayyor | Kichik | EVAL-02 | Ikki yugurish juftlab ko'rsatiladi, tomonlar yashirin; yutish foizi hisoblanadi |
| GEN-17 | DESIGN.md → uslub kartasi (STYLE.md, ≤60 qator), mahsulot lug'atisiz | Generatsiya / Dizayn tizimlari | MVP | Tayyor | O'rta |  | Uslub kartasida brend mahsulot otlari yo'q; eval'da tizim nomi ekran matnida uchramaydi |
| GEN-18 | Lint: dizayn tizimi brend nomi yoki maskoti ekran matnida | Generatsiya / Sifat | MVP | Tayyor | Kichik | GEN-17 | Test fixture P0 topilma bilan yiqiladi |
| GEN-19 | Bitta ekran qo'shish ham to'liq ilova kontekstini oladi | Generatsiya / Izchillik | MVP | Tayyor | O'rta |  | Qo'shilgan ekran bir xil nav, shell va house style'da; check test |
| GEN-20 | Ekran turi kodda tekshiriladi (root-tab / detail-view / modal-flow) | Generatsiya / Izchillik | MVP | Tayyor | Kichik |  | Har tab'ga aynan bitta root-tab; 5 ekran/4 tab → kamida 1 detail; ota-onasiz detail rad etiladi |
| GEN-21 | Planner ikonkani faqat ma'lum ro'yxatdan tanlaydi; sinonim xaritasi; ~80 ikonka | Generatsiya / Izchillik | MVP | Tayyor | Kichik |  | Hech bir tab 'circle' ga tushmaydi. isAction tab standart o'chiq |
| GEN-22 | Kontent urug'i kodda: persona, avatar, sana, valyuta | Generatsiya / Kontent | MVP | Tayyor | Kichik |  | Ikki loyihada har xil persona; bitta loyihaning hamma ekranida bir xil |
| GEN-23 | Prompt dietasi: mobil system prompt ≤6k token | Generatsiya / Sifat | MVP | Tayyor | O'rta | GEN-17 | composeSystemPrompt(*, 'mobile') < 24 000 belgi |
| GEN-24 | 'Accent ≤2' o'rniga tizim bo'yicha colorEnergy | Generatsiya / Dizayn tizimlari | MVP | Tayyor | Kichik |  | manifest.json'da qiymat; lint shunga qarab tekshiradi |
| GEN-25 | temperature aniq beriladi (ekran va planner alohida) | Generatsiya / Asosiy | MVP | Tayyor | Kichik | EVAL-02 | Qiymatlar eval'da tanlangan va LlmService'da yozilgan |
| GEN-26 | Rasm qoidasi ziddiyatini olib tashlash (.ph-img, placehold.co) | Generatsiya / Sifat | MVP | Tayyor | Kichik |  | Repoda .ph-img va placehold.co yo'q |
| AST-01 | Rasm resolver: data-od-img → Pexels, SQLite kesh, gradient zaxira | Generatsiya / Kontent | MVP | Tayyor | O'rta | GEN-26 | Haqiqiy rasm; keshdan; xatoda gradient; kalit faqat serverda |
| AST-02 | Avatarlar persona urug'idan | Generatsiya / Kontent | MVP | Tayyor | Kichik | GEN-22 | Har loyihada har xil, ekranlar aro bir xil |
| AST-03 | Ilova belgisi: kodda monogramma SVG | Generatsiya / Kontent | MVP | Tayyor | Kichik |  | Onboarding/kirish ekranlarida; aksentga ergashadi |
| AST-04 | Rasm sloti o'lchami qulflangan (aspect-ratio, object-fit) | Generatsiya / Kontent | MVP | Tayyor | Kichik | AST-01 | Har qanday rasm layout'ni buzmaydi |
| UX-01 | Ekran arxetiplari katalogi (~20 blueprint) | Generatsiya / Asosiy | MVP | Tayyor | O'rta |  | blueprints/<id>.json; sxema testi |
| UX-02 | Ilova turi naqshlari (~12): odatiy ekran to'plami va oqimlar | Generatsiya / Asosiy | MVP | Tayyor | O'rta | UX-01 | Planner promptiga faqat mos kelgan tur kiradi |
| UX-03 | Planner v2: archetype, userGoal, primaryAction, sections[], linksTo[] | Generatsiya / Asosiy | MVP | Tayyor | O'rta | UX-01 | Sxemaga mos kelmagan reja o'tmaydi yoki tuzatiladi |
| UX-04 | Ilova ma'lumot modeli: ekranlararo bir xil kontent | Generatsiya / Izchillik | MVP | Tayyor | O'rta | UX-03 | Bosh ekrandagi element detal ekranida shu nom va raqam bilan |
| UX-05 | Oqim bog'lari: data-od-link, preview'da o'tish | Generatsiya / Ko'rish | MVP | Tayyor | Kichik | UX-03 | Preview'da kartadan detal ekranga o'tiladi |
| HIG-01 | HIG/Material komponent kartalari (o'z so'zimiz bilan, 5–8 qator) | Generatsiya / Sifat | MVP | Tayyor | O'rta |  | craft/platform/ios/*.md |
| HIG-02 | Promptga faqat arxetip ishlatadigan kartalar kiradi | Generatsiya / Sifat | MVP | Tayyor | Kichik | HIG-01, UX-01 | Prompt byudjeti saqlanadi |
| HIG-03 | HIG raqamlari → render auditi qoidalari | Generatsiya / Sifat | MVP | Tayyor | Kichik |  | Shrift ≥11px, nishon ≥44px, kontrast ≥4.5, tab 3–5 — bitta faylda |
| KIT-01 | od-kit.css: tokenlar bilan ishlaydigan ~30 komponent | Generatsiya / Izchillik | MVP | Tayyor | Katta |  | Har komponent 33 tizimda galereyada to'g'ri ko'rinadi |
| KIT-02 | Tizim shaxsiyati tokenlar orqali (chegara, soya, zichlik, karta uslubi) | Generatsiya / Dizayn tizimlari | MVP | Tayyor | O'rta | KIT-01 | Bitta markup'dan duolingo 'chunky', minimal 'plain' |
| KIT-03 | Grafiklar kodda: data-od-chart → SVG | Generatsiya / Render | MVP | Tayyor | O'rta |  | Model div'dan grafik chizmaydi; har tur testlangan |
| KIT-04 | Skill: 'avval to'plamdan ol' + har arxetipga oltin namuna | Generatsiya / Sifat | MVP | Jarayonda | O'rta | KIT-01, UX-01 | Chiqish tokenlari ~40% kam; lint o'tish ≥95% |
| KIT-05 | Har tizim uchun komponent qiymatlari (COMPONENTS.md) brifga | Generatsiya / Dizayn tizimlari | Bekor | Tayyor | O'rta | KIT-01, KIT-04 | Sinovdan o'tmadi, qaytarildi: kit ishlatgan ekran 0.609 → 0.240, lint toza 0.652 → 0.480 |
| KIT-06 | Qat'iy kit rejimi: model kontent + navigatsiya, ekranni kod yig'adi | Generatsiya / Izchillik | Keyin | Rejada | Katta | KIT-01, KIT-04 | Erkin yo'l bilan yonma-yon o'lchanadi: lint, tells, sameness va ko'z bilan |
| EYE-05 | Render auditni eval metrikasiga qo'shish va uch teshikni yopish | Generatsiya / Sifat | MVP | Tayyor | O'rta | EYE-01, KIT-01 | audit cleanShare 0.25 → 0.50, small-target 9 → 2, generatsiyasiz o'lchandi |
| EYE-06 | Qolgan past kontrastlarning sababi: brend rangi matnda, surface-warm, rangli chip, skrim | Generatsiya / Sifat | MVP | Tayyor | O'rta | EYE-05 | audit cleanShare 0.50 → 0.833, low-contrast 17 → 1 |
| EYE-07 | Audit haqiqiy 390px'da o'lchasin, prob jim xato qaytarmasin | Generatsiya / Sifat | MVP | Tayyor | Kichik | EYE-06 | 500px'da o'lchanardi; iframe bilan 390px, prob javob bermasa throw |
| GQ-09 | Har ilova turida rangli nomzod bo'lsin; habits o'z turi | Generatsiya / Dizayn tizimlari | MVP | Tayyor | Kichik | DS-01 | 48 katakdan 3 tasi high edi; productivity va marketplace to'liq kulrang |
| GQ-01 | Rasm sloti qulfi kenglikni buzmasin + squeezed-text audit | Generatsiya / Sifat | MVP | Tayyor | Kichik |  | docs/GENERATION-QUALITY-PLAN-2.md |
| GQ-02 | Brief'dagi rang va kayfiyat so'zlari temaga aylanadi | Generatsiya / Sifat | MVP | Tayyor | Kichik |  | docs/GENERATION-QUALITY-PLAN-2.md |
| GQ-03 | Auto dizayn tizimi standart (ilova turi va kayfiyat bo'yicha) | Generatsiya / Sifat | MVP | Tayyor | Kichik |  | docs/GENERATION-QUALITY-PLAN-2.md |
| GQ-04 | Xarita sloti kodda chiziladi (foto emas) | Generatsiya / Sifat | MVP | Tayyor | Kichik |  | docs/GENERATION-QUALITY-PLAN-2.md |
| GQ-05 | Root ekran va tab nomi mosligi parsePlan'da | Generatsiya / Sifat | MVP | Tayyor | Kichik |  | docs/GENERATION-QUALITY-PLAN-2.md |
| GQ-06 | Brief sanagan ekranlar chegara bo'ladi | Generatsiya / Sifat | MVP | Tayyor | Kichik |  | docs/GENERATION-QUALITY-PLAN-2.md |
| GQ-07 | Sahifa yopilsa ham generatsiya serverda davom etadi | Generatsiya / Sifat | MVP | Tayyor | Kichik |  | docs/GENERATION-QUALITY-PLAN-2.md |
| GQ-08 | Eval'da vizual hakam (skrinshot + rubrika + pairwise) | Generatsiya / Sifat | MVP | Rejada | O'rta |  | docs/GENERATION-QUALITY-PLAN-2.md |
| GQ-09 | Mobil uchun jilo tizimlari | Generatsiya / Sifat | Keyin | Rejada | Kichik |  | docs/GENERATION-QUALITY-PLAN-2.md |
| GQ-10 | Vizual tanqid sikli (1 marta, vision model) | Generatsiya / Sifat | Keyin | Rejada | O'rta |  | docs/GENERATION-QUALITY-PLAN-2.md |
| GQ-11 | Anchor ekran kuchliroq modelda | Generatsiya / Sifat | Keyin | Rejada | Kichik |  | docs/GENERATION-QUALITY-PLAN-2.md |
| GQ-12 | Desktop prompt yo'li va web skill'larni tozalash | Generatsiya / Sifat | Keyin | Rejada | Kichik |  | docs/GENERATION-QUALITY-PLAN-2.md |
| LP-01 | Preview: chala HTML'ga skript qo'shilmaydi, kod ko'rinmaydi | Generatsiya / Render | MVP | Tayyor | Kichik |  | docs/LIVE-PREVIEW-PLAN.md |
| LP-02 | Preview: iframe bir marta ochiladi, ichi morph bilan yangilanadi | Generatsiya / Render | MVP | Tayyor | O'rta | LP-01 | docs/LIVE-PREVIEW-PLAN.md |
| LP-03 | Preview: skelet, reveal va chegara animatsiyasi | Generatsiya / Render | MVP | Tayyor | O'rta | LP-02 | docs/LIVE-PREVIEW-PLAN.md |
| LP-04 | Preview: tugaganda va tahrirda ham reload yo'q | Generatsiya / Render | MVP | Tayyor | Kichik | LP-02 | docs/LIVE-PREVIEW-PLAN.md |
| LP-05 | Preview: oqim fixture'lari va o'lchov | Generatsiya / Render | MVP | Tayyor | Kichik |  | docs/LIVE-PREVIEW-PLAN.md |
| FIG-01 | Figma: frame ichida DOM → ODNode serializer | Eksport / Integratsiyalar | MVP | Tayyor | O'rta |  | docs/FIGMA-EXPORT-PLAN.md |
| FIG-02 | Figma: Copy as SVG (plagin'siz paste) | Eksport / Integratsiyalar | MVP | Tayyor | Kichik | FIG-01 | docs/FIGMA-EXPORT-PLAN.md |
| FIG-03 | Figma: plagin — Auto Layout, matn, rasmlar, butun ilova | Eksport / Integratsiyalar | Keyin | Rejada | Katta | FIG-01 | docs/FIGMA-EXPORT-PLAN.md |
| FIG-04 | Figma: tokenlar → Variables va matn stillari | Eksport / Integratsiyalar | Keyin | Rejada | Kichik | FIG-03 | docs/FIGMA-EXPORT-PLAN.md |
| FIG-05 | Figma: eksport qamrovi o'lchovi | Eksport / Integratsiyalar | MVP | Tayyor | Kichik | FIG-01 | docs/FIGMA-EXPORT-PLAN.md |
| FIG-06 | Figma: tanlangan ekranlarni yoki butun ilovani nusxalash | Eksport / Integratsiyalar | MVP | Tayyor | O'rta | FIG-01, FIG-02 | docs/FIGMA-EXPORT-PLAN.md |
| EYE-04 | Audit natijalari foydalanuvchiga ko'rsatilmasin (avtomatik tuzatish bekor qilindi) | Generatsiya / Sifat | Bekor | Rejada | O'rta | EYE-01, EYE-02 |  |
| THM-09 | Dizayn tizimi namunasi kadri gorizontal bo'lsin | Tema / Tema | MVP | Tayyor | Kichik | THM-08 |  |
| UI-01 | Studio palitrasi: iliq neytral ramp va brend rangi | Muharrir / Interfeys | MVP | Tayyor | O'rta | docs/UI-THEME-PLAN.md |  |
| UI-02 | Kanvas kadrlaridan karta ramkasi olib tashlansin | Muharrir / Kanvas | MVP | Tayyor | Kichik | UI-01 |  |
| UI-03 | Tanlov holati: o'lcham yorlig'i va element teg nomi | Muharrir / Kanvas | MVP | Tayyor | Kichik | UI-01 |  |
| UI-04 | Tema paneli: yig'iladigan bo'limlar, tooltip, hover-preview | Muharrir / Tema | MVP | Tayyor | Kichik | UI-01 |  |
| UI-05 | Dashboard va landing studio tokenlariga o'tsin | Muharrir / Bosh sahifa | MVP | Tayyor | Kichik | UI-01 |  |
| UI-06 | Studio uchun Light / Dark / System tanlovi | Muharrir / Interfeys | MVP | Tayyor | Kichik | UI-01 |  |
| NAV-01 | Pastki panel variantlari: suzuvchi orol (island), pill, kontrast | Generatsiya / Izchillik | MVP | Tayyor | O'rta | docs/NAV-AND-CRAFT-PLAN.md |  |
| NAV-02 | Faol tab rang bilan emas, pill/doira/nuqta bilan belgilansin | Generatsiya / Izchillik | MVP | Tayyor | Kichik | NAV-01 |  |
| NAV-03 | Panel ostidagi bo'sh joy variantdan hisoblansin | Generatsiya / Izchillik | MVP | Tayyor | Kichik | NAV-01 |  |
| NAV-04 | Eval: navStyle taqsimoti va panel ostida qolgan matn | Generatsiya / Sifat | MVP | Tayyor | Kichik | NAV-01 |  |
| CRAFT-01 | ui-skills qoidalari autofix'ga: tabular-nums, text-balance, press, focus, rasm outline | Generatsiya / Sifat | MVP | Tayyor | O'rta |  |  |
| CRAFT-02 | craft/mobile.md ni kuchliroq qoidalarga almashtirish | Generatsiya / Sifat | MVP | Tayyor | O'rta |  |  |
| CRAFT-03 | Eval: 'generik AI' belgilari hisoblagichlari | Generatsiya / Sifat | MVP | Tayyor | Kichik |  |  |
| MKT-06 | Saytda Design.md galereyasi va Playbook bo'limi | Marketing / Sayt | MVP | Tayyor | O'rta |  |  |
| MKT-07 | ui-skills katalogiga o'z skill'imizni chiqarish | Marketing / Sayt | MVP | Jarayonda | O'rta |  | skill/ tayyor, nashr ruxsat kutmoqda |
| CHAT-01 | Stop tugmasi yuborish tugmasining o'zida, har qanday ish paytida | Muharrir / Tahrirlash | MVP | Tayyor | Kichik |  | docs/CHAT-UPGRADE-PLAN.md |
| CHAT-02 | Jonli faoliyat kartasi: agent hozir nima qilyapti (hodisalardan) | Muharrir / Tahrirlash | MVP | Tayyor | O'rta |  | docs/CHAT-UPGRADE-PLAN.md |
| CHAT-03 | Ish paytida yozilgan xabar navbatga tushsin | Muharrir / Tahrirlash | MVP | Tayyor | Kichik |  | docs/CHAT-UPGRADE-PLAN.md |
| CHAT-04 | Xabar amallari: edit & resend, copy, retry, xato kartasida Retry | Muharrir / Tahrirlash | MVP | Tayyor | O'rta |  | docs/CHAT-UPGRADE-PLAN.md |
| CHAT-05 | Skroll odobi: pastga faqat pastda bo'lsa, aks holda 'New activity' pillasi | Muharrir / Tahrirlash | MVP | Tayyor | Kichik |  | docs/CHAT-UPGRADE-PLAN.md |
| CHAT-06 | Natija kartasi: oldin/keyin eskizi, Undo tugma, takliflar xabar ostida | Muharrir / Tahrirlash | MVP | Tayyor | O'rta |  | docs/CHAT-UPGRADE-PLAN.md |
| CHAT-08 | Rejani tasdiqlash darvozasi: chizishdan oldin ekranlarni tahrirlash | Muharrir / Tahrirlash | MVP | Tayyor | O'rta |  | docs/CHAT-UPGRADE-PLAN.md |
| QLT-01 | Pastki panel shakli ilova xarakteridan tanlansin (orol majburiy emas) | Generatsiya / Izchillik | MVP | Tayyor | Kichik |  | 28 briefli eval (2026-09-23) |
| QLT-02 | Har dizayn tizimining matn tokenlari WCAG AA dan o'tsin | Generatsiya / Dizayn tizimlari | MVP | Tayyor | O'rta |  | 28 briefli eval (2026-09-23) |
| QLT-03 | Halqa grafigi sahifaning markaz matni ustiga ikkinchisini yozmasin | Generatsiya / Sifat | MVP | Tayyor | Kichik |  | 28 briefli eval (2026-09-23) |
| QLT-04 | Teginish maydoni ko'rinadigan qutini kattalashtirmasin | Generatsiya / Sifat | MVP | Tayyor | Kichik |  | 28 briefli eval (2026-09-23) |
| QLT-05 | Rasm kelmaganda ustidagi matn o'qiladigan bo'lsin | Generatsiya / Kontent | MVP | Tayyor | Kichik |  | 28 briefli eval (2026-09-23) |
| LLM-03 | Narx jadvali haqiqiy DeepSeek raqamlariga (peak/off-peak) | Generatsiya / LLM xarajati | MVP | Tayyor | Kichik |  | 28 briefli eval (2026-09-23) |
| QLT-06 | 'Generik AI' qoidalari promptdan linterga ko'chsin | Generatsiya / Sifat | MVP | Tayyor | O'rta |  | 28 briefli eval (2026-09-23) |
| LLM-01 | Thinking chaqiruv joyiga qarab (A/B: plannerda ham o'chiq qoldi) | Generatsiya / LLM xarajati | MVP | Tayyor | Kichik |  | 4 briefli A/B, 2026-09-23 |
| LLM-02 | DeepSeek rasm tushunishi: chatga rasm biriktirib 'shunga o'xshatib qil' | Generatsiya / Asosiy | MVP | Tayyor | O'rta |  | uchdan-uchga sinov 2026-09-23 |
| DS-01 | Avtomatik dizayn tizimi nomzodlar ro'yxatidan tanlansin | Generatsiya / Dizayn tizimlari | MVP | Tayyor | Kichik |  | docs/REFERENCE-AND-AUTO-STYLE-PLAN.md |
| DS-02 | Uslub tanlovi boshlash qutisidan olinsin (Tema panelida qoladi) | Muharrir / Bosh sahifa | MVP | Tayyor | Kichik |  | docs/REFERENCE-AND-AUTO-STYLE-PLAN.md |
| IMG-01 | Boshlash qutisiga rasm: rasmdan badiiy yo'nalish chiqarilsin | Generatsiya / Asosiy | MVP | Tayyor | O'rta |  | docs/REFERENCE-AND-AUTO-STYLE-PLAN.md |
| IMG-02 | Havola rasm dizayn tizimini va temani ham belgilasin | Generatsiya / Dizayn tizimlari | MVP | Tayyor | O'rta |  | IMG-01 ning tuzatilishi |
| EYE-01 | Ko'prikda DOM auditi: overflow, kesilgan matn, nishon, kontrast, ustma-ust | Generatsiya / Render | MVP | Tayyor | O'rta | HIG-03 | Topilmalar data-od-id bilan qaytadi; kelgan ma'lumot tekshiriladi |
| EYE-02 | Avto-tuzatish: aybdor elementga bitta nuqtali chaqiruv, ≤1 aylanish | Generatsiya / Sifat | MVP | Tayyor | O'rta | EYE-01 | Audit o'tish foizi o'sadi; versiya tarixi ifloslanmaydi |
| EYE-03 | LLM'siz tuzatishlar: nishon o'lchami, minimal shrift, nav bo'shlig'i | Generatsiya / Sifat | MVP | Tayyor | Kichik | HIG-03 | autofixScreen kengaygan, testlangan |
| VAR-01 | Loyiha art-yo'nalishi urug'i | Generatsiya / Variantlar | MVP | Tayyor | O'rta | KIT-02 | Loyiha ichida barqaror, loyihalar aro farqli |
| VAR-02 | Har arxetipga 2–3 layout varianti | Generatsiya / Variantlar | MVP | Tayyor | O'rta | UX-01 | Bir xillik ko'rsatkichi bazaviydan ≥30% past |
| VAR-03 | Mobilga moslangan ~400 tokenli estetika bloki | Generatsiya / Sifat | MVP | Tayyor | Kichik | GEN-23 | Prompt byudjeti ichida; eval'da A/B yutadi |
| FB-01 | 👍/👎 va 'qayta yarat' signali yoziladi | Generatsiya / Analitika | MVP | Tayyor | Kichik |  | Signal tizim, arxetip, variant bilan bazada |
| FB-02 | Foydalanuvchi tahrirlari oldin/keyin juftligi sifatida saqlanadi | Generatsiya / Analitika | MVP | Tayyor | Kichik |  | Har tahrir juftligi so'rov bilan birga saqlanadi |
| DEV-01 | Lokal sinov uchun Claude Code provayderi (LLM_PROVIDER=claude-cli) | Generatsiya / Asosiy | MVP | Tayyor | Kichik |  | Productionda va evalda rad etiladi |

## M · Muharrir UX

> 2026-09-21: muharrir (kanvas) UX rejasi — `docs/EDITOR-PLAN.md`. Generatsiya bosqichining qolgan qatorlaridan oldin bajariladi. EDT-09/10/11/12/16/17/18/19, GEN-08/09, EXP-03, THM-08 shu bosqichga ko'chirildi.

| ID | Vazifa | Doira | Holat | Hajmi |
|---|---|---|---|---|
| EDT-20 | ScreenFrame xabarni faqat o'z iframe'idan qabul qiladi | MVP | Tayyor | Kichik |
| EDT-21 | Kanvas ochilganda va generatsiyadan keyin avtomatik fit | MVP | Tayyor | Kichik |
| EDT-16 | Kadr joylashuvi va "fit" har xil balandlikni hisobga oladi | MVP | Tayyor | Kichik |
| EDT-22 | Reload → Regenerate (saqlangan spec'dan, o'z slotida) | MVP | Tayyor | Kichik |
| GEN-08 | Xato bo'lgan ekranni o'z joyidan qayta urinish | MVP | Tayyor | Kichik |
| CHAT-01 | messages jadvali: suhbat saqlanadi | MVP | Tayyor | O'rta |
| CHAT-02 | Agent javobi kodda yoziladi (LLM'siz) | MVP | Tayyor | Kichik |
| CHAT-03 | Ekran chipi / ro'yxatdan tanlash — kanvas o'sha kadrga boradi | MVP | Tayyor | Kichik |
| CHAT-04 | Xabarda "shundan oldingi holatga qayt" | MVP | Tayyor | O'rta |
| CHAT-05 | Jarayon va Stop tugmasi; kirish maydoni ochiq qoladi | MVP | Tayyor | Kichik |
| GEN-09 | Tushunarli generatsiya xatolari | MVP | Tayyor | Kichik |
| CHAT-06 | Xato — suhbatda, sababi va "Qayta urinish" bilan | MVP | Tayyor | Kichik |
| CHAT-07 | Agent jurnali (ochiladigan) | MVP | Tayyor | O'rta |
| CHAT-08 | Keyingi qadam takliflari, kodda | MVP | Tayyor | Kichik |
| EDT-23 | Har mazmunli element tanlanadi | MVP | Tayyor | O'rta |
| EDT-24 | Tugmasiz tanlash: ekran → element → Esc | MVP | Tayyor | O'rta |
| EDT-17 | Element yonida suzuvchi "AI bilan tahrirlash" paneli | MVP | Tayyor | O'rta |
| EDT-25 | Matnni joyida tahrirlash, LLM'siz | MVP | Tayyor | O'rta |
| EDT-26 | Tezkor amallar LLM'siz: o'chirish, nusxalash, surish, boshqa rasm | MVP | Tayyor | O'rta |
| EDT-18 | Niyat yo'naltirgich: ekran qo'shish / tahrir / element / tema | MVP | Tayyor | O'rta |
| EDT-19 | To'liq ekran tahriri butun HTML'ni qayta yozmaydi | MVP | Tayyor | O'rta |
| EDT-09 | Kadr ustida versiya strelkalari va asboblar | MVP | Tayyor | O'rta |
| EDT-12 | Bekor qilish va qaytarish (undo/redo) | MVP | Tayyor | O'rta |
| EDT-11 | Canvas'da tanlash va qo'l asboblari | MVP | Tayyor | Kichik |
| EDT-27 | Kadr faqat sarlavhadagi tutqichdan sudraladi | MVP | Tayyor | Kichik |
| EDT-28 | Klaviatura yorliqlari | MVP | Tayyor | Kichik |
| EDT-29 | Enter — yuborish, Shift+Enter — yangi qator | MVP | Tayyor | Kichik |
| EDT-30 | Bir nechta ekranni tanlash | MVP | Tayyor | O'rta |
| EDT-31 | Chat chapga; tablar Chat / Theme; Jury va History UI'dan olinadi | MVP | Tayyor | O'rta |
| EDT-10 | Yuqori panelda yo'l ko'rsatkich | MVP | Tayyor | Kichik |
| EDT-32 | Yuqori panel: Preview · Share · Export menyusi; o'chirish ⋯ ichida | MVP | Tayyor | Kichik |
| EXP-03 | Butun ilovani zip qilib yuklab olish (tema bilan) | MVP | Tayyor | O'rta |
| THM-08 | Kanvasda dizayn tizimi namunasi | MVP | Tayyor | O'rta |

## B1 · Hisoblar

| ID | Vazifa | Modul / Submodul | Doira | Holat | Hajmi | Bog'liq | Tayyor mezoni |
|---|---|---|---|---|---|---|---|
| AUTH-01 | Kirish usullarini tanlash | Kirish va hisoblar / Qarorlar | MVP | Tayyor | Kichik |  | Usullar tanlangan va shu yerda yozilgan |
| AUTH-02 | Better Auth ni Drizzle SQLite bilan o'rnatish | Kirish va hisoblar / O'rnatish | MVP | Tayyor | O'rta | AUTH-01 | Migratsiya user/session/account/verification jadvallarini yaratadi; /api/auth/* ishlaydi |
| AUTH-03 | Google orqali kirish | Kirish va hisoblar / Kirish usullari | MVP | Jarayonda | Kichik | AUTH-02 | Yangi va qaytgan Google foydalanuvchilari bosh sahifaga tushadi |
| AUTH-04 | Emailga sehrli havola orqali kirish | Kirish va hisoblar / Kirish usullari | MVP | Bloklangan | O'rta | AUTH-02, EML-01 | Havola keladi, bir marta ishlaydi, muddati tugaydi |
| AUTH-05 | Kirish sahifasi va chiqish | Kirish va hisoblar / Interfeys | MVP | Tayyor | Kichik | AUTH-03 | Kirmagan odam kirish sahifasini ko'radi; chiqish sessiyani o'chiradi |
| AUTH-06 | Server funksiyalari uchun requireUser() yordamchisi | Kirish va hisoblar / Sessiya | MVP | Tayyor | Kichik | AUTH-02 | Har controller foydalanuvchini bitta yordamchidan oladi; kirmaganlarga 401 |
| AUTH-07 | Bosh sahifa, muharrir va ko'rishni himoyalash | Kirish va hisoblar / Sessiya | MVP | Tayyor | Kichik | AUTH-06 | Kirmagan odam /, /p/:id, /preview/:id dan kirish sahifasiga yo'naltiriladi |
| AUTH-08 | Hisob menyusi (ism, rasm, chiqish) | Kirish va hisoblar / Interfeys | MVP | Tayyor | Kichik | AUTH-05 | Bosh sahifa va muharrirda ko'rinadi |
| AUTH-09 | Hisobni va barcha ma'lumotlarini o'chirish | Kirish va hisoblar / Hisob | MVP | Tayyor | Kichik | OWN-02 | Loyihalar, ekranlar, versiyalar, kreditlar va sessiyalar o'chadi |
| OWN-01 | projects jadvaliga user_id ustuni va migratsiya | Egalik / Sxema | MVP | Tayyor | Kichik | AUTH-02 | 0008 migratsiyasi foreign key bilan ustun qo'shadi |
| OWN-02 | Har loyiha va ekran so'rovini joriy foydalanuvchi bilan cheklash | Egalik / Kirish nazorati | MVP | Tayyor | O'rta | OWN-01, AUTH-06 | Boshqa foydalanuvchining loyiha ID si har server funksiyasida 404 qaytaradi |
| OWN-03 | /api/generate va /api/generate-plan da egalikni tekshirish | Egalik / Kirish nazorati | MVP | Tayyor | Kichik | OWN-02 | Birovning loyihasiga generatsiya 404 qaytaradi |
| OWN-04 | Ko'rish sahifasi faqat egaga (ommaviy ulashish chiqquncha) | Egalik / Kirish nazorati | MVP | Tayyor | Kichik | OWN-02 | Kirmagan yoki boshqa foydalanuvchiga ko'rish yopiq |
| OWN-05 | Mavjud lokal loyihalarni birinchi hisobga biriktirish | Egalik / Ko'chirish | MVP | Tayyor | Kichik | OWN-01 | Yangilangandan keyin egasiz loyiha qolmaydi |

## B2 · Xavfsizlik va limitlar

| ID | Vazifa | Modul / Submodul | Doira | Holat | Hajmi | Bog'liq | Tayyor mezoni |
|---|---|---|---|---|---|---|---|
| SEC-01 | POST API'larda saytning o'zidan kelganini tekshirish | Xavfsizlik / So'rovlar | MVP | Tayyor | Kichik |  | Boshqa saytdan /api/* ga POST rad etiladi |
| SEC-02 | Har server funksiyasida kiruvchi ma'lumotni tekshirish | Xavfsizlik / So'rovlar | MVP | Tayyor | Kichik | OWN-02 | Turlar, uzunliklar va ID lar har chegarada tekshiriladi |
| SEC-03 | Generatsiya HTML i sandbox ichida qoladi (allow-same-origin hech qachon) | Xavfsizlik / Render | MVP | Tayyor | Kichik |  | Test har iframe'dagi sandbox atributini tekshiradi |
| SEC-04 | Maxfiy kalitlar faqat serverda; brauzer kodini tekshirish | Xavfsizlik / Maxfiy kalitlar | MVP | Tayyor | Kichik |  | Yig'ilgan brauzer fayllarida hech qanday kalit yo'q |
| LIM-01 | Generatsiya uchun foydalanuvchiga so'rovlar limiti | Limitlar va xarajat / So'rov chegarasi | MVP | Tayyor | O'rta | AUTH-06 | Ortiqcha so'rov 429 va kutish vaqtini oladi |
| LIM-02 | Bir vaqtda faqat bitta generatsiya | Limitlar va xarajat / So'rov chegarasi | MVP | Tayyor | Kichik | AUTH-06 | Biri ishlayotganda ikkinchisi rad etiladi |
| LIM-03 | Kunlik umumiy LLM xarajati chegarasi (to'xtatish tugmasi) | Limitlar va xarajat / Xarajat nazorati | MVP | Tayyor | Kichik | OBS-01 | Chegara tugasa generatsiya aniq xabar bilan to'xtaydi |
| LIM-04 | Foydalanuvchi uzilsa LLM oqimini to'xtatish | Limitlar va xarajat / Xarajat nazorati | MVP | Tayyor | Kichik |  | Tab yopilsa token sarfi to'xtaydi |
| OBS-01 | Har LLM chaqiruvi yoziladi (foydalanuvchi, loyiha, token, narx, vaqt, natija) | Monitoring / LLM xarajati | MVP | Tayyor | O'rta | AUTH-06 | Bitta so'rov "bu foydalanuvchi bu oy qanchaga tushdi" ga javob beradi |

## B3 · Mahsulotni sayqallash

| ID | Vazifa | Modul / Submodul | Doira | Holat | Hajmi | Bog'liq | Tayyor mezoni |
|---|---|---|---|---|---|---|---|
| EDT-15 | Kadr balandligi kontent bo'yicha o'lchanadi | Muharrir / Kanvas | MVP | Tayyor | O'rta | EDT-01 | Uzun ekran kanvasda to'liq ko'rinadi; balandlikni iframe o'zi xabar qiladi va bazada saqlanadi |
| THM-02 | To'liq rang palitrasi (fon, matn, ikkinchi rang, karta, chegara) | Tema / Tema | MVP | Tayyor | O'rta |  | To'liq token ro'yxati tahrirlanadi va har o'zgarish barcha kadrlarda darhol ko'rinadi |
| THM-03 | Radius slayderi va Round/Squircle shakli | Tema / Tema | MVP | Tayyor | Kichik |  | Radius slayderi uzluksiz ishlaydi; Squircle Safari va Firefox’da zaxira orqali silliq ko‘rinadi |
| DSH-09 | Qorong'u rejim | Bosh sahifa / Interfeys | MVP | Tayyor | Kichik |  | Tugma rejimni almashtiradi, tanlov eslab qolinadi va sahifa yuklanganda miltillamaydi |
| DSH-10 | Bosh sahifa qobig'i: yon panel va hisob menyusi | Bosh sahifa / Bosh sahifa | MVP | Tayyor | O'rta |  | Yon panelli qobiq, pastda hisob menyusi; tor ekranda yon panel yig'iladi |
| DSH-04 | Loyiha kartasi: bosh harflar va "N kun oldin yaratilgan" | Bosh sahifa / Loyihalar | MVP | Tayyor | Kichik |  | Bo'sh joy yo'qoladi |
| DSH-05 | Loyihalarni qidirish | Bosh sahifa / Loyihalar | MVP | Tayyor | Kichik |  | Yozish bilan ro'yxat nom bo'yicha filtrlanadi |
| DSH-03 | Ilhom kartalari (tavsifni to'ldiradigan uslubli boshlang'ichlar) | Bosh sahifa / Bosh sahifa | MVP | Tayyor | Kichik |  | 4–6 ta karta, har biri tavsif va dizayn tizimini qo'yadi |
| DSH-06 | Birinchi kirishdagi bo'sh holat | Bosh sahifa / Birinchi tanishuv | MVP | Tayyor | Kichik | DSH-03 | Yangi foydalanuvchi ilhom kartalari va bir qatorli tushuntirishni ko'radi |
| SHR-02 | Loyiha ko'rinishi uchun ommaviy ulashish havolasi | Ko'rish va ulashish / Ulashish | MVP | Rejada | O'rta | OWN-04 | Ega ulashishni yoqadi; taxmin qilib bo'lmaydigan havola bilan har kim faqat ko'radi |

## B4 · Pul ishlash

| ID | Vazifa | Modul / Submodul | Doira | Holat | Hajmi | Bog'liq | Tayyor mezoni |
|---|---|---|---|---|---|---|---|
| BIL-01 | To'lov provayderini tanlash: Lemon Squeezy yoki Polar | To'lov va kreditlar / Qarorlar | MVP | Rejada | Kichik |  | Provayder tanlangan, hisob ochilgan |
| BIL-02 | Narxlar: tariflar, kredit hajmi, bepul kredit | To'lov va kreditlar / Qarorlar | MVP | Rejada | Kichik | OBS-01 | Raqamlar shu yerda, haqiqiy xarajat ma'lumotiga asoslangan |
| BIL-03 | Do'kon uchun arizani erta topshirish | To'lov va kreditlar / To'lovlar | MVP | Rejada | Kichik | BIL-01, LEG-01 | Do'kon haqiqiy to'lovlar uchun tasdiqlangan |
| BIL-04 | Kreditlar daftari (berilgan, sarflangan, qaytarilgan; balans = yig'indi) | To'lov va kreditlar / Kreditlar | MVP | Rejada | O'rta | AUTH-02 | Balans o'zgaruvchan son emas, yozuvlardan hisoblanadi |
| BIL-05 | Har amal narxi (reja + ekran, tahrir, qism tahriri) | To'lov va kreditlar / Kreditlar | MVP | Rejada | Kichik | BIL-02 | Narxlar bitta sozlamada va testlangan |
| BIL-06 | Generatsiyadan oldin kreditni band qilish, xatoda qaytarish | To'lov va kreditlar / Kreditlar | MVP | Rejada | O'rta | BIL-04 | Xato yoki to'xtatilgan ekran kreditini qaytaradi; parallel so'rovda ikki marta yechilmaydi |
| BIL-07 | Ro'yxatdan o'tganda bepul kredit | To'lov va kreditlar / Kreditlar | MVP | Rejada | Kichik | BIL-04 | Yangi hisob bepul balans bilan boshlanadi |
| BIL-08 | Yuqori panelda kredit balansi va kredit tugaganda dialog | To'lov va kreditlar / Kredit interfeysi | MVP | Rejada | Kichik | BIL-04 | Har generatsiyadan keyin yangilanadi; nol bo'lsa tarif dialogi ochiladi |
| BIL-09 | Har foydalanuvchi uchun checkout | To'lov va kreditlar / To'lovlar | MVP | Rejada | O'rta | BIL-03 | Checkout foydalanuvchi ID sini olib boradi, webhook to'g'ri hisobga yozadi |
| BIL-10 | To'lov webhook: imzoni tekshirish, kreditni bir marta berish | To'lov va kreditlar / To'lovlar | MVP | Rejada | O'rta | BIL-09 | Qayta kelgan hodisa kreditni ikkinchi marta bermaydi; noto'g'ri imzo rad etiladi |
| BIL-11 | To'lovni boshqarish portali havolasi | To'lov va kreditlar / To'lovlar | MVP | Rejada | Kichik | BIL-09 | Havola foydalanuvchining provayder portalini ochadi |
| BIL-12 | Narxlar sahifasi | To'lov va kreditlar / To'lovlar | MVP | Rejada | Kichik | BIL-02 | Tariflar va kredit narxlari ko'rinadi; tugmalar checkout'ni ochadi |

## B5 · Serverga chiqarish

| ID | Vazifa | Modul / Submodul | Doira | Holat | Hajmi | Bog'liq | Tayyor mezoni |
|---|---|---|---|---|---|---|---|
| INF-02 | Hosting va production bazasini tanlash | Infratuzilma / Qarorlar | MVP | Rejada | Kichik |  | Tanlov shu yerda yozilgan |
| INF-03 | Production build ishlashi (vite build + server) | Infratuzilma / Yig'ish | MVP | Tayyor | Kichik |  | Yig'ilgan server NODE_ENV=production bilan lokal ishlaydi |
| INF-04 | Production sozlamalari va kalitlar | Infratuzilma / Sozlamalar | MVP | Rejada | Kichik | INF-02 | Barcha kalitlar serverda; repoda maxfiy narsa yo'q |
| INF-05 | Doimiy diskli serverga deploy | Infratuzilma / Hosting | MVP | Rejada | O'rta | INF-02, INF-03 | Ilova ochiladi; qayta deploy'da ma'lumot yo'qolmaydi |
| INF-06 | Domen va HTTPS | Infratuzilma / Hosting | MVP | Rejada | Kichik | INF-05 | O'z domenimiz HTTPS bilan ishlaydi |
| INF-07 | Bazaning avtomatik zaxirasi va sinalgan tiklash | Infratuzilma / Ma'lumot zaxirasi | MVP | Rejada | O'rta | INF-05 | Har kuni tashqi zaxira; tiklash bir marta sinab ko'rilgan |
| INF-08 | CI: har push'da npm run check va tsc | Infratuzilma / CI | MVP | Bloklangan | Kichik |  | GitHub Actions xatoli build'ni to'xtatadi |
| OBS-02 | Holat tekshiruvi va ishlash monitori | Monitoring / Ishlash nazorati | MVP | Rejada | Kichik | INF-05 | Sayt tushsa sizga xabar keladi |
| OBS-03 | Server va brauzer xatolarini kuzatish | Monitoring / Xatolar | MVP | Rejada | Kichik | INF-05 | Kutilmagan xatolar foydalanuvchi ID si bilan bitta panelga tushadi |
| OBS-04 | Asosiy hodisalar analitikasi | Monitoring / Analitika | MVP | Rejada | Kichik | INF-05 | Ro'yxatdan o'tish, birinchi generatsiya, ko'rish, ulashish, eksport, xarid sanaladi |
| OBS-05 | Foydalanuvchi xarajati bo'yicha admin sahifasi | Monitoring / LLM xarajati | MVP | Tayyor | Kichik | OBS-01 | Faqat admin ko'radi: foydalanuvchilar xarajat va kredit bo'yicha |
| EML-01 | Email provayderi va domen uchun SPF/DKIM | Email / O'rnatish | MVP | Rejada | Kichik | INF-06 | Kirish havolalari spam'ga emas, inbox'ga tushadi |
| LEG-01 | Foydalanish shartlari | Huquqiy va yordam / Siyosatlar | MVP | Rejada | Kichik |  | /terms da e'lon qilingan |
| LEG-02 | Maxfiylik siyosati | Huquqiy va yordam / Siyosatlar | MVP | Rejada | Kichik |  | /privacy da e'lon qilingan |
| LEG-03 | Pulni qaytarish siyosati | Huquqiy va yordam / Siyosatlar | MVP | Rejada | Kichik | BIL-02 | E'lon qilingan va narxlar sahifasidan havola bor |
| LEG-04 | Yordam uchun aloqa | Huquqiy va yordam / Yordam | MVP | Rejada | Kichik |  | Yordam emaili pastki qismda va hisob menyusida |
| MKT-01 | Landing sahifa: tavsif maydoni, galereya, narxlar, savol-javob | Marketing / Sayt | MVP | Jarayonda | O'rta | BIL-12 | Kirmagan mehmon mahsulotni kirishdan oldin ko'radi |
| MKT-02 | SEO va ijtimoiy tarmoq uchun rasm | Marketing / Sayt | MVP | Rejada | Kichik | MKT-01 | Telegram, X va LinkedIn'da havola chiroyli ko'rinadi |
| MKT-03 | Demo video yoki GIF | Marketing / Kontent | MVP | Rejada | Kichik |  | Bitta tavsifdan bosiladigan ilovagacha, bir daqiqadan kam |

## B6 · Beta va ishga tushirish

| ID | Vazifa | Modul / Submodul | Doira | Holat | Hajmi | Bog'liq | Tayyor mezoni |
|---|---|---|---|---|---|---|---|
| QA-01 | To'liq yo'l sinovi: ro'yxatdan o'tish → generatsiya → ko'rish → ulashish → eksport → xarid | Sinov / To'liq yo'l sinovi | MVP | Rejada | O'rta | BIL-10, SHR-02 | Production'da o'tadi |
| QA-02 | Yuklama sinovi: 10 ta parallel generatsiya | Sinov / Yuklama | MVP | Rejada | Kichik | LIM-02 | Kredit ikki marta yechilmaydi, server qulamaydi, xarajat kutilgancha |
| LCH-01 | 20–50 ta tanlangan foydalanuvchi bilan yopiq beta | Ishga tushirish / Beta | MVP | Rejada | Kichik | QA-01 | Shaxsiy takliflar yuborilgan |
| LCH-02 | Fikr bildirish kanali | Ishga tushirish / Beta | MVP | Rejada | Kichik |  | Ilova ichida forma yoki Telegram guruhga havola |
| LCH-03 | Beta muammolarini tuzatish, keyin ommaviy e'lon | Ishga tushirish / Ommaviy | MVP | Rejada | O'rta | LCH-01 | Betadagi to'siqlar tuzatilgan; ommaviy e'lon qilingan |

## B7 · MVP dan keyin

| ID | Vazifa | Modul / Submodul | Doira | Holat | Hajmi | Bog'liq | Tayyor mezoni |
|---|---|---|---|---|---|---|---|
| OWN-06 | Jamoalar va umumiy ish maydonlari | Egalik / Jamoa | Keyin | Rejada | Katta |  |  |
| SEC-05 | Ro'yxatdan o'tishda suiiste'mol: captcha yoki vaqtinchalik emailni bloklash | Xavfsizlik / Suiiste'mol | Keyin | Rejada | Kichik |  |  |
| SHR-03 | Ulashish havolasiga parol yoki muddat | Ko'rish va ulashish / Ulashish | Keyin | Rejada | Kichik | SHR-02 |  |
| BIL-13 | Jamoaviy to'lov va hisob-fakturalar | To'lov va kreditlar / To'lovlar | Keyin | Rejada | O'rta | OWN-06 |  |
| EML-02 | Xush kelibsiz xati | Email / Hayot sikli | Keyin | Rejada | Kichik | EML-01 |  |
| GEN-10 | Ekran holatlari: bo'sh, yuklanmoqda, xato | Generatsiya / Variantlar | Keyin | Rejada | O'rta |  |  |
| GEN-11 | Rasm yoki skrinshot orqali kirish | Generatsiya / Kirish ma'lumoti | Keyin | Rejada | O'rta |  |  |
| GEN-12 | Dizayn variantlari (har ekranga 2–3 yo'nalish) | Generatsiya / Variantlar | Keyin | Rejada | O'rta |  |  |
| GEN-13 | Planshet va moslashuvchan o'lchamlar | Generatsiya / Qurilmalar | Keyin | Rejada | O'rta |  |  |
| GEN-14 | Ilovaning qorong'i rejim varianti | Generatsiya / Variantlar | Keyin | Rejada | O'rta |  |  |
| GEN-15 | Kompyuter versiyasi uchun yon panel kod bilan | Generatsiya / Izchillik | Keyin | Rejada | O'rta |  |  |
| GEN-16 | Ovoz yoki uzun hujjat orqali kirish | Generatsiya / Kirish ma'lumoti | Bekor | Rejada |  |  |  |
| THM-04 | Tema versiyalari | Tema / Tema | Keyin | Rejada | O'rta |  |  |
| THM-05 | O'z dizayn tizimini import qilish (Figma o'zgaruvchilari / tokens.css) | Tema / Dizayn tizimlari | Keyin | Rejada | Katta |  |  |
| THM-06 | Model qo'lda yozgan ranglar ham temaga ergashsin | Tema / Tema | Keyin | Rejada | O'rta |  |  |
| THM-07 | Glassmorphism tizimini Liquid Glass darajasiga kuchaytirish | Tema / Tema | Keyin | Rejada | O'rta |  | glassmorphism tizimi blur, qirra yorug'ligi va sinish qoidalarini oladi; Safari va Firefox'da 1-qatlam buzilmasdan ishlaydi |
| DSH-07 | Dizayn tizimini nomlar ro'yxati o'rniga rasmli kartalardan tanlash | Bosh sahifa / Bosh sahifa | MVP | Tayyor | Kichik |  |  |
| DSH-08 | Sevimlilar va grid/ro'yxat almashtirgich | Bosh sahifa / Loyihalar | MVP | Tayyor | Kichik |  |  |
| DSH-11 | Loyiha kartasida birinchi ekranning jonli kichik rasmi | Bosh sahifa / Loyihalar | MVP | Tayyor | Kichik |  |  |
| DSH-12 | Kunlik limit ko'rsatkichi yon panelda | Bosh sahifa / Bosh sahifa | MVP | Tayyor | Kichik |  |  |
| ADM-01 | Admin: kirish huquqi va qobiq | Monitoring / Kirish nazorati | MVP | Tayyor | O'rta |  | docs/ADMIN-PLAN.md |
| ADM-02 | Admin: Overview — KPI, grafiklar, aktivatsiya | Monitoring / Analitika | MVP | Tayyor | O'rta | ADM-01 | docs/ADMIN-PLAN.md |
| ADM-03 | Admin: foydalanuvchilar jadvali va sahifasi | Monitoring / Analitika | MVP | Tayyor | O'rta | ADM-01 | docs/ADMIN-PLAN.md |
| ADM-04 | Admin: bloklash, sessiyalar, rol, alohida limit | Monitoring / Kirish nazorati | MVP | Tayyor | Kichik | ADM-03 | docs/ADMIN-PLAN.md |
| ADM-05 | Admin: hamma loyihalar, faqat o'qish | Monitoring / Ko'rish | MVP | Tayyor | Kichik | ADM-01 | docs/ADMIN-PLAN.md |
| ADM-06 | Admin: generatsiyalar jurnali va xatolar | Monitoring / Xatolar | MVP | Tayyor | O'rta | ADM-01 | docs/ADMIN-PLAN.md |
| ADM-07 | Admin: feedback galereyasi va juftliklar eksporti | Monitoring / Sifat | MVP | Tayyor | Kichik | ADM-01 | docs/ADMIN-PLAN.md |
| ADM-08 | Admin: pauza, limitlar va byudjet — bazadagi sozlamalar | Monitoring / Xarajat nazorati | MVP | Tayyor | Kichik | ADM-01 | docs/ADMIN-PLAN.md |
| EXP-04 | PNG eksport | Eksport / Fayllar | Keyin | Rejada | O'rta |  |  |
| EXP-05 | Figma eksport | Eksport / Integratsiyalar | Keyin | Rejada | Katta |  |  |
| EXP-06 | React yoki boshqa framework kodiga eksport | Eksport / Integratsiyalar | Bekor | Rejada |  |  |  |
| INF-09 | Tab–ekran bog'lanishi saqlanmagan eski loyihalarni tuzatish | Infratuzilma / Ma'lumotlar bazasi | Keyin | Rejada | Kichik |  |  |
| QA-03 | To'liq avtomatlashtirilgan brauzer testlari | Sinov / To'liq yo'l sinovi | Keyin | Rejada | O'rta | QA-01 |  |
| AGT-01 | Agentlar dizayn yaratishi uchun MCP server va API kalitlar | Agentlar uchun kirish / MCP | Keyin | Rejada | Katta | AUTH-02, BIL-04 |  |
| HIG-04 | Loyihada platforma tanlovi: iOS / Android | Generatsiya / Qurilmalar | Keyin | Rejada | O'rta |  |  |
| FB-03 | Yoqqan ekranlar few-shot kutubxonasiga ko'tariladi | Generatsiya / Sifat | Keyin | Rejada | O'rta | FB-01 |  |
| FB-04 | Juftliklardan reward model / fine-tune | Generatsiya / Sifat | Keyin | Rejada | Katta | FB-02 |  |

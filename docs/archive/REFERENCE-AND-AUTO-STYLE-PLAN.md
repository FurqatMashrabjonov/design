# Boshlash qutisiga rasm, va uslub tanlovini olib tashlash — reja

> Yozilgan: 2026-09-23. Ikki talab: (1) dashboard/landing qutisiga ham rasm biriktirish, (2) dizayn tizimini foydalanuvchiga tanlatmaslik — Sleek va Stitch shunday qiladi.

## 1. Boshlash qutisiga rasm — lekin LLM-02 dagidek emas

LLM-02 da rasm **bitta so'rovga** biriktiriladi: bitta ekranni tahrirlash. Boshlash qutisi boshqacha — u **7+ chaqiruvli reja runini** boshlaydi.

Rasmni har ekran chaqiruviga qo'shib bo'lmaydi:
- rasm har safar prompt tokeni sifatida to'lanadi va **hech qachon kesh hiti bo'lmaydi**;
- 6 ekran × ~350–2000 token = har ilovada ortiqcha sarf;
- va bu arxitektura qoidamizga zid: parallel chaqiruvlar mustaqil namunalar, "hammasi bir rasmni bir xil tushunadi" degan umid — aynan biz tark etgan yondashuv.

**Yechim: rasm bir marta o'qiladi, matnga aylanadi, matn hamma ekranga boradi.**

### IMG-01 · Rasmdan badiiy yo'nalish (0.5 kun)

1. Boshlash qutisiga qisqich qo'shiladi (`PromptBox attachments` — kod allaqachon bor, faqat yoqish va `createProject` ga uzatish).
2. Reja boshlanishidan oldin **bitta vision chaqiruvi**: rasmdan qisqa yo'nalish matni chiqariladi — tartib, bo'shliq ritmi, tipografika miqyosi, kayfiyat, kartami yoki ro'yxat, rasm qanday ishlatilgan. Brend nomi, matn va aniq ranglar **olinmaydi**.
3. Natija loyihaga saqlanadi (`projects.plan` ichida yoki alohida ustun) va `artBlock` orqali **har ekran briefiga matn sifatida** qo'shiladi — xuddi hozirgi `artDirection` kabi.
4. Rasm shundan keyin tashlanadi: saqlanmaydi, modelga qayta yuborilmaydi.

**Narxi:** ilovaga bitta qo'shimcha chaqiruv (~350 kirish + ~250 chiqish ≈ $0.0002). Har ekranga rasm biriktirishdan **10–20 barobar arzon** va natijasi izchilroq.

**Tayyor mezoni:** rasm biriktirilgan ilovaning hamma ekrani bitta yo'nalishga bo'ysunadi; rasmdagi brend nomi yoki matni ekranga tushmaydi; rasmsiz oqim o'zgarmaydi.

## 2. Uslub tanlovini olib tashlash

Hozir qutida `Auto` + 33 ta tizim kartasi bor. Sleek'da ham, Stitch'da ham bunday tanlov yo'q — ular o'zi qaror qiladi.

**Lekin avval bitta narsani tuzatish kerak**, aks holda avtomatik tanlov tanlovdan yomonroq bo'ladi. O'lchanган fakt:

- `BY_APP_TYPE` da **12 ta ilova turiga 12 ta qat'iy tizim** bog'langan. Ya'ni har "habit tracker" **doim `notion`** oladi, har "food delivery" **doim `airbnb`**.
- 33 tizimdan **21 tasi avtomatik tanlovda hech qachon chiqmaydi** — faqat foydalanuvchi o'zi tanlasa.

Tanlovni olib tashlasak, bu holatda mahsulot bir xil ko'rinadigan bo'lib qoladi.

### DS-01 · Avtomatik tanlov nomzodlar ro'yxatidan bo'lsin (0.3 kun)

`BY_APP_TYPE` bitta qiymat emas, **3–4 nomzod** qaytaradi; loyiha id'sidan urug'lanib bittasi tanlanadi — xuddi `artDirection` va `navStyle` kabi. Masalan `productivity → notion | linear-app | cal | bento`, `fitness → nike | midnight | bento`.

Brief uslub so'zini aytsa (`STYLE_WORDS`) — u baribir ustun turadi.

**Tayyor mezoni:** bir xil brief bilan ikki loyiha turli tizim oladi; 33 tizimdan kamida 25 tasi avtomatik tanlovga kira oladi; briefdagi uslub so'zi hamon yutadi.

### DS-02 · Tanlov qutidan olinadi (0.2 kun)

`SystemPicker` boshlash qutisidan olib tashlanadi; `createProject` doim `auto` oladi. Tanlov **yo'qolmaydi** — Tema panelida qoladi, ya'ni odam natijani ko'rgach almashtira oladi. Bu Sleek'ning yo'li: avval natija, keyin sozlash.

**Tayyor mezoni:** qutida uslub tanlovi yo'q; loyiha yaratilgach Tema panelida tizim ko'rinadi va almashtirilishi mumkin.

## 3. Tartib va narx

| | Ish | Vaqt | Narx |
|---|---|---|---|
| 1 | **DS-01** nomzodlar ro'yxati | 0.3 kun | 0 |
| 2 | **DS-02** qutidan tanlovni olish | 0.2 kun | 0 |
| 3 | **IMG-01** rasmdan yo'nalish | 0.5 kun | ilovaga ~$0.0002 |

DS-01 birinchi: tanlovni olib tashlashdan **oldin** avtomatik tanlov yaxshi bo'lishi kerak. Tekshiruv — 4 briefli eval (~$0.11), bir xil brief ikki marta: turli tizim chiqishi ko'rinadi.

## 4. Qilinmaydi

- Rasmni har ekran chaqiruviga biriktirish — qimmat va izchilligi past.
- Rasmni saqlash — bizga u kerak emas, matn yetarli; saqlash maxfiylik va joy masalasi qo'shadi.
- Tanlovni butunlay yo'q qilish — Tema panelida qoladi, aks holda foydalanuvchi qamalib qoladi.

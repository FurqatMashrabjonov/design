// The people, date and money an app's screens are populated with, chosen in code.
// Left to the model, the signed-in user was "Maya Chen" in three unrelated apps, and each screen
// of one app could pick a different one. Everything here is a pure function of (projectId, locale, day),
// so every screen of a project — including one added weeks later — gets the same cast.

export type Locale = 'en' | 'uz' | 'ru'

const NAMES: Record<Locale, { first: string[]; last: string[] }> = {
  en: {
    first: ['Amara', 'Jonas', 'Priya', 'Mateo', 'Ingrid', 'Kofi', 'Leila', 'Tomás', 'Nadia', 'Elliot', 'Yuki', 'Rafael', 'Zainab', 'Oskar', 'Camille', 'Dev', 'Hana', 'Marcus', 'Sofia', 'Idris', 'Freya', 'Andre', 'Mei', 'Callum', 'Noor', 'Luca', 'Anika', 'Theo', 'Ximena', 'Bram'],
    last: ['Okafor', 'Lindqvist', 'Raman', 'Herrera', 'Novak', 'Mensah', 'Haddad', 'Silva', 'Petrov', 'Brennan', 'Tanaka', 'Moreau', 'Farouk', 'Bergström', 'Dubois', 'Kapoor', 'Sato', 'Whitfield', 'Rossi', 'Bello', 'Aldana', 'Costa', 'Lindahl', 'Reyes', 'Nasser', 'Marino', 'Varga', 'Ashby', 'Quint', 'Vos'],
  },
  uz: {
    first: ['Dilnoza', 'Jasur', 'Madina', 'Sardor', 'Nigora', 'Bekzod', 'Shahzoda', 'Otabek', 'Gulnora', 'Azizbek', 'Malika', 'Ulugʻbek', 'Zarina', 'Doniyor', 'Sevara', 'Farrux', 'Kamola', 'Sherzod', 'Nodira', 'Javohir'],
    last: ['Karimov', 'Yusupov', 'Rahimov', 'Toshmatov', 'Abdullayev', 'Ismoilov', 'Nazarov', 'Qodirov', 'Sobirov', 'Ergashev', 'Mirzayev', 'Usmonov', 'Xolmatov', 'Saidov', 'Tursunov'],
  },
  ru: {
    first: ['Анна', 'Дмитрий', 'Екатерина', 'Артём', 'Мария', 'Иван', 'Ольга', 'Никита', 'Алина', 'Павел', 'Дарья', 'Роман', 'Вера', 'Кирилл', 'Полина', 'Тимур', 'Юлия', 'Глеб', 'Софья', 'Егор'],
    last: ['Соколов', 'Кузнецов', 'Орлов', 'Белов', 'Громов', 'Лебедев', 'Зайцев', 'Волков', 'Морозов', 'Егоров', 'Никитин', 'Фролов', 'Тарасов', 'Климов', 'Ершов'],
  },
}

const PLACE: Record<Locale, { cities: string[]; money: string; dateLocale: string }> = {
  en: { cities: ['Lisbon', 'Toronto', 'Melbourne', 'Austin', 'Copenhagen', 'Cape Town', 'Dublin', 'Portland'], money: 'US dollars, written like $24.50', dateLocale: 'en-US' },
  uz: { cities: ['Toshkent', 'Samarqand', 'Buxoro', 'Andijon', 'Namangan', 'Fargʻona'], money: "Uzbek so'm, written like 45 000 so'm (everyday prices run from thousands to millions)", dateLocale: 'uz-UZ' },
  ru: { cities: ['Москва', 'Санкт-Петербург', 'Казань', 'Екатеринбург', 'Новосибирск'], money: 'рубли, в формате 1 490 ₽', dateLocale: 'ru-RU' },
}

/** Cyrillic means Russian; Uzbek (Latin) is recognised by a handful of words no English brief contains. */
export function localeOf(text: string): Locale {
  if (/[а-яё]{3,}/i.test(text)) return 'ru'
  if (/(?<![\w])(ilova|ilovasi|uchun|tilida|sahifa|sahifasi|bo.yicha|o.zbek|qo.sh|to.lov)(?![\w])/i.test(text)) return 'uz'
  return 'en'
}

// FNV-1a: small, stable across runtimes, good enough to spread ids over a few dozen names.
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

// Russian and Uzbek surnames take a feminine ending; first names ending in -a/-я are treated as feminine.
function surnameFor(first: string, last: string, locale: Locale): string {
  if (locale === 'en' || !/[aаяAАЯ]$/.test(first)) return last
  return locale === 'ru' ? `${last}а` : `${last}a`
}

export type ContentSeed = { user: { name: string; initials: string; email: string; city: string }; people: string[]; today: string; money: string; locale: Locale }

export function contentSeed(projectId: string, locale: Locale, now = new Date()): ContentSeed {
  const pool = NAMES[locale]
  const person = (n: number) => {
    const first = pool.first[hash(`${projectId}:f:${n}`) % pool.first.length]
    return `${first} ${surnameFor(first, pool.last[hash(`${projectId}:l:${n}`) % pool.last.length], locale)}`
  }
  // n = 0 is the signed-in user; the cast is the next distinct names.
  const name = person(0)
  const people: string[] = []
  for (let n = 1; people.length < 6 && n < 40; n++) {
    const p = person(n)
    if (p !== name && !people.includes(p)) people.push(p)
  }
  const ascii = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z ]/g, '')
    .trim()
  const place = PLACE[locale]
  return {
    user: {
      name,
      initials: name.split(' ').map((w) => w[0]).join('').toUpperCase(),
      email: `${ascii ? ascii.replace(/ +/g, '.') : `user${hash(projectId) % 900 + 100}`}@gmail.com`,
      city: place.cities[hash(`${projectId}:c`) % place.cities.length],
    },
    people,
    today: new Intl.DateTimeFormat(place.dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now),
    money: place.money,
    locale,
  }
}

export function contentBlock(seed: ContentSeed): string {
  return `# APP CONTENT — identical on every screen of this app
Signed-in user: ${seed.user.name} (initials ${seed.user.initials}), ${seed.user.email}, ${seed.user.city}.
Other people who appear (friends, senders, reviewers, leaderboards) — use these, in this order, before inventing anyone: ${seed.people.join(', ')}.
Today is ${seed.today}; every date and timestamp on the screen is consistent with it.
Money: ${seed.money}.
Never use another name for the signed-in user, and never the stock names (Maya Chen, Sarah Chen, Alex Johnson, John Doe, Jane Doe).`
}

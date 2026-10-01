// The landing's examples (2026-10-01): ten prompts in eval/showcase-briefs.json drawn through the real pipeline on
// Claude Opus 5.5 (eval --label showcase-opus), pictured at 2x on an iPhone 18 Pro Max's viewport (440×956) with its safe areas, and shown
// in the studio's DeviceFrame. Nothing retouched; a screen that came out broken is left out rather than fixed (4 of 69), and one app
// (a sneaker store whose photos were wrong) is not shown. Pictures: public/examples/<id>/<slug>.jpg (880×1912) and
// sm/<slug>.jpg (440 wide) for the cards; the source of each screen is in docs/showcase/<id>/.
/** `dark`: the app is drawn dark (a midnight style), so the phone's status bar is white on it. */
export type Example = { id: string; name: string; prompt: string; dark: boolean; screens: { slug: string; name: string }[] }

// Raise when the pictures are re-made: Cloudflare and browsers keep /examples for hours, so a new picture needs a new URL.
const SHOTS_VERSION = 3
export const exampleShot = (id: string, slug: string, size: 'sm' | 'full' = 'full') => `/examples/${id}/${size === 'sm' ? 'sm/' : ''}${slug}.jpg?v=${SHOTS_VERSION}`

export const EXAMPLES: Example[] = [
  {
    "id": "run",
    "dark": false,
    "name": "Stride Half",
    "prompt": "A running coach app for people training for their first half marathon. Screens: Today (this week's training plan as a progress ring, today's workout card with distance, pace target and a big Start button), Live Run (a map with the route, elapsed time, distance and current pace in huge numbers, pause and finish), Run Summary (route map, splits per kilometre as a bar chart, heart-rate zones, a personal-best badge), Training Plan (16 weeks, each week's runs ticked off), Progress (weekly distance chart, longest run, average pace trend), Profile with shoes mileage and settings. Energetic but clean, like Nike Run Club meets Strava. Sample runner: Maya, 32, Lisbon, goal 2:05:00 on 14 March.",
    "screens": [
      {
        "slug": "today",
        "name": "Today"
      },
      {
        "slug": "live-run",
        "name": "Live run"
      },
      {
        "slug": "run-summary",
        "name": "Run summary"
      },
      {
        "slug": "training-plan",
        "name": "Training plan"
      },
      {
        "slug": "progress",
        "name": "Progress"
      },
      {
        "slug": "profile",
        "name": "Profile"
      },
      {
        "slug": "onboarding",
        "name": "Welcome"
      }
    ]
  },
  {
    "id": "money",
    "dark": false,
    "name": "Atelier Bank",
    "prompt": "A personal neobank for freelancers. Screens: Home (total balance, two cards — a coral virtual card and a black metal card — and the latest transactions with merchant logos), Card detail (card art, freeze toggle, spending limit, PIN), Send money (recent contacts as avatars, amount keypad, a note), Insights (spending by category as a donut, this month vs last month, top merchants), Invoices (paid, pending, overdue with client names and amounts, create invoice button), Transaction detail with map and receipt. Premium and calm, like Revolut and Monzo. Currency EUR, owner Lucas Moreau, designer in Paris.",
    "screens": [
      {
        "slug": "home",
        "name": "Home"
      },
      {
        "slug": "card-detail",
        "name": "Card"
      },
      {
        "slug": "insights",
        "name": "Insights"
      },
      {
        "slug": "send-money",
        "name": "Send money"
      },
      {
        "slug": "invoices",
        "name": "Invoices"
      },
      {
        "slug": "transaction-detail",
        "name": "Transaction"
      },
      {
        "slug": "profile",
        "name": "Profile"
      },
      {
        "slug": "onboarding",
        "name": "Welcome"
      }
    ]
  },
  {
    "id": "stay",
    "dark": false,
    "name": "Hideaway",
    "prompt": "A boutique travel booking app for unique stays (cabins, villas, treehouses). Screens: Explore (search bar with where/when/who, category icons, big photo cards of stays with price per night, rating and a heart), Stay detail (photo gallery, host, amenities grid, location map, reviews with stars, sticky price and Reserve button), Date & guests picker (calendar with selected range, adult/child steppers), Checkout (summary card, price breakdown, payment method, Confirm), Trips (upcoming trip with countdown and past trips), Wishlists (saved collections with cover photos), Profile. Airy, photographic, editorial like Airbnb. Sample stays in Lofoten, Tuscany, Bali and the Swiss Alps.",
    "screens": [
      {
        "slug": "onboarding",
        "name": "Welcome"
      },
      {
        "slug": "trips",
        "name": "Trips"
      },
      {
        "slug": "wishlists",
        "name": "Wishlists"
      },
      {
        "slug": "date-guests",
        "name": "Dates & guests"
      },
      {
        "slug": "checkout",
        "name": "Checkout"
      },
      {
        "slug": "profile",
        "name": "Profile"
      }
    ]
  },
  {
    "id": "calm",
    "dark": false,
    "name": "Hushwell",
    "prompt": "A meditation and sleep app. Screens: Welcome onboarding (one calm illustration and a question about the user's goal: stress, sleep or focus), Today (greeting by time of day, a recommended session card with duration, a 'mood check-in' row of five moods, streak), Player (large artwork, title, guide name, a progress ring timer, play/pause, 15-second skip, ambient sound toggle), Library (categories: Sleep, Anxiety, Focus, Breathing; session cards with durations), Sleep stories (night theme, story cards with narrators), Stats (minutes this week as a bar chart, longest streak, mood trend), Profile. Soft, slow and quiet like Calm and Headspace, a dark night look for sleep.",
    "screens": [
      {
        "slug": "today",
        "name": "Today"
      },
      {
        "slug": "player",
        "name": "Player"
      },
      {
        "slug": "sleep-stories",
        "name": "Sleep stories"
      },
      {
        "slug": "library",
        "name": "Library"
      },
      {
        "slug": "stats",
        "name": "Stats"
      },
      {
        "slug": "profile",
        "name": "Profile"
      },
      {
        "slug": "welcome",
        "name": "Welcome"
      }
    ]
  },
  {
    "id": "lingo",
    "dark": false,
    "name": "Charlo",
    "prompt": "A playful language learning app for Spanish. Screens: Onboarding (pick a language with flags, daily goal 5/10/20 minutes), Learning path (a winding path of lesson nodes by unit, current node glowing, completed ones with crowns), Lesson (multiple-choice question with a picture and four answer tiles, progress bar, hearts), Lesson result (XP earned, accuracy, streak flame, confetti), Leaderboard (weekly league with avatars, XP and promotion zone), Vocabulary (words learned with strength meters, practice button), Profile with achievements. Bright, game-like and friendly like Duolingo. Learner: Aziz, 21-day streak, 1 840 XP, Gold league.",
    "screens": [
      {
        "slug": "learning-path",
        "name": "Learning path"
      },
      {
        "slug": "lesson",
        "name": "Lesson"
      },
      {
        "slug": "lesson-result",
        "name": "Lesson complete"
      },
      {
        "slug": "leaderboard",
        "name": "Leaderboard"
      },
      {
        "slug": "vocabulary",
        "name": "Vocabulary"
      },
      {
        "slug": "profile",
        "name": "Profile"
      },
      {
        "slug": "onboarding",
        "name": "Welcome"
      }
    ]
  },
  {
    "id": "pod",
    "dark": true,
    "name": "Lowtide",
    "prompt": "A podcast app. Screens: Home (continue listening row with progress bars, 'New episodes' from followed shows, curated 'Trending in Tech' and 'True crime' rows with square cover art), Now playing (large cover art, episode title and show, scrubber with chapters, playback speed, sleep timer, skip back 15 and forward 30), Show page (cover, description, follow button, episode list with durations and dates), Episode detail (show notes and chapters list), Search with categories grid, Library (followed shows, downloads, queue), Profile with listening stats. Rich, dark and immersive like Apple Podcasts and Spotify.",
    "screens": [
      {
        "slug": "home",
        "name": "Home"
      },
      {
        "slug": "now-playing",
        "name": "Now playing"
      },
      {
        "slug": "show-page",
        "name": "Show"
      },
      {
        "slug": "library",
        "name": "Library"
      },
      {
        "slug": "episode-detail",
        "name": "Episode"
      },
      {
        "slug": "search",
        "name": "Search"
      },
      {
        "slug": "profile",
        "name": "Profile"
      },
      {
        "slug": "onboarding",
        "name": "Welcome"
      }
    ]
  },
  {
    "id": "food",
    "dark": false,
    "name": "Kiezbite",
    "prompt": "A food delivery app focused on local restaurants. Screens: Home (delivery address, search, cuisine chips, a promo banner, 'Popular near you' restaurant cards with big food photos, rating, delivery time and fee), Restaurant (cover photo, rating, delivery info, menu sections with dish photos and prices, add buttons), Dish (large photo, options like size and extras, quantity, add to basket), Basket (items, promo code, fees, total, checkout), Live order tracking (map with the courier, steps from accepted to delivered, courier card with call button), Orders history, Profile. Appetising, warm, photo-led like Uber Eats and Deliveroo. City: Berlin, currency EUR.",
    "screens": [
      {
        "slug": "home",
        "name": "Home"
      },
      {
        "slug": "restaurant",
        "name": "Restaurant"
      },
      {
        "slug": "dish",
        "name": "Dish"
      },
      {
        "slug": "basket",
        "name": "Basket"
      },
      {
        "slug": "order-tracking",
        "name": "Order tracking"
      },
      {
        "slug": "orders",
        "name": "Orders"
      },
      {
        "slug": "profile",
        "name": "Profile"
      }
    ]
  },
  {
    "id": "plant",
    "dark": false,
    "name": "Leaflet",
    "prompt": "A plant care app for city apartments. Screens: My plants (a grid of the user's plants with photos, names and a water-due badge), Today (tasks: water the Monstera, mist the Calathea, rotate the Fiddle leaf fig — each with a checkbox and room), Plant detail (photo, species, light and humidity needs, watering schedule, growth photo timeline, care notes), Identify (camera viewfinder with a scan frame and a result card with confidence), Plant doctor (pick a symptom like yellow leaves and get a diagnosis with steps), Add plant flow, Profile with rooms (Living room, Bedroom, Balcony). Fresh, green and botanical like Planta and Greg.",
    "screens": [
      {
        "slug": "today",
        "name": "Today"
      },
      {
        "slug": "my-plants",
        "name": "My plants"
      },
      {
        "slug": "plant-detail",
        "name": "Plant"
      },
      {
        "slug": "identify",
        "name": "Identify"
      },
      {
        "slug": "plant-doctor",
        "name": "Plant doctor"
      },
      {
        "slug": "add-plant",
        "name": "Add plant"
      },
      {
        "slug": "profile",
        "name": "Profile"
      },
      {
        "slug": "onboarding",
        "name": "Welcome"
      }
    ]
  },
  {
    "id": "cook",
    "dark": false,
    "name": "Saffron & Sage",
    "prompt": "A recipe and weekly meal planning app. Screens: Discover (search, 'What's in your fridge' chips, featured recipe hero with photo, quick-dinner and healthy collections as photo cards), Recipe (big photo, time, difficulty, calories, servings stepper, ingredients with checkboxes, numbered steps), Cooking mode (one step at a time in large text with a timer), Meal plan (this week Monday to Sunday with breakfast/lunch/dinner slots filled with recipe thumbnails), Shopping list (grouped by aisle with checkboxes and quantities), Saved recipes, Profile with dietary preferences. Fresh, appetising and editorial like NYT Cooking and Mealime.",
    "screens": [
      {
        "slug": "discover",
        "name": "Discover"
      },
      {
        "slug": "recipe",
        "name": "Recipe"
      },
      {
        "slug": "cooking-mode",
        "name": "Cooking mode"
      },
      {
        "slug": "plan",
        "name": "Meal plan"
      },
      {
        "slug": "list",
        "name": "Shopping list"
      },
      {
        "slug": "saved",
        "name": "Saved"
      },
      {
        "slug": "onboarding",
        "name": "Welcome"
      }
    ]
  }
]

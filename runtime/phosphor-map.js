// ICN-01: the lucide icon a screen imports is drawn as its Phosphor (MIT) counterpart — Phosphor has the filled and
// duotone weights SF Symbols has and lucide lacks. Same name when Phosphor has it, else this table, else a rule
// (lucide's CircleCheck is Phosphor's CheckCircle); an icon with no counterpart stays lucide. Used by the runtime build
// (runtime/vite.config.js) and the export (ExportService).
export const ALIASES = {
  Search: 'MagnifyingGlass', Settings: 'Gear', Settings2: 'SlidersHorizontal', Home: 'House', ChevronRight: 'CaretRight',
  ChevronLeft: 'CaretLeft', ChevronDown: 'CaretDown', ChevronUp: 'CaretUp', ChevronsRight: 'CaretDoubleRight', ChevronsLeft: 'CaretDoubleLeft',
  Flame: 'Fire', Droplet: 'Drop', Droplets: 'Drop', Dumbbell: 'Barbell', Share: 'Export', Share2: 'ShareNetwork', Send: 'PaperPlaneTilt',
  Mail: 'Envelope', MessageCircle: 'ChatCircle', MessageSquare: 'ChatCenteredText', MessagesSquare: 'ChatsCircle', MoreHorizontal: 'DotsThree',
  Ellipsis: 'DotsThree', MoreVertical: 'DotsThreeVertical', EllipsisVertical: 'DotsThreeVertical', Sparkles: 'Sparkle', TrendingUp: 'TrendUp',
  TrendingDown: 'TrendDown', Activity: 'Pulse', LogOut: 'SignOut', LogIn: 'SignIn', Download: 'DownloadSimple', Upload: 'UploadSimple',
  RefreshCw: 'ArrowsClockwise', RotateCcw: 'ArrowCounterClockwise', RotateCw: 'ArrowClockwise', AlertTriangle: 'Warning', TriangleAlert: 'Warning',
  AlertCircle: 'WarningCircle', CircleAlert: 'WarningCircle', HelpCircle: 'Question', CircleHelp: 'Question', Zap: 'Lightning', Music: 'MusicNote',
  Music2: 'MusicNotes', Mic: 'Microphone', MicOff: 'MicrophoneSlash', Video: 'VideoCamera', Plane: 'Airplane', Bike: 'Bicycle', Utensils: 'ForkKnife',
  UtensilsCrossed: 'ForkKnife', Wifi: 'WifiHigh', Battery: 'BatteryFull', ExternalLink: 'ArrowSquareOut', Inbox: 'Tray', Layers: 'Stack',
  Grid2x2: 'SquaresFour', LayoutGrid: 'SquaresFour', Grid3x3: 'GridNine', Menu: 'List', AlignJustify: 'List', ChartColumn: 'ChartBar',
  BarChart: 'ChartBar', BarChart2: 'ChartBar', BarChart3: 'ChartBar', ChartBar: 'ChartBarHorizontal', ChartLine: 'ChartLine', LineChart: 'ChartLine',
  ChartPie: 'ChartPie', PieChart: 'ChartPie', CalendarDays: 'CalendarDots', CalendarCheck: 'CalendarCheck', CalendarPlus: 'CalendarPlus',
  Mountain: 'Mountains', MountainSnow: 'Mountains', Smile: 'Smiley', Frown: 'SmileySad', Meh: 'SmileyMeh', Laugh: 'SmileyWink', Award: 'Medal',
  AlarmClock: 'Alarm', Pencil: 'PencilSimple', PenLine: 'PencilLine', Edit: 'PencilSimple', SquarePen: 'NotePencil', Trash2: 'Trash',
  Filter: 'Funnel', ListFilter: 'FunnelSimple', SlidersHorizontal: 'SlidersHorizontal', Image: 'Image', Images: 'Images', Camera: 'Camera',
  DollarSign: 'CurrencyDollar', Euro: 'CurrencyEur', PoundSterling: 'CurrencyGbp', Banknote: 'Money', Coins: 'Coins', PiggyBank: 'PiggyBank',
  Receipt: 'Receipt', ShoppingBasket: 'Basket', Store: 'Storefront', Package: 'Package', Truck: 'Truck', Navigation: 'NavigationArrow',
  Locate: 'Crosshair', LocateFixed: 'Crosshair', Map: 'MapTrifold', MapPinned: 'MapPin', Route: 'Path', Signpost: 'Signpost', Volume2: 'SpeakerHigh',
  VolumeX: 'SpeakerSlash', Headphones: 'Headphones', Radio: 'Radio', Tv: 'Television', Gamepad2: 'GameController', Shirt: 'TShirt',
  Sofa: 'Couch', BedDouble: 'Bed', Bath: 'Bathtub', Building: 'Buildings', Building2: 'Buildings', Hotel: 'Building', Tent: 'Tent',
  TreePine: 'Tree', Trees: 'Tree', Sprout: 'Plant', Flower2: 'Flower', CloudRain: 'CloudRain', CloudSun: 'CloudSun', Snowflake: 'Snowflake',
  Thermometer: 'Thermometer', Sunrise: 'SunHorizon', Sunset: 'SunHorizon', Moon: 'Moon', Bell: 'Bell', BellRing: 'BellRinging', BellOff: 'BellSlash',
  Eye: 'Eye', EyeOff: 'EyeSlash', Lock: 'Lock', Unlock: 'LockOpen', LockOpen: 'LockOpen', ShieldCheck: 'ShieldCheck', Fingerprint: 'Fingerprint',
  ScanLine: 'Scan', ScanFace: 'Scan', QrCode: 'QrCode', CircleUser: 'UserCircle', CircleUserRound: 'UserCircle', UserRound: 'User',
  UsersRound: 'Users', UserRoundPlus: 'UserPlus', UserCheck: 'UserCheck', Contact: 'AddressBook', BookOpen: 'BookOpen', Book: 'Book',
  Library: 'Books', GraduationCap: 'GraduationCap', Notebook: 'Notebook', NotebookPen: 'NotePencil', StickyNote: 'Note', FileText: 'FileText',
  Files: 'Files', Folder: 'Folder', FolderOpen: 'FolderOpen', Clipboard: 'Clipboard', ClipboardList: 'ClipboardText', ClipboardCheck: 'ClipboardText',
  ListChecks: 'ListChecks', ListTodo: 'ListChecks', CheckSquare: 'CheckSquare', SquareCheck: 'CheckSquare', SquareCheckBig: 'CheckSquare',
  Square: 'Square', Circle: 'Circle', CircleDot: 'RadioButton', Hash: 'Hash', AtSign: 'At', Link2: 'LinkSimple', Paperclip: 'Paperclip',
  Bookmark: 'BookmarkSimple', BookmarkCheck: 'BookmarkSimple', Tag: 'Tag', Tags: 'Tag', Ticket: 'Ticket', Gift: 'Gift', PartyPopper: 'Confetti',
  Cake: 'Cake', Coffee: 'Coffee', Wine: 'Wine', Beer: 'BeerStein', Pizza: 'Pizza', Apple: 'AppleLogo', Carrot: 'Carrot', Salad: 'Bowl',
  Soup: 'BowlSteam', Cookie: 'Cookie', IceCream: 'IceCream', ChefHat: 'CookingPot', CookingPot: 'CookingPot', Pill: 'Pill', Syringe: 'Syringe',
  Stethoscope: 'Stethoscope', HeartPulse: 'Heartbeat', Brain: 'Brain', Baby: 'Baby', PawPrint: 'PawPrint', Dog: 'Dog', Cat: 'Cat',
  Footprints: 'Footprints', Timer: 'Timer', Clock: 'Clock', Clock3: 'Clock', Hourglass: 'Hourglass', History: 'ClockCounterClockwise',
  Watch: 'Watch', Smartphone: 'DeviceMobile', Laptop: 'Laptop', Monitor: 'Monitor', Keyboard: 'Keyboard', Printer: 'Printer',
  Lightbulb: 'Lightbulb', Rocket: 'Rocket', Crown: 'Crown', Trophy: 'Trophy', Medal: 'Medal', Star: 'Star', StarHalf: 'StarHalf',
  ThumbsUp: 'ThumbsUp', ThumbsDown: 'ThumbsDown', Heart: 'Heart', HeartHandshake: 'Handshake', Handshake: 'Handshake', HandHeart: 'HandHeart',
  Target: 'Target', Goal: 'FlagCheckered', Flag: 'Flag', Compass: 'Compass', Globe: 'Globe', Globe2: 'GlobeHemisphereWest', Earth: 'GlobeHemisphereWest',
  Languages: 'Translate', Wallet: 'Wallet', CreditCard: 'CreditCard', Landmark: 'Bank', Percent: 'Percent', Calculator: 'Calculator',
  Briefcase: 'Briefcase', Car: 'Car', Bus: 'Bus', Train: 'Train', Ship: 'Boat', Sailboat: 'Sailboat', Fuel: 'GasPump', Leaf: 'Leaf',
  Recycle: 'Recycle', Wind: 'Wind', Waves: 'Waves', Sun: 'Sun', Cloud: 'Cloud', Umbrella: 'Umbrella', Phone: 'Phone', PhoneCall: 'PhoneCall',
  Plus: 'Plus', Minus: 'Minus', X: 'X', Check: 'Check', CheckCheck: 'Checks', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown', ArrowUpRight: 'ArrowUpRight', ArrowDownLeft: 'ArrowDownLeft', ArrowUpDown: 'ArrowsDownUp', Repeat: 'Repeat',
  Shuffle: 'Shuffle', Play: 'Play', Pause: 'Pause', SkipForward: 'SkipForward', SkipBack: 'SkipBack', FastForward: 'FastForward', Rewind: 'Rewind',
  Square: 'Square', Maximize: 'ArrowsOut', Minimize: 'ArrowsIn', Expand: 'ArrowsOut', Copy: 'Copy', Trash: 'Trash', Archive: 'Archive',
  Info: 'Info', Users: 'Users', User: 'User', UserPlus: 'UserPlus', House: 'House', MapPin: 'MapPin', ShoppingBag: 'ShoppingBag',
  ShoppingCart: 'ShoppingCart', Calendar: 'Calendar', Key: 'Key', Shield: 'Shield', List: 'List', Link: 'Link', Scale: 'Scales', Ruler: 'Ruler',
}

/** The Phosphor name for a lucide icon, or null; `has(name)` says whether Phosphor has a name. */
export function phosphorFor(lucide, has) {
  const tries = [ALIASES[lucide], lucide]
  // lucide puts the shape first (CircleCheck, SquarePlay); Phosphor puts it last (CheckCircle, PlaySquare).
  const m = /^(Circle|Square)(.+)$/.exec(lucide)
  if (m) tries.push(m[2] + m[1], m[2])
  tries.push(lucide.replace(/\d+$/, ''))
  return tries.find((t) => t && has(t)) ?? null
}

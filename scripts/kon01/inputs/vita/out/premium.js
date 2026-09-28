import { useState } from "react";
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, ListInput, ListButton, Link, Segmented, SegmentedButton, Toggle, Radio, Button, Card, Dialog, DialogButton, Notification } from "konsta/react";
import Bell from "lucide-react/icons/bell";
import Moon from "lucide-react/icons/moon";
import Palette from "lucide-react/icons/palette";
import Ruler from "lucide-react/icons/ruler";
import CalendarDays from "lucide-react/icons/calendar-days";
import HeartPulse from "lucide-react/icons/heart-pulse";
import Lock from "lucide-react/icons/lock";
import CircleHelp from "lucide-react/icons/circle-question-mark";
import Star from "lucide-react/icons/star";
import LogOut from "lucide-react/icons/log-out";
import Crown from "lucide-react/icons/crown";
import Mail from "lucide-react/icons/mail";
import User from "lucide-react/icons/user";
import MapPin from "lucide-react/icons/map-pin";
import Volume2 from "lucide-react/icons/volume-2";
import Trophy from "lucide-react/icons/trophy";
import Flame from "lucide-react/icons/flame";
import Download from "lucide-react/icons/download";
import Trash2 from "lucide-react/icons/trash";
import { useNav, AppTabbar, Ring, Bars, Area, Avatar, Tile, CountUp } from "@od/kit";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const COLORS = {
	steps: "#ff9f0a",
	water: "#0a84ff",
	habits: "#30d158",
	sleep: "#5e5ce6",
	mind: "#bf5af2",
	pink: "#ff375f"
};
const ACCENTS = [
	["Indigo", "#5e5ce6"],
	["Blue", "#0a84ff"],
	["Green", "#30d158"],
	["Orange", "#ff9f0a"],
	["Pink", "#ff375f"],
	["Purple", "#bf5af2"]
];
const state = {
	user: {
		name: "Aziza Karimova",
		email: "aziza@vita.app",
		city: "Tashkent",
		joined: "March 2026",
		avatarColor: "#ff9f0a"
	},
	settings: {
		dark: false,
		accent: "#5e5ce6",
		reminders: true,
		dailySummary: true,
		streakAlerts: true,
		sound: false,
		units: "metric",
		weekStart: "Monday"
	},
	steps: {
		today: 7843,
		goal: 1e4,
		week: [
			6210,
			9120,
			10432,
			5480,
			11206,
			8120,
			7843
		],
		distance: 5.8,
		kcal: 312,
		minutes: 64
	},
	water: {
		ml: 1500,
		goal: 2500,
		log: [
			["07:40", 250],
			["09:15", 500],
			["12:30", 250],
			["15:05", 500]
		]
	},
	habits: [
		{
			id: "meditate",
			name: "Meditate",
			emoji: "🧘",
			color: COLORS.mind,
			goal: "10 min",
			total: 1,
			done: 1,
			streak: 41,
			best: 41,
			part: "Morning",
			week: [
				1,
				1,
				1,
				1,
				1,
				1,
				1
			]
		},
		{
			id: "run",
			name: "Morning run",
			emoji: "🏃",
			color: COLORS.pink,
			goal: "5 km",
			total: 1,
			done: 1,
			streak: 23,
			best: 31,
			part: "Morning",
			week: [
				1,
				1,
				0,
				1,
				1,
				1,
				1
			]
		},
		{
			id: "vitamins",
			name: "Vitamins",
			emoji: "💊",
			color: COLORS.steps,
			goal: "1 time",
			total: 1,
			done: 0,
			streak: 12,
			best: 20,
			part: "Morning",
			week: [
				1,
				1,
				1,
				0,
				1,
				1,
				0
			]
		},
		{
			id: "read",
			name: "Read",
			emoji: "📖",
			color: COLORS.sleep,
			goal: "20 pages",
			total: 20,
			done: 12,
			streak: 8,
			best: 19,
			part: "Evening",
			week: [
				1,
				0,
				1,
				1,
				1,
				0,
				0
			]
		},
		{
			id: "journal",
			name: "Journal",
			emoji: "✍️",
			color: COLORS.water,
			goal: "1 entry",
			total: 1,
			done: 0,
			streak: 3,
			best: 14,
			part: "Evening",
			week: [
				0,
				1,
				1,
				0,
				0,
				1,
				0
			]
		},
		{
			id: "nosugar",
			name: "No sugar",
			emoji: "🍭",
			color: COLORS.habits,
			goal: "all day",
			total: 1,
			done: 0,
			streak: 5,
			best: 9,
			part: "Anytime",
			week: [
				1,
				1,
				1,
				1,
				1,
				0,
				0
			]
		}
	],
	inbox: [
		{
			id: 1,
			icon: "🔥",
			title: "41-day streak!",
			text: "Meditate is your longest streak yet. Keep it going.",
			time: "8m"
		},
		{
			id: 2,
			icon: "💧",
			title: "Time for water",
			text: "You are 1,000 ml away from today’s goal.",
			time: "1h"
		},
		{
			id: 3,
			icon: "🏅",
			title: "New award: Early Bird",
			text: "Five morning runs before 7 AM this month.",
			time: "Yesterday"
		},
		{
			id: 4,
			icon: "📈",
			title: "Weekly summary is ready",
			text: "You completed 86% of your habits — up 9% from last week.",
			time: "Mon"
		}
	],
	premium: false
};
const fmt = (n) => n.toLocaleString("en-US");
const TODAY = "Sunday, September 27";
const dispatch = () => {};
const AWARDS = [
	[
		"🔥",
		"On Fire",
		"7-day streak",
		1
	],
	[
		"🌅",
		"Early Bird",
		"5 runs before 7 AM",
		1
	],
	[
		"💧",
		"Hydrated",
		"Water goal 7 days",
		1
	],
	[
		"🧘",
		"Zen",
		"30 days of meditation",
		1
	],
	[
		"👟",
		"100K Club",
		"100,000 steps in a week",
		1
	],
	[
		"📚",
		"Bookworm",
		"500 pages read",
		1
	],
	[
		"⚡",
		"Perfect Week",
		"Every habit, 7 days",
		1
	],
	[
		"🏔️",
		"Summit",
		"20,000 steps in a day",
		1
	],
	[
		"🎯",
		"Sharpshooter",
		"90% for a month",
		1
	],
	[
		"🌙",
		"Night Owl",
		"30 evening check-ins",
		0
	],
	[
		"🏆",
		"Legend",
		"100-day streak",
		0
	],
	[
		"💎",
		"Diamond",
		"A full year",
		0
	]
];
function SettingsGlyph() {
	return /* @__PURE__ */ _jsxs("svg", {
		width: "16",
		height: "16",
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2.2",
		children: [/* @__PURE__ */ _jsx("circle", {
			cx: "12",
			cy: "12",
			r: "3"
		}), /* @__PURE__ */ _jsx("path", { d: "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" })]
	});
}
export default function Premium() {
	const nav = useNav();
	const [plan, setPlan] = useState("year");
	const perks = [
		[
			"📊",
			"Deep insights",
			"Trends by month and year"
		],
		[
			"♾️",
			"Unlimited habits",
			"Free plan holds 6"
		],
		[
			"🧩",
			"Home screen widgets",
			"Rings on your lock screen"
		],
		[
			"☁️",
			"iCloud sync",
			"Across iPhone, iPad and Watch"
		]
	];
	return /* @__PURE__ */ _jsxs(Page, {
		className: "pb-10",
		colors: { bgIos: "" },
		style: { background: state.settings.dark ? "#000" : "linear-gradient(180deg, color-mix(in oklab, var(--color-primary) 22%, #f2f2f7) 0%, #f2f2f7 45%)" },
		children: [
			/* @__PURE__ */ _jsx(Navbar, {
				transparent: true,
				left: /* @__PURE__ */ _jsx(NavbarBackLink, {
					showText: false,
					onClick: nav.pop
				})
			}),
			/* @__PURE__ */ _jsxs(Block, {
				className: "text-center !mt-0",
				children: [
					/* @__PURE__ */ _jsx("div", {
						className: "mx-auto w-24 h-24 rounded-[30px] flex items-center justify-center vs-float",
						style: {
							background: "linear-gradient(135deg, #5e5ce6, #bf5af2 55%, #ff375f)",
							boxShadow: "0 20px 40px -12px rgba(94,92,230,.6)"
						},
						children: /* @__PURE__ */ _jsx(Crown, { className: "w-12 h-12 text-white" })
					}),
					/* @__PURE__ */ _jsx("h1", {
						className: "text-[32px] font-bold tracking-tight mt-5",
						children: "Vita Premium"
					}),
					/* @__PURE__ */ _jsx("p", {
						className: "opacity-60 mt-1",
						children: "Everything you need to make it stick."
					})
				]
			}),
			/* @__PURE__ */ _jsx(List, {
				strong: true,
				inset: true,
				dividers: true,
				children: perks.map(([e, t, d]) => /* @__PURE__ */ _jsx(ListItem, {
					title: t,
					text: d,
					media: /* @__PURE__ */ _jsx("span", {
						className: "text-2xl",
						children: e
					})
				}, t))
			}),
			/* @__PURE__ */ _jsx("div", {
				className: "px-4 space-y-3",
				children: [[
					"year",
					"Yearly",
					"$29.99 / year",
					"$2.50/mo · save 37%"
				], [
					"month",
					"Monthly",
					"$3.99 / month",
					"Cancel any time"
				]].map(([id, t, p, sub]) => /* @__PURE__ */ _jsxs("button", {
					onClick: () => setPlan(id),
					className: "w-full rounded-2xl p-4 flex items-center gap-3 text-left bg-white dark:bg-[#1c1c1e] transition",
					style: { boxShadow: plan === id ? "inset 0 0 0 2px var(--color-primary)" : "none" },
					children: [
						/* @__PURE__ */ _jsx(Radio, {
							checked: plan === id,
							onChange: () => setPlan(id)
						}),
						/* @__PURE__ */ _jsxs("div", {
							className: "flex-1",
							children: [/* @__PURE__ */ _jsx("div", {
								className: "font-semibold",
								children: t
							}), /* @__PURE__ */ _jsx("div", {
								className: "text-sm opacity-60",
								children: sub
							})]
						}),
						/* @__PURE__ */ _jsx("div", {
							className: "font-semibold",
							children: p
						})
					]
				}, id))
			}),
			/* @__PURE__ */ _jsxs(Block, { children: [
				/* @__PURE__ */ _jsx(Button, {
					large: true,
					rounded: true,
					onClick: () => {
						dispatch({ type: "premium" });
						nav.pop();
					},
					children: state.premium ? "You are Premium ✓" : "Start 7-day free trial"
				}),
				/* @__PURE__ */ _jsxs("p", {
					className: "text-center text-xs opacity-50 mt-3",
					children: [
						"Then ",
						plan === "year" ? "$29.99/year" : "$3.99/month",
						". Cancel in Settings at least 24 hours before renewal."
					]
				}),
				/* @__PURE__ */ _jsx("div", {
					className: "text-center mt-2",
					children: /* @__PURE__ */ _jsx(Link, { children: "Restore purchases" })
				})
			] })
		]
	});
}

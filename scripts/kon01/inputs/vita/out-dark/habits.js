import { useState } from "react";
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, ListInput, Link, Segmented, SegmentedButton, Stepper, Toggle, Button, Actions, ActionsGroup, ActionsButton, ActionsLabel, Searchbar, Dialog, DialogButton } from "konsta/react";
import Plus from "lucide-react/icons/plus";
import Flame from "lucide-react/icons/flame";
import Bell from "lucide-react/icons/bell";
import Clock from "lucide-react/icons/clock";
import Repeat from "lucide-react/icons/repeat";
import Target from "lucide-react/icons/target";
import Pencil from "lucide-react/icons/pencil";
import { useNav, AppTabbar, Ring } from "@od/kit";
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
const DAYS = [
	"M",
	"T",
	"W",
	"T",
	"F",
	"S",
	"S"
];
export default function Habits() {
	const nav = useNav();
	const [part, setPart] = useState("All");
	const [q, setQ] = useState("");
	const list = state.habits.filter((h) => (part === "All" || h.part === part) && h.name.toLowerCase().includes(q.toLowerCase()));
	const groups = [
		"Morning",
		"Evening",
		"Anytime"
	].map((p) => [p, list.filter((h) => h.part === p)]).filter(([, hs]) => hs.length);
	return /* @__PURE__ */ _jsxs(Page, {
		className: "pb-32",
		children: [
			/* @__PURE__ */ _jsx(Navbar, {
				large: true,
				transparent: true,
				title: "Habits",
				right: /* @__PURE__ */ _jsx(Link, {
					iconOnly: true,
					onClick: () => nav.push("addHabit"),
					children: /* @__PURE__ */ _jsx(Plus, { className: "w-6 h-6" })
				}),
				subnavbar: /* @__PURE__ */ _jsx(Searchbar, {
					placeholder: "Search habits",
					value: q,
					onInput: (e) => setQ(e.target.value),
					onClear: () => setQ(""),
					disableButton: false
				})
			}),
			/* @__PURE__ */ _jsx(Block, {
				className: "!my-3",
				children: /* @__PURE__ */ _jsx(Segmented, {
					strong: true,
					rounded: true,
					children: [
						"All",
						"Morning",
						"Evening",
						"Anytime"
					].map((p) => /* @__PURE__ */ _jsx(SegmentedButton, {
						rounded: true,
						active: part === p,
						onClick: () => setPart(p),
						children: p
					}, p))
				})
			}),
			groups.map(([p, hs]) => /* @__PURE__ */ _jsxs("div", { children: [/* @__PURE__ */ _jsx(BlockTitle, { children: p }), /* @__PURE__ */ _jsx(List, {
				strong: true,
				inset: true,
				dividers: true,
				children: hs.map((h) => /* @__PURE__ */ _jsx(ListItem, {
					link: true,
					linkProps: { onClick: () => nav.push("habit", { id: h.id }) },
					title: h.name,
					subtitle: /* @__PURE__ */ _jsxs("span", {
						className: "text-[13px] opacity-70",
						children: [h.goal, " · every day"]
					}),
					media: /* @__PURE__ */ _jsx(Ring, {
						value: h.done / h.total,
						size: 42,
						stroke: 4,
						color: h.color,
						children: /* @__PURE__ */ _jsx("span", {
							className: "text-lg",
							children: h.emoji
						})
					}),
					after: /* @__PURE__ */ _jsxs("span", {
						className: "flex items-center gap-1 font-semibold",
						style: { color: h.color },
						children: [/* @__PURE__ */ _jsx(Flame, { className: "w-4 h-4" }), h.streak]
					})
				}, h.id))
			})] }, p)),
			!groups.length && /* @__PURE__ */ _jsxs(Block, {
				className: "text-center opacity-50 !mt-16",
				children: [
					"No habits match “",
					q,
					"”."
				]
			}),
			/* @__PURE__ */ _jsx(AppTabbar, { active: "habits" })
		]
	});
}
const EMOJI = [
	"💪",
	"🧘",
	"📖",
	"🏃",
	"💧",
	"🥗",
	"😴",
	"✍️",
	"🎸",
	"🌿",
	"🧹",
	"💊"
];
const PALETTE = [
	COLORS.pink,
	COLORS.steps,
	COLORS.habits,
	COLORS.water,
	COLORS.sleep,
	COLORS.mind
];

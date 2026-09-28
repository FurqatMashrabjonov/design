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
export default function AddHabit() {
	const nav = useNav();
	const [emoji, setEmoji] = useState("🎸");
	const [color, setColor] = useState(COLORS.sleep);
	const [name, setName] = useState("Practice guitar");
	const [days, setDays] = useState([
		1,
		1,
		1,
		1,
		1,
		0,
		0
	]);
	const [part, setPart] = useState("Evening");
	const save = () => {
		dispatch({
			type: "addHabit",
			habit: {
				id: `h${Date.now()}`,
				name: name || "New habit",
				emoji,
				color,
				goal: "20 min",
				part
			}
		});
		nav.pop();
	};
	return /* @__PURE__ */ _jsxs(Page, {
		className: "pb-10",
		children: [
			/* @__PURE__ */ _jsx(Navbar, {
				title: "New habit",
				left: /* @__PURE__ */ _jsx(Link, {
					onClick: nav.pop,
					children: "Cancel"
				}),
				right: /* @__PURE__ */ _jsx(Link, {
					onClick: save,
					children: /* @__PURE__ */ _jsx("b", { children: "Add" })
				})
			}),
			/* @__PURE__ */ _jsx(Block, {
				className: "flex flex-col items-center !mt-6",
				children: /* @__PURE__ */ _jsx("div", {
					className: "w-24 h-24 rounded-[30px] flex items-center justify-center text-5xl vs-bounce",
					style: {
						background: `color-mix(in oklab, ${color} 20%, transparent)`,
						boxShadow: `inset 0 0 0 3px ${color}`
					},
					children: emoji
				}, emoji + color)
			}),
			/* @__PURE__ */ _jsx(List, {
				strong: true,
				inset: true,
				children: /* @__PURE__ */ _jsx(ListInput, {
					label: "Name",
					type: "text",
					value: name,
					onInput: (e) => setName(e.target.value),
					placeholder: "e.g. Practice guitar",
					media: /* @__PURE__ */ _jsx(Pencil, { className: "w-5 h-5 opacity-50" }),
					clearButton: true,
					onClear: () => setName("")
				})
			}),
			/* @__PURE__ */ _jsx(BlockTitle, { children: "Icon" }),
			/* @__PURE__ */ _jsx(Block, {
				strong: true,
				inset: true,
				className: "!py-3",
				children: /* @__PURE__ */ _jsx("div", {
					className: "grid grid-cols-6 gap-2",
					children: EMOJI.map((e) => /* @__PURE__ */ _jsx("button", {
						onClick: () => setEmoji(e),
						className: "h-11 rounded-xl text-2xl transition",
						style: { background: e === emoji ? `color-mix(in oklab, ${color} 22%, transparent)` : "transparent" },
						children: e
					}, e))
				})
			}),
			/* @__PURE__ */ _jsx(BlockTitle, { children: "Color" }),
			/* @__PURE__ */ _jsx(Block, {
				strong: true,
				inset: true,
				className: "!py-4",
				children: /* @__PURE__ */ _jsx("div", {
					className: "flex justify-between",
					children: PALETTE.map((c) => /* @__PURE__ */ _jsx("button", {
						onClick: () => setColor(c),
						className: "w-10 h-10 rounded-full transition",
						style: {
							background: c,
							boxShadow: c === color ? `0 0 0 3px white, 0 0 0 5px ${c}` : "none"
						}
					}, c))
				})
			}),
			/* @__PURE__ */ _jsx(BlockTitle, { children: "Repeat" }),
			/* @__PURE__ */ _jsx(Block, {
				strong: true,
				inset: true,
				className: "!py-4",
				children: /* @__PURE__ */ _jsx("div", {
					className: "flex justify-between",
					children: DAYS.map((d, i) => /* @__PURE__ */ _jsx("button", {
						onClick: () => setDays(days.map((x, j) => j === i ? 1 - x : x)),
						className: "w-10 h-10 rounded-full font-semibold text-sm transition",
						style: {
							background: days[i] ? color : "rgba(120,120,128,.14)",
							color: days[i] ? "white" : "inherit"
						},
						children: d
					}, i))
				})
			}),
			/* @__PURE__ */ _jsx(BlockTitle, { children: "Time of day" }),
			/* @__PURE__ */ _jsx(Block, { children: /* @__PURE__ */ _jsx(Segmented, {
				strong: true,
				rounded: true,
				children: [
					"Morning",
					"Evening",
					"Anytime"
				].map((p) => /* @__PURE__ */ _jsx(SegmentedButton, {
					rounded: true,
					active: part === p,
					onClick: () => setPart(p),
					children: p
				}, p))
			}) }),
			/* @__PURE__ */ _jsx(Block, { children: /* @__PURE__ */ _jsx(Button, {
				large: true,
				rounded: true,
				onClick: save,
				style: { background: color },
				children: "Add habit"
			}) })
		]
	});
}

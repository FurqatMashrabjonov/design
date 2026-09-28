import { useState } from "react";
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, Segmented, SegmentedButton, Button, Link, Sheet, Range, Toast } from "konsta/react";
import Flame from "lucide-react/icons/flame";
import MapPin from "lucide-react/icons/map-pin";
import Timer from "lucide-react/icons/timer";
import Share from "lucide-react/icons/share";
import Settings2 from "lucide-react/icons/settings-2";
import GlassWater from "lucide-react/icons/glass-water";
import CupSoda from "lucide-react/icons/cup-soda";
import Coffee from "lucide-react/icons/coffee";
import { useNav, Ring, CountUp, Bars, Area, WaterGlass } from "@od/kit";
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
const WEEK = [
	"M",
	"T",
	"W",
	"T",
	"F",
	"S",
	"S"
];
export default function Water() {
	const nav = useNav();
	const w = state.water;
	const [sheet, setSheet] = useState(false);
	const [goal, setGoal] = useState(w.goal);
	const [toast, setToast] = useState("");
	const add = (ml) => {
		dispatch({
			type: "addWater",
			ml
		});
		if (w.ml < w.goal && w.ml + ml >= w.goal) setToast("Goal reached! 🎉 Nicely done.");
		else setToast(`+${ml} ml logged`);
		setTimeout(() => setToast(""), 1600);
	};
	const cups = [
		[
			GlassWater,
			250,
			"Glass"
		],
		[
			CupSoda,
			500,
			"Bottle"
		],
		[
			Coffee,
			150,
			"Cup"
		]
	];
	return /* @__PURE__ */ _jsxs(Page, {
		className: "pb-10",
		children: [
			/* @__PURE__ */ _jsx(Navbar, {
				transparent: true,
				title: "Water",
				left: /* @__PURE__ */ _jsx(NavbarBackLink, {
					showText: false,
					onClick: nav.pop
				}),
				right: /* @__PURE__ */ _jsx(Link, {
					iconOnly: true,
					onClick: () => setSheet(true),
					children: /* @__PURE__ */ _jsx(Settings2, { className: "w-5 h-5" })
				})
			}),
			/* @__PURE__ */ _jsxs(Block, {
				className: "text-center !mt-2",
				children: [/* @__PURE__ */ _jsxs("div", {
					className: "text-[44px] font-bold tracking-tight",
					style: { color: COLORS.water },
					children: [
						/* @__PURE__ */ _jsx(CountUp, { to: w.ml }),
						" ",
						/* @__PURE__ */ _jsx("span", {
							className: "text-xl opacity-60 text-black dark:text-white",
							children: "ml"
						})
					]
				}), /* @__PURE__ */ _jsx("div", {
					className: "opacity-60",
					children: w.ml >= w.goal ? "Goal reached — keep sipping" : `${fmt(w.goal - w.ml)} ml to your ${fmt(w.goal)} ml goal`
				})]
			}),
			/* @__PURE__ */ _jsx(WaterGlass, {
				value: w.ml / w.goal,
				color: COLORS.water
			}),
			/* @__PURE__ */ _jsx("div", {
				className: "grid grid-cols-3 gap-3 px-4 mt-8",
				children: cups.map(([I, ml, k]) => /* @__PURE__ */ _jsxs("button", {
					onClick: () => add(ml),
					className: "rounded-2xl py-3 flex flex-col items-center gap-1 active:scale-95 transition bg-white dark:bg-[#1c1c1e]",
					children: [
						/* @__PURE__ */ _jsx(I, {
							className: "w-6 h-6",
							style: { color: COLORS.water }
						}),
						/* @__PURE__ */ _jsxs("span", {
							className: "font-semibold",
							children: ["+", ml]
						}),
						/* @__PURE__ */ _jsx("span", {
							className: "text-xs opacity-50",
							children: k
						})
					]
				}, ml))
			}),
			/* @__PURE__ */ _jsxs(BlockTitle, {
				className: "flex justify-between",
				children: [/* @__PURE__ */ _jsx("span", { children: "Today’s log" }), w.log.length > 0 && /* @__PURE__ */ _jsx(Link, {
					className: "!text-[15px] !font-normal",
					onClick: () => dispatch({
						type: "addWater",
						ml: -w.log.at(-1)[1]
					}),
					children: "Undo last"
				})]
			}),
			/* @__PURE__ */ _jsx(List, {
				strong: true,
				inset: true,
				dividers: true,
				children: [...w.log].reverse().map(([t, ml], i) => /* @__PURE__ */ _jsx(ListItem, {
					title: `${ml} ml`,
					after: t,
					media: /* @__PURE__ */ _jsx(GlassWater, {
						className: "w-5 h-5",
						style: { color: COLORS.water }
					})
				}, i + t))
			}),
			/* @__PURE__ */ _jsx(Sheet, {
				className: "pb-safe",
				opened: sheet,
				onBackdropClick: () => setSheet(false),
				children: /* @__PURE__ */ _jsxs(Block, {
					className: "!mt-6",
					children: [
						/* @__PURE__ */ _jsx("div", {
							className: "text-center font-semibold text-lg",
							children: "Daily goal"
						}),
						/* @__PURE__ */ _jsxs("div", {
							className: "text-center text-4xl font-bold mt-3",
							style: { color: COLORS.water },
							children: [fmt(goal), " ml"]
						}),
						/* @__PURE__ */ _jsx("div", {
							className: "text-center text-sm opacity-60",
							children: "Recommended for you: 2,400 ml"
						}),
						/* @__PURE__ */ _jsx("div", {
							className: "mt-6",
							children: /* @__PURE__ */ _jsx(Range, {
								min: 1e3,
								max: 4e3,
								step: 100,
								value: goal,
								onChange: (e) => setGoal(Number(e.target.value))
							})
						}),
						/* @__PURE__ */ _jsx(Button, {
							large: true,
							rounded: true,
							className: "mt-6",
							onClick: () => setSheet(false),
							children: "Save"
						})
					]
				})
			}),
			/* @__PURE__ */ _jsx(Toast, {
				position: "center",
				opened: !!toast,
				children: toast
			})
		]
	});
}

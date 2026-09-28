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
export default function Steps() {
	const nav = useNav();
	const s = state.steps;
	const [range, setRange] = useState("Week");
	const month = Array.from({ length: 30 }, (_, i) => 5200 + i * 1733 % 6400);
	return /* @__PURE__ */ _jsxs(Page, {
		className: "pb-10",
		children: [
			/* @__PURE__ */ _jsx(Navbar, {
				transparent: true,
				title: "Steps",
				left: /* @__PURE__ */ _jsx(NavbarBackLink, {
					showText: false,
					onClick: nav.pop
				}),
				right: /* @__PURE__ */ _jsx(Link, {
					iconOnly: true,
					children: /* @__PURE__ */ _jsx(Share, { className: "w-5 h-5" })
				})
			}),
			/* @__PURE__ */ _jsx(Block, {
				className: "flex flex-col items-center !mt-4",
				children: /* @__PURE__ */ _jsx(Ring, {
					value: s.today / s.goal,
					size: 220,
					stroke: 22,
					color: COLORS.steps,
					children: /* @__PURE__ */ _jsxs("div", {
						className: "text-center",
						children: [/* @__PURE__ */ _jsx("div", {
							className: "text-[44px] font-bold tracking-tight leading-none",
							children: /* @__PURE__ */ _jsx(CountUp, { to: s.today })
						}), /* @__PURE__ */ _jsxs("div", {
							className: "opacity-60 mt-1",
							children: [
								"of ",
								fmt(s.goal),
								" steps"
							]
						})]
					})
				})
			}),
			/* @__PURE__ */ _jsx("div", {
				className: "grid grid-cols-3 gap-3 px-4",
				children: [
					[
						MapPin,
						`${s.distance} km`,
						"Distance"
					],
					[
						Flame,
						`${s.kcal}`,
						"kcal"
					],
					[
						Timer,
						`${s.minutes}`,
						"Active min"
					]
				].map(([I, v, k], i) => /* @__PURE__ */ _jsxs("div", {
					className: "rounded-2xl p-3 bg-white dark:bg-[#1c1c1e] vs-rise",
					style: { animationDelay: `${i * 70}ms` },
					children: [
						/* @__PURE__ */ _jsx(I, {
							className: "w-5 h-5",
							style: { color: COLORS.steps }
						}),
						/* @__PURE__ */ _jsx("div", {
							className: "text-xl font-bold mt-2",
							children: v
						}),
						/* @__PURE__ */ _jsx("div", {
							className: "text-xs opacity-60",
							children: k
						})
					]
				}, k))
			}),
			/* @__PURE__ */ _jsx(Block, {
				className: "!mt-6 !mb-3",
				children: /* @__PURE__ */ _jsx(Segmented, {
					strong: true,
					rounded: true,
					children: [
						"Day",
						"Week",
						"Month"
					].map((r) => /* @__PURE__ */ _jsx(SegmentedButton, {
						rounded: true,
						active: range === r,
						onClick: () => setRange(r),
						children: r
					}, r))
				})
			}),
			/* @__PURE__ */ _jsxs(Block, {
				strong: true,
				inset: true,
				className: "!py-5",
				children: [/* @__PURE__ */ _jsxs("div", {
					className: "flex items-baseline justify-between mb-4",
					children: [/* @__PURE__ */ _jsxs("div", { children: [/* @__PURE__ */ _jsx("div", {
						className: "text-xs opacity-60",
						children: "Daily average"
					}), /* @__PURE__ */ _jsx("div", {
						className: "text-2xl font-bold",
						children: range === "Month" ? "8,190" : "8,344"
					})] }), /* @__PURE__ */ _jsxs("div", {
						className: "text-sm font-semibold",
						style: { color: COLORS.habits },
						children: ["▲ 12% vs last ", range.toLowerCase()]
					})]
				}), range === "Month" ? /* @__PURE__ */ _jsx(Area, {
					values: month,
					color: COLORS.steps
				}) : range === "Day" ? /* @__PURE__ */ _jsx(Bars, {
					values: [
						0,
						0,
						320,
						1800,
						900,
						1200,
						600,
						2400,
						623
					],
					color: COLORS.steps,
					labels: [
						"6",
						"8",
						"10",
						"12",
						"14",
						"16",
						"18",
						"20",
						"now"
					]
				}) : /* @__PURE__ */ _jsx(Bars, {
					values: s.week,
					goal: s.goal,
					color: COLORS.steps,
					labels: WEEK
				})]
			}),
			/* @__PURE__ */ _jsx(BlockTitle, { children: "Highlights" }),
			/* @__PURE__ */ _jsxs(List, {
				strong: true,
				inset: true,
				dividers: true,
				children: [
					/* @__PURE__ */ _jsx(ListItem, {
						title: "Best day this month",
						after: "14,208",
						media: /* @__PURE__ */ _jsx("span", {
							className: "text-2xl",
							children: "🏆"
						})
					}),
					/* @__PURE__ */ _jsx(ListItem, {
						title: "Goal reached",
						after: "12 of 27 days",
						media: /* @__PURE__ */ _jsx("span", {
							className: "text-2xl",
							children: "🎯"
						})
					}),
					/* @__PURE__ */ _jsx(ListItem, {
						title: "Longest walk",
						after: "6.4 km · Sep 19",
						media: /* @__PURE__ */ _jsx("span", {
							className: "text-2xl",
							children: "🥾"
						})
					})
				]
			})
		]
	});
}

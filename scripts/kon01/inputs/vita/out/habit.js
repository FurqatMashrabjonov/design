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
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
export default function Habit({ id }) {
	const nav = useNav();
	const h = state.habits.find((x) => x.id === id) ?? state.habits[0];
	const [menu, setMenu] = useState(false);
	const [confirm, setConfirm] = useState(false);
	const [remind, setRemind] = useState(true);
	const heat = Array.from({ length: 84 }, (_, i) => (i * 37 + h.streak) % 11 > 2 ? i * 13 % 4 / 3 + .25 : 0);
	return /* @__PURE__ */ _jsxs(Page, {
		className: "pb-10",
		children: [
			/* @__PURE__ */ _jsx(Navbar, {
				title: h.name,
				left: /* @__PURE__ */ _jsx(NavbarBackLink, {
					showText: false,
					onClick: nav.pop
				}),
				right: /* @__PURE__ */ _jsx(Link, {
					onClick: () => setMenu(true),
					children: "Edit"
				})
			}),
			/* @__PURE__ */ _jsxs(Block, {
				className: "flex flex-col items-center !mt-6",
				children: [/* @__PURE__ */ _jsx(Ring, {
					value: h.done / h.total,
					size: 170,
					stroke: 16,
					color: h.color,
					children: /* @__PURE__ */ _jsxs("div", {
						className: "text-center",
						children: [/* @__PURE__ */ _jsx("div", {
							className: "text-5xl",
							children: h.emoji
						}), /* @__PURE__ */ _jsxs("div", {
							className: "text-sm font-semibold mt-1",
							style: { color: h.color },
							children: [
								h.done,
								"/",
								h.total,
								" today"
							]
						})]
					})
				}), h.total > 1 ? /* @__PURE__ */ _jsx(Stepper, {
					className: "mt-5",
					value: h.done,
					rounded: true,
					raised: true,
					large: true,
					onPlus: () => dispatch({
						type: "stepHabit",
						id: h.id,
						by: 1
					}),
					onMinus: () => dispatch({
						type: "stepHabit",
						id: h.id,
						by: -1
					})
				}) : /* @__PURE__ */ _jsx(Button, {
					rounded: true,
					large: true,
					className: "!w-56 mt-5",
					style: { background: h.done >= h.total ? "rgba(120,120,128,.25)" : h.color },
					onClick: () => dispatch({
						type: "toggleHabit",
						id: h.id
					}),
					children: h.done >= h.total ? "Done for today ✓" : "Mark as done"
				})]
			}),
			/* @__PURE__ */ _jsx("div", {
				className: "grid grid-cols-3 gap-3 px-4 mt-2",
				children: [
					[
						"Streak",
						`${h.streak}`,
						"days"
					],
					[
						"Best",
						`${h.best}`,
						"days"
					],
					[
						"Rate",
						"86",
						"%"
					]
				].map(([k, v, u]) => /* @__PURE__ */ _jsxs("div", {
					className: "rounded-2xl p-3 text-center bg-white dark:bg-[#1c1c1e]",
					children: [/* @__PURE__ */ _jsx("div", {
						className: "text-xs opacity-60",
						children: k
					}), /* @__PURE__ */ _jsxs("div", {
						className: "text-2xl font-bold",
						style: { color: h.color },
						children: [v, /* @__PURE__ */ _jsxs("span", {
							className: "text-xs opacity-60 font-medium",
							children: [" ", u]
						})]
					})]
				}, k))
			}),
			/* @__PURE__ */ _jsx(BlockTitle, { children: "Last 12 weeks" }),
			/* @__PURE__ */ _jsxs(Block, {
				strong: true,
				inset: true,
				className: "!py-4",
				children: [/* @__PURE__ */ _jsx("div", {
					className: "grid grid-flow-col grid-rows-7 gap-1.5 justify-between",
					children: heat.map((v, i) => /* @__PURE__ */ _jsx("span", {
						className: "w-[18px] h-[18px] rounded-[5px]",
						style: { background: v ? `color-mix(in oklab, ${h.color} ${Math.round(v * 100)}%, transparent)` : "rgba(120,120,128,.14)" }
					}, i))
				}), /* @__PURE__ */ _jsxs("div", {
					className: "flex justify-between text-xs opacity-50 mt-3",
					children: [
						/* @__PURE__ */ _jsx("span", { children: "Jul" }),
						/* @__PURE__ */ _jsx("span", { children: "Aug" }),
						/* @__PURE__ */ _jsx("span", { children: "Sep" })
					]
				})]
			}),
			/* @__PURE__ */ _jsx(BlockTitle, { children: "Details" }),
			/* @__PURE__ */ _jsxs(List, {
				strong: true,
				inset: true,
				dividers: true,
				children: [
					/* @__PURE__ */ _jsx(ListItem, {
						title: "Goal",
						after: h.goal,
						media: /* @__PURE__ */ _jsx(Target, {
							className: "w-6 h-6",
							style: { color: h.color }
						})
					}),
					/* @__PURE__ */ _jsx(ListItem, {
						title: "Repeat",
						after: "Every day",
						media: /* @__PURE__ */ _jsx(Repeat, {
							className: "w-6 h-6",
							style: { color: h.color }
						})
					}),
					/* @__PURE__ */ _jsx(ListItem, {
						title: "Time of day",
						after: h.part,
						media: /* @__PURE__ */ _jsx(Clock, {
							className: "w-6 h-6",
							style: { color: h.color }
						})
					}),
					/* @__PURE__ */ _jsx(ListItem, {
						label: true,
						title: "Reminder",
						media: /* @__PURE__ */ _jsx(Bell, {
							className: "w-6 h-6",
							style: { color: h.color }
						}),
						after: /* @__PURE__ */ _jsx(Toggle, {
							checked: remind,
							onChange: () => setRemind(!remind)
						})
					})
				]
			}),
			/* @__PURE__ */ _jsxs(Actions, {
				opened: menu,
				onBackdropClick: () => setMenu(false),
				children: [/* @__PURE__ */ _jsxs(ActionsGroup, { children: [
					/* @__PURE__ */ _jsxs(ActionsLabel, { children: [
						h.emoji,
						" ",
						h.name
					] }),
					/* @__PURE__ */ _jsx(ActionsButton, {
						onClick: () => {
							setMenu(false);
							nav.push("addHabit", { edit: h.id });
						},
						children: "Edit habit"
					}),
					/* @__PURE__ */ _jsx(ActionsButton, {
						onClick: () => setMenu(false),
						children: "Pause for a week"
					}),
					/* @__PURE__ */ _jsx(ActionsButton, {
						onClick: () => {
							setMenu(false);
							setConfirm(true);
						},
						children: /* @__PURE__ */ _jsx("span", {
							className: "text-red-500",
							children: "Delete habit"
						})
					})
				] }), /* @__PURE__ */ _jsx(ActionsGroup, { children: /* @__PURE__ */ _jsx(ActionsButton, {
					bold: true,
					onClick: () => setMenu(false),
					children: "Cancel"
				}) })]
			}),
			/* @__PURE__ */ _jsx(Dialog, {
				opened: confirm,
				onBackdropClick: () => setConfirm(false),
				title: `Delete “${h.name}”?`,
				content: `Your ${h.streak}-day streak and its history will be removed. This cannot be undone.`,
				buttons: /* @__PURE__ */ _jsxs(_Fragment, { children: [/* @__PURE__ */ _jsx(DialogButton, {
					onClick: () => setConfirm(false),
					children: "Cancel"
				}), /* @__PURE__ */ _jsx(DialogButton, {
					strong: true,
					onClick: () => {
						setConfirm(false);
						dispatch({
							type: "deleteHabit",
							id: h.id
						});
						nav.pop();
					},
					children: /* @__PURE__ */ _jsx("span", {
						className: "text-red-500",
						children: "Delete"
					})
				})] })
			})
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

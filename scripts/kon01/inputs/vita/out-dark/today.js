import { useState } from "react";
import { Page, Navbar, Block, BlockTitle, List, ListItem, Card, Link, Checkbox, Badge } from "konsta/react";
import Bell from "lucide-react/icons/bell";
import Footprints from "lucide-react/icons/footprints";
import Droplets from "lucide-react/icons/droplets";
import Plus from "lucide-react/icons/plus";
import ChevronRight from "lucide-react/icons/chevron-right";
import Flame from "lucide-react/icons/flame";
import { useNav, AppTabbar, Ring, CountUp, Avatar, Confetti } from "@od/kit";
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
export default function Today() {
	const nav = useNav();
	const { steps, water, habits, user, inbox } = state;
	const [party, setParty] = useState(false);
	const done = habits.filter((h) => h.done >= h.total).length;
	const toggle = (h) => {
		const willFinishAll = h.done < h.total && done === habits.length - 1;
		dispatch({
			type: "toggleHabit",
			id: h.id
		});
		if (willFinishAll) {
			setParty(true);
			setTimeout(() => setParty(false), 1800);
		}
	};
	const morning = new Date(2026, 8, 27, 9).getHours() < 12;
	return /* @__PURE__ */ _jsxs(Page, {
		className: "pb-32",
		children: [
			/* @__PURE__ */ _jsx(Navbar, {
				large: true,
				transparent: true,
				title: "Today",
				subtitle: TODAY,
				left: /* @__PURE__ */ _jsx(Link, {
					iconOnly: true,
					onClick: () => nav.push("profile"),
					children: /* @__PURE__ */ _jsx(Avatar, {
						name: user.name,
						color: user.avatarColor,
						size: 32
					})
				}),
				right: /* @__PURE__ */ _jsxs(Link, {
					iconOnly: true,
					onClick: () => nav.push("inbox"),
					className: "relative",
					children: [/* @__PURE__ */ _jsx(Bell, { className: "w-6 h-6" }), inbox.length > 0 && /* @__PURE__ */ _jsx(Badge, {
						className: "absolute -top-1 -right-1",
						colors: { bg: "bg-red-500" },
						children: inbox.length
					})]
				})
			}),
			/* @__PURE__ */ _jsxs(Block, {
				className: "!mt-1 !mb-2 text-[15px] opacity-70",
				children: [
					morning ? "Good morning" : "Good evening",
					", ",
					user.name.split(" ")[0],
					". You are ",
					Math.round(done / habits.length * 100),
					"% through today."
				]
			}),
			/* @__PURE__ */ _jsx(Card, {
				raised: true,
				className: "!mx-4 !rounded-[28px]",
				children: /* @__PURE__ */ _jsxs("div", {
					className: "flex items-center gap-5",
					children: [/* @__PURE__ */ _jsx(Ring, {
						value: steps.today / steps.goal,
						size: 128,
						stroke: 14,
						color: COLORS.steps,
						children: /* @__PURE__ */ _jsx(Ring, {
							value: water.ml / water.goal,
							size: 96,
							stroke: 14,
							color: COLORS.water,
							delay: 120,
							children: /* @__PURE__ */ _jsx(Ring, {
								value: done / habits.length,
								size: 64,
								stroke: 14,
								color: COLORS.habits,
								delay: 240
							})
						})
					}), /* @__PURE__ */ _jsxs("div", {
						className: "flex-1 space-y-2.5",
						children: [
							/* @__PURE__ */ _jsx(Metric, {
								color: COLORS.steps,
								label: "Steps",
								value: /* @__PURE__ */ _jsx(CountUp, { to: steps.today }),
								goal: fmt(steps.goal)
							}),
							/* @__PURE__ */ _jsx(Metric, {
								color: COLORS.water,
								label: "Water",
								value: /* @__PURE__ */ _jsxs(_Fragment, { children: [/* @__PURE__ */ _jsx(CountUp, { to: water.ml }), " ml"] }),
								goal: `${fmt(water.goal)}`
							}),
							/* @__PURE__ */ _jsx(Metric, {
								color: COLORS.habits,
								label: "Habits",
								value: `${done} of ${habits.length}`
							})
						]
					})]
				})
			}),
			/* @__PURE__ */ _jsxs("div", {
				className: "grid grid-cols-2 gap-3 px-4 mt-4",
				children: [/* @__PURE__ */ _jsxs("button", {
					onClick: () => nav.push("steps"),
					className: "rounded-[24px] p-4 text-left text-white active:scale-[.97] transition vs-rise",
					style: { background: `linear-gradient(150deg, ${COLORS.steps}, #ff6b35)` },
					children: [
						/* @__PURE__ */ _jsx(Footprints, { className: "w-7 h-7" }),
						/* @__PURE__ */ _jsx("div", {
							className: "text-[28px] font-bold mt-5 leading-none",
							children: /* @__PURE__ */ _jsx(CountUp, { to: steps.today })
						}),
						/* @__PURE__ */ _jsxs("div", {
							className: "text-white/80 text-sm mt-1",
							children: [fmt(steps.goal - steps.today), " to go"]
						})
					]
				}), /* @__PURE__ */ _jsxs("button", {
					onClick: () => nav.push("water"),
					className: "rounded-[24px] p-4 text-left text-white active:scale-[.97] transition vs-rise",
					style: {
						background: `linear-gradient(150deg, ${COLORS.water}, #5ac8fa)`,
						animationDelay: "80ms"
					},
					children: [
						/* @__PURE__ */ _jsx(Droplets, { className: "w-7 h-7" }),
						/* @__PURE__ */ _jsxs("div", {
							className: "text-[28px] font-bold mt-5 leading-none",
							children: [(water.ml / 1e3).toFixed(1), " L"]
						}),
						/* @__PURE__ */ _jsxs("div", {
							className: "text-white/80 text-sm mt-1",
							children: [
								"of ",
								(water.goal / 1e3).toFixed(1),
								" L"
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ _jsxs(BlockTitle, {
				className: "!mt-8 flex items-center justify-between",
				children: [/* @__PURE__ */ _jsx("span", { children: "Habits" }), /* @__PURE__ */ _jsx(Link, {
					onClick: () => nav.reset("habits", {}, "none"),
					className: "!text-[15px] !font-normal",
					children: "See all"
				})]
			}),
			/* @__PURE__ */ _jsxs(List, {
				strong: true,
				inset: true,
				dividers: true,
				children: [habits.slice(0, 5).map((h) => {
					const ok = h.done >= h.total;
					return /* @__PURE__ */ _jsx(ListItem, {
						label: true,
						title: /* @__PURE__ */ _jsx("span", {
							className: ok ? "opacity-50 line-through decoration-2" : "",
							children: h.name
						}),
						subtitle: /* @__PURE__ */ _jsxs("span", {
							className: "flex items-center gap-1 text-[13px]",
							style: { color: h.color },
							children: [
								/* @__PURE__ */ _jsx(Flame, { className: "w-3.5 h-3.5" }),
								h.streak,
								" day streak"
							]
						}),
						media: /* @__PURE__ */ _jsx("span", {
							className: `w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${ok ? "vs-bounce" : ""}`,
							style: { background: `color-mix(in oklab, ${h.color} 16%, transparent)` },
							children: h.emoji
						}, String(ok)),
						after: /* @__PURE__ */ _jsx(Checkbox, {
							checked: ok,
							onChange: () => toggle(h)
						})
					}, h.id);
				}), /* @__PURE__ */ _jsx(ListItem, {
					link: true,
					title: /* @__PURE__ */ _jsx("span", {
						className: "text-primary",
						children: "New habit"
					}),
					media: /* @__PURE__ */ _jsx("span", {
						className: "w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/10 text-primary",
						children: /* @__PURE__ */ _jsx(Plus, { className: "w-5 h-5" })
					}),
					linkProps: { onClick: () => nav.push("addHabit") }
				})]
			}),
			/* @__PURE__ */ _jsx(Card, {
				className: "!mx-4 !rounded-[24px]",
				raised: true,
				children: /* @__PURE__ */ _jsxs("button", {
					onClick: () => nav.push("premium"),
					className: "w-full flex items-center gap-3 text-left",
					children: [
						/* @__PURE__ */ _jsx("span", {
							className: "text-3xl",
							children: "👑"
						}),
						/* @__PURE__ */ _jsxs("div", {
							className: "flex-1",
							children: [/* @__PURE__ */ _jsx("div", {
								className: "font-semibold",
								children: "Vita Premium"
							}), /* @__PURE__ */ _jsx("div", {
								className: "text-sm opacity-60",
								children: "Unlimited habits, insights and widgets."
							})]
						}),
						/* @__PURE__ */ _jsx(ChevronRight, { className: "w-5 h-5 opacity-40" })
					]
				})
			}),
			/* @__PURE__ */ _jsx(Confetti, { run: party }),
			/* @__PURE__ */ _jsx(AppTabbar, { active: "today" })
		]
	});
}
function Metric({ color, label, value, goal }) {
	return /* @__PURE__ */ _jsxs("div", { children: [/* @__PURE__ */ _jsxs("div", {
		className: "text-xs font-medium opacity-60 flex items-center gap-1.5",
		children: [/* @__PURE__ */ _jsx("span", {
			className: "w-2 h-2 rounded-full",
			style: { background: color }
		}), label]
	}), /* @__PURE__ */ _jsxs("div", {
		className: "text-[19px] font-bold leading-tight",
		style: { color },
		children: [value, goal && /* @__PURE__ */ _jsxs("span", {
			className: "text-xs font-medium opacity-60",
			children: [" / ", goal]
		})]
	})] });
}

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
export default function Settings() {
	const nav = useNav();
	const s = state.settings;
	const [logout, setLogout] = useState(false);
	const set = (key, value) => dispatch({
		type: "setting",
		key,
		value
	});
	return /* @__PURE__ */ _jsxs(Page, {
		className: "pb-10",
		children: [
			/* @__PURE__ */ _jsx(Navbar, {
				title: "Settings",
				left: /* @__PURE__ */ _jsx(NavbarBackLink, {
					showText: false,
					onClick: nav.pop
				})
			}),
			/* @__PURE__ */ _jsx(BlockTitle, { children: "General" }),
			/* @__PURE__ */ _jsxs(List, {
				strong: true,
				inset: true,
				dividers: true,
				children: [
					/* @__PURE__ */ _jsx(ListItem, {
						link: true,
						title: "Notifications",
						media: /* @__PURE__ */ _jsx(Tile, {
							color: "#ff375f",
							children: /* @__PURE__ */ _jsx(Bell, { className: "w-4 h-4" })
						}),
						linkProps: { onClick: () => nav.push("notifSettings") }
					}),
					/* @__PURE__ */ _jsx(ListItem, {
						link: true,
						title: "Appearance",
						after: s.dark ? "Dark" : "Light",
						media: /* @__PURE__ */ _jsx(Tile, {
							color: "#5e5ce6",
							children: /* @__PURE__ */ _jsx(Palette, { className: "w-4 h-4" })
						}),
						linkProps: { onClick: () => nav.push("appearance") }
					}),
					/* @__PURE__ */ _jsx(ListItem, {
						label: true,
						title: "Dark mode",
						media: /* @__PURE__ */ _jsx(Tile, {
							color: "#1c1c1e",
							children: /* @__PURE__ */ _jsx(Moon, { className: "w-4 h-4" })
						}),
						after: /* @__PURE__ */ _jsx(Toggle, {
							checked: s.dark,
							onChange: () => set("dark", !s.dark)
						})
					}),
					/* @__PURE__ */ _jsx(ListItem, {
						label: true,
						title: "Sounds",
						media: /* @__PURE__ */ _jsx(Tile, {
							color: "#ff9f0a",
							children: /* @__PURE__ */ _jsx(Volume2, { className: "w-4 h-4" })
						}),
						after: /* @__PURE__ */ _jsx(Toggle, {
							checked: s.sound,
							onChange: () => set("sound", !s.sound)
						})
					})
				]
			}),
			/* @__PURE__ */ _jsx(BlockTitle, { children: "Units" }),
			/* @__PURE__ */ _jsxs(List, {
				strong: true,
				inset: true,
				dividers: true,
				children: [
					/* @__PURE__ */ _jsx(ListItem, {
						label: true,
						title: "Metric (km, ml)",
						media: /* @__PURE__ */ _jsx(Tile, {
							color: "#30d158",
							children: /* @__PURE__ */ _jsx(Ruler, { className: "w-4 h-4" })
						}),
						after: /* @__PURE__ */ _jsx(Radio, {
							checked: s.units === "metric",
							onChange: () => set("units", "metric")
						})
					}),
					/* @__PURE__ */ _jsx(ListItem, {
						label: true,
						title: "Imperial (mi, oz)",
						media: /* @__PURE__ */ _jsx(Tile, {
							color: "#30d158",
							children: /* @__PURE__ */ _jsx(Ruler, { className: "w-4 h-4" })
						}),
						after: /* @__PURE__ */ _jsx(Radio, {
							checked: s.units === "imperial",
							onChange: () => set("units", "imperial")
						})
					}),
					/* @__PURE__ */ _jsx(ListItem, {
						link: true,
						title: "Week starts on",
						after: s.weekStart,
						media: /* @__PURE__ */ _jsx(Tile, {
							color: "#0a84ff",
							children: /* @__PURE__ */ _jsx(CalendarDays, { className: "w-4 h-4" })
						})
					})
				]
			}),
			/* @__PURE__ */ _jsx(BlockTitle, { children: "Data" }),
			/* @__PURE__ */ _jsxs(List, {
				strong: true,
				inset: true,
				dividers: true,
				children: [
					/* @__PURE__ */ _jsx(ListItem, {
						link: true,
						title: "Apple Health",
						after: "Connected",
						media: /* @__PURE__ */ _jsx(Tile, {
							color: "#ff375f",
							children: /* @__PURE__ */ _jsx(HeartPulse, { className: "w-4 h-4" })
						})
					}),
					/* @__PURE__ */ _jsx(ListItem, {
						link: true,
						title: "Privacy",
						media: /* @__PURE__ */ _jsx(Tile, {
							color: "#0a84ff",
							children: /* @__PURE__ */ _jsx(Lock, { className: "w-4 h-4" })
						})
					}),
					/* @__PURE__ */ _jsx(ListItem, {
						link: true,
						title: "Export data",
						media: /* @__PURE__ */ _jsx(Tile, {
							color: "#8e8e93",
							children: /* @__PURE__ */ _jsx(Download, { className: "w-4 h-4" })
						})
					})
				]
			}),
			/* @__PURE__ */ _jsxs(List, {
				strong: true,
				inset: true,
				children: [/* @__PURE__ */ _jsx(ListButton, {
					onClick: () => setLogout(true),
					children: /* @__PURE__ */ _jsxs("span", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ _jsx(LogOut, { className: "w-4 h-4" }), "Log out"]
					})
				}), /* @__PURE__ */ _jsx(ListButton, { children: /* @__PURE__ */ _jsxs("span", {
					className: "text-red-500 flex items-center gap-2",
					children: [/* @__PURE__ */ _jsx(Trash2, { className: "w-4 h-4" }), "Delete account"]
				}) })]
			}),
			/* @__PURE__ */ _jsx(Block, {
				className: "text-center text-xs opacity-40",
				children: "Vita 2.4.0 (318)"
			}),
			/* @__PURE__ */ _jsx(Dialog, {
				opened: logout,
				onBackdropClick: () => setLogout(false),
				title: "Log out?",
				content: "Your data stays in iCloud and comes back when you log in again.",
				buttons: /* @__PURE__ */ _jsxs(_Fragment, { children: [/* @__PURE__ */ _jsx(DialogButton, {
					onClick: () => setLogout(false),
					children: "Cancel"
				}), /* @__PURE__ */ _jsx(DialogButton, {
					strong: true,
					onClick: () => {
						setLogout(false);
						nav.reset("welcome");
					},
					children: "Log out"
				})] })
			})
		]
	});
}

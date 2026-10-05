# Konsta's whole kit — one working pattern each (OVL-01)

A top app is alive: things slide up, confirm, undo and open from the side. Use these where the screen's job calls
for them — at least one per screen that has an action. Overlays are closed at first render (`useState(false)`) and
opened by a tap; a **modal screen** is the exception: its Sheet is the screen and is drawn open.

**Feedback.** Every primary action answers: a `Toast` ("Saved · Undo"), a checked state, or `Confetti` for a win.
```jsx
const [toast, setToast] = useState(false)
const save = () => { setToast(true); setTimeout(() => setToast(false), 2200) }
<Toast position="center" opened={toast} className="bottom-24" button={<Button rounded clear small inline onClick={() => setToast(false)}>Undo</Button>}><div className="shrink">Walk logged · 3 today</div></Toast>
```

**Bottom sheet** — filters, pickers, quick add, details of a row. A grab handle on top.
```jsx
<Sheet className="pb-safe" opened={open} onBackdropClick={() => setOpen(false)}>
  <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/25" />
  <BlockTitle large>Filter</BlockTitle>
  <List strong inset>…</List>
  <Block><Button large rounded onClick={() => setOpen(false)}>Show 24 results</Button></Block>
</Sheet>
```

**Action sheet** — the choices behind a "…" button or a long press. Destructive last, in red.
```jsx
<Actions opened={more} onBackdropClick={() => setMore(false)}>
  <ActionsGroup><ActionsLabel>Morning run</ActionsLabel><ActionsButton bold onClick={…}>Edit</ActionsButton><ActionsButton onClick={…}>Share</ActionsButton><ActionsButton className="!text-red-500" onClick={…}>Delete</ActionsButton></ActionsGroup>
  <ActionsGroup><ActionsButton onClick={() => setMore(false)}>Cancel</ActionsButton></ActionsGroup>
</Actions>
```

**Dialog** — confirm what cannot be undone; never for information.
```jsx
<Dialog opened={ask} onBackdropClick={() => setAsk(false)} title="Delete this trip?" content="Your bookings stay in your email."
  buttons={<><DialogButton strong onClick={() => setAsk(false)}>Cancel</DialogButton><DialogButton className="!text-red-500" onClick={…}>Delete</DialogButton></>} />
```
(`strong` is a filled button: the safe choice gets it, the red one never does.)

**Drawer** — a side menu from the avatar or ☰: account, switch profile, settings, help. Never the main navigation (that is the tab bar).
```jsx
<Navbar large title="Home" left={<Link iconOnly onClick={() => setMenu(true)}><Avatar name="Aziza K" size={32} /></Link>} />
<Panel side="left" floating opened={menu} onBackdropClick={() => setMenu(false)}>
  <Page><Block className="flex items-center gap-3"><Avatar name="Aziza K" size={48} /><div><div className="text-headline">Aziza Karimova</div><div className="text-footnote opacity-60">Premium · 41-day streak</div></div></Block>
    <List strong inset><ListItem link title="Profile" media={<Tile tinted color={C.a}><User className="w-4 h-4" /></Tile>} linkProps={{ onClick: () => nav.push('profile') }} />…</List>
  </Page>
</Panel>
```

**Popover** — a small menu anchored to its button (sort, view options).
```jsx
<Link className="sort-link" onClick={() => setPop(true)}>Sort</Link>
<Popover opened={pop} target=".sort-link" onBackdropClick={() => setPop(false)}><List nested>{['Newest', 'Price', 'Rating'].map((o) => <ListItem key={o} title={o} onClick={() => { setSort(o); setPop(false) }} after={sort === o ? <Check className="w-4 h-4 text-primary" /> : null} />)}</List></Popover>
```

**Popup** — a full-screen task over the screen (compose, camera, a long form).
```jsx
<Popup opened={compose} onBackdropClick={() => setCompose(false)}><Page><Navbar title="New post" left={<Link onClick={() => setCompose(false)}>Cancel</Link>} right={<Link onClick={…}>Post</Link>} />…</Page></Popup>
```

**Notification** — an in-app banner from the top (a friend cheered, an order is near).
```jsx
<Notification opened={note} icon={<Tile color={C.a} size={22}>🐶</Tile>} title="Pawfolio" titleRightText="now" subtitle="Milo's walk" text="Time for the evening walk" onClick={() => setNote(false)} />
```

**FAB** — the create action of a list or feed tab: an icon only (with text Konsta draws it in capitals), above the tab bar, and the page ends with room for it (`Page className="pb-40"`).
```jsx
<Fab className="fixed right-4 bottom-24 z-20" icon={<Plus className="w-6 h-6" />} onClick={() => nav.push('add-trip')} />
```

**Search and segments under a large title**
```jsx
<Navbar large transparent title="Recipes" subnavbar={<Searchbar placeholder="Search recipes" value={q} onInput={(e) => setQ(e.target.value)} onClear={() => setQ('')} disableButton />} />
<Segmented strong rounded>{['Day', 'Week', 'Month'].map((p) => <SegmentedButton key={p} rounded active={range === p} onClick={() => setRange(p)}>{p}</SegmentedButton>)}</Segmented>
```

**Filters** — chips that scroll sideways (more than four choices).
```jsx
<div className="flex gap-2 overflow-x-auto px-4 pb-1">{CATS.map((c) => <Chip key={c} outline={cat !== c} media={<span>{EMOJI[c]}</span>} onClick={() => setCat(c)}>{c}</Chip>)}</div>
```

**Controls in rows**
```jsx
<List strong inset>
  <ListItem title="Reminders" after={<Toggle checked={on} onChange={() => setOn(!on)} />} />
  <ListItem title="Portions" after={<Stepper value={n} rounded small onMinus={() => setN(Math.max(1, n - 1))} onPlus={() => setN(n + 1)} />} />
  <ListItem label title="Vegetarian" media={<Checkbox checked={veg} onChange={() => setVeg(!veg)} />} />
  <ListItem label title="Card ···· 4242" media={<Radio checked={pay === 'card'} onChange={() => setPay('card')} />} />
</List>
<Block><Range value={budget} min={0} max={500} step={10} onChange={(e) => setBudget(+e.target.value)} /></Block>
```

**Forms** — labelled inputs in one inset group.
```jsx
<List strong inset><ListInput label="Name" type="text" placeholder="Milo" value={name} onChange={(e) => setName(e.target.value)} /><ListInput label="Birthday" type="date" value={date} onChange={(e) => setDate(e.target.value)} /><ListInput label="Notes" type="textarea" placeholder="Allergies, habits…" /></List>
```

**Chat**
```jsx
<Messages><MessagesTitle>Today 9:41</MessagesTitle><Message type="received" name="Dr. Lee" text="Milo's results look great." avatar={<Avatar name="Dr Lee" size={32} />} /><Message type="sent" text="Thank you! 🐾" /></Messages>
<Messagebar placeholder="Message" value={msg} onInput={(e) => setMsg(e.target.value)} right={<Link iconOnly onClick={send}><Send className="w-5 h-5" /></Link>} />
```

**Also in Konsta**: `Card header footer` (a titled card), `MenuList`/`MenuListItem active` (a picked option list), `Table`/`TableHead`/`TableRow header`/`TableCell header` (plans, splits, stats), `Progressbar progress={0.6}`, `Preloader`, `Badge`, `Glass highlight` (an iOS 26 glass surface over a photo), `Toolbar` + `ToolbarPane` (a bottom bar of tools on a push screen), `Button tonal | outline | clear | small | large | rounded`.

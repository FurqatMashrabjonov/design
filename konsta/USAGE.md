# Konsta the HIG way — right and wrong (HIG-13)

Each card: the rule, the right JSX, the wrong one. The lint fixes some of these in code; write them right anyway.

**Rows live in a List.** A `ListItem` alone renders as bare text.
✓ `<List strong inset><ListItem title="Water" after="1.5 L" /></List>`
✗ `<Block><ListItem title="Water" /></Block>`

**A title names the group under it, as its sibling.**
✓ `<BlockTitle>Today</BlockTitle><List strong inset>…</List>`
✗ `<Block><BlockTitle>Today</BlockTitle>…</Block>` (it overlaps the card)

**A group is one surface.** A `List` or `Card` is already a card; a `Block` around it doubles the inset.
✓ `<Card>…</Card>` · ✓ `<List strong inset>…</List>`
✗ `<Block><Card>…</Card></Block>` · ✗ `<Block strong><List>…</List></Block>`

**One or two prominent actions.** The rest are quieter.
✓ `<Button large rounded>Start</Button>` + `<Button clear>Later</Button>`
✗ three `<Button large>` in a row

**A chevron only on what opens something.**
✓ `<ListItem link title="Account" onClick={() => nav.push('account')} />`
✗ `<ListItem title="Version" after={<ChevronRight />} />`

**Segmented is for 2–4 short choices.**
✓ `<Segmented strong rounded>` Day · Week · Month
✗ six options, or long labels — use `<div className="flex gap-2 overflow-x-auto px-4">` of `<Chip>`s

**Controls sit in a row's `after`.**
✓ `<ListItem title="Reminders" after={<Toggle checked={on} onChange={() => setOn(!on)} />} />`
✗ a `Toggle` on its own line under the row

**Search belongs under the title.**
✓ `<Navbar large title="Words" subnavbar={<Searchbar … />} />`
✗ a `Searchbar` in the navbar's `right`

**Overlays start closed.**
✓ `<Sheet opened={open} onBackdropClick={() => setOpen(false)}>` with `useState(false)`
✗ `<Sheet opened>` at first render — except on a modal screen, where the open Sheet is the screen

**Create on a list is a Fab or a navbar button, not a big button in the flow.**
✓ `<Fab className="fixed right-4 bottom-24" icon={<Plus />} onClick={…} />` on a tab screen
✗ `<Button large>Add habit</Button>` between the rows

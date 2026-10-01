import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, Link, Button, Chip, Toast, Actions, ActionsGroup, ActionsButton, ActionsLabel } from 'konsta/react'
import { MapPin, Calendar, CreditCard, Tag, Navigation, CheckCircle2, Camera, Share, Users, Flag, Receipt } from 'lucide-react'
import { useNav, Photo, Tile, tint } from '@od/kit'

const C = {"income":"#f59e0b","software":"#8b5cf6","workspace":"#ef4444","food":"#06b6d4","travel":"#ec4899","transport":"#84cc16"}

const TX = {
  merchant: 'Café Kitsuné Palais Royal',
  emoji: '☕',
  category: 'Food & drink',
  color: C.food,
  amount: '−€8.40',
  date: 'Today, Thu 1 Oct 2026',
  time: '09:12',
  card: 'Black metal •• 0937',
  address: '51 Galerie de Montpensier',
  city: '75001 Paris',
  map: 'Palais Royal garden Paris',
}
const RECEIPT = [
  { name: 'Flat white', price: '€4.80' },
  { name: 'Croissant', price: '€3.60' },
]

export default function Screen() {
  const nav = useNav()
  const [attached, setAttached] = useState(false)
  const [toast, setToast] = useState(false)
  const [report, setReport] = useState(false)

  const attach = () => {
    setAttached(true)
    setToast(true)
    setTimeout(() => setToast(false), 2000)
  }

  return (
    <Page className="pb-40">
      <Navbar
        title="Transaction"
        left={<NavbarBackLink showText={false} onClick={nav.pop} />}
        right={<Link iconOnly><Share className="w-6 h-6" /></Link>}
      />

      <div className="px-4 pt-4 vs-rise">
        <Photo q={TX.map} className="w-full h-44 rounded-card overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center -mt-4">
              <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center shadow-lg ring-4 ring-white/80">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="w-2 h-2 rounded-full bg-black/40 mt-1" />
            </div>
          </div>
        </Photo>
        <div className="flex flex-col items-center -mt-8 relative">
          <div className="rounded-2xl bg-card p-1 shadow-md">
            <Tile color={TX.color} tinted size={56}><span className="text-3xl">{TX.emoji}</span></Tile>
          </div>
          <div className="text-headline mt-3 text-center truncate max-w-full">{TX.merchant}</div>
          <div className="text-figure mt-1">{TX.amount}</div>
          <div className="text-footnote text-black/55 dark:text-white/55 mt-1">{TX.date} · {TX.time}</div>
        </div>
      </div>

      <BlockTitle>Details</BlockTitle>
      <List strong inset dividers>
        <ListItem
          title="Date and time"
          after={`Thu 1 Oct, ${TX.time}`}
          media={<Tile color="#8e8e93"><Calendar className="w-4 h-4" /></Tile>}
        />
        <ListItem
          link
          title="Card"
          after={TX.card}
          media={<Tile color="#1c1c1e"><CreditCard className="w-4 h-4" /></Tile>}
          onClick={() => nav.push('card-detail')}
        />
        <ListItem
          title="Category"
          media={<Tile color={TX.color}><Tag className="w-4 h-4" /></Tile>}
          after={
            <Chip className="!m-0" style={{ background: tint(TX.color, 18) }}>
              <span className="flex items-center gap-1.5 text-footnote font-semibold">
                <span className="w-2 h-2 rounded-full" style={{ background: TX.color }} />
                {TX.category}
              </span>
            </Chip>
          }
        />
        <ListItem
          title="Address"
          subtitle={`${TX.address}, ${TX.city}`}
          media={<Tile color="#0a84ff"><Navigation className="w-4 h-4" /></Tile>}
        />
        <ListItem
          title="Status"
          media={<Tile color="#30d158"><CheckCircle2 className="w-4 h-4" /></Tile>}
          after={<span className="text-subhead font-semibold text-green-600 dark:text-green-400">Completed</span>}
        />
      </List>

      <BlockTitle>Receipt</BlockTitle>
      <List strong inset dividers>
        {RECEIPT.map((r) => (
          <ListItem key={r.name} title={r.name} after={<span className="text-body">{r.price}</span>} />
        ))}
        <ListItem
          title={<span className="text-black/55 dark:text-white/55">VAT 10%</span>}
          after={<span className="text-black/55 dark:text-white/55">€0.76</span>}
        />
        <ListItem
          title={<span className="text-headline">Total</span>}
          after={<span className="text-headline">€8.40</span>}
        />
      </List>
      <Block className="!mt-2">
        {attached ? (
          <div className="flex items-center gap-3 rounded-card bg-card p-3 vs-bounce">
            <Photo q="cafe paper receipt" className="w-14 h-14 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <div className="text-headline truncate">Receipt photo</div>
              <div className="text-footnote text-black/55 dark:text-white/55">Attached · ready for your accountant</div>
            </div>
            <Receipt className="w-5 h-5 text-primary" />
          </div>
        ) : (
          <Button tonal rounded onClick={attach}>
            <span className="flex items-center gap-2"><Camera className="w-5 h-5" /> Attach receipt photo</span>
          </Button>
        )}
      </Block>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-line px-4 pt-3 pb-8 flex gap-3 z-20">
        <Button large rounded tonal className="flex-1" onClick={() => setReport(true)}>
          <span className="flex items-center gap-2"><Flag className="w-5 h-5" /> Report</span>
        </Button>
        <Button large rounded className="flex-[1.4]" onClick={() => nav.push('send-money')}>
          <span className="flex items-center gap-2"><Users className="w-5 h-5" /> Split bill</span>
        </Button>
      </div>

      <Actions opened={report} onBackdropClick={() => setReport(false)}>
        <ActionsGroup>
          <ActionsLabel>Report a problem with {TX.merchant}</ActionsLabel>
          <ActionsButton onClick={() => setReport(false)}>Wrong amount charged</ActionsButton>
          <ActionsButton onClick={() => setReport(false)}>Charged twice</ActionsButton>
          <ActionsButton onClick={() => setReport(false)} className="!text-red-500">I don't recognise this payment</ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setReport(false)}>Cancel</ActionsButton>
        </ActionsGroup>
      </Actions>

      <Toast opened={toast} position="center">Receipt attached</Toast>
    </Page>
  )
}

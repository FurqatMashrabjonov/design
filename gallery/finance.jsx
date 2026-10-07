import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, Button, Sheet, List, ListItem } from 'konsta/react'
import { AppTabbar, Donut, BankCard, AmountPad, Avatar } from '@od/kit'
const SPEND = [{ label: 'Rent', value: 1500 }, { label: 'Groceries', value: 382 }, { label: 'Dining out', value: 214 }, { label: 'Transport', value: 126 }, { label: 'Fun', value: 98 }]
export default function Screen() {
  const [send, setSend] = useState(false)
  const [amount, setAmount] = useState('0')
  return (
    <Page className="pb-32">
      <Navbar large title="Finance" />
      <BlockTitle className="!mb-2">Bank card</BlockTitle>
      <div className="px-4 mt-3"><BankCard label="Everyday" balance={4218.56} name="Maya Chen" number="4921 6610 2283 4821" expiry="09/29" brand="visa" color="#1d4ed8" color2="#7c3aed" /></div>
      <BlockTitle>Spending · October</BlockTitle>
      <Block strong inset>
        <Donut segments={SPEND} legend currency="$">
          <div className="text-caption1 opacity-60">Spent</div>
          <div className="text-title1 font-bold tabular-nums">$2,320</div>
          <div className="text-caption1 opacity-60">of $3,150</div>
        </Donut>
      </Block>
      <Block><Button large rounded onClick={() => setSend(true)}>Send money</Button></Block>
      <Sheet className="pb-safe" opened={send} onBackdropClick={() => setSend(false)}>
        <div className="flex items-center gap-3 px-4 pt-4"><Avatar name="Sam Lee" photo="portrait smiling young man" size={40} /><div><div className="text-headline">Sam Lee</div><div className="text-footnote opacity-60">@samlee</div></div></div>
        <AmountPad value={amount} onChange={setAmount} note="From Everyday · $4,218.56" />
        <Block className="!mb-4"><Button large rounded disabled={amount === '0'} onClick={() => setSend(false)}>Send ${amount}</Button></Block>
      </Sheet>
      <AppTabbar active="finance" />
    </Page>
  )
}

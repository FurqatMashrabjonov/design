import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, Button } from 'konsta/react'
import { useNav, WaterGlass, CountUp } from '@od/kit'

const LOG = [
  { time: '07:40', amount: 250 },
  { time: '09:15', amount: 500 },
  { time: '12:30', amount: 250 },
  { time: '15:05', amount: 500 },
]

export default function Screen() {
  const nav = useNav()
  const current = 1500
  const goal = 2500
  const progress = current / goal

  return (
    <Page>
      <Navbar title="Water" left={<NavbarBackLink showText={false} onClick={nav.pop} />} />
      
      <Block className="flex flex-col items-center justify-center py-12">
        <div className="mb-8">
          <WaterGlass value={progress} color="#0a84ff" />
        </div>
        <div className="text-center text-[28px] font-semibold mb-2">
          <CountUp to={current} format={(n) => `${n.toLocaleString()}`} /> / {goal.toLocaleString()} ml
        </div>
        <div className="text-[13px] opacity-70">
          {goal - current} ml to goal
        </div>
      </Block>

      <Block className="flex gap-3">
        <Button large rounded className="flex-1" onClick={() => {}}><span className="text-[15px]">+ 250 ml</span></Button>
        <Button large rounded className="flex-1" tonal onClick={() => {}}><span className="text-[15px]">+ 500 ml</span></Button>
      </Block>

      <BlockTitle>Today's log</BlockTitle>
      <List strong inset dividers>
        {LOG.map((entry, idx) => (
          <ListItem key={idx} title={entry.time} after={<span className="text-[15px] opacity-60">{entry.amount} ml</span>} />
        ))}
      </List>
    </Page>
  )
}

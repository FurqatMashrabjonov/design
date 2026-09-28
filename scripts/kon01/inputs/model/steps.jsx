import { useState } from 'react'
import { Page, Navbar, Link, Block, BlockTitle, List, ListItem } from 'konsta/react'
import { ChevronLeft } from 'lucide-react'
import { useNav, Ring, Bars, Tile } from '@od/kit'

export default function Screen() {
  const nav = useNav()
  
  const stepsToday = 7843
  const stepsGoal = 10000
  const weekSteps = [6210, 9120, 10432, 5480, 11206, 8120, 7843]
  const distance = 5.8
  const kcal = 312
  const activeMin = 64
  const bestDay = 11206
  
  return (
    <Page>
      <Navbar title="Steps" left={<Link iconOnly onClick={nav.pop}><ChevronLeft className="w-6 h-6" /></Link>} />
      
      <Block className="!mt-8 flex flex-col items-center">
        <div className="flex flex-col items-center">
          <Ring value={stepsToday / stepsGoal} size={160} stroke={12} color="#ff9f0a">
            <div className="text-center">
              <div className="text-4xl font-semibold">{stepsToday.toLocaleString()}</div>
              <div className="text-[13px] opacity-70 mt-1">{stepsGoal.toLocaleString()} goal</div>
            </div>
          </Ring>
        </div>
      </Block>

      <Block className="!mt-8">
        <BlockTitle>This week</BlockTitle>
        <Bars values={weekSteps} goal={stepsGoal} color="#ff9f0a" labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} height={120} highlight={6} />
      </Block>

      <Block className="!mt-6 grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center">
          <Tile color="#ff9f0a" size={40}>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" /></svg>
          </Tile>
          <div className="text-[13px] font-semibold mt-2">{distance} km</div>
          <div className="text-[12px] opacity-70">Distance</div>
        </div>
        <div className="flex flex-col items-center">
          <Tile color="#ff9f0a" size={40}>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" /></svg>
          </Tile>
          <div className="text-[13px] font-semibold mt-2">{kcal}</div>
          <div className="text-[12px] opacity-70">kcal</div>
        </div>
        <div className="flex flex-col items-center">
          <Tile color="#ff9f0a" size={40}>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" /></svg>
          </Tile>
          <div className="text-[13px] font-semibold mt-2">{activeMin} min</div>
          <div className="text-[12px] opacity-70">Active</div>
        </div>
      </Block>

      <Block className="flex items-center gap-2 text-[13px] opacity-60">
        <span>Best day this week: {bestDay.toLocaleString()} steps</span>
      </Block>
    </Page>
  )
}

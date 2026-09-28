import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Link, Badge, Button } from 'konsta/react'
import { Settings, HelpCircle, Bell, Palette, Crown, LogOut } from 'lucide-react'
import { useNav, AppTabbar, Avatar } from '@od/kit'

const AWARDS = [
  { name: 'Early Bird', description: 'Five morning runs before 7 AM this month' },
  { name: 'Consistent', description: 'Completed 90% of habits for 2 weeks straight' },
  { name: 'Hydrated', description: 'Reached daily water goal 30 days in a row' },
]

export default function Screen() {
  const nav = useNav()
  
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Profile" />
      
      <Block className="flex flex-col items-center gap-3 pt-6">
        <Avatar name="AK" color="#ff9f0a" size={64} />
        <div className="text-center">
          <div className="text-[17px] font-semibold">Aziza Karimova</div>
          <div className="text-[13px] opacity-70">Tashkent · Joined March 2026</div>
        </div>
      </Block>

      <Block className="flex justify-around pt-6">
        <div className="flex flex-col items-center gap-1">
          <div className="text-[17px] font-semibold">41</div>
          <div className="text-[13px] opacity-70">Day streak</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="text-[17px] font-semibold">6</div>
          <div className="text-[13px] opacity-70">Habits</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="text-[17px] font-semibold">3</div>
          <div className="text-[13px] opacity-70">Awards</div>
        </div>
      </Block>

      <BlockTitle>Awards</BlockTitle>
      <List strong inset dividers>
        {AWARDS.map((award) => (
          <ListItem key={award.name} title={award.name}
            subtitle={<span className="text-[13px] opacity-70">{award.description}</span>} />
        ))}
      </List>

      <BlockTitle>Account</BlockTitle>
      <List strong inset dividers>
        <ListItem link linkProps={{ onClick: () => nav.push('settings') }} title="Settings" after={<ChevronRight className="w-5 h-5 opacity-50" />} media={<Settings className="w-5 h-5 text-primary" />} />
        <ListItem link linkProps={{ onClick: () => nav.push('inbox') }} title="Notifications" after={<ChevronRight className="w-5 h-5 opacity-50" />} media={<Bell className="w-5 h-5 text-primary" />} />
        <ListItem link linkProps={{ onClick: () => {} }} title="Appearance" after={<ChevronRight className="w-5 h-5 opacity-50" />} media={<Palette className="w-5 h-5 text-primary" />} />
      </List>

      <BlockTitle>Help &amp; More</BlockTitle>
      <List strong inset dividers>
        <ListItem link linkProps={{ onClick: () => nav.push('settings') }} title="Premium"
          after={<Badge colors={{ bg: 'bg-primary', text: 'text-white' }} small>Upgrade</Badge>}
          media={<Crown className="w-5 h-5 text-primary" />} />
        <ListItem link linkProps={{ onClick: () => nav.push('settings') }} title="Help & Support" after={<ChevronRight className="w-5 h-5 opacity-50" />} media={<HelpCircle className="w-5 h-5 text-primary" />} />
      </List>

      <Block className="mt-8 flex justify-center">
        <Button clear onClick={() => {}} className="text-red-500"><LogOut className="w-5 h-5 mr-2" />Sign out</Button>
      </Block>

      <AppTabbar active="profile" />
    </Page>
  )
}

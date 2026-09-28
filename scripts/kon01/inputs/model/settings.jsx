import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, Toggle, Dialog, DialogButton } from 'konsta/react'
import { useNav } from '@od/kit'

export default function Screen() {
  const nav = useNav()
  const [reminders, setReminders] = useState(true)
  const [dailySummary, setDailySummary] = useState(true)
  const [streakAlerts, setStreakAlerts] = useState(true)
  const [sound, setSound] = useState(false)
  const [deleteDialogOpened, setDeleteDialogOpened] = useState(false)

  return (
    <Page>
      <Navbar title="Settings" left={<NavbarBackLink showText={false} onClick={nav.pop} />} />

      <BlockTitle>Notifications</BlockTitle>
      <List strong inset dividers>
        <ListItem title="Reminders" after={<Toggle checked={reminders} onChange={() => setReminders(!reminders)} />} />
        <ListItem title="Daily summary" after={<Toggle checked={dailySummary} onChange={() => setDailySummary(!dailySummary)} />} />
        <ListItem title="Streak alerts" after={<Toggle checked={streakAlerts} onChange={() => setStreakAlerts(!streakAlerts)} />} />
        <ListItem title="Sound" after={<Toggle checked={sound} onChange={() => setSound(!sound)} />} />
      </List>

      <BlockTitle>Preferences</BlockTitle>
      <List strong inset dividers>
        <ListItem title="Units" after={<span className="text-[15px] opacity-60">Metric</span>} />
        <ListItem title="Week starts" after={<span className="text-[15px] opacity-60">Monday</span>} />
        <ListItem title="Appearance" after={<span className="text-[15px] opacity-60">Light</span>} />
      </List>

      <BlockTitle>Accent colour</BlockTitle>
      <List strong inset dividers>
        <ListItem title="Indigo" after={<span className="text-[15px] text-primary">Selected</span>} />
      </List>

      <BlockTitle>Subscription</BlockTitle>
      <List strong inset dividers>
        <ListItem title="Premium" after={<span className="text-[15px] opacity-60">Free</span>} />
      </List>

      <BlockTitle>Danger zone</BlockTitle>
      <List strong inset dividers>
        <ListItem title="Delete account" titleClass="text-red-500" link linkProps={{ onClick: () => setDeleteDialogOpened(true) }} />
      </List>

      <Block className="text-center text-[13px] opacity-60 mt-8">
        Version 1.0.0
      </Block>

      <Dialog title="Delete account" opened={deleteDialogOpened} onBackdropClick={() => setDeleteDialogOpened(false)}
        content={<div className="text-[15px] p-4">Are you sure? This cannot be undone.</div>}
        buttons={
          <>
            <DialogButton onClick={() => setDeleteDialogOpened(false)}>Cancel</DialogButton>
            <DialogButton strong onClick={() => setDeleteDialogOpened(false)}>Delete</DialogButton>
          </>
        } />
    </Page>
  )
}

import { Page, Navbar, Block, Button } from 'konsta/react'
import { AppTabbar, Ticket } from '@od/kit'
export default function Screen() {
  return (
    <Page className="pb-32">
      <Navbar large title="Your trip" />
      <Ticket from={{ code: 'LIS', city: 'Lisbon', time: '09:40' }} to={{ code: 'OPO', city: 'Porto', time: '10:35' }}
        rows={[{ label: 'Passenger', value: 'Maya Chen' }, { label: 'Flight', value: 'TP 1942' }, { label: 'Date', value: 'Fri, Oct 16' }, { label: 'Gate', value: 'B12' }, { label: 'Seat', value: '14A' }, { label: 'Boards', value: '09:05' }]}
        code="SS-BKG-7Q2M-LIS-OPO-14A" />
      <Block className="!mt-6"><Button large rounded>Add to Wallet</Button></Block>
      <AppTabbar active="ticket" />
    </Page>
  )
}

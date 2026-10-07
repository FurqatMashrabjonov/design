import { Page, Navbar, Block, BlockTitle, List, ListItem } from 'konsta/react'
import { AppTabbar, LiveETA, RouteMap } from '@od/kit'
export default function Screen() {
  return (
    <Page className="pb-32">
      <Navbar large title="On its way" />
      <Block strong inset className="!p-2"><RouteMap seed="saffron" progress={0.64} pins={[{ label: 'Saffron House', kind: 'start' }, { label: 'Home', kind: 'end' }]} /></Block>
      <LiveETA minutes={12} progress={0.66} status="Arriving at 19:42" courier={{ name: 'Ravi Patel', photo: 'portrait smiling man helmet courier', vehicle: 'E-bike · 1.2 km away' }} />
      <BlockTitle>Your order</BlockTitle>
      <List strong inset>
        <ListItem title="Chicken shawarma bowl" after="$11.90" />
        <ListItem title="Mint lemonade" after="$3.90" />
      </List>
      <AppTabbar active="tracking" />
    </Page>
  )
}

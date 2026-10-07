import { Page, Navbar } from 'konsta/react'
import { AppTabbar, FeedPost } from '@od/kit'
export default function Screen() {
  return (
    <Page className="pb-32">
      <Navbar large title="Feed" />
      <div className="space-y-4">
        <FeedPost author={{ name: 'Aziza Karimova', photo: 'portrait smiling young woman headscarf' }} time="Morning run · 2h ago" photo="runner sunrise city bridge" text="Golden hour along the river — first sub-5 pace this month!" likes={128} comments={14} stats={[{ label: 'Distance', value: '8.2 km' }, { label: 'Pace', value: '4:58 /km' }, { label: 'Time', value: '40:43' }]} />
        <FeedPost author={{ name: 'Sam Lee', photo: 'portrait smiling young man' }} time="Yesterday" photo="trail running forest" text="Hill repeats with the club. Legs = jelly." likes={86} comments={9} />
      </div>
      <AppTabbar active="feed" />
    </Page>
  )
}

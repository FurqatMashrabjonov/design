import { Page, Block, BlockTitle, List, ListItem, Button } from 'konsta/react'
import { Share, Heart, Wifi, Car, Waves } from 'lucide-react'
import { AppTabbar, CollapsingHeader, Rating, Avatar } from '@od/kit'
export default function Screen() {
  return (
    <Page className="pb-32">
      <CollapsingHeader photo="cliffside villa ocean sunset" title="Casa Alma" subtitle="Lagos, Portugal · Entire villa" onBack={() => {}} actions={[<Share key="s" className="w-5 h-5" />, <Heart key="h" className="w-5 h-5" />]}>
        <div className="mt-2"><Rating value={4.92} count={318} /></div>
      </CollapsingHeader>
      <Block strong inset className="!mt-4">
        <div className="text-headline">Hosted by Inês</div>
        <div className="text-subhead opacity-60 mt-1">6 guests · 3 bedrooms · 4 beds · 2 baths</div>
      </Block>
      <BlockTitle>What this place offers</BlockTitle>
      <List strong inset>
        <ListItem title="Fast wifi" media={<Wifi className="w-5 h-5" />} />
        <ListItem title="Free parking" media={<Car className="w-5 h-5" />} />
        <ListItem title="Private pool" media={<Waves className="w-5 h-5" />} />
      </List>
      <Block strong inset><div className="text-body opacity-80">A white villa above the cliffs of Ponta da Piedade, with a pool that faces the sunset and a path down to a quiet cove. Ten minutes on foot to the old town.</div></Block>
      <BlockTitle>Reviews</BlockTitle>
      <List strong inset>
        {[['Clara', 'portrait smiling woman curly hair', 'The sunsets from the pool are unreal. Spotless and quiet.'], ['Tom', 'portrait man beard glasses', 'Perfect base for Lagos — walked to the beach every morning.'], ['Yuki', 'portrait young woman bob haircut', 'Inês left us fresh bread and a map of the coves. Lovely.']].map(([n, ph, t]) => (
          <ListItem key={n} title={n} text={t} media={<Avatar name={n} photo={ph} size={40} />} />
        ))}
      </List>
      <Block><Button large rounded>Reserve · €286 night</Button></Block>
      <AppTabbar active="stay" />
    </Page>
  )
}

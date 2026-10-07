import { Page, Navbar, Block, BlockTitle, Segmented, SegmentedButton } from 'konsta/react'
import { AppTabbar, BreathTimer } from '@od/kit'
export default function Screen() {
  return (
    <Page className="pb-32">
      <Navbar large title="Breathe" />
      <Block className="!my-2"><Segmented strong rounded><SegmentedButton rounded active>Calm</SegmentedButton><SegmentedButton rounded>Focus</SegmentedButton><SegmentedButton rounded>Sleep</SegmentedButton></Segmented></Block>
      <div className="py-6"><BreathTimer inhale={4} hold={4} exhale={6} rounds={6} /></div>
      <BlockTitle>Why it works</BlockTitle>
      <Block strong inset><div className="text-subhead opacity-75">A longer breath out slows your heart rate and tells your body it is safe to rest. Six rounds take about a minute and a half.</div></Block>
      <AppTabbar active="breathe" />
    </Page>
  )
}

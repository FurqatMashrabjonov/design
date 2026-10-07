import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, Button, Toast } from 'konsta/react'
import { AppTabbar, Photo, SizePicker, SwatchPicker, Rating } from '@od/kit'
export default function Screen() {
  const [size, setSize] = useState('9')
  const [added, setAdded] = useState(false)
  return (
    <Page className="pb-32">
      <Navbar title="Aero Run 2" left={<NavbarBackLink showText={false} onClick={() => {}} />} />
      <Photo q="white running sneaker studio" className="w-full aspect-square" />
      <Block className="!mt-4"><div className="text-title2 font-bold">Aero Run 2</div><div className="flex items-center justify-between mt-1"><Rating value={4.7} count={1284} /><div className="text-title3 font-bold">$148</div></div></Block>
      <SwatchPicker colors={[{ name: 'Chalk', color: '#ece7de' }, { name: 'Midnight', color: '#1d2433' }, { name: 'Volt', color: '#d8f34a' }, { name: 'Coral', color: '#ff7a6b' }]} />
      <BlockTitle className="!mb-2">Size (US)</BlockTitle>
      <SizePicker value={size} onChange={setSize} sizes={['7', '7.5', '8', { label: '8.5', soldOut: true }, '9', '9.5', '10', { label: '11', soldOut: true }]} />
      <Block className="!mt-6"><Button large rounded onClick={() => setAdded(true)}>Add to bag · US {size}</Button></Block>
      <Toast opened={added}>Added Aero Run 2 · US {size}</Toast>
      <AppTabbar active="product" />
    </Page>
  )
}

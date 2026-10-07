import { useState } from 'react'
import { Page, Navbar } from 'konsta/react'
import { AppTabbar, PriceMap, Photo, Rating } from '@od/kit'
const STAYS = [
  { id: 'alma', price: 286, name: 'Casa Alma', photo: 'cliffside villa ocean sunset', rating: 4.92 },
  { id: 'mare', price: 164, name: 'Casa Maré', photo: 'white house blue door portugal', rating: 4.81 },
  { id: 'sol', price: 212, name: 'Quinta do Sol', photo: 'farmhouse pool olive trees', rating: 4.88 },
  { id: 'luz', price: 129, name: 'Luz Loft', photo: 'bright loft apartment', rating: 4.7 },
  { id: 'ria', price: 345, name: 'Ria Villa', photo: 'modern villa infinity pool', rating: 4.95 },
]
export default function Screen() {
  const [pick, setPick] = useState('alma')
  const s = STAYS.find((x) => x.id === pick)
  return (
    <Page className="pb-32">
      <Navbar large title="Map" />
      <div className="px-4">
        <PriceMap pins={STAYS.map((x) => ({ id: x.id, price: x.price }))} currency="€" value={pick} onSelect={setPick} height={460} seed="lagos">
          <div className="flex gap-3 items-center rounded-2xl bg-card p-2.5 shadow-lg">
            <Photo q={s.photo} className="w-20 h-20 rounded-xl" />
            <div className="min-w-0"><div className="text-headline truncate">{s.name}</div><Rating value={s.rating} /><div className="text-subhead mt-1"><b>€{s.price}</b> night</div></div>
          </div>
        </PriceMap>
      </div>
      <AppTabbar active="map" />
    </Page>
  )
}

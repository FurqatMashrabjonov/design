import { Page, Navbar, List, ListItem } from 'konsta/react'
import { Plus } from 'lucide-react'
import { AppTabbar, MenuSections, Photo } from '@od/kit'
const MENU = {
  Popular: [{ name: 'Chicken shawarma bowl', photo: 'spiced chicken rice bowl', price: 11.9 }, { name: 'Falafel wrap', photo: 'falafel wrap', price: 9.5 }],
  Bowls: [{ name: 'Halloumi grain bowl', photo: 'halloumi grain bowl', price: 12.4 }, { name: 'Lamb kofta bowl', photo: 'kofta rice bowl', price: 13.9 }, { name: 'Vegan mezze bowl', photo: 'mezze bowl hummus', price: 11.5 }],
  Wraps: [{ name: 'Beef shawarma wrap', photo: 'beef shawarma wrap', price: 10.9 }, { name: 'Halloumi wrap', photo: 'grilled halloumi wrap', price: 9.9 }],
  Sides: [{ name: 'Hummus & pita', photo: 'hummus pita bread', price: 5.5 }, { name: 'Loaded fries', photo: 'loaded fries', price: 6.2 }],
  Drinks: [{ name: 'Mint lemonade', photo: 'mint lemonade', price: 3.9 }, { name: 'Ayran', photo: 'yogurt drink glass', price: 2.9 }],
}
export default function Screen() {
  return (
    <Page className="pb-32">
      <Navbar title="Juniper Kitchen" />
      <MenuSections sections={Object.entries(MENU).map(([title, items]) => ({ id: title.toLowerCase(), title, content: (
        <List strong inset className="!my-0">
          {items.map(({ name, photo, price }) => (
            <ListItem key={name} title={name} subtitle={`$${price.toFixed(2)}`} media={<Photo q={photo} className="w-16 h-16 rounded-xl" />}
              after={<button type="button" aria-label={`Add ${name}`} className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center"><Plus className="w-4 h-4" /></button>} />
          ))}
        </List>
      ) }))} />
      <AppTabbar active="menu" />
    </Page>
  )
}

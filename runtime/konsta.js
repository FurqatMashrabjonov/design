// konsta/react as a screen imports it, with one repair that has a single right answer: a `link` row
// already draws its chevron, so a ChevronRight the model also put in `after` is dropped (a doubled chevron
// was the judge's most frequent complaint).
import { createElement, forwardRef } from 'react'
import { ListItem as KonstaListItem } from 'konsta/react'
export * from 'konsta/react'

const isChevron = (node) => /^Chevron(Right)?$/.test(node?.type?.displayName ?? '')
export const ListItem = forwardRef(function ListItem(props, ref) {
  return createElement(KonstaListItem, { ...props, ref, after: props.link && isChevron(props.after) ? undefined : props.after })
})

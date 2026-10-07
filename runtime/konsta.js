// konsta/react as a screen imports it, with one repair that has a single right answer: a `link` row
// already draws its chevron, so a ChevronRight the model also put in `after` is dropped (a doubled chevron
// was the judge's most frequent complaint).
import { createElement, forwardRef } from 'react'
import { ListItem as KonstaListItem } from 'konsta/react'
export * from 'konsta/react'

const isChevron = (node) => /^Chevron(Right)?$/.test(node?.type?.displayName ?? '')
// FUN-02: a control inside a row that opens something (a Checkbox or a ⋯ button in `after`) is its own tap: the row
// does not open as well. Stopping the event in the control's onChange was not enough — Konsta's checkbox click still
// reached the row, and ticking a habit opened its detail.
const CONTROL = 'input, button, label, select, textarea, [role="button"], [role="checkbox"], [role="switch"], .k-checkbox, .k-toggle, .k-radio, .k-stepper'
const guard = (fn) => (typeof fn === 'function' ? (e) => {
  const hit = e?.target?.closest?.(CONTROL)
  if (hit && hit !== e.currentTarget && e.currentTarget?.contains?.(hit)) return
  return fn(e)
} : fn)
export const ListItem = forwardRef(function ListItem(props, ref) {
  const linkProps = props.linkProps?.onClick ? { ...props.linkProps, onClick: guard(props.linkProps.onClick) } : props.linkProps
  return createElement(KonstaListItem, { ...props, ref, onClick: guard(props.onClick), linkProps, after: props.link && isChevron(props.after) ? undefined : props.after })
})

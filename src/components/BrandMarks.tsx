import type { SVGProps } from 'react'

// The marks of the tools an export goes to, in their own colours and never altered (their brand rules ask for
// that): they make "Copy to Figma" and "React project" findable at a glance. Everything else in a menu keeps a
// monochrome icon. Sized by the caller like any lucide icon (class size-4 or the parent's [&_svg] rule).

/** Figma's mark. */
export function FigmaMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 38 57" fill="none" aria-hidden {...props}>
      <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE" />
      <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" fill="#0ACF83" />
      <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" fill="#FF7262" />
      <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#F24E1E" />
      <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#A259FF" />
    </svg>
  )
}

/** React's atom. */
export function ReactMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="-11.5 -10.232 23 20.463" fill="none" aria-hidden {...props}>
      <circle r="2.05" fill="#61DAFB" />
      <g stroke="#61DAFB" strokeWidth="1">
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
      </g>
    </svg>
  )
}

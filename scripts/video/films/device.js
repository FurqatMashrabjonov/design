// The studio's own phone (components/DeviceFrame.tsx, PRV-01) for films: an iPhone 18 Pro at its CSS size — bezel,
// side keys, Dynamic Island, status bar, home indicator — around a live app screen, with the safe areas sent into the
// screen (od:look) so Konsta's bars keep clear of the island and the indicator, as in the preview.
//   <div class="device" data-src="/api/thumb/<id>?t=<token>" data-start="5100" data-dark="0"></div>
//   (several data-src, comma-separated, become stacked screens; give each later one a class through data-classes)
;(() => {
  const D = { w: 402, h: 874, radius: 56, bezel: 12, top: 54, bottom: 34 }
  const icon = (p, w) => `<svg width="${w}" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`
  const signal = icon('<path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16"/>', 17)
  const wifi = icon('<path d="M12 20h.01M2 8.82a15 15 0 0 1 20 0M5 12.86a10 10 0 0 1 14 0M8.5 16.43a5 5 0 0 1 7 0"/>', 17)
  const battery = '<svg width="25" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2"/><path d="M6 11v2M10 11v2M14 11v2" stroke-width="2.6"/></svg>'
  const style = document.createElement('style')
  style.textContent = `
    .device { position: absolute; width: ${D.w + D.bezel * 2}px; height: ${D.h + D.bezel * 2}px; padding: ${D.bezel}px; box-sizing: border-box; border-radius: ${D.radius + D.bezel}px; background: #161514; box-shadow: 0 0 0 1.5px #3b3936, 0 60px 120px -30px rgb(0 0 0 / 70%), inset 0 0 0 1px #2a2826 }
    .device .key { position: absolute; background: #2a2826 }
    .device .screen { position: relative; width: ${D.w}px; height: ${D.h}px; border-radius: ${D.radius}px; overflow: hidden; background: #000 }
    .device iframe { position: absolute; inset: 0; width: ${D.w}px; height: ${D.h}px; border: 0 }
    .device .bar { position: absolute; inset: 0 0 auto; height: ${D.top}px; z-index: 30; pointer-events: none; font: 600 17px -apple-system, 'SF Pro Text', system-ui; letter-spacing: -.3px }
    .device .time { position: absolute; left: 0; width: ${(D.w - 126) / 2}px; top: 18px; text-align: center }
    .device .icons { position: absolute; right: 0; width: ${(D.w - 126) / 2}px; top: 19px; display: flex; gap: 6px; justify-content: center; align-items: center }
    .device .island { position: absolute; left: 50%; transform: translateX(-50%); top: 11px; width: 126px; height: 37px; border-radius: 99px; background: #000 }
    .device .home { position: absolute; left: 50%; transform: translateX(-50%); bottom: 8px; width: 140px; height: 5px; border-radius: 99px; z-index: 30; opacity: .85 }
  `
  document.head.append(style)
  for (const el of document.querySelectorAll('.device')) {
    const ink = el.dataset.dark === '1' ? '#fff' : '#000'
    const srcs = (el.dataset.src ?? '').split(',').filter(Boolean)
    const starts = (el.dataset.start ?? '0').split(',')
    const classes = (el.dataset.classes ?? '').split(',')
    el.innerHTML = `<span class="key" style="left:-3px;top:180px;width:3px;height:60px;border-radius:2px 0 0 2px"></span><span class="key" style="left:-3px;top:250px;width:3px;height:60px;border-radius:2px 0 0 2px"></span><span class="key" style="right:-3px;top:220px;width:3px;height:90px;border-radius:0 2px 2px 0"></span>
      <div class="screen">${srcs.map((s, i) => `<iframe class="${classes[i] ?? ''}" data-start="${starts[i] ?? starts[0]}" src="${s}"></iframe>`).join('')}
        <div class="bar" style="color:${ink}"><span class="time">9:41</span><span class="icons">${signal}${wifi}${battery}</span><span class="island"></span></div>
        <span class="home" style="background:${ink}"></span></div>`
    // The safe areas go into each screen once it listens; asked a few times, as the preview's frames do.
    for (const f of el.querySelectorAll('iframe')) {
      const look = { type: 'od:look', dark: el.dataset.dark === '1', platform: 'ios', insets: { top: D.top, bottom: D.bottom } }
      let n = 0
      const send = () => { try { f.contentWindow.postMessage(look, '*') } catch {} if (++n < 20) setTimeout(send, 400) }
      f.addEventListener('load', send)
    }
  }
})()

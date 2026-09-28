import type { ReactNode } from 'react'
import { BatteryFull, Signal, Wifi } from 'lucide-react'
import type { Device } from '@/lib/devices'

// PRV-01: a phone drawn by us at its real size — bezel, Dynamic Island or punch-hole camera, status bar and
// home indicator — laid over the app's screen the way the hardware and the OS are. `children` are drawn at the
// device's own CSS viewport (w × h); the whole thing is scaled by `scale` to fit the stage.
export function DeviceFrame(props: { device: Device; scale: number; dark: boolean; children: ReactNode; /** A foldable shown folded: only the right half (the cover) is in view. */ cover?: boolean; /** A half is swinging: nothing is clipped to the screen. */ moving?: boolean; /** Two panes: a handle sits in the gap between them. */ split?: boolean }) {
  const d = props.device
  const ink = props.dark ? '#fff' : '#000'
  const outerW = d.w + d.bezel * 2
  const outerH = d.h + d.bezel * 2
  // An unfolded foldable (wider than tall): the status bar spans both panes, the camera sits in the right one,
  // and the hinge shows as a faint crease down the middle.
  const wide = d.w > d.h
  return (
    <div className="relative shrink-0" style={{ width: outerW * props.scale, height: outerH * props.scale }}>
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: outerW, height: outerH, transform: `scale(${props.scale})`, padding: d.bezel, borderRadius: d.radius + d.bezel, background: '#161514', boxShadow: '0 0 0 1.5px #3b3936, 0 40px 80px -30px rgb(0 0 0 / 55%), inset 0 0 0 1px #2a2826' }}
      >
        {/* Side keys, a few pixels proud of the frame. */}
        <span aria-hidden className="absolute rounded-l-sm bg-[#2a2826]" style={{ left: -3, top: 180, width: 3, height: 60 }} />
        <span aria-hidden className="absolute rounded-l-sm bg-[#2a2826]" style={{ left: -3, top: 250, width: 3, height: 60 }} />
        <span aria-hidden className="absolute rounded-r-sm bg-[#2a2826]" style={{ right: -3, top: 220, width: 3, height: 90 }} />
        {/* A foldable's hinge shows as two dark tabs in the frame, top and bottom. */}
        {wide && !props.cover && ['top', 'bottom'].map((edge) => <span key={edge} aria-hidden className="absolute left-1/2 -translate-x-1/2 rounded-sm bg-[#0b0b0a]" style={{ [edge]: 1, width: 26, height: d.bezel - 3 }} />)}
        <div className={`relative bg-black ${props.moving ? '' : 'overflow-hidden'}`} style={{ width: d.w, height: d.h, borderRadius: d.radius }}>
          {props.children}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-30" style={{ height: d.top, color: ink }}>
            {wide ? (
              <>
                <span className="absolute font-semibold tabular-nums" style={{ left: props.cover ? d.w / 2 + 24 : 28, top: 14, fontSize: 15 }}>9:41</span>
                <span className="absolute flex items-center gap-1.5" style={{ right: 24, top: 15 }}>
                  <Signal className="size-[15px]" strokeWidth={2.6} />
                  <Wifi className="size-[15px]" strokeWidth={2.6} />
                  <BatteryFull className="size-[22px]" strokeWidth={1.8} />
                </span>
                <span className="absolute -translate-x-1/2 rounded-full bg-black" style={{ left: '75%', top: 12, width: 14, height: 14, boxShadow: '0 0 0 1.5px #1c1c1c' }} />
              </>
            ) : d.platform === 'ios' ? (
              <>
                <span className="absolute font-semibold tabular-nums" style={{ left: 0, width: (d.w - 126) / 2, top: 18, textAlign: 'center', fontSize: 17, letterSpacing: -0.3 }}>9:41</span>
                <span className="absolute flex items-center gap-1.5" style={{ right: 0, width: (d.w - 126) / 2, top: 20, justifyContent: 'center' }}>
                  <Signal className="size-[17px]" strokeWidth={2.6} />
                  <Wifi className="size-[17px]" strokeWidth={2.6} />
                  <BatteryFull className="size-[25px]" strokeWidth={1.8} />
                </span>
                <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black" style={{ top: 11, width: 126, height: 37 }} />
              </>
            ) : (
              <>
                <span className="absolute font-medium tabular-nums" style={{ left: 24, top: 9, fontSize: 14 }}>9:41</span>
                <span className="absolute flex items-center gap-1" style={{ right: 22, top: 10 }}>
                  <Wifi className="size-[15px]" strokeWidth={2.4} />
                  <Signal className="size-[15px]" strokeWidth={2.4} />
                  <BatteryFull className="size-[20px]" strokeWidth={1.8} />
                </span>
                <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black" style={{ top: 10, width: 13, height: 13, boxShadow: '0 0 0 1.5px #1c1c1c' }} />
              </>
            )}
          </div>
          {props.split && <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 z-30 -translate-1/2 rounded-full bg-[#8a8680]" style={{ width: 4, height: 44 }} />}
          {/* The home indicator (iOS) or the gesture bar (Android). */}
          <span aria-hidden className="pointer-events-none absolute z-30 -translate-x-1/2 rounded-full" style={{ left: props.cover ? '75%' : '50%', bottom: d.platform === 'ios' ? 8 : 7, width: d.platform === 'ios' ? 140 : 110, height: d.platform === 'ios' ? 5 : 4, background: ink, opacity: 0.85 }} />
        </div>
      </div>
    </div>
  )
}

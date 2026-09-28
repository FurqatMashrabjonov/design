import type { ReactNode } from 'react'
import { BatteryFull, Signal, Wifi } from 'lucide-react'
import type { Device } from '@/lib/devices'

// PRV-01: a phone drawn by us at its real size — bezel, Dynamic Island or punch-hole camera, status bar and
// home indicator — laid over the app's screen the way the hardware and the OS are. `children` are drawn at the
// device's own CSS viewport (w × h); the whole thing is scaled by `scale` to fit the stage.
export function DeviceFrame(props: { device: Device; scale: number; dark: boolean; children: ReactNode }) {
  const d = props.device
  const ink = props.dark ? '#fff' : '#000'
  const outerW = d.w + d.bezel * 2
  const outerH = d.h + d.bezel * 2
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
        <div className="relative overflow-hidden bg-black" style={{ width: d.w, height: d.h, borderRadius: d.radius }}>
          {props.children}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-30" style={{ height: d.top, color: ink }}>
            {d.platform === 'ios' ? (
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
          {/* The home indicator (iOS) or the gesture bar (Android). */}
          <span aria-hidden className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 rounded-full" style={{ bottom: d.platform === 'ios' ? 8 : 7, width: d.platform === 'ios' ? 140 : 110, height: d.platform === 'ios' ? 5 : 4, background: ink, opacity: 0.85 }} />
        </div>
      </div>
    </div>
  )
}

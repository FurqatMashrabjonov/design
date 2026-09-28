// PRV-01: the phones the preview can show an app on. Each is drawn by us (DeviceFrame — no vendor artwork) at
// its real CSS viewport, so a screen is laid out at that device's width; its status bar and home area are the
// safe-area insets Konsta's Navbar and Tabbar keep clear of (--k-safe-area-*). An Android phone shows the app
// as Material. Viewports: iPhone 18 Pro Max 440×956, Galaxy S26 Ultra 412×891 (2026 device tables).
export type Device = {
  id: string
  name: string
  platform: 'ios' | 'material'
  /** CSS viewport. */
  w: number
  h: number
  /** Screen corner radius and the bezel around it, CSS px. */
  radius: number
  bezel: number
  cutout: 'island' | 'punch'
  /** Safe areas: the status bar at the top, the home indicator / gesture bar at the bottom. */
  top: number
  bottom: number
}

export const DEVICES: Device[] = [
  { id: 'iphone-18-pro', name: 'iPhone 18 Pro', platform: 'ios', w: 402, h: 874, radius: 56, bezel: 12, cutout: 'island', top: 54, bottom: 34 },
  { id: 'iphone-18-pro-max', name: 'iPhone 18 Pro Max', platform: 'ios', w: 440, h: 956, radius: 60, bezel: 12, cutout: 'island', top: 54, bottom: 34 },
  { id: 'galaxy-s26-ultra', name: 'Galaxy S26 Ultra', platform: 'material', w: 412, h: 891, radius: 30, bezel: 9, cutout: 'punch', top: 36, bottom: 24 },
]

export const DEFAULT_DEVICE = DEVICES[0]!
export const deviceById = (id: string | null | undefined) => DEVICES.find((d) => d.id === id) ?? DEFAULT_DEVICE

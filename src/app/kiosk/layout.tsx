// app/kiosk/layout.tsx
// Kiosk pages are fullscreen with no navigation.
// Designed for TV/monitor display at mess entrances.

import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Mess QR — Scan to Enter',
  description: 'Dynamic QR code for mess entry authorization',
  robots: 'noindex, nofollow',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Prevent zooming on kiosk display
  maximumScale: 1,
  userScalable: false,
}

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        width:     '100%',
        // Prevent text selection on kiosk display
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {children}
    </div>
  )
}

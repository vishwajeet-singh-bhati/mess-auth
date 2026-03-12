'use client'
// components/shared/BottomNav.tsx

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { CSSProperties } from 'react'

interface NavItem {
  href:  string
  label: string
  icon:  string
}

const STUDENT_NAV: NavItem[] = [
  { href: '/student/dashboard',      label: 'Home',    icon: '⊞' },
  { href: '/student/scan',           label: 'Scan',    icon: '⬡' },
  { href: '/student/history',        label: 'History', icon: '◷' },
  { href: '/student/subscription',   label: 'My Plan', icon: '◈' },
]

const STAFF_NAV: NavItem[] = [
  { href: '/staff/dashboard',  label: 'Home',    icon: '⊞' },
  { href: '/staff/verify',     label: 'Verify',  icon: '⊕' },
  { href: '/staff/summary',    label: 'Today',   icon: '◷' },
  { href: '/staff/denied',     label: 'Denied',  icon: '⊗' },
]

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/dashboard',      label: 'Home',    icon: '⊞' },
  { href: '/admin/students',       label: 'Students', icon: '◉' },
  { href: '/admin/subscriptions',  label: 'Plans',   icon: '◈' },
  { href: '/admin/reports',        label: 'Reports', icon: '◧' },
]

type NavRole = 'student' | 'staff' | 'admin'

const NAV_MAP: Record<NavRole, NavItem[]> = {
  student: STUDENT_NAV,
  staff:   STAFF_NAV,
  admin:   ADMIN_NAV,
}

export function BottomNav({ role }: { role: NavRole }) {
  const pathname = usePathname()
  const items = NAV_MAP[role]

  return (
    <nav
      style={{
        position:      'fixed',
        bottom:        0,
        left:          '50%',
        transform:     'translateX(-50%)',
        width:         '100%',
        maxWidth:      '480px',
        background:    'rgba(11, 15, 26, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop:     '1px solid var(--border)',
        display:       'flex',
        zIndex:        100,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex:           1,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '0.2rem',
              padding:        '0.6rem 0 0.5rem',
              textDecoration: 'none',
              position:       'relative',
              transition:     'opacity 0.15s',
            }}
          >
            {/* Active indicator */}
            {isActive && (
              <div style={{
                position:     'absolute',
                top:          0,
                left:         '50%',
                transform:    'translateX(-50%)',
                width:        '24px',
                height:       '2px',
                background:   'var(--accent)',
                borderRadius: '0 0 2px 2px',
                boxShadow:    '0 0 8px var(--accent)',
              }} />
            )}
            <span style={{
              fontSize:   '1.1rem',
              color:      isActive ? 'var(--accent)' : 'var(--text-muted)',
              lineHeight:  1,
              transition: 'color 0.15s',
            }}>
              {item.icon}
            </span>
            <span style={{
              fontSize:    '0.62rem',
              fontWeight:  isActive ? 700 : 500,
              color:       isActive ? 'var(--accent)' : 'var(--text-muted)',
              letterSpacing: '0.03em',
              transition:  'color 0.15s',
            }}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

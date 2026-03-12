'use client'
// components/shared/ErrorBoundary.tsx
// Catches unhandled render errors and shows a friendly recovery screen.

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children:  ReactNode
  fallback?: ReactNode
}

interface State {
  hasError:    boolean
  errorMessage: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div style={{
          minHeight:      '100dvh',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        '2rem',
          background:     'var(--bg)',
          textAlign:      'center',
          gap:            '1rem',
        }}>
          <div style={{ fontSize: '2.5rem' }}>⚠️</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)' }}>
            Something went wrong
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '280px', lineHeight: 1.5 }}>
            {this.state.errorMessage || 'An unexpected error occurred. Please reload the page.'}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, errorMessage: '' }); window.location.reload() }}
            style={{
              marginTop:    '0.5rem',
              background:   'var(--accent)',
              color:        'white',
              border:       'none',
              borderRadius: 'var(--radius-md)',
              padding:      '0.7rem 1.5rem',
              fontWeight:   700,
              fontSize:     '0.9rem',
              cursor:       'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

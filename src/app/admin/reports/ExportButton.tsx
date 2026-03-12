'use client'
// app/(admin)/reports/ExportButton.tsx

import { useState } from 'react'
import { Button } from '@/components/shared/ui'

export function ExportButton() {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reports/export?type=meal_logs&days=30')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mess-meal-logs-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
    setLoading(false)
  }

  return (
    <Button variant="secondary" size="sm" loading={loading} onClick={handleExport}>
      ↓ CSV
    </Button>
  )
}

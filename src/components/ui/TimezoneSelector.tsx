import { useState, useRef, useEffect, useMemo } from 'react'
import { getSupportedTimezones, formatTimezoneLabel } from '../../utils/timezone'
import { useLanguage } from '../../contexts/LanguageContext'
import { cn } from '../../utils/cn'

interface TimezoneSelectorProps {
  value: string
  onChange: (tz: string) => void
}

export function TimezoneSelector({ value, onChange }: TimezoneSelectorProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const timezones = useMemo(() => getSupportedTimezones(), [])

  const filtered = useMemo(() => {
    if (!search) return timezones
    const lower = search.toLowerCase()
    return timezones.filter((tz) => tz.toLowerCase().includes(lower))
  }, [timezones, search])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus input on open
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  // Short display label: just the city part
  const shortLabel = value.split('/').pop()?.replace(/_/g, ' ') ?? value

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-warm-50 text-warm-600 hover:bg-warm-100 transition-colors cursor-pointer border border-warm-200 max-w-[180px]"
        title={formatTimezoneLabel(value)}
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="truncate">{shortLabel}</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 w-80 bg-white rounded-xl border border-warm-200 shadow-lg z-50 animate-fade-in">
          <div className="p-3 border-b border-warm-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchTimezone')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-warm-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-sm text-warm-400">
                No timezones found
              </div>
            ) : (
              filtered.map((tz) => (
                <button
                  key={tz}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm hover:bg-warm-50 transition-colors cursor-pointer',
                    tz === value && 'bg-primary-50 text-primary-700 font-medium',
                  )}
                  onClick={() => {
                    onChange(tz)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  {formatTimezoneLabel(tz)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

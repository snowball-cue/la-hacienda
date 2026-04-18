import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Hours & Location',
  description:
    'La Hacienda Mexican Grocery store hours, address, and directions. Open 7 days a week in Austin, Texas.',
}

const HOURS = [
  { day: 'Monday',    open: '7:00 AM', close: '9:00 PM' },
  { day: 'Tuesday',   open: '7:00 AM', close: '9:00 PM' },
  { day: 'Wednesday', open: '7:00 AM', close: '9:00 PM' },
  { day: 'Thursday',  open: '7:00 AM', close: '9:00 PM' },
  { day: 'Friday',    open: '7:00 AM', close: '9:00 PM' },
  { day: 'Saturday',  open: '7:00 AM', close: '9:00 PM' },
  { day: 'Sunday',    open: '8:00 AM', close: '8:00 PM' },
]

const HOLIDAY_NOTES = [
  'New Year\'s Day — Closed',
  'Thanksgiving Day — 9:00 AM – 3:00 PM',
  'Christmas Day — Closed',
  'All other holidays — Regular hours unless posted otherwise',
]

export default function HoursPage() {
  // Determine today's day for highlighting in the table
  const todayIndex = new Date().getDay() // 0 = Sunday … 6 = Saturday
  // HOURS array is Mon–Sun (indices 0–6 = Mon–Sun), map JS day to array index
  const hoursIndex = todayIndex === 0 ? 6 : todayIndex - 1

  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="bg-terracotta text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm font-medium text-white/60 uppercase tracking-widest mb-2">
            Visit Us
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Hours &amp; Location
          </h1>
          <p className="mt-3 text-white/80">
            Open 7 days a week · Austin, Texas
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* ── Hours table ───────────────────────────────────────────── */}
          <div>
            <h2 className="text-xl font-bold text-stone-900 mb-5">Store Hours</h2>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {HOURS.map(({ day, open, close }, i) => {
                    const isToday = i === hoursIndex
                    return (
                      <tr
                        key={day}
                        className={`border-b border-stone-100 last:border-0 ${
                          isToday ? 'bg-terracotta/5' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5 font-medium text-stone-800 flex items-center gap-2">
                          {isToday && (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-terracotta shrink-0" aria-label="Today" />
                          )}
                          {day}
                          {isToday && (
                            <span className="ml-1 text-xs font-medium text-terracotta">Today</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right text-stone-600">
                          {open} – {close}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Holiday notes */}
            <div className="mt-6">
              <h3 className="font-semibold text-stone-800 mb-3">Holiday Hours</h3>
              <ul className="space-y-1.5 text-sm text-stone-500">
                {HOLIDAY_NOTES.map((note) => (
                  <li key={note} className="flex items-start gap-2">
                    <span className="text-gold mt-0.5" aria-hidden="true">•</span>
                    {note}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-stone-400">
                Holiday hours may change year to year. Call us to confirm:{' '}
                <a href="tel:+15125550100" className="text-terracotta hover:underline">
                  (512) 555-0100
                </a>
              </p>
            </div>
          </div>

          {/* ── Address & map ─────────────────────────────────────────── */}
          <div>
            <h2 className="text-xl font-bold text-stone-900 mb-5">Find Us</h2>

            <div className="card p-5 mb-5">
              <address className="not-italic space-y-3 text-sm text-stone-700">
                <div>
                  <p className="font-semibold text-stone-900 text-base">La Hacienda Mexican Grocery</p>
                  <p className="text-stone-500">Austin, Texas</p>
                </div>
                <div className="pt-1 flex flex-col gap-1.5">
                  <a
                    href="tel:+15125550100"
                    className="inline-flex items-center gap-2 text-terracotta hover:text-terracotta-dark transition-colors"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    (512) 555-0100
                  </a>
                  <a
                    href="mailto:hello@lahaciendaatx.com"
                    className="inline-flex items-center gap-2 text-terracotta hover:text-terracotta-dark transition-colors"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    hello@lahaciendaatx.com
                  </a>
                </div>
              </address>
            </div>

            {/* Map placeholder */}
            <div className="aspect-video bg-stone-100 rounded-xl flex items-center justify-center border border-stone-200">
              <div className="text-center text-stone-400">
                <svg className="h-10 w-10 mx-auto mb-2 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="text-sm font-medium">Map embed coming soon</p>
                <p className="text-xs mt-1">Austin, Texas</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/contact" className="btn-secondary text-sm">
                Send a Message
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

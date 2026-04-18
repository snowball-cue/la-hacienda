import Link from 'next/link'

const HOURS = [
  { day: 'Monday – Friday', hours: '7:00 AM – 9:00 PM' },
  { day: 'Saturday',        hours: '7:00 AM – 9:00 PM' },
  { day: 'Sunday',          hours: '8:00 AM – 8:00 PM' },
]

const QUICK_LINKS = [
  { href: '/about',    label: 'About Us' },
  { href: '/hours',    label: 'Store Hours' },
  { href: '/products', label: 'Products' },
  { href: '/contact',  label: 'Contact' },
]

export default function Footer() {
  return (
    <footer className="bg-forest text-cream">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">

          {/* ── Brand ───────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex gap-0.5">
                <div className="h-4 w-1 rounded-full bg-gold" />
                <div className="h-4 w-1 rounded-full bg-cream/40" />
                <div className="h-4 w-1 rounded-full bg-terracotta" />
              </div>
              <span className="text-lg font-bold text-gold">La Hacienda</span>
            </div>
            <p className="text-sm text-cream/70 italic mb-3">
              Tu tienda de confianza
            </p>
            <p className="text-sm text-cream/60 leading-relaxed">
              Authentic Mexican groceries, fresh produce, tortillas, dairy, and everyday
              essentials — right here in Austin, Texas.
            </p>
          </div>

          {/* ── Hours ───────────────────────────────────────────────── */}
          <div>
            <h4 className="font-semibold text-gold mb-4">Store Hours</h4>
            <ul className="space-y-2">
              {HOURS.map(({ day, hours }) => (
                <li key={day} className="flex justify-between gap-4 text-sm">
                  <span className="text-cream/70">{day}</span>
                  <span className="text-cream font-medium whitespace-nowrap">{hours}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-cream/50">
              Hours may vary on holidays. Call ahead to confirm.
            </p>
          </div>

          {/* ── Contact & Links ──────────────────────────────────────── */}
          <div>
            <h4 className="font-semibold text-gold mb-4">Find Us</h4>
            <address className="not-italic text-sm text-cream/70 space-y-1 mb-5">
              <p className="text-cream font-medium">La Hacienda Mexican Grocery</p>
              <p>Austin, Texas</p>
              <p className="mt-2">
                <a
                  href="tel:+15125550100"
                  className="hover:text-gold transition-colors"
                >
                  (512) 555-0100
                </a>
              </p>
              <p>
                <a
                  href="mailto:hello@lahaciendaatx.com"
                  className="hover:text-gold transition-colors"
                >
                  hello@lahaciendaatx.com
                </a>
              </p>
            </address>
            <nav aria-label="Footer navigation">
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                {QUICK_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-xs text-cream/50 hover:text-cream transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* ── Bottom bar ──────────────────────────────────────────────── */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-cream/40">
          <p>© {new Date().getFullYear()} La Hacienda Mexican Grocery. All rights reserved.</p>
          <Link href="/login" className="hover:text-cream/60 transition-colors">
            Staff Portal
          </Link>
        </div>
      </div>
    </footer>
  )
}

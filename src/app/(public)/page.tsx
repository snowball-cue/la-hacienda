import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'La Hacienda — Mexican Grocery · Austin, Texas',
  description:
    'La Hacienda Mexican Grocery in Austin, Texas. Fresh produce, authentic tortillas, dairy, beverages, and dry goods. Tu tienda de confianza.',
}

// ── Static category preview data ─────────────────────────────────────────────
// Phase 5 will replace this with live DB data.
const CATEGORIES = [
  {
    name: 'Produce',
    nameEs: 'Productos frescos',
    icon: '🥦',
    description: 'Fresh fruits, vegetables, herbs, and chiles',
    href: '/products?category=produce',
  },
  {
    name: 'Dry Goods',
    nameEs: 'Abarrotes',
    icon: '🌽',
    description: 'Masa, rice, beans, spices, and pantry staples',
    href: '/products?category=dry-goods',
  },
  {
    name: 'Dairy',
    nameEs: 'Lácteos',
    icon: '🧀',
    description: 'Queso fresco, crema, cotija, and more',
    href: '/products?category=dairy',
  },
  {
    name: 'Meat & Seafood',
    nameEs: 'Carnes y mariscos',
    icon: '🥩',
    description: 'Fresh cuts, chorizo, carnitas, and seafood',
    href: '/products?category=meat',
  },
  {
    name: 'Beverages',
    nameEs: 'Bebidas',
    icon: '🧃',
    description: 'Jarritos, aguas frescas, horchata, and more',
    href: '/products?category=beverages',
  },
]

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-terracotta-dark via-terracotta to-terracotta-light text-white overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10" aria-hidden="true">
          <div className="absolute top-8 left-8 text-8xl">🌵</div>
          <div className="absolute top-16 right-16 text-6xl">🌶️</div>
          <div className="absolute bottom-8 left-1/4 text-5xl">🌮</div>
          <div className="absolute bottom-16 right-8 text-7xl">🌻</div>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            {/* Mexican flag accent */}
            <div className="flex gap-1 mb-6">
              <div className="h-1 w-8 rounded-full bg-forest-light" />
              <div className="h-1 w-8 rounded-full bg-white/60" />
              <div className="h-1 w-8 rounded-full bg-gold" />
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight">
              La Hacienda
            </h1>
            <p className="mt-2 text-xl text-white/80 font-medium">
              Mexican Grocery · Austin, Texas
            </p>
            <p className="mt-4 text-lg text-white/70 italic">
              Tu tienda de confianza
            </p>
            <p className="mt-2 text-base text-white/60">
              Your trusted neighborhood store for authentic Mexican products,
              fresh produce, and everyday essentials.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-terracotta font-semibold rounded-md hover:bg-cream transition-colors shadow-md"
              >
                Browse Products
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/hours"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/30 text-white font-semibold rounded-md hover:bg-white/20 transition-colors"
              >
                Hours & Location
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-stone-900">
              Shop by Category
            </h2>
            <p className="mt-2 text-stone-500">
              From fresh produce to pantry staples — everything your kitchen needs
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="group card p-5 hover:border-terracotta hover:shadow-md transition-all duration-200 flex flex-col items-center text-center"
              >
                <span className="text-4xl mb-3" aria-hidden="true">{cat.icon}</span>
                <h3 className="font-semibold text-stone-900 group-hover:text-terracotta transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-stone-500 italic mt-0.5 mb-2">{cat.nameEs}</p>
                <p className="text-xs text-stone-400 leading-relaxed">{cat.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why shop here ───────────────────────────────────────────────── */}
      <section className="py-14 bg-forest text-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gold">Why La Hacienda?</h2>
            <p className="mt-2 text-cream/70 text-sm">Family-owned, community-focused</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
              {
                icon: '🫶',
                title: 'Family Owned',
                body: 'We have proudly served Austin\'s Mexican community for years — our family is your family.',
              },
              {
                icon: '🌿',
                title: 'Always Fresh',
                body: 'Daily deliveries of produce, dairy, and meats so you always get the freshest ingredients.',
              },
              {
                icon: '🇲🇽',
                title: 'Authentic Products',
                body: 'Hard-to-find imports, regional specialties, and all the flavors of home.',
              },
            ].map(({ icon, title, body }) => (
              <div key={title} className="flex flex-col items-center">
                <span className="text-4xl mb-3">{icon}</span>
                <h3 className="font-semibold text-gold mb-2">{title}</h3>
                <p className="text-sm text-cream/70 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hours teaser ─────────────────────────────────────────────────── */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 bg-amber-50 border-y border-amber-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Come Visit Us</h2>
          <p className="text-stone-500 mb-6">Open 7 days a week in Austin, Texas</p>

          <div className="flex flex-col sm:flex-row justify-center gap-6 text-sm text-stone-700">
            <div>
              <span className="font-semibold">Mon – Sat</span>
              <span className="ml-2 text-terracotta font-medium">7:00 AM – 9:00 PM</span>
            </div>
            <div className="hidden sm:block text-stone-300">|</div>
            <div>
              <span className="font-semibold">Sunday</span>
              <span className="ml-2 text-terracotta font-medium">8:00 AM – 8:00 PM</span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/hours" className="btn-secondary">
              Full Hours & Directions
            </Link>
            <a
              href="tel:+15125550100"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-terracotta hover:text-terracotta-dark transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              (512) 555-0100
            </a>
          </div>
        </div>
      </section>
    </>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Products',
  description:
    'Browse La Hacienda\'s product catalog — fresh produce, dry goods, dairy, meats, and beverages. Austin\'s premier Mexican grocery store.',
}

// Phase 5 will replace all of this with live DB data via Prisma.
const CATEGORIES = [
  {
    name: 'Produce',
    nameEs: 'Productos frescos',
    slug: 'produce',
    icon: '🥦',
    description: 'Fresh fruits, vegetables, herbs, and chiles — delivered daily.',
    featured: ['Tomatillos', 'Jalapeños', 'Cilantro', 'Avocados', 'Nopales', 'Chayote'],
  },
  {
    name: 'Dry Goods',
    nameEs: 'Abarrotes',
    slug: 'dry-goods',
    icon: '🌽',
    description: 'Masa harina, rice, beans, dried chiles, spices, and pantry staples.',
    featured: ['Maseca Masa', 'Pinto Beans', 'Dried Ancho Chiles', 'Canela', 'Mexican Rice', 'Piloncillo'],
  },
  {
    name: 'Dairy',
    nameEs: 'Lácteos',
    slug: 'dairy',
    icon: '🧀',
    description: 'Queso fresco, cotija, crema, and other authentic dairy products.',
    featured: ['Queso Fresco', 'Cotija', 'Crema Mexicana', 'Quesillo', 'Panela', 'Requeson'],
  },
  {
    name: 'Meat & Seafood',
    nameEs: 'Carnes y mariscos',
    slug: 'meat',
    icon: '🥩',
    description: 'Fresh-cut meats, chorizo, carnitas, and seafood specialties.',
    featured: ['Chorizo', 'Carne Asada', 'Al Pastor', 'Carnitas', 'Tilapia', 'Camarón'],
  },
  {
    name: 'Beverages',
    nameEs: 'Bebidas',
    slug: 'beverages',
    icon: '🧃',
    description: 'Jarritos, agua de tamarindo, horchata, Mexican sodas and more.',
    featured: ['Jarritos Mandarina', 'Agua de Tamarindo', 'Horchata', 'Boing Mango', 'Sidral Mundet', 'Sangría Señorial'],
  },
]

export default function ProductsPage() {
  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="bg-terracotta text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm font-medium text-white/60 uppercase tracking-widest mb-2">
            Our Selection
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Products</h1>
          <p className="mt-3 text-white/80 max-w-xl">
            Over 300 SKUs across five categories — produce, dry goods, dairy, meats, and beverages.
            Everything you need for authentic Mexican cooking.
          </p>
        </div>
      </section>

      {/* ── Category quick-nav ───────────────────────────────────────────── */}
      <nav
        className="sticky top-16 z-40 bg-white border-b border-stone-200 px-4 sm:px-6 lg:px-8 py-3"
        aria-label="Product categories"
      >
        <div className="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((cat) => (
            <a
              key={cat.slug}
              href={`#${cat.slug}`}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-stone-600 hover:text-terracotta hover:bg-stone-50 rounded-full border border-stone-200 transition-colors"
            >
              <span aria-hidden="true">{cat.icon}</span>
              {cat.name}
            </a>
          ))}
        </div>
      </nav>

      {/* ── Notice ──────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-stone-700 flex items-start gap-3">
          <span className="text-gold text-base shrink-0 mt-0.5" aria-hidden="true">ℹ️</span>
          <p>
            <strong>Product availability varies.</strong> Call us at{' '}
            <a href="tel:+15125550100" className="text-terracotta font-medium hover:underline">
              (512) 555-0100
            </a>{' '}
            to confirm stock on specific items, or visit us in store — our staff will help you find what you need.
          </p>
        </div>
      </div>

      {/* ── Category sections ────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">
        {CATEGORIES.map((cat) => (
          <section key={cat.slug} id={cat.slug} className="scroll-mt-32">
            {/* Category heading */}
            <div className="flex items-end justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl" aria-hidden="true">{cat.icon}</span>
                  <h2 className="text-xl font-bold text-stone-900">{cat.name}</h2>
                  <span className="text-sm text-stone-400 italic">/ {cat.nameEs}</span>
                </div>
                <p className="text-sm text-stone-500">{cat.description}</p>
              </div>
            </div>

            {/* Featured items grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {cat.featured.map((item) => (
                <div
                  key={item}
                  className="card p-3 text-center hover:border-terracotta/40 hover:shadow-md transition-all"
                >
                  <div className="h-12 flex items-center justify-center mb-2">
                    <span className="text-2xl" aria-hidden="true">{cat.icon}</span>
                  </div>
                  <p className="text-xs font-medium text-stone-700 leading-tight">{item}</p>
                </div>
              ))}

              {/* "More in store" placeholder */}
              <div className="card p-3 text-center border-dashed bg-stone-50/50">
                <div className="h-12 flex items-center justify-center mb-2">
                  <span className="text-xl text-stone-300" aria-hidden="true">+</span>
                </div>
                <p className="text-xs text-stone-400 leading-tight">More in store</p>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="bg-forest text-cream py-12 px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-xl font-bold text-gold mb-2">Don't see what you're looking for?</h2>
        <p className="text-cream/70 text-sm mb-5">
          We stock hundreds of products. Call us or stop by — our staff will help.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a href="tel:+15125550100" className="btn-primary bg-gold text-stone-900 hover:bg-gold-light">
            Call (512) 555-0100
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-cream border border-cream/30 rounded-md hover:bg-white/10 transition-colors"
          >
            Send a Message
          </Link>
        </div>
      </section>
    </>
  )
}

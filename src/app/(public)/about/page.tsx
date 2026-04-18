import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Learn about La Hacienda Mexican Grocery — a family-owned store serving the Austin community with authentic Mexican products and fresh ingredients.',
}

const VALUES = [
  {
    icon: '🫶',
    title: 'Community First',
    body: 'We believe in giving back to the Austin community that has supported us. Local vendors, local jobs, local love.',
  },
  {
    icon: '🌿',
    title: 'Freshness You Can Taste',
    body: 'Daily deliveries mean our produce, dairy, and meats are always at peak freshness. We reject what we wouldn\'t eat ourselves.',
  },
  {
    icon: '🇲🇽',
    title: 'Authentic Selection',
    body: 'From Maseca masa to regional hot sauces you can\'t find at chain stores — we carry the real thing.',
  },
  {
    icon: '🤝',
    title: 'Trusted by Families',
    body: 'Three generations of Austin families shop here. We know our customers by name and we like it that way.',
  },
]

export default function AboutPage() {
  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="bg-terracotta text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm font-medium text-white/60 uppercase tracking-widest mb-2">
            Our Story
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            About La Hacienda
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-xl">
            A family-owned Mexican grocery store rooted in community, tradition,
            and the flavors that bring people together.
          </p>
        </div>
      </section>

      {/* ── Story section ───────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Photo placeholder */}
            <div className="aspect-[4/3] bg-stone-100 rounded-2xl flex items-center justify-center border border-stone-200">
              <div className="text-center text-stone-400">
                <div className="text-6xl mb-3">🏪</div>
                <p className="text-sm">Store photo coming soon</p>
              </div>
            </div>

            {/* Story text */}
            <div className="space-y-5 text-stone-600 leading-relaxed">
              <h2 className="text-2xl font-bold text-stone-900">
                More than a grocery store
              </h2>
              <p>
                La Hacienda opened its doors in Austin, Texas with one simple mission:
                to give the local Mexican community a place to find the flavors of home —
                and to welcome everyone else in to discover them.
              </p>
              <p>
                What started as a small shop has grown into a full-service neighborhood
                grocery. Today we carry hundreds of products: fresh produce delivered
                daily, hand-cut meats, a full dairy aisle with queso fresco and crema,
                a dry-goods section stocked with masa, dried chiles, and spices you won't
                find anywhere else in Austin.
              </p>
              <p>
                We speak your language — literally. Our bilingual staff is here to help
                you find exactly what you need, whether it's a specific regional ingredient
                or just a recommendation for tonight's dinner.
              </p>
              <div className="pt-2">
                <Link href="/contact" className="btn-primary">
                  Get in Touch
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values grid ─────────────────────────────────────────────────── */}
      <section className="py-14 bg-stone-50 border-y border-stone-100 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-900 mb-8 text-center">
            What We Stand For
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map(({ icon, title, body }) => (
              <div key={title} className="card p-6">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-semibold text-stone-900 mb-2">{title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-900 mb-3">
            Ready to shop?
          </h2>
          <p className="text-stone-500 mb-6">
            Browse our product catalog or come see us in person.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/products" className="btn-primary">
              Browse Products
            </Link>
            <Link href="/hours" className="btn-secondary">
              Hours & Location
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

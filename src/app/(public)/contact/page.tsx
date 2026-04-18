import type { Metadata } from 'next'
import ContactForm from './ContactForm'

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with La Hacienda Mexican Grocery in Austin, Texas. Call us, email us, or send a message through our contact form.',
}

export default function ContactPage() {
  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="bg-terracotta text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm font-medium text-white/60 uppercase tracking-widest mb-2">
            Get in Touch
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Contact Us</h1>
          <p className="mt-3 text-white/80">
            Questions? Special orders? We'd love to hear from you.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* ── Contact info ──────────────────────────────────────────── */}
          <div>
            <h2 className="text-xl font-bold text-stone-900 mb-6">Reach Us Directly</h2>
            <div className="space-y-5">

              {/* Phone */}
              <div className="card p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5 text-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-stone-900">Call Us</p>
                  <a href="tel:+15125550100" className="text-terracotta hover:text-terracotta-dark text-lg font-medium transition-colors">
                    (512) 555-0100
                  </a>
                  <p className="text-xs text-stone-400 mt-1">
                    Mon–Sat 7 AM – 9 PM · Sun 8 AM – 8 PM
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="card p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5 text-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-stone-900">Email Us</p>
                  <a href="mailto:hello@lahaciendaatx.com" className="text-terracotta hover:text-terracotta-dark transition-colors">
                    hello@lahaciendaatx.com
                  </a>
                  <p className="text-xs text-stone-400 mt-1">
                    We respond within 1 business day.
                  </p>
                </div>
              </div>

              {/* Address */}
              <div className="card p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5 text-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-stone-900">Visit Us</p>
                  <address className="not-italic text-stone-600 text-sm mt-0.5">
                    <p>La Hacienda Mexican Grocery</p>
                    <p>Austin, Texas</p>
                  </address>
                  <a href="/hours" className="text-xs text-terracotta hover:underline mt-1 inline-block">
                    See full store hours →
                  </a>
                </div>
              </div>

            </div>
          </div>

          {/* ── Contact form ──────────────────────────────────────────── */}
          <div>
            <h2 className="text-xl font-bold text-stone-900 mb-6">Send a Message</h2>
            <ContactForm />
          </div>

        </div>
      </div>
    </>
  )
}

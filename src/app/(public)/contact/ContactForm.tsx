'use client'

import { useState } from 'react'

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export default function ContactForm() {
  const [state, setState] = useState<FormState>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('submitting')
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      name:    formData.get('name') as string,
      email:   formData.get('email') as string,
      subject: formData.get('subject') as string,
      message: formData.get('message') as string,
    }

    // Basic validation
    if (!data.name || !data.email || !data.message) {
      setError('Please fill in all required fields.')
      setState('error')
      return
    }

    // Phase 5+: wire this to a Server Action that saves to Supabase
    // or sends an email via a transactional email provider.
    // For now, simulate a short async delay and show success.
    await new Promise((r) => setTimeout(r, 800))
    setState('success')
  }

  if (state === 'success') {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="text-lg font-semibold text-stone-900 mb-2">Message Sent!</h3>
        <p className="text-sm text-stone-500 mb-5">
          Thanks for reaching out. We'll get back to you within 1 business day.
        </p>
        <button
          onClick={() => setState('idle')}
          className="btn-secondary text-sm"
        >
          Send Another Message
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1.5">
            Name <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Your name"
            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1.5">
            Email <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="your@email.com"
            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
          />
        </div>
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-stone-700 mb-1.5">
          Subject
        </label>
        <select
          id="subject"
          name="subject"
          className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
        >
          <option value="">Select a topic (optional)</option>
          <option value="product-inquiry">Product inquiry</option>
          <option value="special-order">Special order</option>
          <option value="hours-location">Hours &amp; location</option>
          <option value="feedback">Feedback</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-stone-700 mb-1.5">
          Message <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="How can we help you?"
          className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta resize-y"
        />
      </div>

      <button
        type="submit"
        disabled={state === 'submitting'}
        className="btn-primary w-full justify-center"
      >
        {state === 'submitting' ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending…
          </>
        ) : (
          'Send Message'
        )}
      </button>

      <p className="text-xs text-stone-400 text-center">
        Or call us directly:{' '}
        <a href="tel:+15125550100" className="text-terracotta hover:underline">
          (512) 555-0100
        </a>
      </p>
    </form>
  )
}

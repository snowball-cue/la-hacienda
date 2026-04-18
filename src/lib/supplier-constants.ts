export const PAYMENT_TERMS = ['NET30', 'NET15', 'NET60', 'COD', 'CIA', 'Net10'] as const
export type PaymentTerm = typeof PAYMENT_TERMS[number]

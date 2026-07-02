import Stripe from "stripe";

/**
 * `null` until STRIPE_SECRET_KEY is set (test-mode key while validating, live key at launch).
 * Callers must check for null and respond gracefully — billing isn't live yet.
 */
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const STRIPE_PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
  annual: process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
} as const;

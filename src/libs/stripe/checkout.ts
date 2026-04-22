/**
 * Stripe Checkout Integration
 * 
 * Handles one-time payments for hosting plans and domain purchases.
 * This extends the existing subscription-based Stripe integration.
 */

import Stripe from 'stripe';
import { HOSTING_PRICES, DOMAIN_MARKUP_FEE } from '@/types/database';

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

interface CreateCheckoutSessionInput {
  userId: string;
  businessId: string;
  hostingMonths: 6 | 12;
  domainFee?: number;
  upsells?: {
    seo?: boolean;
    googleAds?: boolean;
    googleMyBusiness?: boolean;
  };
  successUrl: string;
  cancelUrl: string;
}

export async function createHostingCheckoutSession(input: CreateCheckoutSessionInput): Promise<string> {
  const hostingPrice = HOSTING_PRICES[input.hostingMonths];
  const domainFee = input.domainFee || 0;
  
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${input.hostingMonths} Month Hosting Plan`,
          description: `Professional website hosting for ${input.hostingMonths} months. Includes free logo, branding guide, and website design.`,
        },
        unit_amount: hostingPrice * 100, // Stripe uses cents
      },
      quantity: 1,
    },
  ];

  // Add domain fee if applicable
  if (domainFee > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Domain Registration',
          description: 'One year domain registration with DNS configuration',
        },
        unit_amount: Math.round((domainFee + DOMAIN_MARKUP_FEE) * 100),
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      userId: input.userId,
      businessId: input.businessId,
      hostingMonths: input.hostingMonths.toString(),
      domainFee: domainFee.toString(),
    },
  });

  return session.url || '';
}

export async function createUpsellSubscription(
  userId: string,
  businessId: string,
  services: ('seo' | 'google_ads' | 'google_my_business')[],
  discountPercent: number = 0
): Promise<string> {
  // In production, create Stripe subscription for recurring upsell services
  // This is a placeholder
  console.log('Creating upsell subscription for:', userId, services);
  return '';
}

export async function handlePaymentSuccess(sessionId: string): Promise<{
  success: boolean;
  userId: string;
  businessId: string;
  hostingMonths: number;
}> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  
  if (session.payment_status !== 'paid') {
    throw new Error('Payment not completed');
  }

  const metadata = session.metadata || {};
  
  return {
    success: true,
    userId: metadata.userId || '',
    businessId: metadata.businessId || '',
    hostingMonths: parseInt(metadata.hostingMonths || '12', 10),
  };
}

export async function getPaymentDetails(sessionId: string): Promise<{
  amount: number;
  status: string;
  customerEmail: string | null;
}> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  
  return {
    amount: session.amount_total ? session.amount_total / 100 : 0,
    status: session.payment_status || 'unknown',
    customerEmail: session.customer_details?.email || null,
  };
}

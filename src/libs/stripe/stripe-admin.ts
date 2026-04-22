import Stripe from 'stripe';

// Stripe is optional - if not configured, the admin client will be null
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripeAdmin = stripeSecretKey 
  ? new Stripe(stripeSecretKey, {
      // https://github.com/stripe/stripe-node#configuration
      apiVersion: '2023-10-16',
      // Register this as an official Stripe plugin.
      // https://stripe.com/docs/building-plugins#setappinfo
      appInfo: {
        name: 'FreeWebsite.deal',
        version: '0.1.0',
      },
    })
  : null;

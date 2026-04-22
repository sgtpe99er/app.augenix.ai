import { vi } from 'vitest';

// Set env vars before any module is loaded (important for modules that
// read process.env at initialization time, e.g. PRICE_HOSTING_MONTHS map)
process.env.STRIPE_PRICE_1MO = 'price_1mo_test';
process.env.STRIPE_PRICE_6MO = 'price_6mo_test';
process.env.STRIPE_PRICE_12MO = 'price_12mo_test';
process.env.STRIPE_PRICE_LIFETIME = 'price_lifetime_test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.STRIPE_DOMAIN_PRODUCT_ID = 'prod_domain_test';
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
process.env.VERCEL_TOKEN = 'vercel_test_token';
process.env.VERCEL_TEAM_ID = '';

// Suppress console noise during tests
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});

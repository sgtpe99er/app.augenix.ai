export const DEFAULT_PRICING = {
  hosting6Month: 300,
  hosting12Month: 500,
  domainMarkup: 5,
  seoMonthly: 500,
  googleAdsMonthly: 100,
  gmbMonthly: 50,
  bundleDiscount: 20,
  maxMonthlyEdits: 5,
};

export type PricingSettings = typeof DEFAULT_PRICING;

export const DEFAULT_EMAILS: Record<string, { subject: string; body: string }> = {
  welcome: {
    subject: 'Your FreeWebsite sign-in link is here',
    body: `Hi {business_name},

Welcome to FreeWebsite.

Click the link below to sign in and go straight to your dashboard:

Open dashboard: {dashboard_link}

This magic link confirms your email and signs you in automatically — no password required.

Questions? Email support@freewebsite.deal

Best,
The FreeWebsite Team`,
  },
  paymentConfirmation: {
    subject: 'Payment Confirmed - Your Website Project is Starting!',
    body: `Hi {business_name},

Thank you for your payment of {amount} for {hosting_months} months of hosting.

We're now generating your custom assets:
- Professional logo
- Branding guide with colors and fonts
- 3 website design mockups

You'll receive an email when everything is ready (usually within 24 hours).

Questions? Email support@freewebsite.deal

Best,
The FreeWebsite Team`,
  },
  assetsReady: {
    subject: 'Your Logo, Branding & Website Designs Are Ready!',
    body: `Hi {business_name},

Great news! Your custom assets are ready for review.

Visit your dashboard to see:
- Your new logo options
- Branding guide
- 3 website mockup designs

Dashboard: {dashboard_link}

Select your preferred design and we'll build your website immediately!

Best,
The FreeWebsite Team`,
  },
  editRequestReceived: {
    subject: "Edit Request Received - We're On It!",
    body: `Hi {business_name},

We've received your edit request:
"{request_description}"

Complexity: {complexity}
Expected completion: {eta}

We'll notify you when it's done.

Best,
The FreeWebsite Team`,
  },
  editRequestCompleted: {
    subject: 'Your Edit Request is Complete!',
    body: `Hi {business_name},

Your edit request has been completed:
"{request_description}"

View the changes: {website_link}

Questions? Reply to this email.

Best,
The FreeWebsite Team`,
  },
  websiteLive: {
    subject: 'Your Website is Now Live!',
    body: `Hi {business_name},

Your website is now live and ready for visitors!

URL: {website_url}

What's next?
- Share your site on social media
- Add the link to your business cards
- Consider our SEO and marketing add-ons

View dashboard: {dashboard_link}

Best,
The FreeWebsite Team`,
  },
  onboardingInvite: {
    subject: 'Your FreeWebsite dashboard link - {business_name}',
    body: `Hi {business_name},

Use the link below to sign in and go directly to your FreeWebsite dashboard.

Open dashboard: {onboarding_link}

This magic link will confirm your email and sign you in automatically — no password needed.

Questions? Email support@freewebsite.deal

Best,
The FreeWebsite Team`,
  },
  paymentConfirmedWithLink: {
    subject: 'Payment Confirmed - Your Website Project is Starting!',
    body: `Hi {business_name},

Thank you for your payment of {amount}!

We're now generating your custom assets:
- Professional logo
- Branding guide with colors and fonts
- Website design mockups

You'll receive an email when everything is ready (usually within 24 hours).

Access your dashboard anytime: {dashboard_link}

This link will log you in automatically.

Questions? Email support@freewebsite.deal

Best,
The FreeWebsite Team`,
  },
};

export type EmailSettings = typeof DEFAULT_EMAILS;

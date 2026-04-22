update app_settings
set email_templates = jsonb_set(
  jsonb_set(
    coalesce(email_templates, '{}'::jsonb),
    '{welcome}',
    jsonb_build_object(
      'subject', 'Your FreeWebsite sign-in link is here',
      'body', E'Hi {business_name},\n\nWelcome to FreeWebsite.\n\nClick the link below to sign in and go straight to your dashboard:\n\nOpen dashboard: {dashboard_link}\n\nThis magic link confirms your email and signs you in automatically — no password required.\n\nQuestions? Email support@freewebsite.deal\n\nBest,\nThe FreeWebsite Team'
    ),
    true
  ),
  '{onboardingInvite}',
  jsonb_build_object(
    'subject', 'Your FreeWebsite dashboard link - {business_name}',
    'body', E'Hi {business_name},\n\nUse the link below to sign in and go directly to your FreeWebsite dashboard.\n\nOpen dashboard: {onboarding_link}\n\nThis magic link will confirm your email and sign you in automatically — no password needed.\n\nQuestions? Email support@freewebsite.deal\n\nBest,\nThe FreeWebsite Team'
  ),
  true
)
where id = 'singleton';

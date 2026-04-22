import { sendNotification, BASE_URL, generateMagicLinkUrl } from './send-notification';

export async function sendWelcomeEmail({
  userEmail,
  businessName,
}: {
  userEmail: string;
  businessName?: string;
}) {
  const dashboardLink = await generateMagicLinkUrl(userEmail) ?? `${BASE_URL}/dashboard`;

  await sendNotification({
    templateKey: 'welcome',
    to: userEmail,
    vars: {
      business_name: businessName ?? 'there',
      dashboard_link: dashboardLink,
    },
    logLabel: `welcome → ${userEmail}`,
  });
}

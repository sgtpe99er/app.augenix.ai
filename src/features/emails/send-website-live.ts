import { sendNotification, BASE_URL, generateMagicLinkUrl } from './send-notification';

export async function sendWebsiteLiveEmail({
  userEmail,
  businessName,
  websiteUrl,
}: {
  userEmail: string;
  businessName: string;
  websiteUrl: string;
}) {
  const dashboardLink = await generateMagicLinkUrl(userEmail) ?? `${BASE_URL}/dashboard`;

  await sendNotification({
    templateKey: 'websiteLive',
    to: userEmail,
    vars: {
      business_name: businessName,
      website_url: websiteUrl,
      dashboard_link: dashboardLink,
    },
    logLabel: `websiteLive → ${userEmail}`,
  });
}

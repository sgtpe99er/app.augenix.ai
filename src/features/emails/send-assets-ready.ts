import { BASE_URL, generateMagicLinkUrl,sendNotification } from './send-notification';

export async function sendAssetsReadyEmail({
  userId,
  businessName,
  userEmail,
}: {
  userId: string;
  businessName: string;
  userEmail: string;
}) {
  const dashboardLink = await generateMagicLinkUrl(userEmail) ?? `${BASE_URL}/dashboard`;

  await sendNotification({
    templateKey: 'assetsReady',
    to: userEmail,
    vars: {
      business_name: businessName,
      dashboard_link: dashboardLink,
    },
    logLabel: `assetsReady [${userId}]`,
  });
}

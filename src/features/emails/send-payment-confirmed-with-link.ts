import { sendNotification, BASE_URL, generateMagicLinkUrl } from './send-notification';

export async function sendPaymentConfirmedWithLink({
  userId,
  userEmail,
  businessName,
  amount,
}: {
  userId: string;
  userEmail: string;
  businessName: string;
  amount: number;
}) {
  const dashboardLink = await generateMagicLinkUrl(userEmail) ?? `${BASE_URL}/dashboard`;

  await sendNotification({
    templateKey: 'paymentConfirmedWithLink',
    to: userEmail,
    vars: {
      business_name: businessName,
      amount: `$${amount}`,
      dashboard_link: dashboardLink,
    },
    logLabel: `paymentConfirmedWithLink → ${userEmail}`,
  });
}

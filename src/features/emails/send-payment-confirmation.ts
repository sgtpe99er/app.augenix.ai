import { sendNotification } from './send-notification';

export async function sendPaymentConfirmationEmail({
  userEmail,
  businessName,
  amount,
  hostingMonths,
}: {
  userEmail: string;
  businessName: string;
  amount: number;
  hostingMonths: number;
}) {
  await sendNotification({
    templateKey: 'paymentConfirmation',
    to: userEmail,
    vars: {
      business_name: businessName,
      amount: `$${amount}`,
      hosting_months: String(hostingMonths),
    },
    logLabel: `paymentConfirmation → ${userEmail}`,
  });
}

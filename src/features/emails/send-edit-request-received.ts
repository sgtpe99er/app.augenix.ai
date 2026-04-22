import { sendNotification } from './send-notification';

export async function sendEditRequestReceivedEmail({
  userEmail,
  businessName,
  requestDescription,
  complexity,
  eta,
}: {
  userEmail: string;
  businessName: string;
  requestDescription: string;
  complexity: string;
  eta: string;
}) {
  await sendNotification({
    templateKey: 'editRequestReceived',
    to: userEmail,
    vars: {
      business_name: businessName,
      request_description: requestDescription,
      complexity,
      eta,
    },
    logLabel: `editRequestReceived → ${userEmail}`,
  });
}

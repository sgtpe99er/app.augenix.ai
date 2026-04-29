import { BASE_URL,sendNotification } from './send-notification';

export async function sendEditRequestCompletedEmail({
  userEmail,
  businessName,
  requestDescription,
  websiteUrl,
}: {
  userEmail: string;
  businessName: string;
  requestDescription: string;
  websiteUrl?: string;
}) {
  await sendNotification({
    templateKey: 'editRequestCompleted',
    to: userEmail,
    vars: {
      business_name: businessName,
      request_description: requestDescription,
      website_link: websiteUrl ?? `${BASE_URL}/dashboard`,
    },
    logLabel: `editRequestCompleted → ${userEmail}`,
  });
}


import { z } from 'zod';

export const EmailCampaignGeneratorInputSchema = z.object({
  topic: z.string().describe('The topic or goal of the email campaign (e.g., "new antivirus software launch").'),
  discountCode: z.string().optional().describe('An optional discount code to include in the email content.'),
});
export type EmailCampaignGeneratorInput = z.infer<typeof EmailCampaignGeneratorInputSchema>;

// The output is now a single object containing both subject and content
export const EmailCampaignGeneratorOutputSchema = z.object({
  subject: z.string().describe('The generated, compelling subject line for the email.'),
  content: z.string().describe('The generated, concise, and engaging email body in HTML format.'),
});
export type EmailCampaignGeneratorOutput = z.infer<typeof EmailCampaignGeneratorOutputSchema>;

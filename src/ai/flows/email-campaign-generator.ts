
'use server';

/**
 * @fileOverview An AI flow to generate content for an email marketing campaign.
 */

import { getDynamicAi } from '@/ai/genkit';
import { z } from 'zod';
import { EmailCampaignGeneratorInputSchema, EmailCampaignGeneratorOutputSchema, type EmailCampaignGeneratorInput, type EmailCampaignGeneratorOutput } from '@/lib/schemas/email-campaign-generator';

export async function generateEmailCampaign(input: EmailCampaignGeneratorInput): Promise<EmailCampaignGeneratorOutput> {
  const { ai, modelName } = await getDynamicAi();
  const { topic, discountCode } = input;

  const promptText = `Bạn là một chuyên gia marketing email cho trang web Saigonsoft.com. Nhiệm vụ của bạn là soạn một email marketing ngắn gọn, hấp dẫn và chuyên nghiệp dựa trên chủ đề được cung cấp.

Chủ đề: ${topic}
${discountCode ? `Mã giảm giá đính kèm: ${discountCode}` : ''}

**Yêu cầu BẮT BUỘC:**
1.  **subject**: Tạo một tiêu đề email hấp dẫn, ngắn gọn, có chứa emoji phù hợp (ví dụ: 🔥, ✨, 🚀).
2.  **content**: Soạn nội dung email bằng các thẻ HTML CƠ BẢN.
    - **KHÔNG** bao gồm các thẻ như <html>, <head>, <body>, hoặc <style>.
    - Nội dung phải ngắn gọn, đi thẳng vào vấn đề và có lời kêu gọi hành động (Call To Action) rõ ràng.
    - Sử dụng các thẻ HTML như <h2> cho tiêu đề chính, <h3> cho tiêu đề phụ, và <p> cho các đoạn văn.
    - Nhấn mạnh các điểm quan trọng bằng thẻ <strong>.
    - Nếu có mã giảm giá, hãy đề cập đến nó một cách tự nhiên trong nội dung email.
    - Văn phong phải chuyên nghiệp, phù hợp với một công ty công nghệ tại Việt Nam.`;

  const { output } = await ai.generate({
      model: modelName,
      prompt: promptText,
      output: { schema: EmailCampaignGeneratorOutputSchema }
  });

  if (!output) {
    throw new Error('AI failed to generate email campaign content.');
  }
  return output as EmailCampaignGeneratorOutput;
}

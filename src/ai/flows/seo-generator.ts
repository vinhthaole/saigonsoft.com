
'use server';

/**
 * @fileOverview An AI flow to generate SEO content for products or pages.
 */

import { getDynamicAi } from '@/ai/genkit';
import { z } from 'zod';
import { SeoGeneratorInputSchema, SeoGeneratorOutputSchema, type SeoGeneratorInput, type SeoGeneratorOutput } from '@/lib/schemas/seo-generator';

export async function generateSeoContent(input: SeoGeneratorInput): Promise<SeoGeneratorOutput> {
  const { ai, modelName } = await getDynamicAi();
  const { productName, productDescription, pageTitle, pageContent } = input;

  const context = productName
      ? `Tên sản phẩm: "${productName}"\nMô tả sản phẩm: "${productDescription}"`
      : `Tiêu đề trang: "${pageTitle}"\nNội dung trang: "${pageContent?.substring(0, 1000)}..."`;

  const promptText = `Bạn là một chuyên gia SEO hàng đầu. Dựa trên thông tin sản phẩm/trang được cung cấp, hãy tạo ra một Tiêu đề SEO và một Mô tả SEO hấp dẫn và tối ưu hóa.

**Ngữ cảnh:**
---
${context}
---

**Yêu cầu:**
1.  **seoTitle:**
    - Tạo một tiêu đề hấp dẫn, chứa từ khóa chính.
    - Độ dài lý tưởng: 50-60 ký tự.
    - Nên bao gồm tên thương hiệu "Saigonsoft.com" một cách tự nhiên.
2.  **seoDescription:**
    - Viết một đoạn mô tả ngắn gọn, súc tích, và có sức thuyết phục.
    - Độ dài lý tưởng: 150-160 ký tự.
    - Phải chứa lời kêu gọi hành động (call-to-action) rõ ràng.
    - Tóm tắt được lợi ích chính của sản phẩm/nội dung trang.

Hãy đảm bảo cả hai đều được viết bằng tiếng Việt và tối ưu cho công cụ tìm kiếm.`;

  const { output } = await ai.generate({
      model: modelName,
      prompt: promptText,
      output: { schema: SeoGeneratorOutputSchema }
  });

  if (!output) {
    throw new Error('AI failed to generate SEO content.');
  }
  return output as SeoGeneratorOutput;
}

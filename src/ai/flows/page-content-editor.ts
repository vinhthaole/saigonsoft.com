
'use server';

import { z } from 'zod';
import { getDynamicAi } from '@/ai/genkit';
import { PageContentEditorInputSchema, PageContentEditorOutputSchema, type PageContentEditorInput, type PageContentEditorOutput } from '@/lib/schemas/page-content-editor';

export async function editPageContent(input: PageContentEditorInput): Promise<PageContentEditorOutput> {
  const { ai, modelName } = await getDynamicAi();
  const { existingContent, instruction } = input;

  const promptText = `Bạn là một biên tập viên web chuyên nghiệp. Nhiệm vụ của bạn là chỉnh sửa nội dung HTML hiện có dựa trên một hướng dẫn cụ thể.

**Nội dung HTML hiện tại:**
'''html
${existingContent}
'''

**Hướng dẫn chỉnh sửa:**
"${instruction}"

**Yêu cầu:**
- Đọc kỹ nội dung hiện tại và hướng dẫn.
- Áp dụng các thay đổi theo yêu cầu vào nội dung HTML.
- **Giữ nguyên cấu trúc và các thẻ HTML hiện có** trừ khi được yêu cầu thay đổi.
- Chỉ trả về nội dung đã được cập nhật trong trường 'newHtmlContent'.`;

  const { output } = await ai.generate({
      model: modelName,
      prompt: promptText,
      output: { schema: PageContentEditorOutputSchema }
  });

  if (!output) {
      throw new Error('AI failed to edit the content.');
  }
  return output as PageContentEditorOutput;
}

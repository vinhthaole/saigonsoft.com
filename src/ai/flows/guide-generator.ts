
'use server';

import { getDynamicAi } from '@/ai/genkit';
import { GuideGeneratorInputSchema, GuideGeneratorOutputSchema, type GuideGeneratorInput, type GuideGeneratorOutput } from '@/lib/schemas/guide-generator';

export async function generateGuide(input: GuideGeneratorInput): Promise<GuideGeneratorOutput> {
  const { ai, modelName } = await getDynamicAi();
  const { productName, productDescription } = input;

  const promptText = `Bạn là một chuyên gia hỗ trợ kỹ thuật cho một cửa hàng phần mềm tại Việt Nam.
Nhiệm vụ của bạn là viết một bài hướng dẫn chi tiết cho sản phẩm dựa trên các thông tin sau:
- **Tên sản phẩm:** "${productName}"
- **Mô tả ngắn:** "${productDescription}"

**YÊU CẦU BẮT BUỘC:**
1.  **Nội dung:** Viết một bài hướng dẫn chi tiết, từng bước về cách cài đặt và kích hoạt sản phẩm.
2.  **Định dạng:** Sử dụng định dạng Markdown để trình bày (ví dụ: dùng # cho tiêu đề, * cho danh sách).
3.  **Phần mua hàng và nhận sản phẩm:**
    - **QUAN TRỌNG:** Phải có một phần giải thích rõ ràng về cách khách hàng nhận sản phẩm sau khi mua hàng.
    - Nội dung của phần này PHẢI nói rằng: "Sau khi thanh toán thành công tại Saigonsoft.com, license key và liên kết tải về phần mềm sẽ được gửi tự động đến email của khách hàng. Khách hàng cũng có thể xem lại thông tin này bất cứ lúc nào trong mục 'Tải về & Giấy phép' trên trang tài khoản cá nhân của họ."
    - **KHÔNG** đề cập đến việc giao hàng vật lý hay bất kỳ hình thức nào khác.

Hãy tạo ra một bài hướng dẫn thân thiện, dễ hiểu và chính xác.`;

  const { output } = await ai.generate({
      model: modelName,
      prompt: promptText,
      output: { schema: GuideGeneratorOutputSchema }
  });

  if (!output) {
    throw new Error("AI failed to generate a guide.");
  }

  return output as GuideGeneratorOutput;
}

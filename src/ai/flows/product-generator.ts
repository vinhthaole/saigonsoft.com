
'use server';

import { z } from 'zod';
import { getDynamicAi } from '@/ai/genkit';
import { ProductDetailsInputSchema, ProductDetailsOutputSchema, GenerateProductDetailsOutputSchema, type ProductDetailsInput, type GenerateProductDetailsOutput } from '@/lib/schemas/product-generator';
import { getDynamicImage } from '@/lib/data';

export async function generateProductDetailsFlow(input: ProductDetailsInput): Promise<GenerateProductDetailsOutput> {
  const { ai, modelName } = await getDynamicAi();
  const { name, categories } = input;

  const promptText = `Bạn là một chuyên gia tạo sản phẩm cho một trang web thương mại điện tử Việt Nam bán phần mềm bản quyền.
Hãy tạo thông tin chi tiết cho sản phẩm có tên: "${name}"

**QUAN TRỌNG:** Dựa vào kiến thức của bạn về sản phẩm này để tạo ra thông tin.

**Danh sách danh mục có sẵn:**
${categories.map(c => `- ${c.name} (slug: ${c.slug})`).join('\n')}

**Yêu cầu:**
1.  **name**: Trả về tên chính thức của sản phẩm.
2.  **brand**: Tên thương hiệu hoặc công ty sản xuất phần mềm.
3.  **categoryId**: Slug của danh mục **phù hợp nhất** từ danh sách được cung cấp.
4.  **shortDescription**: Viết một mô tả ngắn gọn, hấp dẫn về sản phẩm (khoảng 150 ký tự).
5.  **longDescription**: Viết một mô tả chi tiết về sản phẩm, các tính năng và lợi ích của nó (khoảng 500 ký tự).
6.  **price**: Đề xuất một mức giá bán lẻ hợp lý bằng Việt Nam Đồng (VND).
7.  **salePrice**: Đề xuất một mức giá bán khuyến mãi hợp lý, có thể giống như giá gốc nếu không có khuyến mãi.
8.  **sku**: Tạo một Mã đơn vị lưu kho (SKU) cho cửa hàng, theo định dạng "SGS-[THUONGHIEU]-[TENSP]".
9.  **mfr**: Tạo một mã nhà sản xuất (MFR) hoặc SKU chính thức của sản phẩm. Đây là một trường bắt buộc.
10. **imageHint**: Hai hoặc ba từ khóa bằng **tiếng Anh** có thể được sử dụng để tìm một bức ảnh stock phù hợp cho sản phẩm này (ví dụ: "photo editing software").`;

  const { output } = await ai.generate({
      model: modelName,
      prompt: promptText,
      output: { schema: ProductDetailsOutputSchema }
  });

  if (!output) {
      throw new Error('AI failed to generate product details.');
  }
  
  const imageUrl = await getDynamicImage(output.imageHint, 'squarish');
  
  return {
      details: output,
      imageUrl: imageUrl,
  };
}

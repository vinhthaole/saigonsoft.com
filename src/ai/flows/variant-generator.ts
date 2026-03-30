
'use server';

import { getDynamicAi } from '@/ai/genkit';
import { VariantGeneratorInputSchema, VariantGeneratorOutputSchema, type VariantGeneratorInput, type VariantGeneratorOutput } from '@/lib/schemas/product-variants';

export async function generateVariants(input: VariantGeneratorInput): Promise<VariantGeneratorOutput> {
  const { ai, modelName } = await getDynamicAi();
  const { productName, licenseType, brand, shortDescription, categoryName, mfr } = input;

  const promptText = `Bạn là một chuyên gia chuyên lên cấu hình sản phẩm và định giá các phần mềm bản quyền tại thị trường Việt Nam.
**Thông tin sản phẩm:**
- **Tên:** "${productName}"
- **Thương hiệu (Hãng):** "${brand}"
- **Loại cấp bản quyền (License Type):** "${licenseType}"
- **Danh mục:** "${categoryName || 'Không xác định'}"
- **Nhà sản xuất (MFR):** "${mfr || 'Không xác định'}"
- **Nội dung:** "${shortDescription || 'Không có'}"

**Nhiệm vụ:**
Phân tích kỹ càng tên sản phẩm, hãng sản xuất và loại cấp bản quyền (kèm nội dung, MFR nếu có). Từ đó, DỰ ĐOÁN và TẠO RA chính xác cấu hình (biến thể - variants) của phần mềm này dựa trên đúng chính sách bán hàng thực tế của hãng. KHÔNG BỊA ĐẶT CÁC BIẾN THỂ VÔ LÝ.
- Ví dụ nếu là diệt virus Kaspersky, các biến thể thường là số máy tính / số năm (ví dụ: "1 user / 1 Năm", "3 users / 1 Năm").
- Nếu là Windows/Office bản quyền vĩnh viễn, biến thể thường chỉ là số thiết bị (ví dụ: "1 PC / Mac", "2 VPs").
- Dựa trên MFR hoặc Tên để quyết định chính xác đây là phần mềm cá nhân hay doanh nghiệp để tạo biến thể cho phù hợp.

**Chi tiết cần sinh ra cho mỗi biến thể:**
1.  **id**: Một id duy nhất.
2.  **name**: Tên biến thể ngắn gọn bằng tiếng Việt (ví dụ: "1 năm / 1 PC", "Trọn đời / 1 User").
3.  **price**: TRUY XUẤT GIÁ HÃNG (MSRP) CHUẨN XÁC, SÁT THỰC TẾ TRÊN THỊ TRƯỜNG HIỆN TẠI (quy đổi ra VNĐ). Nếu không rõ, hãy ước tính giá sát nhất trên thị trường Việt Nam.
4.  **salePrice**: Tính toán giá bán lẻ khuyến mãi (Sale) thấp hơn giá MSRP từ 10% đến cực đại 45%. Sẽ RẤT KHÔNG HỢP LÝ nếu không có giảm giá. Phải nằm bằng đơn vị VNĐ và có tính cạnh tranh.
5.  **sku**: Tạo mã lưu kho đúng chuẩn format cho từng biến thể, ví dụ: "SGS-[BRAND]-[PRODUCTNAME]-[VARIANTDETAILS]".
`;

  const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-pro',
      prompt: promptText,
      output: { schema: VariantGeneratorOutputSchema }
  });

  if (!output) {
      throw new Error("AI failed to generate variants.");
  }
  return output as VariantGeneratorOutput;
}

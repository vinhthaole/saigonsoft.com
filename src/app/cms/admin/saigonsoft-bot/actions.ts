'use server';

import { db } from '@/lib/firebase';
import { getSiteConfig, getCategories, getProducts, getPages, getDiscounts, getTaxRates } from '@/lib/data';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

function computeHash(data: any): string {
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
}

export type KnowledgeDiff = {
    added: string[];
    modified: string[];
    removed: string[];
    configChanged: boolean;
};

export async function analyzeAIKnowledgeBase() {
    try {
        // 1. Fetch current (old) knowledge base
        const docSnap = await getDoc(doc(db, 'settings', 'ai_knowledge'));
        const oldData = docSnap.exists() ? docSnap.data() : null;
        const oldEntitiesHash = oldData?.entitiesHash || { config: '', products: {} };

        // 2. Fetch new data
        const config = await getSiteConfig();
        const categories = await getCategories();
        
        let catalog = `BẠN LÀ SAIGONSOFT AI - TRỢ LÝ TƯ VẤN BÁN HÀNG DÀNH DANH RIÊNG CHO WEBSITE NÀY.\n`;
        catalog += `Tên công ty: ${config?.companyInfo?.name || 'Saigonsoft'}\n`;
        if (config?.companyInfo?.phone) catalog += `Hotline/Zalo: ${config.companyInfo.phone}\n`;
        if (config?.companyInfo?.address) catalog += `Địa chỉ: ${config.companyInfo.address}\n\n`;
        catalog += `QUY TẮC HOẠT ĐỘNG:
1. Bạn đóng vai nhân viên tư vấn nhiệt tình, thân thiện, trả lời ngắn gọn, lịch sự, đúng trọng tâm.
2. TỔNG HỢP KIẾN THỨC: Bạn là Bách khoa toàn thư của website. Nếu khách hỏi về Chính sách thanh toán, Bảo hành, Đại lý (Reseller), Điểm thưởng, Cách mua hàng... Hãy dựa vào phần "TÀI LIỆU CỬA HÀNG" bên dưới để trả lời thật tự tin và chi tiết.
3. Chỉ tư vấn và bán các sản phẩm có thật trong danh sách bên dưới, Không tự chế giá, không tự bịa ra chính sách.
4. Nếu khách hỏi giá, hãy đọc giá Sale (nếu có) thay vì giá Gốc để dụ khách chốt đơn. Đồng thời nhắc nhở nếu có Mã giảm giá khả dụng.
5. LUÔN LUÔN đính kèm Link Mua Hàng hoặc Link Bài Viết dưới dạng thẻ Markdown có thể click được: ví dụ [👉 Nhấn vào đây](/products/x) hoặc [Đọc thêm](/pages/y).
6. Cố gắng sử dụng xuống dòng hoặc in đậm để câu chữ dễ đọc. Đoạn nào có link thì in đậm.
7. ĐỐI TÁC & BÁO GIÁ SỈ: Cửa hàng cung cấp chiết khấu sỉ. Hướng dẫn khách hàng doanh nghiệp hoặc đại lý gửi email qua **[sales@saigonsoft.com](mailto:sales@saigonsoft.com)** hoặc **[partners@saigonsoft.com](mailto:partners@saigonsoft.com)** để có cấp bậc Reseller tốt nhất.

--- TÀI LIỆU CỬA HÀNG (CÁC CHÍNH SÁCH, THANH TOÁN, ĐẠI LÝ) ---
`;

        const pages = await getPages();
        pages.forEach(p => {
            catalog += `\n[Tài liệu: ${p.title}]\n`;
            
            // Apply dynamic placeholders
            let processedContent = p.content ? p.content
                .replace(/{{company\.name}}/g, config.companyInfo?.name || '')
                .replace(/{{company\.address}}/g, config.companyInfo?.address || '')
                .replace(/{{company\.phone}}/g, config.companyInfo?.phone || '')
                .replace(/{{company\.email}}/g, config.companyInfo?.email || '')
                .replace(/{{company\.website}}/g, config.companyInfo?.websiteUrl || '')
                .replace(/{{company\.taxCode}}/g, config.companyInfo?.taxCode || '')
                : '';

            // Strip HTML to save tokens and make it readable
            let plainText = processedContent.replace(/<[^>]*>?/gm, '');
            catalog += `${plainText.substring(0, 1500)}...\n`;
        });

        const discounts = await getDiscounts();
        const activeDiscounts = discounts.filter(d => d.isActive);
        if (activeDiscounts.length > 0) {
            catalog += `\n[Danh sách Mã giảm giá đang chạy]\n`;
            activeDiscounts.forEach(d => {
                catalog += `- Code: ${d.code} | Giảm: ${d.type === 'percentage' ? d.value + '%' : d.value + 'đ'}.\n`;
            });
        }

        catalog += `\n[Thông tin Hệ thống Hỗ trợ]\n`;
        if (config?.paymentMethods) {
            catalog += "Các cổng thanh toán đang mở:\n";
            if (config.paymentMethods.vietqr?.enabled) catalog += "- Chuyển khoản ngân hàng (VietQR)\n";
            if (config.paymentMethods.zalopay?.enabled) catalog += "- Thanh toán ZaloPay\n";
            if (config.paymentMethods.creditcard?.enabled) catalog += "- Thẻ tín dụng / Thẻ ghi nợ\n";
        }
        
        try {
            const taxRates = await getTaxRates();
            if (taxRates && taxRates.length > 0) {
                catalog += `\nCấu trúc Thuế/VAT áp dụng:\n`;
                taxRates.forEach(t => {
                    catalog += `- ${t.countryName}: ${t.rate}% (Mặc định: ${config?.tax?.defaultCountryCode === t.countryCode ? 'Có' : 'Không'})\n`;
                });
            }
        } catch(e) {}

        if (config?.loyalty) {
            catalog += `\n[Cấu trúc Điểm thưởng & Đại lý (Reseller / Partners)]\n`;
            catalog += `Tỉ lệ quy đổi gốc: 1 Điểm = ${config.loyalty.pointConversionRate} VNĐ.\n`;
            
            if (config.loyalty.tiers) {
                catalog += `* Hạng Thành viên (Khách lẻ):\n`;
                Object.values(config.loyalty.tiers).forEach(tier => {
                    catalog += `  - Hạng ${tier.name}: Cần ${tier.minPoints} điểm (Giảm giá vĩnh viễn ${tier.discountPercentage}%). Lợi ích: ${tier.benefits?.join(', ')}.\n`;
                });
            }
            if (config.loyalty.resellerLoyaltyTiers) {
                catalog += `* Hạng Đối tác / Đại lý (Reseller):\n`;
                Object.values(config.loyalty.resellerLoyaltyTiers).forEach(tier => {
                    catalog += `  - Cấp ${tier.name}: Doanh số hoặc Điểm yêu cầu: ${tier.minPoints} (Chiết khấu sỉ ${tier.discountPercentage}%). Quyền lợi: ${tier.benefits?.join(', ')}.\n`;
                });
            }
        }

        catalog += `\n--- DỮ LIỆU SẢN PHẨM KHẢ DỤNG TẠI CỬA HÀNG ---\n`;

        const newEntitiesHash: { config: string; products: Record<string, string> } = {
            config: computeHash({
                company: config?.companyInfo || {},
                loyalty: config?.loyalty || {},
                tax: config?.tax || {},
                payment: config?.paymentMethods || {}
            }),
            products: {}
        };

        for (const cat of categories) {
            const products = await getProducts(cat.slug, { status: 'active' });
            if (products.length === 0) continue;

            catalog += `\n--- DANH MỤC: ${cat.name.toUpperCase()} ---\n`;
            products.forEach(p => {
                 const defaultVariant = p.variants?.find(v => v.name.toLowerCase() === 'mặc định') || p.variants?.[0];
                 let priceStr = defaultVariant ? `Giá gốc: ${defaultVariant.price}đ` : 'Chưa có giá';
                 if (defaultVariant?.salePrice) priceStr += `, Giá Sale: ${defaultVariant.salePrice}đ`;
                 
                 catalog += `- Tên SP: ${p.name} (Hãng: ${p.brand})\n`;
                 catalog += `  + ${priceStr}\n`;
                 if (p.shortDescription) catalog += `  + Mô tả: ${p.shortDescription}\n`;
                 catalog += `  + Link trang SP: /products/${p.slug}\n`;

                 // Calculate hash for this product to detect modifications
                 newEntitiesHash.products[p.slug] = computeHash({
                      name: p.name,
                      brand: p.brand,
                      shortDesc: p.shortDescription || '',
                      price: defaultVariant?.price,
                      salePrice: defaultVariant?.salePrice
                 });
            });
        }

        // Add hashes for pages and discounts to track document changes
        newEntitiesHash.products['_pages_hash'] = computeHash(pages.map(p => p.id + p.title + p.content.length).join(','));
        newEntitiesHash.products['_discounts_hash'] = computeHash(activeDiscounts.map(d => d.code + d.isActive).join(','));

        // 3. Diff Analysis
        const diff: KnowledgeDiff = {
             added: [],
             modified: [],
             removed: [],
             configChanged: newEntitiesHash.config !== oldEntitiesHash.config
        };

        const oldProductSlugs = Object.keys(oldEntitiesHash.products || {});
        const newProductSlugs = Object.keys(newEntitiesHash.products || {});

        newProductSlugs.forEach(slug => {
            if (!oldEntitiesHash.products[slug]) {
                diff.added.push(slug);
            } else if (oldEntitiesHash.products[slug] !== newEntitiesHash.products[slug]) {
                diff.modified.push(slug);
            }
        });

        oldProductSlugs.forEach(slug => {
            if (!newEntitiesHash.products[slug]) {
                 diff.removed.push(slug);
            }
        });

        const hasChanges = diff.configChanged || diff.added.length > 0 || diff.modified.length > 0 || diff.removed.length > 0;

        return { 
            success: true, 
            hasChanges, 
            diff, 
            catalog, 
            entitiesHash: newEntitiesHash 
        };

    } catch (error) {
        console.error("AI Analyze Error:", error);
        return { success: false, error: 'Failed to analyze website data for AI' };
    }
}

export async function commitAIKnowledgeBase(
    adminEmail: string, 
    catalog: string, 
    entitiesHash: any
) {
    try {
        await setDoc(doc(db, 'settings', 'ai_knowledge'), {
            content: catalog,
            entitiesHash: entitiesHash,
            updatedAt: serverTimestamp(),
            updatedBy: adminEmail
        }, { merge: true });
        
        revalidatePath('/cms/admin/saigonsoft-bot');

        return { success: true };
    } catch (error) {
        console.error("AI Commit Error:", error);
        return { success: false, error: 'Lỗi ghi đè CSDL AI.' };
    }
}

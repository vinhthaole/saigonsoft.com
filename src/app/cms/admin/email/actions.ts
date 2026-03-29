
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { sendBulkEmail } from '@/lib/email';
import type { Customer, Discount, CampaignHistoryItem, UserProfile } from '@/lib/types';
import { getCustomers } from '@/lib/data';
import { applyDiscountCode } from '@/app/cms/admin/discounts/actions';
import { getOrders } from '@/lib/data';
import { subDays } from 'date-fns';
import { generateFlow } from 'genkit/flow';
import { z as zod } from 'zod';
import { geminiPro } from 'genkitx/googleai';
import { Action, defineAction } from '@genkit-ai/core';

// This is a placeholder for your actual email campaign generation logic.
// You might use a Genkit flow to generate content, or simply define it here.
export const generateEmailCampaignContent: Action<any, any> = defineAction(
  'generateEmailCampaignContent',
  async (input) => {
    // In a real scenario, you'd use the input to generate content.
    // For now, returning a dummy response.
    return {
      subject: "Chủ đề email được tạo tự động",
      body: "Đây là nội dung email được tạo tự động. " + JSON.stringify(input),
    };
  }
);


const emailCampaignSchema = z.object({
  subject: z.string().min(5, "Chủ đề email phải có ít nhất 5 ký tự."),
  body: z.string().min(20, "Nội dung email phải có ít nhất 20 ký tự."),
  targetAudience: z.enum(['all', 'unpaid', 'active_30', 'active_90', 'inactive_90']),
  discountCode: z.string().optional(),
});


export async function sendEmailCampaign(data: z.infer<typeof emailCampaignSchema>) {
    const validatedData = emailCampaignSchema.parse(data);
    
    // 1. Validate discount code if provided
    let discount: Discount | null = null;
    if (validatedData.discountCode) {
        try {
            discount = await applyDiscountCode(validatedData.discountCode);
        } catch (error: any) {
            throw new Error(`Mã giảm giá không hợp lệ: ${error.message}`);
        }
    }

    // 2. Fetch target audience
    const allCustomers = await getCustomers('all');
    let targetCustomers: UserProfile[] = [];

    switch (validatedData.targetAudience) {
        case 'all':
            targetCustomers = allCustomers;
            break;
        case 'unpaid':
            const { orders: unpaidOrders } = await getOrders({ options: { status: 'Chờ thanh toán' } });
            const unpaidCustomerIds = new Set(unpaidOrders.map(o => o.customer.id));
            targetCustomers = allCustomers.filter(c => c.uid && unpaidCustomerIds.has(c.uid));
            break;
        case 'active_30':
        case 'active_90':
            const days = validatedData.targetAudience === 'active_30' ? 30 : 90;
            const activeDate = subDays(new Date(), days);
            const { orders: recentOrders } = await getOrders({});
            const recentCustomerIds = new Set(
                recentOrders
                    .filter(o => o.customer.id && (o.createdAt as Timestamp).toDate() > activeDate)
                    .map(o => o.customer.id)
            );
            targetCustomers = allCustomers.filter(c => c.uid && recentCustomerIds.has(c.uid));
            break;
        case 'inactive_90':
            const ninetyDaysAgo = subDays(new Date(), 90);
            const { orders: allOrders } = await getOrders({});
            const activeWithin90DaysIds = new Set(
                allOrders
                    .filter(o => o.customer.id && (o.createdAt as Timestamp).toDate() > ninetyDaysAgo)
                    .map(o => o.customer.id)
            );
            targetCustomers = allCustomers.filter(c => c.uid && !activeWithin90DaysIds.has(c.uid));
            break;
        default:
            targetCustomers = allCustomers;
    }
    
    const recipients = targetCustomers.map(c => ({ email: c.email, name: c.displayName }));

    if (recipients.length === 0) {
        throw new Error("Không tìm thấy người nhận nào cho đối tượng đã chọn.");
    }

    // 3. Construct and send emails
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    function getFullHtml(bodyContent: string, discountDetails: Discount | null) {
     let discountHtml = '';
     if (discountDetails) {
         const discountValue = discountDetails.type === 'percentage' ? `${discountDetails.value}%` : `${discountDetails.value.toLocaleString('vi-VN')} VNĐ`;
         discountHtml = `
             <div style="background-color: #e6f7ff; border: 2px dashed #91d5ff; padding: 15px; text-align: center; margin: 20px 0;">
                 <p style="font-size: 1.1em; margin: 0;">Sử dụng mã giảm giá đặc biệt của bạn:</p>
                 <p style="font-size: 1.5em; font-weight: bold; color: #0056b3; margin: 10px 0; letter-spacing: 2px; border: 1px solid #0056b3; padding: 10px; display: inline-block;">${discountDetails.code}</p>
                 <p style="font-size: 1.1em; margin: 0;">Để được giảm ${discountValue} cho đơn hàng tiếp theo của bạn!</p>
             </div>
         `;
     }

     return `
           <div style="font-family: Arial, sans-serif; color: #333; max-width: 680px; margin: auto; border: 1px solid #eee; padding: 20px;">
               ${bodyContent}
               
               ${discountHtml}
               
               <div style="text-align: center; margin: 30px 0;">
                   <a href="${baseUrl}/products" style="background-color: #0056b3; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Khám phá ngay</a>
               </div>
               
               <p style="margin-top: 40px; font-size: 0.9em; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                   Bạn nhận được email này vì bạn đã đăng ký tài khoản tại Saigonsoft.com.<br>
                   © ${new Date().getFullYear()} Saigonsoft.com. All rights reserved.
               </p>
           </div>
       `;
     }
    
    await sendBulkEmail(
        recipients,
        validatedData.subject,
        (recipient) => getFullHtml(validatedData.body.replace('{{name}}', recipient.name), discount)
    );

    const historyCol = collection(db, 'email_campaigns');
    await addDoc(historyCol, {
        subject: validatedData.subject,
        content: validatedData.body,
        targetAudience: validatedData.targetAudience,
        recipients: recipients,
        sentCount: recipients.length,
        sentAt: serverTimestamp(),
        discountCode: validatedData.discountCode || null,
    });

    revalidatePath('/cms/admin/email');

    return { success: true, count: recipients.length };
}

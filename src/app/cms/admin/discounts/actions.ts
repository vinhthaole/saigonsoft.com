
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs, getDoc, query, where, Timestamp, increment } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Discount } from '@/lib/types';
import { serializeForClient } from '@/lib/serializeForClient';


const discountSchema = z.object({
  code: z.string().min(3, "Mã code phải có ít nhất 3 ký tự.").toUpperCase(),
  type: z.enum(['percentage', 'fixed']),
  value: z.coerce.number().positive("Giá trị phải là số dương."),
  expiresAt: z.date().optional(),
  usageLimit: z.coerce.number().min(0, "Số lượng phải là số không âm.").optional(),
  isActive: z.boolean().default(true),
});

export async function addDiscount(data: z.infer<typeof discountSchema>) {
  const validatedData = discountSchema.parse(data);

  try {
    const discountsCollection = collection(db, 'discounts');
    const docRef = await addDoc(discountsCollection, {
        ...validatedData,
        timesUsed: 0,
        createdAt: Timestamp.now(),
        expiresAt: validatedData.expiresAt ? Timestamp.fromDate(validatedData.expiresAt) : null,
    });
    revalidatePath('/cms/admin/discounts');
    return { id: docRef.id };
  } catch (error) {
    console.error("Error adding discount: ", error);
    throw new Error("Không thể thêm mã giảm giá.");
  }
}

export async function updateDiscount(id: string, data: z.infer<typeof discountSchema>) {
    const validatedData = discountSchema.parse(data);
    const discountRef = doc(db, 'discounts', id);

    try {
        await updateDoc(discountRef, {
            ...validatedData,
            expiresAt: validatedData.expiresAt ? Timestamp.fromDate(validatedData.expiresAt) : null,
        });
        revalidatePath('/cms/admin/discounts');
    } catch (error) {
        console.error("Error updating discount: ", error);
        throw new Error("Không thể cập nhật mã giảm giá.");
    }
}

export async function deleteDiscount(id: string) {
    if (!id) throw new Error('Cần có ID mã giảm giá.');
    const discountRef = doc(db, 'discounts', id);
    try {
        await deleteDoc(discountRef);
        revalidatePath('/cms/admin/discounts');
    } catch (error) {
        console.error("Error deleting discount: ", error);
        throw new Error("Không thể xóa mã giảm giá.");
    }
}

export async function getDiscounts(): Promise<Discount[]> {
    const discountsCol = collection(db, 'discounts');
    const q = query(discountsCol);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Discount));
}

export async function getDiscountById(id: string): Promise<Discount | null> {
    const discountRef = doc(db, 'discounts', id);
    const docSnap = await getDoc(discountRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Discount;
    }
    return null;
}

export async function applyDiscountCode(code: string): Promise<Discount> {
  try {
    const discountsCol = collection(db, 'discounts');
    const q = query(discountsCol, where('code', '==', code.toUpperCase()));
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        throw new Error("Mã giảm giá không tồn tại.");
    }
    
    const discountDoc = snapshot.docs[0];
    const discount = { id: discountDoc.id, ...discountDoc.data() } as Discount;

    if (!discount.isActive) {
        throw new Error("Mã giảm giá này không còn hoạt động.");
    }

    if (discount.expiresAt) {
        const expiresDate = (discount.expiresAt as Timestamp).toDate();
        expiresDate.setHours(23, 59, 59, 999); // Set to end of day to be safe
        
        const today = new Date();

        if (today > expiresDate) {
            throw new Error("Mã giảm giá đã hết hạn.");
        }
    }

    if (discount.usageLimit !== null && discount.usageLimit > 0 && discount.timesUsed >= discount.usageLimit) {
        throw new Error("Mã giảm giá đã hết lượt sử dụng.");
    }

    return serializeForClient(discount);
  } catch (error: any) {
      console.error(`Error applying discount code "${code}":`, error);
      // Re-throw specific, user-friendly messages.
      if (error.message.includes("Mã giảm giá")) {
          throw error;
      }
      // For generic errors, throw a generic message.
      throw new Error("Không thể áp dụng mã giảm giá. Vui lòng thử lại.");
  }
}


export async function incrementDiscountUsage(discountId: string) {
    if (!discountId) return;
    const discountRef = doc(db, 'discounts', discountId);
    try {
        await updateDoc(discountRef, {
            timesUsed: increment(1)
        });
    } catch (error) {
        console.error("Error incrementing discount usage:", error);
        // We don't throw an error here to avoid failing the whole order process
        // if just the discount increment fails. Logging is sufficient.
    }
}

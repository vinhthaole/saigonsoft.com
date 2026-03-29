
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { generateIconSuggestions } from '@/ai/flows/icon-generator';

const brandSchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
});

const brandUpdateSchema = brandSchema;

export async function addBrand(data: z.infer<typeof brandSchema>) {
  const validatedData = brandSchema.parse(data);

  try {
    const brandsCollection = collection(db, 'brands');
    
    // Check if brand already exists
    const q = query(brandsCollection, where("name", "==", validatedData.name));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error("Thương hiệu với tên này đã tồn tại.");
    }

    await addDoc(brandsCollection, validatedData);

    revalidatePath('/cms/admin/brands');
    revalidatePath('/products'); // Revalidate product pages that use filters
    revalidatePath('/category', 'layout'); // Revalidate category pages that use filters

  } catch (error: any) {
    console.error("Error adding brand: ", error);
    if (error.message.includes("đã tồn tại")) {
        throw error;
    }
    throw new Error("Không thể thêm thương hiệu vào cơ sở dữ liệu.");
  }
}


export async function updateBrand(id: string, data: z.infer<typeof brandUpdateSchema>) {
    const validatedData = brandUpdateSchema.parse(data);
    const brandRef = doc(db, 'brands', id);

    try {
        await updateDoc(brandRef, validatedData);
        
        // Fire-and-forget revalidation
        revalidatePath('/cms/admin/brands');
        revalidatePath('/products');
        revalidatePath('/category', 'layout');
    } catch (error) {
        console.error("Error updating brand: ", error);
        throw new Error("Không thể cập nhật thương hiệu.");
    }
}

export async function deleteBrand(id: string) {
    if (!id) {
        throw new Error('Cần có ID thương hiệu.');
    }
    const brandRef = doc(db, 'brands', id);

    try {
        await deleteDoc(brandRef);
        // Fire-and-forget revalidation
        revalidatePath('/cms/admin/brands');
        revalidatePath('/products');
        revalidatePath('/category', 'layout');
    } catch (error) {
        console.error("Error deleting brand: ", error);
        throw new Error("Không thể xóa thương hiệu.");
    }
}

export async function importBrands(brandNames: string[]) {
  if (!brandNames || brandNames.length === 0) {
    throw new Error("Không có thương hiệu nào để nhập.");
  }
  
  const brandsCollection = collection(db, 'brands');
  
  try {
    const batch = writeBatch(db);
    
    // Fetch existing brands to avoid duplicates
    const existingBrandsSnapshot = await getDocs(brandsCollection);
    const existingBrandNames = new Set(existingBrandsSnapshot.docs.map(doc => doc.data().name.toLowerCase()));
    
    let addedCount = 0;
    for (const name of brandNames) {
      if (name && !existingBrandNames.has(name.toLowerCase())) {
        const newBrandRef = doc(brandsCollection);
        batch.set(newBrandRef, { name, icon: '' });
        existingBrandNames.add(name.toLowerCase()); // Add to set to prevent duplicate adds from the same file
        addedCount++;
      }
    }

    if (addedCount > 0) {
        await batch.commit();
    }
    
    revalidatePath('/cms/admin/brands');

    return {
      total: brandNames.length,
      added: addedCount,
      skipped: brandNames.length - addedCount
    };

  } catch (error) {
    console.error("Error importing brands:", error);
    throw new Error("Đã xảy ra lỗi khi nhập thương hiệu từ tệp.");
  }
}

export async function generateAndAssignBrandIcons(brandNames: string[]): Promise<{ updatedCount: number }> {
    if (!brandNames || brandNames.length === 0) {
        throw new Error("No brand names provided.");
    }

    try {
        const suggestions = await generateIconSuggestions({ names: brandNames });
        
        const brandsCol = collection(db, 'brands');
        
        const batch = writeBatch(db);
        let updatedCount = 0;

        for (const suggestion of suggestions.icons) {
            const q = query(brandsCol, where("name", "==", suggestion.name));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const docRef = querySnapshot.docs[0].ref;
                batch.update(docRef, { icon: suggestion.iconName });
                updatedCount++;
            }
        }
        
        if (updatedCount > 0) {
            await batch.commit();
        }

        revalidatePath('/cms/admin/brands');
        revalidatePath('/', 'layout');

        return { updatedCount };
    } catch (error) {
        console.error("Error generating and assigning brand icons:", error);
        throw new Error("An error occurred during the AI icon generation process for brands.");
    }
}

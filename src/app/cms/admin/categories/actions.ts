
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, deleteDoc, writeBatch, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { generateIconSuggestions } from '@/ai/flows/icon-generator';

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be in kebab-case."),
  icon: z.string().optional(),
});

const categoryUpdateSchema = categorySchema;


export async function addCategory(data: z.infer<typeof categorySchema>) {
  const validatedData = categorySchema.parse(data);

  try {
    const categoryRef = doc(db, 'categories', validatedData.slug);
    const docSnap = await getDoc(categoryRef);

    if (docSnap.exists()) {
        throw new Error("Danh mục với slug này đã tồn tại.");
    }
    
    await setDoc(categoryRef, { 
        name: validatedData.name,
        icon: validatedData.icon || '',
    });

    // Fire-and-forget revalidation
    revalidatePath('/cms/admin/categories');
    revalidatePath('/products');
    revalidatePath('/category', 'layout');

  } catch (error: any) {
    console.error("Error adding category: ", error);
     if (error.message.includes("đã tồn tại")) {
        throw error;
    }
    throw new Error("Không thể thêm danh mục vào cơ sở dữ liệu.");
  }
}

export async function updateCategory(oldSlug: string, data: z.infer<typeof categoryUpdateSchema>) {
    const validatedData = categoryUpdateSchema.parse(data);
    const batch = writeBatch(db);

    const oldCategoryRef = doc(db, 'categories', oldSlug);
    const newCategoryRef = doc(db, 'categories', validatedData.slug);
    
    const dataToSave = {
        name: validatedData.name,
        icon: validatedData.icon || '',
    };

    try {
        // If slug is changed, we need to move the document
        if (oldSlug !== validatedData.slug) {
            const newSlugSnap = await getDoc(newCategoryRef);
            if (newSlugSnap.exists()) {
                throw new Error("Slug mới đã tồn tại.");
            }
            // Create new document and delete old one
            batch.set(newCategoryRef, dataToSave);
            batch.delete(oldCategoryRef);

            // Update all products that reference the old category
            const productsQuery = query(collection(db, 'products'), where('category.slug', '==', oldSlug));
            const productsSnapshot = await getDocs(productsQuery);
            productsSnapshot.forEach(productDoc => {
                const productRef = doc(db, 'products', productDoc.id);
                batch.update(productRef, { 
                    category: {
                        slug: validatedData.slug,
                        name: validatedData.name
                    }
                });
            });

        } else {
            // Just update the name if slug hasn't changed
            batch.update(oldCategoryRef, dataToSave);
            
             // Update name in products as well
            const productsQuery = query(collection(db, 'products'), where('category.slug', '==', oldSlug));
            const productsSnapshot = await getDocs(productsQuery);
            productsSnapshot.forEach(productDoc => {
                const productRef = doc(db, 'products', productDoc.id);
                batch.update(productRef, { 'category.name': validatedData.name });
            });
        }
        
        await batch.commit();
        
        // Fire-and-forget revalidation
        revalidatePath('/cms/admin/categories');
        revalidatePath('/products');
        revalidatePath(`/category/${oldSlug}`);
        if (oldSlug !== validatedData.slug) {
            revalidatePath(`/category/${validatedData.slug}`);
        }
    } catch(error: any) {
        console.error("Error updating category: ", error);
         if (error.message.includes("đã tồn tại")) {
            throw error;
        }
        throw new Error("Không thể cập nhật danh mục.");
    }
}


export async function deleteCategory(slug: string) {
    if (!slug) {
        throw new Error('Cần có slug của danh mục.');
    }
    
    try {
        // Check if any product is using this category
        const productsQuery = query(collection(db, 'products'), where('category.slug', '==', slug));
        const productsSnapshot = await getDocs(productsQuery);
        if (!productsSnapshot.empty) {
            throw new Error(`Không thể xóa danh mục. Nó đang được sử dụng bởi ${productsSnapshot.size} sản phẩm.`);
        }

        const categoryRef = doc(db, 'categories', slug);
        await deleteDoc(categoryRef);

        // Fire-and-forget revalidation
        revalidatePath('/cms/admin/categories');
        revalidatePath('/products');
        revalidatePath('/category', 'layout');
    } catch (error: any) {
        console.error("Error deleting category: ", error);
        if (error.message.includes("Không thể xóa")) {
            throw error;
        }
        throw new Error("Không thể xóa danh mục.");
    }
}

export async function generateAndAssignIcons(categoryNames: string[]): Promise<{ updatedCount: number }> {
    if (!categoryNames || categoryNames.length === 0) {
        throw new Error("No category names provided.");
    }

    try {
        // Step 1: Call AI flow to get icon suggestions
        const suggestions = await generateIconSuggestions({ names: categoryNames });
        
        // Step 2: Get all category documents from Firestore
        const categoriesCol = collection(db, 'categories');
        const querySnapshot = await getDocs(categoriesCol);
        
        // Create a map for quick lookup: categoryName -> categoryDocId (slug)
        const categoryNameToIdMap = new Map<string, string>();
        querySnapshot.forEach(doc => {
            categoryNameToIdMap.set(doc.data().name.toLowerCase(), doc.id);
        });

        // Step 3: Create a batch write to update all categories
        const batch = writeBatch(db);
        let updatedCount = 0;

        for (const suggestion of suggestions.icons) {
            const categoryId = categoryNameToIdMap.get(suggestion.name.toLowerCase());
            if (categoryId) {
                const docRef = doc(db, 'categories', categoryId);
                batch.update(docRef, { icon: suggestion.iconName });
                updatedCount++;
            }
        }
        
        // Step 4: Commit the batch
        if (updatedCount > 0) {
            await batch.commit();
        }

        // Step 5: Revalidate paths
        revalidatePath('/cms/admin/categories');
        revalidatePath('/', 'layout'); // Revalidate layout to update icons on homepage etc.

        return { updatedCount };
    } catch (error) {
        console.error("Error generating and assigning icons:", error);
        throw new Error("An error occurred during the AI icon generation process.");
    }
}

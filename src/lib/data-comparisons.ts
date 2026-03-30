'use server';

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { ProductComparisonOutput } from '@/lib/schemas/product-comparison';

const createComparisonKey = (mainProductId: string, competitorIds: string[]): string => {
  const allIds = [mainProductId, ...competitorIds];
  return allIds.sort().join('-');
};

export async function getGlobalComparison(mainProductId: string, competitorIds: string[]): Promise<ProductComparisonOutput | null> {
    try {
        const key = createComparisonKey(mainProductId, competitorIds);
        const docRef = doc(db, 'comparisons', key);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data().result as ProductComparisonOutput;
        }
        return null;
    } catch (error) {
        console.error("Error fetching global comparison:", error);
        return null;
    }
}

export async function saveGlobalComparison(mainProductId: string, competitorIds: string[], result: ProductComparisonOutput): Promise<void> {
    try {
        const key = createComparisonKey(mainProductId, competitorIds);
        const docRef = doc(db, 'comparisons', key);
        
        await setDoc(docRef, {
            productIds: [mainProductId, ...competitorIds].sort(),
            result,
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error("Error saving global comparison:", error);
    }
}

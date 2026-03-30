'use server';

import { getProducts, getCategories } from '@/lib/data';
import { getGlobalComparison, saveGlobalComparison } from '@/lib/data-comparisons';
import { generateProductComparison } from '@/ai/flows/product-comparison-generator';
import type { CompetitorInfo } from '@/lib/schemas/product-comparison';

export type ComparisonPair = {
    prodA: { id: string, name: string };
    prodB: { id: string, name: string };
};

export async function checkMissingComparisons(): Promise<{ pairs: ComparisonPair[], totalProducts: number }> {
    // Return all missing pairwise comparisons for products in the same category
    // We only compare 'active' products to save cost
    
    const categories = await getCategories();
    let missingPairs: ComparisonPair[] = [];
    let totalProducts = 0;

    for (const category of categories) {
        const products = await getProducts(category.slug);
        const activeProducts = products.filter(p => p.status === 'active' && p.id);
        totalProducts += activeProducts.length;

        // Generate combinations of 2
        for (let i = 0; i < activeProducts.length; i++) {
            for (let j = i + 1; j < activeProducts.length; j++) {
                const p1 = activeProducts[i];
                const p2 = activeProducts[j];
                
                // Check if they are already compared
                const cached = await getGlobalComparison(p1.id!, [p2.id!]);
                if (!cached) {
                    missingPairs.push({
                        prodA: { id: p1.id!, name: p1.name },
                        prodB: { id: p2.id!, name: p2.name }
                    });
                }
            }
        }
    }

    return { pairs: missingPairs, totalProducts };
}

export async function generateComparisonPair(prodA_id: string, prodB_id: string): Promise<boolean> {
    const categories = await getCategories();
    // We need the full product details. In a real app we'd fetch them by ID directly.
    // For now we'll find them in the arrays.
    let p1, p2;
    for (const category of categories) {
        const products = await getProducts(category.slug);
        if (!p1) p1 = products.find(p => p.id === prodA_id);
        if (!p2) p2 = products.find(p => p.id === prodB_id);
        if (p1 && p2) break;
    }

    if (!p1 || !p2) throw new Error("Product not found");

    // Do the comparison
    const competitorInfo: CompetitorInfo[] = [{
        name: p2.name,
        brand: p2.brand,
        price: p2.variants?.[0]?.price ?? 0,
        shortDescription: p2.shortDescription
    }];

    try {
        const result = await generateProductComparison({
            productName: p1.name,
            productBrand: p1.brand,
            productPrice: p1.variants?.[0]?.price ?? 0,
            productShortDescription: p1.shortDescription,
            competitors: competitorInfo,
        });

        await saveGlobalComparison(p1.id!, [p2.id!], result);
        return true;
    } catch (error) {
        console.error("Pairwise generation failed", error);
        return false;
    }
}



import { create } from 'zustand';
import type { Product, ProductVariant } from '@/lib/types';
import { produce } from 'immer';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { subDays } from 'date-fns';

const scrollToGrid = () => {
  if (typeof window !== 'undefined') {
    // We want to scroll to the top of the product grid area smoothly
    const grid = document.getElementById('product-grid-top');
    if (grid) {
      // 120px offset to account for sticky headers
      const top = grid.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
};

interface ProductState {
  initialProducts: Product[];
  filteredProducts: Product[];
  selectedCategories: string[];
  selectedBrands: string[];
  selectedLicenseTypes: string[];
  searchTerm: string;
  onSale: boolean;
  inStock: boolean;
  newArrivals: boolean;

  setInitialProducts: (products: Product[]) => void;
  filterProducts: () => void;
  setSearchTerm: (term: string) => void;
  toggleCategory: (categorySlug: string, force?: boolean) => void;
  toggleBrand: (brand: string, force?: boolean) => void;
  toggleLicenseType: (licenseType: string, force?: boolean) => void;
  setOnSale: (value: boolean) => void;
  setInStock: (value: boolean) => void;
  setNewArrivals: (value: boolean) => void;
  resetFilters: () => void;
}

const toggleSelection = (
  currentSelection: string[],
  item: string,
  force?: boolean
): string[] => {
  const isSelected = currentSelection.includes(item);
  if (force === true) {
    return isSelected ? currentSelection : [...currentSelection, item];
  }
  if (force === false) {
    return isSelected ? currentSelection.filter((i) => i !== item) : currentSelection;
  }
  return isSelected
    ? currentSelection.filter((i) => i !== item)
    : [...currentSelection, item];
};

export const useProductStore = create<ProductState>((set, get) => ({
  initialProducts: [],
  filteredProducts: [],
  selectedCategories: [],
  selectedBrands: [],
  selectedLicenseTypes: [],
  searchTerm: '',
  onSale: false,
  inStock: false,
  newArrivals: false,

  setInitialProducts: (products) => {
    set(
      produce((draft: ProductState) => {
        draft.initialProducts = products;
        draft.filteredProducts = products; // Initially, all products are shown
      })
    );
    get().filterProducts();
  },

  filterProducts: () => {
    set(
      produce((draft: ProductState) => {
        const {
          initialProducts,
          selectedCategories,
          selectedBrands,
          selectedLicenseTypes,
          searchTerm,
          onSale,
          inStock,
          newArrivals,
        } = draft;

        let tempProducts = [...initialProducts];

        // Search term filter
        if (searchTerm) {
          const searchTokens = searchTerm.toLowerCase().split(' ').filter((t: string) => t);
          if (searchTokens.length > 0) {
            tempProducts = tempProducts.filter(product => {
                const productText = [
                    product.name,
                    product.brand,
                    product.shortDescription,
                    product.category.name,
                ].join(' ').toLowerCase();

                // "Smart AND" logic: ALL search tokens must be present in the product text.
                return searchTokens.every((token: string) => productText.includes(token));
            });
          }
        }

        // Category filter
        if (selectedCategories.length > 0) {
          tempProducts = tempProducts.filter((p) =>
            selectedCategories.includes(p.category.slug)
          );
        }

        // Brand filter
        if (selectedBrands.length > 0) {
          tempProducts = tempProducts.filter((p) =>
            selectedBrands.includes(p.brand)
          );
        }

        // License type filter
        if (selectedLicenseTypes.length > 0) {
          tempProducts = tempProducts.filter((p) =>
            selectedLicenseTypes.includes(p.licenseType)
          );
        }

        // On sale filter
        if (onSale) {
            tempProducts = tempProducts.filter(p => 
                p.variants.some((v: ProductVariant) => v.salePrice && v.salePrice < v.price)
            );
        }
        
        // In stock filter
        if (inStock) {
            tempProducts = tempProducts.filter(p => 
                p.variants.some((v: ProductVariant) => v.licenseKeys && v.licenseKeys.available.length > 0)
            );
        }

        // New arrivals filter (last 30 days)
        if (newArrivals) {
            const thirtyDaysAgo = subDays(new Date(), 30);
            tempProducts = tempProducts.filter(p => {
                const createdAt = p.createdAt as any;
                return createdAt && createdAt.toDate && createdAt.toDate() > thirtyDaysAgo;
            });
        }

        draft.filteredProducts = tempProducts;
      })
    );
  },

  setSearchTerm: (term) => {
    set({ searchTerm: term });
    get().filterProducts();
    scrollToGrid();
  },

  toggleCategory: (categorySlug, force) => {
    set(
      produce((draft: ProductState) => {
        draft.selectedCategories = toggleSelection(
          draft.selectedCategories,
          categorySlug,
          force
        );
        draft.searchTerm = '';
      })
    );
    get().filterProducts();
    scrollToGrid();
  },

  toggleBrand: (brand, force) => {
    set(
      produce((draft: ProductState) => {
        draft.selectedBrands = toggleSelection(
          draft.selectedBrands,
          brand,
          force
        );
        draft.searchTerm = '';
      })
    );
    get().filterProducts();
    scrollToGrid();
  },

  toggleLicenseType: (licenseType, force) => {
    set(
      produce((draft: ProductState) => {
        draft.selectedLicenseTypes = toggleSelection(
          draft.selectedLicenseTypes,
          licenseType,
          force
        );
        draft.searchTerm = '';
      })
    );
    get().filterProducts();
    scrollToGrid();
  },

  setOnSale: (value) => {
    set({ onSale: value, searchTerm: '' });
    get().filterProducts();
    scrollToGrid();
  },

  setInStock: (value) => {
    set({ inStock: value, searchTerm: '' });
    get().filterProducts();
    scrollToGrid();
  },

  setNewArrivals: (value) => {
    set({ newArrivals: value, searchTerm: '' });
    get().filterProducts();
    scrollToGrid();
  },

  resetFilters: () => {
    set({
      selectedCategories: [],
      selectedBrands: [],
      selectedLicenseTypes: [],
      searchTerm: '',
      onSale: false,
      inStock: false,
      newArrivals: false,
    });
    get().filterProducts();
    // Do not scrollToGrid here, resting naturally at top or current position is fine, 
    // or we can optionally scroll. We'll leave it without scroll to avoid jumping to top when resetting.
  },
}));

// Hook to sync search param with store
export const useSyncSearchParam = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setSearchTerm } = useProductStore();

  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl) {
      setSearchTerm(searchFromUrl);
    }
  }, [searchParams, setSearchTerm]);
};

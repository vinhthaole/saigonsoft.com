
'use server';

import type { SiteConfig } from '@/lib/types';
import { getDynamicImage, updateSiteConfig } from '@/lib/data';
import { revalidatePath } from 'next/cache';

export async function updateAppearance(data: Partial<SiteConfig>) {
  try {
    await updateSiteConfig(data);
    revalidatePath('/');
    revalidatePath('/cms/admin/appearance', 'layout');
  } catch (error) {
    console.error('Error updating appearance settings:', error);
    throw new Error('Could not update site configuration.');
  }
}

export async function generateHeroImage(prompt: string): Promise<{imageUrl: string}> {
  try {
    const imageUrl = await getDynamicImage(prompt, 'landscape');
    if (!imageUrl) {
        throw new Error("Không thể tìm thấy hình ảnh phù hợp từ các nguồn cung cấp.");
    }
    return { imageUrl };
  } catch (error) {
    console.error("Error getting hero image:", error);
    throw new Error("Không thể lấy ảnh cho khu vực Hero.");
  }
}

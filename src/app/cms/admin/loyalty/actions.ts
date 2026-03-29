

'use server';

import { z } from 'zod';
import { updateSiteConfig } from '@/lib/data';
import { revalidatePath } from 'next/cache';

const loyaltyTierSchema = z.object({
  name: z.enum(['Đồng', 'Bạc', 'Vàng', 'Kim Cương', 'Chưa xếp hạng']),
  minPoints: z.coerce.number(),
  discountPercentage: z.coerce.number(),
  benefits: z.array(z.string()),
});

const loyaltySettingsSchema = z.object({
  loyalty: z.object({
      pointConversionRate: z.coerce.number(),
      tiers: z.object({
        bronze: loyaltyTierSchema,
        silver: loyaltyTierSchema,
        gold: loyaltyTierSchema,
        diamond: loyaltyTierSchema,
    }),
      resellerLoyaltyTiers: z.object({
        bronze: loyaltyTierSchema,
        silver: loyaltyTierSchema,
        gold: loyaltyTierSchema,
        diamond: loyaltyTierSchema,
    }).optional(),
  }),
});


export async function updateLoyaltySettings(data: z.infer<typeof loyaltySettingsSchema>) {
  const validatedData = loyaltySettingsSchema.parse(data);

  // Cast to any to avoid TS mismatch if the types are slightly different in structure but compatible in data
  // The Zod validation ensures data integrity.
  await updateSiteConfig({ loyalty: validatedData.loyalty as any });
  revalidatePath('/');
}


'use server';

import { ai, getModelByName } from '@/ai/genkit';
import { VariantGeneratorInputSchema, VariantGeneratorOutputSchema, type VariantGeneratorInput, type VariantGeneratorOutput } from '@/lib/schemas/product-variants';

export async function generateVariants(input: VariantGeneratorInput): Promise<VariantGeneratorOutput> {
  const variantGeneratorFlow = ai.defineFlow(
    {
      name: 'variantGeneratorFlow',
      inputSchema: VariantGeneratorInputSchema,
      outputSchema: VariantGeneratorOutputSchema,
    },
    async ({ productName, licenseType, brand }) => {
      const prompt = ai.definePrompt({
        name: 'variantGeneratorPrompt',
        model: getModelByName(),
        input: { schema: VariantGeneratorInputSchema },
        output: { schema: VariantGeneratorOutputSchema },
        prompt: `You are an assistant specializing in creating product variants for a software store in Vietnam.
**Product Name:** "${productName}"
**Brand:** "${brand}"
**License Type:** "${licenseType}"

**Requirements:**
- Based on the information provided, create 3-5 different product variants.
- If the license type is "Subscription" (Monthly/Yearly), create variants based on **license duration** and **number of devices**. Examples: "1 year / 1 PC", "2 years / 3 devices".
- If the license type is "Perpetual", only create variants based on the **number of users/devices**. Examples: "1 User", "5 Users", "10 Devices". Do not create variants based on feature levels like "Basic" or "Professional".

For each variant, create:
1.  **id**: A unique, randomly generated id for each variant.
2.  **name**: A clear descriptive name in Vietnamese (e.g., "1 năm / 1 PC").
3.  **price**: A reasonable price in Vietnamese Dong (VND). The price should reflect the value of the variant (e.g., a longer license or more devices should be more expensive).
4.  **salePrice**: An optional promotional sale price, lower than the original price.
5.  **sku**: A unique Stock Keeping Unit for the store in the format "SGS-[BRAND]-[PRODUCTNAME]-[VARIANTDETAILS]". Example: SGS-KASP-IS-1Y1PC.`,
      });

      const { output } = await prompt({ productName, licenseType, brand });
      if (!output) {
        throw new Error("AI failed to generate variants.");
      }
      return output;
    }
  );

  return variantGeneratorFlow(input);
}

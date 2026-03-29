
'use server';

/**
 * @fileOverview A flow to generate icon suggestions for categories.
 */

import { ai, getModelByName } from '@/ai/genkit';
import { generateIconSuggestionsSchema, generateIconSuggestionsOutputSchema, type GenerateIconSuggestionsInput, type GenerateIconSuggestionsOutput } from '@/lib/schemas/icon-generator';

const generateIconSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateIconSuggestionsFlow',
    inputSchema: generateIconSuggestionsSchema,
    outputSchema: generateIconSuggestionsOutputSchema,
  },
  async ({ names }) => {
    const prompt = ai.definePrompt({
      name: 'iconSuggestionPrompt',
      model: getModelByName(),
      input: { schema: generateIconSuggestionsSchema },
      output: { schema: generateIconSuggestionsOutputSchema },
      prompt: `You are a user interface designer. Based on the following list of names, suggest a corresponding icon name from the Lucide Icons library.

**List of names:**
{{#each names}}
- {{{.}}}
{{/each}}

**Requirements:**
- For each name, provide the most suitable icon name from the Lucide Icons library (https://lucide.dev/).
- Return the icon name in PascalCase (e.g., "Cpu", "Laptop", "ShieldCheck").
- The result must be an array of objects, where each object contains the 'name' (original name) and 'iconName' (suggested icon name).
- The number of icons in the result must match the number of names provided.`,
    });
    
    const { output } = await prompt({ names });
    if (!output) {
      throw new Error("AI failed to generate icon suggestions.");
    }
    return output;
  }
);


export async function generateIconSuggestions(
  input: GenerateIconSuggestionsInput
): Promise<GenerateIconSuggestionsOutput> {
  return generateIconSuggestionsFlow(input);
}


'use server';

/**
 * @fileOverview A flow to generate icon suggestions for categories.
 */

import { getDynamicAi } from '@/ai/genkit';
import { generateIconSuggestionsSchema, generateIconSuggestionsOutputSchema, type GenerateIconSuggestionsInput, type GenerateIconSuggestionsOutput } from '@/lib/schemas/icon-generator';

export async function generateIconSuggestions(input: GenerateIconSuggestionsInput): Promise<GenerateIconSuggestionsOutput> {
  const { ai, modelName } = await getDynamicAi();
  const { names } = input;

  const promptText = `You are a user interface designer. Based on the following list of names, suggest a corresponding icon name from the Lucide Icons library.

**List of names:**
${names.map(name => `- ${name}`).join('\n')}

**Requirements:**
- For each name, provide the most suitable icon name from the Lucide Icons library (https://lucide.dev/).
- Return the icon name in PascalCase (e.g., "Cpu", "Laptop", "ShieldCheck").
- The result must be an array of objects, where each object contains the 'name' (original name) and 'iconName' (suggested icon name).
- The number of icons in the result must match the number of names provided.`;

  const { output } = await ai.generate({
      model: modelName,
      prompt: promptText,
      output: { schema: generateIconSuggestionsOutputSchema }
  });

  if (!output) {
      throw new Error("AI failed to generate icon suggestions.");
  }
  return output as GenerateIconSuggestionsOutput;
}

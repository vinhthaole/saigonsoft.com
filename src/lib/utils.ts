import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const output = { ...target } as any;
  const sourceObj = source as any;

  if (target && typeof target === 'object' && source && typeof source === 'object') {
    Object.keys(sourceObj).forEach(key => {
      if (sourceObj[key] && typeof sourceObj[key] === 'object' && !Array.isArray(sourceObj[key]) && output[key] && typeof output[key] === 'object' && !Array.isArray(output[key])) {
        // If both are objects (and not arrays), deep merge
        output[key] = deepMerge(output[key], sourceObj[key]);
      } else {
        // Otherwise, directly assign (source overwrites target for primitives and arrays)
        output[key] = sourceObj[key];
      }
    });
  }

  return output as T;
}

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

export function getFriendlyErrorMessage(error: any, fallbackMessage: string = 'Đã có lỗi xảy ra. Vui lòng thử lại.'): string {
  const originalMessage = error?.message || String(error);

  // In development, show raw messages for easier debugging.
  if (process.env.NODE_ENV === 'development') {
    return originalMessage;
  }

  // Check known error codes
  if (error?.code) {
    switch (error.code) {
      case 'auth/email-already-in-use': return 'Email này đã được sử dụng.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found': return 'Thông tin đăng nhập không chính xác.';
      case 'auth/too-many-requests': return 'Thao tác quá thường xuyên. Vui lòng thử lại sau.';
      case 'auth/weak-password': return 'Mật khẩu quá yếu.';
      case 'permission-denied': return 'Bạn không có quyền thực hiện thao tác này.';
    }
  }

  // Fallback masking logic for anything containing backend tech jargon
  const lowercaseMsg = originalMessage.toLowerCase();
  const jargonWords = ['firebase', 'firestore', 'auth/', 'internal', 'google api', 'generativelanguage'];
  
  if (jargonWords.some(jargon => lowercaseMsg.includes(jargon))) {
     return fallbackMessage;
  }

  return originalMessage || fallbackMessage;
}

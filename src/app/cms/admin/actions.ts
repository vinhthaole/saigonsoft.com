

'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs, getDoc, setDoc, serverTimestamp, query, where, orderBy, writeBatch, increment, runTransaction, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { AdminUser, LoyaltyTier, LoyaltyTierDetails, Order, Permission, SiteConfig, TaxRate, UserProfile } from '@/lib/types';
import { getFirebaseAdminApp } from '@/lib/firebase-admin';
import { getLoyaltyConfig, updateSiteConfig } from '@/lib/data';
import { sendOrderStatusUpdateEmail } from '@/lib/email';
import * as XLSX from 'xlsx';


// =================================================================
// Customers Actions
// =================================================================

const userInfoSchema = z.object({
  displayName: z.string().min(1, 'Họ và tên là bắt buộc.'),
  address: z.string().min(1, 'Địa chỉ không được để trống.'),
  companyName: z.string().optional(),
  taxId: z.string().optional(),
  companyAddress: z.string().optional(),
});


export async function updateUserInfo(uid: string, data: z.infer<typeof userInfoSchema>) {
    if (!uid) throw new Error("User ID is required.");
    const validatedData = userInfoSchema.parse(data);

    const userRef = doc(db, 'users', uid);
    try {
        await updateDoc(userRef, validatedData);
        revalidatePath(`/cms/admin/customers/${uid}`);
        revalidatePath('/cms/admin/customers');
    } catch (error) {
        console.error("Failed to update user info:", error);
        throw new Error("Could not update user info.");
    }
}


export async function updateUserRole(uid: string, role: 'customer' | 'reseller') {
    if (!uid) throw new Error("User ID is required.");
    const userRef = doc(db, 'users', uid);
    try {
        await updateDoc(userRef, { role: role });
        revalidatePath(`/cms/admin/customers/${uid}`);
        revalidatePath('/cms/admin/customers');
    } catch (error) {
        console.error("Failed to update user role:", error);
        throw new Error("Could not update user role.");
    }
}

export async function updateUserLoyalty(uid: string, loyaltyTier: LoyaltyTier, loyaltyPoints: number) {
     if (!uid) throw new Error("User ID is required.");
    const userRef = doc(db, 'users', uid);
    try {
        await updateDoc(userRef, { 
            loyaltyTier: loyaltyTier,
            loyaltyPoints: loyaltyPoints
        });
        revalidatePath(`/cms/admin/customers/${uid}`);
        revalidatePath('/cms/admin/customers');
    } catch (error) {
        console.error("Failed to update user loyalty:", error);
        throw new Error("Could not update user loyalty.");
    }
}


// =================================================================
// Moderator Actions
// =================================================================

const moderatorSchema = z.object({
  email: z.string().email("Email không hợp lệ."),
  role: z.enum(['superadmin', 'moderator']),
  permissions: z.array(z.string()), // We'll validate against Permission type on the server
});

const ALL_PERMISSIONS: Permission[] = [
    'manage_products', 'manage_orders', 'manage_discounts', 'manage_digital_assets', 'manage_customers', 'manage_pages', 'manage_categories', 'manage_brands',
    'manage_email_campaigns', 'manage_plugins', 'manage_appearance', 'manage_product_feeds', 'manage_authentication', 'manage_payments', 'manage_integrations', 'manage_tax_settings', 'manage_moderators',
    'manage_loyalty_program' // Add new permission
];

function validatePermissions(permissions: string[]): Permission[] {
    const validPermissions = permissions.filter(p => ALL_PERMISSIONS.includes(p as Permission));
    return validPermissions as Permission[];
}

export async function addModerator(data: z.infer<typeof moderatorSchema>) {
    const validatedData = moderatorSchema.parse(data);

    try {
        const usersCol = collection(db, 'admin_users');
        const q = query(usersCol, where("email", "==", validatedData.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error("Một quản trị viên với email này đã tồn tại.");
        }
        
        const newModerator: Omit<AdminUser, 'id'> = {
            email: validatedData.email,
            role: validatedData.role,
            permissions: validatePermissions(validatedData.permissions),
            createdAt: serverTimestamp() as any,
        };

        await addDoc(usersCol, newModerator);
        revalidatePath('/cms/admin/moderators');
    } catch (error: any) {
        console.error("Error adding moderator:", error);
        if (error.message.includes("đã tồn tại")) {
            throw error;
        }
        throw new Error("Không thể thêm quản trị viên.");
    }
}


export async function updateModerator(id: string, data: z.infer<typeof moderatorSchema>) {
    const validatedData = moderatorSchema.parse(data);
    const docRef = doc(db, 'admin_users', id);

    const moderatorUpdate = {
        role: validatedData.role,
        permissions: validatePermissions(validatedData.permissions),
    };

    try {
        await updateDoc(docRef, moderatorUpdate);
        revalidatePath('/cms/admin/moderators');
        revalidatePath(`/cms/admin/moderators/${id}/edit`);
    } catch (error) {
        console.error("Error updating moderator:", error);
        throw new Error("Không thể cập nhật quản trị viên.");
    }
}

export async function deleteModerator(id: string) {
    if (!id) {
        throw new Error("Cần có ID của quản trị viên.");
    }
    const docRef = doc(db, 'admin_users', id);

    try {
        await deleteDoc(docRef);
        revalidatePath('/cms/admin/moderators');
    } catch (error) {
        console.error("Error deleting moderator:", error);
        throw new Error("Không thể xóa quản trị viên.");
    }
}

export async function getAdminUsers(): Promise<AdminUser[]> {
    const usersCol = collection(db, 'admin_users');
    const snapshot = await getDocs(query(usersCol, orderBy('createdAt', 'desc')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminUser));
}

export async function getAdminUserById(id: string): Promise<AdminUser | null> {
    const docRef = doc(db, 'admin_users', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as AdminUser;
    }
    return null;
}


// =================================================================
// Tax Actions
// =================================================================

const taxRateSchema = z.object({
  countryCode: z.string().length(2, "Mã quốc gia phải có 2 ký tự (ISO 3166-1 alpha-2).").toUpperCase(),
  countryName: z.string().min(1, "Tên quốc gia là bắt buộc."),
  rate: z.coerce.number().min(0, "Tỷ lệ thuế phải là số không âm."),
  isEnabled: z.boolean().default(true),
});

const defaultCountrySchema = z.object({
    tax: z.object({
        defaultCountryCode: z.string().min(1, "Vui lòng chọn quốc gia mặc định."),
    })
});

export async function addOrUpdateTaxRate(data: z.infer<typeof taxRateSchema>, id?: string) {
  const validatedData = taxRateSchema.parse(data);

  try {
    const docRef = id ? doc(db, 'tax_rates', id) : doc(collection(db, 'tax_rates'));
    await setDoc(docRef, validatedData, { merge: true });

    revalidatePath('/cms/admin/tax');
    revalidatePath('/checkout');
  } catch (error) {
    console.error("Error saving tax rate: ", error);
    throw new Error("Không thể lưu cài đặt thuế.");
  }
}

export async function deleteTaxRate(id: string) {
    if (!id) throw new Error('Cần có ID thuế.');
    const taxRateRef = doc(db, 'tax_rates', id);
    try {
        await deleteDoc(taxRateRef);
        revalidatePath('/cms/admin/tax');
        revalidatePath('/checkout');
    } catch (error) {
        console.error("Error deleting tax rate: ", error);
        throw new Error("Không thể xóa cài đặt thuế.");
    }
}

export async function updateDefaultTaxCountry(data: z.infer<typeof defaultCountrySchema>) {
    const validatedData = defaultCountrySchema.parse(data);
    try {
        await updateSiteConfig({ tax: validatedData.tax });
        revalidatePath('/');
    } catch (error) {
        console.error("Error updating default tax country:", error);
        throw new Error("Không thể cập nhật quốc gia mặc định.");
    }
}


// =================================================================
// Payment Method Actions
// =================================================================

const paymentMethodDetailsSchema = z.object({
    enabled: z.boolean(),
    accountName: z.string().optional(),
    accountNumber: z.string().optional(),
    bankShortName: z.string().optional(),
})

const disabledPaymentMethodSchema = z.object({
      enabled: z.boolean(),
});

const paymentMethodsSchema = z.object({
  paymentMethods: z.object({
    vietqr: paymentMethodDetailsSchema,
    zalopay: disabledPaymentMethodSchema,
    creditcard: disabledPaymentMethodSchema,
  }),
});


export async function updatePaymentMethods(data: z.infer<typeof paymentMethodsSchema>) {
  const validatedData = paymentMethodsSchema.parse(data);

  try {
    await updateSiteConfig({ paymentMethods: validatedData.paymentMethods });
    revalidatePath('/');
  } catch (error) {
    console.error('Error updating payment methods:', error);
    throw new Error('Không thể cập nhật cài đặt cổng thanh toán.');
  }
}


// =================================================================
// Authentication Actions
// =================================================================

const authSettingsSchema = z.object({
  authentication: z.object({
    google: z.object({
      enabled: z.boolean(),
    }),
    apple: z.object({
      enabled: z.boolean(),
    }),
    sms: z.object({
      enabled: z.boolean(),
    }),
  }),
});


export async function updateAuthSettings(data: z.infer<typeof authSettingsSchema>) {
  const validatedData = authSettingsSchema.parse(data);

  try {
    await updateSiteConfig({ authentication: validatedData.authentication });
    revalidatePath('/');
  } catch (error) {
    console.error('Error updating authentication settings:', error);
    throw new Error('Không thể cập nhật cài đặt xác thực.');
  }
}

// =================================================================
// Plugin Actions
// =================================================================

const pluginSettingsSchema = z.object({
  plugins: z.object({
    recentViews: z.object({
      enabled: z.boolean(),
      excludedPages: z.string().optional(),
    }),
    wishlist: z.object({
      enabled: z.boolean(),
       excludedPages: z.string().optional(),
    }),
    stockNotifier: z.object({
      enabled: z.boolean(),
      title: z.string().optional(),
      description: z.string().optional(),
      successMessage: z.string().optional(),
    }),
    promoToast: z.object({
      enabled: z.boolean(),
      title: z.string().optional(),
      description: z.string().optional(),
      productIds: z.array(z.string()).optional(),
      excludedPages: z.string().optional(),
    }),
    livechat: z.object({
      enabled: z.boolean(),
      script: z.string().optional(),
      excludedPages: z.string().optional(),
    }),
    sgSeo: z.object({
        enabled: z.boolean(),
    }).optional(),
    analytics: z.object({
        enabled: z.boolean(),
        script: z.string().optional(),
        excludedPages: z.string().optional(),
    }).optional(),
  }),
});

const processExcludedPages = (pagesString?: string): string[] => {
    if (!pagesString) return [];
    return pagesString.split(',').map(p => p.trim()).filter(Boolean);
};

export async function updatePluginSettings(data: z.infer<typeof pluginSettingsSchema>) {
  const validatedData = pluginSettingsSchema.parse(data);

  const processedData = {
    ...validatedData,
    plugins: {
        ...validatedData.plugins,
        recentViews: {
            ...validatedData.plugins.recentViews,
            excludedPages: processExcludedPages(validatedData.plugins.recentViews.excludedPages),
        },
        wishlist: {
            ...validatedData.plugins.wishlist,
            excludedPages: processExcludedPages(validatedData.plugins.wishlist.excludedPages),
        },
        promoToast: {
            ...validatedData.plugins.promoToast,
            excludedPages: processExcludedPages(validatedData.plugins.promoToast.excludedPages),
        },
        livechat: {
            ...validatedData.plugins.livechat,
            excludedPages: processExcludedPages(validatedData.plugins.livechat.excludedPages),
        },
        analytics: {
            ...validatedData.plugins.analytics,
            enabled: validatedData.plugins.analytics?.enabled ?? false,
            excludedPages: processExcludedPages(validatedData.plugins.analytics?.excludedPages),
            script: validatedData.plugins.analytics?.script || "",
        },
        sgSeo: {
            ...validatedData.plugins.sgSeo,
            enabled: validatedData.plugins.sgSeo?.enabled ?? false,
        }
    }
  };

  try {
    await updateSiteConfig({ plugins: processedData.plugins });
    revalidatePath('/');
  } catch (error) {
    console.error('Error updating plugin settings:', error);
    throw new Error('Không thể cập nhật cài đặt plugin.');
  }
}

// =================================================================
// Integrations Actions
// =================================================================
const emailTemplateSchema = z.object({
    subject: z.string().min(1, "Chủ đề không được để trống."),
    body: z.string().min(1, "Nội dung không được để trống."),
});

const integrationsSchema = z.object({
  email: z.object({
    provider: z.enum(['postmark', 'ses']).optional(),
    postmark: z.object({
        serverToken: z.string().optional(),
        fromEmail: z.string().optional(),
        replyToEmail: z.string().optional(),
    }).optional(),
    ses: z.object({
        accessKeyId: z.string().optional(),
        secretAccessKey: z.string().optional(),
        region: z.string().optional(),
        fromEmail: z.string().optional(),
    }).optional()
  }).optional(),
  emailTemplates: z.object({
        orderConfirmation: emailTemplateSchema,
        orderStatusUpdate: emailTemplateSchema,
        passwordChanged: emailTemplateSchema,
        backInStock: emailTemplateSchema,
        welcomeAndSetPassword: emailTemplateSchema,
        forgotPassword: emailTemplateSchema,
    }).optional(),
});

export async function updateIntegrations(data: Partial<z.infer<typeof integrationsSchema>>) {
  const validatedData = integrationsSchema.partial().parse(data);

  const processedData: any = {
      ...validatedData
  };
  
  if (validatedData.email) {
      processedData.email = {
          ...validatedData.email,
          postmark: validatedData.email?.postmark || {},
          ses: validatedData.email?.ses || {},
          provider: validatedData.email?.provider || 'postmark',
      }
  }

  try {
    await updateSiteConfig(processedData);
    revalidatePath('/');
  } catch (error) {
    console.error('Error updating integrations settings:', error);
    throw new Error('Không thể cập nhật cài đặt tích hợp.');
  }
}

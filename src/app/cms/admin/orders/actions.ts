

'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc, collection, addDoc, serverTimestamp, getDoc, runTransaction, Timestamp, increment, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Order, Product, ProductVariant, UserProfile } from '@/lib/types';
import { sendOrderStatusUpdateEmail } from '@/lib/email';
import { getOrders, determineLoyaltyTier, getLoyaltyConfig, getUserProfile } from '@/lib/data';
import * as XLSX from 'xlsx';


async function assignLicenseKeys(order: Order) {
    if (!order.customer.id) {
        console.log(`Order ${order.id} has no customer ID, skipping license key assignment.`);
        return;
    }
    
    console.log(`Assigning license keys for order ${order.id}...`);

    await runTransaction(db, async (transaction) => {
        // --- Read Phase ---
        // We only need to read the product documents once
        const productIds = [...new Set(order.items.map(item => item.id))];
        const productRefs = productIds.map(id => doc(db, 'products', id));
        const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        const productsMap = new Map<string, Product>();
        productDocs.forEach((docSnap, i) => {
            if (docSnap.exists()) {
                productsMap.set(productIds[i], { id: docSnap.id, ...docSnap.data() } as Product);
            }
        });
        
        // --- Logic & Write Phase ---
        for (const item of order.items) {
            const product = productsMap.get(item.id);
            if (!product) {
                throw new Error(`Product with ID ${item.id} not found during transaction.`);
            }

            // Find the specific variant that was purchased
            const variantIndex = product.variants.findIndex(v => v.id === item.variantId);
            if (variantIndex === -1) {
                 throw new Error(`Variant with ID ${item.variantId} not found in product ${product.name}.`);
            }
            
            const variant = product.variants[variantIndex];
            const availableKeys = variant.licenseKeys?.available || [];
            const usedKeys = variant.licenseKeys?.used || [];

            if (availableKeys.length < item.quantity) {
                throw new Error(`Không đủ license key cho sản phẩm: ${product.name} - ${variant.name}. Cần: ${item.quantity}, Có sẵn: ${availableKeys.length}`);
            }

            const keysToAssign = availableKeys.splice(0, item.quantity);
            for (const key of keysToAssign) {
                usedKeys.push({
                    key,
                    orderId: order.id,
                    customerId: order.customer.id!,
                    assignedAt: Timestamp.now(),
                });
            }

            // Update the variant in the product's variants array
            product.variants[variantIndex].licenseKeys = { available: availableKeys, used: usedKeys };

            // Update the whole product in the map to prepare for the final write
            productsMap.set(product.id!, product);
        }

        // Commit all product updates to Firestore
        for (const [productId, productData] of productsMap.entries()) {
            const productRef = doc(db, 'products', productId);
            transaction.update(productRef, { variants: productData.variants });
        }
        console.log(`Finished assigning keys for order ${order.id}.`);
    });
}

async function updateUserLoyalty(userId: string) {
    const userRef = doc(db, 'users', userId);
    try {
        const profile = await getUserProfile(userId);
        if (!profile) return;
        
        const { rate, tiers, resellerTiers } = await getLoyaltyConfig();
        const relevantTiers = profile.role === 'reseller' ? resellerTiers : tiers;

        // Correctly fetch all completed orders for the user
        const { orders: userOrders } = await getOrders({ userId: userId, options: { status: 'Hoàn thành' } });
        
        const totalSpent = userOrders.reduce((sum, doc) => sum + (doc.total || 0), 0);
        
        const calculatedPoints = Math.floor(totalSpent * rate);
        const newTier = await determineLoyaltyTier(calculatedPoints, profile.role || 'customer');
        
        await updateDoc(userRef, {
            loyaltyPoints: calculatedPoints,
            loyaltyTier: newTier.name,
        });

        console.log(`Updated loyalty for user ${userId}. New points: ${calculatedPoints}, New Tier: ${newTier.name}`);

    } catch (error) {
        console.error(`Failed to update loyalty points for user ${userId}:`, error);
        // Don't throw to avoid failing the whole order update process
    }
}

async function createNotificationAndSendEmail(order: Order, newStatus: string) {
     if (order.customer.id) {
        const userProfile = await getUserProfile(order.customer.id);
        const basePath = userProfile?.role === 'reseller' ? '/reseller' : '/profile';
        const notificationLink = `${basePath}/order-history/${order.id}`;

        try {
            // Create notification
            const notificationsCol = collection(db, 'notifications');
            await addDoc(notificationsCol, {
                userId: order.customer.id,
                message: `Trạng thái đơn hàng #${order.id} của bạn đã được cập nhật thành: ${newStatus}.`,
                link: notificationLink,
                read: false,
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error(`Failed to create notification for order ${order.id}:`, error);
        }
        
        try {
            // Send email
            await sendOrderStatusUpdateEmail({
                orderId: order.id,
                customer: order.customer,
                newStatus: newStatus,
                basePath: basePath,
            });
        } catch (error) {
             console.error(`Failed to send status update email for order ${order.id}:`, error);
        }
    }
}


export async function updateOrderStatus(id: string, newStatus: string) {
    if (!id) {
        throw new Error('Order ID is required.');
    }
    const orderRef = doc(db, 'orders', id);

    try {
        const orderSnap = await getDoc(orderRef);
        if (!orderSnap.exists()) {
            throw new Error('Order not found.');
        }
        const orderData = { id: orderSnap.id, ...orderSnap.data() } as Order;

        // --- License Key & Loyalty Points Assignment Logic ---
        if (newStatus === 'Hoàn thành' && orderData.status !== 'Hoàn thành') {
            await assignLicenseKeys(orderData);

            if (orderData.customer.id) {
                // This is a background task, no need to await
                updateUserLoyalty(orderData.customer.id).catch(console.error);
            }
        }
        
        await updateDoc(orderRef, { status: newStatus });
        
        // This is a background task, no need to await
        createNotificationAndSendEmail(orderData, newStatus).catch(console.error);
        
        revalidatePath('/cms/admin/orders');
        revalidatePath(`/cms/admin/orders/${id}`);
        revalidatePath('/profile/order-history');
        revalidatePath(`/profile/order-history/${id}`);
        revalidatePath('/reseller/order-history');
        revalidatePath(`/reseller/order-history/${id}`);
        if (orderData.customer.id) {
            revalidatePath(`/profile`);
            revalidatePath(`/profile/loyalty`);
            revalidatePath(`/reseller/profile`);
            revalidatePath(`/reseller/loyalty`);
        }

    } catch (error: any) {
        console.error("Error updating order status: ", error);
        // Re-throw specific, user-friendly messages for known errors.
        if (error.message.includes("Không đủ license key")) {
             throw new Error(error.message);
        }
        // For other errors, throw a generic message.
        throw new Error("Không thể cập nhật trạng thái đơn hàng do lỗi hệ thống.");
    }
}


export async function deleteOrder(id: string) {
    if (!id) {
        throw new Error('Order ID is required.');
    }
    const orderRef = doc(db, 'orders', id);

    try {
        await deleteDoc(orderRef);
        revalidatePath('/cms/admin/orders');
    } catch (error) {
        console.error("Error deleting order: ", error);
        throw new Error("Could not delete order.");
    }
}


export async function exportOrders(userId?: string): Promise<{ content: string; fileName: string; contentType: string; }> {
    const { orders } = await getOrders({ userId: userId ? userId : undefined });


    if (orders.length === 0) {
        throw new Error("Không có đơn hàng nào để xuất.");
    }
    
    const flatData = orders.flatMap(order => 
        order.items.map(item => ({
            'ID Đơn hàng': order.id,
            'Ngày đặt': order.createdAt.toDate().toLocaleDateString('vi-VN'),
            'Tên khách hàng': order.customer.name,
            'Email khách hàng': order.customer.email,
            'Trạng thái': order.status,
            'Phương thức TT': order.paymentMethod,
            'Tạm tính': order.subtotal,
            'VAT': order.vat,
            'Tổng cộng': order.total,
            'Tên sản phẩm': item.name,
            'Tên biến thể': item.variantName,
            'Số lượng': item.quantity,
            'Đơn giá': item.price
        }))
    );
    
    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    const fileName = userId ? `saigonsoft_orders_${userId}.xlsx` : 'saigonsoft_orders_all.xlsx';

    return {
        content: buffer.toString('base64'), // Convert buffer to base64 string
        fileName,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
}


export async function updateBulkOrderStatus(orderIds: string[], newStatus: string) {
    if (!orderIds || orderIds.length === 0) {
        throw new Error("Cần có ID đơn hàng.");
    }
    
    const batch = writeBatch(db);
    
    orderIds.forEach(id => {
        const orderRef = doc(db, 'orders', id);
        batch.update(orderRef, { status: newStatus });
    });
    
    try {
        await batch.commit();
        revalidatePath('/cms/admin/orders');
    } catch(error) {
        console.error("Error updating bulk order status:", error);
        throw new Error("Không thể cập nhật trạng thái hàng loạt cho các đơn hàng.");
    }
}

export async function deleteBulkOrders(orderIds: string[]) {
    if (!orderIds || orderIds.length === 0) {
        throw new Error("Cần có ID đơn hàng.");
    }
    
    const batch = writeBatch(db);
    
    orderIds.forEach(id => {
        const orderRef = doc(db, 'orders', id);
        batch.delete(orderRef);
    });
    
    try {
        await batch.commit();
        revalidatePath('/cms/admin/orders');
    } catch(error) {
        console.error("Error deleting bulk orders:", error);
        throw new Error("Không thể xóa hàng loạt các đơn hàng.");
    }
}

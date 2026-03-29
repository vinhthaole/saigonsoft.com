

import { notFound } from "next/navigation";
import { getOrderById, getProductById } from "@/lib/data";
import type { OrderItem, Product, Order, ProductVariant } from "@/lib/types";
import { OrderDetailsClient } from "./_components/order-details-client";
import { serializeForClient } from "@/lib/serializeForClient";

type NextPageProps = import('/home/user/studio/.next/types/app/cms/admin/orders/[id]/page').PageProps;

type OrderItemWithDetails = OrderItem & { variant: ProductVariant | null };

async function getOrderWithFullDetails(orderId: string): Promise<{ order: Order, itemsWithDetails: OrderItemWithDetails[] } | null> {
    const order = await getOrderById(orderId);
    if (!order) {
        return null;
    }

    const itemsWithDetails: OrderItemWithDetails[] = await Promise.all(
        order.items.map(async (item) => {
            const product = await getProductById(item.id);
            const variant = product?.variants.find(v => v.id === item.variantId) || null;
            return { ...item, variant };
        })
    );

    return { order, itemsWithDetails };
}

export default async function OrderDetailsPage({ params }: NextPageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const rawData = await getOrderWithFullDetails(id);

  if (!rawData) {
    notFound();
  }

  const { order, itemsWithDetails } = serializeForClient(rawData);

  return (
    <OrderDetailsClient order={order} itemsWithDetails={itemsWithDetails} />
  );
}



import { notFound } from "next/navigation";
import { getOrderById, getProductById, getSiteConfig } from "@/lib/data";
import { OrderDetailsClient } from "./_components/order-details-client";
import { serializeForClient } from "@/lib/serializeForClient";
import type { Order, OrderItem, Product, ProductVariant } from "@/lib/types";

type NextPageProps = import('/home/user/studio/.next/types/app/profile/order-history/[id]/page').PageProps;

type OrderItemWithDetails = OrderItem & {
  variant: ProductVariant | null;
  product: Product | null;
};

async function getOrderWithFullDetails(
  orderId: string
): Promise<{ order: Order; itemsWithDetails: OrderItemWithDetails[] } | null> {
  const order = await getOrderById(orderId);
  if (!order) {
    return null;
  }

  const itemsWithDetails: OrderItemWithDetails[] = await Promise.all(
    order.items.map(async (item) => {
      const product = await getProductById(item.id);
      const variant = product?.variants.find((v) => v.id === item.variantId) || null;
      const assignedKeys = variant?.licenseKeys?.used?.filter(k => k.orderId === orderId) || [];
      
      return {
          ...item,
          product,
          variant: variant ? {
              ...variant,
              licenseKeys: { used: assignedKeys, available: [] }
          } : null,
      };
    })
  );

  return { order, itemsWithDetails };
}

export default async function OrderDetailsPage({
  params,
}: NextPageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const [rawData, siteConfig] = await Promise.all([
      getOrderWithFullDetails(id),
      getSiteConfig()
  ]);

  if (!rawData) {
    notFound();
  }

  const { order, itemsWithDetails } = serializeForClient(rawData);

  return (
    <OrderDetailsClient
      order={order}
      itemsWithDetails={itemsWithDetails}
      siteConfig={siteConfig}
    />
  );
}

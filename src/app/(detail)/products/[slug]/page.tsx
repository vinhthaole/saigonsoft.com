
import { getProductBySlug, getSiteConfig, getProducts } from '@/lib/data';
import { notFound } from 'next/navigation';
import { serializeForClient } from '@/lib/serializeForClient';
import { ProductDetailClient } from './_components/product-detail-client';
import type { Product } from '@/lib/types';
import type { Metadata, ResolvingMetadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';

type NextPageProps = {
  params: Promise<{ slug: string }>;
};


export async function generateMetadata(
  { params }: NextPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  noStore();
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const [product, siteConfig] = await Promise.all([
    getProductBySlug(slug),
    getSiteConfig()
  ]);
  
  if (!product) {
    return {
      title: 'Sản phẩm không tồn tại',
    }
  }

  const previousImages = (await parent).openGraph?.images || []
  const cheapestVariant = product.variants?.reduce((prev, curr) => 
    (curr.salePrice || curr.price) < (prev.salePrice || prev.price) ? curr : prev, product.variants[0]
  );
  const isInStock = product.variants?.some(v => v.licenseKeys?.available && v.licenseKeys.available.length > 0);
  
  // Use custom SEO fields if they exist and SEO plugin is enabled, otherwise fallback to product data
  const useSeoPlugin = siteConfig.plugins?.sgSeo?.enabled;
  const title = useSeoPlugin && product.seoTitle ? product.seoTitle : product.name;
  const description = useSeoPlugin && product.seoDescription ? product.seoDescription : product.shortDescription;

  const metadata: Metadata = {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: [
        {
          url: product.imageUrl,
          width: 1200,
          height: 630,
          alt: product.name,
        },
        ...previousImages,
      ],
      type: 'website',
      url: `/products/${product.slug}`,
      // These are not standard OpenGraph properties but often used in product feeds. Casting to any.
      ...({
        'product:price:amount': String(cheapestVariant?.salePrice || cheapestVariant?.price || 0),
        'product:price:currency': 'VND',
        'product:availability': isInStock ? 'in stock' : 'out of stock',
      } as any),
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [product.imageUrl],
    },
  };

  return metadata;
}


export default async function ProductDetailPage({ params }: NextPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const productData = await getProductBySlug(slug);

  if (!productData) {
    notFound();
  }

  // This is a placeholder for related products logic
  const related = (await getProducts(productData.category.slug))
      .filter((p) => p.id !== productData.id)
      .slice(0, 4);

  const product = serializeForClient(productData);
  const relatedProducts = serializeForClient(related);

  return (
      <ProductDetailClient product={product} relatedProducts={relatedProducts} />
  );
}

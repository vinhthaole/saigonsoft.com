

import { getPageBySlug, getSiteConfig } from "@/lib/data";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata, ResolvingMetadata } from "next";

type NextPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata(
    { params }: NextPageProps,
    parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const [page, siteConfig] = await Promise.all([
    getPageBySlug(resolvedParams.slug),
    getSiteConfig()
  ]);
  
  if (!page) {
    return {
      title: "Trang không tồn tại",
    };
  }
  
  const useSeoPlugin = siteConfig.plugins?.sgSeo?.enabled;
  const title = useSeoPlugin && page.seoTitle ? page.seoTitle : page.title;
  const description = useSeoPlugin && page.seoDescription ? page.seoDescription : page.content.replace(/<[^>]+>/g, '').substring(0, 160) + '...';
  const previousImages = (await parent).openGraph?.images || [];
  
  let ogImage: string | undefined;
  if (siteConfig.hero?.imageUrl) {
    ogImage = siteConfig.hero.imageUrl;
  } else if (previousImages[0]) {
    const firstImage = previousImages[0];
    if (typeof firstImage === 'string') {
        ogImage = firstImage;
    } else if (firstImage instanceof URL) {
        ogImage = firstImage.toString();
    } else if (typeof firstImage === 'object' && 'url' in firstImage) {
        // Handle the case where url might be a string or URL object
        ogImage = firstImage.url instanceof URL ? firstImage.url.toString() : firstImage.url;
    }
  }

  return {
    title: title,
    description: description,
    openGraph: {
        title: title,
        description: description,
        type: 'article',
        publishedTime: page.updatedAt ? new Date((page.updatedAt as any).seconds * 1000).toISOString() : new Date().toISOString(),
        url: `/pages/${page.id}`,
        images: ogImage ? [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: page.title,
          },
          ...previousImages
        ] : previousImages,
    },
     twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: ogImage ? [ogImage] : [],
    },
  };
}


export default async function GenericPage({ params }: NextPageProps) {
    const resolvedParams = await params;
    const page = await getPageBySlug(resolvedParams.slug);

    if (!page) {
        notFound();
    }
    
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <header>
                <h1 className="text-4xl font-bold tracking-tight text-primary">{page.title}</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    Cập nhật lần cuối: {new Date((page.updatedAt as any).seconds * 1000).toLocaleDateString('vi-VN')}
                </p>
            </header>
            <Card>
                <CardContent className="p-6">
                    <div
                        className="prose dark:prose-invert max-w-none [&_a]:text-primary [&_img]:rounded-md [&_img]:border"
                        dangerouslySetInnerHTML={{ __html: page.content }}
                    />
                </CardContent>
            </Card>
        </div>
    )
}

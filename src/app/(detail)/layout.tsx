

'use client';

import { SiteHeader } from '@/components/site-header';
import Link from 'next/link';
import { getSiteConfig } from '@/lib/data';
import type { FooterLinkColumn } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { useEffect, useState } from 'react';


import { useSiteConfig } from '@/hooks/use-site-config';

function Footer() {
    const { user, userProfile } = useAuth();
    const config = useSiteConfig();
    const [columns, setColumns] = useState<FooterLinkColumn[]>([]);
    const [companyName, setCompanyName] = useState('Saigonsoft.com');
    const [footerContactHtml, setFooterContactHtml] = useState<string | null>(null);

    useEffect(() => {
        if (!config) return;
        if (config?.companyInfo) {
                setCompanyName(config.companyInfo.name || 'Saigonsoft.com');
                setFooterContactHtml(config.companyInfo.footerContactHtml || null);
            }
            let footerColumns = config?.footer?.linkColumns || [];
        
        // Filter columns based on auth status
        if (!user) {
            footerColumns = footerColumns.filter(col => !col.authRequired);
        }
        
        // Adjust links based on user role
        const basePath = userProfile?.role === 'reseller' ? '/reseller' : '/profile';
        footerColumns = footerColumns.map(column => ({
            ...column,
            links: column.links.map(link => {
                if (link.href.includes('/order-history')) {
                    return { ...link, href: `${basePath}/order-history` };
                }
                if (link.href.includes('/downloads')) {
                    return { ...link, href: `${basePath}/downloads` };
                }
                return link;
            })
        }));

        setColumns(footerColumns);
    }, [config, user, userProfile]);
    
    return (
        <footer className="bg-secondary/70 text-secondary-foreground">
            <div className="container py-12">
            <div className="mx-auto max-w-7xl">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-8 text-sm text-left">
                    {columns.map((column) => (
                        <div key={column.title} className="col-span-2 md:col-span-1">
                            <h3 className="font-semibold mb-4 text-foreground">{column.title}</h3>
                            <ul className="space-y-2">
                                {column.links.map((link) => (
                                    <li key={link.href}>
                                        <Link href={link.href} className="text-muted-foreground hover:underline">
                                            {link.text}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-12 border-t pt-8 flex flex-col justify-between items-center text-xs text-muted-foreground gap-4">
                <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
                    <Link href="/pages/contact" className="hover:underline">Liên hệ</Link>
                    <Link href="/pages/privacy-policy" className="hover:underline">Quyền riêng tư</Link>
                    <Link href="/pages/terms-of-use" className="hover:underline">Điều khoản sử dụng</Link>
                    <Link href="/pages/trademarks" className="hover:underline">Thương hiệu</Link>
                </div>
                <p>&copy; {new Date().getFullYear()} {companyName}</p>
                {footerContactHtml ? (
                    <div 
                        className="max-w-3xl text-center space-y-1.5 [&_p]:mb-1 [&_strong]:font-semibold [&_a]:text-blue-500 hover:[&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: footerContactHtml }} 
                    />
                ) : (
                    <div className="max-w-3xl text-center space-y-1.5">
                        <p><strong>Trụ sở:</strong> HIT GROUP COMPANY LIMITED, 72 Lê Thánh Tôn, P. Sài Gòn – L17-11</p>
                        <p><strong>GPKD:</strong> HIT GROUP COMPANY LIMITED, Tầng 5, 382/17-19 Nguyễn Thị Minh Khai, P. Bàn Cờ</p>
                        <p><strong>ioT Quản trị:</strong> SGS HK Limited, Enterprise Centre, 百利商業中心 100 Chatham Rd Hongkong</p>
                        <p><strong>CSKH:</strong> 0888.089.688 – <strong>Email:</strong> sales@saigonsoft.com</p>
                    </div>
                )}
                <p className="mt-2 opacity-60">SG e-Commerce Platform v1.2</p>
            </div>
            </div>
        </footer>
    );
}


export default function DetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 container py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}

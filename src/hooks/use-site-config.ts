import { useState, useEffect } from 'react';
import { getSiteConfig } from '@/lib/data';
import type { SiteConfig } from '@/lib/types';

let cachedConfigPromise: Promise<SiteConfig> | null = null;
let cachedConfigResult: SiteConfig | null = null;

export function useSiteConfig() {
    const [config, setConfig] = useState<SiteConfig | null>(cachedConfigResult);

    useEffect(() => {
        let isMounted = true;

        if (cachedConfigResult) {
             // Already initialized synchronously in useState, but we can call setConfig 
             // just to be safe if it was somehow updated elsewhere.
             setConfig(cachedConfigResult);
             return;
        }

        if (!cachedConfigPromise) {
            cachedConfigPromise = getSiteConfig().then(res => {
                cachedConfigResult = res;
                return res;
            });
        }

        cachedConfigPromise.then(res => {
            if (isMounted) {
                setConfig(res);
            }
        });

        return () => {
            isMounted = false;
        };
    }, []);

    return config;
}

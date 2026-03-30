'use server';

import { getDynamicAi } from '@/ai/genkit';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { MessageData } from 'genkit';

export type StoreChatMessage = {
  role: 'user' | 'model';
  content: string;
};

// Caching the string so we don't rebuild it on every single chat ping
let _cachedCatalogStr: string | null = null;
let _cachedCatalogTime: number = 0;
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes

async function buildKnowledgeContext(): Promise<string> {
    const now = Date.now();
    if (_cachedCatalogStr && (now - _cachedCatalogTime < CACHE_TTL_MS)) {
        return _cachedCatalogStr;
    }

    try {
        const docSnap = await getDoc(doc(db, 'settings', 'ai_knowledge'));
        if (docSnap.exists()) {
            _cachedCatalogStr = docSnap.data().content;
            _cachedCatalogTime = now;
            return _cachedCatalogStr!;
        }
    } catch (error) {
         console.error("Lỗi lấy knowledge base AI:", error);
    }
    
    // Fallback if not synced yet
    return "XIN LỖI, AI CHƯA ĐƯỢC HUẤN LUYỆN DỮ LIỆU. VUI LÒNG BÁO ADMIN VÀO CMS ĐỂ ĐỒNG BỘ (MANUAL SYNC).";
}

export async function chatWithStoreBot(history: StoreChatMessage[]): Promise<string> {
    try {
        const { ai } = await getDynamicAi();
        const knowledgePrompt = await buildKnowledgeContext();

        // Convert our simplified message format to Genkit's 'messages' format
        const messages = history.map(msg => ({
            role: msg.role,
            content: [{ text: msg.content }]
        }));

        // Inject the huge system instruction + database at the very start as a SYSTEM message
        const finalMessages = [
            { role: 'system', content: [{ text: knowledgePrompt }] },
            ...messages
        ] as MessageData[];

        const { text } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            messages: finalMessages,
            config: {
                temperature: 0.4, // Keep it relatively deterministic to avoid hallucinated prices
            }
        });

        return text;
    } catch (e) {
        console.error("Saigonsoft AI Error:", e);
        return "Xin lỗi, hiện tại tôi đang quá tải hoặc cấu hình AI chưa được thiết lập chính xác. Vui lòng thử lại sau hoặc liên hệ Hotline nhé!";
    }
}

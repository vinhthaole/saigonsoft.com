'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Bot, User, LoaderCircle } from 'lucide-react';
import { chatWithStoreBot, type StoreChatMessage } from '@/ai/flows/storefront-chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { useChatBotStore } from '@/store/chat-bot';
import { Trash2, Maximize2, Minimize2 } from 'lucide-react';
import Link from 'next/link';

function ThinkingIndicator() {
    const [phaseIndex, setPhaseIndex] = useState(0);
    const phrases = ["Đang truy xuất hệ thống...", "Đang tra cứu kho dữ liệu Saigonsoft...", "Đang đối chiếu thông tin...", "Đang phân tích & soạn tư vấn..."];

    useEffect(() => {
        const interval = setInterval(() => {
            setPhaseIndex((prev) => (prev + 1) % phrases.length);
        }, 600);
        return () => clearInterval(interval);
    }, [phrases.length]);

    return (
        <span className="text-xs font-medium bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent break-none whitespace-nowrap overflow-hidden transition-all duration-300 min-w-[150px] inline-block">
            {phrases[phaseIndex]}<span className="animate-pulse">...</span>
        </span>
    );
}

export function SaigonsoftBot() {
    const pathname = usePathname();
    const { isOpen, setIsOpen, messages, addMessage, setMessages, hasInitialized, setHasInitialized, clearSession } = useChatBotStore();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input when chat opens or finishes loading
    useEffect(() => {
        if (isOpen && !isLoading) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen, isLoading]);

    // Initial greeting
    useEffect(() => {
        if (isOpen && !hasInitialized) {
            setMessages([
                { role: 'model', content: 'Xin chào! Tôi là Trợ lý AI của Saigonsoft. Bạn đang tìm kiếm phần mềm nào hay cần tư vấn về bản quyền ạ?\n\n🏢 **Doanh nghiệp & Công ty**: Vui lòng email [sales@saigonsoft.com](mailto:sales@saigonsoft.com) để có báo giá tốt nhất.\n🤝 **Đại lý (Reseller) & Đối tác**: Vui lòng liên hệ [partners@saigonsoft.com](mailto:partners@saigonsoft.com).' }
            ]);
            setHasInitialized(true);
        }
    }, [isOpen, hasInitialized, setMessages, setHasInitialized]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        
        const updatedHistory: StoreChatMessage[] = [
            ...messages,
            { role: 'user', content: userMsg }
        ];
        
        setMessages(updatedHistory);
        setIsLoading(true);

        const greetingRegex = /^(hi|hello|chào|alo|xin chào|hey|dạ)(\s+bạn|\s+anh|\s+chị|\s+em|\s+shop|\s+ad|\s*!|\s*\.)*$/i;

        if (greetingRegex.test(userMsg)) {
            setTimeout(() => {
                addMessage({ role: 'model', content: 'Dạ, Saigonsoft AI xin chào ạ! Em có thể giúp gì cho anh/chị? Anh/chị đang tìm kiếm phần mềm nào ạ?' });
                setIsLoading(false);
            }, 600);
            return;
        }

        try {
            // Strip the initialization greeting from reality context so we don't skew the AI with our hardcoded prompt
            const apiHistory = updatedHistory.filter((_, i) => i !== 0 || updatedHistory[0].role !== 'model');
            const modelReply = await chatWithStoreBot(apiHistory);
            
            addMessage({ role: 'model', content: modelReply });
        } catch (error) {
            addMessage({ role: 'model', content: 'Lỗi kết nối máy chủ AI. Vui lòng thử lại.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    };

    // Hide chatbot in CMS Admin, login pages, and reseller dashboard
    if (pathname.startsWith('/cms') || pathname.startsWith('/login') || pathname.startsWith('/reseller')) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {isOpen ? (
                <Card className={`shadow-2xl flex flex-col border-primary/20 overflow-hidden !rounded-2xl origin-bottom-right animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300 transition-all ${
                    isExpanded 
                        ? 'w-[90vw] sm:w-[700px] h-[80vh] max-h-[800px]' 
                        : 'w-[350px] sm:w-[420px] h-[550px]'
                }`}>
                    <CardHeader className="p-4 bg-primary text-primary-foreground flex flex-row items-center justify-between rounded-t-2xl space-y-0 relative shrink-0">
                         <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 rounded-t-2xl pointer-events-none" />
                         <div className="relative z-10 flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold text-white">Saigonsoft AI</CardTitle>
                                <p className="text-xs text-blue-100">Luôn sẵn sàng tư vấn 24/7</p>
                            </div>
                         </div>
                        <div className="flex items-center">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Làm mới đoạn chat"
                                className="relative z-10 text-white hover:bg-white/20 hover:text-white rounded-full h-8 w-8 mr-1"
                                onClick={() => {
                                    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử tư vấn hiện tại?')) {
                                        clearSession();
                                    }
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                title={isExpanded ? "Thu nhỏ" : "Phóng to"}
                                className="relative z-10 text-white hover:bg-white/20 hover:text-white rounded-full h-8 w-8 mr-1"
                                onClick={() => setIsExpanded(!isExpanded)}
                            >
                                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="relative z-10 text-white hover:bg-white/20 hover:text-white rounded-full h-8 w-8"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="p-0 flex-1 min-h-0 overflow-hidden bg-slate-50/50 backdrop-blur-sm dark:bg-slate-950/50">
                        <ScrollArea ref={scrollRef} className="h-full p-4 pr-3">
                            <div className="space-y-4">
                                {messages.map((msg, index) => (
                                    <div 
                                        key={index}
                                        className={`flex gap-3 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {msg.role === 'model' && (
                                            <Avatar className="h-8 w-8 border bg-white shadow-sm flex-shrink-0">
                                                <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
                                                <Bot className="h-4 w-4 m-auto text-primary" />
                                            </Avatar>
                                        )}
                                        
                                        <div className={`
                                            p-3 rounded-2xl max-w-[85%] break-words leading-relaxed shadow-sm
                                            ${msg.role === 'user' 
                                                ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                                                : 'bg-white border text-foreground rounded-tl-sm'}
                                        `}>
                                            <ReactMarkdown 
                                                components={{
                                                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                                    strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                                                    ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                                                    ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
                                                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                                    a: ({node, href, ...props}) => {
                                                        let finalHref = href || '#';
                                                        
                                                        // Ensure AI links to our store always use relative routing to correctly map Localhost/Production
                                                        try {
                                                            const url = new URL(finalHref);
                                                            if (url.hostname.toLowerCase().includes('saigonsoft') || 
                                                                url.hostname.includes('localhost') || 
                                                                url.hostname.includes('127.0.0.1')) {
                                                                finalHref = url.pathname + url.search + url.hash;
                                                            }
                                                        } catch(e) {}
                                                        
                                                        // Ensure it's treated as a relative path if it starts with a slash
                                                        if (finalHref.startsWith('/')) {
                                                            return <Link href={finalHref} onClick={() => setIsOpen(false)} className="text-blue-600 hover:text-blue-800 underline underline-offset-2 font-medium" {...props as any} />
                                                        }
                                                        
                                                        // External links (like mailto or Microsoft) also open in current tab per user request
                                                        return <a href={finalHref} onClick={() => setIsOpen(false)} className="text-blue-600 hover:text-blue-800 underline underline-offset-2 font-medium" {...props} />
                                                    },
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="flex gap-3 text-sm justify-start animate-in fade-in zoom-in duration-300">
                                        <Avatar className="h-8 w-8 border bg-white shadow-sm">
                                            <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
                                            <Bot className="h-4 w-4 m-auto text-primary" />
                                        </Avatar>
                                        <div className="px-4 py-2.5 rounded-2xl bg-white border border-blue-100 rounded-tl-sm flex items-center gap-2 shadow-sm">
                                            <LoaderCircle className="h-3.5 w-3.5 animate-spin text-blue-600 shrink-0" />
                                            <ThinkingIndicator />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                    
                    <CardFooter className="p-3 bg-white border-t rounded-b-xl dark:bg-slate-950">
                        <div className="flex w-full items-center gap-2">
                            <Input 
                                ref={inputRef}
                                placeholder="Nhập câu hỏi của bạn..." 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading}
                                className="flex-1 border-muted-foreground/20 focus-visible:ring-primary/50 rounded-full bg-slate-50 dark:bg-slate-900"
                            />
                            <Button 
                                size="icon" 
                                disabled={!input.trim() || isLoading} 
                                onClick={handleSend}
                                className="rounded-full shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            ) : (
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-40 group-hover:opacity-60 animate-pulse transition duration-500 pointer-events-none"></div>
                    <Button 
                        size="lg" 
                        className="relative h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-110 ring-4 ring-blue-600/20 hover:ring-blue-600/40 transition-all duration-300 p-0 origin-center animate-in zoom-in fade-in"
                        onClick={() => setIsOpen(true)}
                    >
                        <MessageCircle className="h-6 w-6 text-white" />
                    </Button>
                </div>
            )}
        </div>
    );
}

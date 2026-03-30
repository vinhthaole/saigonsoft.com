'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, RefreshCcw, Info, DatabaseZap } from 'lucide-react';
import { analyzeAIKnowledgeBase, commitAIKnowledgeBase, KnowledgeDiff } from '../actions';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function SyncButton() {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isCommitting, setIsCommitting] = useState(false);
    
    // Modal state
    const [isOpen, setIsOpen] = useState(false);
    const [diff, setDiff] = useState<KnowledgeDiff | null>(null);
    const [previewData, setPreviewData] = useState<{ catalog: string, entitiesHash: any } | null>(null);

    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const handleAnalyze = async () => {
        if (!user || isAnalyzing) return;
        
        setIsAnalyzing(true);
        toast({
            title: 'Đang phân tích',
            description: 'AI đang so sánh dữ liệu mới và cũ...',
        });

        const result = await analyzeAIKnowledgeBase();
        
        if (result.success && result.diff) {
            setDiff(result.diff);
            setPreviewData({
                catalog: result.catalog!,
                entitiesHash: result.entitiesHash!
            });
            setIsOpen(true);
        } else {
            toast({
                 title: 'Thất bại',
                 description: 'Lỗi phân tích Website.',
                 variant: 'destructive',
            });
        }
        setIsAnalyzing(false);
    };

    const handleCommit = async () => {
        if (!user || !previewData) return;
        setIsCommitting(true);

        const result = await commitAIKnowledgeBase(user.email!, previewData.catalog, previewData.entitiesHash);

        if (result.success) {
            toast({
                title: 'Đã Đồng bộ xong!',
                description: 'Bộ não của AI vừa được cập nhật theo dữ liệu mới.',
            });
            setIsOpen(false);
            router.refresh();
        } else {
             toast({
                title: 'Thất bại',
                description: 'Không thể ghi đè lúc này.',
                variant: 'destructive',
            });
        }
        setIsCommitting(false);
    };

    return (
        <>
        <Button 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
        >
            {isAnalyzing ? (
                <>
                    <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                    Đang Quét & Phân tích...
                </>
            ) : (
                <>
                    <Bot className="mr-2 h-4 w-4" />
                    Bắt đầu Quét Website & Phân tích
                </>
            )}
        </Button>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                         <DatabaseZap className="h-5 w-5 text-blue-600" />
                         Thống kê thay đổi
                    </DialogTitle>
                    <DialogDescription>
                         So sánh lượng dữ liệu mới quét được so với phiên bản AI đang ghi nhớ.
                    </DialogDescription>
                </DialogHeader>
                
                {diff && (
                     <div className="py-4 space-y-3">
                         {(!diff.configChanged && diff.added.length === 0 && diff.modified.length === 0 && diff.removed.length === 0) ? (
                              <div className="text-sm bg-blue-50 text-blue-800 p-3 rounded-md flex gap-2">
                                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                  <p>Không có bất kì sự thay đổi nào về Thông tin và Sản phẩm so với lần quét trước. Nhấn Xác nhận nếu bạn vẫn muốn ép ghi đè.</p>
                              </div>
                         ) : (
                             <ul className="text-sm space-y-2">
                                 {diff.configChanged && (
                                     <li className="flex justify-between items-center text-orange-600 bg-orange-50 p-2 rounded px-3">
                                         <span>Cấu hình Cửa hàng:</span>
                                         <strong>Đã thay đổi</strong>
                                     </li>
                                 )}
                                 <li className="flex justify-between items-center text-green-600 bg-green-50 p-2 rounded px-3">
                                     <span>Thêm mới:</span>
                                     <strong>+{diff.added.length} Sản phẩm</strong>
                                 </li>
                                 <li className="flex justify-between items-center text-blue-600 bg-blue-50 p-2 rounded px-3">
                                     <span>Có cập nhật/Sửa giá:</span>
                                     <strong>~{diff.modified.length} Sản phẩm</strong>
                                 </li>
                                 <li className="flex justify-between items-center text-red-600 bg-red-50 p-2 rounded px-3">
                                     <span>Bị gỡ/Ẩn đi:</span>
                                     <strong>-{diff.removed.length} Sản phẩm</strong>
                                 </li>
                             </ul>
                         )}
                     </div>
                )}
                
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isCommitting}>
                         Huỷ bỏ
                    </Button>
                    <Button onClick={handleCommit} disabled={isCommitting}>
                        {isCommitting ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Xác nhận Ghi đè (Override)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}

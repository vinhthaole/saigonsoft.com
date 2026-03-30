'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, LoaderCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { checkMissingComparisons, generateComparisonPair, type ComparisonPair } from '../actions/comparison-jobs';

export function AutoCompareButton() {
    const [open, setOpen] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [pairs, setPairs] = useState<ComparisonPair[]>([]);
    const [totalProducts, setTotalProducts] = useState(0);
    const [progress, setProgress] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);
    const { toast } = useToast();

    const handleOpen = async (isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen) {
            setIsChecking(true);
            try {
                const result = await checkMissingComparisons();
                setPairs(result.pairs);
                setTotalProducts(result.totalProducts);
            } catch (err) {
                toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể kiểm tra dữ liệu.' });
            } finally {
                setIsChecking(false);
            }
        }
    };

    const startBatchRun = async () => {
        setIsRunning(true);
        setProgress(0);
        setCompletedCount(0);

        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            
            try {
                const success = await generateComparisonPair(pair.prodA.id, pair.prodB.id);
                if (!success) {
                    console.warn(`Failed to generate comparison for ${pair.prodA.name} vs ${pair.prodB.name}`);
                }
            } catch (e) {
                 console.warn(`Error generating comparison for ${pair.prodA.name} vs ${pair.prodB.name}`);
            }

            setCompletedCount(i + 1);
            setProgress(((i + 1) / pairs.length) * 100);

            // Cooldown delay to prevent API rate limiting (Gemini limits)
            if (i < pairs.length - 1) {
                await new Promise(r => setTimeout(r, 4000));
            }
        }

        setIsRunning(false);
        toast({
            title: 'Hoàn tất So sánh!',
            description: `Đã chạy xong ${pairs.length} cặp so sánh.`
        });
    };

    return (
        <Dialog open={open} onOpenChange={!isRunning ? handleOpen : undefined}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Auto-Compare AI
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Mô-đun So sánh chéo Vét cạn</DialogTitle>
                    <DialogDescription>
                        Trí tuệ nhân tạo sẽ tự động lập bảng so sánh tỷ lệ 1-vs-1 cho toàn bộ sản phẩm đang bật Hoạt động của cùng một danh mục, sau đó lưu vĩnh viễn vào bộ nhớ đệm (Cache).
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {isChecking ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            Đang quét sản phẩm và các cặp chưa tạo so sánh...
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span>Tổng số phần mềm: <b>{totalProducts}</b></span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Sparkles className="h-4 w-4 text-blue-600" />
                                <span>Số cặp chưa có dữ liệu so sánh (Cần AI chạy): <b>{pairs.length}</b></span>
                            </div>
                            
                            {pairs.length === 0 ? (
                                <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200 mt-4">
                                    Tất cả sản phẩm đều đã có bài so sánh chéo! Bạn không cần chạy AI thêm nữa.
                                </p>
                            ) : (
                                <div className="bg-secondary/30 p-4 rounded-lg space-y-2 mt-4">
                                    <div className="flex justify-between text-xs mb-2">
                                        <span>Tiến độ tiến hành</span>
                                        <span>{completedCount} / {pairs.length}</span>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                    {isRunning && (
                                        <p className="text-xs text-muted-foreground animate-pulse text-center mt-2">
                                            Vui lòng giữ nguyên bảng này cho tới khi quá trình phân tích hoàn tất...
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isRunning}>Đóng</Button>
                    <Button 
                        onClick={startBatchRun} 
                        disabled={isChecking || isRunning || pairs.length === 0}
                    >
                        {isRunning && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        {isRunning ? 'Đang chạy phân tích...' : 'Bắt đầu cày ngay'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

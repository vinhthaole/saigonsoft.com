'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { resetCustomerPassword } from '@/lib/admin-actions';
import { Key, LoaderCircle } from 'lucide-react';

interface ResetPasswordButtonProps {
    uid: string;
    customerName: string;
}

export function ResetPasswordButton({ uid, customerName }: ResetPasswordButtonProps) {
    const { toast } = useToast();
    const [isPending, setIsPending] = useState(false);

    const handleReset = () => {
        // Use a short timeout to prevent any React rendering block during confirm
        setTimeout(() => {
            if (!confirm(`Bạn có chắc chắn muốn cấp lại mật khẩu mới tự động cho ${customerName} và gửi qua email không?`)) {
                return;
            }

            setIsPending(true);
            toast({
                title: "Đang xử lý...",
                description: "Hệ thống đang khởi tạo mật khẩu và gửi email. Vui lòng đợi.",
            });

            resetCustomerPassword(uid)
                .then((res: any) => {
                    toast({
                        duration: 10000,
                        title: "Thành công",
                        description: `Mật khẩu tạm đã được gửi. (Mật khẩu: ${res.temporaryPassword})`,
                    });
                })
                .catch((error: any) => {
                    toast({
                        variant: 'destructive',
                        title: 'Lỗi',
                        description: error.message || 'Không thể cấp lại mật khẩu.',
                    });
                })
                .finally(() => {
                    setIsPending(false);
                });
        }, 150);
    };

    return (
        <Button 
            variant="outline" 
            onClick={handleReset} 
            disabled={isPending}
            className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
        >
            {isPending ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Key className="mr-2 h-4 w-4" />
            )}
            Cấp lại mật khẩu tạm
        </Button>
    );
}

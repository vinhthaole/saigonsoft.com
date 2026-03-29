'use client';

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCopy } from "lucide-react";

interface CopyButtonProps {
    textToCopy: string;
}

export function CopyButton({ textToCopy }: CopyButtonProps) {
    const { toast } = useToast();

    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy);
        toast({
            title: "Đã sao chép!",
            description: "Thông tin đã được sao chép vào bộ nhớ tạm.",
        });
    };
    
    return (
         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
            <ClipboardCopy className="h-4 w-4" />
        </Button>
    )
}

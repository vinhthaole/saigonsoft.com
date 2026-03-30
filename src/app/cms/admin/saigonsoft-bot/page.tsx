import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { SyncButton } from './_components/sync-button';
import { Bot, RefreshCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SaigonsoftBotAdminPage() {
    let lastSync: any = null;

    try {
        const docSnap = await getDoc(doc(db, 'settings', 'ai_knowledge'));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data?.updatedAt) {
                 lastSync = {
                     time: data.updatedAt.toDate(),
                     by: data.updatedBy || 'System'
                 };
            }
        }
    } catch (error) {
        console.error("Failed to fetch AI knowledge metadata:", error);
    }

    return (
        <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Saigonsoft Trợ lý AI</h2>
                    <p className="text-muted-foreground mt-1">
                        Quản lý bộ nhớ và tri thức của Chatbot tư vấn bán hàng.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-primary" />
                            Đồng bộ Tri thức (Knowledge Base)
                        </CardTitle>
                        <CardDescription>
                            AI Chatbot sử dụng cơ chế đọc tĩnh (Static Retrieval) để phản hồi siêu tốc độ (không độ trễ).
                            Sau khi bạn thêm Sản phẩm mới hoặc Sửa giá bán trên Web, bạn cần bấm Đồng Bộ để AI "học lại" kiến thức mới nhất.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {lastSync ? (
                            <Alert className="bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800">
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <AlertTitle className="text-green-800 dark:text-green-300">Đã đồng bộ</AlertTitle>
                                <AlertDescription className="text-green-700 dark:text-green-400">
                                    Cập nhật lần cuối: <strong>{lastSync.time.toLocaleString('vi-VN')}</strong> <br />
                                    Bởi người dùng: <strong>{lastSync.by}</strong>
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Chưa có dữ liệu</AlertTitle>
                                <AlertDescription>
                                    AI hiện tại chưa được đóng gói dữ liệu, có thể gây lỗi hoặc sai lệch khi tư vấn. Vui lòng bấm Đồng Bộ ngay.
                                </AlertDescription>
                            </Alert>
                        )}
                        
                        <div className="rounded-lg p-4 bg-muted text-sm border">
                            <strong>Tiến trình Đồng Bộ bao gồm:</strong>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Thiết lập Cửa hàng (Tên, SDT, Địa chỉ)</li>
                                <li>Toàn bộ Danh mục hiện hành</li>
                                <li>Toàn bộ Sản phẩm (đang Bật) và Giá Sale mới nhất</li>
                            </ul>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <SyncButton />
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

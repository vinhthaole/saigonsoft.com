
import { Suspense } from "react";
import { CustomersClientPage } from "./_components/customers-client-page";
import { getCustomers } from "@/lib/admin-actions";
import { serializeForClient } from "@/lib/serializeForClient";

export default async function AdminCustomersPage() {
    const initialCustomers = await getCustomers({ status: 'active' });

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Khách hàng</h1>
                    <p className="text-muted-foreground mt-1">
                        Xem, lọc và quản lý thông tin khách hàng của bạn.
                    </p>
                </div>
            </div>
            <Suspense fallback={<p>Đang tải danh sách khách hàng...</p>}>
                <CustomersClientPage
                    initialCustomers={serializeForClient(initialCustomers)}
                />
            </Suspense>
        </div>
    );
}

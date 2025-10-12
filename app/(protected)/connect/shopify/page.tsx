import { Suspense } from "react";
import ShopifyConnectClient from "./ShopifyConnectClient";

export default function ConnectShopifyPage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-6"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    }>
      <ShopifyConnectClient />
    </Suspense>
  );
}
  
export default function ConnectShopifyPage() {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-semibold">Connect Shopify</h1>
          <p className="mt-2 text-sm text-gray-600">
            This is a placeholder. Next we’ll add OAuth to your Shopify Dev Store.
          </p>
  
          <div className="mt-6 space-y-3">
            <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
              <li>Create a Shopify <em>Custom App</em> in your dev store.</li>
              <li>Whitelist callback: <code className="bg-gray-100 px-2 py-1 rounded">https://YOUR_DOMAIN/api/shopify/callback</code></li>
              <li>Copy API Key and Secret into your Retention OS settings.</li>
            </ol>
  
            <button
              className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90"
              disabled
              title="Coming soon"
            >
              Start OAuth (Coming soon)
            </button>
          </div>
        </div>
      </div>
    );
  }
  
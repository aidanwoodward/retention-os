/**
 * Shopify API client for making authenticated requests to Shopify stores
 */

interface ShopifyConfig {
  shopDomain: string;
  accessToken: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string;
  created_at: string;
  total_price: string;
  financial_status: string;
  customer?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
}

export class ShopifyClient {
  private shopDomain: string;
  private accessToken: string;
  private baseUrl: string;

  constructor(config: ShopifyConfig) {
    this.shopDomain = config.shopDomain.replace(/\.myshopify\.com$/, '');
    this.accessToken = config.accessToken;
    this.baseUrl = `https://${this.shopDomain}.myshopify.com/admin/api/2023-10`;
  }

  /**
   * Test the connection by fetching shop information
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const data = await response.json();
      return data.shop;
    } catch (error) {
      console.error('Shopify connection test failed:', error);
      throw error;
    }
  }

  /**
   * Fetch products from the store
   */
  async getProducts(limit = 50): Promise<ShopifyProduct[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/products.json?limit=${limit}`,
        {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const data = await response.json();
      return data.products;
    } catch (error) {
      console.error('Failed to fetch products:', error);
      throw error;
    }
  }

  /**
   * Fetch orders from the store
   */
  async getOrders(limit = 50): Promise<ShopifyOrder[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/orders.json?limit=${limit}&status=any`,
        {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const data = await response.json();
      return data.orders;
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      throw error;
    }
  }

  /**
   * Fetch customer data for retention analysis
   */
  async getCustomers(limit = 50) {
    try {
      const response = await fetch(
        `${this.baseUrl}/customers.json?limit=${limit}`,
        {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const data = await response.json();
      return data.customers;
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      throw error;
    }
  }
}

/**
 * Create a Shopify client from stored connection data
 */
export async function createShopifyClient(userId: string, supabase: any) {
  const { data, error } = await supabase
    .from('shopify_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new Error('No active Shopify connection found');
  }

  return new ShopifyClient({
    shopDomain: data.shop_domain,
    accessToken: data.access_token,
  });
}

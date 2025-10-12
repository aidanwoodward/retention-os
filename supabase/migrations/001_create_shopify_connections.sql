-- Create shopify_connections table to store OAuth tokens and connection data
CREATE TABLE IF NOT EXISTS shopify_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,
  access_token TEXT NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one active connection per user per shop
  UNIQUE(user_id, shop_domain)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_shopify_connections_user_id ON shopify_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_connections_shop_domain ON shopify_connections(shop_domain);

-- Enable Row Level Security (RLS)
ALTER TABLE shopify_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - users can only access their own connections
CREATE POLICY "Users can manage their own shopify connections" ON shopify_connections
  FOR ALL USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shopify_connections_updated_at 
  BEFORE UPDATE ON shopify_connections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

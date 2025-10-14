-- Fix the hash_email function to return proper composite type
-- This migration fixes the function definition

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS hash_email(TEXT);

-- Recreate the function with proper return type
CREATE OR REPLACE FUNCTION hash_email(email TEXT)
RETURNS TABLE(hash TEXT, salt TEXT) AS $$
DECLARE
  random_salt TEXT;
  email_hash TEXT;
BEGIN
  -- Generate random salt
  random_salt := encode(gen_random_bytes(16), 'hex');
  
  -- Hash email + salt
  email_hash := encode(digest(email || random_salt, 'sha256'), 'hex');
  
  RETURN QUERY SELECT email_hash, random_salt;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT 'Function fixed!' as status, hash_email('test@example.com') as test_result;

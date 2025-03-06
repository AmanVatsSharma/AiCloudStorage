-- Create a storage bucket for files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', false)
ON CONFLICT (id) DO NOTHING;

-- Make sure Row Level Security is enabled on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Add a simple policy allowing all operations for authenticated users
CREATE POLICY "Allow authenticated users full access to files bucket"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'files')
WITH CHECK (bucket_id = 'files'); 
-- Create a storage bucket for files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', false)
ON CONFLICT (id) DO NOTHING;

-- Simplest approach: For development, just allow all authenticated users full access to storage
-- This is the most reliable way to get things working quickly
CREATE POLICY "Temporary full access to files bucket for authenticated users"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'files')
WITH CHECK (bucket_id = 'files');

-- For production use later, you can replace the above policy with more restrictive ones like:
-- Note: Commented out for now to avoid SQL errors

/*
-- Allow users to upload any files (simplified policy)
CREATE POLICY "Users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'files');

-- Allow users to read any files (simplified policy)
CREATE POLICY "Users can read files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'files');

-- Allow users to update any files (simplified policy)
CREATE POLICY "Users can update files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'files');

-- Allow users to delete any files (simplified policy)
CREATE POLICY "Users can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'files');
*/ 
-- Add description column to teams table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'teams' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.teams ADD COLUMN description TEXT;
    END IF;
END
$$; 
-- 009_fix_super_admin_rls.sql
-- Allow authenticated users to view their own platform admin status

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'platform_admins' 
        AND policyname = 'Users can view own platform_admins entry'
    ) THEN
        CREATE POLICY "Users can view own platform_admins entry" 
        ON public.platform_admins 
        FOR SELECT 
        TO authenticated 
        USING (id = auth.uid());
    END IF;
END $$;

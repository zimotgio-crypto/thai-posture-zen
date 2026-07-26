DROP POLICY IF EXISTS "admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "users can read own role" ON public.user_roles;
DROP TABLE IF EXISTS public.user_roles;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP TYPE IF EXISTS public.app_role;

-- 1. Create a public view for profiles that excludes the email column
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

-- 2. Grant SELECT on the public view to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;

-- 3. Drop the old permissive policy that allows everyone to see profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- 4. Create new policy: users can only SELECT their own profile directly
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- 5. Update the ranking_view to use the public profile view (without email)
DROP VIEW IF EXISTS public.ranking_view;

CREATE VIEW public.ranking_view
WITH (security_invoker = on) AS
SELECT 
  uc.user_id,
  p.display_name,
  p.avatar_url,
  e.season_id,
  COUNT(uc.id)::integer as card_count
FROM public.user_cards uc
INNER JOIN public.events e ON uc.event_id = e.id
INNER JOIN public.profiles_public p ON uc.user_id = p.user_id
GROUP BY uc.user_id, p.display_name, p.avatar_url, e.season_id;

-- 6. Grant SELECT on ranking_view to authenticated users
GRANT SELECT ON public.ranking_view TO authenticated;

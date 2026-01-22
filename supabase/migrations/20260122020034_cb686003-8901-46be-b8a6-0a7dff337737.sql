-- First, remove the insecure SELECT policy that exposes all user_cards
DROP POLICY IF EXISTS "Authenticated users can view all cards for ranking" ON public.user_cards;

-- Create a secure view for ranking that only exposes aggregated counts
-- This view joins user_cards with events and profiles to provide ranking data
-- without exposing the full user_cards table
CREATE OR REPLACE VIEW public.ranking_view
WITH (security_invoker = on) AS
SELECT 
  uc.user_id,
  p.display_name,
  p.avatar_url,
  e.season_id,
  COUNT(uc.id)::integer as card_count
FROM public.user_cards uc
INNER JOIN public.events e ON uc.event_id = e.id
INNER JOIN public.profiles p ON uc.user_id = p.user_id
GROUP BY uc.user_id, p.display_name, p.avatar_url, e.season_id;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.ranking_view TO authenticated;

-- Add email column to profiles for display purposes (optional, can be set by user)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
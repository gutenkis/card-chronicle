-- Remove policy antiga
DROP POLICY IF EXISTS "Users can view own cards"
ON public.user_cards;

-- Cria nova policy mais permissiva
CREATE POLICY "Users can view all user cards"
ON public.user_cards
FOR SELECT
TO authenticated
USING (true);

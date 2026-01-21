-- Corrigir RLS policy para user_cards permitir visualização para ranking
DROP POLICY IF EXISTS "Users can view own cards" ON public.user_cards;
DROP POLICY IF EXISTS "Users can view all user cards" ON public.user_cards;

-- Policy para usuários verem seus próprios cards
CREATE POLICY "Users can view own cards"
ON public.user_cards
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy para todos usuários autenticados verem cards (para ranking)
CREATE POLICY "Authenticated users can view all cards for ranking"
ON public.user_cards
FOR SELECT
TO authenticated
USING (true);

-- Criar enum para variantes de cards
CREATE TYPE public.card_variant AS ENUM ('comum', 'holografica', 'edicao_diamante', 'reliquia');

-- Adicionar coluna de variante na tabela user_cards
ALTER TABLE public.user_cards
ADD COLUMN variant card_variant NOT NULL DEFAULT 'comum';
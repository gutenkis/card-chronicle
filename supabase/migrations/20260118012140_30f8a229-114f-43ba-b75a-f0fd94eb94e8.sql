
-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create rarity enum for cards
CREATE TYPE public.card_rarity AS ENUM ('comum', 'raro', 'epico', 'lendario');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    UNIQUE (user_id, role)
);

-- Create seasons table
CREATE TABLE public.seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    cover_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create events/cards table
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    theme TEXT,
    preacher TEXT,
    event_date DATE NOT NULL,
    redemption_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    card_image_url TEXT NOT NULL,
    rarity card_rarity NOT NULL DEFAULT 'comum',
    redemption_code TEXT UNIQUE NOT NULL,
    qr_code_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_cards table (collection)
CREATE TABLE public.user_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, event_id)
);

-- Create badges table
CREATE TABLE public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    badge_type TEXT NOT NULL, -- 'season_collector', 'supreme_collector', etc.
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_badges table
CREATE TABLE public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, badge_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seasons_updated_at
    BEFORE UPDATE ON public.seasons
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (NEW.id, NEW.email);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles: users can read all, update own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles: only admins can manage, users can read own
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Seasons: everyone can read, admins can manage
CREATE POLICY "Seasons are viewable by authenticated users" ON public.seasons
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage seasons" ON public.seasons
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Events: everyone can read, admins can manage
CREATE POLICY "Events are viewable by authenticated users" ON public.events
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage events" ON public.events
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- User cards: users can read own, insert own
CREATE POLICY "Users can view own cards" ON public.user_cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can redeem cards" ON public.user_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all user cards" ON public.user_cards
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Badges: everyone can read
CREATE POLICY "Badges are viewable by authenticated users" ON public.badges
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage badges" ON public.badges
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- User badges: users can read own
CREATE POLICY "Users can view own badges" ON public.user_badges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can award badges" ON public.user_badges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all user badges" ON public.user_badges
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for card images
INSERT INTO storage.buckets (id, name, public) VALUES ('cards', 'cards', true);

-- Storage policies
CREATE POLICY "Card images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'cards');

CREATE POLICY "Admins can upload card images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'cards' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update card images"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'cards' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete card images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'cards' AND public.has_role(auth.uid(), 'admin'));

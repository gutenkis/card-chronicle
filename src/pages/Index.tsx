import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import CollectibleCard, { CardRarity } from '@/components/cards/CollectibleCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Calendar } from 'lucide-react';

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface Event {
  id: string;
  title: string;
  card_image_url: string;
  rarity: CardRarity;
  event_date: string;
  preacher: string | null;
  theme: string | null;
  redemption_deadline: string;
  season_id: string;
}

interface UserCard {
  event_id: string;
}

const Index = () => {
  const { user } = useAuth();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [events, setEvents] = useState<Event[]>([]);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSeasons();
      fetchUserCards();
    }
  }, [user]);

  useEffect(() => {
    if (selectedSeason) {
      fetchEvents(selectedSeason);
    }
  }, [selectedSeason]);

  const fetchSeasons = async () => {
    const { data } = await supabase.from('seasons').select('*').order('start_date', { ascending: false });
    if (data && data.length > 0) {
      setSeasons(data);
      setSelectedSeason(data[0].id);
    }
    setLoading(false);
  };

  const fetchEvents = async (seasonId: string) => {
    const { data } = await supabase.from('events').select('*').eq('season_id', seasonId).order('event_date', { ascending: false });
    if (data) setEvents(data as Event[]);
  };

  const fetchUserCards = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_cards').select('event_id').eq('user_id', user.id);
    if (data) setUserCards(data);
  };

  const isCardRedeemed = (eventId: string) => userCards.some(uc => uc.event_id === eventId);
  const collectedCount = events.filter(e => isCardRedeemed(e.id)).length;

  if (!user) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
            <Sparkles className="w-20 h-20 text-primary mx-auto mb-6 animate-glow-pulse" />
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              CardVault
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Colecione cards exclusivos de eventos especiais. Cada momento, uma memória única.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold">Minha Coleção</h1>
            <p className="text-muted-foreground">{collectedCount} de {events.length} cards coletados</p>
          </div>
          {seasons.length > 0 && (
            <Select value={selectedSeason} onValueChange={setSelectedSeason}>
              <SelectTrigger className="w-full md:w-64 glass">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Selecione a temporada" />
              </SelectTrigger>
              <SelectContent>
                {seasons.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {events.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum card disponível nesta temporada ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {events.map((event, i) => (
              <motion.div key={event.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <CollectibleCard
                  id={event.id}
                  title={event.title}
                  imageUrl={event.card_image_url}
                  rarity={event.rarity}
                  eventDate={event.event_date}
                  preacher={event.preacher || undefined}
                  theme={event.theme || undefined}
                  isRedeemed={isCardRedeemed(event.id)}
                  redemptionDeadline={new Date(event.redemption_deadline)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;

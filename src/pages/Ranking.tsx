import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Crown, Sparkles } from 'lucide-react';

interface RankingUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  card_count: number;
}

interface Season {
  id: string;
  name: string;
}

const Ranking = () => {
  const { user } = useAuth();
  const [selectedSeason, setSelectedSeason] = useState<string>('all');

  const { data: seasons } = useQuery({
    queryKey: ['seasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data as Season[];
    },
  });

  const { data: ranking, isLoading } = useQuery({
    queryKey: ['ranking', selectedSeason],
    queryFn: async () => {
      // Use the secure ranking_view instead of directly querying user_cards
      let query = supabase
        .from('ranking_view')
        .select('user_id, display_name, avatar_url, season_id, card_count');

      if (selectedSeason !== 'all') {
        query = query.eq('season_id', selectedSeason);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate card counts per user (in case of multiple seasons)
      const userTotals: Record<string, RankingUser> = {};
      
      data?.forEach((row) => {
        if (!userTotals[row.user_id]) {
          userTotals[row.user_id] = {
            user_id: row.user_id,
            display_name: row.display_name,
            avatar_url: row.avatar_url,
            card_count: 0,
          };
        }
        userTotals[row.user_id].card_count += row.card_count;
      });

      // Convert to array and sort by card count
      return Object.values(userTotals).sort((a, b) => b.card_count - a.card_count);
    },
  });

  const getRankIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Crown className="w-6 h-6 text-rarity-legendary" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 2:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">
            {position + 1}
          </span>
        );
    }
  };

  const getRankStyle = (position: number) => {
    switch (position) {
      case 0:
        return 'border-rarity-legendary/50 bg-rarity-legendary/5';
      case 1:
        return 'border-gray-400/50 bg-gray-400/5';
      case 2:
        return 'border-amber-600/50 bg-amber-600/5';
      default:
        return 'border-border/50';
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                <Trophy className="w-8 h-8 text-rarity-legendary" />
                Ranking de Colecionadores
              </h1>
              <p className="text-muted-foreground mt-1">
                Os maiores colecionadores de cards
              </p>
            </div>

            <Select value={selectedSeason} onValueChange={setSelectedSeason}>
              <SelectTrigger className="w-[200px] glass">
                <SelectValue placeholder="Filtrar por temporada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Temporadas</SelectItem>
                {seasons?.map((season) => (
                  <SelectItem key={season.id} value={season.id}>
                    {season.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="glass animate-pulse">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-6 h-6 bg-muted rounded" />
                  <div className="w-12 h-12 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-5 bg-muted rounded w-32 mb-2" />
                    <div className="h-4 bg-muted rounded w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !ranking?.length ? (
          <Card className="glass border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum card resgatado ainda.
                <br />
                Seja o primeiro a colecionar!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {ranking.map((rankUser, index) => (
                <motion.div
                  key={rankUser.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={`glass transition-all hover:scale-[1.01] ${getRankStyle(index)} ${
                      user?.id === rankUser.user_id ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 flex justify-center">
                        {getRankIcon(index)}
                      </div>
                      
                      <Avatar className="w-12 h-12 border-2 border-border">
                        {rankUser.avatar_url ? (
                          <img
                            src={rankUser.avatar_url}
                            alt={rankUser.display_name || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                            {getInitials(rankUser.display_name)}
                          </AvatarFallback>
                        )}
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">
                            {rankUser.display_name || 'Usuário Anônimo'}
                          </p>
                          {user?.id === rankUser.user_id && (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                              Você
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {rankUser.card_count} {rankUser.card_count === 1 ? 'card' : 'cards'}
                        </p>
                      </div>

                      {index < 3 && (
                        <div className="hidden md:flex items-center gap-2">
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              index === 0
                                ? 'bg-rarity-legendary/20 text-rarity-legendary'
                                : index === 1
                                ? 'bg-gray-400/20 text-gray-400'
                                : 'bg-amber-600/20 text-amber-600'
                            }`}
                          >
                            {index === 0 ? '🥇 1º Lugar' : index === 1 ? '🥈 2º Lugar' : '🥉 3º Lugar'}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default Ranking;

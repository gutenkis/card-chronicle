import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Layers, Calendar, Award } from 'lucide-react';

const AdminStats = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [seasonsRes, eventsRes, usersRes, cardsRes] = await Promise.all([
        supabase.from('seasons').select('id', { count: 'exact' }),
        supabase.from('events').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('user_cards').select('id', { count: 'exact' }),
      ]);

      return {
        seasons: seasonsRes.count || 0,
        events: eventsRes.count || 0,
        users: usersRes.count || 0,
        cardsRedeemed: cardsRes.count || 0,
      };
    },
  });

  const statCards = [
    {
      title: 'Temporadas',
      value: stats?.seasons || 0,
      icon: Calendar,
      color: 'text-primary',
      bgColor: 'bg-primary/20',
    },
    {
      title: 'Eventos',
      value: stats?.events || 0,
      icon: Layers,
      color: 'text-accent',
      bgColor: 'bg-accent/20',
    },
    {
      title: 'Usuários',
      value: stats?.users || 0,
      icon: Users,
      color: 'text-rarity-epic',
      bgColor: 'bg-rarity-epic/20',
    },
    {
      title: 'Cards Resgatados',
      value: stats?.cardsRedeemed || 0,
      icon: Award,
      color: 'text-rarity-legendary',
      bgColor: 'bg-rarity-legendary/20',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="glass animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="glass border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default AdminStats;

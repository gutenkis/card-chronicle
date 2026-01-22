import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Sparkles, 
  Gem, 
  Crown, 
  Award,
  Save,
  Edit2,
  Trophy,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

interface VariantStats {
  comum: number;
  holografica: number;
  edicao_diamante: number;
  reliquia: number;
}

interface UserBadge {
  id: string;
  badge: {
    id: string;
    name: string;
    description: string;
    icon_url: string | null;
    badge_type: string;
  };
  earned_at: string;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: variantStats } = useQuery({
    queryKey: ['variant-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_cards')
        .select('variant')
        .eq('user_id', user.id);
      
      if (error) throw error;

      const stats: VariantStats = {
        comum: 0,
        holografica: 0,
        edicao_diamante: 0,
        reliquia: 0,
      };

      data?.forEach((card) => {
        const variant = card.variant as keyof VariantStats;
        if (variant in stats) {
          stats[variant]++;
        }
      });

      return stats;
    },
    enabled: !!user,
  });

  const { data: userBadges } = useQuery({
    queryKey: ['user-badges', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          id,
          earned_at,
          badge:badges(id, name, description, icon_url, badge_type)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as unknown as UserBadge[];
    },
    enabled: !!user,
  });

  const { data: totalCards } = useQuery({
    queryKey: ['total-cards', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('user_cards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (newDisplayName: string) => {
      if (!user) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: newDisplayName })
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Nome atualizado com sucesso!');
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Erro ao atualizar nome');
    },
  });

  const handleSave = () => {
    if (displayName.trim()) {
      updateProfileMutation.mutate(displayName.trim());
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.substring(0, 2).toUpperCase();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Sparkles className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const variantConfig = [
    { key: 'comum', label: 'Comum', icon: Star, color: 'text-slate-400', bg: 'bg-slate-400/10' },
    { key: 'holografica', label: 'Holográfica', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { key: 'edicao_diamante', label: 'Diamante', icon: Gem, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { key: 'reliquia', label: 'Relíquia', icon: Crown, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Profile Header */}
          <Card className="glass">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <Avatar className="w-24 h-24 border-4 border-primary/20">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                      {getInitials(profile?.display_name)}
                    </AvatarFallback>
                  )}
                </Avatar>

                <div className="flex-1 text-center md:text-left">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="displayName">Nome de exibição</Label>
                        <Input
                          id="displayName"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Seu nome"
                          className="max-w-xs"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSave} 
                          disabled={updateProfileMutation.isPending}
                          size="sm"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Salvar
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsEditing(false)}
                          size="sm"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 justify-center md:justify-start">
                        <h1 className="text-2xl font-display font-bold">
                          {profile?.display_name || 'Usuário Anônimo'}
                        </h1>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-muted-foreground">{user.email}</p>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{totalCards}</div>
                  <div className="text-sm text-muted-foreground">Cards Coletados</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variant Stats */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Estatísticas de Variantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {variantConfig.map(({ key, label, icon: Icon, color, bg }) => (
                  <div
                    key={key}
                    className={`${bg} rounded-lg p-4 text-center`}
                  >
                    <Icon className={`w-8 h-8 mx-auto mb-2 ${color}`} />
                    <div className="text-2xl font-bold">
                      {variantStats?.[key as keyof VariantStats] || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Badges */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Conquistas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!userBadges?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma conquista ainda.</p>
                  <p className="text-sm">Continue coletando cards para desbloquear badges!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userBadges.map((ub) => (
                    <div
                      key={ub.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        {ub.badge.icon_url ? (
                          <img src={ub.badge.icon_url} alt={ub.badge.name} className="w-8 h-8" />
                        ) : (
                          <Award className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{ub.badge.name}</h4>
                        <p className="text-sm text-muted-foreground">{ub.badge.description}</p>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {new Date(ub.earned_at).toLocaleDateString('pt-BR')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Profile;

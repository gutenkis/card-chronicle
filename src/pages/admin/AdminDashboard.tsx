import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Layers, BarChart3 } from 'lucide-react';
import SeasonsManager from '@/components/admin/SeasonsManager';
import EventsManager from '@/components/admin/EventsManager';
import AdminStats from '@/components/admin/AdminStats';

const AdminDashboard = () => {
  const { isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-display font-bold mb-2">
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground">
            Gerencie temporadas, eventos e acompanhe as estatísticas
          </p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass border border-border/50">
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Estatísticas
            </TabsTrigger>
            <TabsTrigger value="seasons" className="gap-2">
              <Calendar className="w-4 h-4" />
              Temporadas
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2">
              <Layers className="w-4 h-4" />
              Eventos / Cards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats">
            <AdminStats />
          </TabsContent>

          <TabsContent value="seasons">
            <SeasonsManager />
          </TabsContent>

          <TabsContent value="events">
            <EventsManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;

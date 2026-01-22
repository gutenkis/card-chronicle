import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Layers, Loader2, QrCode, Copy, Check, Upload, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/integrations/supabase/types';

type CardRarity = Database['public']['Enums']['card_rarity'];

const eventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  theme: z.string().optional(),
  preacher: z.string().optional(),
  event_date: z.string().min(1, 'Data do evento é obrigatória'),
  redemption_deadline: z.string().min(1, 'Data limite de resgate é obrigatória'),
  season_id: z.string().min(1, 'Temporada é obrigatória'),
  rarity: z.enum(['comum', 'raro', 'epico', 'lendario'] as const),
});

type EventFormData = z.infer<typeof eventSchema>;

interface Event {
  id: string;
  title: string;
  theme: string | null;
  preacher: string | null;
  event_date: string;
  redemption_deadline: string;
  season_id: string;
  rarity: CardRarity;
  card_image_url: string;
  redemption_code: string;
  qr_code_data: string | null;
  created_at: string;
  seasons?: { name: string };
}

interface Season {
  id: string;
  name: string;
}

const generateRedemptionCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part1}-${part2}`;
};

const rarityLabels: Record<CardRarity, string> = {
  comum: 'Comum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
};

const rarityColors: Record<CardRarity, string> = {
  comum: 'bg-muted text-muted-foreground',
  raro: 'bg-rarity-raro/20 text-rarity-raro border-rarity-raro',
  epico: 'bg-rarity-epico/20 text-rarity-epico border-rarity-epico',
  lendario: 'bg-rarity-lendario/20 text-rarity-lendario border-rarity-lendario',
};

const EventsManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      theme: '',
      preacher: '',
      event_date: '',
      redemption_deadline: '',
      season_id: '',
      rarity: 'comum',
    },
  });

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

  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, seasons(name)')
        .order('event_date', { ascending: false });
      if (error) throw error;
      return data as Event[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      if (!imageFile) {
        throw new Error('Imagem do card é obrigatória');
      }

      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('cards')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('cards')
        .getPublicUrl(fileName);

      const redemptionCode = generateRedemptionCode();
      const qrCodeData = redemptionCode;

      const { error } = await supabase.from('events').insert({
        title: data.title,
        theme: data.theme || null,
        preacher: data.preacher || null,
        event_date: data.event_date,
        redemption_deadline: data.redemption_deadline,
        season_id: data.season_id,
        rarity: data.rarity,
        card_image_url: urlData.publicUrl,
        redemption_code: redemptionCode,
        qr_code_data: qrCodeData,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Evento criado com sucesso!');
      setIsDialogOpen(false);
      form.reset();
      setImageFile(null);
      setImagePreview(null);
    },
    onError: (error) => {
      toast.error('Erro ao criar evento: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EventFormData & { id: string }) => {
      let imageUrl = editingEvent?.card_image_url;

      // Upload new image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('cards')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('cards')
          .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('events')
        .update({
          title: data.title,
          theme: data.theme || null,
          preacher: data.preacher || null,
          event_date: data.event_date,
          redemption_deadline: data.redemption_deadline,
          season_id: data.season_id,
          rarity: data.rarity,
          card_image_url: imageUrl,
        })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Evento atualizado com sucesso!');
      setIsDialogOpen(false);
      setEditingEvent(null);
      form.reset();
      setImageFile(null);
      setImagePreview(null);
    },
    onError: (error) => {
      toast.error('Erro ao atualizar evento: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      // First delete related user_cards
      await supabase.from('user_cards').delete().eq('event_id', eventId);
      
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Evento excluído com sucesso!');
      setEventToDelete(null);
      setSelectedEvent(null);
    },
    onError: (error) => {
      toast.error('Erro ao excluir evento: ' + error.message);
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('png') && !file.type.includes('jpeg') && !file.type.includes('jpg')) {
        toast.error('Por favor, selecione uma imagem PNG ou JPG');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (data: EventFormData) => {
    if (editingEvent) {
      updateMutation.mutate({ ...data, id: editingEvent.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Código copiado!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenDialog = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      form.reset({
        title: event.title,
        theme: event.theme || '',
        preacher: event.preacher || '',
        event_date: event.event_date,
        redemption_deadline: event.redemption_deadline.slice(0, 16),
        season_id: event.season_id,
        rarity: event.rarity,
      });
      setImagePreview(event.card_image_url);
    } else {
      setEditingEvent(null);
      form.reset({
        title: '',
        theme: '',
        preacher: '',
        event_date: '',
        redemption_deadline: '',
        season_id: '',
        rarity: 'comum',
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    if (!open) {
      setEditingEvent(null);
      setImageFile(null);
      setImagePreview(null);
    }
    setIsDialogOpen(open);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Eventos / Cards</h2>
          <p className="text-muted-foreground">Crie e gerencie eventos e seus cards</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="glass max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título do Evento</FormLabel>
                      <FormControl>
                        <Input placeholder="Culto de Adoração" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="theme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tema</FormLabel>
                        <FormControl>
                          <Input placeholder="Tema do evento" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="preacher"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Religioso(a) / Pregador(a) / Ministério</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="event_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data do Evento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="redemption_deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Limite de Resgate</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="season_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temporada</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a temporada" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {seasons?.map((season) => (
                              <SelectItem key={season.id} value={season.id}>
                                {season.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rarity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Raridade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a raridade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="comum">Comum</SelectItem>
                            <SelectItem value="raro">Raro</SelectItem>
                            <SelectItem value="epico">Épico</SelectItem>
                            <SelectItem value="lendario">Lendário</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <FormLabel>Imagem do Card (PNG/JPG)</FormLabel>
                  <div className="flex gap-4">
                    <label className="flex-1 cursor-pointer">
                      <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2">
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-h-24 object-contain rounded"
                          />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Clique para selecionar
                            </span>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending || updateMutation.isPending || (!editingEvent && !imageFile)}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingEvent ? 'Salvar Alterações' : 'Criar Evento'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="glass max-w-sm max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              <div className="aspect-square rounded-lg overflow-hidden max-w-[200px] mx-auto">
                <img
                  src={selectedEvent.card_image_url}
                  alt={selectedEvent.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1 text-sm">
                <h3 className="font-semibold">{selectedEvent.title}</h3>
                <Badge className={rarityColors[selectedEvent.rarity]}>
                  {rarityLabels[selectedEvent.rarity]}
                </Badge>
                {selectedEvent.theme && (
                  <p><span className="font-semibold">Tema:</span> {selectedEvent.theme}</p>
                )}
                {selectedEvent.preacher && (
                  <p><span className="font-semibold"></span> {selectedEvent.preacher}</p>
                )}
                <p>
                  <span className="font-semibold">Data:</span>{' '}
                  {selectedEvent.event_date.split('-').reverse().join('/')}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Código:</span>
                  <div className="flex items-center gap-1">
                    <code className="font-mono font-bold text-primary text-sm">
                      {selectedEvent.redemption_code}
                    </code>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleCopyCode(selectedEvent.redemption_code)}
                    >
                      {copiedCode === selectedEvent.redemption_code ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-center p-2 bg-white rounded-lg">
                  <QRCodeSVG
                    value={selectedEvent.qr_code_data || selectedEvent.redemption_code}
                    size={100}
                    level="H"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedEvent(null);
                    handleOpenDialog(selectedEvent);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setEventToDelete(selectedEvent)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Evento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o evento "{eventToDelete?.title}"? 
              Esta ação também removerá todos os cards resgatados pelos usuários para este evento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => eventToDelete && deleteMutation.mutate(eventToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="glass animate-pulse">
              <CardContent className="p-3">
                <div className="aspect-[3/4] bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !events?.length ? (
        <Card className="glass border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum evento criado ainda.
              <br />
              Clique em "Novo Evento" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <AnimatePresence>
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card
                  className="glass border-border/50 hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => setSelectedEvent(event)}
                >
                  <CardContent className="p-2">
                    <div className="aspect-[3/4] rounded-lg overflow-hidden mb-2 relative">
                      <img
                        src={event.card_image_url}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-1 right-1">
                        <Badge className={`${rarityColors[event.rarity]} text-[10px] px-1.5 py-0.5`}>
                          {rarityLabels[event.rarity]}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="font-semibold text-xs truncate">{event.title}</h3>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground truncate">
                          {event.seasons?.name}
                        </span>
                        <div className="flex items-center gap-0.5 text-muted-foreground">
                          <QrCode className="w-2.5 h-2.5" />
                          <code className="font-mono">{event.redemption_code}</code>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default EventsManager;
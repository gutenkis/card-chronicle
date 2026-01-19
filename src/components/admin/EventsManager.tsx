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
import { Plus, Layers, Loader2, QrCode, Copy, Check, Upload, Image } from 'lucide-react';
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
  raro: 'bg-rarity-rare/20 text-rarity-rare border-rarity-rare',
  epico: 'bg-rarity-epic/20 text-rarity-epic border-rarity-epic',
  lendario: 'bg-rarity-legendary/20 text-rarity-legendary border-rarity-legendary',
};

const EventsManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
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

      // Upload image to storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('cards')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      // Get public URL
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
    createMutation.mutate(data);
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Código copiado!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenDialog = () => {
    form.reset({
      title: '',
      theme: '',
      preacher: '',
      event_date: '',
      redemption_deadline: '',
      season_id: '',
      rarity: 'comum',
    });
    setImageFile(null);
    setImagePreview(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Eventos / Cards</h2>
          <p className="text-muted-foreground">Crie e gerencie eventos e seus cards</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="glass max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Evento</DialogTitle>
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
                        <FormLabel>Pregador</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do pregador" {...field} />
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
                      <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2">
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-h-32 object-contain rounded"
                          />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
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
                  disabled={createMutation.isPending || !imageFile}
                >
                  {createMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Criar Evento
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="glass max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="aspect-[3/4] rounded-lg overflow-hidden">
                <img
                  src={selectedEvent.card_image_url}
                  alt={selectedEvent.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">{selectedEvent.title}</h3>
                <Badge className={rarityColors[selectedEvent.rarity]}>
                  {rarityLabels[selectedEvent.rarity]}
                </Badge>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Código de Resgate:</span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono font-bold text-primary">
                      {selectedEvent.redemption_code}
                    </code>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCopyCode(selectedEvent.redemption_code)}
                    >
                      {copiedCode === selectedEvent.redemption_code ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG
                    value={selectedEvent.qr_code_data || selectedEvent.redemption_code}
                    size={150}
                    level="H"
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-32" />
              </CardHeader>
              <CardContent>
                <div className="aspect-[3/4] bg-muted rounded mb-4" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="glass border-border/50 hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => setSelectedEvent(event)}
                >
                  <CardContent className="p-4">
                    <div className="aspect-[3/4] rounded-lg overflow-hidden mb-4 relative">
                      <img
                        src={event.card_image_url}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge className={rarityColors[event.rarity]}>
                          {rarityLabels[event.rarity]}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold truncate">{event.title}</h3>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {event.seasons?.name}
                        </span>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <QrCode className="w-3 h-3" />
                          <code className="text-xs font-mono">
                            {event.redemption_code}
                          </code>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.event_date), 'dd MMM yyyy', { locale: ptBR })}
                      </p>
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

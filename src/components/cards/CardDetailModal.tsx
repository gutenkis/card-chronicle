import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Download, Sparkles, Gem, Crown, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CardRarity, CardVariant } from './CollectibleCard';
import { toast } from 'sonner';

interface CardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: {
    id: string;
    title: string;
    imageUrl: string;
    rarity: CardRarity;
    variant: CardVariant;
    eventDate: string;
    preacher?: string;
    theme?: string;
  } | null;
}

const variantConfig = {
  comum: {
    label: '',
    overlayClass: '',
    badgeClass: '',
    icon: null,
  },
  holografica: {
    label: 'Holográfica',
    overlayClass: 'variant-holographic',
    badgeClass: 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white',
    icon: Sparkles,
  },
  edicao_diamante: {
    label: 'Diamante',
    overlayClass: 'variant-diamond',
    badgeClass: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white',
    icon: Gem,
  },
  reliquia: {
    label: 'Relíquia',
    overlayClass: 'variant-relic',
    badgeClass: 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black',
    icon: Crown,
  },
};

const rarityConfig = {
  comum: {
    label: 'Comum',
    borderClass: 'card-comum',
    textClass: 'text-rarity-comum',
    bgGradient: 'from-slate-500/20 to-slate-600/20',
  },
  raro: {
    label: 'Raro',
    borderClass: 'card-raro',
    textClass: 'text-rarity-raro',
    bgGradient: 'from-blue-500/20 to-cyan-500/20',
  },
  epico: {
    label: 'Épico',
    borderClass: 'card-epico',
    textClass: 'text-rarity-epico',
    bgGradient: 'from-purple-500/20 to-pink-500/20',
  },
  lendario: {
    label: 'Lendário',
    borderClass: 'card-lendario',
    textClass: 'text-rarity-lendario',
    bgGradient: 'from-amber-500/20 to-yellow-500/20',
  },
};

const CardDetailModal = ({ isOpen, onClose, card }: CardDetailModalProps) => {
  if (!card) return null;

  const config = rarityConfig[card.rarity];
  const variantStyle = variantConfig[card.variant];
  const VariantIcon = variantStyle.icon;

  const handleShare = async () => {
    const shareData = {
      title: `Renascer Cards - ${card.title}`,
      text: `Confira meu card ${variantStyle.label || config.label} "${card.title}"${card.theme ? ` - Tema: ${card.theme}` : ''}! 🎴✨`,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success('Compartilhado com sucesso!');
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          `${shareData.text}\n${shareData.url}`
        );
        toast.success('Link copiado para a área de transferência!');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast.error('Erro ao compartilhar');
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <div
              className="relative max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-12 right-0 text-white hover:bg-white/20 z-10"
                onClick={onClose}
              >
                <X className="w-6 h-6" />
              </Button>

              {/* Card */}
              <div
                className={cn(
                  'rounded-2xl p-1.5 transition-all duration-300',
                  config.borderClass,
                  card.variant === 'reliquia' && 'card-reliquia',
                  card.variant === 'holografica' && 'card-holografica',
                  card.variant === 'edicao_diamante' && 'card-diamante'
                )}
              >
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-card">
                  {/* Card image */}
                  <img
                    src={card.imageUrl}
                    alt={card.title}
                    className="w-full h-full object-cover"
                  />

                  {/* Variant overlay */}
                  {card.variant !== 'comum' && (
                    <div
                      className={cn(
                        'absolute inset-0 pointer-events-none',
                        variantStyle.overlayClass
                      )}
                    />
                  )}

                  {/* Holographic overlay for legendary */}
                  {card.rarity === 'lendario' && (
                    <div className="absolute inset-0 holographic pointer-events-none" />
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90" />

                  {/* Variant badge */}
                  {card.variant !== 'comum' && (
                    <div className="absolute top-4 left-4">
                      <span
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-lg',
                          variantStyle.badgeClass
                        )}
                      >
                        {VariantIcon && <VariantIcon className="w-4 h-4" />}
                        {variantStyle.label}
                      </span>
                    </div>
                  )}

                  {/* Rarity badge */}
                  <div className="absolute top-4 right-4">
                    <span
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-semibold backdrop-blur-sm',
                        `bg-gradient-to-r ${config.bgGradient}`,
                        config.textClass
                      )}
                    >
                      {config.label}
                    </span>
                  </div>

                  {/* Card info */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-3">
                      {card.title}
                    </h2>

                    {card.theme && (
                      <p className="text-sm text-muted-foreground mb-2">
                        <span className="font-semibold text-foreground">Tema:</span> {card.theme}
                      </p>
                    )}

                    {card.preacher && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                        <User className="w-4 h-4" />
                        Pregador: {card.preacher}
                      </p>
                    )}

                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {card.eventDate.split('-').reverse().join('/')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Share buttons */}
              <div className="flex justify-center gap-3 mt-4">
                <Button
                  onClick={handleShare}
                  className="flex-1 max-w-[200px]"
                  variant="default"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartilhar
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CardDetailModal;

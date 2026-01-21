import { motion } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import { HelpCircle, Clock, Lock, Gem, Crown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CardRarity = 'comum' | 'raro' | 'epico' | 'lendario';
export type CardVariant = 'comum' | 'holografica' | 'edicao_diamante' | 'reliquia';

interface CollectibleCardProps {
  id: string;
  title: string;
  imageUrl: string;
  rarity: CardRarity;
  variant?: CardVariant;
  eventDate: string;
  preacher?: string;
  theme?: string;
  isRedeemed: boolean;
  redemptionDeadline: Date;
  onClick?: () => void;
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

const CountdownTimer = ({ deadline }: { deadline: Date }) => {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) {
    return (
      <div className="flex items-center gap-1 text-destructive text-sm">
        <Lock className="w-3 h-3" />
        <span>Resgate encerrado</span>
      </div>
    );
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="flex items-center gap-1 text-primary text-sm">
      <Clock className="w-3 h-3" />
      <span>
        {days > 0 && `${days}d `}
        {hours}h {minutes}m
      </span>
    </div>
  );
};

const MysteryCard = ({ deadline, onClick }: { deadline: Date; onClick?: () => void }) => {
  const isExpired = new Date() > deadline;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: isExpired ? 1 : 1.02 }}
      className={cn(
        "cursor-pointer",
        isExpired && "cursor-not-allowed opacity-60"
      )}
      onClick={isExpired ? undefined : onClick}
    >
      <div className="card-mystery rounded-xl p-1 transition-all duration-300">
        <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted/50">
          {/* Mystery overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-background/50 to-background/80">
            <div className="animate-float">
              <HelpCircle className="w-16 h-16 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground mt-4 font-display text-sm">
              Card Misterioso
            </p>
          </div>
          
          {/* Shimmer effect */}
          <div className="absolute inset-0 animate-shimmer opacity-30" />
        </div>
        
        <div className="p-3 text-center">
          <CountdownTimer deadline={deadline} />
        </div>
      </div>
    </motion.div>
  );
};

const CollectibleCard = ({
  id,
  title,
  imageUrl,
  rarity,
  variant = 'comum',
  eventDate,
  preacher,
  theme,
  isRedeemed,
  redemptionDeadline,
  onClick,
}: CollectibleCardProps) => {
  const config = rarityConfig[rarity];
  const variantStyle = variantConfig[variant];
  const VariantIcon = variantStyle.icon;

  if (!isRedeemed) {
    return <MysteryCard deadline={redemptionDeadline} onClick={onClick} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      layoutId={`card-${id}`}
      className="w-full"
    >
      <Tilt
        tiltMaxAngleX={15}
        tiltMaxAngleY={15}
        perspective={900}
        scale={1.08}
        transitionSpeed={400}
        gyroscope={true}
        className="cursor-pointer w-full"
      >
        <div
          className={cn(
            "rounded-xl p-1 transition-all duration-300 w-full",
            config.borderClass,
            variant === 'reliquia' && 'card-reliquia',
            variant === 'holografica' && 'card-holografica',
            variant === 'edicao_diamante' && 'card-diamante'
          )}
          onClick={onClick}
        >
          {/* Card inner */}
          <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-card">
            {/* Card image */}
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
            
            {/* Variant overlay */}
            {variant !== 'comum' && (
              <div className={cn("absolute inset-0 pointer-events-none", variantStyle.overlayClass)} />
            )}
            
            {/* Holographic overlay for legendary */}
            {rarity === 'lendario' && (
              <div className="absolute inset-0 holographic pointer-events-none" />
            )}

            {/* Gradient overlay */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80"
            )} />

            {/* Variant badge */}
            {variant !== 'comum' && (
              <div className="absolute top-2 left-2">
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg",
                  variantStyle.badgeClass
                )}>
                  {VariantIcon && <VariantIcon className="w-3 h-3" />}
                  {variantStyle.label}
                </span>
              </div>
            )}

            {/* Rarity badge */}
            <div className="absolute top-2 right-2">
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-semibold backdrop-blur-sm",
                `bg-gradient-to-r ${config.bgGradient}`,
                config.textClass
              )}>
                {config.label}
              </span>
            </div>

            {/* Card info */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="font-display text-sm text-foreground mb-1 line-clamp-2">
                <span>{title}</span><br/>
              </h3>
              <h3 className="font-display text-sm text-foreground mb-1 line-clamp-2">
                <span className='font-bold'>Tema: {theme}</span>
              </h3>
              {preacher && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  Pregador: {preacher}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {eventDate.split('-').reverse().join('/')}
              </p>
            </div>
          </div>
        </div>
      </Tilt>
    </motion.div>
  );
};

export default CollectibleCard;

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star } from 'lucide-react';
import Tilt from 'react-parallax-tilt';

interface CardRevealAnimationProps {
  isOpen: boolean;
  onComplete: () => void;
  cardImage: string;
  cardTitle: string;
  rarity: string;
}

const CardRevealAnimation = ({
  isOpen,
  onComplete,
  cardImage,
  cardTitle,
  rarity,
}: CardRevealAnimationProps) => {
  const [stage, setStage] = useState<'pack' | 'opening' | 'reveal' | 'done'>('pack');

  useEffect(() => {
    if (isOpen) {
      setStage('pack');
      const timer1 = setTimeout(() => setStage('opening'), 500);
      const timer2 = setTimeout(() => setStage('reveal'), 1500);
      const timer3 = setTimeout(() => setStage('done'), 3000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isOpen]);

  const getRarityConfig = (rarity: string) => {
    switch (rarity) {
      case 'lendario':
        return {
          gradient: 'from-yellow-500 via-amber-300 to-yellow-600',
          glow: 'shadow-[0_0_80px_30px_rgba(234,179,8,0.6)]',
          particles: 'bg-yellow-400',
          border: 'border-yellow-400',
          label: 'LENDÁRIO',
        };
      case 'epico':
        return {
          gradient: 'from-purple-600 via-fuchsia-400 to-purple-700',
          glow: 'shadow-[0_0_60px_20px_rgba(168,85,247,0.5)]',
          particles: 'bg-purple-400',
          border: 'border-purple-400',
          label: 'ÉPICO',
        };
      case 'raro':
        return {
          gradient: 'from-blue-500 via-cyan-300 to-blue-600',
          glow: 'shadow-[0_0_40px_15px_rgba(59,130,246,0.4)]',
          particles: 'bg-blue-400',
          border: 'border-blue-400',
          label: 'RARO',
        };
      default:
        return {
          gradient: 'from-gray-400 via-slate-300 to-gray-500',
          glow: 'shadow-[0_0_20px_10px_rgba(148,163,184,0.3)]',
          particles: 'bg-gray-400',
          border: 'border-gray-400',
          label: 'COMUM',
        };
    }
  };

  const config = getRarityConfig(rarity);

  const generateParticles = (count: number) => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: Math.random() * 400 - 200,
      y: Math.random() * 400 - 200,
      delay: Math.random() * 0.5,
      scale: Math.random() * 0.5 + 0.5,
      rotate: Math.random() * 360,
    }));
  };

  const particles = generateParticles(rarity === 'lendario' ? 30 : rarity === 'epico' ? 20 : 10);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
        onClick={stage === 'done' ? onComplete : undefined}
      >
        {/* Background glow effect */}
        <motion.div
          className={`absolute w-96 h-96 rounded-full blur-3xl bg-gradient-to-r ${config.gradient} opacity-0`}
          animate={{
            opacity: stage === 'reveal' || stage === 'done' ? 0.4 : 0,
            scale: stage === 'reveal' || stage === 'done' ? 1.5 : 1,
          }}
          transition={{ duration: 0.8 }}
        />

        {/* Particles */}
        <AnimatePresence>
          {(stage === 'opening' || stage === 'reveal') && (
            <>
              {particles.map((particle) => (
                <motion.div
                  key={particle.id}
                  className={`absolute w-3 h-3 rounded-full ${config.particles}`}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                  animate={{
                    x: particle.x,
                    y: particle.y,
                    opacity: [1, 1, 0],
                    scale: [0, particle.scale, 0],
                    rotate: particle.rotate,
                  }}
                  transition={{
                    duration: 1.2,
                    delay: particle.delay,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Sparkle bursts */}
        {stage === 'reveal' && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`sparkle-${i}`}
                className="absolute"
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  x: Math.cos((i * Math.PI * 2) / 8) * 150,
                  y: Math.sin((i * Math.PI * 2) / 8) * 150,
                }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.05 }}
              >
                <Star className={`w-6 h-6 ${config.particles.replace('bg-', 'text-')}`} fill="currentColor" />
              </motion.div>
            ))}
          </>
        )}

        {/* Pack / Card container */}
        <div className="relative flex flex-col items-center justify-center">
          {/* Pack envelope (back) */}
          <motion.div
            className="w-64 h-80"
            initial={{ rotateY: 0 }}
            animate={{
              rotateY: stage === 'pack' ? 0 : 180,
              opacity: stage === 'reveal' || stage === 'done' ? 0 : 1,
            }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
            style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
          >
            <div className={`w-full h-full rounded-2xl bg-gradient-to-br ${config.gradient} p-1`}>
              <div className="w-full h-full rounded-xl bg-background/90 flex flex-col items-center justify-center gap-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Sparkles className="w-16 h-16 text-primary" />
                </motion.div>
                <p className="text-lg font-bold text-foreground">Novo Card!</p>
                <p className="text-sm text-muted-foreground">Toque para abrir</p>
              </div>
            </div>
          </motion.div>

          {/* Opening animation - pack splitting */}
          <motion.div
            className="absolute w-64 h-80 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{
              opacity: stage === 'opening' ? 1 : 0,
            }}
          >
            {/* Top half */}
            <motion.div
              className={`absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl bg-gradient-to-br ${config.gradient} origin-bottom overflow-hidden`}
              animate={{
                rotateX: stage === 'opening' || stage === 'reveal' || stage === 'done' ? -90 : 0,
                opacity: stage === 'reveal' || stage === 'done' ? 0 : 1,
              }}
              transition={{ duration: 0.5, delay: 0.3 }}
            />
            {/* Bottom half */}
            <motion.div
              className={`absolute bottom-0 left-0 right-0 h-1/2 rounded-b-2xl bg-gradient-to-br ${config.gradient} origin-top overflow-hidden`}
              animate={{
                rotateX: stage === 'opening' || stage === 'reveal' || stage === 'done' ? 90 : 0,
                opacity: stage === 'reveal' || stage === 'done' ? 0 : 1,
              }}
              transition={{ duration: 0.5, delay: 0.3 }}
            />
          </motion.div>

          {/* Revealed card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotateY: 180 }}
            animate={{
              opacity: stage === 'reveal' || stage === 'done' ? 1 : 0,
              scale: stage === 'reveal' || stage === 'done' ? 1 : 0.5,
              rotateY: stage === 'reveal' || stage === 'done' ? 0 : 180,
            }}
            transition={{
              duration: 0.8,
              type: 'spring',
              stiffness: 100,
              damping: 15,
            }}
          >
            <Tilt
              tiltMaxAngleX={15}
              tiltMaxAngleY={15}
              perspective={1000}
              scale={1.05}
              transitionSpeed={400}
              className="cursor-pointer"
            >
              <div className={`relative w-64 h-80 rounded-2xl ${config.glow}`}>
                {/* Animated border */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${config.gradient} p-[3px] animate-pulse`}>
                  <div className="w-full h-full rounded-2xl overflow-hidden">
                    <img
                      src={cardImage}
                      alt={cardTitle}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 rounded-2xl overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                    animate={{
                      x: ['-200%', '200%'],
                    }}
                    transition={{
                      duration: 1.5,
                      delay: 0.5,
                      repeat: Infinity,
                      repeatDelay: 3,
                    }}
                  />
                </motion.div>

                {/* Rarity badge */}
                <motion.div
                  className={`absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r ${config.gradient} text-background font-bold text-sm whitespace-nowrap`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  {config.label}
                </motion.div>
              </div>
            </Tilt>
          </motion.div>

          {/* Card title */}
          <motion.div
            className="mt-8 text-center w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: stage === 'done' ? 1 : 0,
              y: stage === 'done' ? 0 : 20,
            }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-xl font-bold text-foreground mb-2">{cardTitle}</h3>
            <p className="text-sm text-muted-foreground">Toque para continuar</p>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CardRevealAnimation;
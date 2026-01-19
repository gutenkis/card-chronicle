import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

const QRScanner = ({ onScan, onClose }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    if (!containerRef.current) return;

    try {
      setError(null);
      setIsScanning(true);

      const html5QrCode = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          // Format code to YYY-ZZZ if needed
          let formattedCode = decodedText.toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (formattedCode.length === 6) {
            formattedCode = formattedCode.slice(0, 3) + '-' + formattedCode.slice(3);
          }
          
          onScan(formattedCode);
          stopScanner();
        },
        () => {
          // QR code not detected - this is normal, ignore
        }
      );

      setHasPermission(true);
    } catch (err: any) {
      console.error('Scanner error:', err);
      setIsScanning(false);

      if (err.toString().includes('NotAllowedError') || err.toString().includes('Permission')) {
        setHasPermission(false);
        setError('Acesso à câmera negado. Por favor, permita o acesso nas configurações do navegador.');
      } else if (err.toString().includes('NotFoundError')) {
        setError('Nenhuma câmera encontrada no dispositivo.');
      } else {
        setError('Erro ao iniciar a câmera. Tente novamente.');
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.log('Scanner already stopped');
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
    >
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Escanear QRCode
          </h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scanner Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <AnimatePresence mode="wait">
            {error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center space-y-4 p-6"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
                  <CameraOff className="w-8 h-8 text-destructive" />
                </div>
                <p className="text-muted-foreground max-w-sm">{error}</p>
                <Button onClick={startScanner} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Tentar Novamente
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="scanner"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-sm space-y-4"
              >
                {/* Scanner Container */}
                <div
                  ref={containerRef}
                  className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black"
                >
                  <div id="qr-reader" className="w-full h-full" />
                  
                  {/* Corner Decorations */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Top Left */}
                    <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                    {/* Top Right */}
                    <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                    {/* Bottom Left */}
                    <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                    {/* Bottom Right */}
                    <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-lg" />
                    
                    {/* Scanning Line Animation */}
                    {isScanning && (
                      <motion.div
                        className="absolute left-4 right-4 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
                        initial={{ top: '20%' }}
                        animate={{ top: ['20%', '80%', '20%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      />
                    )}
                  </div>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Posicione o QRCode dentro do quadrado para escanear automaticamente
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50">
          <Button variant="outline" onClick={handleClose} className="w-full">
            Digitar código manualmente
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default QRScanner;

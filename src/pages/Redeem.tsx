import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Gift, Loader2, CheckCircle, XCircle, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import ProtectedRoute from "@/components/layout/ProtectedRoute";

type RedeemStatus = "idle" | "loading" | "success" | "error" | "expired" | "already_redeemed";

interface RedeemResult {
  status: RedeemStatus;
  message: string;
  cardTitle?: string;
  cardImage?: string;
  rarity?: string;
}

const RedeemPage = () => {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<RedeemResult>({ status: "idle", message: "" });
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Format input as YYY-ZZZ
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    
    if (value.length > 6) {
      value = value.slice(0, 6);
    }
    
    if (value.length > 3) {
      value = value.slice(0, 3) + "-" + value.slice(3);
    }
    
    setCode(value);
  };

  const handleRedeem = async () => {
    if (code.length !== 7) {
      toast({
        title: "Código inválido",
        description: "O código deve estar no formato YYY-ZZZ",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Não autenticado",
        description: "Faça login para resgatar cards",
        variant: "destructive",
      });
      return;
    }

    setResult({ status: "loading", message: "Verificando código..." });

    try {
      // Find event by redemption code
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("redemption_code", code)
        .maybeSingle();

      if (eventError) throw eventError;

      if (!event) {
        setResult({
          status: "error",
          message: "Código não encontrado. Verifique e tente novamente.",
        });
        return;
      }

      // Check if redemption deadline has passed
      const now = new Date();
      const deadline = new Date(event.redemption_deadline);
      
      if (now > deadline) {
        setResult({
          status: "expired",
          message: "O prazo de resgate para este card expirou.",
        });
        return;
      }

      // Check if user already redeemed this card
      const { data: existingCard, error: checkError } = await supabase
        .from("user_cards")
        .select("id")
        .eq("user_id", user.id)
        .eq("event_id", event.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingCard) {
        setResult({
          status: "already_redeemed",
          message: "Você já resgatou este card!",
          cardTitle: event.title,
          cardImage: event.card_image_url,
          rarity: event.rarity,
        });
        return;
      }

      // Redeem the card
      const { error: redeemError } = await supabase
        .from("user_cards")
        .insert({
          user_id: user.id,
          event_id: event.id,
        });

      if (redeemError) throw redeemError;

      setResult({
        status: "success",
        message: "Card resgatado com sucesso!",
        cardTitle: event.title,
        cardImage: event.card_image_url,
        rarity: event.rarity,
      });

      toast({
        title: "🎉 Card Resgatado!",
        description: `Você adicionou "${event.title}" à sua coleção!`,
      });

    } catch (error) {
      console.error("Redeem error:", error);
      setResult({
        status: "error",
        message: "Erro ao resgatar. Tente novamente.",
      });
    }
  };

  const resetForm = () => {
    setCode("");
    setResult({ status: "idle", message: "" });
  };

  const getStatusIcon = () => {
    switch (result.status) {
      case "loading":
        return <Loader2 className="h-16 w-16 text-primary animate-spin" />;
      case "success":
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case "error":
        return <XCircle className="h-16 w-16 text-destructive" />;
      case "expired":
        return <Clock className="h-16 w-16 text-yellow-500" />;
      case "already_redeemed":
        return <Sparkles className="h-16 w-16 text-primary" />;
      default:
        return null;
    }
  };

  const getRarityGradient = (rarity: string) => {
    switch (rarity) {
      case "lendario":
        return "from-rarity-legendary via-yellow-400 to-rarity-legendary";
      case "epico":
        return "from-rarity-epic via-purple-400 to-rarity-epic";
      case "raro":
        return "from-rarity-rare via-blue-400 to-rarity-rare";
      default:
        return "from-rarity-common via-gray-400 to-rarity-common";
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="mx-auto mb-4 p-4 rounded-full bg-primary/10"
                >
                  <Gift className="h-8 w-8 text-primary" />
                </motion.div>
                <CardTitle className="text-2xl">Resgatar Card</CardTitle>
                <CardDescription>
                  Digite o código do evento para adicionar o card à sua coleção
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <AnimatePresence mode="wait">
                  {result.status === "idle" || result.status === "loading" ? (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                          Código de Resgate
                        </label>
                        <Input
                          value={code}
                          onChange={handleCodeChange}
                          placeholder="ABC-123"
                          className="text-center text-2xl font-mono tracking-widest h-14 bg-background/50"
                          maxLength={7}
                          disabled={result.status === "loading"}
                        />
                        <p className="text-xs text-muted-foreground text-center">
                          Formato: YYY-ZZZ (3 letras/números - 3 letras/números)
                        </p>
                      </div>

                      <Button
                        onClick={handleRedeem}
                        disabled={code.length !== 7 || result.status === "loading"}
                        className="w-full h-12 text-lg"
                      >
                        {result.status === "loading" ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          <>
                            <Gift className="mr-2 h-5 w-5" />
                            Resgatar Card
                          </>
                        )}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="text-center space-y-4"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 10 }}
                        className="flex justify-center"
                      >
                        {getStatusIcon()}
                      </motion.div>

                      <p className="text-lg font-medium">{result.message}</p>

                      {(result.status === "success" || result.status === "already_redeemed") && result.cardImage && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="relative"
                        >
                          <div className={`absolute inset-0 bg-gradient-to-r ${getRarityGradient(result.rarity || "comum")} rounded-xl blur-xl opacity-50`} />
                          <img
                            src={result.cardImage}
                            alt={result.cardTitle}
                            className="relative w-48 h-64 mx-auto object-cover rounded-xl shadow-2xl"
                          />
                          <p className="mt-2 font-semibold text-foreground">{result.cardTitle}</p>
                        </motion.div>
                      )}

                      <div className="flex gap-3 pt-4">
                        <Button
                          variant="outline"
                          onClick={resetForm}
                          className="flex-1"
                        >
                          Novo Código
                        </Button>
                        <Button
                          onClick={() => navigate("/")}
                          className="flex-1"
                        >
                          Ver Coleção
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Instructions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground"
            >
              <h4 className="font-semibold text-foreground mb-2">Como resgatar:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Obtenha o código no evento ou escaneie o QRCode</li>
                <li>Digite o código no formato YYY-ZZZ</li>
                <li>Clique em "Resgatar Card"</li>
                <li>O card será adicionado à sua coleção!</li>
              </ol>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default RedeemPage;

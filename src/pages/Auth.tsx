import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Mail, Lock, User, ArrowLeft } from "lucide-react";
import { z } from "zod";
import logo from "@/assets/logo.png";

export default function Auth() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [view, setView] = useState<"auth" | "forgot">("auth");
  const [forgotEmail, setForgotEmail] = useState("");
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const emailSchema = z.string().email(t('auth.invalid_email'));
  const passwordSchema = z.string().min(6, t('auth.password_min'));

  useEffect(() => {
    if (user) {
      navigate("/timer");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: t('auth.validation_error'),
          description: err.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      toast({
        title: t('auth.login_error'),
        description: error.message === "Invalid login credentials" 
          ? t('auth.wrong_credentials')
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t('auth.welcome_back'),
        description: t('auth.login_success'),
      });
      navigate("/timer");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: t('auth.validation_error'),
          description: err.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    const { error, needsConfirmation } = await signUp(signupEmail, signupPassword, signupName);
    setIsLoading(false);

    if (error) {
      let message = error.message;
      const lower = error.message.toLowerCase();
      if (lower.includes("already registered") || lower.includes("already exists")) {
        message = t('auth.email_registered');
      } else if (lower.includes("rate limit") || lower.includes("too many")) {
        message = "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
      } else if (lower.includes("invalid") && lower.includes("email")) {
        message = "Este e-mail não foi aceito. Use um e-mail real e válido (ex: seu nome em um provedor que você usa).";
      }
      toast({
        title: t('auth.signup_error'),
        description: message,
        variant: "destructive",
      });
    } else if (needsConfirmation) {
      toast({
        title: t('auth.account_created'),
        description: "Confirme seu e-mail para entrar. Verifique sua caixa de entrada (e a pasta de spam).",
      });
    } else {
      toast({
        title: t('auth.account_created'),
        description: t('auth.start_using'),
      });
      navigate("/timer");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(forgotEmail);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: t('auth.validation_error'),
          description: err.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          email: forgotEmail,
          type: 'recovery',
          redirect_to: `${window.location.origin}/reset-password`,
        },
      });

      if (error) throw error;

      toast({
        title: t('auth.reset_email_sent'),
        description: t('auth.reset_email_sent_desc'),
      });
      setView("auth");
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('common.error'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-20">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Language switcher */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher variant="ghost" />
      </div>
      
      <div className="w-full max-w-md animate-scale-in">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8 hover:opacity-80 transition-opacity">
          <img src={logo} alt="TimeZoni" className="h-14 w-14" />
          <h1 className="text-3xl font-bold tracking-tight">TimeZoni</h1>
        </Link>

        {view === "forgot" ? (
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle>{t('auth.reset_password')}</CardTitle>
              <CardDescription>{t('auth.reset_password_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t('common.loading') : t('auth.send_reset_link')}
                </Button>

                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={() => setView("auth")}
                >
                  {t('auth.back_to_login')}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 shadow-lg">
            <Tabs defaultValue="login" className="w-full">
              <CardHeader className="pb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
                  <TabsTrigger value="signup">{t('auth.signup')}</TabsTrigger>
                </TabsList>
              </CardHeader>
              
              <CardContent>
                <TabsContent value="login" className="mt-0">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <CardDescription className="text-center mb-4">
                      {t('auth.login_title')}
                    </CardDescription>
                    
                    <div className="space-y-2">
                      <Label htmlFor="login-email">{t('auth.email')}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="login-password">{t('auth.password')}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="text-right">
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 text-xs text-muted-foreground"
                        onClick={() => setView("forgot")}
                      >
                        {t('auth.forgot_password')}
                      </Button>
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? t('auth.logging_in') : t('auth.login')}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup" className="mt-0">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <CardDescription className="text-center mb-4">
                      {t('auth.signup_title')}
                    </CardDescription>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">{t('auth.name_optional')}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder={t('auth.name')}
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">{t('auth.email')}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">{t('auth.password')}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder={t('auth.password_min')}
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? t('auth.creating') : t('auth.signup')}
                    </Button>
                  </form>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        )}
      </div>
    </div>
  );
}

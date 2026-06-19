import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Briefcase, Eye, EyeOff, ArrowRight, ShieldCheck, TrendingUp, BarChart3, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { maskCpf } from '@/lib/utils';
import { toast } from 'sonner';

export default function LoginPage() {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estados para suporte a Múltiplos Perfis por CPF
  const [isMultiProfile, setIsMultiProfile] = useState(false);
  const [profilesList, setProfilesList] = useState<any[]>([]);
  const [tempToken, setTempToken] = useState('');

  const { login, selectProfile } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(cpf, password);
    setLoading(false);
    if (result.success) {
      if (result.multipleProfiles && result.profiles && result.tempToken) {
        setProfilesList(result.profiles);
        setTempToken(result.tempToken);
        setIsMultiProfile(true);
      } else {
        router.push('/dashboard');
      }
    } else {
      toast.error(result.message || 'Erro ao fazer login. Verifique seu CPF e Senha.');
    }
  };

  const handleProfileSelect = async (userId: string) => {
    setLoading(true);
    const result = await selectProfile(userId, tempToken);
    setLoading(false);
    if (!result.success) {
      toast.error(result.message || 'Erro ao carregar o perfil de acesso.');
    }
  };

  return (
    <div className="dark min-h-screen flex font-sans bg-[#02040a]">
      {/* Left panel - Commercial & Benefits */}
      <div className="text-slate-100 hidden lg:flex lg:w-1/2 bg-[#030712] bg-[linear-gradient(to_bottom_right,rgba(6,182,212,0.08),transparent_40%),linear-gradient(to_top_left,rgba(16,185,129,0.05),transparent_35%)] relative overflow-hidden flex-col justify-between p-16 border-r border-slate-900/50">
        
        {/* Tech Grid Background Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

        {/* Top Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative bg-slate-950 border border-slate-800/80 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <Image src="/logo.png?v=4" alt="Sales Spark Logo" width={40} height={40} className="object-contain" unoptimized />
            </div>
            <span className="text-xl font-bold text-slate-100 tracking-tight">Sales Spark</span>
          </div>
          <p className="text-xs text-slate-400 pl-13">Plataforma Comercial Inteligente</p>
        </div>

        {/* Commercial Pitch & Importance of CRM */}
        <div className="relative z-10 space-y-8 my-auto">
          <div className="space-y-4">
            <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs px-2.5 py-1">
              ⚡ CRM de Alta Performance
            </Badge>
            <h2 className="text-4xl font-extrabold text-slate-100 leading-tight tracking-tight">
              O motor inteligente para<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400">
                sua força de vendas.
              </span>
            </h2>
            <p className="text-slate-400 text-base max-w-md leading-relaxed">
              Planilhas perdidas e falta de acompanhamento de campo custam caro. O Sales Spark CRM centraliza leads, audita visitas e automatiza seus processos de ponta a ponta.
            </p>
          </div>

          {/* Key Benefits Grid */}
          <div className="space-y-4 max-w-lg">
            {[
              {
                icon: <BarChart3 className="w-4 h-4 text-cyan-400" />,
                title: 'Centralização de Dados 360°',
                desc: 'Todo o histórico de leads, interações e visitas unificados para decisões rápidas e embasadas.'
              },
              {
                icon: <Users className="w-4 h-4 text-teal-400" />,
                title: 'Distribuição Inteligente de Leads',
                desc: 'Distribua leads automaticamente para o vendedor mais qualificado com base na região e filial ativa.'
              },
              {
                icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
                title: 'Auditoria de Visitas em Campo',
                desc: 'Acompanhamento geolocalizado de visitas externas, com fluxos de autorizações seguros.'
              }
            ].map((benefit, idx) => (
              <div key={idx} className="flex gap-4 p-4 rounded-xl bg-slate-900/20 border border-slate-800/40 backdrop-blur hover:bg-slate-900/40 hover:border-cyan-500/30 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
                <div className="w-8 h-8 rounded-lg bg-slate-950/60 flex items-center justify-center shrink-0 border border-slate-800/60">
                  {benefit.icon}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{benefit.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Social Proof Statistics */}
          <div className="flex gap-8 pt-4 border-t border-slate-800/50">
            {[
              { value: '98%', label: 'Leads Atendidos' },
              { value: '+34%', label: 'Taxa de Conversão' },
              { value: '2.5x', label: 'Mais Produtividade' },
            ].map((stat, idx) => (
              <div key={idx}>
                <p className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">{stat.value}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom copyright / brand promise */}
        <div className="relative z-10 text-[10px] text-slate-500 flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> Acelerando resultados comerciais em tempo real.
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -bottom-48 -right-48 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#02040a]">
        <div className="w-full max-w-md space-y-8 bg-slate-900/20 border border-slate-800/40 p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.3)] backdrop-blur-md">
          
          {/* Logo visible only on Mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-slate-950 border border-slate-800 shadow relative">
              <Image src="/logo.png?v=4" alt="Sales Spark Logo" width={40} height={40} className="object-contain" unoptimized />
            </div>
            <span className="text-xl font-bold text-slate-100">Sales Spark CRM</span>
          </div>

          {!isMultiProfile ? (
            <>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Acesso ao Painel</h1>
                <p className="text-sm text-slate-400 mt-2">Entre com suas credenciais de acesso.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">CPF do Usuário</label>
                  <Input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(maskCpf(e.target.value))}
                    className="h-11 bg-slate-950/50 border-slate-800 focus:border-cyan-500/50 focus:ring-cyan-500/20 text-slate-100 placeholder:text-slate-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-300">Senha</label>
                    <button type="button" className="text-xs text-cyan-400 hover:underline transition-all">
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 bg-slate-950/50 border-slate-800 pr-10 focus:border-cyan-500/50 focus:ring-cyan-500/20 text-slate-100 placeholder:text-slate-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-extrabold text-sm shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_25px_rgba(6,182,212,0.25)] transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01] rounded-xl"
                  disabled={loading}
                >
                  {loading ? 'Validando...' : 'Entrar no sistema'}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>
            </>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-cyan-400 animate-pulse" />
                  Selecione seu Perfil
                </h2>
                <p className="text-sm text-slate-400 mt-2">
                  Identificamos mais de uma função ou empresa vinculada ao seu CPF. Escolha qual deseja visualizar:
                </p>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {profilesList.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleProfileSelect(profile.id)}
                    disabled={loading}
                    className="w-full text-left p-4 rounded-xl border border-slate-800/60 bg-slate-900/30 hover:bg-slate-900/60 focus:border-cyan-500 transition-all flex items-center justify-between group shadow-sm hover:shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-950/80 flex items-center justify-center border border-slate-800/80 shrink-0 text-cyan-400">
                        {profile.role === 'SUPERADMIN' ? (
                          <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        ) : profile.role === 'ADMIN' ? (
                          <Briefcase className="w-5 h-5 text-cyan-400" />
                        ) : profile.role === 'GERENTE' || profile.role === 'SUPERVISOR' ? (
                          <Users className="w-5 h-5 text-teal-400" />
                        ) : (
                          <Users className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-200 truncate group-hover:text-cyan-400 transition-colors">
                          {profile.companyName}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">
                          {profile.role === 'SUPERADMIN' ? 'Super Administrador Master' :
                           profile.role === 'ADMIN' ? 'Administrador de Empresa' :
                           profile.role === 'GERENTE' ? 'Gerente Geral' :
                           profile.role === 'SUPERVISOR' ? 'Supervisor Regional' : 'Vendedor Comercial'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 transition-all rounded-xl"
                onClick={() => {
                  setIsMultiProfile(false);
                  setProfilesList([]);
                  setTempToken('');
                }}
                disabled={loading}
              >
                Voltar e Digitar Credenciais
              </Button>
            </div>
          )}

          <p className="text-center text-xs text-slate-500">
            Ao entrar, você concorda com os{' '}
            <a href="#" className="text-cyan-400 hover:underline">Termos de Uso</a>
            {' '}e{' '}
            <a href="#" className="text-cyan-400 hover:underline">Políticas</a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Subcomponent helper for Badge (if needed locally, or using pre-defined shadcn badge)
function Badge({ children, className, variant }: { children: React.ReactNode; className?: string; variant?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </span>
  );
}

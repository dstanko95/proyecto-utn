import React, { useState } from 'react';
import { BrainCircuit, Lock, Mail, User, Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../api';

interface AuthViewProps {
  onAuthSuccess: (user: any) => void;
}

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa tu correo electrónico y contraseña.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.login(email.trim(), password);
      onAuthSuccess(response.user);
    } catch (err: any) {
      console.error('Error al iniciar sesión:', err);
      setErrorMessage(err.message || 'Credenciales inválidas. Por favor verifica tu correo y contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !firstName.trim() || !lastName.trim()) {
      setErrorMessage('Por favor completa todos los campos obligatorios.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.register(
        email.trim(),
        password,
        firstName.trim(),
        lastName.trim()
      );
      onAuthSuccess(response.user);
    } catch (err: any) {
      console.error('Error al registrar usuario:', err);
      setErrorMessage(err.message || 'No se pudo crear la cuenta. Es posible que el correo ya esté en uso.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-center items-center p-4 font-sans text-slate-800 antialiased">
      {/* Container Card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden animate-scale-in">
        
        {/* Brand Header */}
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/20 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />

          <div className="inline-flex p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-md mb-3">
            <BrainCircuit className="w-8 h-8 text-blue-300" />
          </div>
          
          <h1 className="text-2xl font-bold tracking-tight leading-tight">ReqRefiner</h1>
          <p className="text-xs text-blue-200/90 mt-1 font-medium">
            Plataforma de Refinamiento de Requerimientos con IA
          </p>

          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-[11px] font-semibold text-blue-100 border border-white/15">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Acceso Privado & Encriptación BCrypt</span>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60 font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60 font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Form Container */}
        <div className="p-8">
          {errorMessage && (
            <div className="mb-5 rounded-xl bg-red-50 p-3.5 border border-red-200/80 text-xs text-red-700 font-medium leading-relaxed animate-fade-in">
              {errorMessage}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu.correo@ejemplo.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-200/80 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar al Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Nombre
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Juan"
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Apellido
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Pérez"
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="juan.perez@ejemplo.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Confirmar Contraseña
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-200/80 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Creando cuenta...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Registrarse e Ingresar</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Card Footer */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            ReqRefiner • Tus proyectos permanecen aislados y protegidos en tu cuenta.
          </p>
        </div>
      </div>
    </div>
  );
}

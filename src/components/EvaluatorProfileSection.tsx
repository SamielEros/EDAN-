import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  Radio,
  Phone,
  FileCheck2,
  Save,
  CheckCircle2,
  Smartphone,
  Tablet,
  Laptop,
  Maximize2,
  Sliders,
  HelpCircle,
  Building,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { EvaluatorProfile, ContingencyEvent } from '../types/edan';

// Brigadas y Evaluadores preconfigurados de la Delegación Cruz Roja Tepatitlán
const PRECONFIGURED_EVALUATORS: EvaluatorProfile[] = [
  {
    id: 'EVAL-01',
    name: 'TSU Roberto Méndez Cruz',
    credential: 'CRM-JAL-TEPA-4421',
    radioCallsign: 'Alpha-Tepa-1',
    phone: '378-782-1100',
    role: 'Evaluador de Campo',
  },
  {
    id: 'EVAL-02',
    name: 'Paramédico Laura Valdivia Estrada',
    credential: 'CRM-JAL-TEPA-3890',
    radioCallsign: 'Bravo-Tepa-2',
    phone: '378-782-2244',
    role: 'Evaluador de Campo',
  },
  {
    id: 'EVAL-03',
    name: 'Ing. Carlos Gutiérrez Lomelí',
    credential: 'PC-JAL-TEPA-1044',
    radioCallsign: 'Charlie-Tepa-3',
    phone: '378-781-5588',
    role: 'Evaluador de Campo',
  },
  {
    id: 'EVAL-04',
    name: 'Dra. María Elena Casillas',
    credential: 'CRM-JAL-TEPA-5102',
    radioCallsign: 'Delta-Salud-4',
    phone: '378-782-9900',
    role: 'Logística y Suministros',
  },
];

interface EvaluatorProfileSectionProps {
  currentEvaluator: EvaluatorProfile;
  onUpdateEvaluator: (profile: EvaluatorProfile) => void;
  contingency: ContingencyEvent;
  deviceViewMode: 'auto' | 'mobile' | 'tablet' | 'desktop';
  onSetDeviceViewMode: (mode: 'auto' | 'mobile' | 'tablet' | 'desktop') => void;
}

export const EvaluatorProfileSection: React.FC<EvaluatorProfileSectionProps> = ({
  currentEvaluator,
  onUpdateEvaluator,
  contingency,
  deviceViewMode,
  onSetDeviceViewMode,
}) => {
  const [evalName, setEvalName] = useState(currentEvaluator.name);
  const [evalCredential, setEvalCredential] = useState(currentEvaluator.credential);
  const [evalCallsign, setEvalCallsign] = useState(currentEvaluator.radioCallsign);
  const [evalPhone, setEvalPhone] = useState(currentEvaluator.phone || '378-782-1100');
  const [evalRole, setEvalRole] = useState(currentEvaluator.role);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: EvaluatorProfile = {
      ...currentEvaluator,
      name: evalName.trim() || 'Evaluador de Campo EDAN',
      credential: evalCredential.trim() || 'CRM-TEPA-VOL',
      radioCallsign: evalCallsign.trim() || 'Unidad-Tepa-Móvil',
      phone: evalPhone.trim() || '378-782-1100',
      role: evalRole,
    };
    onUpdateEvaluator(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto w-full transition-colors duration-150">
      {/* Banner / Header with Screen Adaptor Quick Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/60 border border-red-200 dark:border-red-700/80 flex items-center justify-center text-red-600 dark:text-white shadow-sm shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
              Perfil Oficial del Evaluador EDAN
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configuración y credencial de brigadista para firma técnica de reportes y enlace de campo
            </p>
          </div>
        </div>

        {/* Screen Adapter Widget (Tablet, Smartphone, PC) */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 px-2 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <span className="hidden sm:inline">Adaptador:</span>
          </span>
          <button
            type="button"
            onClick={() => onSetDeviceViewMode('mobile')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
              deviceViewMode === 'mobile'
                ? 'bg-red-700 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
            title="Vista compacta Smartphone (380px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Móvil</span>
          </button>
          <button
            type="button"
            onClick={() => onSetDeviceViewMode('tablet')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
              deviceViewMode === 'tablet'
                ? 'bg-red-700 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
            title="Vista media Tablet (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => onSetDeviceViewMode('desktop')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
              deviceViewMode === 'desktop'
                ? 'bg-red-700 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
            title="Vista completa PC / Escritorio (1024px+)"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>PC</span>
          </button>
          <button
            type="button"
            onClick={() => onSetDeviceViewMode('auto')}
            className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition ${
              deviceViewMode === 'auto'
                ? 'bg-slate-800 text-white dark:bg-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
            title="Ajuste 100% automático al ancho del dispositivo"
          >
            Auto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Dedicated Form - Clear, full-width, non-modal layout */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-red-600 dark:text-red-500" />
                <span>Datos de Identificación del Brigadista</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Todos los datos se reflejarán automáticamente en el membrete y las firmas de los informes PDF
              </p>
            </div>
            {savedSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 px-3 py-1 rounded-xl animate-bounce">
                <CheckCircle2 className="w-4 h-4" />
                ¡Perfil guardado!
              </span>
            )}
          </div>

          {/* Quick Evaluator Brigade Selector for Simultaneous Multi-User Field Operation */}
          <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                <span>Cambiar Rápidamente de Evaluador en Campo (Operación Simultánea):</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">4 Brigadas Activas</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRECONFIGURED_EVALUATORS.map((ev) => {
                const isActive = evalCredential === ev.credential || currentEvaluator.credential === ev.credential;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => {
                      setEvalName(ev.name);
                      setEvalCredential(ev.credential);
                      setEvalCallsign(ev.radioCallsign);
                      setEvalPhone(ev.phone);
                      setEvalRole(ev.role);
                      onUpdateEvaluator(ev);
                      setSavedSuccess(true);
                      setTimeout(() => setSavedSuccess(false), 2000);
                    }}
                    className={`p-2.5 rounded-xl text-left border transition text-xs flex flex-col justify-between ${
                      isActive
                        ? 'bg-red-50 dark:bg-red-950/80 border-red-500 text-slate-900 dark:text-white shadow-sm ring-1 ring-red-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-[11px] truncate">{ev.name.split(' ')[0]} {ev.name.split(' ')[1] || ''}</div>
                    <div className="font-mono text-[9px] text-red-600 dark:text-red-400 truncate">{ev.radioCallsign}</div>
                    <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate">{ev.role}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
              Varios evaluadores pueden usar la app simultáneamente desde sus dispositivos para verificar distintos puntos del desastre y sincronizar todos los datos en el concentrado central.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nombre Completo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Nombre Completo del Evaluador: <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={evalName}
                  onChange={(e) => setEvalName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium"
                  placeholder="Ej. TSU Roberto Méndez Cruz"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Aparecerá como responsable técnico en la Evaluación Preliminar EDAN.
              </p>
            </div>

            {/* Credencial & Rol Operativo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Número de Credencial / Registro: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={evalCredential}
                  onChange={(e) => setEvalCredential(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-mono"
                  placeholder="Ej. CRM-JAL-TEPA-4421"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Rol Operativo en el Desastre: <span className="text-red-500">*</span>
                </label>
                <select
                  value={evalRole}
                  onChange={(e) => setEvalRole(e.target.value as EvaluatorProfile['role'])}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium"
                >
                  <option value="Evaluador de Campo">Evaluador de Campo</option>
                  <option value="Coordinador EDAN">Coordinador EDAN</option>
                  <option value="Enlace Operativo">Enlace Operativo</option>
                  <option value="Logística y Suministros">Logística y Suministros</option>
                </select>
              </div>
            </div>

            {/* Indicativo de Radio & Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Indicativo de Radio (Callsign VHF/UHF):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={evalCallsign}
                    onChange={(e) => setEvalCallsign(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-mono"
                    placeholder="Ej. Alpha-Tepa-1"
                  />
                  <Radio className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Teléfono de Contacto en Terreno:
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={evalPhone}
                    onChange={(e) => setEvalPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                    placeholder="Ej. 378-782-1100"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            {/* Institución / Delegación Read-only indicator */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>Institución: <strong>Cruz Roja Mexicana Delegación Tepatitlán de Morelos</strong></span>
              </div>
              {contingency.commandPostLocation && (
                <span className="font-mono text-[11px] text-slate-500 hidden sm:inline">
                  {contingency.commandPostLocation.lat.toFixed(4)}, {contingency.commandPostLocation.lng.toFixed(4)}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-900/40 transition active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Perfil del Evaluador</span>
              </button>
            </div>
          </form>
        </div>

        {/* Credential Card Live Preview & Screen Adapter Explainer */}
        <div className="space-y-5">
          {/* Visual Digital Credential Card */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-red-950 border border-slate-700/80 p-5 shadow-2xl relative overflow-hidden text-white">
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-red-600/10 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-700 flex items-center justify-center font-black text-xs text-white">
                  CRM
                </div>
                <div>
                  <div className="text-[10px] font-black text-red-400 tracking-wider">
                    CREDENCIAL OPERATIVA
                  </div>
                  <div className="text-xs font-bold text-white">Cruz Roja Tepatitlán</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-black uppercase">
                Activo
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Nombre</span>
                <span className="text-sm font-bold text-white">{evalName || 'Evaluador EDAN'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Credencial</span>
                  <span className="font-mono text-slate-200 font-bold">{evalCredential || 'CRM-TEPA'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Callsign Radio</span>
                  <span className="font-mono text-red-400 font-bold">{evalCallsign || 'Alpha-1'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Rol</span>
                  <span className="text-slate-200">{evalRole}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Contacto</span>
                  <span className="text-slate-200">{evalPhone}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>SISTEMA EDAN JALISCO</span>
              <span>VERIFICADO</span>
            </div>
          </div>

          {/* Screen Adaptor Guide Box */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs text-slate-700 dark:text-slate-300 shadow-sm">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Adaptador de Pantalla Operativo</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Puedes alternar entre los modos <strong>Móvil</strong>, <strong>Tablet</strong>, <strong>PC</strong> o <strong>Automático</strong> en cualquier momento. Esto simula y ajusta los contenedores y tamaños de letra para que ningún campo quede oculto ni recortado en pantallas pequeñas o grandes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

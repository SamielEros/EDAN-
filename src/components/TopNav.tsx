import React, { useState } from 'react';
import {
  ShieldAlert,
  Wifi,
  WifiOff,
  RefreshCw,
  Users,
  MapPin,
  FileText,
  Navigation,
  Package,
  Settings,
  Database,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Smartphone,
  Tablet,
  Laptop,
  Maximize2,
  Activity,
  Sliders,
} from 'lucide-react';
import { EvaluatorProfile, ContingencyEvent } from '../types/edan';
import { PWAInstallButton } from './PWAInstallButton';

export type AppTabType = 'map' | 'assessments' | 'needs' | 'routes' | 'matrix' | 'profile' | 'backup';
export type DeviceViewMode = 'auto' | 'mobile' | 'tablet' | 'desktop';

interface TopNavProps {
  currentTab: AppTabType;
  onSelectTab: (tab: AppTabType) => void;
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  pendingMutationsCount: number;
  onForceSync: () => void;
  currentEvaluator: EvaluatorProfile;
  onUpdateEvaluator: (profile: EvaluatorProfile) => void;
  contingency: ContingencyEvent;
  deviceViewMode: DeviceViewMode;
  onSetDeviceViewMode: (mode: DeviceViewMode) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  onSelectTab,
  isOnline,
  syncStatus,
  pendingMutationsCount,
  onForceSync,
  currentEvaluator,
  onUpdateEvaluator,
  contingency,
  deviceViewMode,
  onSetDeviceViewMode,
}) => {
  const [showScreenModeMenu, setShowScreenModeMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-xl">
      {/* Upper Main Brand Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand & Specialty */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-800 border border-red-500/80 flex items-center justify-center shadow-md shadow-red-900/40 shrink-0">
            <span className="text-white font-black text-xs sm:text-sm tracking-wider">EDAN</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-black text-white tracking-wide">
                EDAN TEPATITLÁN
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-800">
                CRUZ ROJA DELEGACIÓN TEPATITLÁN
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 hidden xs:block truncate max-w-xs md:max-w-md">
              {contingency.name}
            </p>
          </div>
        </div>

        {/* Right Tools & Screen Adaptor Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Screen Adaptor Selector Widget (Tablet, Smartphone, PC) */}
          <div className="relative">
            <div className="flex items-center gap-0.5 bg-slate-900/95 p-1 rounded-xl border border-slate-700 shadow-md">
              <button
                type="button"
                onClick={() => onSetDeviceViewMode('mobile')}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                  deviceViewMode === 'mobile'
                    ? 'bg-red-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Adaptador de pantalla: Smartphone / Móvil"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Móvil</span>
              </button>

              <button
                type="button"
                onClick={() => onSetDeviceViewMode('tablet')}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                  deviceViewMode === 'tablet'
                    ? 'bg-red-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Adaptador de pantalla: Tablet"
              >
                <Tablet className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Tablet</span>
              </button>

              <button
                type="button"
                onClick={() => onSetDeviceViewMode('desktop')}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                  deviceViewMode === 'desktop'
                    ? 'bg-red-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Adaptador de pantalla: PC / Escritorio"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span className="hidden md:inline">PC</span>
              </button>

              <button
                type="button"
                onClick={() => onSetDeviceViewMode('auto')}
                className={`px-1.5 py-1 rounded-lg text-[10px] font-bold transition ${
                  deviceViewMode === 'auto'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Ajuste de pantalla Automático"
              >
                Auto
              </button>
            </div>
          </div>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Online/Offline Status Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium transition ${
              !isOnline
                ? 'bg-amber-950/70 border-amber-800 text-amber-300'
                : syncStatus === 'syncing'
                ? 'bg-sky-950/70 border-sky-800 text-sky-300'
                : 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
            }`}
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Offline</span>
                {pendingMutationsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-800 text-[10px] text-white font-bold">
                    {pendingMutationsCount}
                  </span>
                )}
              </>
            ) : syncStatus === 'syncing' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                <span className="hidden sm:inline">Sincronizando</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">En Línea</span>
              </>
            )}
          </div>

          {/* Sync Now button */}
          <button
            onClick={onForceSync}
            disabled={!isOnline || syncStatus === 'syncing'}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-40"
            title="Sincronizar datos con el servidor central de Tepatitlán"
          >
            <RefreshCw
              className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin text-sky-400' : ''}`}
            />
          </button>

          {/* Direct Profile Tab Button in Top Header */}
          <button
            onClick={() => onSelectTab('profile')}
            className={`flex items-center gap-2 p-1.5 px-2 rounded-lg border text-xs transition ${
              currentTab === 'profile'
                ? 'bg-red-800 text-white border-red-600 shadow-md'
                : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title="Ir al apartado dedicado: Perfil del Evaluador"
          >
            <div className="w-5 h-5 rounded-full bg-red-800 border border-red-500 text-white flex items-center justify-center text-[10px] font-bold">
              {currentEvaluator.name.charAt(0)}
            </div>
            <span className="hidden md:inline font-semibold truncate max-w-[110px]">
              {currentEvaluator.name.split(' ')[0]}
            </span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 border-t border-slate-800/80 overflow-x-auto py-1">
        <button
          onClick={() => onSelectTab('map')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            currentTab === 'map'
              ? 'bg-red-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Mapa Interactivo</span>
        </button>

        <button
          onClick={() => onSelectTab('matrix')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            currentTab === 'matrix'
              ? 'bg-red-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Ver gráficamente los movimientos y avance secuencial en la matriz EDAN"
        >
          <Activity className="w-3.5 h-3.5 text-orange-400" />
          <span>Matriz de Movimientos</span>
        </button>

        <button
          onClick={() => onSelectTab('assessments')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            currentTab === 'assessments'
              ? 'bg-red-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Evaluaciones EDAN</span>
        </button>

        <button
          onClick={() => onSelectTab('profile')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            currentTab === 'profile'
              ? 'bg-red-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Apartado exclusivo para crear y editar el Perfil del Evaluador"
        >
          <Users className="w-3.5 h-3.5 text-red-400" />
          <span>Perfil del Evaluador</span>
        </button>

        <button
          onClick={() => onSelectTab('needs')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            currentTab === 'needs'
              ? 'bg-red-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Análisis de Necesidades</span>
        </button>

        <button
          onClick={() => onSelectTab('routes')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            currentTab === 'routes'
              ? 'bg-red-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Trazabilidad operativa de evaluaciones EDAN y movimientos en campo"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Trazabilidad del Desastre</span>
        </button>

        <button
          onClick={() => onSelectTab('backup')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            currentTab === 'backup'
              ? 'bg-red-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Copia Offline & Transfer</span>
        </button>
      </div>
    </header>
  );
};

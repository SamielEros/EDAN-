import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running standalone on device, don't show prompt
  if (isInstalled) {
    return (
      <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 text-xs font-medium">
        <Check className="w-3.5 h-3.5" />
        PWA Instalada
      </span>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-red-700 hover:bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition active:scale-95"
        title="Instalar EDAN en este dispositivo para acceso offline instantáneo"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-red-700/60 bg-red-950/40 hover:bg-red-900/60 px-3 py-1.5 text-xs font-semibold text-red-200 transition"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Instalar en iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-red-500" />
                  Instalar en iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-white p-1 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Para utilizar el sistema <strong>EDAN Tepatitlán</strong> sin conexión y con acceso directo en tu pantalla de inicio:
              </p>
              <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                <li>
                  Presiona el botón <strong>Compartir</strong> <span className="text-blue-400">⎋</span> en la barra inferior de Safari.
                </li>
                <li>
                  Baja en el menú y selecciona <strong>"Agregar al inicio"</strong>.
                </li>
                <li>
                  Confirma tocando <strong>"Agregar"</strong> en la esquina superior derecha.
                </li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-red-700 hover:bg-red-600 py-2 text-xs font-semibold text-white transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Windows / Browser generic fallback helper
  return null;
};

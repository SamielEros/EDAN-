import React from 'react';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount: number;
  onSync: () => void;
  syncStatus: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  pendingCount,
  onSync,
  syncStatus,
}) => {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`px-4 py-2 text-xs border-b flex flex-wrap items-center justify-between gap-2 transition ${
        !isOnline
          ? 'bg-amber-950/90 border-amber-800/80 text-amber-200'
          : 'bg-sky-950/90 border-sky-800/80 text-sky-200'
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Modo Offline Activo:</strong> Estás trabajando sin conexión a internet en Tepatitlán. Todos los registros, fotos y notas de voz se guardan en el almacenamiento local seguro.
              {pendingCount > 0 && ` (${pendingCount} evaluaciones pendientes de sincronizar)`}
            </span>
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 text-sky-400 shrink-0 animate-spin" />
            <span>
              <strong>Conexión restablecida:</strong> Transmitiendo {pendingCount} evaluaciones pendientes al servidor central...
            </span>
          </>
        )}
      </div>

      {isOnline && pendingCount > 0 && (
        <button
          onClick={onSync}
          disabled={syncStatus === 'syncing'}
          className="px-2.5 py-1 rounded-md bg-sky-800 hover:bg-sky-700 text-white font-semibold text-[11px] transition"
        >
          {syncStatus === 'syncing' ? 'Sincronizando...' : 'Enviar Ahora'}
        </button>
      )}
    </div>
  );
};

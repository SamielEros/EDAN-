import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Navigation,
  MapPin,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Activity,
  Layers,
  Compass,
  Trash2,
  Users,
  CheckCircle2,
  Sparkles,
  Share2,
} from 'lucide-react';
import { DamageAssessment, DamageSeverity } from '../types/edan';
import { generateGoogleMapsRouteUrl, generateGoogleMapsSingleUrl } from '../utils/geoUtils';

// Haversine formula to compute distance in km
function computeDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface MovementMatrixVisualizerProps {
  assessments: DamageAssessment[];
  selectedAssessmentId?: string | null;
  onSelectAssessment: (assessment: DamageAssessment) => void;
  onDeleteAssessment?: (id: string) => void;
}

export const MovementMatrixVisualizer: React.FC<MovementMatrixVisualizerProps> = ({
  assessments,
  selectedAssessmentId,
  onSelectAssessment,
  onDeleteAssessment,
}) => {
  // Sector filter
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [autoFollowLatest, setAutoFollowLatest] = useState<boolean>(true);

  // Chronologically sorted assessments
  const sortedAssessments = useMemo(() => {
    let list = assessments.filter((a) => {
      if (sectorFilter === 'all') return true;
      return a.sector === sectorFilter;
    });

    return [...list].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [assessments, sectorFilter]);

  // Current active step index in the movement sequence
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playIntervalRef = useRef<any>(null);

  // Auto-follow: if new assessments are added, move to latest
  useEffect(() => {
    if (autoFollowLatest && sortedAssessments.length > 0) {
      setCurrentIndex(sortedAssessments.length - 1);
    }
  }, [sortedAssessments.length, autoFollowLatest]);

  // Sync with selectedAssessmentId from props if provided
  useEffect(() => {
    if (selectedAssessmentId && sortedAssessments.length > 0) {
      const idx = sortedAssessments.findIndex((a) => a.id === selectedAssessmentId);
      if (idx >= 0) {
        setCurrentIndex(idx);
      }
    }
  }, [selectedAssessmentId, sortedAssessments]);

  // Auto-playback logic
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (sortedAssessments.length === 0) return 0;
          if (prev >= sortedAssessments.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 3500);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, sortedAssessments.length]);

  // Ensure index is within bounds
  const safeIndex = sortedAssessments.length > 0 ? Math.min(currentIndex, sortedAssessments.length - 1) : 0;
  const activeItem = sortedAssessments[safeIndex] || null;

  // Compute total sequence distance
  const totalTrajectoryKm = useMemo(() => {
    if (sortedAssessments.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < sortedAssessments.length - 1; i++) {
      total += computeDistanceKm(
        sortedAssessments[i].location.lat,
        sortedAssessments[i].location.lng,
        sortedAssessments[i + 1].location.lat,
        sortedAssessments[i + 1].location.lng
      );
    }
    return total;
  }, [sortedAssessments]);

  // Compute distance from previous item to current
  const distanceFromPrevKm = useMemo(() => {
    if (safeIndex === 0 || sortedAssessments.length < 2) return null;
    const prev = sortedAssessments[safeIndex - 1];
    const curr = sortedAssessments[safeIndex];
    if (!prev || !curr) return null;
    return computeDistanceKm(prev.location.lat, prev.location.lng, curr.location.lat, curr.location.lng);
  }, [safeIndex, sortedAssessments]);

  // Compute time difference from previous item to current
  const timeDeltaStr = useMemo(() => {
    if (safeIndex === 0 || sortedAssessments.length < 2) return null;
    const prev = sortedAssessments[safeIndex - 1];
    const curr = sortedAssessments[safeIndex];
    if (!prev || !curr) return null;
    const diffMs = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
    if (diffMs <= 0) return 'Mismo momento';
    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 60) return `+${mins} min`;
    const hrs = (mins / 60).toFixed(1);
    return `+${hrs} hrs`;
  }, [safeIndex, sortedAssessments]);

  // Available sectors for filter
  const uniqueSectors = useMemo(() => {
    return Array.from(new Set(assessments.map((a) => a.sector))).filter(Boolean);
  }, [assessments]);

  const handleStepClick = (index: number) => {
    setAutoFollowLatest(false);
    setCurrentIndex(index);
    if (sortedAssessments[index]) {
      onSelectAssessment(sortedAssessments[index]);
    }
  };

  const handleRestart = () => {
    setAutoFollowLatest(false);
    setCurrentIndex(0);
    if (sortedAssessments[0]) {
      onSelectAssessment(sortedAssessments[0]);
    }
  };

  const getSeverityColor = (severity: DamageSeverity) => {
    switch (severity) {
      case 'Destrucción Total':
        return {
          badge: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800',
          dot: 'bg-red-600',
          ring: 'border-red-500',
        };
      case 'Grave':
        return {
          badge: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/80 dark:text-orange-300 dark:border-orange-800',
          dot: 'bg-orange-600',
          ring: 'border-orange-500',
        };
      case 'Moderado':
        return {
          badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
          dot: 'bg-amber-500',
          ring: 'border-amber-500',
        };
      case 'Leve':
        return {
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
          dot: 'bg-emerald-500',
          ring: 'border-emerald-500',
        };
      default:
        return {
          badge: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          dot: 'bg-slate-500',
          ring: 'border-slate-500',
        };
    }
  };

  if (sortedAssessments.length === 0) {
    return (
      <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 text-xs space-y-3 shadow-sm transition-colors duration-150">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/70 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 mx-auto flex items-center justify-center">
          <Activity className="w-6 h-6" />
        </div>
        <p className="font-bold text-sm text-slate-900 dark:text-white">
          No hay evaluaciones registradas para trazar la matriz de movimientos
        </p>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Conforme registre evaluaciones EDAN reales en campo, la matriz de movimientos trazará de forma automática e inmediata la secuencia cronológica, los desplazamientos en kilómetros y los intervalos de tiempo entre inspecciones.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden flex flex-col transition-colors duration-150">
      {/* Header & Playback Controls */}
      <div className="p-4 bg-slate-50 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Matriz de Movimientos y Desplazamientos EDAN
              </h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                <span>Actualización Automática</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Avance cronológico de campo ({sortedAssessments.length} sitios &bull; {totalTrajectoryKm.toFixed(2)} km acumulados)
            </p>
          </div>
        </div>

        {/* Player Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
          {/* Sector Filter */}
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="all">Todos los Sectores</option>
            {uniqueSectors.map((s) => (
              <option key={s} value={s}>
                Sector {s}
              </option>
            ))}
          </select>

          <button
            onClick={handleRestart}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
            title="Reiniciar al inicio (Sitio #1)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-sm ${
              isPlaying
                ? 'bg-amber-600 text-white hover:bg-amber-500'
                : 'bg-red-700 text-white hover:bg-red-600'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Reproducir ({safeIndex + 1}/{sortedAssessments.length})</span>
              </>
            )}
          </button>

          {/* Direct Google Maps Full Route Link */}
          <a
            href={generateGoogleMapsRouteUrl(sortedAssessments)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-700/60 text-xs font-bold text-blue-700 dark:text-blue-200 transition"
            title="Abrir el itinerario secuencial completo en Google Maps"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden md:inline">Ruta Google Maps</span>
          </a>
        </div>
      </div>

      {/* Auto-Follow Toggle Notification Bar */}
      <div className="px-4 py-2 bg-slate-100/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Sitio seleccionado: #{safeIndex + 1} de {sortedAssessments.length}
          </span>
          {activeItem && (
            <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
              &bull; {activeItem.location.neighborhood || activeItem.location.community}
            </span>
          )}
        </div>

        <button
          onClick={() => setAutoFollowLatest(!autoFollowLatest)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
            autoFollowLatest
              ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
          }`}
          title="Mantener visualización fija en la última evaluación registrada"
        >
          <span className={`w-2 h-2 rounded-full ${autoFollowLatest ? 'bg-emerald-500 dark:bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
          <span>Auto-Seguimiento {autoFollowLatest ? 'Activo' : 'Pausado'}</span>
        </button>
      </div>

      {/* Timeline Nodes Reel */}
      <div className="p-4 overflow-x-auto scrollbar-thin border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40">
        <div className="flex items-center gap-3 min-w-max pb-1">
          {sortedAssessments.map((item, idx) => {
            const isSelected = idx === safeIndex;
            const colors = getSeverityColor(item.severity);
            const timeFormatted = new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <button
                key={item.id}
                onClick={() => handleStepClick(idx)}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition shrink-0 max-w-[200px] ${
                  isSelected
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-500 shadow-md ring-2 ring-red-500/20'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                    <span className="font-mono text-[10px] font-bold text-slate-900 dark:text-slate-200">
                      #{idx + 1}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {timeFormatted}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-900 dark:text-white truncate w-full mt-1">
                  {item.location.neighborhood || item.location.community}
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full">
                  {item.location.streetAddress || item.sector}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Step Details Card */}
      {activeItem && (
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-700 flex items-center justify-center font-black text-red-700 dark:text-red-300 text-sm">
                #{safeIndex + 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {activeItem.folio}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getSeverityColor(activeItem.severity).badge}`}>
                    {activeItem.severity}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">&bull; Sector {activeItem.sector}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {activeItem.location.neighborhood || activeItem.location.community} &mdash;{' '}
                  <span className="font-normal text-slate-600 dark:text-slate-300">
                    {activeItem.location.streetAddress}
                  </span>
                </h4>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={generateGoogleMapsSingleUrl(activeItem.location.lat, activeItem.location.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-700 dark:text-sky-300 font-bold text-xs border border-blue-200 dark:border-slate-700 transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                <span>Abrir en Google Maps</span>
              </a>

              {onDeleteAssessment && (
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `¿Confirma eliminar definitivamente la evaluación ${activeItem.folio} (${activeItem.location.community}) de la matriz?`
                      )
                    ) {
                      onDeleteAssessment(activeItem.id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/70 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-300 font-bold text-xs border border-slate-200 dark:border-slate-700 transition"
                  title="Eliminar esta evaluación definitivamente"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Grid for Active Step */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold">DESPLAZAMIENTO</div>
              <div className="text-base font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                {distanceFromPrevKm !== null ? `+${distanceFromPrevKm.toFixed(2)} km` : 'Punto de Origen'}
              </div>
              <div className="text-[10px] text-slate-500">
                {safeIndex > 0 ? `Desde sitio #${safeIndex}` : 'Inicio del recorrido'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold">FAMILIAS AFECTADAS</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {activeItem.affectedPopulation.familiesAffected}
              </div>
              <div className="text-[10px] text-slate-500">
                Lesionados: {activeItem.affectedPopulation.peopleInjured}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold">VIVIENDAS INHABITABLES</div>
              <div className="text-base font-bold text-red-600 dark:text-red-400 mt-0.5">
                {activeItem.affectedPopulation.homesInhabitable}
              </div>
              <div className="text-[10px] text-slate-500">
                Afectadas: {activeItem.affectedPopulation.homesDamaged}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold">EVALUADOR RESPONSABLE</div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-200 mt-0.5 truncate">
                {activeItem.evaluator.name}
              </div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                {activeItem.evaluator.radioCallsign} &bull; {activeItem.evaluator.role}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

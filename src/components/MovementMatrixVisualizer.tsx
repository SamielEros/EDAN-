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
} from 'lucide-react';
import { DamageAssessment, DamageSeverity } from '../types/edan';
import { generateGoogleMapsRouteUrl, generateGoogleMapsSingleUrl } from './EDANGoogleMap';

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
  onNavigateToMap: (assessment: DamageAssessment) => void;
  onDeleteAssessment?: (id: string) => void;
}

export const MovementMatrixVisualizer: React.FC<MovementMatrixVisualizerProps> = ({
  assessments,
  selectedAssessmentId,
  onSelectAssessment,
  onNavigateToMap,
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

    return list.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [assessments, sectorFilter]);

  const uniqueSectors = useMemo(() => {
    return Array.from(new Set(assessments.map((a) => a.sector))).filter(Boolean);
  }, [assessments]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<number>(2000); // 2s per step
  const timerRef = useRef<any>(null);
  const prevCountRef = useRef(assessments.length);

  // Auto-follow newest assessment when new items arrive dynamically
  useEffect(() => {
    if (assessments.length > prevCountRef.current && autoFollowLatest) {
      const lastIdx = sortedAssessments.length - 1;
      if (lastIdx >= 0) {
        setCurrentIndex(lastIdx);
        if (sortedAssessments[lastIdx]) {
          onSelectAssessment(sortedAssessments[lastIdx]);
        }
      }
    }
    prevCountRef.current = assessments.length;
  }, [assessments.length, autoFollowLatest, sortedAssessments, onSelectAssessment]);

  // Safe Index bounds
  const safeIndex =
    sortedAssessments.length === 0
      ? 0
      : Math.min(Math.max(0, currentIndex), sortedAssessments.length - 1);

  // Auto-play timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= sortedAssessments.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          const next = prev + 1;
          if (sortedAssessments[next]) {
            onSelectAssessment(sortedAssessments[next]);
          }
          return next;
        });
      }, playSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playSpeed, sortedAssessments, onSelectAssessment]);

  // Sync with selectedAssessmentId from outside
  useEffect(() => {
    if (selectedAssessmentId) {
      const idx = sortedAssessments.findIndex((a) => a.id === selectedAssessmentId);
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
    }
  }, [selectedAssessmentId, sortedAssessments]);

  const activeItem = sortedAssessments[safeIndex];

  // Calculate distance from previous item
  const distanceFromPrevKm = useMemo(() => {
    if (safeIndex > 0 && sortedAssessments[safeIndex - 1] && activeItem) {
      const prev = sortedAssessments[safeIndex - 1];
      return computeDistanceKm(
        prev.location.lat,
        prev.location.lng,
        activeItem.location.lat,
        activeItem.location.lng
      );
    }
    return null;
  }, [safeIndex, sortedAssessments, activeItem]);

  // Total trajectory km
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

  const handleStepClick = (index: number) => {
    setCurrentIndex(index);
    if (sortedAssessments[index]) {
      onSelectAssessment(sortedAssessments[index]);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    if (sortedAssessments[0]) {
      onSelectAssessment(sortedAssessments[0]);
    }
  };

  const getSeverityColor = (sev: DamageSeverity) => {
    switch (sev) {
      case 'Destrucción Total':
        return { text: 'text-red-400', bg: 'bg-red-500', badge: 'bg-red-950 text-red-300 border-red-800' };
      case 'Grave':
        return { text: 'text-orange-400', bg: 'bg-orange-500', badge: 'bg-orange-950 text-orange-300 border-orange-800' };
      case 'Moderado':
        return { text: 'text-yellow-400', bg: 'bg-yellow-500', badge: 'bg-yellow-950 text-yellow-300 border-yellow-800' };
      default:
        return { text: 'text-emerald-400', bg: 'bg-emerald-500', badge: 'bg-emerald-950 text-emerald-300 border-emerald-800' };
    }
  };

  if (sortedAssessments.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs space-y-2">
        <Activity className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="font-bold text-white">No hay evaluaciones disponibles para trazar la matriz de movimientos.</p>
        <p className="text-slate-500">Conforme se registren evaluaciones EDAN en campo, la matriz se actualizará automáticamente en tiempo real.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden flex flex-col">
      {/* Header & Playback Controls */}
      <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-950 border border-red-800 text-red-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white">
                Matriz de Movimientos y Desplazamientos EDAN
              </h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-[10px] font-bold text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Actualización Automática Activa</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Observa cronológicamente el avance del desastre ({sortedAssessments.length} sitios &bull; {totalTrajectoryKm.toFixed(2)} km de trayectoria)
            </p>
          </div>
        </div>

        {/* Player Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
          {/* Sector Filter */}
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold rounded-lg px-2 py-1.5 focus:outline-none"
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
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Reiniciar al inicio (Sitio #1)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-red-700 hover:bg-red-600 text-white'
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
                <span>Animar Avance</span>
              </>
            )}
          </button>

          {/* Speed Selector */}
          <select
            value={playSpeed}
            onChange={(e) => setPlaySpeed(Number(e.target.value))}
            className="bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold rounded-lg px-2 py-1.5 focus:outline-none"
            title="Velocidad de reproducción"
          >
            <option value={3000}>1x (3s)</option>
            <option value={2000}>1.5x (2s)</option>
            <option value={1000}>2x (1s)</option>
          </select>

          {/* Open full route in Google Maps button */}
          <a
            href={generateGoogleMapsRouteUrl(sortedAssessments)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold transition shadow-md"
            title="Abrir trayectoria completa en Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Google Maps Multi-Sitio</span>
          </a>
        </div>
      </div>

      {/* Progress & Timeline Bar */}
      <div className="p-4 bg-slate-900 border-b border-slate-800/80">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-1.5">
            <span className="font-bold text-white">Sitio {safeIndex + 1} de {sortedAssessments.length}</span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-slate-300">{activeItem?.location?.community}</span>
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            {new Date(activeItem?.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hrs
          </span>
        </div>

        {/* Interactive Scrub Bar */}
        <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden cursor-pointer">
          <div
            className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 transition-all duration-300"
            style={{ width: `${((safeIndex + 1) / sortedAssessments.length) * 100}%` }}
          />
        </div>

        {/* Step Nodes Row */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-thin">
          {sortedAssessments.map((item, idx) => {
            const isCurrent = idx === safeIndex;
            const isPassed = idx < safeIndex;
            const sevColor = getSeverityColor(item.severity);

            return (
              <button
                key={item.id}
                onClick={() => handleStepClick(idx)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  isCurrent
                    ? 'bg-red-700 text-white shadow-md ring-2 ring-red-400'
                    : isPassed
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-950/60 text-slate-500 hover:bg-slate-800'
                }`}
                title={`Paso ${idx + 1}: ${item.folio} - ${item.location.community}`}
              >
                <span className={`w-2 h-2 rounded-full ${sevColor.bg}`} />
                <span className="font-mono text-[11px]">#{idx + 1}</span>
                <span className="truncate max-w-[80px]">{item.location.community}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Step Details Card */}
      {activeItem && (
        <div className="p-4 bg-slate-950/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-700 flex items-center justify-center font-black text-red-300 text-sm">
                #{safeIndex + 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {activeItem.folio}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getSeverityColor(activeItem.severity).badge}`}>
                    {activeItem.severity}
                  </span>
                  <span className="text-xs text-slate-400">&bull; Sector {activeItem.sector}</span>
                </div>
                <h4 className="text-sm font-bold text-white mt-1">
                  {activeItem.location.community} - {activeItem.location.streetAddress}
                </h4>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigateToMap(activeItem)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-700/90 hover:bg-red-600 text-white font-bold text-xs transition shadow-sm"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Ver en Mapa</span>
              </button>

              <a
                href={generateGoogleMapsSingleUrl(activeItem.location.lat, activeItem.location.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs border border-slate-700 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir en Google Maps</span>
              </a>

              {onDeleteAssessment && (
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `¿Confirma eliminar definitivamente la evaluación ${activeItem.folio} (${activeItem.location.community}) de la matriz y del mapa?`
                      )
                    ) {
                      onDeleteAssessment(activeItem.id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-red-900/70 text-slate-400 hover:text-red-300 font-bold text-xs border border-slate-700 transition"
                  title="Eliminar esta evaluación definitivamente (por mitigación o error)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Grid for Active Step */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-slate-400 text-[10px] font-bold">DESPLAZAMIENTO</div>
              <div className="text-base font-bold text-sky-400 mt-0.5">
                {distanceFromPrevKm !== null ? `+${distanceFromPrevKm.toFixed(2)} km` : 'Punto de Origen'}
              </div>
              <div className="text-[10px] text-slate-500">
                {safeIndex > 0 ? `Desde sitio #${safeIndex}` : 'Inicio del recorrido'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-slate-400 text-[10px] font-bold">FAMILIAS AFECTADAS</div>
              <div className="text-base font-bold text-emerald-400 mt-0.5">
                {activeItem.affectedPopulation.familiesAffected}
              </div>
              <div className="text-[10px] text-slate-500">
                Lesionados: {activeItem.affectedPopulation.peopleInjured}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-slate-400 text-[10px] font-bold">VIVIENDAS INHABITABLES</div>
              <div className="text-base font-bold text-red-400 mt-0.5">
                {activeItem.affectedPopulation.homesInhabitable}
              </div>
              <div className="text-[10px] text-slate-500">
                Afectadas: {activeItem.affectedPopulation.homesDamaged}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-slate-400 text-[10px] font-bold">EVALUADOR RESPONSABLE</div>
              <div className="text-xs font-bold text-slate-200 mt-0.5 truncate">
                {activeItem.evaluator.name}
              </div>
              <div className="text-[10px] text-amber-400 font-mono">
                {activeItem.evaluator.radioCallsign} &bull; {activeItem.evaluator.role}
              </div>
            </div>
          </div>

          {/* Damage & Action Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-slate-400 text-[10px] font-bold mb-1">DESCRIPCIÓN DEL DAÑO</div>
              <p className="text-slate-300 leading-relaxed">{activeItem.damageDescription}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-slate-400 text-[10px] font-bold mb-1">ACCIONES INMEDIATAS REALIZADAS</div>
              <p className="text-slate-300 leading-relaxed">
                {activeItem.actionsTaken || 'Inspección técnica preliminar concluida por la brigada.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  Navigation,
  Clock,
  MapPin,
  ArrowRight,
  AlertCircle,
  FileText,
  ExternalLink,
  Activity,
  Users,
  Trash2,
  RefreshCw,
  Radio,
} from 'lucide-react';
import { DamageAssessment, DamageSeverity, ContingencyEvent } from '../types/edan';
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

interface RoutesTrackerProps {
  assessments: DamageAssessment[];
  contingency?: ContingencyEvent;
  onSelectAssessment?: (assessment: DamageAssessment) => void;
  onNavigateToMap?: (assessment: DamageAssessment) => void;
  onDeleteAssessment?: (id: string) => void;
}

export const RoutesTracker: React.FC<RoutesTrackerProps> = ({
  assessments,
  contingency,
  onSelectAssessment,
  onNavigateToMap,
  onDeleteAssessment,
}) => {
  // Filter and sort states for dynamic traceability
  const [filterEvaluator, setFilterEvaluator] = useState<string>('all');
  const [filterSector, setFilterSector] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Extract unique evaluators and sectors
  const uniqueEvaluators = useMemo(() => {
    const map = new Map<string, string>();
    assessments.forEach((a) => {
      const name = a.evaluator?.name || 'Evaluador';
      const callsign = a.evaluator?.radioCallsign || '';
      const key = `${name} (${callsign})`.trim();
      map.set(key, name);
    });
    return Array.from(map.keys());
  }, [assessments]);

  const uniqueSectors = useMemo(() => {
    return Array.from(new Set(assessments.map((a) => a.sector))).filter(Boolean);
  }, [assessments]);

  // Filtered & Sorted Assessments for real-time automatic traceability
  const sortedAssessments = useMemo(() => {
    let list = assessments.filter((a) => {
      if (filterSector !== 'all' && a.sector !== filterSector) return false;
      if (filterEvaluator !== 'all') {
        const key = `${a.evaluator?.name || ''} (${a.evaluator?.radioCallsign || ''})`.trim();
        if (key !== filterEvaluator) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return list;
  }, [assessments, filterSector, filterEvaluator, sortOrder]);

  // Cumulative distance calculation in chronological sequence
  const totalTrajectoryKm = useMemo(() => {
    if (sortedAssessments.length < 2) return 0;
    const chrono = [...sortedAssessments].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    let total = 0;
    for (let i = 0; i < chrono.length - 1; i++) {
      total += computeDistanceKm(
        chrono[i].location.lat,
        chrono[i].location.lng,
        chrono[i + 1].location.lat,
        chrono[i + 1].location.lng
      );
    }
    return total;
  }, [sortedAssessments]);

  const totalFamiliesAffected = useMemo(() => {
    return sortedAssessments.reduce((acc, a) => acc + (a.affectedPopulation?.familiesAffected || 0), 0);
  }, [sortedAssessments]);

  const totalInjured = useMemo(() => {
    return sortedAssessments.reduce((acc, a) => acc + (a.affectedPopulation?.peopleInjured || 0), 0);
  }, [sortedAssessments]);

  const totalHomesInhabitable = useMemo(() => {
    return sortedAssessments.reduce((acc, a) => acc + (a.affectedPopulation?.homesInhabitable || 0), 0);
  }, [sortedAssessments]);

  const getSeverityStyle = (sev: DamageSeverity) => {
    switch (sev) {
      case 'Destrucción Total':
        return 'bg-red-950 text-red-300 border-red-800';
      case 'Grave':
        return 'bg-orange-950 text-orange-300 border-orange-800';
      case 'Moderado':
        return 'bg-yellow-950 text-yellow-300 border-yellow-800';
      default:
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-red-950/40 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Navigation className="w-5 h-5 text-red-500" />
              <span>Trazabilidad Operativa y Movimientos del Desastre</span>
            </h2>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-[10px] font-bold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Actualización en Tiempo Real</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Registro dinámico de la trazabilidad conforme surgen evaluaciones EDAN en los diferentes sectores de Tepatitlán.
          </p>
        </div>

        {/* PMU Indicator Banner */}
        {contingency?.commandPostLocation && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-red-950/60 border border-red-800/80 text-xs shrink-0">
            <div className="p-1.5 rounded-lg bg-red-900 text-red-200">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-[11px]">PUESTO DE MANDO UNIFICADO (PMU)</div>
              <div className="text-[10px] text-red-300 font-mono">
                {contingency.commandPostLocation.name}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Real-Time Disaster KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Sitios Evaluados</span>
            <MapPin className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl font-bold text-white">{sortedAssessments.length}</div>
          <div className="text-[10px] text-slate-500">Puntos georreferenciados</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Trayectoria Recorrida</span>
            <Navigation className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-sky-300">{totalTrajectoryKm.toFixed(2)} km</div>
          <div className="text-[10px] text-slate-500">Desplazamiento acumulado</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Familias Afectadas</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-300">{totalFamiliesAffected}</div>
          <div className="text-[10px] text-slate-500">Censo poblacional</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Viviendas Inhabitables</span>
            <AlertCircle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl font-bold text-orange-300">{totalHomesInhabitable}</div>
          <div className="text-[10px] text-slate-500">Lesionados: {totalInjured}</div>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Evaluator filter */}
          <select
            value={filterEvaluator}
            onChange={(e) => setFilterEvaluator(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-1 focus:ring-red-500"
          >
            <option value="all">Todas las Brigadas / Evaluadores ({uniqueEvaluators.length})</option>
            {uniqueEvaluators.map((ev) => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>

          {/* Sector filter */}
          <select
            value={filterSector}
            onChange={(e) => setFilterSector(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-1 focus:ring-red-500"
          >
            <option value="all">Todos los Sectores ({uniqueSectors.length})</option>
            {uniqueSectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>

          {/* Sort order */}
          <button
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Cambiar orden cronológico"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{sortOrder === 'asc' ? 'Cronológico (Inicio → Fin)' : 'Más Reciente Primero'}</span>
          </button>
        </div>

        {/* Google Maps Route Launcher */}
        {sortedAssessments.length > 1 && (
          <a
            href={generateGoogleMapsRouteUrl(sortedAssessments)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 font-bold text-white shadow-sm transition active:scale-95"
            title="Trazar ruta de navegación en Google Maps uniendo todos los sitios"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Navegar Todos los Puntos en Google Maps ({sortedAssessments.length})</span>
          </a>
        )}
      </div>

      {/* Chronological Traceability Timeline */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-500 animate-pulse" />
            <span>Secuencia de Sitios de Desastre Evaluados en Campo</span>
          </h4>
          <span className="text-[11px] text-slate-400">
            {sortedAssessments.length} puntos en trazabilidad
          </span>
        </div>

        {sortedAssessments.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            No hay evaluaciones que coincidan con los filtros seleccionados.
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-700">
            {sortedAssessments.map((item, idx) => {
              // Calculate distance from previous item
              let stepDistance = 0;
              if (idx > 0) {
                const prev = sortedAssessments[idx - 1];
                stepDistance = computeDistanceKm(
                  prev.location.lat,
                  prev.location.lng,
                  item.location.lat,
                  item.location.lng
                );
              }

              const timeStr = new Date(item.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={item.id} className="relative group">
                  {/* Node Marker */}
                  <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 border-white bg-red-600 text-white flex items-center justify-center font-bold text-[9px] shadow-sm">
                    {idx + 1}
                  </div>

                  {/* Assessment Card */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition space-y-2.5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            #{idx + 1} {item.folio}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getSeverityStyle(
                              item.severity
                            )}`}
                          >
                            {item.severity}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            &bull; Sector {item.sector}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white mt-1">
                          {item.location.community} &mdash;{' '}
                          <span className="text-slate-300 font-normal">
                            {item.location.streetAddress}
                          </span>
                        </h4>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 text-[11px] text-slate-400 shrink-0">
                        <span className="flex items-center gap-1 font-mono text-slate-300">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{timeStr} hrs</span>
                        </span>
                        {idx > 0 && (
                          <span className="text-[10px] text-sky-400 font-semibold bg-sky-950/70 px-1.5 py-0.5 rounded border border-sky-800">
                            +{stepDistance.toFixed(2)} km desde #{idx}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Damage & Evaluator Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-slate-300">
                        <div className="text-[10px] text-slate-500 font-bold mb-0.5">
                          DAÑOS OBSERVADOS
                        </div>
                        <p className="line-clamp-2 text-[11px]">{item.damageDescription}</p>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-slate-300 flex flex-col justify-between">
                        <div className="text-[10px] text-slate-500 font-bold mb-0.5">
                          EVALUADOR RESPONSABLE
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-200">
                            {item.evaluator.name}
                          </span>
                          <span className="font-mono text-[10px] text-amber-400">
                            [{item.evaluator.radioCallsign}]
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex gap-2">
                          <span>Familias: <b>{item.affectedPopulation.familiesAffected}</b></span>
                          <span>Lesionados: <b>{item.affectedPopulation.peopleInjured}</b></span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900 text-xs">
                      <div className="flex items-center gap-2">
                        {onNavigateToMap && (
                          <button
                            onClick={() => onNavigateToMap(item)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-700/80 hover:bg-red-600 text-white font-bold text-[11px] transition"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>Ver en Mapa</span>
                          </button>
                        )}

                        <a
                          href={generateGoogleMapsSingleUrl(item.location.lat, item.location.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-[11px] border border-slate-700 transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Google Maps GPS</span>
                        </a>

                        {onSelectAssessment && (
                          <button
                            onClick={() => onSelectAssessment(item)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] border border-slate-700 transition"
                          >
                            <FileText className="w-3 h-3 text-red-400" />
                            <span>Reporte EDAN</span>
                          </button>
                        )}
                      </div>

                      {onDeleteAssessment && (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `¿Confirma eliminar definitivamente la evaluación ${item.folio} (${item.location.community}) de la trazabilidad y del mapa?`
                              )
                            ) {
                              onDeleteAssessment(item.id);
                            }
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-300 text-[11px] border border-slate-800 hover:border-red-800 transition"
                          title="Eliminar registro definitivamente"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                          <span>Eliminar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

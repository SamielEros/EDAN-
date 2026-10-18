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
import {
  computeDistanceKm,
  generateGoogleMapsRouteUrl,
  generateGoogleMapsSingleUrl,
} from '../utils/geoUtils';

interface RoutesTrackerProps {
  assessments: DamageAssessment[];
  contingency?: ContingencyEvent;
  onSelectAssessment?: (assessment: DamageAssessment) => void;
  onDeleteAssessment?: (id: string) => void;
}

export const RoutesTracker: React.FC<RoutesTrackerProps> = ({
  assessments,
  contingency,
  onSelectAssessment,
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

  // Total affected population across trace
  const totalFamiliesAffected = useMemo(() => {
    return sortedAssessments.reduce(
      (sum, a) => sum + (a.affectedPopulation?.familiesAffected || 0),
      0
    );
  }, [sortedAssessments]);

  const totalInhabitableHomes = useMemo(() => {
    return sortedAssessments.reduce(
      (sum, a) => sum + (a.affectedPopulation?.homesInhabitable || 0),
      0
    );
  }, [sortedAssessments]);

  const getSeverityStyle = (sev: DamageSeverity) => {
    switch (sev) {
      case 'Destrucción Total':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800';
      case 'Grave':
        return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800';
      case 'Moderado':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-150">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Navigation className="w-5 h-5 text-red-600 dark:text-red-500" />
              <span>Trazabilidad Operativa y Movimientos del Desastre</span>
            </h2>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span>Actualización en Tiempo Real</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Registro cronológico y trazabilidad dinámica de evaluaciones EDAN en los sectores de Tepatitlán.
          </p>
        </div>

        {/* PMU Indicator Banner */}
        {contingency?.commandPostLocation && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 text-xs shrink-0">
            <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white text-[11px]">PUESTO DE MANDO UNIFICADO (PMU)</div>
              <div className="text-[10px] text-red-700 dark:text-red-300 font-mono">
                {contingency.commandPostLocation.name}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Real-Time Disaster KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-150">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Sitios Evaluados</span>
            <MapPin className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">{sortedAssessments.length}</div>
          <div className="text-[10px] text-slate-500">Puntos georreferenciados</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-150">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Trayectoria Recorrida</span>
            <Navigation className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-xl font-bold text-sky-700 dark:text-sky-300">{totalTrajectoryKm.toFixed(2)} km</div>
          <div className="text-[10px] text-slate-500">Desplazamiento acumulado</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-150">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Familias Afectadas</span>
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{totalFamiliesAffected}</div>
          <div className="text-[10px] text-slate-500">Censo poblacional</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-150">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Viviendas Inhabitables</span>
            <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-xl font-bold text-orange-700 dark:text-orange-300">{totalInhabitableHomes}</div>
          <div className="text-[10px] text-slate-500">Riesgo inminente</div>
        </div>
      </div>

      {/* Control Filters & Multi-site Route Action */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors duration-150">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter by Evaluator */}
          {uniqueEvaluators.length > 0 && (
            <select
              value={filterEvaluator}
              onChange={(e) => setFilterEvaluator(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="all">Todos los Evaluadores ({uniqueEvaluators.length})</option>
              {uniqueEvaluators.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          )}

          {/* Filter by Sector */}
          {uniqueSectors.length > 0 && (
            <select
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="all">Todos los Sectores</option>
              {uniqueSectors.map((s) => (
                <option key={s} value={s}>
                  Sector {s}
                </option>
              ))}
            </select>
          )}

          {/* Chronological Sort Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{sortOrder === 'asc' ? 'Primero Antiguos (Cronológico)' : 'Primero Recientes'}</span>
          </button>
        </div>

        {/* Global Google Maps Route Button */}
        {sortedAssessments.length > 0 && (
          <a
            href={generateGoogleMapsRouteUrl(sortedAssessments)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition active:scale-95 shrink-0"
          >
            <Navigation className="w-4 h-4" />
            <span>Navegar Ruta Completa en Google Maps ({sortedAssessments.length} sitios)</span>
          </a>
        )}
      </div>

      {/* Dynamic Trace Timeline */}
      <div className="space-y-4">
        {sortedAssessments.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs space-y-2 shadow-sm transition-colors duration-150">
            <Activity className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-bold text-sm text-slate-900 dark:text-white">
              No hay evaluaciones registradas para la trazabilidad
            </p>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Conforme registre evaluaciones de daños EDAN en campo, se formará automáticamente la secuencia temporal y espacial con distancias acumuladas.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-red-500/30 space-y-4 ml-3">
            {sortedAssessments.map((item, idx) => {
              // Calculate step distance from previous node in current display order
              let stepDistance = 0;
              if (idx > 0) {
                stepDistance = computeDistanceKm(
                  sortedAssessments[idx - 1].location.lat,
                  sortedAssessments[idx - 1].location.lng,
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
                  <div className="absolute -left-9 top-1.5 w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 bg-red-600 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
                    {idx + 1}
                  </div>

                  {/* Assessment Card */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition space-y-3 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            #{idx + 1} {item.folio}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getSeverityStyle(
                              item.severity
                            )}`}
                          >
                            {item.severity}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            &bull; Sector {item.sector}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                          {item.location.neighborhood || item.location.community} &mdash;{' '}
                          <span className="text-slate-600 dark:text-slate-300 font-normal">
                            {item.location.streetAddress}
                          </span>
                        </h4>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                        <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{timeStr} hrs</span>
                        </span>
                        {idx > 0 && (
                          <span className="text-[10px] text-sky-700 dark:text-sky-400 font-semibold bg-sky-50 dark:bg-sky-950/70 px-2 py-0.5 rounded-lg border border-sky-200 dark:border-sky-800">
                            +{stepDistance.toFixed(2)} km desde #{idx}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Damage & Evaluator Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          EVALUADOR EN TERRENO
                        </span>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.evaluator.name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Indicativo: {item.evaluator.radioCallsign} &bull; Cred: {item.evaluator.credential}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          RESUMEN DE AFECTACIÓN
                        </span>
                        <div className="text-slate-700 dark:text-slate-300 truncate">
                          {item.damageDescription || 'Evaluación registrada sin observaciones.'}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 flex gap-2">
                          <span>Personas: <b>{item.affectedPopulation.peopleAffected || 0}</b></span>
                          <span>Familias: <b>{item.affectedPopulation.familiesAffected}</b></span>
                          <span>Lesionados: <b>{item.affectedPopulation.peopleInjured}</b></span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-2">
                        <a
                          href={generateGoogleMapsSingleUrl(item.location.lat, item.location.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-700 dark:text-sky-300 font-bold text-[11px] border border-blue-200 dark:border-slate-700 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                          <span>Google Maps GPS</span>
                        </a>

                        {onSelectAssessment && (
                          <button
                            onClick={() => onSelectAssessment(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 font-bold text-[11px] border border-slate-200 dark:border-slate-700 transition"
                          >
                            <FileText className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                            <span>Reporte EDAN</span>
                          </button>
                        )}
                      </div>

                      {onDeleteAssessment && (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `¿Confirma eliminar definitivamente la evaluación ${item.folio} (${item.location.community}) de la trazabilidad?`
                              )
                            ) {
                              onDeleteAssessment(item.id);
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-950 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-300 text-[11px] border border-slate-200 dark:border-slate-700 transition"
                          title="Eliminar registro definitivamente"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
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

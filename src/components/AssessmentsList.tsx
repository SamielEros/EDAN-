import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  MapPin,
  Camera,
  Volume2,
  Trash2,
  Edit3,
  Download,
  Share2,
  AlertTriangle,
  Users,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { DamageAssessment, DamageSeverity, DamageSector } from '../types/edan';
import { generateGoogleMapsSingleUrl } from '../utils/geoUtils';

interface AssessmentsListProps {
  assessments: DamageAssessment[];
  onOpenNewForm: () => void;
  onEditAssessment: (assessment: DamageAssessment) => void;
  onDeleteAssessment: (id: string) => void;
  onOpenPdf: (assessment: DamageAssessment) => void;
}

export const AssessmentsList: React.FC<AssessmentsListProps> = ({
  assessments,
  onOpenNewForm,
  onEditAssessment,
  onDeleteAssessment,
  onOpenPdf,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedSector, setSelectedSector] = useState<string>('all');

  const filtered = assessments.filter((item) => {
    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchFolio = item.folio.toLowerCase().includes(term);
      const matchCommunity = item.location.community.toLowerCase().includes(term);
      const matchNeighborhood = item.location.neighborhood?.toLowerCase().includes(term);
      const matchAddress = item.location.streetAddress.toLowerCase().includes(term);
      const matchEvaluator = item.evaluator.name.toLowerCase().includes(term);
      const matchDesc = item.damageDescription.toLowerCase().includes(term);
      if (!matchFolio && !matchCommunity && !matchNeighborhood && !matchAddress && !matchEvaluator && !matchDesc) {
        return false;
      }
    }

    // Severity filter
    if (selectedSeverity !== 'all' && item.severity !== selectedSeverity) {
      return false;
    }

    // Sector filter
    if (selectedSector !== 'all' && item.sector !== selectedSector) {
      return false;
    }

    return true;
  });

  const getSeverityBadge = (severity: DamageSeverity) => {
    switch (severity) {
      case 'Destrucción Total':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800';
      case 'Grave':
        return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/80 dark:text-orange-300 dark:border-orange-800';
      case 'Moderado':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
      case 'Leve':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm transition-colors duration-150">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-600 dark:text-red-500" />
            <span>Evaluaciones Registradas en Campo ({assessments.length})</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Registro técnico permanente de daños y necesidades &bull; Sin evaluaciones de práctica
          </p>
        </div>

        <button
          onClick={onOpenNewForm}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-xs font-bold text-white shadow-md transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nueva Evaluación EDAN</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 shadow-sm transition-colors duration-150">
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por folio, calle, colonia o evaluador..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        <div>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="all">Cualquier Severidad</option>
            <option value="Destrucción Total">Destrucción Total</option>
            <option value="Grave">Grave</option>
            <option value="Moderado">Moderado</option>
            <option value="Leve">Leve</option>
          </select>
        </div>

        <div>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="all">Todos los Sectores</option>
            <option value="Vivienda y Asentamientos">Vivienda</option>
            <option value="Salud y Hospitales">Salud</option>
            <option value="Educación e Infraestructura">Educación</option>
            <option value="Agua y Saneamiento">Agua y Saneamiento</option>
            <option value="Comunicaciones y Transportes">Comunicaciones y Vías</option>
            <option value="Energía y Electricidad">Energía y Electricidad</option>
            <option value="Agropecuario y Comercio">Agropecuario</option>
          </select>
        </div>
      </div>

      {/* List of Assessments */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition shadow-sm space-y-3"
            >
              {/* Row 1: Folio, Severity, Sector, Date */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    {item.folio}
                  </span>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getSeverityBadge(item.severity)}`}>
                    {item.severity}
                  </span>

                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    &bull; {item.sector}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {new Date(item.timestamp).toLocaleDateString([], {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Row 2: Location and Description */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-red-600 dark:text-red-500 shrink-0" />
                  <span>
                    {item.location.neighborhood || item.location.community} &mdash;{' '}
                    <span className="text-slate-600 dark:text-slate-300 font-normal">
                      {item.location.streetAddress || 'Sin dirección específica'}
                    </span>
                  </span>
                </h3>

                {item.location.reference && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 italic pl-5">
                    Ref: {item.location.reference}
                  </p>
                )}

                {item.damageDescription && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 line-clamp-2 pl-5 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    {item.damageDescription}
                  </p>
                )}
              </div>

              {/* Row 3: Metrics (People affected, Families, Homes, Needs) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
                    Personas Afectadas
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {item.affectedPopulation.peopleAffected ||
                      (item.affectedPopulation.familiesAffected ? item.affectedPopulation.familiesAffected * 4 : 0)}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
                    Familias Afectadas
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {item.affectedPopulation.familiesAffected || 0}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
                    Viviendas Dañadas
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {item.affectedPopulation.homesDamaged || 0}{' '}
                    {item.affectedPopulation.homesInhabitable
                      ? `(${item.affectedPopulation.homesInhabitable} inhabitables)`
                      : ''}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
                    Necesidades
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {item.needs ? item.needs.length : 0} registradas
                  </span>
                </div>
              </div>

              {/* Attachments preview & Evaluator & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                  <span>
                    Evaluador:{' '}
                    <strong className="text-slate-800 dark:text-slate-300">{item.evaluator.name}</strong> (
                    {item.evaluator.radioCallsign})
                  </span>

                  {item.attachments.photos.length > 0 && (
                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <Camera className="w-3.5 h-3.5 text-amber-500" />
                      {item.attachments.photos.length} fotos
                    </span>
                  )}

                  {item.attachments.audios.length > 0 && (
                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <Volume2 className="w-3.5 h-3.5 text-red-500" />
                      {item.attachments.audios.length} audios
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <a
                    href={generateGoogleMapsSingleUrl(item.location.lat, item.location.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/90 border border-blue-200 dark:border-blue-700/60 text-xs font-semibold text-blue-700 dark:text-blue-200 transition"
                    title="Navegar a las coordenadas de este punto en Google Maps"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Navegar GPS</span>
                  </a>

                  <button
                    onClick={() => onOpenPdf(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-700 hover:bg-red-600 text-xs font-bold text-white shadow-sm transition active:scale-95"
                    title="Generar y compartir reporte oficial EDAN en PDF vía WhatsApp o descarga"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>PDF & Compartir</span>
                  </button>

                  <button
                    onClick={() => onEditAssessment(item)}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition"
                    title="Editar evaluación"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `¿Confirma eliminar definitivamente la evaluación ${item.folio} (${item.location.community})? Se removerá del dispositivo y de la base de datos de manera permanente.`
                        )
                      ) {
                        onDeleteAssessment(item.id);
                      }
                    }}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-900/60 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-300 transition"
                    title="Eliminar evaluación definitivamente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs space-y-3 transition-colors duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              No hay evaluaciones de daños registradas
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-xs leading-relaxed">
              El sistema se encuentra limpio y listo para el registro de evaluaciones EDAN reales en Tepatitlán de Morelos. Cada evaluación registrada se guardará de manera permanente en este dispositivo hasta que decida eliminarla.
            </p>
            <div className="pt-2">
              <button
                onClick={onOpenNewForm}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-xs font-bold text-white shadow-md transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Registrar Primera Evaluación EDAN</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

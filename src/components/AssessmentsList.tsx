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
} from 'lucide-react';
import { DamageAssessment, DamageSeverity, DamageSector } from '../types/edan';

interface AssessmentsListProps {
  assessments: DamageAssessment[];
  onOpenNewForm: () => void;
  onEditAssessment: (assessment: DamageAssessment) => void;
  onDeleteAssessment: (id: string) => void;
  onOpenPdf: (assessment: DamageAssessment) => void;
  onSelectOnMap: (assessment: DamageAssessment) => void;
}

export const AssessmentsList: React.FC<AssessmentsListProps> = ({
  assessments,
  onOpenNewForm,
  onEditAssessment,
  onDeleteAssessment,
  onOpenPdf,
  onSelectOnMap,
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
      const matchAddress = item.location.streetAddress.toLowerCase().includes(term);
      const matchEvaluator = item.evaluator.name.toLowerCase().includes(term);
      const matchDesc = item.damageDescription.toLowerCase().includes(term);
      if (!matchFolio && !matchCommunity && !matchAddress && !matchEvaluator && !matchDesc) {
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

  const getSeverityBadgeClass = (severity: DamageSeverity) => {
    switch (severity) {
      case 'Destrucción Total':
        return 'bg-red-950 text-red-300 border-red-700';
      case 'Grave':
        return 'bg-orange-950 text-orange-300 border-orange-700';
      case 'Moderado':
        return 'bg-yellow-950 text-yellow-300 border-yellow-700';
      default:
        return 'bg-emerald-950 text-emerald-300 border-emerald-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-500" />
            Evaluaciones Registradas en Campo ({assessments.length})
          </h2>
          <p className="text-xs text-slate-400">
            Formularios técnicos EDAN normalizados con geolocalización y evidencia
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por folio, calle, comunidad..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
        </div>

        <div>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
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
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
          >
            <option value="all">Todos los Sectores</option>
            <option value="Vivienda y Asentamientos">Vivienda</option>
            <option value="Salud y Atención Médica">Salud</option>
            <option value="Infraestructura y Vías">Infraestructura y Vías</option>
            <option value="Agua y Saneamiento">Agua y Saneamiento</option>
            <option value="Servicios Básicos (Luz/Gas/Com)">Servicios Básicos</option>
            <option value="Educativo y Comunitario">Educativo</option>
            <option value="Comercial e Industrial">Comercial</option>
          </select>
        </div>
      </div>

      {/* List Cards */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/70 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-white">
                    {item.folio}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSeverityBadgeClass(
                      item.severity
                    )}`}
                  >
                    {item.severity}
                  </span>
                  <span className="text-xs text-slate-400">&bull; {item.sector}</span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{new Date(item.timestamp).toLocaleString('es-MX')}</span>
                  {item.syncStatus === 'synced' ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Sincronizado
                    </span>
                  ) : (
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Pendiente Sync
                    </span>
                  )}
                </div>
              </div>

              {/* Location & Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-white font-bold">
                    <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>{item.location.community}</span>
                    <span className="text-slate-400 font-normal">
                      - {item.location.streetAddress}
                    </span>
                  </div>

                  {item.location.reference && (
                    <p className="text-[11px] text-slate-400 italic">
                      Ref: {item.location.reference}
                    </p>
                  )}

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    {item.damageDescription}
                  </p>
                </div>

                {/* Metrics Box */}
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Familias afectadas:</span>
                    <strong className="text-white">
                      {item.affectedPopulation.familiesAffected}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Lesionados:</span>
                    <strong className="text-amber-400">
                      {item.affectedPopulation.peopleInjured}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Viviendas inhabitables:</span>
                    <strong className="text-red-400">
                      {item.affectedPopulation.homesInhabitable}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800">
                    <span>Requerimientos:</span>
                    <strong className="text-sky-400">{item.needs.length} ítems</strong>
                  </div>
                </div>
              </div>

              {/* Attachments preview & Evaluator */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/60 text-xs">
                <div className="flex items-center gap-3 text-slate-400">
                  <span>
                    Evaluador:{' '}
                    <strong className="text-slate-300">{item.evaluator.name}</strong> (
                    {item.evaluator.radioCallsign})
                  </span>

                  {item.attachments.photos.length > 0 && (
                    <span className="flex items-center gap-1 text-slate-300">
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      {item.attachments.photos.length} fotos
                    </span>
                  )}

                  {item.attachments.audios.length > 0 && (
                    <span className="flex items-center gap-1 text-slate-300">
                      <Volume2 className="w-3.5 h-3.5 text-red-400" />
                      {item.attachments.audios.length} audios
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectOnMap(item)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 transition"
                    title="Ver en el mapa interactivo"
                  >
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>Ver Mapa</span>
                  </button>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${item.location.lat},${item.location.lng}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 border border-blue-700/60 text-xs font-semibold text-blue-200 transition"
                    title="Abrir este punto geográfico en la aplicación de Google Maps"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    <span>Google Maps</span>
                  </a>

                  <button
                    onClick={() => onOpenPdf(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-800/80 hover:bg-red-700 text-xs font-bold text-white shadow-sm transition active:scale-95"
                    title="Generar y compartir reporte PDF vía WhatsApp, Email o Descarga"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>PDF & Compartir</span>
                  </button>

                  <button
                    onClick={() => onEditAssessment(item)}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition"
                    title="Editar evaluación"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `¿Confirma eliminar definitivamente la evaluación ${item.folio} (${item.location.community})? Se removerá de forma permanente del mapa, rutas, matriz y concentrados por mitigación o error.`
                        )
                      ) {
                        onDeleteAssessment(item.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 transition"
                    title="Eliminar definitivamente por error o por haber sido mitigada"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center rounded-xl bg-slate-800/40 border border-dashed border-slate-700 text-slate-400 text-xs space-y-2">
            <p>No se encontraron evaluaciones que coincidan con la búsqueda o filtros.</p>
            <button
              onClick={onOpenNewForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-xs font-bold text-white transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Primera Evaluación</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

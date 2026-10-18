import React, { useState } from 'react';
import {
  Package,
  Droplet,
  HeartPulse,
  Home,
  Truck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  ArrowRight,
  TrendingUp,
  X,
} from 'lucide-react';
import { DamageAssessment, NeedCategory, NeedItem, NeedPriority, NeedStatus } from '../types/edan';

interface NeedsAnalysisProps {
  assessments: DamageAssessment[];
  onUpdateNeedStatus: (needId: string, status: NeedStatus, deliveredCount?: number) => void;
  onAddNewNeed?: (assessmentId: string, need: NeedItem) => void;
}

export const NeedsAnalysis: React.FC<NeedsAnalysisProps> = ({
  assessments,
  onUpdateNeedStatus,
  onAddNewNeed,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New need form state
  const [targetAssessmentId, setTargetAssessmentId] = useState(assessments[0]?.id || '');
  const [newCategory, setNewCategory] = useState<NeedCategory>('Alimentaria y Agua');
  const [newDescription, setNewDescription] = useState('');
  const [newQuantity, setNewQuantity] = useState(10);
  const [newUnit, setNewUnit] = useState<NeedItem['unit']>('Kits');
  const [newPriority, setNewPriority] = useState<NeedPriority>('Alta (<24h)');
  const [newNotes, setNewNotes] = useState('');

  // Collect all needs flattened with their parent assessment location context
  const allNeeds: Array<NeedItem & { assessmentFolio: string; community: string; assessmentId: string }> = [];

  assessments.forEach((assess) => {
    (assess.needs || []).forEach((need) => {
      allNeeds.push({
        ...need,
        assessmentFolio: assess.folio,
        community: assess.location.neighborhood || assess.location.community,
        assessmentId: assess.id,
      });
    });
  });

  // Totals calculations
  const totalNeedsCount = allNeeds.length;
  const criticalCount = allNeeds.filter((n) => n.priority === 'Crítica (<6h)').length;
  const pendingCount = allNeeds.filter((n) => n.status === 'Pendiente').length;
  const deliveredCount = allNeeds.filter((n) => n.status === 'Entregado').length;

  // Filtered needs list
  const filteredNeeds = allNeeds.filter((n) => {
    if (selectedCategory !== 'all' && n.category !== selectedCategory) return false;
    if (selectedPriority !== 'all' && n.priority !== selectedPriority) return false;
    if (selectedStatus !== 'all' && n.status !== selectedStatus) return false;
    return true;
  });

  const handleCreateNeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim() || !targetAssessmentId) return;

    if (onAddNewNeed) {
      const need: NeedItem = {
        id: `NEED-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        category: newCategory,
        itemDescription: newDescription.trim(),
        quantityRequired: Number(newQuantity) || 1,
        quantityDelivered: 0,
        unit: newUnit,
        priority: newPriority,
        status: 'Pendiente',
        notes: newNotes.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };
      onAddNewNeed(targetAssessmentId, need);
      setShowAddModal(false);
      setNewDescription('');
      setNewNotes('');
    }
  };

  const getCategoryIcon = (category: NeedCategory) => {
    switch (category) {
      case 'Alimentaria y Agua':
        return <Droplet className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      case 'Salud e Insumos Médicos':
        return <HeartPulse className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'Alojamiento y Refugio':
        return <Home className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'Maquinaria y Despeje':
        return <Truck className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      default:
        return <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getPriorityBadge = (priority: NeedPriority) => {
    if (priority.startsWith('Crítica')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700">
          {priority}
        </span>
      );
    }
    if (priority.startsWith('Alta')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-700">
          {priority}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
        {priority}
      </span>
    );
  };

  return (
    <div className="space-y-6 transition-colors duration-150">
      {/* Executive Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Requerimientos</span>
            <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalNeedsCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">En {assessments.length} sitios evaluados</div>
        </div>

        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 shadow-sm">
          <div className="flex items-center justify-between text-red-700 dark:text-red-300 text-xs mb-1">
            <span>Prioridad Crítica (&lt;6h)</span>
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">{criticalCount}</div>
          <div className="text-[11px] text-red-600 dark:text-red-300 mt-1">Demanda inmediata para vidas</div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 text-xs mb-1">
            <span>En Gestión o Pendientes</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{pendingCount}</div>
          <div className="text-[11px] text-amber-600 dark:text-amber-300 mt-1">Requieren despacho logístico</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs mb-1">
            <span>Entregados en Sitio</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{deliveredCount}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-300 mt-1">Asistencia humanitaria suministrada</div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar:</span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="all">Todas las Categorías</option>
            <option value="Alimentaria y Agua">Alimentos y Agua</option>
            <option value="Salud e Insumos Médicos">Salud y Medicamentos</option>
            <option value="Alojamiento y Refugio">Alojamiento y Refugio</option>
            <option value="Agua y Saneamiento (WASH)">Agua y Saneamiento</option>
            <option value="Maquinaria y Despeje">Maquinaria</option>
            <option value="Búsqueda y Rescate (USAR)">Búsqueda y Rescate</option>
            <option value="Seguridad y Apoyo Psicosocial">Seguridad y Apoyo</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="all">Cualquier Prioridad</option>
            <option value="Crítica (<6h)">Crítica (&lt;6h)</option>
            <option value="Alta (<24h)">Alta (&lt;24h)</option>
            <option value="Media (<72h)">Media (&lt;72h)</option>
            <option value="Baja">Baja</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="all">Cualquier Estado</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En Gestión">En Gestión</option>
            <option value="En Tránsito">En Tránsito</option>
            <option value="Entregado">Entregado</option>
          </select>
        </div>

        {assessments.length > 0 && onAddNewNeed && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-xs font-bold text-white shadow-sm transition active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Requerimiento</span>
          </button>
        )}
      </div>

      {/* Needs Item Cards */}
      <div className="space-y-3">
        {filteredNeeds.length > 0 ? (
          filteredNeeds.map((need) => {
            const percent = Math.min(
              100,
              Math.round(((need.quantityDelivered || 0) / need.quantityRequired) * 100)
            );

            return (
              <div
                key={need.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600">
                      {getCategoryIcon(need.category)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{need.itemDescription}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{need.community}</span>
                        <span>&bull;</span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">{need.assessmentFolio}</span>
                        <span>&bull;</span>
                        <span>{need.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {getPriorityBadge(need.priority)}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        need.status === 'Entregado'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700'
                          : need.status === 'En Tránsito'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700'
                          : need.status === 'En Gestión'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700'
                          : 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {need.status}
                    </span>
                  </div>
                </div>

                {/* Quantities & Progress */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <div>
                      Demanda requerida: <strong className="text-slate-900 dark:text-white">{need.quantityRequired} {need.unit}</strong>
                    </div>
                    <div>
                      Suministrado: <strong className="text-emerald-600 dark:text-emerald-400">{need.quantityDelivered} {need.unit}</strong> ({percent}%)
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        percent >= 100 ? 'bg-emerald-500' : percent > 0 ? 'bg-blue-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {need.notes && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-200 dark:border-slate-800">
                      Observación: {need.notes}
                    </p>
                  )}
                </div>

                {/* Status action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Actualizar estado logístico:</span>
                  <div className="flex items-center gap-1.5">
                    {need.status !== 'En Gestión' && (
                      <button
                        onClick={() => onUpdateNeedStatus(need.id, 'En Gestión')}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[11px] font-medium text-slate-700 dark:text-slate-200 transition"
                      >
                        En Gestión
                      </button>
                    )}
                    {need.status !== 'En Tránsito' && (
                      <button
                        onClick={() => onUpdateNeedStatus(need.id, 'En Tránsito')}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/80 hover:bg-blue-100 dark:hover:bg-blue-800 text-[11px] font-medium text-blue-700 dark:text-blue-200 transition"
                      >
                        En Tránsito
                      </button>
                    )}
                    {need.status !== 'Entregado' && (
                      <button
                        onClick={() => onUpdateNeedStatus(need.id, 'Entregado', need.quantityRequired)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-medium text-white transition flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Marcar Entregado</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs shadow-sm">
            No hay requerimientos ni necesidades registradas en esta contingencia.
          </div>
        )}
      </div>

      {/* Add Need Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-red-600 dark:text-red-500" />
                <span>Registrar Necesidad de Emergencia</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNeed} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Sitio de Evaluación / Comunidad Vinculada:
                </label>
                <select
                  value={targetAssessmentId}
                  onChange={(e) => setTargetAssessmentId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  required
                >
                  {assessments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.folio} - {a.location.neighborhood || a.location.community}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as NeedCategory)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Alimentaria y Agua">Alimentaria y Agua</option>
                    <option value="Salud e Insumos Médicos">Salud y Medicamentos</option>
                    <option value="Alojamiento y Refugio">Alojamiento y Refugio</option>
                    <option value="Agua y Saneamiento (WASH)">Agua y Saneamiento</option>
                    <option value="Maquinaria y Despeje">Maquinaria y Despeje</option>
                    <option value="Búsqueda y Rescate (USAR)">Búsqueda y Rescate</option>
                    <option value="Seguridad y Apoyo Psicosocial">Seguridad / Apoyo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Prioridad:</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as NeedPriority)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Crítica (<6h)">Crítica (&lt;6h)</option>
                    <option value="Alta (<24h)">Alta (&lt;24h)</option>
                    <option value="Media (<72h)">Media (&lt;72h)</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Descripción del Insumo / Recurso Requerido:
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ej. Garrafones de agua potable 20L, Kits de higiene familiar..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Cantidad:</label>
                  <input
                    type="number"
                    min="1"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(Number(e.target.value) || 1)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Unidad:</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Kits">Kits</option>
                    <option value="Piezas">Piezas</option>
                    <option value="Litros">Litros</option>
                    <option value="Cajas">Cajas</option>
                    <option value="Raciones">Raciones</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notas de Despacho Logístico (Opcional):
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  placeholder="Ej. Entregar en punto seguro; acceso sólo con vehículo 4x4..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-xs font-bold text-white shadow-md transition active:scale-95"
                >
                  Guardar Requerimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

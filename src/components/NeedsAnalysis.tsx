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
    assess.needs.forEach((need) => {
      allNeeds.push({
        ...need,
        assessmentFolio: assess.folio,
        community: assess.location.community,
        assessmentId: assess.id,
      });
    });
  });

  // Totals calculations
  const totalNeedsCount = allNeeds.length;
  const criticalCount = allNeeds.filter((n) => n.priority === 'Crítica (<6h)').length;
  const pendingCount = allNeeds.filter((n) => n.status === 'Pendiente').length;
  const deliveredCount = allNeeds.filter((n) => n.status === 'Entregado').length;

  // Filtered Needs
  const filteredNeeds = allNeeds.filter((need) => {
    if (selectedCategory !== 'all' && need.category !== selectedCategory) return false;
    if (selectedPriority !== 'all' && need.priority !== selectedPriority) return false;
    if (selectedStatus !== 'all' && need.status !== selectedStatus) return false;
    return true;
  });

  const handleCreateNeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim() || !targetAssessmentId) return;

    const item: NeedItem = {
      id: `NEED-${Date.now()}`,
      assessmentId: targetAssessmentId,
      category: newCategory,
      itemDescription: newDescription.trim(),
      quantityRequired: Number(newQuantity) || 1,
      quantityDelivered: 0,
      unit: newUnit,
      priority: newPriority,
      status: 'Pendiente',
      notes: newNotes.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (onAddNewNeed) {
      onAddNewNeed(targetAssessmentId, item);
    }

    setNewDescription('');
    setNewNotes('');
    setShowAddModal(false);
  };

  const getCategoryIcon = (category: NeedCategory) => {
    switch (category) {
      case 'Alimentaria y Agua':
        return <Droplet className="w-4 h-4 text-sky-400" />;
      case 'Salud e Insumos Médicos':
        return <HeartPulse className="w-4 h-4 text-rose-400" />;
      case 'Alojamiento y Refugio':
        return <Home className="w-4 h-4 text-amber-400" />;
      case 'Maquinaria y Despeje':
        return <Truck className="w-4 h-4 text-orange-400" />;
      default:
        return <Package className="w-4 h-4 text-purple-400" />;
    }
  };

  const getPriorityBadge = (priority: NeedPriority) => {
    if (priority.startsWith('Crítica')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-700 animate-pulse">
          {priority}
        </span>
      );
    }
    if (priority.startsWith('Alta')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-950 text-orange-300 border border-orange-700">
          {priority}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
        {priority}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Executive Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Requerimientos Registrados</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalNeedsCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">En {assessments.length} sitios evaluados</div>
        </div>

        <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/50 shadow-md">
          <div className="flex items-center justify-between text-red-300 text-xs mb-1">
            <span>Prioridad Crítica (&lt;6h)</span>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{criticalCount}</div>
          <div className="text-[11px] text-red-300 mt-1">Demanda inmediata para vidas</div>
        </div>

        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 shadow-md">
          <div className="flex items-center justify-between text-amber-300 text-xs mb-1">
            <span>En Gestión o Pendientes</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{pendingCount}</div>
          <div className="text-[11px] text-amber-300 mt-1">Requieren despacho logístico</div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 shadow-md">
          <div className="flex items-center justify-between text-emerald-300 text-xs mb-1">
            <span>Entregados en Sitio</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{deliveredCount}</div>
          <div className="text-[11px] text-emerald-300 mt-1">Asistencia humanitaria suministrada</div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar:</span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-red-500"
          >
            <option value="all">Todas las Categorías</option>
            <option value="Alimentaria y Agua">Alimentaria y Agua</option>
            <option value="Salud e Insumos Médicos">Salud y Medicamentos</option>
            <option value="Alojamiento y Refugio">Alojamiento y Refugio</option>
            <option value="Agua y Saneamiento (WASH)">WASH / Saneamiento</option>
            <option value="Maquinaria y Despeje">Maquinaria y Despeje</option>
            <option value="Búsqueda y Rescate (USAR)">Búsqueda y Rescate</option>
            <option value="Seguridad y Apoyo Psicosocial">Seguridad y Apoyo</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-red-500"
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
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-red-500"
          >
            <option value="all">Cualquier Estado</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En Gestión">En Gestión</option>
            <option value="En Tránsito">En Tránsito</option>
            <option value="Entregado">Entregado</option>
          </select>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-xs font-semibold text-white shadow-sm transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Registrar Necesidad</span>
        </button>
      </div>

      {/* Needs Matrix Table / Cards */}
      <div className="space-y-3">
        {filteredNeeds.length > 0 ? (
          filteredNeeds.map((need) => {
            const percent =
              need.quantityRequired > 0
                ? Math.min(100, Math.round((need.quantityDelivered / need.quantityRequired) * 100))
                : 0;

            return (
              <div
                key={need.id}
                className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-700 shrink-0">
                      {getCategoryIcon(need.category)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{need.itemDescription}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-semibold text-slate-300">{need.community}</span>
                        <span>&bull;</span>
                        <span className="font-mono text-slate-400">{need.assessmentFolio}</span>
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
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : need.status === 'En Tránsito'
                          ? 'bg-blue-950 text-blue-300 border border-blue-700'
                          : need.status === 'En Gestión'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700'
                          : 'bg-slate-700 text-slate-300 border border-slate-600'
                      }`}
                    >
                      {need.status}
                    </span>
                  </div>
                </div>

                {/* Quantities & Progress */}
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <div>
                      Demanda requerida: <strong className="text-white">{need.quantityRequired} {need.unit}</strong>
                    </div>
                    <div>
                      Suministrado: <strong className="text-emerald-400">{need.quantityDelivered} {need.unit}</strong> ({percent}%)
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        percent >= 100 ? 'bg-emerald-500' : percent > 0 ? 'bg-blue-500' : 'bg-slate-700'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {need.notes && (
                    <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                      Observación: {need.notes}
                    </p>
                  )}
                </div>

                {/* Status action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Actualizar estado logístico:</span>
                  <div className="flex items-center gap-1.5">
                    {need.status !== 'En Gestión' && (
                      <button
                        onClick={() => onUpdateNeedStatus(need.id, 'En Gestión')}
                        className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-[11px] font-medium text-slate-200 transition"
                      >
                        En Gestión
                      </button>
                    )}
                    {need.status !== 'En Tránsito' && (
                      <button
                        onClick={() => onUpdateNeedStatus(need.id, 'En Tránsito')}
                        className="px-2.5 py-1 rounded bg-blue-900/80 hover:bg-blue-800 text-[11px] font-medium text-blue-200 transition"
                      >
                        En Tránsito
                      </button>
                    )}
                    {need.status !== 'Entregado' && (
                      <button
                        onClick={() => onUpdateNeedStatus(need.id, 'Entregado', need.quantityRequired)}
                        className="px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-[11px] font-medium text-white transition flex items-center gap-1"
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
          <div className="p-8 text-center rounded-xl bg-slate-800/40 border border-dashed border-slate-700 text-slate-400 text-xs">
            No hay requerimientos que coincidan con los filtros seleccionados.
          </div>
        )}
      </div>

      {/* Add Need Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-red-500" />
              Registrar Nueva Necesidad de Emergencia
            </h3>

            <form onSubmit={handleCreateNeed} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Sitio de Evaluación / Comunidad Vinculada:
                </label>
                <select
                  value={targetAssessmentId}
                  onChange={(e) => setTargetAssessmentId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  required
                >
                  {assessments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.folio} - {a.location.community}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Categoría:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as NeedCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
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
                  <label className="block text-xs font-medium text-slate-300 mb-1">Prioridad:</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as NeedPriority)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="Crítica (<6h)">Crítica (&lt;6h)</option>
                    <option value="Alta (<24h)">Alta (&lt;24h)</option>
                    <option value="Media (<72h)">Media (&lt;72h)</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Descripción del Insumo / Recurso:</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ej. Garrafones de agua, Lonas 6x4m, Botiquines trauma"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Cantidad Requerida:</label>
                  <input
                    type="number"
                    min="1"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Unidad de Medida:</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="Kits">Kits</option>
                    <option value="Piezas">Piezas</option>
                    <option value="Litros">Litros</option>
                    <option value="Raciones">Raciones</option>
                    <option value="Unidades">Unidades</option>
                    <option value="Horas/Equipo">Horas / Maquinaria</option>
                    <option value="Lonas">Lonas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Observaciones / Destino de entrega:</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Detalles de logística de entrega o beneficiarios prioritarios"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-xs text-white font-semibold shadow-sm"
                >
                  Guardar Necesidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  RefreshCw,
  Share2,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import {
  exportDatabaseBackup,
  importDatabaseBackup,
  exportAssessmentsCSV,
  exportAssessmentsGeoJSON,
} from '../services/storage';

interface BackupManagerProps {
  assessmentsCount: number;
  routesCount: number;
  pendingSyncCount: number;
  isOnline: boolean;
  onRefreshData: () => void;
  uniqueEvaluatorsCount?: number;
}

export const BackupManager: React.FC<BackupManagerProps> = ({
  assessmentsCount,
  routesCount,
  pendingSyncCount,
  isOnline,
  onRefreshData,
  uniqueEvaluatorsCount = 1,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportDatabaseBackup();
      const filename = `EDAN_CONCENTRADO_MAESTRO_TEPATITLAN_${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}.json`;
      downloadFile(data, filename, 'application/json');
    } catch (err) {
      console.error(err);
      alert('Error al generar respaldo.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const csv = await exportAssessmentsCSV();
      const filename = `EDAN_EVALUACIONES_TEPATITLAN_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      downloadFile(csv, filename, 'text/csv;charset=utf-8;');
    } catch (err) {
      console.error(err);
      alert('Error al exportar tabla CSV.');
    }
  };

  const handleExportGeoJSON = async () => {
    try {
      const geojson = await exportAssessmentsGeoJSON();
      const filename = `EDAN_PUNTOS_SIG_TEPATITLAN_${new Date()
        .toISOString()
        .slice(0, 10)}.geojson`;
      downloadFile(geojson, filename, 'application/geo+json');
    } catch (err) {
      console.error(err);
      alert('Error al exportar capa GeoJSON.');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const count = await importDatabaseBackup(text);
        setImportStatus(
          `¡Concentración exitosa! Se fusionaron y concentraron ${count} evaluaciones de campo en la base local.`
        );
        onRefreshData();
      } catch (err: any) {
        setImportStatus(`Error al procesar el archivo: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto transition-colors duration-150">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-red-600 dark:text-red-500" />
          <span>Concentrador Maestro y Sincronización Multi-Evaluador</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          Permite que <strong>varias brigadas o evaluadores trabajen simultáneamente en diferentes puntos del desastre</strong>, recopilando evidencias georreferenciadas y fusionando toda la información en un solo archivo maestro concentrado (JSON), tanto en línea vía servidor como fuera de línea mediante transferencia física o USB.
        </p>
      </div>

      {/* Multi-User Realtime Concentration Feature Banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Operación Simultánea de Brigadas EDAN</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {uniqueEvaluatorsCount} evaluador(es) activos registrando datos &bull; Sincronización automática vía Server-Sent Events (SSE)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold">
            {isOnline ? 'Canal Central Conectado' : 'Modo Aislado / Offline'}
          </span>
        </div>
      </div>

      {/* Storage Health Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Evaluaciones Concentradas</span>
            <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{assessmentsCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Registros con fotos y evidencias</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Rutas de Trazabilidad</span>
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{routesCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Ejes de inspección en campo</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Cola de Sincronización</span>
            <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingSyncCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isOnline ? 'En cola para transmisión' : 'Esperando señal de red'}
          </div>
        </div>
      </div>

      {/* Export / Import Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Export Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-700">
              <Download className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Exportar Archivo Concentrado Maestro (JSON)</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Descargar concentrado único de todos los puntos</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Genera un archivo único con el conjunto consolidado de evaluaciones, coordenadas, fotografías y necesidades de todas las brigadas trabajando en el desastre.
          </p>

          <div className="space-y-2 pt-1">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-700 hover:bg-red-600 font-bold text-xs text-white shadow-md transition active:scale-95 disabled:opacity-50"
              title="Descargar base de datos completa con evidencias y perfiles"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Generando...' : 'Descargar Archivo Concentrado Maestro (.JSON)'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 font-bold text-xs text-white shadow-sm transition active:scale-95"
                title="Descargar tabla plana de evaluaciones para Excel / Hojas de Cálculo"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Excel (.CSV)</span>
              </button>

              <button
                onClick={handleExportGeoJSON}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-700 hover:bg-sky-600 font-bold text-xs text-white shadow-sm transition active:scale-95"
                title="Descargar formato geoespacial estándar para Google Earth / SIG"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Capa SIG (.GeoJSON)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Import Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700">
              <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Fusionar y Concentrar Datos de Otra Brigada</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Integrar archivo de otro evaluador al concentrado</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Cargue un archivo JSON exportado por cualquier brigadista o unidad de Cruz Roja para fusionar automáticamente sus puntos en este concentrado maestro sin sobrescribir los suyos.
          </p>

          <label className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-bold text-xs text-slate-800 dark:text-slate-200 cursor-pointer border border-slate-200 dark:border-slate-600 transition active:scale-95">
            <Upload className="w-4 h-4" />
            <span>Seleccionar y Fusionar Archivo JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {importStatus && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-slate-800 border border-emerald-300 dark:border-slate-600 text-xs text-emerald-900 dark:text-slate-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{importStatus}</span>
        </div>
      )}
    </div>
  );
};

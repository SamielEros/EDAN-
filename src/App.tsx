/**
 * EDAN Tepatitlán - Sistema de Evaluación de Daños y Análisis de Necesidades
 * Cruz Roja Delegación Tepatitlán
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  DamageAssessment,
  InspectionRoute,
  ContingencyEvent,
  EvaluatorProfile,
  NeedItem,
  NeedStatus,
} from './types/edan';
import { ThemeMode } from './types/theme';
import {
  initializeStorage,
  getAllAssessments,
  getAllRoutes,
  getActiveContingency,
  saveContingency,
  getStoredEvaluatorProfile,
  saveStoredEvaluatorProfile,
  saveAssessmentLocal,
  deleteAssessmentLocal,
  updateNeedStatusLocal,
  saveRouteLocal,
} from './services/storage';
import { syncService } from './services/syncService';
import { TopNav, AppTabType, DeviceViewMode } from './components/TopNav';
import { OfflineBanner } from './components/OfflineBanner';
import { AssessmentsList } from './components/AssessmentsList';
import { AssessmentForm } from './components/AssessmentForm';
import { NeedsAnalysis } from './components/NeedsAnalysis';
import { RoutesTracker } from './components/RoutesTracker';
import { PDFModal } from './components/PDFModal';
import { BackupManager } from './components/BackupManager';
import { EvaluatorProfileSection } from './components/EvaluatorProfileSection';
import { MovementMatrixVisualizer } from './components/MovementMatrixVisualizer';
import { INITIAL_CONTINGENCY } from './data/initialData';
import { Plus, FileText, Package, Navigation, AlertCircle, Activity, Users } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [contingency, setContingency] = useState<ContingencyEvent>(INITIAL_CONTINGENCY);
  const [assessments, setAssessments] = useState<DamageAssessment[]>([]);
  const [routes, setRoutes] = useState<InspectionRoute[]>([]);
  const [currentEvaluator, setCurrentEvaluator] = useState<EvaluatorProfile>({
    id: 'EVAL-01',
    name: 'TSU Roberto Méndez Cruz',
    credential: 'CRM-JAL-TEPA-4421',
    radioCallsign: 'Alpha-Tepa-1',
    phone: '378-782-1100',
    role: 'Evaluador de Campo',
  });

  // Theme state: 'dark' (default/emergency) or 'light' (tema blanco)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('edan_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  // Apply theme to <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    localStorage.setItem('edan_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // UI Navigation states - Default tab is 'assessments'
  const [currentTab, setCurrentTab] = useState<AppTabType>('assessments');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<DamageAssessment | null>(null);
  const [pdfModalAssessment, setPdfModalAssessment] = useState<DamageAssessment | null>(null);
  const [selectedMapAssessmentId, setSelectedMapAssessmentId] = useState<string | null>(null);

  // Screen Adaptor State (mobile, tablet, desktop, auto)
  const [deviceViewMode, setDeviceViewMode] = useState<DeviceViewMode>('auto');

  // Connectivity & Sync state
  const [isOnline, setIsOnline] = useState<boolean>(syncService.isOnline());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // Load Initial Data
  const loadData = useCallback(async () => {
    try {
      await initializeStorage();
      const [allAssess, allRoutes, cont, evalProfile] = await Promise.all([
        getAllAssessments(),
        getAllRoutes(),
        getActiveContingency(),
        getStoredEvaluatorProfile(),
      ]);

      setAssessments(allAssess);
      setRoutes(allRoutes);
      setContingency(cont);
      setCurrentEvaluator(evalProfile);
      const pending = await syncService.updatePendingCount();
      setPendingSyncCount(pending);
    } catch (err) {
      console.error('[Error Loading Storage]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to connectivity
    const unsubOnline = syncService.subscribeOnline((online) => {
      setIsOnline(online);
    });

    const unsubSyncStatus = syncService.subscribeSyncStatus((status, pending) => {
      setSyncStatus(status);
      setPendingSyncCount(pending);
    });

    // Custom storage event listeners
    const handleAssessmentsChanged = () => {
      getAllAssessments().then((list) => {
        setAssessments(list);
        syncService.updatePendingCount().then(setPendingSyncCount);
      });
    };

    const handleRoutesChanged = () => {
      getAllRoutes().then((list) => {
        setRoutes(list);
      });
    };

    const handleContingencyChanged = (e: any) => {
      if (e.detail) setContingency(e.detail);
    };

    const handleEvaluatorChanged = (e: any) => {
      if (e.detail) setCurrentEvaluator(e.detail);
    };

    window.addEventListener('edan-assessments-changed', handleAssessmentsChanged);
    window.addEventListener('edan-routes-changed', handleRoutesChanged);
    window.addEventListener('edan-contingency-changed', handleContingencyChanged);
    window.addEventListener('edan-evaluator-changed', handleEvaluatorChanged);

    return () => {
      unsubOnline();
      unsubSyncStatus();
      window.removeEventListener('edan-assessments-changed', handleAssessmentsChanged);
      window.removeEventListener('edan-routes-changed', handleRoutesChanged);
      window.removeEventListener('edan-contingency-changed', handleContingencyChanged);
      window.removeEventListener('edan-evaluator-changed', handleEvaluatorChanged);
    };
  }, [loadData]);

  // Handle Save Assessment
  const handleSaveAssessment = async (assessment: DamageAssessment) => {
    try {
      await saveAssessmentLocal(assessment, isOnline);
      const updated = await getAllAssessments();
      setAssessments(updated);
      setIsFormOpen(false);
      setEditingAssessment(null);
      setCurrentTab('assessments');
    } catch (err) {
      console.error('[Save Assessment Error]', err);
    }
  };

  // Handle Permanent Delete Assessment
  const handleDeleteAssessment = async (id: string) => {
    try {
      await deleteAssessmentLocal(id, isOnline);
      const updated = await getAllAssessments();
      setAssessments(updated);
      if (selectedMapAssessmentId === id) {
        setSelectedMapAssessmentId(null);
      }
    } catch (err) {
      console.error('[Delete Assessment Error]', err);
    }
  };

  // Handle Update Contingency
  const handleUpdateContingency = async (updated: ContingencyEvent) => {
    try {
      await saveContingency(updated);
      setContingency(updated);
    } catch (err) {
      console.error('[Update Contingency Error]', err);
    }
  };

  // Handle Update Evaluator
  const handleUpdateEvaluator = async (updatedProfile: EvaluatorProfile) => {
    try {
      await saveStoredEvaluatorProfile(updatedProfile);
      setCurrentEvaluator(updatedProfile);
    } catch (err) {
      console.error('[Update Evaluator Error]', err);
    }
  };

  // Handle Update Need Status
  const handleUpdateNeedStatus = async (
    needId: string,
    newStatus: NeedStatus,
    deliveredCount?: number
  ) => {
    try {
      await updateNeedStatusLocal(needId, newStatus, deliveredCount, isOnline);
      const updated = await getAllAssessments();
      setAssessments(updated);
    } catch (err) {
      console.error('[Update Need Status Error]', err);
    }
  };

  // Handle Add New Need from Needs Analysis view
  const handleAddNewNeed = async (assessmentId: string, newNeed: NeedItem) => {
    try {
      const match = assessments.find((a) => a.id === assessmentId);
      if (match) {
        const updatedNeeds = [...(match.needs || []), newNeed];
        const updatedAssessment = {
          ...match,
          needs: updatedNeeds,
        };
        await saveAssessmentLocal(updatedAssessment, isOnline);
        const updated = await getAllAssessments();
        setAssessments(updated);
      }
    } catch (err) {
      console.error('[Add Need Error]', err);
    }
  };

  // Handle Save Route
  const handleUpdateRoute = async (route: InspectionRoute) => {
    try {
      await saveRouteLocal(route);
      const updated = await getAllRoutes();
      setRoutes(updated);
    } catch (err) {
      console.error('[Update Route Error]', err);
    }
  };

  // Handle Force Manual Sync
  const handleForceSync = async () => {
    if (!isOnline) return;
    await syncService.syncPendingQueue();
    await loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors duration-150">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Iniciando EDAN Tepatitlán...
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cargando base de datos técnica y sincronizando módulos de respuesta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      {/* Top Application Header Navigation */}
      <TopNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOnline={isOnline}
        syncStatus={syncStatus}
        pendingMutationsCount={pendingSyncCount}
        onForceSync={handleForceSync}
        currentEvaluator={currentEvaluator}
        onUpdateEvaluator={handleUpdateEvaluator}
        contingency={contingency}
        deviceViewMode={deviceViewMode}
        onSetDeviceViewMode={setDeviceViewMode}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Offline Alert Banner */}
      <OfflineBanner
        isOnline={isOnline}
        pendingCount={pendingSyncCount}
        onSync={handleForceSync}
        syncStatus={syncStatus}
      />

      {/* Screen Adaptor Notification Bar if non-auto */}
      {deviceViewMode !== 'auto' && (
        <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-1.5 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span>
              Adaptador activo: Vista <strong>{deviceViewMode === 'mobile' ? 'Smartphone (390px)' : deviceViewMode === 'tablet' ? 'Tablet (768px)' : 'PC (1100px)'}</strong>
            </span>
          </span>
          <button
            onClick={() => setDeviceViewMode('auto')}
            className="text-[11px] text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold underline"
          >
            Restablecer a pantalla completa (Auto)
          </button>
        </div>
      )}

      {/* Main App Container with Dynamic Screen Adaptor Max-Width */}
      <main
        className={`flex-1 w-full mx-auto p-3 sm:p-5 flex flex-col transition-all duration-300 ${
          deviceViewMode === 'mobile'
            ? 'max-w-[400px] border-x border-slate-200 dark:border-slate-800/80 shadow-2xl bg-white dark:bg-slate-950'
            : deviceViewMode === 'tablet'
            ? 'max-w-[780px] border-x border-slate-200 dark:border-slate-800/80 shadow-2xl bg-white dark:bg-slate-950'
            : deviceViewMode === 'desktop'
            ? 'max-w-[1150px]'
            : 'max-w-7xl'
        }`}
      >
        {/* If Form is Open */}
        {isFormOpen ? (
          <AssessmentForm
            initialAssessment={editingAssessment}
            contingency={contingency}
            currentEvaluator={currentEvaluator}
            existingAssessmentsCount={assessments.length}
            onSave={handleSaveAssessment}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingAssessment(null);
            }}
          />
        ) : (
          <>
            {/* Tab 1: Assessments List View (Primary view) */}
            {currentTab === 'assessments' && (
              <AssessmentsList
                assessments={assessments}
                onOpenNewForm={() => {
                  setEditingAssessment(null);
                  setIsFormOpen(true);
                }}
                onEditAssessment={(item) => {
                  setEditingAssessment(item);
                  setIsFormOpen(true);
                }}
                onDeleteAssessment={handleDeleteAssessment}
                onOpenPdf={(item) => setPdfModalAssessment(item)}
              />
            )}

            {/* Tab 2: Matrix & Sequential Site Movement Visualizer */}
            {currentTab === 'matrix' && (
              <div className="flex-1 space-y-5">
                <MovementMatrixVisualizer
                  assessments={assessments}
                  selectedAssessmentId={selectedMapAssessmentId}
                  onSelectAssessment={(item) => {
                    setSelectedMapAssessmentId(item.id);
                  }}
                  onDeleteAssessment={handleDeleteAssessment}
                />
              </div>
            )}

            {/* Tab 3: Dedicated Evaluator Profile Section */}
            {currentTab === 'profile' && (
              <EvaluatorProfileSection
                currentEvaluator={currentEvaluator}
                onUpdateEvaluator={handleUpdateEvaluator}
                contingency={contingency}
                deviceViewMode={deviceViewMode}
                onSetDeviceViewMode={setDeviceViewMode}
              />
            )}

            {/* Tab 4: Needs Analysis View */}
            {currentTab === 'needs' && (
              <NeedsAnalysis
                assessments={assessments}
                onUpdateNeedStatus={handleUpdateNeedStatus}
                onAddNewNeed={handleAddNewNeed}
              />
            )}

            {/* Tab 5: Real-time Traceability View */}
            {currentTab === 'routes' && (
              <RoutesTracker
                assessments={assessments}
                contingency={contingency}
                onSelectAssessment={(item) => setPdfModalAssessment(item)}
                onDeleteAssessment={handleDeleteAssessment}
              />
            )}

            {/* Tab 6: Backup & Offline Transfer View */}
            {currentTab === 'backup' && (
              <BackupManager
                assessmentsCount={assessments.length}
                routesCount={routes.length}
                pendingSyncCount={pendingSyncCount}
                isOnline={isOnline}
                onRefreshData={loadData}
                uniqueEvaluatorsCount={
                  new Set(assessments.map((a) => a.evaluator?.credential || a.evaluator?.name)).size || 1
                }
              />
            )}
          </>
        )}
      </main>

      {/* Official PDF Report & Instant Sharing Modal */}
      {pdfModalAssessment && (
        <PDFModal
          assessment={pdfModalAssessment}
          contingency={contingency}
          onClose={() => setPdfModalAssessment(null)}
        />
      )}
    </div>
  );
}

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
import { EDANGoogleMap } from './components/EDANGoogleMap';
import { AssessmentsList } from './components/AssessmentsList';
import { AssessmentForm } from './components/AssessmentForm';
import { NeedsAnalysis } from './components/NeedsAnalysis';
import { RoutesTracker } from './components/RoutesTracker';
import { PDFModal } from './components/PDFModal';
import { BackupManager } from './components/BackupManager';
import { EvaluatorProfileSection } from './components/EvaluatorProfileSection';
import { MovementMatrixVisualizer } from './components/MovementMatrixVisualizer';
import { INITIAL_CONTINGENCY } from './data/initialData';
import { Plus, MapPin, FileText, Package, Navigation, AlertCircle, Activity, Users } from 'lucide-react';

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

  // UI Navigation states
  const [currentTab, setCurrentTab] = useState<AppTabType>('map');
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
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

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
      getAllRoutes().then(setRoutes);
    };

    const handleContingencyChanged = (e?: any) => {
      if (e?.detail) {
        setContingency(e.detail);
      } else {
        getActiveContingency().then(setContingency);
      }
    };

    const handleQuotaExceeded = () => {
      setGmpQuotaExceeded(true);
    };

    window.addEventListener('edan-assessments-changed', handleAssessmentsChanged);
    window.addEventListener('edan-routes-changed', handleRoutesChanged);
    window.addEventListener('edan-contingency-changed', handleContingencyChanged);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);

    return () => {
      unsubOnline();
      unsubSyncStatus();
      window.removeEventListener('edan-assessments-changed', handleAssessmentsChanged);
      window.removeEventListener('edan-routes-changed', handleRoutesChanged);
      window.removeEventListener('edan-contingency-changed', handleContingencyChanged);
      window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    };
  }, [loadData]);

  // Periodic team location presence ping when online
  useEffect(() => {
    if (isOnline && navigator.geolocation) {
      const ping = () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            syncService.pingPresence({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          },
          () => syncService.pingPresence()
        );
      };
      ping();
      const interval = setInterval(ping, 60000); // every 1 min
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  // Actions
  const handleSaveAssessment = async (assessment: DamageAssessment) => {
    await saveAssessmentLocal(assessment, isOnline);
    if (isOnline) {
      await syncService.sendAssessmentToServer(assessment);
    }
    setIsFormOpen(false);
    setEditingAssessment(null);
    const updated = await getAllAssessments();
    setAssessments(updated);
  };

  const handleDeleteAssessment = async (id: string) => {
    await deleteAssessmentLocal(id, isOnline);
    if (isOnline) {
      await syncService.deleteAssessmentFromServer(id);
    }
    const updated = await getAllAssessments();
    setAssessments(updated);
  };

  const handleUpdateNeedStatus = async (
    needId: string,
    status: NeedStatus,
    deliveredCount?: number
  ) => {
    await updateNeedStatusLocal(needId, status, deliveredCount, isOnline);
    const updated = await getAllAssessments();
    setAssessments(updated);
  };

  const handleAddNewNeed = async (assessmentId: string, need: NeedItem) => {
    const assess = assessments.find((a) => a.id === assessmentId);
    if (assess) {
      const updatedAssess: DamageAssessment = {
        ...assess,
        needs: [...assess.needs, need],
        updatedAt: new Date().toISOString(),
      };
      await saveAssessmentLocal(updatedAssess, isOnline);
      if (isOnline) {
        await syncService.sendAssessmentToServer(updatedAssess);
      }
      const updated = await getAllAssessments();
      setAssessments(updated);
    }
  };

  const handleUpdateRoute = async (route: InspectionRoute) => {
    await saveRouteLocal(route);
    const updated = await getAllRoutes();
    setRoutes(updated);
  };

  const handleUpdateEvaluator = async (profile: EvaluatorProfile) => {
    setCurrentEvaluator(profile);
    await saveStoredEvaluatorProfile(profile);
  };

  const handleUpdateContingency = async (updated: ContingencyEvent) => {
    await saveContingency(updated);
    setContingency(updated);
    if (isOnline) {
      try {
        await fetch('/api/contingency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
      } catch (err) {
        console.warn('[Sync Contingency failed]', err);
      }
    }
  };

  const handleForceSync = async () => {
    await syncService.syncPendingQueue();
    const updated = await getAllAssessments();
    setAssessments(updated);
  };

  const handleSelectOnMap = (item: DamageAssessment) => {
    setSelectedMapAssessmentId(item.id);
    setCurrentTab('map');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-red-700 flex items-center justify-center font-black text-xl text-white animate-pulse shadow-xl shadow-red-900/50 mb-4">
          EDAN
        </div>
        <h2 className="text-sm font-bold text-slate-200">Iniciando Sistema EDAN Tepatitlán...</h2>
        <p className="text-xs text-slate-500 mt-1">Cargando base de datos local y estado offline</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-red-600 selection:text-white">
      {/* Top Header Bar */}
      <TopNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setIsFormOpen(false);
          setEditingAssessment(null);
          setCurrentTab(tab);
        }}
        isOnline={isOnline}
        syncStatus={syncStatus}
        pendingMutationsCount={pendingSyncCount}
        onForceSync={handleForceSync}
        currentEvaluator={currentEvaluator}
        onUpdateEvaluator={handleUpdateEvaluator}
        contingency={contingency}
        deviceViewMode={deviceViewMode}
        onSetDeviceViewMode={setDeviceViewMode}
      />

      {/* Google Maps Quota Warning Banner (if applicable) */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Offline Connectivity Notification Banner */}
      <OfflineBanner
        isOnline={isOnline}
        pendingCount={pendingSyncCount}
        onSync={handleForceSync}
        syncStatus={syncStatus}
      />

      {/* Screen Adaptor Notification Bar if non-auto */}
      {deviceViewMode !== 'auto' && (
        <div className="bg-slate-900 border-b border-slate-800 text-slate-300 px-4 py-1.5 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>
              Adaptador activo: Vista <strong>{deviceViewMode === 'mobile' ? 'Smartphone (390px)' : deviceViewMode === 'tablet' ? 'Tablet (768px)' : 'PC (1100px)'}</strong>
            </span>
          </span>
          <button
            onClick={() => setDeviceViewMode('auto')}
            className="text-[11px] text-red-400 hover:text-red-300 font-bold underline"
          >
            Restablecer a pantalla completa (Auto)
          </button>
        </div>
      )}

      {/* Main App Container with Dynamic Screen Adaptor Max-Width */}
      <main
        className={`flex-1 w-full mx-auto p-3 sm:p-5 flex flex-col transition-all duration-300 ${
          deviceViewMode === 'mobile'
            ? 'max-w-[400px] border-x border-slate-800/80 shadow-2xl bg-slate-950'
            : deviceViewMode === 'tablet'
            ? 'max-w-[780px] border-x border-slate-800/80 shadow-2xl bg-slate-950'
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
            {/* Tab 1: Map View */}
            {currentTab === 'map' && (
              <div className="flex-1 flex flex-col space-y-4">
                {/* Quick Map Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-red-900/40 border border-red-700/60">
                      <MapPin className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">
                        Mapeo Operativo de Campo y Trazabilidad - Tepatitlán de Morelos
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        {assessments.length} afectaciones georreferenciadas &bull; Conexión directa a Google Maps
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentTab('matrix')}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-orange-400 border border-slate-700 transition"
                      title="Ver los movimientos y avance cronológico en la matriz"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Ver Movimientos Matriz</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingAssessment(null);
                        setIsFormOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-xs font-bold text-white shadow-md shadow-red-900/30 transition active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Nueva Evaluación</span>
                    </button>
                  </div>
                </div>

                {/* Map Area */}
                <div className="flex-1 min-h-[580px] h-[640px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                  <EDANGoogleMap
                    assessments={assessments}
                    contingency={contingency}
                    onUpdateContingency={handleUpdateContingency}
                    selectedAssessmentId={selectedMapAssessmentId}
                    onSelectAssessment={(item) => {
                      setPdfModalAssessment(item);
                    }}
                    onDeleteAssessment={handleDeleteAssessment}
                  />
                </div>
              </div>
            )}

            {/* Tab: Matrix & Sequential Site Movement Visualizer */}
            {currentTab === 'matrix' && (
              <div className="flex-1 space-y-5">
                <MovementMatrixVisualizer
                  assessments={assessments}
                  selectedAssessmentId={selectedMapAssessmentId}
                  onSelectAssessment={(item) => {
                    setSelectedMapAssessmentId(item.id);
                  }}
                  onNavigateToMap={(item) => {
                    setSelectedMapAssessmentId(item.id);
                    setCurrentTab('map');
                  }}
                  onDeleteAssessment={handleDeleteAssessment}
                />

                {/* Inline Map preview below the Movement Matrix */}
                <div className="rounded-2xl border border-slate-800 overflow-hidden shadow-xl min-h-[520px] h-[540px]">
                  <EDANGoogleMap
                    assessments={assessments}
                    contingency={contingency}
                    onUpdateContingency={handleUpdateContingency}
                    selectedAssessmentId={selectedMapAssessmentId}
                    onSelectAssessment={(item) => {
                      setPdfModalAssessment(item);
                    }}
                    onDeleteAssessment={handleDeleteAssessment}
                  />
                </div>
              </div>
            )}

            {/* Tab: Dedicated Evaluator Profile Section */}
            {currentTab === 'profile' && (
              <EvaluatorProfileSection
                currentEvaluator={currentEvaluator}
                onUpdateEvaluator={handleUpdateEvaluator}
                contingency={contingency}
                deviceViewMode={deviceViewMode}
                onSetDeviceViewMode={setDeviceViewMode}
              />
            )}

            {/* Tab 2: Assessments List View */}
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
                onSelectOnMap={handleSelectOnMap}
              />
            )}

            {/* Tab 3: Needs Analysis View */}
            {currentTab === 'needs' && (
              <NeedsAnalysis
                assessments={assessments}
                onUpdateNeedStatus={handleUpdateNeedStatus}
                onAddNewNeed={handleAddNewNeed}
              />
            )}

            {/* Tab 4: Real-time Traceability View */}
            {currentTab === 'routes' && (
              <RoutesTracker
                assessments={assessments}
                contingency={contingency}
                onSelectAssessment={(item) => setPdfModalAssessment(item)}
                onNavigateToMap={(item) => {
                  setSelectedMapAssessmentId(item.id);
                  setCurrentTab('map');
                }}
                onDeleteAssessment={handleDeleteAssessment}
              />
            )}

            {/* Tab 5: Backup & Offline Transfer View */}
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

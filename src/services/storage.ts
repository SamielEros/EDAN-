import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  DamageAssessment,
  InspectionRoute,
  ContingencyEvent,
  SyncMutation,
  EvaluatorProfile,
  NeedItem,
} from '../types/edan';
import { INITIAL_ASSESSMENTS, INITIAL_CONTINGENCY, INITIAL_ROUTES } from '../data/initialData';

interface EdanDB extends DBSchema {
  assessments: {
    key: string;
    value: DamageAssessment;
    indexes: { 'by-contingency': string; 'by-date': string };
  };
  routes: {
    key: string;
    value: InspectionRoute;
  };
  contingencies: {
    key: string;
    value: ContingencyEvent;
  };
  syncQueue: {
    key: string;
    value: SyncMutation;
    indexes: { 'by-timestamp': string };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'edan_tepatitlan_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<EdanDB>> | null = null;

export async function getDB(): Promise<IDBPDatabase<EdanDB>> {
  if (!dbPromise) {
    dbPromise = openDB<EdanDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('assessments')) {
          const assessStore = db.createObjectStore('assessments', { keyPath: 'id' });
          assessStore.createIndex('by-contingency', 'contingencyId');
          assessStore.createIndex('by-date', 'timestamp');
        }

        if (!db.objectStoreNames.contains('routes')) {
          db.createObjectStore('routes', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('contingencies')) {
          db.createObjectStore('contingencies', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          queueStore.createIndex('by-timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Initialize storage with initial contingency data if empty
 */
export async function initializeStorage(): Promise<void> {
  const db = await getDB();
  const existingContingency = await db.get('contingencies', INITIAL_CONTINGENCY.id);
  if (!existingContingency) {
    await db.put('contingencies', INITIAL_CONTINGENCY);

    const tx = db.transaction(['assessments', 'routes'], 'readwrite');
    for (const item of INITIAL_ASSESSMENTS) {
      await tx.objectStore('assessments').put(item);
    }
    for (const route of INITIAL_ROUTES) {
      await tx.objectStore('routes').put(route);
    }
    await tx.done;
  }
}

/**
 * Get active contingency
 */
export async function getActiveContingency(): Promise<ContingencyEvent> {
  const db = await getDB();
  const all = await db.getAll('contingencies');
  return all[0] || INITIAL_CONTINGENCY;
}

export async function saveContingency(contingency: ContingencyEvent): Promise<void> {
  const db = await getDB();
  await db.put('contingencies', contingency);
  window.dispatchEvent(new CustomEvent('edan-contingency-changed', { detail: contingency }));
}

/**
 * Get all assessments
 */
export async function getAllAssessments(): Promise<DamageAssessment[]> {
  const db = await getDB();
  const items = await db.getAll('assessments');
  // Sort descending by timestamp
  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Save an assessment locally and queue for sync
 */
export async function saveAssessmentLocal(
  assessment: DamageAssessment,
  isOnline: boolean
): Promise<DamageAssessment> {
  const db = await getDB();

  const prepared: DamageAssessment = {
    ...assessment,
    updatedAt: new Date().toISOString(),
    syncStatus: isOnline ? 'synced' : 'pending',
    version: (assessment.version || 0) + 1,
  };

  await db.put('assessments', prepared);

  // If offline, add to syncQueue
  if (!isOnline) {
    const mutation: SyncMutation = {
      id: `MUT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type: 'CREATE_ASSESSMENT',
      payload: prepared,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    await db.put('syncQueue', mutation);
  }

  // Notify components
  window.dispatchEvent(new CustomEvent('edan-assessments-changed', { detail: prepared }));

  return prepared;
}

/**
 * Delete an assessment
 */
export async function deleteAssessmentLocal(id: string, isOnline: boolean): Promise<void> {
  const db = await getDB();
  await db.delete('assessments', id);

  if (!isOnline) {
    const mutation: SyncMutation = {
      id: `MUT-DEL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type: 'DELETE_ASSESSMENT',
      payload: { id },
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    await db.put('syncQueue', mutation);
  }

  window.dispatchEvent(new CustomEvent('edan-assessments-changed'));
}

/**
 * Update single need item status across assessments
 */
export async function updateNeedStatusLocal(
  needId: string,
  newStatus: NeedItem['status'],
  deliveredCount?: number,
  isOnline: boolean = true
): Promise<void> {
  const db = await getDB();
  const assessments = await db.getAll('assessments');

  for (const assess of assessments) {
    let modified = false;
    const updatedNeeds = assess.needs.map((item) => {
      if (item.id === needId) {
        modified = true;
        return {
          ...item,
          status: newStatus,
          quantityDelivered: deliveredCount !== undefined ? deliveredCount : item.quantityDelivered,
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    if (modified) {
      assess.needs = updatedNeeds;
      await saveAssessmentLocal(assess, isOnline);
      break;
    }
  }
}

/**
 * Get all routes
 */
export async function getAllRoutes(): Promise<InspectionRoute[]> {
  const db = await getDB();
  return db.getAll('routes');
}

export async function saveRouteLocal(route: InspectionRoute): Promise<void> {
  const db = await getDB();
  await db.put('routes', route);
  window.dispatchEvent(new CustomEvent('edan-routes-changed', { detail: route }));
}

/**
 * Sync Queue methods
 */
export async function getSyncQueueItems(): Promise<SyncMutation[]> {
  const db = await getDB();
  return db.getAll('syncQueue');
}

export async function clearSyncQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('syncQueue', id);
}

/**
 * Current Evaluator Profile (persisted locally on device)
 */
export async function getStoredEvaluatorProfile(): Promise<EvaluatorProfile> {
  const db = await getDB();
  const stored = await db.get('settings', 'currentEvaluator');
  if (stored && stored.value) {
    return stored.value;
  }
  const defaultEvaluator: EvaluatorProfile = {
    id: `EVAL-${Math.floor(1000 + Math.random() * 9000)}`,
    name: 'Evaluador de Campo EDAN',
    credential: 'CRM-TEPA-VOL',
    radioCallsign: 'Unidad-Tepa-Móvil',
    phone: '378-000-0000',
    role: 'Evaluador de Campo',
  };
  await saveStoredEvaluatorProfile(defaultEvaluator);
  return defaultEvaluator;
}

export async function saveStoredEvaluatorProfile(profile: EvaluatorProfile): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key: 'currentEvaluator', value: profile });
}

/**
 * Export complete database as JSON for physical transfer in zero-signal areas
 */
export async function exportDatabaseBackup(): Promise<string> {
  const assessments = await getAllAssessments();
  const routes = await getAllRoutes();
  const contingency = await getActiveContingency();

  const backup = {
    exportedAt: new Date().toISOString(),
    system: 'EDAN Tepatitlán - Sistema Offline',
    contingency,
    assessments,
    routes,
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Export assessments as CSV spreadsheet
 */
export async function exportAssessmentsCSV(): Promise<string> {
  const assessments = await getAllAssessments();
  const headers = [
    'Folio',
    'Fecha_Hora',
    'Comunidad',
    'Direccion',
    'Sector',
    'Severidad',
    'Evaluador',
    'Distintivo_Radio',
    'Familias_Afectadas',
    'Personas_Lesionadas',
    'Viviendas_Inhabitables',
    'Latitud',
    'Longitud',
    'Descripcion_Danio',
    'Acciones_Tomadas',
    'Necesidades_Count',
    'Google_Maps_GPS_URL',
  ];

  const rows = assessments.map((a) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${a.location.lat},${a.location.lng}`;
    return [
      `"${a.folio || ''}"`,
      `"${a.timestamp || ''}"`,
      `"${(a.location.community || '').replace(/"/g, '""')}"`,
      `"${(a.location.streetAddress || '').replace(/"/g, '""')}"`,
      `"${a.sector || ''}"`,
      `"${a.severity || ''}"`,
      `"${(a.evaluator?.name || '').replace(/"/g, '""')}"`,
      `"${a.evaluator?.radioCallsign || ''}"`,
      a.affectedPopulation?.familiesAffected || 0,
      a.affectedPopulation?.peopleInjured || 0,
      a.affectedPopulation?.homesInhabitable || 0,
      a.location.lat,
      a.location.lng,
      `"${(a.damageDescription || '').replace(/"/g, '""')}"`,
      `"${(a.actionsTaken || '').replace(/"/g, '""')}"`,
      a.needs?.length || 0,
      `"${mapsUrl}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Export assessments as standard GeoJSON FeatureCollection
 */
export async function exportAssessmentsGeoJSON(): Promise<string> {
  const assessments = await getAllAssessments();
  const features = assessments.map((a) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [a.location.lng, a.location.lat],
    },
    properties: {
      id: a.id,
      folio: a.folio,
      timestamp: a.timestamp,
      community: a.location.community,
      streetAddress: a.location.streetAddress,
      sector: a.sector,
      severity: a.severity,
      evaluatorName: a.evaluator?.name,
      evaluatorCallsign: a.evaluator?.radioCallsign,
      familiesAffected: a.affectedPopulation?.familiesAffected,
      peopleInjured: a.affectedPopulation?.peopleInjured,
      homesInhabitable: a.affectedPopulation?.homesInhabitable,
      damageDescription: a.damageDescription,
      actionsTaken: a.actionsTaken,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${a.location.lat},${a.location.lng}`,
    },
  }));

  const geojson = {
    type: 'FeatureCollection',
    name: 'EDAN_Tepatitlan_Evaluaciones_Desastre',
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
    },
    features,
  };

  return JSON.stringify(geojson, null, 2);
}

/**
 * Import database JSON
 */
export async function importDatabaseBackup(jsonString: string): Promise<number> {
  const parsed = JSON.parse(jsonString);
  const db = await getDB();

  let count = 0;
  if (parsed.assessments && Array.isArray(parsed.assessments)) {
    const tx = db.transaction('assessments', 'readwrite');
    for (const item of parsed.assessments) {
      await tx.store.put(item);
      count++;
    }
    await tx.done;
  }

  if (parsed.routes && Array.isArray(parsed.routes)) {
    const tx = db.transaction('routes', 'readwrite');
    for (const route of parsed.routes) {
      await tx.store.put(route);
    }
    await tx.done;
  }

  if (parsed.contingency) {
    await db.put('contingencies', parsed.contingency);
  }

  window.dispatchEvent(new CustomEvent('edan-assessments-changed'));
  window.dispatchEvent(new CustomEvent('edan-routes-changed'));
  return count;
}

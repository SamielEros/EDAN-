/**
 * EDAN (Evaluación de Daños y Análisis de Necesidades) Type Definitions
 * Sistema de Respuesta ante Contingencias - Tepatitlán de Morelos
 */

export type DamageSeverity = 'Leve' | 'Moderado' | 'Grave' | 'Destrucción Total';

export type DamageSector =
  | 'Vivienda y Asentamientos'
  | 'Salud y Atención Médica'
  | 'Infraestructura y Vías'
  | 'Agua y Saneamiento'
  | 'Servicios Básicos (Luz/Gas/Com)'
  | 'Educativo y Comunitario'
  | 'Comercial e Industrial';

export type LifelineStatus =
  | 'Normal'
  | 'Interrumpido'
  | 'Afectado Parcial'
  | 'Crítico'
  | 'Libre'
  | 'Parcialmente Bloqueado'
  | 'Inaccesible'
  | 'Operativo'
  | 'Intermitente';

export interface EvaluatorProfile {
  id: string;
  name: string;
  credential: string;
  radioCallsign: string;
  phone: string;
  role: 'Coordinador EDAN' | 'Evaluador de Campo' | 'Logística y Suministros' | 'Enlace Operativo';
}

export interface DamagePhoto {
  id: string;
  dataUrl: string;
  caption: string;
  timestamp: string;
  damageType: string;
}

export interface AudioNote {
  id: string;
  dataUrl: string;
  durationSeconds: number;
  title: string;
  timestamp: string;
}

export interface TechnicalDocument {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
  type: string;
  timestamp: string;
}

export type NeedCategory =
  | 'Alimentaria y Agua'
  | 'Salud e Insumos Médicos'
  | 'Alojamiento y Refugio'
  | 'Agua y Saneamiento (WASH)'
  | 'Búsqueda y Rescate (USAR)'
  | 'Maquinaria y Despeje'
  | 'Seguridad y Apoyo Psicosocial';

export type NeedPriority = 'Crítica (<6h)' | 'Alta (<24h)' | 'Media (<72h)' | 'Baja';

export type NeedStatus = 'Pendiente' | 'En Gestión' | 'En Tránsito' | 'Entregado';

export interface NeedItem {
  id: string;
  assessmentId?: string;
  category: NeedCategory;
  itemDescription: string;
  quantityRequired: number;
  quantityDelivered: number;
  unit: 'Kits' | 'Piezas' | 'Litros' | 'Raciones' | 'Unidades' | 'Horas/Equipo' | 'Lonas';
  priority: NeedPriority;
  status: NeedStatus;
  notes?: string;
  updatedAt: string;
}

export interface AffectedPopulation {
  familiesAffected: number;
  peopleAffected?: number; // Número de personas afectadas (censo directo)
  peopleInjured: number;
  peopleMissing: number;
  peopleDeceased: number;
  vulnerableGroups: {
    pregnant: number;
    children: number;
    elderly: number;
    disabled: number;
  };
  homesDamaged: number;
  homesInhabitable: number;
}

export interface LifelinesMatrix {
  waterSupply: LifelineStatus;
  electricity: LifelineStatus;
  roadAccess: LifelineStatus;
  telecom: LifelineStatus;
  drainage: LifelineStatus;
}

export interface DamageAssessment {
  id: string;
  folio: string;
  contingencyId: string;
  evaluator: EvaluatorProfile;
  timestamp: string;
  location: {
    community: string;
    neighborhood?: string; // Colonia o barrio ingresado manualmente
    streetAddress: string;
    reference: string;
    lat: number;
    lng: number;
    accuracyMeters?: number;
  };
  sector: DamageSector;
  severity: DamageSeverity;
  affectedPopulation: AffectedPopulation;
  lifelines: LifelinesMatrix;
  damageDescription: string;
  actionsTaken: string;
  attachments: {
    photos: DamagePhoto[];
    audios: AudioNote[];
    documents: TechnicalDocument[];
  };
  needs: NeedItem[];
  routeOrder: number;
  syncStatus: 'synced' | 'pending';
  updatedAt: string;
  version: number;
}

export interface ContingencyEvent {
  id: string;
  name: string;
  type: 'Inundación / Desbordamiento' | 'Sismo / Terremoto' | 'Incendio Urbano / Químico' | 'Deslave / Falla Geológica' | 'Explosión' | 'Evento Meteorológico Extremo';
  startDate: string;
  locationScope: string;
  status: 'Activa' | 'En Evaluación' | 'Fase de Recuperación' | 'Cerrada';
  commandPostLocation: {
    name: string;
    lat: number;
    lng: number;
  };
  leadCoordinator: string;
  summary: string;
}

export interface RouteWaypoint {
  id: string;
  order: number;
  name: string;
  community: string;
  lat: number;
  lng: number;
  assessmentId?: string;
  completed: boolean;
  notes?: string;
}

export interface InspectionRoute {
  id: string;
  name: string;
  code: string;
  assignedTeam: string;
  color: string;
  waypoints: RouteWaypoint[];
  status: 'Planeada' | 'En Progreso' | 'Completada';
  updatedAt: string;
}

export interface SyncMutation {
  id: string;
  type: 'CREATE_ASSESSMENT' | 'UPDATE_ASSESSMENT' | 'DELETE_ASSESSMENT' | 'UPDATE_NEED';
  payload: any;
  timestamp: string;
  retryCount: number;
}

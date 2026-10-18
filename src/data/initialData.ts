import { ContingencyEvent, DamageAssessment, InspectionRoute } from '../types/edan';

export const INITIAL_CONTINGENCY: ContingencyEvent = {
  id: 'CONT-TEPA-2026-01',
  name: 'Contingencia Hidrometeorológica - Río Tepatitlán',
  type: 'Inundación / Desbordamiento',
  startDate: new Date().toISOString(),
  locationScope: 'Cuenca Río Tepatitlán, Col. Popotes, Centro, La Gloria y zona conurbada',
  status: 'Activa',
  commandPostLocation: {
    name: 'Puesto de Mando Unificado - Parque Bicentenario Tepatitlán',
    lat: 20.8194,
    lng: -102.7628,
  },
  leadCoordinator: 'Coord. Juan Pablo Gómez R. (EDAN Tepatitlán)',
  summary: 'Operativo EDAN en Tepatitlán de Morelos para evaluación y respuesta coordinada en campo.',
};

// Start completely clean: no practice assessments, only real assessments registered by user
export const INITIAL_ASSESSMENTS: DamageAssessment[] = [];

// Clean routes list
export const INITIAL_ROUTES: InspectionRoute[] = [];

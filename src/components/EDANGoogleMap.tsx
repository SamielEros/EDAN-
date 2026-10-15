import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  ExternalLink,
  Share2,
  Copy,
  Check,
  AlertTriangle,
  FileText,
  Navigation,
  Globe,
  Radio,
  Layers,
  ChevronRight,
  Crosshair,
  Satellite,
  Map as MapIcon,
  AlertCircle,
  Trash2,
  Activity,
  Compass,
  Edit3,
  X,
  Save,
} from 'lucide-react';
import { ContingencyEvent, DamageAssessment, InspectionRoute } from '../types/edan';

// Haversine formula to compute distance in km between two GPS coordinates
function computeDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate direct Google Maps single navigation URL
export function generateGoogleMapsSingleUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

// Generate Google Maps Multi-Waypoint Route URL
export function generateGoogleMapsRouteUrl(assessments: DamageAssessment[]): string {
  if (assessments.length === 0) {
    return 'https://www.google.com/maps/search/?api=1&query=20.8167,-102.7667';
  }

  const sorted = [...assessments].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const origin = `${sorted[0].location.lat},${sorted[0].location.lng}`;
  const destination = `${sorted[sorted.length - 1].location.lat},${sorted[sorted.length - 1].location.lng}`;

  if (sorted.length <= 2) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  }

  const waypoints = sorted
    .slice(1, -1)
    .slice(0, 8)
    .map((item) => `${item.location.lat},${item.location.lng}`)
    .join('|');

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encodeURIComponent(
    waypoints
  )}&travelmode=driving`;
}

const DEFAULT_CENTER = { lat: 20.8167, lng: -102.7667 };

interface EDANGoogleMapProps {
  assessments: DamageAssessment[];
  routes?: InspectionRoute[];
  contingency: ContingencyEvent;
  onUpdateContingency?: (contingency: ContingencyEvent) => void;
  selectedAssessmentId?: string | null;
  onSelectAssessment?: (assessment: DamageAssessment) => void;
  onDeleteAssessment?: (id: string) => void;
  isPinDropMode?: boolean;
  pinCoordinates?: { lat: number; lng: number };
  onPinChange?: (coords: { lat: number; lng: number }) => void;
}

// Error Boundary around Google Maps rendering
interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
  onError?: () => void;
}
class GoogleMapsErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.warn('[GoogleMapsErrorBoundary caught error]', err);
    this.props.onError?.();
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Declarative Polyline renderer for Chronological Trace in Google Maps
function TracePolyline({
  path,
  color,
  title,
}: {
  path: { lat: number; lng: number }[];
  color: string;
  title?: string;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || path.length < 2) return;

    const line = new mapsLib.Polyline({
      path,
      strokeColor: color,
      strokeOpacity: 0.9,
      strokeWeight: 4,
      map,
    });

    return () => {
      line.setMap(null);
    };
  }, [map, mapsLib, path, color]);

  return null;
}

// Map Click Handler in Google Maps
function MapEventsHandler({
  isPinDropMode,
  onPinChange,
  isPmuPlacementMode,
  onPmuPlace,
}: {
  isPinDropMode?: boolean;
  onPinChange?: (coords: { lat: number; lng: number }) => void;
  isPmuPlacementMode?: boolean;
  onPmuPlace?: (coords: { lat: number; lng: number }) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const listener = map.addListener('click', (e: any) => {
      if (!e.latLng) return;
      const coords = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };

      if (isPmuPlacementMode && onPmuPlace) {
        onPmuPlace(coords);
      } else if (isPinDropMode && onPinChange) {
        onPinChange(coords);
      }
    });

    return () => {
      listener.remove();
    };
  }, [map, isPinDropMode, onPinChange, isPmuPlacementMode, onPmuPlace]);

  return null;
}

// Camera Control Helper in Google Maps
function CameraController({
  target,
  zoom,
}: {
  target: { lat: number; lng: number } | null;
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (map && target) {
      map.panTo(target);
      if (zoom) map.setZoom(zoom);
    }
  }, [map, target, zoom]);

  return null;
}

// ==========================================
// TACTICAL LEAFLET RESILIENT MAP ENGINE
// ==========================================
interface TacticalLeafletMapProps {
  assessments: DamageAssessment[];
  contingency: ContingencyEvent;
  selectedAssessmentId?: string | null;
  onSelectAssessment?: (assessment: DamageAssessment) => void;
  onDeleteAssessment?: (id: string) => void;
  isPinDropMode?: boolean;
  pinCoordinates?: { lat: number; lng: number };
  onPinChange?: (coords: { lat: number; lng: number }) => void;
  isPmuPlacementMode?: boolean;
  onPmuChange?: (coords: { lat: number; lng: number }) => void;
  showAssessmentTrace: boolean;
  userLocation: { lat: number; lng: number } | null;
  userAccuracy: number | null;
  cameraTarget: { lat: number; lng: number } | null;
  tileStyle: 'osm' | 'sat' | 'dark';
}

function TacticalLeafletMap({
  assessments,
  contingency,
  selectedAssessmentId,
  onSelectAssessment,
  onDeleteAssessment,
  isPinDropMode,
  pinCoordinates,
  onPinChange,
  isPmuPlacementMode,
  onPmuChange,
  showAssessmentTrace,
  userLocation,
  userAccuracy,
  cameraTarget,
  tileStyle,
}: TacticalLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const traceLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.LayerGroup | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
      zoom: 14,
      zoomControl: true,
    });

    const markersGroup = L.layerGroup().addTo(map);
    const traceGroup = L.layerGroup().addTo(map);
    const userGroup = L.layerGroup().addTo(map);

    markersLayerRef.current = markersGroup;
    traceLayerRef.current = traceGroup;
    userMarkerRef.current = userGroup;
    mapRef.current = map;

    // Click listener
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (isPmuPlacementMode && onPmuChange) {
        onPmuChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      } else if (isPinDropMode && onPinChange) {
        onPinChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    // Invalidate size to ensure crisp rendering
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map click handler when modes change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.off('click');
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (isPmuPlacementMode && onPmuChange) {
        onPmuChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      } else if (isPinDropMode && onPinChange) {
        onPinChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });
  }, [isPmuPlacementMode, onPmuChange, isPinDropMode, onPinChange]);

  // Update Tile Layer based on tileStyle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let maxZoom = 19;
    let attribution = '&copy; OpenStreetMap | EDAN Tepatitlán Operativo';

    if (tileStyle === 'sat') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 19;
      attribution = 'Esri World Imagery | Cruz Roja Delegación Tepatitlán';
    } else if (tileStyle === 'dark') {
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
      maxZoom = 19;
      attribution = '&copy; CartoDB &copy; OpenStreetMap';
    }

    const newLayer = L.tileLayer(url, { maxZoom, attribution }).addTo(map);
    tileLayerRef.current = newLayer;
  }, [tileStyle]);

  // Pan to cameraTarget when it changes
  useEffect(() => {
    if (mapRef.current && cameraTarget) {
      mapRef.current.panTo([cameraTarget.lat, cameraTarget.lng]);
    }
  }, [cameraTarget]);

  // Invalidate size on container resize
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(t);
  }, []);

  // Update Pin Drop Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isPinDropMode && pinCoordinates) {
      if (pinMarkerRef.current) {
        pinMarkerRef.current.setLatLng([pinCoordinates.lat, pinCoordinates.lng]);
      } else {
        const pinIcon = L.divIcon({
          className: 'custom-pin-drop',
          html: `
            <div style="width: 32px; height: 32px; background: #dc2626; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid #ffffff; box-shadow: 0 0 15px rgba(220,38,38,0.9); display: flex; align-items: center; justify-content: center;">
              <div style="width: 10px; height: 10px; background: #ffffff; border-radius: 50%;"></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        const marker = L.marker([pinCoordinates.lat, pinCoordinates.lng], {
          icon: pinIcon,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', (e) => {
          const latlng = (e.target as L.Marker).getLatLng();
          if (onPinChange) {
            onPinChange({ lat: latlng.lat, lng: latlng.lng });
          }
        });

        pinMarkerRef.current = marker;
      }
    } else {
      if (pinMarkerRef.current) {
        map.removeLayer(pinMarkerRef.current);
        pinMarkerRef.current = null;
      }
    }
  }, [isPinDropMode, pinCoordinates, onPinChange]);

  // Update Assessments and PMU
  useEffect(() => {
    const map = mapRef.current;
    const group = markersLayerRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // Command Post (PMU) - Draggable Manual Placement
    if (contingency.commandPostLocation) {
      const pmu = contingency.commandPostLocation;
      const pmuIcon = L.divIcon({
        className: 'pmu-marker',
        html: `
          <div style="background: #991b1b; color: white; border: 2px solid white; border-radius: 8px; padding: 2px 7px; font-size: 10px; font-weight: 900; box-shadow: 0 4px 12px rgba(0,0,0,0.7); display: flex; align-items: center; gap: 4px; white-space: nowrap; cursor: grab;">
            <span>🚨 PMU Tepatitlán</span>
          </div>
        `,
        iconSize: [95, 24],
        iconAnchor: [47, 12],
      });

      const pmuMarker = L.marker([pmu.lat, pmu.lng], {
        icon: pmuIcon,
        draggable: true,
      });

      pmuMarker.on('dragend', (e: any) => {
        const latlng = e.target.getLatLng();
        if (onPmuChange) {
          onPmuChange({ lat: latlng.lat, lng: latlng.lng });
        }
      });

      pmuMarker
        .bindPopup(`
          <div style="color: #0f172a; font-family: sans-serif; font-size: 12px;">
            <strong style="color: #991b1b;">🚨 Puesto de Mando Unificado (PMU)</strong><br/>
            <div style="font-weight: bold; margin: 3px 0;">${pmu.name}</div>
            <div style="font-size: 10px; color: #64748b; font-family: monospace;">GPS: ${pmu.lat.toFixed(5)}, ${pmu.lng.toFixed(5)}</div>
            <div style="font-size: 10px; color: #059669; font-weight: bold; margin-top: 4px;">
              📍 Arrastre el marcador en el mapa para reubicar manualmente el PMU
            </div>
          </div>
        `)
        .addTo(group);
    }

    // Damage Assessments
    const sorted = [...assessments].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    sorted.forEach((item, idx) => {
      let bg = '#16a34a'; // Leve
      if (item.severity === 'Moderado') bg = '#eab308';
      if (item.severity === 'Grave') bg = '#ea580c';
      if (item.severity === 'Destrucción Total') bg = '#dc2626';

      const isSelected = selectedAssessmentId === item.id;
      const size = isSelected ? 32 : 24;

      const customIcon = L.divIcon({
        className: 'custom-assessment-marker',
        html: `
          <div style="width: ${size}px; height: ${size}px; background: ${bg}; border-radius: 50%; border: ${
          isSelected ? '3px solid #ffffff' : '2px solid #ffffff'
        }; box-shadow: 0 4px 10px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: ${
          isSelected ? '12px' : '10px'
        }; font-family: monospace;">
            ${idx + 1}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([item.location.lat, item.location.lng], { icon: customIcon }).addTo(group);

      marker.on('click', () => {
        if (onSelectAssessment) onSelectAssessment(item);
      });

      const navUrl = generateGoogleMapsSingleUrl(item.location.lat, item.location.lng);

      const popupHtml = `
        <div style="font-family: sans-serif; min-width: 190px; color: #0f172a;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-family: monospace; font-size: 11px; font-weight: bold; background: #e2e8f0; padding: 2px 5px; border-radius: 4px;">#${idx + 1} ${item.folio}</span>
            <span style="font-size: 10px; font-weight: bold; color: ${bg};">${item.severity}</span>
          </div>
          <h4 style="margin: 0 0 2px 0; font-size: 13px; font-weight: bold; color: #0f172a;">${item.location.community}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #475569;">${item.location.streetAddress}</p>
          <div style="background: #f1f5f9; padding: 6px; border-radius: 6px; font-size: 11px; margin-bottom: 6px; color: #1e293b;">
            ${item.damageDescription}
          </div>
          ${item.actionsTaken ? `<div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 4px 6px; border-radius: 4px; font-size: 10px; color: #065f46; margin-bottom: 6px;"><strong>Acción:</strong> ${item.actionsTaken}</div>` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-bottom: 8px;">
            <span>Familias: <b>${item.affectedPopulation.familiesAffected}</b></span>
            <span>Lesionados: <b>${item.affectedPopulation.peopleInjured}</b></span>
            <span>Inhabitables: <b>${item.affectedPopulation.homesInhabitable}</b></span>
          </div>
          <a href="${navUrl}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; background: #2563eb; color: #ffffff; text-decoration: none; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; margin-bottom: 4px;">
            🌐 Navegar en Google Maps GPS
          </a>
          ${onDeleteAssessment ? `
            <button onclick="if(confirm('¿Eliminar definitivamente la evaluación ${item.folio} (${item.location.community}) del mapa y del sistema?')){ if(window.__edan_delete_assessment) window.__edan_delete_assessment('${item.id}'); }" style="width: 100%; border: 1px solid #fca5a5; background: #fef2f2; color: #b91c1c; padding: 5px; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
              🗑️ Eliminar Definitivamente
            </button>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupHtml);
      if (isSelected) {
        marker.openPopup();
      }
    });

    (window as any).__edan_delete_assessment = onDeleteAssessment;
  }, [assessments, contingency, selectedAssessmentId, onDeleteAssessment, onSelectAssessment, onPmuChange]);

  // Update Chronological Traceability Polyline
  useEffect(() => {
    const map = mapRef.current;
    const group = traceLayerRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (!showAssessmentTrace || assessments.length < 2) return;

    const sorted = [...assessments].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const latlngs: [number, number][] = sorted.map((a) => [a.location.lat, a.location.lng]);

    L.polyline(latlngs, {
      color: '#ea580c',
      weight: 4,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(group);
  }, [assessments, showAssessmentTrace]);

  // Update Live User Geolocation Dot
  useEffect(() => {
    const map = mapRef.current;
    const group = userMarkerRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (userLocation) {
      const userDot = L.divIcon({
        className: 'user-location-dot',
        html: `
          <div style="width: 16px; height: 16px; background: #0284c7; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(2,132,199,0.9);"></div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      L.marker([userLocation.lat, userLocation.lng], { icon: userDot })
        .bindPopup('<strong>Mi Ubicación GPS en Campo</strong>')
        .addTo(group);

      if (userAccuracy && userAccuracy < 500) {
        L.circle([userLocation.lat, userLocation.lng], {
          radius: userAccuracy,
          color: '#38bdf8',
          weight: 1,
          opacity: 0.6,
          fillColor: '#38bdf8',
          fillOpacity: 0.1,
        }).addTo(group);
      }
    }
  }, [userLocation, userAccuracy]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative ${isPmuPlacementMode ? 'cursor-crosshair' : ''}`}
      style={{ minHeight: '100%', minWidth: '100%', background: '#0f172a' }}
    />
  );
}

// ==========================================
// MAIN EDAN HYBRID INTERACTIVE MAP COMPONENT
// ==========================================
export const EDANGoogleMap: React.FC<EDANGoogleMapProps> = ({
  assessments,
  contingency,
  onUpdateContingency,
  selectedAssessmentId,
  onSelectAssessment,
  onDeleteAssessment,
  isPinDropMode,
  pinCoordinates,
  onPinChange,
}) => {
  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    'AIzaSyAUmvQKUTmJkCiH60XmKi6XwUzTbMShqqI';

  // Map Engine State: 'google' or 'tactical'
  const [mapEngine, setMapEngine] = useState<'google' | 'tactical'>('google');
  const [googleMapsFailed, setGoogleMapsFailed] = useState(false);

  // Layer & Display States
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [showAssessmentTrace, setShowAssessmentTrace] = useState(true);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [tacticalTileStyle, setTacticalTileStyle] = useState<'osm' | 'sat' | 'dark'>('osm');

  // Manual PMU Placement & Configuration States
  const [isPmuPlacementMode, setIsPmuPlacementMode] = useState(false);
  const [showPmuModal, setShowPmuModal] = useState(false);
  const [pmuNameInput, setPmuNameInput] = useState(
    contingency.commandPostLocation?.name || 'Puesto de Mando Unificado - Cruz Roja Tepatitlán'
  );
  const [pmuLatInput, setPmuLatInput] = useState(
    contingency.commandPostLocation?.lat.toString() || '20.8167'
  );
  const [pmuLngInput, setPmuLngInput] = useState(
    contingency.commandPostLocation?.lng.toString() || '-102.7667'
  );

  // Sync inputs with contingency
  useEffect(() => {
    if (contingency.commandPostLocation) {
      setPmuNameInput(contingency.commandPostLocation.name);
      setPmuLatInput(contingency.commandPostLocation.lat.toString());
      setPmuLngInput(contingency.commandPostLocation.lng.toString());
    }
  }, [contingency]);

  // Geolocation & Navigation States
  const [selectedItem, setSelectedItem] = useState<DamageAssessment | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [showTraceabilityLog, setShowTraceabilityLog] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [locationErrorNotice, setLocationErrorNotice] = useState<string | null>(null);

  // Watch position id ref
  const watchIdRef = useRef<number | null>(null);

  // Listen to Google Maps quota exceeded or auth failure events
  useEffect(() => {
    const handleQuotaExceeded = () => {
      console.warn('[EDANGoogleMap] Google Maps quota reached or auth failure. Switching to tactical engine.');
      setGoogleMapsFailed(true);
      setMapEngine('tactical');
    };

    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  // Focus on selected assessment if specified from props
  useEffect(() => {
    if (selectedAssessmentId) {
      const match = assessments.find((a) => a.id === selectedAssessmentId);
      if (match) {
        setSelectedItem(match);
        setCameraTarget({ lat: match.location.lat, lng: match.location.lng });
      }
    }
  }, [selectedAssessmentId, assessments]);

  // Clean up live geolocation on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Filter assessments
  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      if (filterSeverity === 'all') return true;
      return a.severity === filterSeverity;
    });
  }, [assessments, filterSeverity]);

  // Chronologically sorted assessments for route traceability
  const sortedTraceAssessments = useMemo(() => {
    return [...filteredAssessments].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [filteredAssessments]);

  // Trajectory coordinates connecting all registered damage assessments in chronological sequence
  const assessmentTraceCoords = useMemo(() => {
    return sortedTraceAssessments.map((a) => ({
      lat: a.location.lat,
      lng: a.location.lng,
    }));
  }, [sortedTraceAssessments]);

  // Total trajectory distance in km
  const totalTrajectoryKm = useMemo(() => {
    let total = 0;
    for (let i = 0; i < assessmentTraceCoords.length - 1; i++) {
      total += computeDistanceKm(
        assessmentTraceCoords[i].lat,
        assessmentTraceCoords[i].lng,
        assessmentTraceCoords[i + 1].lat,
        assessmentTraceCoords[i + 1].lng
      );
    }
    return total.toFixed(2);
  }, [assessmentTraceCoords]);

  // Distance from PMU to current camera target or selected assessment
  const distanceToPmuKm = useMemo(() => {
    if (!contingency.commandPostLocation || !selectedItem) return null;
    return computeDistanceKm(
      contingency.commandPostLocation.lat,
      contingency.commandPostLocation.lng,
      selectedItem.location.lat,
      selectedItem.location.lng
    ).toFixed(2);
  }, [contingency.commandPostLocation, selectedItem]);

  // Geolocation Handlers
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationErrorNotice('La geolocalización no es compatible con este navegador.');
      return;
    }

    setIsLocating(true);
    setLocationErrorNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        setUserAccuracy(pos.coords.accuracy);
        setCameraTarget(coords);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setLocationErrorNotice('No se pudo obtener la posición GPS. Verifique los permisos de ubicación.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleToggleLiveTracking = () => {
    if (isLiveTracking) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsLiveTracking(false);
    } else {
      if (!navigator.geolocation) return;
      setIsLiveTracking(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserLocation(coords);
          setUserAccuracy(pos.coords.accuracy);
        },
        () => setIsLiveTracking(false),
        { enableHighAccuracy: true }
      );
    }
  };

  // Center on Command Post (PMU)
  const handleCenterPmu = () => {
    if (contingency.commandPostLocation) {
      setCameraTarget({
        lat: contingency.commandPostLocation.lat,
        lng: contingency.commandPostLocation.lng,
      });
    }
  };

  // Manual PMU Placement Handler (Click on map or drag)
  const handlePmuPlace = (coords: { lat: number; lng: number }) => {
    if (onUpdateContingency) {
      const updated: ContingencyEvent = {
        ...contingency,
        commandPostLocation: {
          name: contingency.commandPostLocation?.name || 'Puesto de Mando Unificado - Tepatitlán',
          lat: coords.lat,
          lng: coords.lng,
        },
      };
      onUpdateContingency(updated);
      setIsPmuPlacementMode(false);
      setCameraTarget(coords);
    }
  };

  // Save PMU Details from Modal
  const handleSavePmuModal = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(pmuLatInput);
    const lng = parseFloat(pmuLngInput);

    if (isNaN(lat) || isNaN(lng)) {
      alert('Las coordenadas ingresadas no son válidas.');
      return;
    }

    if (onUpdateContingency) {
      const updated: ContingencyEvent = {
        ...contingency,
        commandPostLocation: {
          name: pmuNameInput.trim() || 'Puesto de Mando Unificado - Tepatitlán',
          lat,
          lng,
        },
      };
      onUpdateContingency(updated);
      setShowPmuModal(false);
      setCameraTarget({ lat, lng });
    }
  };

  // Capture device GPS for PMU
  const handleCaptureGpsForPmu = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPmuLatInput(pos.coords.latitude.toFixed(5));
          setPmuLngInput(pos.coords.longitude.toFixed(5));
        },
        () => alert('No se pudo obtener la posición GPS del dispositivo.')
      );
    }
  };

  // Copy Google Maps Route URL
  const handleCopyRouteUrl = () => {
    const url = generateGoogleMapsRouteUrl(filteredAssessments);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    const url = generateGoogleMapsRouteUrl(filteredAssessments);
    const text = encodeURIComponent(
      `🚨 *RUTA Y TRAZABILIDAD OPERATIVA EDAN TEPATITLÁN*\n` +
      `Contingencia: ${contingency.name}\n` +
      `Total Sitios Evaluados: ${filteredAssessments.length}\n` +
      `Trayectoria Acumulada: ${totalTrajectoryKm} km\n` +
      `PMU: ${contingency.commandPostLocation?.name || 'Cruz Roja Tepatitlán'}\n\n` +
      `Ver ruta en Google Maps GPS:\n${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Fallback & Loading Notices */}
      {locationErrorNotice && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-50 bg-amber-950/90 border border-amber-600 text-amber-200 px-4 py-1.5 rounded-full text-xs shadow-xl flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{locationErrorNotice}</span>
          <button onClick={() => setLocationErrorNotice(null)} className="ml-1 text-amber-400 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Floating Notice when PMU Placement Mode is Active */}
      {isPmuPlacementMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-red-950/95 border-2 border-red-500 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-pulse">
          <Radio className="w-5 h-5 text-red-400" />
          <div>
            <div className="text-xs font-black">MODO COLOCACIÓN MANUAL DE PMU ACTIVO</div>
            <div className="text-[11px] text-red-200">
              Haz clic en cualquier punto del mapa para colocar el Puesto de Mando Unificado
            </div>
          </div>
          <button
            onClick={() => setIsPmuPlacementMode(false)}
            className="ml-2 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold border border-slate-600 transition"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Map Engine Viewport */}
      <div className="relative flex-1 w-full h-full">
        {mapEngine === 'google' && !googleMapsFailed ? (
          <GoogleMapsErrorBoundary
            fallback={
              <TacticalLeafletMap
                assessments={filteredAssessments}
                contingency={contingency}
                selectedAssessmentId={selectedItem?.id}
                onSelectAssessment={(item) => {
                  setSelectedItem(item);
                  if (onSelectAssessment) onSelectAssessment(item);
                }}
                onDeleteAssessment={onDeleteAssessment}
                isPinDropMode={isPinDropMode}
                pinCoordinates={pinCoordinates}
                onPinChange={onPinChange}
                isPmuPlacementMode={isPmuPlacementMode}
                onPmuChange={handlePmuPlace}
                showAssessmentTrace={showAssessmentTrace}
                userLocation={userLocation}
                userAccuracy={userAccuracy}
                cameraTarget={cameraTarget}
                tileStyle={tacticalTileStyle}
              />
            }
            onError={() => {
              setGoogleMapsFailed(true);
              setMapEngine('tactical');
            }}
          >
            <APIProvider apiKey={apiKey}>
              <Map
                mapId="edan-emergency-map"
                defaultCenter={DEFAULT_CENTER}
                defaultZoom={14}
                gestureHandling="greedy"
                disableDefaultUI={false}
                mapTypeId={mapTypeId}
                className={`w-full h-full ${isPmuPlacementMode ? 'cursor-crosshair' : ''}`}
              >
                {/* Click & Camera Handlers */}
                <MapEventsHandler
                  isPinDropMode={isPinDropMode}
                  onPinChange={onPinChange}
                  isPmuPlacementMode={isPmuPlacementMode}
                  onPmuPlace={handlePmuPlace}
                />
                <CameraController target={cameraTarget} zoom={15} />

                {/* Chronological Traceability Polyline */}
                {showAssessmentTrace && assessmentTraceCoords.length >= 2 && (
                  <TracePolyline
                    path={assessmentTraceCoords}
                    color="#ea580c"
                    title="Trazabilidad Cronológica de Evaluaciones en Campo"
                  />
                )}

                {/* Command Post (PMU) - Draggable Manual Placement */}
                {contingency.commandPostLocation && (
                  <AdvancedMarker
                    position={{
                      lat: contingency.commandPostLocation.lat,
                      lng: contingency.commandPostLocation.lng,
                    }}
                    title={contingency.commandPostLocation.name}
                    gmpDraggable={true}
                    onDragEnd={(e: any) => {
                      if (e.latLng) {
                        handlePmuPlace({
                          lat: e.latLng.lat(),
                          lng: e.latLng.lng(),
                        });
                      }
                    }}
                    onClick={() => setShowPmuModal(true)}
                  >
                    <div className="flex flex-col items-center cursor-pointer group">
                      <div className="px-2 py-0.5 rounded-md bg-red-800 text-white border-2 border-white font-black text-[10px] shadow-xl flex items-center gap-1 animate-pulse group-hover:scale-110 transition">
                        <Radio className="w-3 h-3" />
                        <span>PMU Tepatitlán</span>
                      </div>
                      <div className="w-1.5 h-2 bg-red-900" />
                    </div>
                  </AdvancedMarker>
                )}

                {/* User Real-Time Geolocation Pin */}
                {userLocation && (
                  <AdvancedMarker position={userLocation} title="Mi Ubicación GPS en Campo">
                    <div className="relative flex items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-sky-400 opacity-75" />
                      <div className="relative w-4 h-4 rounded-full bg-sky-500 border-2 border-white shadow-md" />
                    </div>
                  </AdvancedMarker>
                )}

                {/* Pin Drop Mode Marker */}
                {isPinDropMode && pinCoordinates && (
                  <AdvancedMarker position={pinCoordinates} title="Ubicación Fijada de Daño">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white shadow-2xl animate-bounce">
                        <MapPin className="w-5 h-5 fill-current" />
                      </div>
                      <div className="w-1 h-3 bg-red-800" />
                    </div>
                  </AdvancedMarker>
                )}

                {/* Damage Assessment Markers with Sequence Badges */}
                {sortedTraceAssessments.map((item, idx) => {
                  const isSelected = item.id === selectedItem?.id;
                  let bg = 'bg-emerald-600';
                  if (item.severity === 'Moderado') bg = 'bg-yellow-500';
                  if (item.severity === 'Grave') bg = 'bg-orange-600';
                  if (item.severity === 'Destrucción Total') bg = 'bg-red-600';

                  return (
                    <AdvancedMarker
                      key={item.id}
                      position={{ lat: item.location.lat, lng: item.location.lng }}
                      onClick={() => {
                        setSelectedItem(item);
                        setActiveStepIndex(idx);
                      }}
                      title={`#${idx + 1} - ${item.folio} - ${item.location.community}`}
                    >
                      <div
                        className={`cursor-pointer transition-all duration-200 transform ${
                          isSelected ? 'scale-125 z-50' : 'hover:scale-110'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full ${bg} border-2 ${
                            isSelected ? 'border-white ring-4 ring-red-400/80 shadow-2xl' : 'border-white shadow-lg'
                          } flex items-center justify-center text-white text-[10px] font-black font-mono`}
                        >
                          {idx + 1}
                        </div>
                      </div>
                    </AdvancedMarker>
                  );
                })}

                {/* Assessment InfoWindow */}
                {selectedItem && (
                  <InfoWindow
                    position={{
                      lat: selectedItem.location.lat,
                      lng: selectedItem.location.lng,
                    }}
                    onCloseClick={() => setSelectedItem(null)}
                  >
                    <div className="p-1 max-w-[240px] text-slate-900 font-sans">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono text-xs font-bold bg-slate-200 px-1.5 py-0.5 rounded text-slate-800">
                          #{activeStepIndex + 1} {selectedItem.folio}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            selectedItem.severity === 'Destrucción Total'
                              ? 'bg-red-100 text-red-800'
                              : selectedItem.severity === 'Grave'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {selectedItem.severity}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-950 leading-tight">
                        {selectedItem.location.community}
                      </h4>
                      <p className="text-[11px] text-slate-600 mb-1 leading-tight">
                        {selectedItem.location.streetAddress}
                      </p>

                      <div className="bg-slate-100 p-1.5 rounded text-[11px] text-slate-800 mb-2 leading-relaxed max-h-16 overflow-y-auto">
                        {selectedItem.damageDescription}
                      </div>

                      {selectedItem.attachments.photos.length > 0 && (
                        <img
                          src={selectedItem.attachments.photos[0].dataUrl}
                          alt={selectedItem.attachments.photos[0].caption}
                          className="w-full h-20 object-cover rounded mb-2 border border-slate-300"
                        />
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-600 border-t border-slate-200 pt-1 mb-2">
                        <span>Familias: <b>{selectedItem.affectedPopulation.familiesAffected}</b></span>
                        <span>Lesionados: <b>{selectedItem.affectedPopulation.peopleInjured}</b></span>
                        <span>Necesidades: <b>{selectedItem.needs.length}</b></span>
                      </div>

                      <a
                        href={generateGoogleMapsSingleUrl(selectedItem.location.lat, selectedItem.location.lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-1.5 px-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition mb-1.5 shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Navegar con Google Maps GPS</span>
                      </a>

                      <div className="flex items-center gap-1.5 mt-1.5">
                        {onSelectAssessment && (
                          <button
                            onClick={() => onSelectAssessment(selectedItem)}
                            className="flex-1 py-1.5 px-2 rounded bg-red-700 hover:bg-red-800 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Ver Reporte</span>
                          </button>
                        )}

                        {onDeleteAssessment && (
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `¿Confirma eliminar definitivamente la evaluación ${selectedItem.folio} (${selectedItem.location.community}) del mapa y del sistema?`
                                )
                              ) {
                                onDeleteAssessment(selectedItem.id);
                                setSelectedItem(null);
                              }
                            }}
                            className="py-1.5 px-2 rounded bg-slate-200 hover:bg-red-100 text-red-700 border border-red-300 font-bold text-[11px] flex items-center justify-center gap-1 transition"
                            title="Eliminar definitivamente este registro por error o por haber sido mitigado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          </GoogleMapsErrorBoundary>
        ) : (
          <TacticalLeafletMap
            assessments={filteredAssessments}
            contingency={contingency}
            selectedAssessmentId={selectedItem?.id}
            onSelectAssessment={(item) => {
              setSelectedItem(item);
              if (onSelectAssessment) onSelectAssessment(item);
            }}
            onDeleteAssessment={onDeleteAssessment}
            isPinDropMode={isPinDropMode}
            pinCoordinates={pinCoordinates}
            onPinChange={onPinChange}
            isPmuPlacementMode={isPmuPlacementMode}
            onPmuChange={handlePmuPlace}
            showAssessmentTrace={showAssessmentTrace}
            userLocation={userLocation}
            userAccuracy={userAccuracy}
            cameraTarget={cameraTarget}
            tileStyle={tacticalTileStyle}
          />
        )}

        {/* Floating Top Bar Controls */}
        <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Main Action Group: External Google Maps Launcher & Share */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
            <a
              href={generateGoogleMapsRouteUrl(filteredAssessments)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-xs shadow-2xl transition active:scale-95 border border-red-500/50"
              title="Abrir y conectar todas las coordenadas de evaluaciones en Google Maps para navegación paso a paso"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir en Google Maps ({filteredAssessments.length} Sitios)</span>
            </a>

            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xl transition active:scale-95"
              title="Compartir ruta y coordenadas por WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={handleCopyRouteUrl}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-xl transition active:scale-95"
              title="Copiar enlace de ruta de Google Maps"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedLink ? 'Copiado' : 'Copiar'}</span>
            </button>

            {/* Severity Filter */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-xl text-xs">
              <button
                onClick={() => setFilterSeverity('all')}
                className={`px-2 py-0.5 rounded-lg font-medium transition ${
                  filterSeverity === 'all'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Todos ({assessments.length})
              </button>
              <button
                onClick={() => setFilterSeverity('Destrucción Total')}
                className={`px-2 py-0.5 rounded-lg font-medium transition flex items-center gap-1 ${
                  filterSeverity === 'Destrucción Total'
                    ? 'bg-red-700 text-white font-bold'
                    : 'text-red-400 hover:bg-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="hidden sm:inline">Total</span>
              </button>
              <button
                onClick={() => setFilterSeverity('Grave')}
                className={`px-2 py-0.5 rounded-lg font-medium transition flex items-center gap-1 ${
                  filterSeverity === 'Grave'
                    ? 'bg-orange-700 text-white font-bold'
                    : 'text-orange-400 hover:bg-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="hidden sm:inline">Grave</span>
              </button>
              <button
                onClick={() => setFilterSeverity('Moderado')}
                className={`px-2 py-0.5 rounded-lg font-medium transition flex items-center gap-1 ${
                  filterSeverity === 'Moderado'
                    ? 'bg-yellow-700 text-white font-bold'
                    : 'text-yellow-400 hover:bg-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="hidden sm:inline">Mod</span>
              </button>
            </div>
          </div>

          {/* Engine & PMU Placement Controls */}
          <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-xl text-xs">
            {/* Map Engine Toggle */}
            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg">
              <button
                onClick={() => {
                  setGoogleMapsFailed(false);
                  setMapEngine('google');
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition ${
                  mapEngine === 'google' && !googleMapsFailed
                    ? 'bg-red-700 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Google Maps Oficial"
              >
                <Globe className="w-3 h-3" />
                <span>Google Maps</span>
              </button>

              <button
                onClick={() => setMapEngine('tactical')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition ${
                  mapEngine === 'tactical' || googleMapsFailed
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Mapa Táctico OpenStreetMap"
              >
                <MapIcon className="w-3 h-3" />
                <span>Táctico OSM</span>
              </button>
            </div>

            {/* Layer style selector */}
            {mapEngine === 'google' && !googleMapsFailed ? (
              <select
                value={mapTypeId}
                onChange={(e) => setMapTypeId(e.target.value as any)}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none"
              >
                <option value="roadmap">Callejero</option>
                <option value="satellite">Satélite HD</option>
                <option value="hybrid">Híbrido</option>
                <option value="terrain">Relieve</option>
              </select>
            ) : (
              <select
                value={tacticalTileStyle}
                onChange={(e) => setTacticalTileStyle(e.target.value as any)}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none"
              >
                <option value="osm">Estándar OSM</option>
                <option value="sat">Satélite</option>
                <option value="dark">Táctico Oscuro</option>
              </select>
            )}

            {/* Trace Toggle */}
            <button
              onClick={() => setShowAssessmentTrace(!showAssessmentTrace)}
              className={`px-2 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                showAssessmentTrace ? 'bg-orange-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Mostrar u ocultar trazabilidad dinámica de evaluaciones"
            >
              <Activity className="w-3 h-3" />
              <span className="hidden md:inline">Trazo ({totalTrajectoryKm}km)</span>
            </button>

            {/* Manual PMU Placement Button */}
            <button
              onClick={() => setIsPmuPlacementMode(!isPmuPlacementMode)}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                isPmuPlacementMode
                  ? 'bg-red-600 text-white shadow-lg ring-2 ring-red-400 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title="Activar modo para colocar o reubicar manualmente el Puesto de Mando Unificado en el mapa"
            >
              <Radio className="w-3.5 h-3.5 text-red-400" />
              <span>{isPmuPlacementMode ? 'Fijando PMU...' : 'Reubicar PMU'}</span>
            </button>

            {/* PMU Settings Modal Trigger */}
            <button
              onClick={() => setShowPmuModal(true)}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Configurar y editar nombre o coordenadas del Puesto de Mando Unificado"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>

        {/* Floating Quick Navigation & Tool Buttons (Bottom Right) */}
        <div className="absolute bottom-6 right-3 z-30 flex flex-col gap-2">
          {/* Geolocation Button */}
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className="p-2.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-sky-400 border border-slate-700 shadow-xl transition transform active:scale-90"
            title="Ubicar mi posición GPS en Tepatitlán"
          >
            <Crosshair className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} />
          </button>

          {/* Live Continuous Tracking Toggle */}
          <button
            onClick={handleToggleLiveTracking}
            className={`p-2.5 rounded-xl border shadow-xl transition transform active:scale-90 ${
              isLiveTracking
                ? 'bg-sky-600 text-white border-sky-400 shadow-sky-900/50 ring-2 ring-sky-300'
                : 'bg-slate-900/95 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title={isLiveTracking ? 'Desactivar rastreo en vivo' : 'Activar rastreo GPS en tiempo real'}
          >
            <Navigation className={`w-5 h-5 ${isLiveTracking ? 'animate-pulse' : ''}`} />
          </button>

          {/* Center on Command Post (PMU) */}
          <button
            onClick={handleCenterPmu}
            className="p-2.5 rounded-xl bg-red-950/95 hover:bg-red-900 text-red-300 border border-red-700 shadow-xl transition transform active:scale-90"
            title="Centrar mapa en el Puesto de Mando Unificado (PMU)"
          >
            <Radio className="w-5 h-5" />
          </button>
        </div>

        {/* Collapsible Traceability Drawer (Bottom Left) */}
        <div
          className={`absolute bottom-3 left-3 z-30 transition-all duration-300 ${
            showTraceabilityLog ? 'w-80 sm:w-96' : 'w-auto'
          }`}
        >
          {showTraceabilityLog ? (
            <div className="p-3.5 rounded-2xl bg-slate-950/95 backdrop-blur-md border border-slate-800 shadow-2xl text-slate-100 max-h-72 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <h4 className="font-bold text-xs text-slate-200">
                    Trazabilidad de Movimientos ({sortedTraceAssessments.length} Sitios)
                  </h4>
                </div>
                <button
                  onClick={() => setShowTraceabilityLog(false)}
                  className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-800"
                >
                  Ocultar
                </button>
              </div>

              {/* Trajectory Mileage Metrics */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 px-1">
                <span>Distancia Total de Ruta: <strong className="text-white font-mono">{totalTrajectoryKm} km</strong></span>
                {distanceToPmuKm && (
                  <span>Al PMU: <strong className="text-amber-400 font-mono">{distanceToPmuKm} km</strong></span>
                )}
              </div>

              {/* Sequential Assessment Items */}
              <div className="overflow-y-auto space-y-2 pr-1 flex-1 scrollbar-thin">
                {sortedTraceAssessments.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      setActiveStepIndex(idx);
                      setCameraTarget({ lat: item.location.lat, lng: item.location.lng });
                    }}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      selectedItem?.id === item.id
                        ? 'bg-slate-800 border-red-500 shadow-md ring-1 ring-red-500/50'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-[10px] font-bold text-slate-300">
                        #{idx + 1} {item.folio}
                      </span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                          item.severity === 'Destrucción Total'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : item.severity === 'Grave'
                            ? 'bg-orange-950 text-orange-300 border border-orange-800'
                            : 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </div>

                    <div className="font-bold text-slate-100 truncate">
                      {item.location.community}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mb-1">
                      {item.location.streetAddress}
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1.5 pt-1 border-t border-slate-900">
                      <span className="truncate max-w-[110px]">
                        {item.evaluator.name.split(' ')[0]} ({item.evaluator.radioCallsign})
                      </span>
                      <div className="flex items-center gap-1">
                        <a
                          href={generateGoogleMapsSingleUrl(item.location.lat, item.location.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-0.5 rounded bg-blue-900/80 hover:bg-blue-800 text-blue-200 font-bold flex items-center gap-1 transition"
                          title="Navegar a este sitio en Google Maps"
                        >
                          <span>Google Maps</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>

                        {onDeleteAssessment && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                confirm(
                                  `¿Confirma eliminar definitivamente la evaluación ${item.folio} (${item.location.community})? Se removerá del mapa y de los reportes.`
                                )
                              ) {
                                onDeleteAssessment(item.id);
                                if (selectedItem?.id === item.id) setSelectedItem(null);
                              }
                            }}
                            className="p-1 rounded bg-slate-900 hover:bg-red-900/80 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-700 transition"
                            title="Eliminar evaluación definitivamente"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowTraceabilityLog(true)}
              className="p-2.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-2xl flex items-center gap-1.5 text-xs font-bold transition"
            >
              <Activity className="w-4 h-4 text-red-500" />
              <span>Ver Trazabilidad ({sortedTraceAssessments.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Manual PMU Configuration & Coordinate Placement Modal */}
      {showPmuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-950 border border-red-700 text-red-400">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Puesto de Mando Unificado (PMU)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Configuración y colocación manual en el mapa
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPmuModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePmuModal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre o Identificación de la Base / PMU:
                </label>
                <input
                  type="text"
                  value={pmuNameInput}
                  onChange={(e) => setPmuNameInput(e.target.value)}
                  placeholder="Ej. Base Central Cruz Roja Tepatitlán, Albergue Popotes"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Latitud GPS:
                  </label>
                  <input
                    type="text"
                    value={pmuLatInput}
                    onChange={(e) => setPmuLatInput(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Longitud GPS:
                  </label>
                  <input
                    type="text"
                    value={pmuLngInput}
                    onChange={(e) => setPmuLngInput(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
                    required
                  />
                </div>
              </div>

              {/* Action buttons to set coords easily */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleCaptureGpsForPmu}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-sky-400 font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Compass className="w-4 h-4" />
                  <span>Capturar Coordenadas GPS de mi Dispositivo Actual</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPmuModal(false);
                    setIsPmuPlacementMode(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-red-950/70 hover:bg-red-900/80 border border-red-800 text-xs text-red-300 font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Crosshair className="w-4 h-4 text-red-400" />
                  <span>Fijar Posición Haciendo Clic Directamente en el Mapa</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPmuModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-xs text-white font-bold transition shadow-md active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Ubicación del PMU</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

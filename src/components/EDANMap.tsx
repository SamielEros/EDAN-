import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Crosshair,
  Layers,
  MapPin,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Info,
} from 'lucide-react';
import { ContingencyEvent, DamageAssessment, InspectionRoute } from '../types/edan';

interface EDANMapProps {
  assessments: DamageAssessment[];
  routes: InspectionRoute[];
  contingency: ContingencyEvent;
  selectedAssessmentId?: string | null;
  onSelectAssessment?: (assessment: DamageAssessment) => void;
  // Pin drop mode for form
  isPinDropMode?: boolean;
  pinCoordinates?: { lat: number; lng: number };
  onPinChange?: (coords: { lat: number; lng: number }) => void;
}

// Custom Leaflet Pin Icons generator
const createDamageIcon = (severity: string, isSelected: boolean = false) => {
  let bgColor = '#22c55e'; // Leve
  if (severity === 'Moderado') bgColor = '#eab308';
  if (severity === 'Grave') bgColor = '#f97316';
  if (severity === 'Destrucción Total') bgColor = '#ef4444';

  const size = isSelected ? 38 : 28;
  const border = isSelected ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.85)';
  const pulse = isSelected ? 'box-shadow: 0 0 15px rgba(239,68,68,0.9);' : '';

  return L.divIcon({
    className: 'custom-edan-pin',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${bgColor};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: ${border};
        display: flex;
        align-items: center;
        justify-content: center;
        ${pulse}
        cursor: pointer;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: #0f172a;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

const createWaypointIcon = (order: number, completed: boolean) => {
  const bg = completed ? '#10b981' : '#3b82f6';
  return L.divIcon({
    className: 'custom-route-pin',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: ${bg};
        border-radius: 50%;
        border: 2px solid #ffffff;
        color: #ffffff;
        font-size: 11px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.4);
      ">
        ${order}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const createCommandPostIcon = () => {
  return L.divIcon({
    className: 'pmu-icon',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: #b91c1c;
        border-radius: 6px;
        border: 2px solid #ffffff;
        color: #ffffff;
        font-size: 13px;
        font-weight: 900;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 10px rgba(185,28,28,0.7);
      ">
        PMU
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

export const EDANMap: React.FC<EDANMapProps> = ({
  assessments,
  routes,
  contingency,
  selectedAssessmentId,
  onSelectAssessment,
  isPinDropMode,
  pinCoordinates,
  onPinChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationMarkerRef = useRef<L.CircleMarker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const pinDropMarkerRef = useRef<L.Marker | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showPerimeters, setShowPerimeters] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: Tepatitlán de Morelos
      const defaultCenter: [number, number] = [20.8167, -102.7667];

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 14,
        zoomControl: true,
      });

      // OpenStreetMap Tiles with offline friendly handling
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors | EDAN Tepatitlán',
      });

      tileLayer.addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      const routesGroup = L.layerGroup().addTo(map);

      markersLayerRef.current = markersGroup;
      routesLayerRef.current = routesGroup;
      mapInstanceRef.current = map;

      // Handle map click in pin drop mode
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (isPinDropMode && onPinChange) {
          onPinChange({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      });
    }

    return () => {
      // Cleanup if unmounted
    };
  }, []);

  // Handle Pin Drop marker in editing/creation form
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isPinDropMode && pinCoordinates) {
      if (pinDropMarkerRef.current) {
        pinDropMarkerRef.current.setLatLng([pinCoordinates.lat, pinCoordinates.lng]);
      } else {
        const pinIcon = L.divIcon({
          className: 'pin-drop-icon',
          html: `
            <div style="
              width: 32px;
              height: 32px;
              background: #dc2626;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid #ffffff;
              box-shadow: 0 0 12px rgba(220,38,38,0.9);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
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

        pinDropMarkerRef.current = marker;
      }
    } else {
      if (pinDropMarkerRef.current) {
        map.removeLayer(pinDropMarkerRef.current);
        pinDropMarkerRef.current = null;
      }
    }
  }, [isPinDropMode, pinCoordinates, onPinChange]);

  // Update Damage Assessment Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // Command Post (PMU) Marker
    if (contingency.commandPostLocation) {
      const pmu = contingency.commandPostLocation;
      const pmuMarker = L.marker([pmu.lat, pmu.lng], {
        icon: createCommandPostIcon(),
      });
      pmuMarker.bindPopup(`
        <div style="padding: 4px; font-family: inherit;">
          <div style="font-weight: bold; color: #ef4444; font-size: 13px;">${pmu.name}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Puesto de Mando Unificado EDAN</div>
          <div style="font-size: 11px; color: #e2e8f0; margin-top: 4px;">Coordinador: ${contingency.leadCoordinator}</div>
        </div>
      `);
      markersGroup.addLayer(pmuMarker);
    }

    // Hazard Affected Perimeter (e.g., Rio Tepatitlan flood polygon corridor)
    if (showPerimeters) {
      const floodPerimeterCoords: [number, number][] = [
        [20.812, -102.775],
        [20.814, -102.773],
        [20.818, -102.766],
        [20.822, -102.76],
        [20.826, -102.756],
        [20.824, -102.754],
        [20.819, -102.762],
        [20.815, -102.769],
        [20.811, -102.774],
      ];

      const floodPolygon = L.polygon(floodPerimeterCoords, {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '6, 6',
      });
      floodPolygon.bindPopup(`
        <div style="padding: 4px;">
          <div style="font-weight: bold; color: #60a5fa; font-size: 12px;">Perímetro de Afectación Fluvial</div>
          <div style="font-size: 11px; color: #cbd5e1;">Cauce y ribera activa del Río Tepatitlán</div>
        </div>
      `);
      markersGroup.addLayer(floodPolygon);
    }

    // Filtered Assessments
    const filtered = assessments.filter((a) => {
      if (filterSeverity === 'all') return true;
      return a.severity === filterSeverity;
    });

    filtered.forEach((item) => {
      const isSelected = item.id === selectedAssessmentId;
      const marker = L.marker([item.location.lat, item.location.lng], {
        icon: createDamageIcon(item.severity, isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
      });

      const photoThumb =
        item.attachments.photos.length > 0
          ? `<img src="${item.attachments.photos[0].dataUrl}" style="width: 100%; height: 75px; object-fit: cover; border-radius: 6px; margin-top: 6px;" />`
          : '';

      const popupContent = `
        <div style="font-family: inherit; min-width: 200px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: bold; background: #334155; color: #f8fafc; padding: 2px 6px; border-radius: 4px;">${item.folio}</span>
            <span style="font-size: 10px; font-weight: bold; color: ${
              item.severity === 'Destrucción Total'
                ? '#ef4444'
                : item.severity === 'Grave'
                ? '#f97316'
                : item.severity === 'Moderado'
                ? '#eab308'
                : '#22c55e'
            };">${item.severity}</span>
          </div>
          <div style="font-weight: bold; font-size: 13px; color: #f8fafc; margin-bottom: 2px;">${item.location.community}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">${item.location.streetAddress}</div>
          <div style="font-size: 11px; color: #cbd5e1; line-height: 1.3;">${item.damageDescription.substring(0, 85)}...</div>
          ${photoThumb}
          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #334155; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
            <span>Familias: <b>${item.affectedPopulation.familiesAffected}</b></span>
            <span>Necesidades: <b>${item.needs.length}</b></span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (onSelectAssessment) {
          onSelectAssessment(item);
        }
      });

      markersGroup.addLayer(marker);
    });
  }, [assessments, contingency, selectedAssessmentId, filterSeverity, showPerimeters, onSelectAssessment]);

  // Update Inspection Routes
  useEffect(() => {
    const routesGroup = routesLayerRef.current;
    if (!routesGroup) return;

    routesGroup.clearLayers();

    if (!showRoutes) return;

    routes.forEach((route) => {
      const latlngs: [number, number][] = route.waypoints
        .sort((a, b) => a.order - b.order)
        .map((wp) => [wp.lat, wp.lng]);

      if (latlngs.length >= 2) {
        const polyline = L.polyline(latlngs, {
          color: route.color || '#ef4444',
          weight: 4,
          opacity: 0.85,
          dashArray: route.status === 'Completada' ? undefined : '8, 6',
        });

        polyline.bindPopup(`
          <div style="padding: 4px;">
            <div style="font-weight: bold; color: ${route.color};">${route.name}</div>
            <div style="font-size: 11px; color: #cbd5e1;">Equipo: ${route.assignedTeam}</div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Estado: ${route.status}</div>
          </div>
        `);

        routesGroup.addLayer(polyline);
      }

      // Add route waypoint pins
      route.waypoints.forEach((wp) => {
        const wpMarker = L.marker([wp.lat, wp.lng], {
          icon: createWaypointIcon(wp.order, wp.completed),
        });
        wpMarker.bindPopup(`
          <div style="padding: 4px;">
            <div style="font-weight: bold; color: #f8fafc; font-size: 12px;">Punto #${wp.order}: ${wp.name}</div>
            <div style="font-size: 11px; color: #94a3b8;">${wp.community}</div>
            <div style="font-size: 11px; color: ${wp.completed ? '#10b981' : '#f59e0b'}; margin-top: 2px;">
              ${wp.completed ? '✓ Inspección Realizada' : '⌛ Pendiente de Evaluación'}
            </div>
          </div>
        `);
        routesGroup.addLayer(wpMarker);
      });
    });
  }, [routes, showRoutes]);

  // Evaluator GPS Geolocation Trigger
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no es compatible con este navegador.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        const map = mapInstanceRef.current;
        if (map) {
          map.setView([latitude, longitude], 16, { animate: true });

          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            const marker = L.circleMarker([latitude, longitude], {
              radius: 9,
              fillColor: '#38bdf8',
              color: '#ffffff',
              weight: 3,
              opacity: 1,
              fillOpacity: 0.9,
            }).addTo(map);
            userLocationMarkerRef.current = marker;
          }

          if (userAccuracyCircleRef.current) {
            userAccuracyCircleRef.current.setLatLng([latitude, longitude]);
            userAccuracyCircleRef.current.setRadius(accuracy);
          } else {
            const circle = L.circle([latitude, longitude], {
              radius: accuracy,
              color: '#38bdf8',
              fillColor: '#38bdf8',
              fillOpacity: 0.15,
              weight: 1,
            }).addTo(map);
            userAccuracyCircleRef.current = circle;
          }
        }
      },
      (error) => {
        setIsLocating(false);
        alert(`No se pudo obtener la ubicación GPS: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const centerOnTepatitlan = () => {
    mapInstanceRef.current?.setView([20.8167, -102.7667], 14, { animate: true });
  };

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Header Overlay: Controls & Filters */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Severity Filter */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700 shadow-lg text-xs">
          <button
            onClick={() => setFilterSeverity('all')}
            className={`px-2 py-1 rounded font-medium transition ${
              filterSeverity === 'all'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos ({assessments.length})
          </button>
          <button
            onClick={() => setFilterSeverity('Destrucción Total')}
            className={`px-2 py-1 rounded font-medium transition flex items-center gap-1 ${
              filterSeverity === 'Destrucción Total'
                ? 'bg-red-700 text-white'
                : 'text-red-400 hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Total
          </button>
          <button
            onClick={() => setFilterSeverity('Grave')}
            className={`px-2 py-1 rounded font-medium transition flex items-center gap-1 ${
              filterSeverity === 'Grave'
                ? 'bg-orange-700 text-white'
                : 'text-orange-400 hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            Grave
          </button>
          <button
            onClick={() => setFilterSeverity('Moderado')}
            className={`px-2 py-1 rounded font-medium transition flex items-center gap-1 ${
              filterSeverity === 'Moderado'
                ? 'bg-yellow-700 text-white'
                : 'text-yellow-400 hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            Moderado
          </button>
        </div>

        {/* Layer Toggles */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700 shadow-lg text-xs">
          <button
            onClick={() => setShowRoutes(!showRoutes)}
            className={`px-2 py-1 rounded font-medium transition flex items-center gap-1 ${
              showRoutes ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Activar/Desactivar Rutas y Trazabilidad"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Rutas</span>
          </button>
          <button
            onClick={() => setShowPerimeters(!showPerimeters)}
            className={`px-2 py-1 rounded font-medium transition flex items-center gap-1 ${
              showPerimeters ? 'bg-cyan-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Activar/Desactivar Perímetros de Riesgo"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Zonas</span>
          </button>
        </div>
      </div>

      {/* Floating Bottom Navigation / GPS Tools */}
      <div className="absolute bottom-4 right-4 z-[400] flex flex-col gap-2">
        <button
          onClick={handleLocateMe}
          className={`p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-sky-400 hover:bg-slate-800 shadow-xl transition active:scale-95 ${
            isLocating ? 'animate-pulse text-amber-400' : ''
          }`}
          title="Centrar en mi ubicación GPS en campo"
        >
          <Crosshair className="w-5 h-5" />
        </button>

        <button
          onClick={centerOnTepatitlan}
          className="p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-slate-300 hover:bg-slate-800 shadow-xl transition active:scale-95"
          title="Centrar vista en Tepatitlán de Morelos"
        >
          <Compass className="w-5 h-5" />
        </button>
      </div>

      {/* Pin Drop Mode Banner */}
      {isPinDropMode && (
        <div className="absolute bottom-4 left-4 z-[400] max-w-xs p-2.5 rounded-xl bg-red-950/90 backdrop-blur-md border border-red-700 text-white shadow-xl text-xs flex items-center gap-2">
          <MapPin className="w-4 h-4 text-red-400 shrink-0 animate-bounce" />
          <div>
            <p className="font-bold">Modo Marcador Activo</p>
            <p className="text-[11px] text-red-200">
              Toca o arrastra en el mapa para situar la coordenada exacta del daño.
            </p>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="hidden sm:flex absolute bottom-4 left-4 z-[390] items-center gap-2.5 p-2 rounded-lg bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-[11px] text-slate-300">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>Total</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span>Grave</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <span>Moderado</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Leve</span>
        </div>
        <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
          <span className="px-1 py-0.5 rounded bg-red-800 text-[9px] font-bold text-white">PMU</span>
          <span>Puesto Mando</span>
        </div>
      </div>
    </div>
  );
};

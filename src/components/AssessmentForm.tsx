import React, { useState, useEffect } from 'react';
import {
  Save,
  MapPin,
  Camera,
  Volume2,
  Users,
  ShieldAlert,
  Activity,
  Package,
  Plus,
  Trash2,
  Crosshair,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Search,
  Check,
  RotateCcw,
  Sparkles,
  Navigation,
} from 'lucide-react';
import {
  DamageAssessment,
  DamageSector,
  DamageSeverity,
  LifelineStatus,
  NeedCategory,
  NeedItem,
  NeedPriority,
  EvaluatorProfile,
  ContingencyEvent,
} from '../types/edan';
import { PhotoCapture } from './PhotoCapture';
import { AudioRecorder } from './AudioRecorder';
import { EDANGoogleMap } from './EDANGoogleMap';
import {
  saveAssessmentDraft,
  getAssessmentDraft,
  clearAssessmentDraft,
} from '../services/storage';

interface AssessmentFormProps {
  initialAssessment?: DamageAssessment | null;
  contingency: ContingencyEvent;
  currentEvaluator: EvaluatorProfile;
  existingAssessmentsCount: number;
  onSave: (assessment: DamageAssessment) => void;
  onCancel: () => void;
}

// Common Tepatitlán colonias, barrios and delegaciones for quick suggestions
const SUGGESTED_COLONIAS = [
  'Colonia Popotes (Ribera Río)',
  'Centro Histórico',
  'Barrio del Carmen',
  'Barrio San Gabriel',
  'Colonia Jardines de la Rivera',
  'Puente La Gloria / Av. Alcalá',
  'Fraccionamiento Los Sauces',
  'Colonia Santa Bárbara',
  'Colonia Las Aguilillas',
  'Fraccionamiento La Loma',
  'Colonia Las Colonias',
  'Barrio Santo Toribio',
  'Colonia Esparza',
  'Colonia El Molino',
  'Capilla de Guadalupe',
  'Pegueros',
  'San José de Gracia',
  'Mezcala de los Romero',
  'Tecomatlán',
];

const SUGGESTED_COMUNIDADES = [
  'Tepatitlán de Morelos (Cabecera)',
  'Capilla de Guadalupe',
  'Pegueros',
  'San José de Gracia',
  'Mezcala de los Romero',
  'Tecomatlán',
];

export const AssessmentForm: React.FC<AssessmentFormProps> = ({
  initialAssessment,
  contingency,
  currentEvaluator,
  existingAssessmentsCount,
  onSave,
  onCancel,
}) => {
  const isEditing = !!initialAssessment;

  // Active Tab for form sections
  const [activeTab, setActiveTab] = useState<'general' | 'population' | 'multimedia' | 'needs'>('general');

  // Auto-Save Draft Status
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(false);
  const [isDraftLoading, setIsDraftLoading] = useState<boolean>(!initialAssessment);

  // Form Fields
  const [folio, setFolio] = useState(
    initialAssessment?.folio ||
      `EDAN-TEPA-2026-${String(existingAssessmentsCount + 1).padStart(3, '0')}`
  );

  // Location & Georreference (Manual Entry for Colonia/Barrio and Comunidad)
  const [community, setCommunity] = useState<string>(
    initialAssessment?.location.community || 'Tepatitlán de Morelos'
  );
  const [neighborhood, setNeighborhood] = useState<string>(
    initialAssessment?.location.neighborhood ||
      (initialAssessment?.location.community?.includes('Colonia')
        ? initialAssessment.location.community
        : 'Colonia Popotes')
  );
  const [streetAddress, setStreetAddress] = useState(
    initialAssessment?.location.streetAddress || ''
  );
  const [reference, setReference] = useState(
    initialAssessment?.location.reference || ''
  );
  const [lat, setLat] = useState<number>(
    initialAssessment?.location.lat || 20.8167
  );
  const [lng, setLng] = useState<number>(
    initialAssessment?.location.lng || -102.7667
  );
  const [accuracyMeters, setAccuracyMeters] = useState<number | undefined>(
    initialAssessment?.location.accuracyMeters || 5
  );
  const [isLocating, setIsLocating] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  // Synchronized Google Maps Search States
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [searchResultNotice, setSearchResultNotice] = useState<string | null>(null);
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);
  const [detectedColonia, setDetectedColonia] = useState<string | null>(null);

  // Sector & Severity
  const [sector, setSector] = useState<DamageSector>(
    initialAssessment?.sector || 'Vivienda y Asentamientos'
  );
  const [severity, setSeverity] = useState<DamageSeverity>(
    initialAssessment?.severity || 'Moderado'
  );

  // Affected Population (Includes explicit Total People Affected)
  const [peopleAffected, setPeopleAffected] = useState<number>(
    initialAssessment?.affectedPopulation.peopleAffected ||
      (initialAssessment?.affectedPopulation.familiesAffected
        ? initialAssessment.affectedPopulation.familiesAffected * 4
        : 0)
  );
  const [familiesAffected, setFamiliesAffected] = useState<number>(
    initialAssessment?.affectedPopulation.familiesAffected || 0
  );
  const [peopleInjured, setPeopleInjured] = useState<number>(
    initialAssessment?.affectedPopulation.peopleInjured || 0
  );
  const [peopleMissing, setPeopleMissing] = useState<number>(
    initialAssessment?.affectedPopulation.peopleMissing || 0
  );
  const [peopleDeceased, setPeopleDeceased] = useState<number>(
    initialAssessment?.affectedPopulation.peopleDeceased || 0
  );
  const [homesDamaged, setHomesDamaged] = useState<number>(
    initialAssessment?.affectedPopulation.homesDamaged || 0
  );
  const [homesInhabitable, setHomesInhabitable] = useState<number>(
    initialAssessment?.affectedPopulation.homesInhabitable || 0
  );

  // Vulnerable groups
  const [childrenCount, setChildrenCount] = useState<number>(
    initialAssessment?.affectedPopulation.vulnerableGroups.children || 0
  );
  const [elderlyCount, setElderlyCount] = useState<number>(
    initialAssessment?.affectedPopulation.vulnerableGroups.elderly || 0
  );
  const [pregnantCount, setPregnantCount] = useState<number>(
    initialAssessment?.affectedPopulation.vulnerableGroups.pregnant || 0
  );
  const [disabledCount, setDisabledCount] = useState<number>(
    initialAssessment?.affectedPopulation.vulnerableGroups.disabled || 0
  );

  // Lifelines
  const [waterSupply, setWaterSupply] = useState<LifelineStatus>(
    initialAssessment?.lifelines.waterSupply || 'Normal'
  );
  const [electricity, setElectricity] = useState<LifelineStatus>(
    initialAssessment?.lifelines.electricity || 'Normal'
  );
  const [roadAccess, setRoadAccess] = useState<LifelineStatus>(
    initialAssessment?.lifelines.roadAccess || ('Libre' as any)
  );
  const [telecom, setTelecom] = useState<LifelineStatus>(
    initialAssessment?.lifelines.telecom || 'Normal'
  );
  const [drainage, setDrainage] = useState<LifelineStatus>(
    initialAssessment?.lifelines.drainage || 'Normal'
  );

  // Description
  const [damageDescription, setDamageDescription] = useState(
    initialAssessment?.damageDescription || ''
  );
  const [actionsTaken, setActionsTaken] = useState(
    initialAssessment?.actionsTaken || ''
  );

  // Attachments
  const [photos, setPhotos] = useState(initialAssessment?.attachments.photos || []);
  const [audios, setAudios] = useState(initialAssessment?.attachments.audios || []);
  const [documents, setDocuments] = useState(initialAssessment?.attachments.documents || []);

  // Needs
  const [needs, setNeeds] = useState<NeedItem[]>(initialAssessment?.needs || []);

  // Quick Need Adder State
  const [needCat, setNeedCat] = useState<NeedCategory>('Alimentaria y Agua');
  const [needDesc, setNeedDesc] = useState('');
  const [needQty, setNeedQty] = useState(10);
  const [needUnit, setNeedUnit] = useState<NeedItem['unit']>('Kits');
  const [needPriority, setNeedPriority] = useState<NeedPriority>('Alta (<24h)');

  // 1. AUTO-SAVE: Restore draft on component mount if new evaluation
  useEffect(() => {
    if (isEditing) return;

    getAssessmentDraft().then((draft) => {
      if (draft && (draft.damageDescription || draft.streetAddress || draft.neighborhood || draft.familiesAffected > 0 || draft.photos?.length > 0)) {
        if (draft.folio) setFolio(draft.folio);
        if (draft.community) setCommunity(draft.community);
        if (draft.neighborhood) setNeighborhood(draft.neighborhood);
        if (draft.streetAddress) setStreetAddress(draft.streetAddress);
        if (draft.reference) setReference(draft.reference);
        if (draft.lat) setLat(draft.lat);
        if (draft.lng) setLng(draft.lng);
        if (draft.sector) setSector(draft.sector);
        if (draft.severity) setSeverity(draft.severity);
        if (draft.peopleAffected !== undefined) setPeopleAffected(draft.peopleAffected);
        if (draft.familiesAffected !== undefined) setFamiliesAffected(draft.familiesAffected);
        if (draft.peopleInjured !== undefined) setPeopleInjured(draft.peopleInjured);
        if (draft.peopleMissing !== undefined) setPeopleMissing(draft.peopleMissing);
        if (draft.peopleDeceased !== undefined) setPeopleDeceased(draft.peopleDeceased);
        if (draft.homesDamaged !== undefined) setHomesDamaged(draft.homesDamaged);
        if (draft.homesInhabitable !== undefined) setHomesInhabitable(draft.homesInhabitable);
        if (draft.childrenCount !== undefined) setChildrenCount(draft.childrenCount);
        if (draft.elderlyCount !== undefined) setElderlyCount(draft.elderlyCount);
        if (draft.pregnantCount !== undefined) setPregnantCount(draft.pregnantCount);
        if (draft.disabledCount !== undefined) setDisabledCount(draft.disabledCount);
        if (draft.waterSupply) setWaterSupply(draft.waterSupply);
        if (draft.electricity) setElectricity(draft.electricity);
        if (draft.roadAccess) setRoadAccess(draft.roadAccess);
        if (draft.telecom) setTelecom(draft.telecom);
        if (draft.drainage) setDrainage(draft.drainage);
        if (draft.damageDescription) setDamageDescription(draft.damageDescription);
        if (draft.actionsTaken) setActionsTaken(draft.actionsTaken);
        if (draft.photos) setPhotos(draft.photos);
        if (draft.audios) setAudios(draft.audios);
        if (draft.needs) setNeeds(draft.needs);
        setHasRestoredDraft(true);
      }
      setIsDraftLoading(false);
    });
  }, [isEditing]);

  // 2. AUTO-SAVE: Automatically persist changes to local storage & DB (debounced 600ms)
  useEffect(() => {
    if (isEditing || isDraftLoading) return;

    const timer = setTimeout(() => {
      const draftData = {
        folio,
        community,
        neighborhood,
        streetAddress,
        reference,
        lat,
        lng,
        accuracyMeters,
        sector,
        severity,
        peopleAffected,
        familiesAffected,
        peopleInjured,
        peopleMissing,
        peopleDeceased,
        childrenCount,
        elderlyCount,
        pregnantCount,
        disabledCount,
        homesDamaged,
        homesInhabitable,
        waterSupply,
        electricity,
        roadAccess,
        telecom,
        drainage,
        damageDescription,
        actionsTaken,
        photos,
        audios,
        needs,
      };

      saveAssessmentDraft(draftData).then(() => {
        setLastAutoSave(new Date());
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [
    isEditing,
    isDraftLoading,
    folio,
    community,
    neighborhood,
    streetAddress,
    reference,
    lat,
    lng,
    accuracyMeters,
    sector,
    severity,
    peopleAffected,
    familiesAffected,
    peopleInjured,
    peopleMissing,
    peopleDeceased,
    childrenCount,
    elderlyCount,
    pregnantCount,
    disabledCount,
    homesDamaged,
    homesInhabitable,
    waterSupply,
    electricity,
    roadAccess,
    telecom,
    drainage,
    damageDescription,
    actionsTaken,
    photos,
    audios,
    needs,
  ]);

  // Discard draft handler
  const handleDiscardDraft = async () => {
    if (
      confirm(
        '¿Desea descartar el borrador auto-guardado y limpiar los datos de esta evaluación?'
      )
    ) {
      await clearAssessmentDraft();
      setHasRestoredDraft(false);
      setFolio(`EDAN-TEPA-2026-${String(existingAssessmentsCount + 1).padStart(3, '0')}`);
      setCommunity('Tepatitlán de Morelos');
      setNeighborhood('Colonia Popotes');
      setStreetAddress('');
      setReference('');
      setPeopleAffected(0);
      setFamiliesAffected(0);
      setPeopleInjured(0);
      setPeopleMissing(0);
      setPeopleDeceased(0);
      setHomesDamaged(0);
      setHomesInhabitable(0);
      setDamageDescription('');
      setActionsTaken('');
      setPhotos([]);
      setAudios([]);
      setNeeds([]);
      setLastAutoSave(null);
    }
  };

  // GPS Location Handler
  const handleCaptureGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada en este dispositivo.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setAccuracyMeters(Math.round(pos.coords.accuracy));
      },
      (err) => {
        setIsLocating(false);
        alert(`Error al obtener ubicación GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Synchronized Google Maps Search Handler
  const handleSearchMapLocation = async (overrideQuery?: string) => {
    const query = (overrideQuery || mapSearchQuery).trim();
    if (!query) return;

    setIsSearchingLocation(true);
    setSearchResultNotice(null);

    // Append Tepatitlán for high local precision
    const fullQuery = query.toLowerCase().includes('tepatitl')
      ? query
      : `${query}, Tepatitlán de Morelos, Jalisco, México`;

    try {
      if ((window as any).google?.maps?.Geocoder) {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ address: fullQuery }, (results: any[], status: string) => {
          setIsSearchingLocation(false);
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            const newLat = loc.lat();
            const newLng = loc.lng();
            setLat(newLat);
            setLng(newLng);
            const formatted = results[0].formatted_address;
            setDetectedAddress(formatted);
            setSearchResultNotice(`Localizado: ${formatted}`);

            // Parse address components for colonia / street
            if (results[0].address_components) {
              for (const comp of results[0].address_components) {
                if (comp.types.includes('sublocality') || comp.types.includes('neighborhood')) {
                  setDetectedColonia(comp.long_name);
                }
              }
            }
          } else {
            fallbackSearchNominatim(query);
          }
        });
      } else {
        fallbackSearchNominatim(query);
      }
    } catch {
      fallbackSearchNominatim(query);
    }
  };

  const fallbackSearchNominatim = async (query: string) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query + ', Tepatitlan de Morelos, Jalisco'
      )}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      setIsSearchingLocation(false);

      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const newLat = parseFloat(item.lat);
        const newLng = parseFloat(item.lon);
        setLat(newLat);
        setLng(newLng);
        setDetectedAddress(item.display_name);
        setSearchResultNotice(`Localizado en mapa: ${item.display_name}`);
      } else {
        setSearchResultNotice('No se encontraron sitios con ese término en Tepatitlán.');
      }
    } catch {
      setIsSearchingLocation(false);
      setSearchResultNotice('Servicio de geocodificación no disponible.');
    }
  };

  // Sync detected address to form fields
  const handleApplyDetectedAddress = () => {
    if (detectedAddress) {
      if (!streetAddress || streetAddress.trim() === '') {
        setStreetAddress(detectedAddress.split(',')[0] || detectedAddress);
      }
      if (detectedColonia) {
        setNeighborhood(detectedColonia);
      }
      setReference((prev) =>
        prev ? prev : `Localizado vía Google Maps: ${detectedAddress}`
      );
      alert('¡Dirección y colonia sincronizadas con el formulario!');
    }
  };

  const handleAddNeed = () => {
    if (!needDesc.trim()) return;
    const newItem: NeedItem = {
      id: `NEED-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      category: needCat,
      itemDescription: needDesc.trim(),
      quantityRequired: Number(needQty) || 1,
      quantityDelivered: 0,
      unit: needUnit,
      priority: needPriority,
      status: 'Pendiente',
      updatedAt: new Date().toISOString(),
    };
    setNeeds([...needs, newItem]);
    setNeedDesc('');
  };

  const handleRemoveNeed = (id: string) => {
    setNeeds(needs.filter((n) => n.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!damageDescription.trim()) {
      alert('Por favor ingrese la descripción técnica del daño.');
      setActiveTab('general');
      return;
    }

    if (photos.length === 0 && audios.length === 0) {
      const confirmWithoutMedia = confirm(
        '⚠️ Aviso de Calidad EDAN:\nNo ha registrado ninguna fotografía de daños ni grabación de sonido/audio testimonial en esta evaluación.\n\n¿Desea continuar y guardar sin evidencia o presionar Cancelar para tomar fotos/audios ahora?'
      );
      if (!confirmWithoutMedia) {
        setActiveTab('general');
        return;
      }
    }

    const assessment: DamageAssessment = {
      id: initialAssessment?.id || `EDAN-${Date.now()}`,
      folio,
      contingencyId: contingency.id,
      evaluator: currentEvaluator,
      timestamp: initialAssessment?.timestamp || new Date().toISOString(),
      location: {
        community,
        neighborhood: neighborhood.trim() || undefined,
        streetAddress,
        reference,
        lat,
        lng,
        accuracyMeters,
      },
      sector,
      severity,
      affectedPopulation: {
        peopleAffected: Number(peopleAffected) || 0,
        familiesAffected: Number(familiesAffected) || 0,
        peopleInjured: Number(peopleInjured) || 0,
        peopleMissing: Number(peopleMissing) || 0,
        peopleDeceased: Number(peopleDeceased) || 0,
        vulnerableGroups: {
          children: Number(childrenCount) || 0,
          elderly: Number(elderlyCount) || 0,
          pregnant: Number(pregnantCount) || 0,
          disabled: Number(disabledCount) || 0,
        },
        homesDamaged: Number(homesDamaged) || 0,
        homesInhabitable: Number(homesInhabitable) || 0,
      },
      lifelines: {
        waterSupply,
        electricity,
        roadAccess,
        telecom,
        drainage,
      },
      damageDescription,
      actionsTaken,
      attachments: {
        photos,
        audios,
        documents,
      },
      needs,
      routeOrder: initialAssessment?.routeOrder || existingAssessmentsCount + 1,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
      version: initialAssessment?.version || 1,
    };

    // Clean up draft on successful submission
    await clearAssessmentDraft();
    onSave(assessment);
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
      {/* Form Header with Auto-Save Badge */}
      <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-900/60 border border-red-700 text-white">
            <ShieldAlert className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white">
                {isEditing ? 'Editar Evaluación EDAN' : 'Nuevo Registro de Evaluación EDAN'}
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {folio}
              </span>

              {/* Real-time Auto-Save Status Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-[10px] font-bold text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {lastAutoSave
                    ? `Auto-guardado: ${lastAutoSave.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                    : 'Auto-guardado activo'}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cruz Roja Delegación Tepatitlán &bull; Contingencia: <strong className="text-slate-300">{contingency.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {hasRestoredDraft && !isEditing && (
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-xs text-slate-400 hover:text-red-300 font-medium transition border border-slate-700 hover:border-red-800 flex items-center gap-1"
              title="Descartar el borrador recuperado"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar Borrador</span>
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-xs font-bold text-white shadow-md transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Evaluación</span>
          </button>
        </div>
      </div>

      {/* Restored Draft Banner Notification */}
      {hasRestoredDraft && !isEditing && (
        <div className="px-4 py-2 bg-sky-950/60 border-b border-sky-800/80 flex items-center justify-between text-xs text-sky-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              <strong>Borrador recuperado:</strong> Se han restaurado automáticamente los datos no guardados previamente para evitar pérdida de información.
            </span>
          </div>
          <button
            onClick={() => setHasRestoredDraft(false)}
            className="text-sky-400 hover:text-white font-bold ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'general'
              ? 'border-red-500 text-white bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 text-red-400" />
          <span>1. Georreferencia y Daño General</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('population')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'population'
              ? 'border-red-500 text-white bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-blue-400" />
          <span>2. Censo Damnificados ({peopleAffected} personas)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('multimedia')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'multimedia'
              ? 'border-red-500 text-white bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>3. Evidencias ({photos.length} Fotos / {audios.length} Audios)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('needs')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'needs'
              ? 'border-red-500 text-white bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4 text-purple-400" />
          <span>4. Análisis de Necesidades ({needs.length})</span>
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
        {/* ============================================================== */}
        {/* Tab 1: General & Location (Manual Colonia/Barrio input)        */}
        {/* ============================================================== */}
        {activeTab === 'general' && (
          <div className="space-y-5">
            {/* Location Section */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-400" />
                  Georreferencia y Ubicación Exacta en Tepatitlán
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  Entrada manual habilitada
                </span>
              </div>

              {/* Datalists for manual autocomplete suggestions */}
              <datalist id="colonias-sugeridas">
                {SUGGESTED_COLONIAS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>

              <datalist id="comunidades-sugeridas">
                {SUGGESTED_COMUNIDADES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Manual Colonia / Barrio Input */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Colonia o Barrio <strong className="text-red-400">*</strong> (Ingreso Manual):
                  </label>
                  <input
                    type="text"
                    list="colonias-sugeridas"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Ej. Colonia Popotes, Barrio del Carmen, San Gabriel..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Puede escribir libremente cualquier colonia, barrio o fraccionamiento de Tepatitlán.
                  </span>
                </div>

                {/* Manual Comunidad / Delegación Input */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Comunidad o Delegación Municipal:
                  </label>
                  <input
                    type="text"
                    list="comunidades-sugeridas"
                    value={community}
                    onChange={(e) => setCommunity(e.target.value)}
                    placeholder="Ej. Tepatitlán de Morelos, Capilla de Guadalupe, Pegueros..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Calle y Número Exterior / Interior:
                  </label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="Ej. Calle Prolongación Morelos #245"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Puntos de Referencia / Entorno:
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ej. A 50 metros del vado, frente a taller mecánico"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* GPS Coordinates Bar */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-xs font-mono text-slate-300">
                    Lat: <strong className="text-white">{lat.toFixed(5)}</strong> | Lng:{' '}
                    <strong className="text-white">{lng.toFixed(5)}</strong>
                    {accuracyMeters && (
                      <span className="text-[10px] text-slate-400 ml-2">
                        (Precisión ±{accuracyMeters}m)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCaptureGPS}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-900/60 hover:bg-sky-800 border border-sky-700 text-xs font-semibold text-sky-200 transition ${
                      isLocating ? 'animate-pulse' : ''
                    }`}
                  >
                    <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isLocating ? 'Obteniendo GPS...' : 'Capturar Mi GPS'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-800/80 hover:bg-red-700 border border-red-600 text-xs font-bold text-white transition shadow-sm"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Elegir en Mapa (Google Maps)</span>
                  </button>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 border border-blue-700 text-xs font-semibold text-blue-200 transition"
                    title="Abrir este punto geográfico en la aplicación de Google Maps"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    <span>Ver en Google Maps</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Classification & Description */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                Sector Afectado y Grado de Severidad
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Sector Afectado:
                  </label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value as DamageSector)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="Vivienda y Asentamientos">Vivienda y Asentamientos</option>
                    <option value="Salud y Atención Médica">Salud y Atención Médica</option>
                    <option value="Infraestructura y Vías">Infraestructura y Vías / Puentes</option>
                    <option value="Agua y Saneamiento">Agua y Saneamiento</option>
                    <option value="Servicios Básicos (Luz/Gas/Com)">Servicios Básicos</option>
                    <option value="Educativo y Comunitario">Educativo y Comunitario</option>
                    <option value="Comercial e Industrial">Comercial e Industrial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nivel de Severidad EDAN:
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as DamageSeverity)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-red-500"
                  >
                    <option value="Leve" className="text-emerald-400 font-bold">Leve (Daño superficial)</option>
                    <option value="Moderado" className="text-yellow-400 font-bold">Moderado (Habitable con reparaciones)</option>
                    <option value="Grave" className="text-orange-400 font-bold">Grave (Daño estructural severo)</option>
                    <option value="Destrucción Total" className="text-red-400 font-bold">Destrucción Total (Colapso irreversible)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descripción Técnica y Objetiva del Daño Observado: <strong className="text-red-400">*</strong>
                </label>
                <textarea
                  rows={3}
                  value={damageDescription}
                  onChange={(e) => setDamageDescription(e.target.value)}
                  placeholder="Detalle tipo de colapso, agrietamientos, altura de nivel de agua, socavación de muros, pérdidas de menaje o afectación..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Acciones Inmediatas de Respuesta Realizadas en Campo:
                </label>
                <textarea
                  rows={2}
                  value={actionsTaken}
                  onChange={(e) => setActionsTaken(e.target.value)}
                  placeholder="Evacuación preventiva realizada, balizamiento de riesgo, atención médica prehospitalaria, canalización a albergue..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* In-Form Evidence Capture */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-red-700/60 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-red-950 border border-red-800 text-red-400">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>Evidencias de Campo (Fotografías y Notas de Audio/Sonidos)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-900 text-red-200">
                        {photos.length} Fotos &bull; {audios.length} Audios
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Tome fotos directas del daño con la cámara y grabe notas de voz testimoniales o de radio.
                    </p>
                  </div>
                </div>
              </div>

              {/* Photo Capture */}
              <PhotoCapture
                photos={photos}
                onAddPhoto={(photo) => setPhotos([...photos, photo])}
                onRemovePhoto={(id) => setPhotos(photos.filter((p) => p.id !== id))}
                currentCoords={{ lat, lng }}
              />

              {/* Audio & Sound Recorder */}
              <div className="border-t border-slate-700/80 pt-3">
                <AudioRecorder
                  audios={audios}
                  onAddAudio={(audio) => setAudios([...audios, audio])}
                  onRemoveAudio={(id) => setAudios(audios.filter((a) => a.id !== id))}
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Tab 2: Population (Includes Número de Personas Afectadas)      */}
        {/* ============================================================== */}
        {activeTab === 'population' && (
          <div className="space-y-5">
            {/* Population Affected */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  Censo de Damnificados y Población Afectada
                </h3>
                <span className="text-[11px] text-sky-300 font-bold bg-sky-950/80 border border-sky-800 px-2.5 py-0.5 rounded-full">
                  Total Impactados: {peopleAffected} personas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* NEW EXPLICIT FIELD: Número de Personas Afectadas */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-950/80 to-slate-900 border-2 border-blue-500/80 shadow-md">
                  <label className="block text-xs font-bold text-sky-200 mb-1 flex items-center justify-between">
                    <span>Número de Personas Afectadas:</span>
                    <span className="text-[10px] text-sky-400 font-normal">Censo individual</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={peopleAffected}
                    onChange={(e) => setPeopleAffected(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-blue-600 rounded-lg px-3 py-2 text-sm text-sky-300 font-black focus:outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder="Total personas"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Conteo total de personas afectadas en la vivienda o sitio.
                  </span>
                </div>

                {/* Familias Afectadas */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Familias Afectadas:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={familiesAffected}
                    onChange={(e) => {
                      const f = Number(e.target.value);
                      setFamiliesAffected(f);
                      // If peopleAffected is 0, provide auto-calculation suggestion
                      if (peopleAffected === 0 && f > 0) {
                        setPeopleAffected(f * 4);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Hogares o núcleos familiares censados.
                  </span>
                </div>

                {/* Lesionados */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Personas Lesionadas:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={peopleInjured}
                    onChange={(e) => setPeopleInjured(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-400 font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Requieren o recibieron auxilio médico.
                  </span>
                </div>
              </div>

              {/* Secondary Census Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-700/60">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Desaparecidos:</label>
                  <input
                    type="number"
                    min="0"
                    value={peopleMissing}
                    onChange={(e) => setPeopleMissing(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-orange-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fallecidos:</label>
                  <input
                    type="number"
                    min="0"
                    value={peopleDeceased}
                    onChange={(e) => setPeopleDeceased(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-red-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Viviendas Dañadas:</label>
                  <input
                    type="number"
                    min="0"
                    value={homesDamaged}
                    onChange={(e) => setHomesDamaged(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Viviendas Inhabitables:</label>
                  <input
                    type="number"
                    min="0"
                    value={homesInhabitable}
                    onChange={(e) => setHomesInhabitable(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-red-400 font-bold"
                  />
                </div>
              </div>

              {/* Vulnerable Groups */}
              <div className="pt-3 border-t border-slate-700/60 space-y-2">
                <h4 className="text-xs font-semibold text-slate-300">
                  Grupos de Atención Prioritaria y Vulnerabilidad:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Niños y Niñas (0-12):</label>
                    <input
                      type="number"
                      min="0"
                      value={childrenCount}
                      onChange={(e) => setChildrenCount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Adultos Mayores (+65):</label>
                    <input
                      type="number"
                      min="0"
                      value={elderlyCount}
                      onChange={(e) => setElderlyCount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Mujeres Embarazadas:</label>
                    <input
                      type="number"
                      min="0"
                      value={pregnantCount}
                      onChange={(e) => setPregnantCount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Personas con Discapacidad:</label>
                    <input
                      type="number"
                      min="0"
                      value={disabledCount}
                      onChange={(e) => setDisabledCount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Lifelines Section */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Matriz de Servicios y Líneas Vitales
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Agua Potable:</label>
                  <select
                    value={waterSupply}
                    onChange={(e) => setWaterSupply(e.target.value as LifelineStatus)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Parcial">Parcial</option>
                    <option value="Interrumpido">Interrumpido</option>
                    <option value="Colapsado">Colapsado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Energía Eléctrica:</label>
                  <select
                    value={electricity}
                    onChange={(e) => setElectricity(e.target.value as LifelineStatus)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Parcial">Parcial</option>
                    <option value="Interrumpido">Interrumpido</option>
                    <option value="Colapsado">Colapsado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Acceso Vial:</label>
                  <select
                    value={roadAccess}
                    onChange={(e) => setRoadAccess(e.target.value as LifelineStatus)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="Libre">Libre / Transitable</option>
                    <option value="Parcialmente Bloqueado">Parcialmente Bloqueado</option>
                    <option value="Incomunicado">Incomunicado / Cortado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Telecomunicaciones:</label>
                  <select
                    value={telecom}
                    onChange={(e) => setTelecom(e.target.value as LifelineStatus)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Parcial">Parcial</option>
                    <option value="Interrumpido">Interrumpido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Drenaje y Alcantarillado:</label>
                  <select
                    value={drainage}
                    onChange={(e) => setDrainage(e.target.value as LifelineStatus)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Parcial">Parcial / Azolvado</option>
                    <option value="Interrumpido">Desbordado / Colapsado</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Tab 3: Multimedia Evidences                                    */}
        {/* ============================================================== */}
        {activeTab === 'multimedia' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                Fotografías Georreferenciadas de Daños
              </h3>
              <PhotoCapture
                photos={photos}
                onAddPhoto={(photo) => setPhotos([...photos, photo])}
                onRemovePhoto={(id) => setPhotos(photos.filter((p) => p.id !== id))}
                currentCoords={{ lat, lng }}
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-sky-400" />
                Notas de Voz y Registro de Audio de Campo
              </h3>
              <AudioRecorder
                audios={audios}
                onAddAudio={(audio) => setAudios([...audios, audio])}
                onRemoveAudio={(id) => setAudios(audios.filter((a) => a.id !== id))}
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Tab 4: Needs Analysis                                          */}
        {/* ============================================================== */}
        {activeTab === 'needs' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-400" />
                Matriz de Requerimientos y Necesidades Urgentes
              </h3>

              {/* Add Need Form */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Categoría del Insumo:</label>
                    <select
                      value={needCat}
                      onChange={(e) => setNeedCat(e.target.value as NeedCategory)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="Alimentaria y Agua">Alimentaria y Agua</option>
                      <option value="Salud e Insumos Médicos">Salud e Insumos Médicos</option>
                      <option value="Alojamiento y Refugio">Alojamiento y Refugio</option>
                      <option value="Agua y Saneamiento (WASH)">Agua y Saneamiento (WASH)</option>
                      <option value="Búsqueda y Rescate (USAR)">Búsqueda y Rescate (USAR)</option>
                      <option value="Maquinaria y Despeje">Maquinaria y Despeje</option>
                      <option value="Seguridad y Apoyo Psicosocial">Seguridad y Psicosocial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Descripción del Insumo:</label>
                    <input
                      type="text"
                      value={needDesc}
                      onChange={(e) => setNeedDesc(e.target.value)}
                      placeholder="Ej. Despensas de emergencia, botas de hule, cobijas"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Cantidad:</label>
                      <input
                        type="number"
                        min="1"
                        value={needQty}
                        onChange={(e) => setNeedQty(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Unidad:</label>
                      <select
                        value={needUnit}
                        onChange={(e) => setNeedUnit(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        <option value="Kits">Kits</option>
                        <option value="Piezas">Piezas</option>
                        <option value="Litros">Litros</option>
                        <option value="Raciones">Raciones</option>
                        <option value="Unidades">Unidades</option>
                        <option value="Lonas">Lonas</option>
                        <option value="Horas/Equipo">Horas/Eq</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Prioridad:</span>
                    <select
                      value={needPriority}
                      onChange={(e) => setNeedPriority(e.target.value as NeedPriority)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-semibold"
                    >
                      <option value="Crítica (<6h)">Crítica (&lt;6h)</option>
                      <option value="Alta (<24h)">Alta (&lt;24h)</option>
                      <option value="Media (<72h)">Media (&lt;72h)</option>
                      <option value="Baja">Baja</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddNeed}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-xs font-semibold text-white shadow-sm transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Necesidad</span>
                  </button>
                </div>
              </div>

              {/* Needs List */}
              <div className="space-y-2">
                {needs.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No se han registrado requerimientos específicos para este sitio.
                  </div>
                ) : (
                  needs.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{item.itemDescription}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {item.category}
                          </span>
                          <span className="text-[10px] font-bold text-amber-400">
                            {item.priority}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          Cantidad Requerida: <strong className="text-slate-200">{item.quantityRequired} {item.unit}</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveNeed(item.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Evaluador: <strong className="text-slate-200">{currentEvaluator.name}</strong> ({currentEvaluator.radioCallsign})</span>
            {lastAutoSave && (
              <span className="text-emerald-400 text-[11px] font-medium hidden md:inline">
                &bull; Auto-guardado en dispositivo a las {lastAutoSave.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-xs font-bold text-white shadow-lg transition active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Evaluación EDAN</span>
            </button>
          </div>
        </div>
      </form>

      {/* ============================================================== */}
      {/* MAP PIN MODAL WITH SYNCHRONIZED GOOGLE MAPS SEARCH            */}
      {/* ============================================================== */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-4xl h-[86vh] rounded-2xl bg-slate-900 border border-slate-700 flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header with Live Synchronized Google Maps Search */}
            <div className="p-3.5 border-b border-slate-800 bg-slate-950 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <h3 className="text-xs font-bold text-white">
                    Ubicar en Google Maps &bull; Captura por Palabras Claves y Direcciones
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMapModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Synchronized Search Input */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={mapSearchQuery}
                    onChange={(e) => setMapSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchMapLocation();
                      }
                    }}
                    placeholder="Escriba dirección, colonia o palabra clave en Google Maps (ej. Popotes, Mercado Centenario, Calle Hidalgo 120)..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                <button
                  type="button"
                  onClick={() => handleSearchMapLocation()}
                  disabled={isSearchingLocation}
                  className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-xs font-bold text-white flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isSearchingLocation ? 'Buscando...' : 'Buscar'}</span>
                </button>
              </div>

              {/* Quick Keywords Chips for Tepatitlán */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] scrollbar-thin">
                <span className="text-slate-500 font-semibold shrink-0">Sugerencias:</span>
                {[
                  'Colonia Popotes',
                  'Centro Histórico',
                  'Mercado Centenario',
                  'Puente La Gloria',
                  'Hospital Regional',
                  'Cruz Roja Tepatitlán',
                  'Calle Hidalgo',
                  'Av. Ricardo Alcalá',
                  'Capilla de Guadalupe',
                  'Pegueros',
                ].map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => {
                      setMapSearchQuery(kw);
                      handleSearchMapLocation(kw);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium whitespace-nowrap border border-slate-700/80 transition"
                  >
                    {kw}
                  </button>
                ))}
              </div>

              {/* Search Result Banner & Synchronize Button */}
              {detectedAddress && (
                <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-200 truncate">
                      <strong>Sitio Detectado:</strong> {detectedAddress}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyDetectedAddress}
                    className="px-3 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition shrink-0 shadow-sm"
                    title="Copiar la dirección y colonia detectadas a los campos del formulario"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Sincronizar con Formulario</span>
                  </button>
                </div>
              )}

              {searchResultNotice && !detectedAddress && (
                <div className="text-[11px] text-amber-300 bg-amber-950/60 p-1.5 rounded-lg border border-amber-800">
                  {searchResultNotice}
                </div>
              )}
            </div>

            {/* Interactive Map Viewport */}
            <div className="flex-1 relative">
              <EDANGoogleMap
                assessments={[]}
                contingency={contingency}
                isPinDropMode={true}
                pinCoordinates={{ lat, lng }}
                onPinChange={(coords) => {
                  setLat(coords.lat);
                  setLng(coords.lng);
                }}
              />
            </div>

            {/* Modal Bottom Bar */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="text-xs font-mono text-slate-300">
                Coordenada fijada: Lat <strong className="text-white">{lat.toFixed(5)}</strong>, Lng <strong className="text-white">{lng.toFixed(5)}</strong>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowMapModal(false)}
                  className="flex-1 sm:flex-initial px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setShowMapModal(false)}
                  className="flex-1 sm:flex-initial px-5 py-1.5 rounded-xl bg-red-700 hover:bg-red-600 text-xs font-bold text-white shadow-md transition active:scale-95"
                >
                  Confirmar Ubicación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

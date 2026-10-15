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

interface AssessmentFormProps {
  initialAssessment?: DamageAssessment | null;
  contingency: ContingencyEvent;
  currentEvaluator: EvaluatorProfile;
  existingAssessmentsCount: number;
  onSave: (assessment: DamageAssessment) => void;
  onCancel: () => void;
}

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

  // Form Fields
  const [folio, setFolio] = useState(
    initialAssessment?.folio ||
      `EDAN-TEPA-2026-${String(existingAssessmentsCount + 1).padStart(3, '0')}`
  );

  // Location
  const [community, setCommunity] = useState(
    initialAssessment?.location.community || 'Colonia Popotes'
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

  // Sector & Severity
  const [sector, setSector] = useState<DamageSector>(
    initialAssessment?.sector || 'Vivienda y Asentamientos'
  );
  const [severity, setSeverity] = useState<DamageSeverity>(
    initialAssessment?.severity || 'Moderado'
  );

  // Affected Population
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
    initialAssessment?.lifelines.roadAccess || 'Libre' as any
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

  // GPS Location Handler
  const handleCaptureGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada');
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

  const handleSubmit = (e: React.FormEvent) => {
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
        streetAddress,
        reference,
        lat,
        lng,
        accuracyMeters,
      },
      sector,
      severity,
      affectedPopulation: {
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

    onSave(assessment);
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
      {/* Form Header */}
      <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-900/60 border border-red-700 text-white">
            <ShieldAlert className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {isEditing ? 'Editar Evaluación EDAN' : 'Nuevo Registro de Evaluación EDAN'}
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {folio}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Cruz Roja Delegación Tepatitlán &bull; Contingencia: <strong className="text-slate-300">{contingency.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
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

      {/* Tabs Navigation */}
      <div className="flex items-center border-b border-slate-800 bg-slate-900/80 px-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'general'
              ? 'border-red-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4 text-red-400" />
          <span>1. Ubicación y Daños</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('population')}
          className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'population'
              ? 'border-red-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-blue-400" />
          <span>2. Población y Líneas Vitales</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('multimedia')}
          className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'multimedia'
              ? 'border-red-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-4 h-4 text-amber-400" />
          <span>3. Evidencia ({photos.length} Fotos, {audios.length} Audios)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('needs')}
          className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'needs'
              ? 'border-red-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4 text-purple-400" />
          <span>4. Análisis de Necesidades ({needs.length})</span>
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
        {/* Tab 1: General & Location */}
        {activeTab === 'general' && (
          <div className="space-y-5">
            {/* Location Section */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-400" />
                Georreferencia y Ubicación Exacta en Tepatitlán
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Comunidad / Colonia / Barrio:
                  </label>
                  <select
                    value={community}
                    onChange={(e) => setCommunity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="Colonia Popotes (Ribera Río)">Colonia Popotes (Ribera Río)</option>
                    <option value="Centro Histórico (Mercado Centenario)">Centro Histórico</option>
                    <option value="Puente La Gloria / Av. Ricardo Alcalá">Puente La Gloria</option>
                    <option value="Jardines de la Rivera">Jardines de la Rivera</option>
                    <option value="Colonia del Carmen">Colonia del Carmen</option>
                    <option value="Capilla de Guadalupe">Capilla de Guadalupe</option>
                    <option value="San José de Gracia">San José de Gracia</option>
                    <option value="Pegueros">Pegueros</option>
                    <option value="Mezcala de los Romero">Mezcala</option>
                    <option value="Tecomatlán">Tecomatlán</option>
                  </select>
                </div>

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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
                  >
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>Elegir en Mapa</span>
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="Leve" className="text-emerald-400">
                      Leve (Afectación superficial sin riesgo estructural)
                    </option>
                    <option value="Moderado" className="text-yellow-400">
                      Moderado (Habitable con reparaciones menores)
                    </option>
                    <option value="Grave" className="text-orange-400">
                      Grave (Daño estructural severo / Desalojo requerido)
                    </option>
                    <option value="Destrucción Total" className="text-red-400">
                      Destrucción Total (Colapso / Inhabitable permanente)
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descripción Técnica y Detallada del Daño:
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

            {/* Direct In-Form Multimedia Evidence Capture (Photos & Sound Notes) */}
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


        {/* Tab 2: Population & Lifelines */}
        {activeTab === 'population' && (
          <div className="space-y-5">
            {/* Population Affected */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Censo de Damnificados y Población Afectada
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Familias Afectadas:</label>
                  <input
                    type="number"
                    min="0"
                    value={familiesAffected}
                    onChange={(e) => setFamiliesAffected(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Lesionados:</label>
                  <input
                    type="number"
                    min="0"
                    value={peopleInjured}
                    onChange={(e) => setPeopleInjured(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-amber-400 font-bold"
                  />
                </div>

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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-red-400 font-bold"
                  />
                </div>
              </div>

              {/* Homes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Viviendas con Daño Parcial:</label>
                  <input
                    type="number"
                    min="0"
                    value={homesDamaged}
                    onChange={(e) => setHomesDamaged(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Viviendas Inhabitables / Destruidas:</label>
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
              <div className="pt-2 border-t border-slate-800">
                <span className="block text-xs font-semibold text-slate-300 mb-2">
                  Grupos de Alta Vulnerabilidad Detectados:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Niños y Niñas</span>
                    <input
                      type="number"
                      min="0"
                      value={childrenCount}
                      onChange={(e) => setChildrenCount(Number(e.target.value))}
                      className="w-full bg-transparent text-xs font-bold text-white mt-1 border-none outline-none"
                    />
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Adultos Mayores</span>
                    <input
                      type="number"
                      min="0"
                      value={elderlyCount}
                      onChange={(e) => setElderlyCount(Number(e.target.value))}
                      className="w-full bg-transparent text-xs font-bold text-white mt-1 border-none outline-none"
                    />
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Mujeres Embarazadas</span>
                    <input
                      type="number"
                      min="0"
                      value={pregnantCount}
                      onChange={(e) => setPregnantCount(Number(e.target.value))}
                      className="w-full bg-transparent text-xs font-bold text-white mt-1 border-none outline-none"
                    />
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Discapacidad</span>
                    <input
                      type="number"
                      min="0"
                      value={disabledCount}
                      onChange={(e) => setDisabledCount(Number(e.target.value))}
                      className="w-full bg-transparent text-xs font-bold text-white mt-1 border-none outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Lifelines Matrix */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Estado de Líneas Vitales y Servicios Básicos
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Agua Potable:</label>
                  <select
                    value={waterSupply}
                    onChange={(e) => setWaterSupply(e.target.value as LifelineStatus)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Afectado Parcial">Afectado Parcial</option>
                    <option value="Interrumpido">Interrumpido</option>
                    <option value="Crítico">Crítico / Contaminado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Energía Eléctrica:</label>
                  <select
                    value={electricity}
                    onChange={(e) => setElectricity(e.target.value as LifelineStatus)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Afectado Parcial">Afectado Parcial</option>
                    <option value="Interrumpido">Interrumpido</option>
                    <option value="Crítico">Crítico / Postes Caídos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Acceso Vial / Puentes:</label>
                  <select
                    value={roadAccess}
                    onChange={(e) => setRoadAccess(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="Normal">Libre</option>
                    <option value="Afectado Parcial">Parcialmente Bloqueado</option>
                    <option value="Interrumpido">Inaccesible / Puente Dañado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Telecomunicaciones (Celular/Radio):</label>
                  <select
                    value={telecom}
                    onChange={(e) => setTelecom(e.target.value as LifelineStatus)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="Normal">Normal / Operativo</option>
                    <option value="Afectado Parcial">Intermitente</option>
                    <option value="Interrumpido">Caído / Sin Señal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Drenaje y Alcantarillado:</label>
                  <select
                    value={drainage}
                    onChange={(e) => setDrainage(e.target.value as LifelineStatus)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Afectado Parcial">Colapso Parcial</option>
                    <option value="Interrumpido">Anegado / Retorno Aguas Negras</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Multimedia Attachments */}
        {activeTab === 'multimedia' && (
          <div className="space-y-6">
            <PhotoCapture
              photos={photos}
              onAddPhoto={(photo) => setPhotos([...photos, photo])}
              onRemovePhoto={(id) => setPhotos(photos.filter((p) => p.id !== id))}
              currentCoords={{ lat, lng }}
            />

            <div className="border-t border-slate-800 pt-5">
              <AudioRecorder
                audios={audios}
                onAddAudio={(audio) => setAudios([...audios, audio])}
                onRemoveAudio={(id) => setAudios(audios.filter((a) => a.id !== id))}
              />
            </div>
          </div>
        )}

        {/* Tab 4: Needs Analysis */}
        {activeTab === 'needs' && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-400" />
                Matriz de Necesidades Derivadas del Daño
              </h3>

              {/* Add item bar */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Categoría:</label>
                    <select
                      value={needCat}
                      onChange={(e) => setNeedCat(e.target.value as NeedCategory)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="Alimentaria y Agua">Alimentaria y Agua</option>
                      <option value="Salud e Insumos Médicos">Salud e Insumos Médicos</option>
                      <option value="Alojamiento y Refugio">Alojamiento y Refugio</option>
                      <option value="Agua y Saneamiento (WASH)">Agua y Saneamiento (WASH)</option>
                      <option value="Maquinaria y Despeje">Maquinaria y Despeje</option>
                      <option value="Búsqueda y Rescate (USAR)">Búsqueda y Rescate</option>
                      <option value="Seguridad y Apoyo Psicosocial">Seguridad / Apoyo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Prioridad:</label>
                    <select
                      value={needPriority}
                      onChange={(e) => setNeedPriority(e.target.value as NeedPriority)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="Crítica (<6h)">Crítica (&lt;6h)</option>
                      <option value="Alta (<24h)">Alta (&lt;24h)</option>
                      <option value="Media (<72h)">Media (&lt;72h)</option>
                      <option value="Baja">Baja</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Insumo Requerido:</label>
                    <input
                      type="text"
                      value={needDesc}
                      onChange={(e) => setNeedDesc(e.target.value)}
                      placeholder="Ej. Garrafones de agua, Lonas plásticas, Botiquines"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Cantidad:</label>
                      <input
                        type="number"
                        min="1"
                        value={needQty}
                        onChange={(e) => setNeedQty(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Unidad:</label>
                      <select
                        value={needUnit}
                        onChange={(e) => setNeedUnit(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="Kits">Kits</option>
                        <option value="Piezas">Piezas</option>
                        <option value="Litros">Litros</option>
                        <option value="Raciones">Raciones</option>
                        <option value="Unidades">Unidades</option>
                        <option value="Horas/Equipo">Horas</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddNeed}
                  className="w-full py-1.5 px-3 rounded-lg bg-red-700 hover:bg-red-600 text-xs font-semibold text-white transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Requerimiento a esta Evaluación</span>
                </button>
              </div>

              {/* Needs List */}
              {needs.length > 0 ? (
                <div className="space-y-2">
                  {needs.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-white truncate">
                            {item.itemDescription}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {item.quantityRequired} {item.unit}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.category} &bull; Prioridad: <span className="text-red-400">{item.priority}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveNeed(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-md transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  No hay requerimientos específicos asignados a esta evaluación.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form Bottom Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            Evaluador: <strong className="text-slate-200">{currentEvaluator.name}</strong> ({currentEvaluator.radioCallsign})
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-xs font-bold text-white shadow-lg transition active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Evaluación EDAN</span>
            </button>
          </div>
        </div>
      </form>

      {/* Map Pin Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-3xl h-[80vh] rounded-2xl bg-slate-900 border border-slate-700 flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" />
                Mover Marcador al Punto Exacto del Daño
              </h3>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 relative">
              <EDANGoogleMap
                assessments={[]}
                routes={[]}
                contingency={contingency}
                isPinDropMode={true}
                pinCoordinates={{ lat, lng }}
                onPinChange={(coords) => {
                  setLat(coords.lat);
                  setLng(coords.lng);
                }}
              />
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="text-xs font-mono text-slate-300">
                Coordenada fijada: Lat {lat.toFixed(5)}, Lng {lng.toFixed(5)}
              </div>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-xs font-bold text-white"
              >
                Confirmar Ubicación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

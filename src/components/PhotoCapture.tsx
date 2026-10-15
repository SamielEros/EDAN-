import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, Maximize2, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { DamagePhoto } from '../types/edan';

interface PhotoCaptureProps {
  photos: DamagePhoto[];
  onAddPhoto: (photo: DamagePhoto) => void;
  onRemovePhoto: (id: string) => void;
  disabled?: boolean;
  currentCoords?: { lat: number; lng: number };
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  photos,
  onAddPhoto,
  onRemovePhoto,
  disabled,
  currentCoords,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<DamagePhoto | null>(null);
  const [captionInput, setCaptionInput] = useState('');
  const [damageType, setDamageType] = useState('Daño Estructural');
  const [isProcessing, setIsProcessing] = useState(false);

  // Compress image on canvas and stamp watermark (Tepatitlán EDAN + Coordinates + Timestamp)
  const processImageFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 960;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);

          // Technical Watermark Band for Official EDAN Documentation
          const nowStr = new Date().toLocaleString('es-MX', {
            timeZone: 'America/Mexico_City',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          const coordsStr = currentCoords
            ? `GPS: ${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}`
            : 'Tepatitlán de Morelos';

          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
          ctx.fillRect(0, height - 38, width, 38);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px monospace, sans-serif';
          ctx.fillText(`EDAN TEPATITLÁN | ${damageType.toUpperCase()}`, 12, height - 20);

          ctx.font = '12px monospace, sans-serif';
          ctx.fillStyle = '#cbd5e1';
          ctx.textAlign = 'right';
          ctx.fillText(`${coordsStr} | ${nowStr}`, width - 12, height - 20);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

          const newPhoto: DamagePhoto = {
            id: `PH-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            dataUrl: compressedDataUrl,
            caption: captionInput.trim() || `Evidencia de ${damageType} #${photos.length + 1}`,
            damageType: damageType,
            timestamp: new Date().toISOString(),
          };

          onAddPhoto(newPhoto);
          setCaptionInput('');
          setIsProcessing(false);
        }
      };
      img.onerror = () => setIsProcessing(false);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => setIsProcessing(false);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-red-400" />
          <span>Evidencia Fotográfica de Daños ({photos.length} Fotos)</span>
        </label>
        <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Con sello GPS y marca de tiempo
        </span>
      </div>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Capture Controls Card */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Descripción o Punto de Afectación de la Foto:
            </label>
            <input
              type="text"
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              placeholder="Ej. Colapso de barda perimetral, Inundación 80cm en sala..."
              disabled={disabled || isProcessing}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Tipo de Daño Técnico:
            </label>
            <select
              value={damageType}
              onChange={(e) => setDamageType(e.target.value)}
              disabled={disabled || isProcessing}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
            >
              <option value="Colapso Estructural">Colapso Estructural</option>
              <option value="Fisura o Agrietamiento">Fisura o Agrietamiento</option>
              <option value="Inundación / Lodo">Inundación / Lodo</option>
              <option value="Daño a Vías / Puentes">Daño a Vías / Puentes</option>
              <option value="Líneas Vitales (Cables/Postes)">Líneas Vitales</option>
              <option value="Menaje y Enseres">Menaje y Enseres</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled || isProcessing}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-xs font-bold text-white shadow-lg shadow-red-950/40 transition active:scale-95 disabled:opacity-50"
          >
            <Camera className="w-4 h-4 text-white" />
            <span>{isProcessing ? 'Procesando...' : 'Tomar Foto con Cámara'}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessing}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition active:scale-95 disabled:opacity-50"
          >
            <ImageIcon className="w-4 h-4 text-slate-300" />
            <span>Subir de Galería / Archivo</span>
          </button>
        </div>
      </div>

      {/* Photos Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-md"
            >
              <div className="aspect-4/3 w-full overflow-hidden bg-slate-950">
                <img
                  src={photo.dataUrl}
                  alt={photo.caption}
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                />
              </div>

              {/* Tag overlay */}
              <div className="absolute top-1.5 left-1.5">
                <span className="px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-bold text-red-300">
                  #{index + 1} {photo.damageType}
                </span>
              </div>

              {/* Actions */}
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition">
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(photo)}
                  className="p-1 rounded-md bg-slate-900/90 hover:bg-slate-950 text-white transition"
                  title="Ampliar foto"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemovePhoto(photo.id)}
                  disabled={disabled}
                  className="p-1 rounded-md bg-red-900/90 hover:bg-red-800 text-white transition"
                  title="Eliminar foto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Caption footer */}
              <div className="p-1.5 bg-slate-950/90 border-t border-slate-800">
                <p className="text-[10px] text-slate-300 truncate font-medium">
                  {photo.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 text-center">
          <Camera className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
          <p className="text-xs text-slate-400 font-medium">No se han registrado fotografías de daños aún</p>
          <p className="text-[11px] text-slate-500">
            Presione <strong>"Tomar Foto con Cámara"</strong> para documentar grietas, niveles de inundación o colapso.
          </p>
        </div>
      )}

      {/* Modal Zoom View */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">{selectedPhoto.caption}</h4>
                <p className="text-[10px] text-slate-400">
                  {selectedPhoto.damageType} &bull; {new Date(selectedPhoto.timestamp).toLocaleString('es-MX')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 max-h-[75vh] flex items-center justify-center bg-black">
              <img
                src={selectedPhoto.dataUrl}
                alt={selectedPhoto.caption}
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

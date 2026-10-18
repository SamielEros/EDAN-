import React, { useState } from 'react';
import {
  FileText,
  Download,
  Share2,
  Mail,
  MessageSquare,
  X,
  Check,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { ContingencyEvent, DamageAssessment } from '../types/edan';
import { generateEdanPdf } from '../services/pdfGenerator';

interface PDFModalProps {
  assessment: DamageAssessment;
  contingency: ContingencyEvent;
  onClose: () => void;
}

export const PDFModal: React.FC<PDFModalProps> = ({
  assessment,
  contingency,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { doc, filename, blob } = generateEdanPdf(assessment, contingency);

  const handleDownloadPdf = () => {
    setIsGenerating(true);
    doc.save(filename);
    setTimeout(() => setIsGenerating(false), 500);
  };

  // WhatsApp formatted emergency summary text
  const getShareText = () => {
    const lat = assessment.location.lat.toFixed(5);
    const lng = assessment.location.lng.toFixed(5);
    const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;

    const criticalNeeds = assessment.needs
      .map((n) => `• ${n.itemDescription} (${n.quantityRequired} ${n.unit}) - [${n.priority}]`)
      .join('\n');

    return `🚨 *REPORTE EDAN DELEGACIÓN TEPATITLÁN* 🚨
*Folio:* ${assessment.folio}
*Contingencia:* ${contingency.name}
*Comunidad:* ${assessment.location.community}
*Dirección:* ${assessment.location.streetAddress}
*Sector:* ${assessment.sector}
*Severidad:* ${assessment.severity}

👥 *Afectación:*
• Familias afectadas: ${assessment.affectedPopulation.familiesAffected}
• Lesionados: ${assessment.affectedPopulation.peopleInjured}
• Viviendas inhabitables: ${assessment.affectedPopulation.homesInhabitable}

⚠️ *Daño Principal:*
${assessment.damageDescription}

📦 *Necesidades Inmediatas:*
${criticalNeeds || 'Sin requerimientos urgentes registrados.'}

📍 *Ubicación GPS:*
${mapsLink}

*Evaluador:* ${assessment.evaluator.name} (${assessment.evaluator.radioCallsign})
*Fecha:* ${new Date(assessment.timestamp).toLocaleString('es-MX')}`;
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`[REPORTE EDAN] ${assessment.folio} - ${assessment.location.community}`);
    const body = encodeURIComponent(getShareText());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Reporte EDAN ${assessment.folio}`,
            text: getShareText(),
            files: [file],
          });
        } else {
          await navigator.share({
            title: `Reporte EDAN ${assessment.folio}`,
            text: getShareText(),
          });
        }
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      handleShareWhatsApp();
    }
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(getShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-700/80">
              <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Reporte EDAN Preliminar y Complementario</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {assessment.folio}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Cruz Roja Mexicana Delegación Tepatitlán &bull; {assessment.location.neighborhood || assessment.location.community}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Quick Summary Card */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-2">
              <div>
                <span className="text-slate-400">Contingencia:</span>{' '}
                <strong className="text-white">{contingency.name}</strong>
              </div>
              <div>
                <span className="text-slate-400">Severidad:</span>{' '}
                <strong
                  className={
                    assessment.severity === 'Destrucción Total'
                      ? 'text-red-400 font-bold'
                      : assessment.severity === 'Grave'
                      ? 'text-orange-400 font-bold'
                      : 'text-amber-400 font-bold'
                  }
                >
                  {assessment.severity}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Familias Afectadas</div>
                <div className="text-base font-bold text-white">
                  {assessment.affectedPopulation.familiesAffected}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Lesionados</div>
                <div className="text-base font-bold text-amber-400">
                  {assessment.affectedPopulation.peopleInjured}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Viviendas Inhabitables</div>
                <div className="text-base font-bold text-red-400">
                  {assessment.affectedPopulation.homesInhabitable}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Necesidades Registradas</div>
                <div className="text-base font-bold text-sky-400">
                  {assessment.needs.length}
                </div>
              </div>
            </div>

            <div>
              <div className="text-slate-400 text-[11px] font-semibold mb-1">Descripción del Daño:</div>
              <p className="text-slate-200 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                {assessment.damageDescription}
              </p>
            </div>

            {assessment.attachments.photos.length > 0 && (
              <div>
                <div className="text-slate-400 text-[11px] font-semibold mb-1.5">
                  Evidencia Fotográfica ({assessment.attachments.photos.length}):
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {assessment.attachments.photos.slice(0, 3).map((ph) => (
                    <img
                      key={ph.id}
                      src={ph.dataUrl}
                      alt={ph.caption}
                      className="h-16 w-full object-cover rounded-lg border border-slate-700"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Share Channels */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-3">
            <h4 className="font-bold text-slate-200 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-red-400" />
              Compartir Reporte Técnico Inmediatamente
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Envíe este reporte con datos georreferenciados al Puesto de Mando Unificado, Cruz Roja Tepatitlán o Protección Civil vía WhatsApp, Correo Electrónico o mensajería de campo:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white shadow-sm transition active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={() => {
                  const text = encodeURIComponent(getShareText());
                  window.open(`https://t.me/share/url?url=${encodeURIComponent('https://maps.google.com/?q=' + assessment.location.lat + ',' + assessment.location.lng)}&text=${text}`, '_blank');
                }}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 font-semibold text-white shadow-sm transition active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Telegram</span>
              </button>

              <button
                onClick={handleShareEmail}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white shadow-sm transition active:scale-95"
              >
                <Mail className="w-4 h-4" />
                <span>Correo Mail</span>
              </button>

              <button
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-sm transition active:scale-95"
                title="Compartir PDF con aplicaciones del dispositivo"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartir App</span>
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleCopyClipboard}
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado al Portapapeles!' : 'Copiar texto para mensajería'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Formato oficial estandarizado &bull; Compatible 100% offline
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium transition"
            >
              Cerrar
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-xs text-white font-bold shadow-md transition active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Generando PDF...' : 'Descargar PDF Oficial'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

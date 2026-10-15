import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Volume2,
  AlertCircle,
  Upload,
  Radio,
  FileAudio,
} from 'lucide-react';
import { AudioNote } from '../types/edan';

interface AudioRecorderProps {
  audios: AudioNote[];
  onAddAudio: (audio: AudioNote) => void;
  onRemoveAudio: (id: string) => void;
  disabled?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  audios,
  onAddAudio,
  onRemoveAudio,
  disabled,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioTitle, setAudioTitle] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    setPermissionError(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const newAudio: AudioNote = {
            id: `AUD-${Date.now()}`,
            dataUrl: base64data,
            durationSeconds: recordingSeconds || 1,
            title:
              audioTitle.trim() ||
              `Nota de Voz EDAN #${audios.length + 1} (${recordingSeconds || 1}s)`,
            timestamp: new Date().toISOString(),
          };
          onAddAudio(newAudio);
          setAudioTitle('');
          setRecordingSeconds(0);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error accessing microphone', err);
      setPermissionError(
        'No se pudo acceder al micrófono del dispositivo. Puede usar el botón "Subir Archivo de Audio" o verificar los permisos.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const newAudio: AudioNote = {
          id: `AUD-FILE-${Date.now()}`,
          dataUrl: base64data,
          durationSeconds: 30, // Default estimate if metadata not read
          title: audioTitle.trim() || file.name || `Audio Adjunto #${audios.length + 1}`,
          timestamp: new Date().toISOString(),
        };
        onAddAudio(newAudio);
        setAudioTitle('');
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handlePlayToggle = (audio: AudioNote) => {
    if (playingId === audio.id) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      setPlayingId(null);
    } else {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      if (!audio.dataUrl) {
        alert('Este registro no contiene datos de audio reproducibles.');
        return;
      }
      const audioEl = new Audio(audio.dataUrl);
      audioElementRef.current = audioEl;
      audioEl.onended = () => setPlayingId(null);
      audioEl.play().catch((err) => console.error(err));
      setPlayingId(audio.id);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Volume2 className="w-4 h-4 text-red-400" />
          <span>Evidencia de Sonido y Notas de Voz ({audios.length} Audios)</span>
        </label>
        <span className="text-[11px] text-slate-400">Grabación testimonial / reporte de radio</span>
      </div>

      {permissionError && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{permissionError}</span>
        </div>
      )}

      {/* Hidden file input for audio files */}
      <input
        type="file"
        ref={audioFileInputRef}
        accept="audio/*"
        onChange={handleAudioFileUpload}
        className="hidden"
      />

      {/* Recording Toolbar */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={audioTitle}
            onChange={(e) => setAudioTitle(e.target.value)}
            disabled={isRecording || disabled}
            placeholder="Título del audio (ej. Testimonio familia Rivera, Parte radial oficial...)"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
          />

          {!isRecording ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={startRecording}
                disabled={disabled}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-xs font-bold text-white shadow-lg shadow-red-950/40 transition active:scale-95 disabled:opacity-50"
              >
                <Mic className="w-4 h-4 text-white animate-pulse" />
                <span>Grabar Sonido / Voz</span>
              </button>

              <button
                type="button"
                onClick={() => audioFileInputRef.current?.click()}
                disabled={disabled}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition active:scale-95 disabled:opacity-50"
                title="Adjuntar archivo de audio grabado previamente"
              >
                <Upload className="w-3.5 h-3.5 text-slate-300" />
                <span>Adjuntar Audio</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-950 border border-red-700 text-red-300 text-xs font-mono font-bold animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>GRABANDO {formatTime(recordingSeconds)}</span>
              </div>
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-600 shadow-md transition"
              >
                <Square className="w-3.5 h-3.5 fill-current text-red-400" />
                <span>Finalizar Grabación</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Audio List */}
      {audios.length > 0 ? (
        <div className="space-y-2">
          {audios.map((audio, index) => (
            <div
              key={audio.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 transition shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => handlePlayToggle(audio)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition shadow-md ${
                    playingId === audio.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-red-700 hover:bg-red-600 text-white'
                  }`}
                  title={playingId === audio.id ? 'Pausar' : 'Reproducir'}
                >
                  {playingId === audio.id ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-100 truncate">
                    #{index + 1} {audio.title}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                    <span>Duración: {audio.durationSeconds}s</span>
                    <span>&bull;</span>
                    <span>{new Date(audio.timestamp).toLocaleTimeString('es-MX')}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onRemoveAudio(audio.id)}
                disabled={disabled}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                title="Eliminar audio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3.5 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 text-center">
          <Volume2 className="w-5 h-5 text-slate-500 mx-auto mb-1" />
          <p className="text-xs text-slate-400 font-medium">No se han grabado notas de audio ni sonidos</p>
          <p className="text-[11px] text-slate-500">
            Presione <strong>"Grabar Sonido / Voz"</strong> para registrar declaraciones de afectados o notas del evaluador.
          </p>
        </div>
      )}
    </div>
  );
};

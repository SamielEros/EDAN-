import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ContingencyEvent, DamageAssessment } from '../types/edan';

export function generateEdanPdf(
  assessment: DamageAssessment,
  contingency: ContingencyEvent
): { doc: jsPDF; filename: string; blob: Blob } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header Banner - Professional Humanitarian Crimson & Charcoal (No official protected emblems)
  doc.setFillColor(185, 28, 28); // #b91c1c red
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SISTEMA DE EVALUACIÓN DE DAÑOS Y ANÁLISIS DE NECESIDADES (EDAN)', margin, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('DELEGACIÓN TEPATITLÁN DE MORELOS | OPERACIONES DE EMERGENCIA Y DESASTRES', margin, 18);

  // Subheader Bar
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 24, pageWidth, 10, 'F');
  doc.setTextColor(248, 250, 252);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`FOLIO: ${assessment.folio}`, margin, 30.5);
  doc.text(`FECHA/HORA: ${new Date(assessment.timestamp).toLocaleString('es-MX')}`, pageWidth - margin - 65, 30.5);

  let cursorY = 40;

  // 1. Datos Generales de la Contingencia
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('1. INFORMACIÓN DE LA CONTINGENCIA', margin, cursorY);
  cursorY += 4;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Evento / Contingencia', 'Tipo de Evento', 'Estado', 'Puesto de Mando (PMU)']],
    body: [
      [
        contingency.name,
        contingency.type,
        contingency.status,
        contingency.commandPostLocation.name,
      ],
    ],
  });

  cursorY = (doc as any).lastAutoTable.finalY + 7;

  // 2. Evaluador y Ubicación Geográfica
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. UBICACIÓN DEL SITIO Y PERSONAL EVALUADOR', margin, cursorY);
  cursorY += 4;

  const lat = assessment.location.lat.toFixed(5);
  const lng = assessment.location.lng.toFixed(5);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Evaluador Responsable', 'Credencial / Radio', 'Comunidad / Barrio', 'Dirección Exacta', 'Coordenadas GPS']],
    body: [
      [
        `${assessment.evaluator.name}\n(${assessment.evaluator.role})`,
        `Cred: ${assessment.evaluator.credential}\nRadio: ${assessment.evaluator.radioCallsign}`,
        assessment.location.community,
        `${assessment.location.streetAddress}\nRef: ${assessment.location.reference}`,
        `Lat: ${lat}\nLng: ${lng}\n(±${assessment.location.accuracyMeters || 5}m)`,
      ],
    ],
  });

  cursorY = (doc as any).lastAutoTable.finalY + 7;

  // 3. Severidad y Afectación a la Población
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('3. CLASIFICACIÓN DE DAÑOS Y POBLACIÓN AFECTADA', margin, cursorY);
  cursorY += 4;

  const pop = assessment.affectedPopulation;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [
      ['Sector Afectado', 'Nivel de Severidad', 'Familias', 'Lesionados', 'Desaparecidos', 'Fallecidos', 'Viviendas Afectadas / Inhabitables'],
    ],
    body: [
      [
        assessment.sector,
        assessment.severity.toUpperCase(),
        pop.familiesAffected.toString(),
        pop.peopleInjured.toString(),
        pop.peopleMissing.toString(),
        pop.peopleDeceased.toString(),
        `${pop.homesDamaged} dañadas / ${pop.homesInhabitable} inhabitables`,
      ],
    ],
  });

  cursorY = (doc as any).lastAutoTable.finalY + 4;

  // Vulnerable groups note
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Grupos de Alta Vulnerabilidad Identificados: ${pop.vulnerableGroups.children} Niños/as, ${pop.vulnerableGroups.elderly} Adultos Mayores, ${pop.vulnerableGroups.pregnant} Mujeres Embarazadas, ${pop.vulnerableGroups.disabled} Personas con Discapacidad.`,
    margin,
    cursorY
  );
  cursorY += 6;

  // 4. Estado de Líneas Vitales
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('4. ESTADO DE LÍNEAS VITALES Y SERVICIOS', margin, cursorY);
  cursorY += 4;

  const life = assessment.lifelines;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Agua Potable', 'Energía Eléctrica', 'Acceso Vial', 'Telecomunicaciones', 'Drenaje / Alcantarillado']],
    body: [
      [life.waterSupply, life.electricity, life.roadAccess, life.telecom, life.drainage],
    ],
  });

  cursorY = (doc as any).lastAutoTable.finalY + 7;

  // 5. Descripción del Daño y Acciones
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('5. DESCRIPCIÓN TÉCNICA DEL DAÑO Y ACCIONES DE RESPUESTA', margin, cursorY);
  cursorY += 4;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2 },
    body: [
      [
        {
          content: `DESCRIPCIÓN DEL DAÑO:\n${assessment.damageDescription}`,
          styles: { fillColor: [248, 250, 252], lineColor: [203, 213, 225], lineWidth: 0.2 },
        },
      ],
      [
        {
          content: `ACCIONES DE RESPUESTA REALIZADAS:\n${assessment.actionsTaken || 'Sin acciones registradas al momento.'}`,
          styles: { fillColor: [241, 245, 249], lineColor: [203, 213, 225], lineWidth: 0.2 },
        },
      ],
    ],
  });

  cursorY = (doc as any).lastAutoTable.finalY + 7;

  // 6. Matriz de Análisis de Necesidades
  if (cursorY > 230) {
    doc.addPage();
    cursorY = 20;
  }

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('6. ANÁLISIS Y MATRIZ DE NECESIDADES PRIORITARIAS', margin, cursorY);
  cursorY += 4;

  const needsRows = assessment.needs.map((n, idx) => [
    (idx + 1).toString(),
    n.category,
    n.itemDescription,
    `${n.quantityRequired} ${n.unit}`,
    `${n.quantityDelivered} ${n.unit}`,
    n.priority,
    n.status,
    n.notes || '-',
  ]);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['#', 'Categoría', 'Descripción de Insumo / Recurso', 'Requerido', 'Entregado', 'Prioridad', 'Estado', 'Observaciones']],
    body: needsRows.length > 0 ? needsRows : [['-', '-', 'No se han registrado solicitudes de necesidades específicas.', '-', '-', '-', '-', '-']],
  });

  cursorY = (doc as any).lastAutoTable.finalY + 14;

  // Check if we need page break for Signatures
  if (cursorY > 240) {
    doc.addPage();
    cursorY = 30;
  }

  // Firmas y Validaciones Técnicas (Firma exclusiva del Evaluador de Campo EDAN)
  const signatureWidth = 90;
  const signatureX = (pageWidth - signatureWidth) / 2;

  // Evaluator Signature Line
  doc.setDrawColor(100, 116, 139);
  doc.line(signatureX, cursorY + 16, signatureX + signatureWidth, cursorY + 16);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(assessment.evaluator.name, pageWidth / 2, cursorY + 21, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `EVALUADOR DE CAMPO EDAN | CREDENCIAL: ${assessment.evaluator.credential || 'CRM-TEPA'}`,
    pageWidth / 2,
    cursorY + 25,
    { align: 'center' }
  );
  if (assessment.evaluator.radioCallsign) {
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `INDICATIVO RADIO: ${assessment.evaluator.radioCallsign} | RESPONSABLE TÉCNICO DE LA EVALUACIÓN`,
      pageWidth / 2,
      cursorY + 29,
      { align: 'center' }
    );
  }

  // 7. ANEXO DE EVIDENCIAS FOTOGRÁFICAS Y MULTIMEDIA EN CAMPO
  const photos = assessment.attachments?.photos || [];
  const audios = assessment.attachments?.audios || [];

  if (photos.length > 0 || audios.length > 0) {
    doc.addPage();

    // Annex Banner Header
    doc.setFillColor(185, 28, 28);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('ANEXO: EVIDENCIAS FOTOGRÁFICAS Y REGISTRO EN CAMPO', margin, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`FOLIO: ${assessment.folio} | COMUNIDAD: ${assessment.location.community.toUpperCase()}`, margin, 16);

    let annexY = 28;

    if (photos.length > 0) {
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`REGISTRO FOTOGRÁFICO DE DAÑOS (${photos.length} EVIDENCIAS)`, margin, annexY);
      annexY += 5;

      const photoWidth = (pageWidth - margin * 2 - 8) / 2; // 2 columns layout
      const photoHeight = 56;
      const cardHeight = 78;

      photos.forEach((photo, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2) % 3;

        // If starting a new page (more than 6 photos per page)
        if (idx > 0 && idx % 6 === 0) {
          doc.addPage();
          doc.setFillColor(185, 28, 28);
          doc.rect(0, 0, pageWidth, 16, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(`ANEXO FOTOGRÁFICO (CONTINUACIÓN) - FOLIO: ${assessment.folio}`, margin, 11);
          annexY = 24;
        }

        const photoX = margin + col * (photoWidth + 8);
        const currentPhotoY = annexY + row * (cardHeight + 6);

        // Photo card container
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.rect(photoX, currentPhotoY, photoWidth, cardHeight, 'FD');

        // Render photo image safely
        try {
          if (photo.dataUrl && photo.dataUrl.startsWith('data:image/')) {
            // Determine image format (JPEG or PNG)
            const format = photo.dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
            doc.addImage(photo.dataUrl, format, photoX + 1.5, currentPhotoY + 1.5, photoWidth - 3, photoHeight);
          } else {
            // Fallback placeholder
            doc.setFillColor(226, 232, 240);
            doc.rect(photoX + 1.5, currentPhotoY + 1.5, photoWidth - 3, photoHeight, 'F');
            doc.setTextColor(100, 116, 139);
            doc.setFontSize(7.5);
            doc.text('Imagen no disponible', photoX + photoWidth / 2, currentPhotoY + photoHeight / 2, { align: 'center' });
          }
        } catch (imgErr) {
          console.warn('[PDF Image error]', imgErr);
        }

        // Caption box beneath the photo
        doc.setFillColor(30, 41, 59);
        doc.rect(photoX + 1.5, currentPhotoY + photoHeight + 1.5, photoWidth - 3, 19, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        const photoCaption = photo.caption || `Evidencia Fotográfica #${idx + 1}`;
        doc.text(photoCaption.substring(0, 40), photoX + 3.5, currentPhotoY + photoHeight + 6);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(203, 213, 225);
        doc.setFontSize(6.5);
        const photoType = photo.damageType || 'Inspección de Daños';
        doc.text(`Tipo: ${photoType}`, photoX + 3.5, currentPhotoY + photoHeight + 10.5);

        const photoDate = photo.timestamp ? new Date(photo.timestamp).toLocaleString('es-MX') : 'Fecha en campo';
        doc.text(`Captura: ${photoDate} | GPS: ${lat}, ${lng}`, photoX + 3.5, currentPhotoY + photoHeight + 15);
      });

      // Update annexY after photos
      const totalRows = Math.ceil(Math.min(photos.length, 6) / 2);
      annexY += totalRows * (cardHeight + 6) + 4;
    }

    // Audio notes annex if any
    if (audios.length > 0) {
      if (annexY > 210) {
        doc.addPage();
        annexY = 24;
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`REGISTRO DE NOTAS DE VOZ Y AUDIOS DE CAMPO (${audios.length})`, margin, annexY);
      annexY += 4;

      const audioRows = audios.map((a, i) => [
        `#${i + 1}`,
        a.title || 'Nota de Audio',
        `${Math.round(a.durationSeconds)} segundos`,
        new Date(a.timestamp).toLocaleString('es-MX'),
        'Grabación digital adjunta al expediente EDAN',
      ]);

      autoTable(doc, {
        startY: annexY,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
        head: [['#', 'Título de la Nota', 'Duración', 'Fecha y Hora', 'Estatus']],
        body: audioRows,
      });
    }
  }

  // Footer Note
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `EDAN Delegación Tepatitlán - Documento técnico operacional de emergencia - Página ${i} de ${pageCount}`,
      margin,
      290
    );
    doc.text(`Folio: ${assessment.folio}`, pageWidth - margin - 35, 290);
  }

  const filename = `Reporte_${assessment.folio}_${assessment.location.community.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const blob = doc.output('blob');

  return { doc, filename, blob };
}

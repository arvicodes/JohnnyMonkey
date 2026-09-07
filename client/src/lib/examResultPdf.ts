/** Erzeugt ein PDF der bewerteten Prüfung für SuS (Antworten + Note). */

function fillAnswersInDoc(doc: Document, answers: Record<string, unknown>) {
  Object.entries(answers || {}).forEach(([key, raw]) => {
    const value = raw == null ? '' : String(raw);
    const byId = doc.getElementById(key) as HTMLInputElement | HTMLTextAreaElement | null;
    if (byId) {
      if (byId instanceof HTMLInputElement && (byId.type === 'checkbox' || byId.type === 'radio')) {
        byId.checked = byId.value === value || value === 'true' || value === '1';
      } else {
        byId.value = value;
      }
      return;
    }
    const radios = doc.querySelectorAll(`input[name="${CSS.escape(key)}"]`);
    radios.forEach((node) => {
      const input = node as HTMLInputElement;
      input.checked = input.value === value;
    });
  });
}

export async function downloadExamResultPdf(opts: {
  htmlUrl: string;
  fileName: string;
  title: string;
  answers: Record<string, unknown>;
  gradeLabel: string;
  pointsText: string;
  classAverageText?: string;
}): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const html2canvas = (await import('html2canvas')).default;

  const res = await fetch(opts.htmlUrl);
  if (!res.ok) throw new Error('Prüfungsdatei konnte nicht geladen werden');
  let html = await res.text();

  const banner = `
    <div id="jm-result-banner" style="
      margin:0 0 16px;padding:12px 14px;border:2px solid #2e7d32;border-radius:8px;
      background:#e8f5e9;font-family:Arial,sans-serif;">
      <div style="font-size:13px;color:#555;margin-bottom:4px;">Bewertete Abgabe</div>
      <div style="font-size:20px;font-weight:800;color:#1b5e20;">Note ${opts.gradeLabel || '–'}</div>
      <div style="font-size:14px;font-weight:600;color:#2e7d32;margin-top:4px;">${opts.pointsText}</div>
      ${
        opts.classAverageText
          ? `<div style="font-size:12px;color:#546e7a;margin-top:6px;">Notenschnitt Klasse: ${opts.classAverageText}</div>`
          : ''
      }
    </div>`;

  if (/<body[^>]*>/i.test(html)) {
    html = html.replace(/<body([^>]*)>/i, `<body$1>${banner}`);
  } else {
    html = banner + html;
  }

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:820px;height:1160px;border:0;';
  document.body.appendChild(iframe);

  try {
    const idoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!idoc) throw new Error('PDF-Vorschau konnte nicht erstellt werden');
    idoc.open();
    idoc.write(html);
    idoc.close();
    await new Promise((r) => setTimeout(r, 250));
    fillAnswersInDoc(idoc, opts.answers);

    // Lehrer-Chrome / Submit ausblenden
    idoc.querySelectorAll(
      '.exam-chrome,.exam-toolbar,.submit-section,.schema-modal,.header-buttons,.teacher-only',
    ).forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });
    idoc.body.classList.add('show-solutions');

    const body = idoc.body;
    const canvas = await html2canvas(body, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: Math.max(body.scrollWidth, 800),
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    let heightLeft = imgH;
    let position = 0;
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
      heightLeft -= pageH;
    }

    const safe = (opts.fileName || opts.title || 'Pruefung')
      .replace(/\.(html|htm)$/i, '')
      .replace(/[^\w\-äöüÄÖÜß]+/g, '_');
    pdf.save(`${safe}_Bewertung.pdf`);
  } finally {
    iframe.remove();
  }
}

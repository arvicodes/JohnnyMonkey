/** Word-Vorschau: Seite an Panelbreite anpassen, nicht überdimensioniert. */
export const announcementDocxPreviewSx = {
  overflow: 'auto',
  bgcolor: '#eef1f4',
  py: 1.5,
  px: { xs: 0.75, sm: 1.25 },
  minHeight: 120,
  position: 'relative',
  '& .docx-wrapper': {
    margin: '0 auto',
    background: 'transparent',
    width: '100%',
    maxWidth: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  '& section.docx': {
    width: '100% !important',
    maxWidth: '680px',
    minHeight: 'unset !important',
    padding: '12mm 14mm !important',
    boxSizing: 'border-box',
    background: '#fff',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    margin: '0 auto 12px !important',
    overflow: 'hidden',
  },
  '& section.docx img, & section.docx svg, & section.docx canvas': {
    maxWidth: '100% !important',
    height: 'auto !important',
  },
  '& section.docx p': {
    marginTop: 0,
    marginBottom: 0,
  },
} as const;

export function resetDocxPreviewScale(host: HTMLElement): void {
  host.querySelectorAll('section.docx').forEach((page) => {
    const el = page as HTMLElement;
    el.style.transform = '';
    el.style.transformOrigin = '';
    el.style.marginBottom = '';
  });
}

export function fitDocxPreviewPages(host: HTMLElement): void {
  const wrapper = host.querySelector('.docx-wrapper') as HTMLElement | null;
  if (!wrapper) return;

  wrapper.style.transform = '';
  wrapper.style.transformOrigin = '';
  wrapper.style.height = '';

  const pages = Array.from(host.querySelectorAll('section.docx')) as HTMLElement[];
  if (pages.length === 0) return;

  const available = Math.max(host.clientWidth - 24, 280);
  pages.forEach((page) => {
    page.style.transform = '';
    page.style.transformOrigin = '';
    page.style.marginBottom = '';
    const pageWidth = page.scrollWidth || page.offsetWidth;
    if (pageWidth <= available) return;
    const scale = available / pageWidth;
    page.style.transform = `scale(${scale})`;
    page.style.transformOrigin = 'top center';
    page.style.marginBottom = `${page.offsetHeight * scale - page.offsetHeight}px`;
  });
}

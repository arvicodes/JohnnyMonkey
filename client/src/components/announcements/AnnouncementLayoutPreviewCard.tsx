import React from 'react';
import { Box, Typography } from '@mui/material';
import type { AnnouncementLayoutId, AnnouncementLayoutMeta } from './announcementLayouts';

type PreviewProps = {
  layout: AnnouncementLayoutMeta;
  title: string;
  text: string;
  images: string[];
  selected?: boolean;
  onClick?: () => void;
};

function PreviewContent({ layoutId, title, text, images }: { layoutId: AnnouncementLayoutId; title: string; text: string; images: string[] }) {
  const snippet = text.slice(0, 90) + (text.length > 90 ? '…' : '');
  const hero = images[0];

  if (layoutId === 'hero') {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
        <Box sx={{ height: '42%', bgcolor: hero ? 'transparent' : '#00838f', overflow: 'hidden' }}>
          {hero ? (
            <Box component="img" src={hero} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Box sx={{ width: '100%', height: '100%', bgcolor: '#b2dfdb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="caption" sx={{ color: '#00695c', fontWeight: 700 }}>Bild</Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ p: 0.75, flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.65rem', lineHeight: 1.2, mb: 0.35 }}>{title || 'Titel'}</Typography>
          <Typography sx={{ fontSize: '0.5rem', color: '#555', lineHeight: 1.35 }}>{snippet || 'Dein Text …'}</Typography>
        </Box>
      </Box>
    );
  }

  if (layoutId === 'magazine') {
    return (
      <Box sx={{ height: '100%', display: 'flex', bgcolor: '#fff' }}>
        <Box sx={{ width: '42%', overflow: 'hidden', bgcolor: '#e3f2fd' }}>
          {hero ? (
            <Box component="img" src={hero} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '0.45rem', color: '#3949ab' }}>Bild</Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ flex: 1, p: 0.6 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.55rem', lineHeight: 1.2, mb: 0.3 }}>{title || 'Titel'}</Typography>
          <Typography sx={{ fontSize: '0.45rem', color: '#555', lineHeight: 1.3 }}>{snippet || 'Text …'}</Typography>
        </Box>
      </Box>
    );
  }

  if (layoutId === 'gallery' || layoutId === 'grid2' || layoutId === 'grid3') {
    const preview = images.slice(0, 3);
    const extra = images.length - preview.length;
    return (
      <Box sx={{ height: '100%', p: 0.6, bgcolor: '#fff', display: 'flex', flexDirection: 'column' }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.55rem', mb: 0.35 }}>{title || 'Titel'}</Typography>
        <Typography sx={{ fontSize: '0.45rem', color: '#555', mb: 0.4, flex: images.length ? undefined : 1 }}>{snippet || 'Text …'}</Typography>
        <Box sx={{ display: 'flex', gap: 0.35, flex: 1, minHeight: 0 }}>
          {(images.length ? preview : [null, null, null].slice(0, layoutId === 'grid3' ? 3 : 2)).map((src, i) => (
            <Box key={i} sx={{ flex: 1, borderRadius: 0.5, overflow: 'hidden', bgcolor: '#f3e5f5', position: 'relative' }}>
              {src ? <Box component="img" src={src} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
              {extra > 0 && i === preview.length - 1 ? (
                <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '0.55rem' }}>+{extra}</Typography>
                </Box>
              ) : null}
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  if (layoutId === 'mosaic') {
    return (
      <Box sx={{ height: '100%', p: 0.6, bgcolor: '#fff', display: 'flex', gap: 0.35 }}>
        <Box sx={{ flex: 1.2, borderRadius: 0.5, overflow: 'hidden', bgcolor: '#e0f2f1' }}>
          {hero ? <Box component="img" src={hero} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
        </Box>
        <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.25 }}>
          {(images.slice(1, 5).length ? images.slice(1, 5) : [null, null]).map((src, i) => (
            <Box key={i} sx={{ bgcolor: '#b2dfdb', borderRadius: 0.35, overflow: 'hidden' }}>
              {src ? <Box component="img" src={src} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  if (layoutId === 'strip') {
    return (
      <Box sx={{ height: '100%', p: 0.6, bgcolor: '#fff', display: 'flex', flexDirection: 'column' }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.55rem', mb: 0.35 }}>{title || 'Titel'}</Typography>
        <Box sx={{ display: 'flex', gap: 0.35, flex: 1, overflow: 'hidden' }}>
          {(images.length ? images.slice(0, 4) : [null, null, null]).map((src, i) => (
            <Box key={i} sx={{ minWidth: '28%', borderRadius: 0.5, overflow: 'hidden', bgcolor: '#fce4ec' }}>
              {src ? <Box component="img" src={src} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  if (layoutId === 'stack') {
    return (
      <Box sx={{ height: '100%', p: 0.6, bgcolor: '#fff', display: 'flex', flexDirection: 'column', gap: 0.35 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.55rem' }}>{title || 'Titel'}</Typography>
        {(images.length ? images.slice(0, 2) : [null]).map((src, i) => (
          <Box key={i} sx={{ flex: 1, borderRadius: 0.5, overflow: 'hidden', bgcolor: '#f1f8e9' }}>
            {src ? <Box component="img" src={src} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
          </Box>
        ))}
      </Box>
    );
  }

  // accent
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
      <Box sx={{ bgcolor: '#f57c00', px: 0.6, py: 0.45 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.55rem', color: '#fff', lineHeight: 1.2 }} noWrap>
          {title || 'Titel'}
        </Typography>
      </Box>
      <Box sx={{ flex: 1, display: 'flex', p: 0.5, gap: 0.4 }}>
        <Box sx={{ width: '38%', borderRadius: 0.5, overflow: 'hidden', bgcolor: '#ffe0b2' }}>
          {hero ? (
            <Box component="img" src={hero} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : null}
        </Box>
        <Box sx={{ flex: 1, bgcolor: '#fff8e1', borderRadius: 0.5, p: 0.4 }}>
          <Typography sx={{ fontSize: '0.42rem', color: '#555', lineHeight: 1.3 }}>{snippet || 'Text …'}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

export function AnnouncementLayoutPreviewCard({ layout, title, text, images, selected, onClick }: PreviewProps) {
  return (
    <Box
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        cursor: 'pointer',
        border: '2px solid',
        borderColor: selected ? layout.accent : 'divider',
        boxShadow: selected ? `0 4px 16px ${layout.accent}44` : 'none',
        transition: 'all 0.15s ease',
        '&:hover': { borderColor: layout.accent, transform: 'translateY(-2px)' },
      }}
    >
      <Box sx={{ height: 14, background: layout.previewGradient }} />
      <Box sx={{ height: 118, overflow: 'hidden' }}>
        <PreviewContent layoutId={layout.id} title={title} text={text} images={images} />
      </Box>
      <Box sx={{ px: 1, py: 0.75, bgcolor: selected ? `${layout.accent}14` : '#fafafa' }}>
        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', color: layout.accent }}>
          {layout.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', lineHeight: 1.3 }}>
          {layout.description}
        </Typography>
      </Box>
    </Box>
  );
}

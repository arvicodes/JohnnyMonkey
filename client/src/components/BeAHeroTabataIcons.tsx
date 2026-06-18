import React from 'react';
import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';
import type { TabataMode } from '../lib/tabata';

const iconSx = (props?: SvgIconProps): SvgIconProps['sx'] => ({
  display: 'block',
  fontSize: 'inherit',
  color: 'inherit',
  ...props?.sx,
});

/** Gestapelte Pyramidenstufen — gut erkennbar auch klein. */
export function TabataPyramidIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24" sx={iconSx(props)}>
      <path fill="currentColor" d="M12 1.5 2.5 20.5h19L12 1.5z" />
      <path fill="currentColor" opacity="0.55" d="M12 6 6.5 17.5h11L12 6z" />
      <path fill="currentColor" opacity="0.35" d="M12 10 9.5 15.5h5L12 10z" />
      <rect fill="currentColor" opacity="0.2" x="10.5" y="15.5" width="3" height="2.5" rx="0.4" />
    </SvgIcon>
  );
}

/** Boxsack mit Aufhängung — breite Silhouette. */
export function TabataBoxingBagIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24" sx={iconSx(props)}>
      <circle fill="currentColor" cx="12" cy="2.4" r="1.1" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        d="M12 3.5v2.2"
      />
      <path
        fill="currentColor"
        d="M8.2 6.4h7.6c1.15 0 2.1.95 2.1 2.1 0 3.4-1 7.6-2.75 10.6-1 1.65-2.55 2.6-4.45 2.6s-3.45-.95-4.45-2.6C6.1 16.1 5.1 11.9 5.1 8.5c0-1.15.95-2.1 2.1-2.1z"
      />
      <ellipse fill="currentColor" opacity="0.3" cx="12" cy="20.8" rx="4.2" ry="1.15" />
    </SvgIcon>
  );
}

export function tabataModeIcon(mode: TabataMode, props?: SvgIconProps) {
  if (mode === 'pyramid') {
    return <TabataPyramidIcon {...props} />;
  }
  return <TabataBoxingBagIcon {...props} />;
}

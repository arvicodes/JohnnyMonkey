import React from 'react';
import {
  Computer as ComputerIcon,
  Code as CodeIcon,
  Functions as FunctionsIcon,
  EmojiEmotions as EmojiEmotionsIcon,
  MenuBook as LessonIcon,
} from '@mui/icons-material';

export const DEFAULT_LEARNING_GROUP_COLOR = '#1976d2';
export const DEFAULT_LEARNING_GROUP_ICON = '👥';

export const LEARNING_GROUP_COLOR_PRESETS = [
  '#1976d2',
  '#1565c0',
  '#2E7D32',
  '#388e3c',
  '#F9A825',
  '#fbc02d',
  '#E65100',
  '#ef6c00',
  '#006064',
  '#0097A7',
  '#9C27B0',
  '#7b1fa2',
  '#d32f2f',
  '#c62828',
  '#455a64',
  '#5d4037',
] as const;

export const LEARNING_GROUP_ICON_OPTIONS = [
  '👥', '🎓', '📚', '💻', '🧮', '🔬', '🎨', '🏫', '📝', '✏️',
  '📐', '🧪', '🎭', '🎵', '🌍', '🚀', '🦉', '🌱', '⚽', '🏃',
  '👨‍🎓', '👩‍🎓', '👨‍💻', '👩‍💻', '🧙‍♂️', '🧙‍♀️', '🤖', '💡', '📊', '🗂️',
  '🐱', '🐶', '🦄', '🐉', '🦁', '🐼', '🦊', '🐸', '🦋', '🌟',
] as const;

export interface LearningGroupAppearance {
  name: string;
  iconEmoji?: string | null;
  color?: string | null;
}

export interface LearningGroupDisplayStyle {
  groupColor: string;
  rowIconColor: string;
  boxBg: string;
  boxHover: string;
  boxBorder: string;
  hasCustomStyle: boolean;
  prefixIcon: React.ReactNode;
  titleFontWeight: number | string;
  titleFontSize: string;
}

function hexWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function resolveLearningGroupDisplayStyle(
  group: LearningGroupAppearance,
  fallbackPrimary: string
): LearningGroupDisplayStyle {
  if (group.color) {
    const groupColor = group.color;
    const iconEmoji = group.iconEmoji || DEFAULT_LEARNING_GROUP_ICON;
    return {
      groupColor,
      rowIconColor: groupColor,
      boxBg: hexWithAlpha(groupColor, 0.14),
      boxHover: hexWithAlpha(groupColor, 0.24),
      boxBorder: `1px solid ${hexWithAlpha(groupColor, 0.45)}`,
      hasCustomStyle: true,
      prefixIcon: React.createElement(
        'span',
        { style: { fontSize: '1.35rem', lineHeight: 1 } },
        iconEmoji
      ),
      titleFontWeight: 'bold',
      titleFontSize: '0.72rem',
    };
  }

  const isInformatik = /informatik|gk\s*11|gk\s*12/i.test(group.name);
  const isInformatikGK12 = /gk\s*12|informatik\s*gk\s*12/i.test(group.name);
  const isMatheLK = /mathe\s*lk\s*11/i.test(group.name);
  const is7a = /7a|klasse\s*7a/i.test(group.name);
  const is10c = /10c|klasse\s*10c/i.test(group.name);
  const groupColor = isInformatik
    ? isInformatikGK12
      ? '#0097A7'
      : '#006064'
    : isMatheLK
      ? '#2E7D32'
      : is7a
        ? '#F9A825'
        : is10c
          ? '#E65100'
          : fallbackPrimary;
  const rowIconColor = isInformatik
    ? isInformatikGK12
      ? '#1976D2'
      : '#9C27B0'
    : isMatheLK
      ? '#2E7D32'
      : is7a
        ? '#F9A825'
        : is10c
          ? '#E65100'
          : fallbackPrimary;

  const prefixIcon = group.iconEmoji
    ? React.createElement(
        'span',
        { style: { fontSize: '1.35rem', lineHeight: 1 } },
        group.iconEmoji
      )
    : isInformatik
      ? isInformatikGK12
        ? React.createElement(CodeIcon, { sx: { fontSize: '1.35rem', color: rowIconColor } })
        : React.createElement(ComputerIcon, { sx: { fontSize: '1.35rem', color: rowIconColor } })
      : isMatheLK
        ? React.createElement(FunctionsIcon, { sx: { fontSize: '1.35rem', color: rowIconColor } })
        : is7a
          ? React.createElement(EmojiEmotionsIcon, { sx: { fontSize: '1.35rem', color: '#FF9800' } })
          : is10c
            ? React.createElement(LessonIcon, { sx: { fontSize: '1.35rem', color: rowIconColor } })
            : null;

  return {
    groupColor,
    rowIconColor,
    boxBg: isInformatik
      ? isInformatikGK12
        ? 'rgba(0, 151, 167, 0.16)'
        : 'rgba(0, 96, 100, 0.14)'
      : isMatheLK
        ? 'rgba(46, 125, 50, 0.14)'
        : is7a
          ? 'rgba(249, 168, 37, 0.16)'
          : is10c
            ? 'rgba(230, 81, 0, 0.12)'
            : `${groupColor}10`,
    boxHover: isInformatik
      ? isInformatikGK12
        ? 'rgba(0, 151, 167, 0.28)'
        : 'rgba(0, 96, 100, 0.25)'
      : isMatheLK
        ? 'rgba(46, 125, 50, 0.25)'
        : is7a
          ? 'rgba(249, 168, 37, 0.28)'
          : is10c
            ? 'rgba(230, 81, 0, 0.22)'
            : `${groupColor}20`,
    boxBorder: isInformatik
      ? `2px solid ${groupColor}`
      : isMatheLK || is7a || is10c
        ? `1px solid ${groupColor}50`
        : 'none',
    hasCustomStyle: Boolean(group.iconEmoji) || isInformatik || isMatheLK || is7a || is10c,
    prefixIcon,
    titleFontWeight: isMatheLK ? 800 : 'bold',
    titleFontSize: isMatheLK ? '0.9rem' : '0.72rem',
  };
}

/** Pfade unter J-M-Reihen/Informatik (und Varianten). */
export function isInformatikFolderPath(path: string): boolean {
  return /(^|\/)Informatik(\/|$)/i.test(String(path || '').replace(/\\/g, '/'));
}

export const INFORMATIK_FOLDER_BORDER = '2px solid #006064';
export const INFORMATIK_FOLDER_BORDER_SOFT = '#80cbc4';
export const INFORMATIK_FOLDER_BG = 'rgba(0, 96, 100, 0.14)';

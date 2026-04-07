import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, IconButton, Tooltip, Popover, MenuItem } from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatListBulleted,
  FormatListNumbered,
  FormatIndentDecrease,
  Image,
} from '@mui/icons-material';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  compact?: boolean;
}

const colors = [
  { name: 'Schwarz', value: '#000000' },
  { name: 'Dunkelgrau', value: '#374151' },
  { name: 'Grau', value: '#6b7280' },
  { name: 'Rot', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Grün', value: '#16a34a' },
  { name: 'Blau', value: '#2563eb' },
  { name: 'Lila', value: '#9333ea' },
  { name: 'Braun', value: '#92400e' },
  { name: 'Türkis', value: '#0d9488' },
  { name: 'Rosa', value: '#db2777' },
  { name: 'Gelb', value: '#ca8a04' },
];

const toolbarSymbols = [
  { label: 'Pfeil', char: '→' },
  { label: 'Doppelpfeil', char: '⇒' },
  { label: 'Aufzählung', char: '•' },
  { label: 'Haken', char: '✓' },
  { label: 'Kreuz', char: '✗' },
  { label: 'Punkt', char: '·' },
  { label: 'Gedankenstrich', char: '–' },
  { label: 'Ellipse', char: '…' },
];

// Verwende das gleiche Farbschema wie in der App
const appColors = {
  primary: '#2E7D32',
  secondary: '#F57C00',
  accent1: '#1976D32',
  accent2: '#C2185B',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  border: '#E0E0E0',
};

/**
 * Entfernt text-align / align aus eingefügtem oder gespeichertem HTML (Word, Google Docs, Browser),
 * damit der Text wirklich links startet – sonst schlagen Inline-Styles das Editor-CSS.
 */
function sanitizeEditorHtmlForLeftAlign(html: string): string {
  if (!html || typeof html !== 'string') return html;
  let s = html.replace(/\salign\s*=\s*["']?(?:center|right|justify)["']?/gi, '');
  s = s.replace(/style\s*=\s*["']([^"']*)["']/gi, (_match, styles: string) => {
    const cleaned = styles
      .replace(/text-align\s*:\s*[^;]+;?/gi, '')
      /* Google Docs / Browser: schiebt Blöcke nach rechts */
      .replace(/margin-left\s*:\s*[^;]+;?/gi, '')
      .replace(/padding-left\s*:\s*[^;]+;?/gi, '')
      .replace(/text-indent\s*:\s*[^;]+;?/gi, '')
      .replace(/;\s*;/g, ';')
      .trim()
      .replace(/^;+|;+$/g, '');
    if (!cleaned) return '';
    return `style="${cleaned}"`;
  });
  s = s.replace(/\sstyle\s*=\s*["']\s*["']/gi, '');
  return s;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  compact = false,
}) => {
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [isUploading, setIsUploading] = useState(false);
  const [hexInput, setHexInput] = useState('#000000');
  const [fontSize, setFontSize] = useState('1rem');
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const fontSizePickerRef = useRef<HTMLDivElement>(null);

  const FONT_SIZE_OPTIONS = [
    { label: 'Klein', value: '0.875rem' },
    { label: 'Normal', value: '1rem' },
    { label: 'Groß', value: '1.125rem' },
    { label: 'Sehr groß', value: '1.25rem' },
  ];
  
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastValueRef = useRef(value);
  const lastReceivedValueRef = useRef(value);
  /** true solange der Nutzer dieses Feld aktiv bearbeitet (zuverlässiger als activeElement im useEffect). */
  const isEditingRef = useRef(false);
  const showFontSizePickerRef = useRef(false);
  /** Toolbar + Editor: Fokus-Tracking ohne falsches „Blur“ nur wegen Toolbar-Klick */
  const rootRef = useRef<HTMLDivElement | null>(null);
  /** Pro Wrapper nur einmal Hover/Contextmenu – Griff wird bei Bedarf erneuert */
  const imageResizeUiAttached = useRef(new WeakSet<HTMLElement>());

  // Debounced onChange to prevent excessive updates
  const debouncedOnChange = useCallback((newValue: string) => {
    // IMPORTANT: In den Stundenmodals wird "Fertig" direkt nach dem Edit-Click ausgelöst.
    // Wenn wir hier (wie bisher) debouncen, ist der Parent-State evtl. noch nicht aktualisiert,
    // und "Fertig" speichert dann die alte Version. Deshalb: sofort weitergeben.
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    lastValueRef.current = newValue;
    onChange(newValue);
  }, [onChange]);

  // Save cursor position with more robust selection handling
  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current && editorRef.current.contains(selection.anchorNode)) {
      try {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(editorRef.current);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        return {
          offset: preCaretRange.toString().length,
          node: range.endContainer,
          nodeOffset: range.endOffset
        };
      } catch (error) {
        console.warn('Error saving cursor position:', error);
        return { offset: 0, node: null, nodeOffset: 0 };
      }
    }
    return { offset: 0, node: null, nodeOffset: 0 };
  };

  // Offset-basiertes Speichern der Auswahl (überlebt Fokusverlust / Re-Render)
  const getSelectionOffsets = (): { start: number; end: number } | null => {
    if (!editorRef.current) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return null;
    try {
      const pre = document.createRange();
      pre.selectNodeContents(editorRef.current);
      pre.setEnd(range.startContainer, range.startOffset);
      const start = pre.toString().length;
      const end = start + range.toString().length;
      return { start, end };
    } catch {
      return null;
    }
  };

  const restoreSelectionByOffsets = (start: number, end: number): boolean => {
    if (!editorRef.current) return false;
    try {
      const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
      let pos = 0;
      let startNode: Node | null = null;
      let startOffset = 0;
      let endNode: Node | null = null;
      let endOffset = 0;
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const len = node.textContent?.length ?? 0;
        if (pos + len > start && startNode === null) {
          startNode = node;
          startOffset = Math.min(start - pos, len);
        }
        if (pos + len >= end && endNode === null) {
          endNode = node;
          endOffset = Math.min(end - pos, len);
          break;
        }
        pos += len;
      }
      if (!startNode) {
        startNode = editorRef.current;
        startOffset = 0;
      }
      if (!endNode) {
        endNode = startNode;
        endOffset = (startNode as Text).textContent?.length ?? 0;
      }
      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      const selection = window.getSelection();
      if (!selection) return false;
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    } catch {
      return false;
    }
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const text = range.toString();
    if (!text) return null;
    const offsets = getSelectionOffsets();
    if (!offsets) return null;
    return {
      text,
      start: offsets.start,
      end: offsets.end,
      startContainer: range.startContainer,
      startOffset: range.startOffset,
      endContainer: range.endContainer,
      endOffset: range.endOffset
    };
  };

  const restoreSelection = (saved: any) => {
    if (!saved || !editorRef.current) return false;
    if (typeof saved.start === 'number' && typeof saved.end === 'number') {
      return restoreSelectionByOffsets(saved.start, saved.end);
    }
    try {
      const range = document.createRange();
      range.setStart(saved.startContainer, saved.startOffset);
      range.setEnd(saved.endContainer, saved.endOffset);
      if (!editorRef.current.contains(range.commonAncestorContainer)) return false;
      const selection = window.getSelection();
      if (!selection) return false;
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    } catch {
      return false;
    }
  };

  // Restore cursor position with fallback strategies
  const restoreCursorPosition = (savedPosition: { offset: number; node: any; nodeOffset: number }) => {
    if (!editorRef.current) return;
    
    try {
      // Strategy 1: Try to restore to the exact same node if it still exists
      if (savedPosition.node && editorRef.current.contains(savedPosition.node)) {
        const range = document.createRange();
        const maxOffset = Math.min(savedPosition.nodeOffset, savedPosition.node.textContent?.length || 0);
        range.setStart(savedPosition.node, maxOffset);
        range.collapse(true);
        
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        return;
      }

      // Strategy 2: Restore by text offset
      const walker = document.createTreeWalker(
        editorRef.current,
        NodeFilter.SHOW_TEXT
      );
      
      let currentPos = 0;
      let node;
      
      // eslint-disable-next-line no-cond-assign
      while (node = walker.nextNode()) {
        const nodeLength = node.textContent?.length || 0;
        if (currentPos + nodeLength >= savedPosition.offset) {
          const range = document.createRange();
          const offsetInNode = Math.min(savedPosition.offset - currentPos, nodeLength);
          range.setStart(node, offsetInNode);
          range.collapse(true);
          
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          return;
        }
        currentPos += nodeLength;
      }

      // Strategy 3: Fallback - place cursor at end
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    } catch (error) {
      console.warn('Error restoring cursor position:', error);
    }
  };

  useEffect(() => {
    showFontSizePickerRef.current = showFontSizePicker;
  }, [showFontSizePicker]);

  const flushEditorToParent = useCallback(() => {
    if (!editorRef.current) return;
    const newValue = editorRef.current.innerHTML;
    if (newValue !== lastValueRef.current) debouncedOnChange(newValue);
  }, [debouncedOnChange]);

  // Fokus irgendwo in Toolbar+Editor = Bearbeitung; nur wenn Fokus die ganze Komponente verlässt → Sync erlauben
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onFocusIn = () => {
      isEditingRef.current = true;
    };

    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (next && root.contains(next)) return;
      window.setTimeout(() => {
        if (showFontSizePickerRef.current) return;
        const ae = document.activeElement;
        if (ae && root.contains(ae)) return;
        isEditingRef.current = false;
        flushEditorToParent();
      }, 0);
    };

    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);
    return () => {
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
    };
  }, [flushEditorToParent]);

  useEffect(() => {
    if (!editorRef.current) return;
    const host = editorRef.current;
    // Während Eingabe oder offenem Schriftgrößen-Popover (Portal): kein innerHTML aus Props —
    // sonst springt der Cursor nach vorn / Inhalt flackert.
    if (isEditingRef.current || showFontSizePicker) {
      lastReceivedValueRef.current = value;
      return;
    }

    const currentContent = host.innerHTML;
    const safeValue = sanitizeEditorHtmlForLeftAlign(value);
    const editorEmpty = !currentContent || currentContent.trim() === '' || currentContent === '<br>' || currentContent === '<br/>';
    const valueNonEmpty = value && value.trim() !== '';
    const valueChangedExternally = value !== lastReceivedValueRef.current;
    lastReceivedValueRef.current = value;

    // Bereits identisch (nach Links-Sanitisierung): nichts anfassen
    if (valueChangedExternally && currentContent === safeValue) {
      lastValueRef.current = safeValue;
      return;
    }

    const shouldUpdate = valueChangedExternally || (editorEmpty && valueNonEmpty);
    if (shouldUpdate) {
      const cursorPosition = saveCursorPosition();
      host.innerHTML = safeValue;
      lastValueRef.current = safeValue;
      requestAnimationFrame(() => {
        restoreCursorPosition(cursorPosition);
      });
    }
  }, [value, showFontSizePicker]);

  // Parent-Wert spiegeln (ohne DOM anzufassen)
  useEffect(() => {
    lastValueRef.current = value;
  }, [value]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Click outside: Schriftgrößen-Popover schließen
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (fontSizePickerRef.current && !fontSizePickerRef.current.contains(target)) setShowFontSizePicker(false);
    };
    if (showFontSizePicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFontSizePicker]);

  const syncFormatStateFromDocument = useCallback(() => {
    try {
      const el = document.activeElement;
      const host = editorRef.current;
      if (!host || !el || (el !== host && !host.contains(el))) return;
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
    } catch {
      /* ignore */
    }
  }, []);

  const handleFocus = useCallback(() => {
    isEditingRef.current = true;
    syncFormatStateFromDocument();
  }, [syncFormatStateFromDocument]);

  const handleSelectionChange = useCallback(() => {
    if (!editorRef.current) return;
    const ae = document.activeElement;
    const host = editorRef.current;
    if (!ae || (ae !== host && !host.contains(ae))) return;
    syncFormatStateFromDocument();
  }, [syncFormatStateFromDocument]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  const execCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    
    try {
      editorRef.current.focus();
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      
      document.execCommand(command, false, value);
      handleInput();
      requestAnimationFrame(() => syncFormatStateFromDocument());
    } catch (error) {
      console.warn('Error executing command:', command, error);
    }
  };

  const applyStyle = (style: string) => {
    if (!editorRef.current) return;
    
    try {
      switch (style) {
        case 'bold':
          execCommand('bold');
          break;
        case 'italic':
          execCommand('italic');
          break;
        case 'underline':
          execCommand('underline');
          break;
      }
    } catch (error) {
      console.warn('Error applying style:', style, error);
    }
  };

  const wrapSelectionWithStyle = (styleKey: string, styleValue: string) => {
    if (!editorRef.current) return false;
    const saved = (window as any).savedTextSelection;
    editorRef.current.focus();
    if (!saved || !saved.text) return false;
    if (!restoreSelection(saved)) return false;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer) || range.collapsed) return false;
    try {
      const fragment = range.extractContents();
      const span = document.createElement('span');
      (span.style as any)[styleKey] = styleValue;
      span.appendChild(fragment);
      range.insertNode(span);
      range.setStartAfter(span);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      (window as any).savedTextSelection = null;
      handleInput();
      return true;
    } catch {
      return false;
    }
  };

  const applyColor = (color: string) => {
    if (!editorRef.current) return;
    setSelectedColor(color);
    setHexInput(color);
    wrapSelectionWithStyle('color', color);
  };

  const applyFontSize = (size: string) => {
    setFontSize(size);
    wrapSelectionWithStyle('fontSize', size);
    setShowFontSizePicker(false);
  };

  const insertSymbol = (char: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    try {
      document.execCommand('insertText', false, char);
      handleInput();
    } catch {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const text = document.createTextNode(char);
        range.deleteContents();
        range.insertNode(text);
        range.setStartAfter(text);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        handleInput();
      }
    }
  };

  const applyAlignment = (align: 'left' | 'center' | 'right') => {
    try {
      execCommand(`justify${align.charAt(0).toUpperCase() + align.slice(1)}`);
      setAlignment(align);
    } catch (error) {
      console.warn('Error applying alignment:', error);
    }
  };

  /** Gesamten Inhalt markieren: links ausrichten und Listen-/Block-Einzüge reduzieren. */
  const normalizeWholeEditorToLeft = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    try {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      document.execCommand('justifyLeft');
      for (let i = 0; i < 28; i++) {
        document.execCommand('outdent');
      }
      sel?.removeAllRanges();
      setAlignment('left');
      const cleaned = sanitizeEditorHtmlForLeftAlign(editorRef.current.innerHTML);
      if (cleaned !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = cleaned;
      }
      handleInput();
    } catch (e) {
      console.warn('normalizeWholeEditorToLeft:', e);
    }
  };

  // Wrappt die aktuelle Textauswahl (selection range) in einen <span> mit inline-styles.
  // So funktionieren die Markierungen auch ohne Tokens (kein [[ANS:..]]).
  const wrapCurrentSelectionWithSpan = (styles: Record<string, string>, title?: string) => {
    if (!editorRef.current) return false;
    editorRef.current.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return false;
    if (range.collapsed) return false;

    try {
      const extracted = range.extractContents();
      const span = document.createElement('span');
      if (title) span.title = title;
      Object.entries(styles).forEach(([k, v]) => {
        (span.style as any)[k] = v;
      });
      span.appendChild(extracted);
      range.insertNode(span);

      const nextRange = document.createRange();
      nextRange.setStartAfter(span);
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      handleInput();
      return true;
    } catch (e) {
      console.warn('wrapCurrentSelectionWithSpan failed:', e);
      return false;
    }
  };

  const surroundCurrentSelectionWithQuotes = (
    quoteStart: string,
    quoteEnd: string,
    styles: Record<string, string>,
    title?: string
  ) => {
    if (!editorRef.current) return false;
    editorRef.current.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return false;
    if (range.collapsed) return false;

    try {
      const extracted = range.extractContents();
      const span = document.createElement('span');
      if (title) span.title = title;
      Object.entries(styles).forEach(([k, v]) => {
        (span.style as any)[k] = v;
      });
      span.appendChild(extracted);

      const startQuoteNode = document.createTextNode(quoteStart);
      const endQuoteNode = document.createTextNode(quoteEnd);

      const combined = document.createDocumentFragment();
      combined.appendChild(startQuoteNode);
      combined.appendChild(span);
      combined.appendChild(endQuoteNode);

      range.insertNode(combined);

      const nextRange = document.createRange();
      nextRange.setStartAfter(endQuoteNode);
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      handleInput();
      return true;
    } catch (e) {
      console.warn('surroundCurrentSelectionWithQuotes failed:', e);
      return false;
    }
  };

  const createList = (ordered: boolean) => {
    try {
      execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList');
    } catch (error) {
      console.warn('Error creating list:', error);
    }
  };

  const indentList = (direction: 'in' | 'out') => {
    try {
      if (direction === 'in') {
        execCommand('indent');
      } else {
        execCommand('outdent');
      }
    } catch (error) {
      console.warn('Error indenting list:', error);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/materials/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Fehler beim Hochladen des Bildes');
      }

      const result = await response.json();

      if (editorRef.current) {
        const wrap = document.createElement('span');
        wrap.className = 'editor-image-wrap';
        wrap.setAttribute('contenteditable', 'false');
        wrap.style.cssText =
          'position:relative;display:inline-block;max-width:100%;vertical-align:middle;line-height:0;margin:8px 0;';

        const imgElement = document.createElement('img');
        imgElement.setAttribute('draggable', 'false');
        imgElement.src = result.imagePath;
        imgElement.alt = result.fileName;
        imgElement.style.maxWidth = '100%';
        imgElement.style.height = 'auto';
        imgElement.style.display = 'block';
        imgElement.style.cursor = 'default';

        imgElement.setAttribute('data-original-width', '0');
        imgElement.setAttribute('data-original-height', '0');

        wrap.appendChild(imgElement);

        imgElement.onload = () => {
          imgElement.setAttribute('data-original-width', imgElement.naturalWidth.toString());
          imgElement.setAttribute('data-original-height', imgElement.naturalHeight.toString());
          makeImageResizable(imgElement);
        };

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(wrap);
          range.setStartAfter(wrap);
          range.setEndAfter(wrap);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          editorRef.current.appendChild(wrap);
        }

        const newRange = document.createRange();
        newRange.setStartAfter(wrap);
        newRange.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(newRange);

        handleInput();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error instanceof Error ? error.message : 'Fehler beim Hochladen des Bildes');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const newValue = editorRef.current.innerHTML;
    // Only trigger onChange if editor content actually changed.
    // Wichtig: Wir filtern nur gegen den letzten bekannten Editor-Wert,
    // nicht zusätzlich gegen `value` (das kann im selben Event-Tick noch stale sein).
    if (newValue !== lastValueRef.current) debouncedOnChange(newValue);
  }, [debouncedOnChange]);

  /** <img> darf keine Kindelemente haben – Griff sitzt im Wrapper-Span. */
  const ensureEditorImageWrap = (img: HTMLImageElement): HTMLSpanElement => {
    const p = img.parentElement;
    if (p?.classList.contains('editor-image-wrap')) {
      return p as HTMLSpanElement;
    }
    const wrap = document.createElement('span');
    wrap.className = 'editor-image-wrap';
    wrap.setAttribute('contenteditable', 'false');
    wrap.style.cssText =
      'position:relative;display:inline-block;max-width:100%;vertical-align:middle;line-height:0;margin:8px 0;';
    img.parentNode?.insertBefore(wrap, img);
    wrap.appendChild(img);
    img.style.margin = '0';
    img.style.display = 'block';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    return wrap;
  };

  const makeImageResizable = useCallback(
    (img: HTMLImageElement) => {
      if (img.hasAttribute('data-editor-icon')) return;

      const wrap = ensureEditorImageWrap(img);
      wrap.querySelector('.resize-handle')?.remove();

      const handle = document.createElement('div');
      handle.className = 'resize-handle';
      handle.setAttribute('contenteditable', 'false');
      handle.title = 'Ziehen zum Größenändern';
      handle.style.cssText = `
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 18px;
      height: 18px;
      background: ${appColors.primary};
      border: 2px solid white;
      border-radius: 4px;
      cursor: se-resize;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.15s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      pointer-events: auto;
    `;

      let isResizing = false;
      let startX = 0;
      let startWidth = 0;
      let aspectRatio = 1;

      const showHandle = () => {
        const h = wrap.querySelector('.resize-handle') as HTMLElement | null;
        if (h) h.style.opacity = '1';
      };
      const hideHandle = () => {
        if (isResizing) return;
        const h = wrap.querySelector('.resize-handle') as HTMLElement | null;
        if (h) h.style.opacity = '0';
      };

      const startResize = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        startX = e.clientX;
        const ow = img.offsetWidth;
        const oh = img.offsetHeight;
        const w = ow || img.naturalWidth || 200;
        const h = oh || img.naturalHeight || 1;
        startWidth = ow || w;
        aspectRatio = w / h;
        document.body.style.cursor = 'se-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', endResize);
      };

      const doResize = (e: MouseEvent) => {
        if (!isResizing) return;
        const editorW = editorRef.current?.clientWidth ?? 800;
        const deltaX = e.clientX - startX;
        const minW = 40;
        const maxW = Math.max(minW, editorW - 4);
        const newWidth = Math.max(minW, Math.min(maxW, startWidth + deltaX));
        const newHeight = newWidth / aspectRatio;
        img.style.width = `${newWidth}px`;
        img.style.height = `${newHeight}px`;
        img.style.maxWidth = 'none';
      };

      const endResize = () => {
        if (!isResizing) return;
        isResizing = false;
        hideHandle();
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', endResize);
        handleInput();
      };

      if (!imageResizeUiAttached.current.has(wrap)) {
        wrap.addEventListener('mouseenter', showHandle);
        wrap.addEventListener('mouseleave', hideHandle);
        img.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (window.confirm('Dieses Bild löschen?')) {
            wrap.remove();
            imageResizeUiAttached.current.delete(wrap);
            handleInput();
          }
        });
        imageResizeUiAttached.current.add(wrap);
      }

      wrap.appendChild(handle);
      handle.addEventListener('mousedown', startResize);
    },
    [handleInput],
  );

  useEffect(() => {
    if (!editorRef.current) return;
    const timeoutId = window.setTimeout(() => {
      const images = editorRef.current?.querySelectorAll('img:not([data-editor-icon])');
      images?.forEach((node) => {
        makeImageResizable(node as HTMLImageElement);
      });
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [value, makeImageResizable]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      try {
        const inList = editorRef.current && (document.queryCommandState('insertUnorderedList') || document.queryCommandState('insertOrderedList'));
        if (!inList) {
          e.preventDefault();
          document.execCommand('insertLineBreak', false, undefined);
          handleInput();
        }
      } catch (_) {
        e.preventDefault();
        document.execCommand('insertHTML', false, '<br>');
        handleInput();
      }
      return;
    }
    if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      applyStyle('bold');
    } else if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      applyStyle('italic');
    } else if (e.key === 'u' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      applyStyle('underline');
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      indentList('out');
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      indentList('in');
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!editorRef.current) return;
    try {
      const cd = e.clipboardData;
      if (cd) {
        if (cd.files && cd.files.length > 0) {
          const f = cd.files[0];
          if (f.type.startsWith('image/')) {
            e.preventDefault();
            editorRef.current.focus();
            void handleImageUpload(f);
            return;
          }
        }
        if (cd.items) {
          for (let i = 0; i < cd.items.length; i++) {
            const item = cd.items[i];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
              const blob = item.getAsFile();
              if (blob) {
                e.preventDefault();
                editorRef.current.focus();
                const ext =
                  blob.type === 'image/png'
                    ? 'png'
                    : blob.type === 'image/jpeg' || blob.type === 'image/jpg'
                      ? 'jpg'
                      : blob.type === 'image/gif'
                        ? 'gif'
                        : blob.type === 'image/webp'
                          ? 'webp'
                          : 'png';
                const file = blob.name
                  ? blob
                  : new File([blob], `eingefuegt-${Date.now()}.${ext}`, { type: blob.type || 'image/png' });
                void handleImageUpload(file);
                return;
              }
            }
          }
        }
      }

      e.preventDefault();
      const html = e.clipboardData.getData('text/html');
      const text = e.clipboardData.getData('text/plain');
      // Wenn HTML vorhanden (z. B. aus unserem Editor inkl. Icons), sicher einfügen
      if (html && html.trim()) {
        const sanitized = sanitizeEditorHtmlForLeftAlign(
          html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
        );
        if (sanitized.trim()) {
          document.execCommand('insertHTML', false, sanitized);
          handleInput();
          return;
        }
      }
      document.execCommand('insertText', false, text || '');
      handleInput();
    } catch (error) {
      console.warn('Error handling paste:', error);
    }
  };

  return (
    <Box
      ref={rootRef}
      sx={{
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        border: `1px solid ${appColors.border}`,
        borderRadius: 2,
        backgroundColor: appColors.cardBg,
        /* Scroll statt hidden: kein Abschneiden am Rand; bei Bedarf horizontal scrollen */
        overflow: 'auto',
        ...(className && { className }),
        '& img': {
          pointerEvents: 'auto !important',
          userSelect: 'none !important',
          position: 'relative !important',
          cursor: 'pointer !important',
          transition: 'all 0.2s ease',
          border: `2px solid transparent`,
          borderRadius: '4px',
          display: 'inline-block',
          maxWidth: '100%',
          height: 'auto',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transform: 'scale(1.02)',
            borderColor: appColors.primary
          }
        }
      }}
    >
      {/* Toolbar – mousedown capture verhindert Fokus auf Buttons, Auswahl bleibt im Editor */}
      <Box
        onMouseDownCapture={(e) => {
          const t = e.target as HTMLElement;
          if (t.closest?.('input[type="file"]')) return;
          if (t.closest?.('input, textarea, select, [contenteditable="true"]')) return;
          e.preventDefault();
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.25,
          p: compact ? 0.5 : 1,
          borderBottom: `1px solid ${appColors.border}`,
          backgroundColor: appColors.background,
          flexWrap: 'wrap', // Kompatibel mit schmalen Modals: Toolbar in mehreren Zeilen
          overflow: 'visible',
          rowGap: 0.25,
          columnGap: 0.25,
          justifyContent: 'flex-start'
        }}
      >
        {/* Text Formatting */}
        <Tooltip title="Fett (Ctrl+B)">
          <IconButton
            size="small"
            onClick={() => applyStyle('bold')}
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: isBold ? appColors.primary : 'transparent',
              color: isBold ? 'white' : appColors.textPrimary,
              border: `1px solid ${isBold ? appColors.primary : appColors.border}`,
              '&:hover': {
                backgroundColor: isBold ? appColors.primary : `${appColors.primary}10`,
                borderColor: appColors.primary
              }
            }}
          >
            <FormatBold fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Kursiv (Ctrl+I)">
          <IconButton
            size="small"
            onClick={() => applyStyle('italic')}
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: isItalic ? appColors.primary : 'transparent',
              color: isItalic ? 'white' : appColors.textPrimary,
              border: `1px solid ${isItalic ? appColors.primary : appColors.border}`,
              '&:hover': {
                backgroundColor: isItalic ? appColors.primary : `${appColors.primary}10`,
                borderColor: appColors.primary
              }
            }}
          >
            <FormatItalic fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Unterstrichen (Ctrl+U)">
          <IconButton
            size="small"
            onClick={() => applyStyle('underline')}
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: isUnderline ? appColors.primary : 'transparent',
              color: isUnderline ? 'white' : appColors.textPrimary,
              border: `1px solid ${isUnderline ? appColors.primary : appColors.border}`,
              '&:hover': {
                backgroundColor: isUnderline ? appColors.primary : `${appColors.primary}10`,
                borderColor: appColors.primary
              }
            }}
          >
            <FormatUnderlined fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Custom Defaults: Material/Operator/Ansprache/Fachbegriff/Folie/Anweisung */}
        <Tooltip title="Material (orange, fett, dick unterstrichen)">
          <IconButton
            size="small"
            onClick={() =>
              wrapCurrentSelectionWithSpan(
                {
                  color: '#ed6c02',
                  fontWeight: '800',
                  textDecoration: 'underline',
                  textDecorationThickness: '3px',
                  textUnderlineOffset: '2px'
                },
                undefined
              )
            }
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: 'transparent',
              color: appColors.secondary,
              border: `1px solid ${appColors.secondary}`,
              '&:hover': { backgroundColor: `${appColors.secondary}10`, borderColor: appColors.secondary }
            }}
          >
            <Box component="span" sx={{ fontSize: 12, fontWeight: 900 }}>M</Box>
          </IconButton>
        </Tooltip>

        <Tooltip title="Operator (fett)">
          <IconButton
            size="small"
            onClick={() => wrapCurrentSelectionWithSpan({ fontWeight: '800' })}
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: 'transparent',
              color: appColors.textPrimary,
              border: `1px solid ${appColors.border}`,
              '&:hover': { backgroundColor: `${appColors.primary}10`, borderColor: appColors.primary }
            }}
          >
            <Box component="span" sx={{ fontSize: 12, fontWeight: 900 }}>O</Box>
          </IconButton>
        </Tooltip>

        <Tooltip title="Ansprache („...“, kursiv dunkelgrün)">
          <IconButton
            size="small"
            onClick={() =>
              surroundCurrentSelectionWithQuotes('„', '“', { color: '#2e7d32', fontStyle: 'italic' })
            }
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: 'transparent',
              color: appColors.primary,
              border: `1px solid ${appColors.primary}`,
              '&:hover': { backgroundColor: `${appColors.primary}10`, borderColor: appColors.primary }
            }}
          >
            <Box component="span" sx={{ fontSize: 12, fontWeight: 900 }}>„</Box>
          </IconButton>
        </Tooltip>

        <Tooltip title="Fachbegriff (blau, verlinkt)">
          <IconButton
            size="small"
            onClick={() =>
              wrapCurrentSelectionWithSpan(
                {
                  color: '#1565c0',
                  cursor: 'help',
                  borderBottom: '1px dotted currentColor'
                },
                'Fachbegriff'
              )
            }
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: 'transparent',
              color: '#1565c0',
              border: '1px solid #1565c0',
              '&:hover': { backgroundColor: '#1565c010', borderColor: '#1565c0' }
            }}
          >
            <Box component="span" sx={{ fontSize: 12, fontWeight: 900 }}>F</Box>
          </IconButton>
        </Tooltip>

        <Tooltip title="Folie (blutorange, unterstrichen)">
          <IconButton
            size="small"
            onClick={() =>
              wrapCurrentSelectionWithSpan(
                {
                  color: '#f57c00',
                  fontWeight: '800',
                  textDecoration: 'underline',
                  textDecorationThickness: '3px',
                  textUnderlineOffset: '2px',
                  cursor: 'pointer'
                },
                'Folie'
              )
            }
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: 'transparent',
              color: appColors.secondary,
              border: `1px solid ${appColors.secondary}`,
              '&:hover': { backgroundColor: `${appColors.secondary}10`, borderColor: appColors.secondary }
            }}
          >
            <Box component="span" sx={{ fontSize: 12, fontWeight: 900 }}>·</Box>
          </IconButton>
        </Tooltip>

        <Tooltip title="Anweisung (grün)">
          <IconButton
            size="small"
            onClick={() => wrapCurrentSelectionWithSpan({ color: '#2e7d32', fontWeight: '700' })}
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: 'transparent',
              color: appColors.primary,
              border: `1px solid ${appColors.primary}`,
              '&:hover': { backgroundColor: `${appColors.primary}10`, borderColor: appColors.primary }
            }}
          >
            <Box component="span" sx={{ fontSize: 12, fontWeight: 900 }}>A</Box>
          </IconButton>
        </Tooltip>
        
        {/* Lists */}
        <Tooltip title="Aufzählungsliste">
          <IconButton
            size="small"
            onClick={() => createList(false)}
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: 'transparent',
              color: appColors.textPrimary,
              border: `1px solid ${appColors.border}`,
              '&:hover': {
                backgroundColor: `${appColors.primary}10`,
                borderColor: appColors.primary
              }
            }}
          >
            <FormatListBulleted fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Nummerierte Liste">
          <IconButton
            size="small"
            onClick={() => createList(true)}
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: 'transparent',
              color: appColors.textPrimary,
              border: `1px solid ${appColors.border}`,
              '&:hover': {
                backgroundColor: `${appColors.primary}10`,
                borderColor: appColors.primary
              }
            }}
          >
            <FormatListNumbered fontSize="small" />
          </IconButton>
        </Tooltip>
        
        {/* List Indentation */}
        <Tooltip title="Liste einrücken">
          <IconButton
            size="small"
            onClick={() => indentList('in')}
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: 'transparent',
              color: appColors.textPrimary,
              border: `1px solid ${appColors.border}`,
              '&:hover': {
                backgroundColor: `${appColors.primary}10`,
                borderColor: appColors.primary
              }
            }}
          >
            <Box sx={{ 
              width: 16, 
              height: 16, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Box sx={{ 
                width: 12, 
                height: 2, 
                backgroundColor: 'currentColor',
                mb: 0.5
              }} />
              <Box sx={{ 
                width: 8, 
                height: 2, 
                backgroundColor: 'currentColor',
                ml: 1
              }} />
            </Box>
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Liste ausrücken">
          <IconButton
            size="small"
            onClick={() => indentList('out')}
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: 'transparent',
              color: appColors.textPrimary,
              border: `1px solid ${appColors.border}`,
              '&:hover': {
                backgroundColor: `${appColors.primary}10`,
                borderColor: appColors.primary
              }
            }}
          >
            <Box sx={{ 
              width: 16, 
              height: 16, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Box sx={{ 
                width: 12, 
                height: 2, 
                backgroundColor: 'currentColor',
                mb: 0.5
              }} />
              <Box sx={{ 
                width: 8, 
                height: 2, 
                backgroundColor: 'currentColor',
                mr: 1
              }} />
            </Box>
          </IconButton>
        </Tooltip>
        
        {/* Image Upload */}
        <Tooltip title="Bild einfügen (oder aus Zwischenablage). Größe: grünen Punkt unten rechts ziehen. Rechtsklick: löschen.">
          <IconButton
            size="small"
            onClick={triggerImageUpload}
            disabled={isUploading}
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: 'transparent',
              color: appColors.textPrimary,
              border: `1px solid ${appColors.border}`,
              '&:hover': {
                backgroundColor: `${appColors.primary}10`,
                borderColor: appColors.primary
              },
              '&:disabled': {
                opacity: 0.6,
                cursor: 'not-allowed'
              }
            }}
          >
            <Image fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Schriftgröße – wie Farbauswahl: Auswahl beim Klick speichern, dann Popover */}
        <Box ref={fontSizePickerRef} sx={{ position: 'relative' }}>
          <Tooltip title="Schriftgröße">
            <IconButton
              size="small"
              onClick={() => {
                const saved = saveSelection();
                (window as any).savedTextSelection = saved;
                setShowFontSizePicker((v) => {
                  const next = !v;
                  showFontSizePickerRef.current = next;
                  return next;
                });
              }}
              sx={{
                width: compact ? 28 : 32,
                height: compact ? 28 : 32,
                backgroundColor: 'transparent',
                color: appColors.textPrimary,
                border: `1px solid ${appColors.border}`,
                '&:hover': { backgroundColor: `${appColors.primary}10`, borderColor: appColors.primary }
              }}
            >
              <Box component="span" sx={{ fontSize: '0.9rem', fontWeight: 700 }}>A</Box>
            </IconButton>
          </Tooltip>
          <Popover
            open={showFontSizePicker}
            anchorEl={fontSizePickerRef.current}
            disableAutoFocus
            disableEnforceFocus
            onClose={() => {
              showFontSizePickerRef.current = false;
              setShowFontSizePicker(false);
              window.setTimeout(() => {
                const host = editorRef.current;
                const ae = document.activeElement;
                if (host && ae && (ae === host || host.contains(ae))) {
                  isEditingRef.current = true;
                } else {
                  isEditingRef.current = false;
                  flushEditorToParent();
                }
              }, 0);
            }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            slotProps={{
              paper: {
                onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
                sx: { p: 1, backgroundColor: appColors.cardBg, border: `1px solid ${appColors.border}` }
              }
            }}
          >
            <Box sx={{ minWidth: 120 }}>
              {FONT_SIZE_OPTIONS.map((opt) => (
                <MenuItem
                  key={opt.value}
                  selected={fontSize === opt.value}
                  onClick={() => applyFontSize(opt.value)}
                  sx={{ fontSize: opt.value }}
                >
                  {opt.label}
                </MenuItem>
              ))}
            </Box>
          </Popover>
        </Box>
        
        {/* Textfarbe: alle Farben direkt in der Leiste – Auswahl bei Mousedown speichern, bei Klick anwenden */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexWrap: 'wrap' }}>
          {colors.map((color) => (
            <Tooltip key={color.value} title={color.name}>
              <Box
                onMouseDown={(e) => {
                  e.preventDefault();
                  const saved = saveSelection();
                  (window as any).savedTextSelection = saved;
                }}
                onClick={() => applyColor(color.value)}
                sx={{
                  width: compact ? 22 : 26,
                  height: compact ? 22 : 26,
                  borderRadius: 0.5,
                  backgroundColor: color.value,
                  border: `2px solid ${selectedColor === color.value ? appColors.primary : appColors.border}`,
                  cursor: 'pointer',
                  flexShrink: 0,
                  '&:hover': {
                    transform: 'scale(1.1)',
                    borderColor: appColors.primary,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                  }
                }}
              />
            </Tooltip>
          ))}
        </Box>

        {/* Symbole einfügen (Pfeil, Aufzählung, …) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ml: 0.5, borderLeft: `1px solid ${appColors.border}`, pl: 0.5 }}>
          {toolbarSymbols.map(({ label, char }) => (
            <Tooltip key={char} title={label}>
              <IconButton
                size="small"
                onClick={() => insertSymbol(char)}
                sx={{
                  width: compact ? 26 : 30,
                  height: compact ? 26 : 30,
                  minWidth: 0,
                  color: appColors.textPrimary,
                  border: `1px solid ${appColors.border}`,
                  borderRadius: 0.5,
                  fontSize: '1rem',
                  '&:hover': { backgroundColor: `${appColors.primary}10`, borderColor: appColors.primary }
                }}
              >
                {char}
              </IconButton>
            </Tooltip>
          ))}
        </Box>
        
        {/* Text Alignment */}
        <Tooltip title="Links ausrichten">
          <IconButton
            size="small"
            onClick={() => applyAlignment('left')}
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: alignment === 'left' ? appColors.primary : 'transparent',
              color: alignment === 'left' ? 'white' : appColors.textPrimary,
              border: `1px solid ${alignment === 'left' ? appColors.primary : appColors.border}`,
              '&:hover': {
                backgroundColor: alignment === 'left' ? appColors.primary : `${appColors.primary}10`,
                borderColor: appColors.primary
              }
            }}
          >
            <FormatAlignLeft fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Zentriert ausrichten">
          <IconButton
            size="small"
            onClick={() => applyAlignment('center')}
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: alignment === 'center' ? appColors.primary : 'transparent',
              color: alignment === 'center' ? 'white' : appColors.textPrimary,
              border: `1px solid ${alignment === 'center' ? appColors.primary : appColors.border}`,
              '&:hover': {
                backgroundColor: alignment === 'center' ? appColors.primary : `${appColors.primary}10`,
                borderColor: appColors.primary
              }
            }}
          >
            <FormatAlignCenter fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Rechts ausrichten">
          <IconButton
            size="small"
            onClick={() => applyAlignment('right')}
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: alignment === 'right' ? appColors.primary : 'transparent',
              color: alignment === 'right' ? 'white' : appColors.textPrimary,
              border: `1px solid ${alignment === 'right' ? appColors.primary : appColors.border}`,
              '&:hover': {
                backgroundColor: alignment === 'right' ? appColors.primary : `${appColors.primary}10`,
                borderColor: appColors.primary
              }
            }}
          >
            <FormatAlignRight fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Gesamten Text nach links: Ausrichtung links und Einzüge (Listen/Blöcke) zurücknehmen">
          <IconButton
            size="small"
            onClick={normalizeWholeEditorToLeft}
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              backgroundColor: 'transparent',
              color: appColors.textPrimary,
              border: `1px solid ${appColors.border}`,
              '&:hover': {
                backgroundColor: `${appColors.primary}10`,
                borderColor: appColors.primary,
              },
            }}
          >
            <FormatIndentDecrease fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Editor */}
      <Box
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onPaste={handlePaste}
        sx={{
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          /* Linker Abstand: 1 % der Editor-Breite, mind. 8px (Phasen-Boxen haben separat noch 1 % am Container) */
          pl: 'max(8px, 1%)',
          pr: compact ? 0.5 : 0.75,
          pt: compact ? 0.5 : 0.75,
          pb: compact ? 1.25 : 1.5,
          ml: 0,
          textIndent: 0,
          textAlign: 'left !important',
          direction: 'ltr',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          minHeight: `${Math.max(rows * 1.5, 4)}rem`,
          lineHeight: 1.5,
          color: appColors.textPrimary,
          fontSize: '0.875rem',
          outline: 'none',
          userSelect: 'text',
          WebkitUserSelect: 'text',
          cursor: 'text',
          '& p': {
            marginLeft: '0 !important',
            paddingLeft: '0 !important',
            textIndent: '0 !important',
            textAlign: 'left !important',
            marginTop: '0.35em',
            marginBottom: '0.35em',
          },
          '& p:first-of-type': { marginTop: 0 },
          '& p:last-of-type': { marginBottom: 0 },
          '& h1, & h2, & h3, & h4': {
            marginLeft: 0,
            paddingLeft: 0,
            textAlign: 'left !important',
          },
          '& ul, & ol': { marginLeft: 0, paddingLeft: '1.25em', textAlign: 'left !important' },
          '& li': { textAlign: 'left !important' },
          '& a': { wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' },
          /* Eingefügte Blöcke (Google Docs o. Ä.) mit margin-left im style-Attribut */
          '& [style*="margin-left"]': { marginLeft: '0 !important' },
          /* Enter erzeugt oft neue <div>: kein zusätzlicher Einzug (3 % bleiben nur am äußeren Editor) */
          '& div': {
            marginLeft: '0 !important',
            marginRight: '0 !important',
            paddingLeft: '0 !important',
            textIndent: '0 !important',
            textAlign: 'left !important',
          },
          '& blockquote': {
            marginLeft: '0 !important',
            paddingLeft: '0.75em !important',
            textAlign: 'left !important',
          },
          '&:focus': {
            boxShadow: `0 0 0 2px ${appColors.primary}40`
          },
          '&[contenteditable="true"]:empty:before': {
            content: `"${placeholder || ''}"`,
            color: appColors.textSecondary,
            pointerEvents: 'none'
          },
          /* Icons (Material, Assignment, Info): strikt inline, bewegen sich mit dem Text */
          '& img[data-editor-icon]': {
            display: 'inline',
            verticalAlign: 'middle',
            maxHeight: '1.1em',
            width: 'auto',
            height: '1.1em',
            margin: '0 2px',
            cursor: 'default',
            border: 'none',
            position: 'static'
          },
          /* Nur große Bilder (Uploads): Resize, nicht Icons */
          '& img:not([data-editor-icon])': {
            cursor: 'nw-resize',
            transition: 'all 0.2s ease',
            border: `2px solid transparent`,
            borderRadius: '4px',
            position: 'relative',
            display: 'inline-block',
            maxWidth: '100%',
            height: 'auto',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transform: 'scale(1.02)',
              borderColor: appColors.primary,
              '& .resize-handle': {
                opacity: '1 !important'
              }
            },
            '& .resize-handle': {
              opacity: 0,
              transition: 'opacity 0.2s ease'
            }
          }
        }}
        suppressContentEditableWarning
        data-placeholder={placeholder}
      />
      
      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
    </Box>
  );
};

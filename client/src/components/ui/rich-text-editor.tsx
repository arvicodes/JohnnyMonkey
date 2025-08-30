import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Box, 
  IconButton, 
  Tooltip, 
  Popover, 
  Grid
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  Palette,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatListBulleted,
  FormatListNumbered,
  Image
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
  { name: 'Rot', value: '#dc2626' },
  { name: 'Grün', value: '#16a34a' },
  { name: 'Blau', value: '#2563eb' },
  { name: 'Lila', value: '#9333ea' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Grau', value: '#6b7280' },
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

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  compact = false
}) => {
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [isUploading, setIsUploading] = useState(false);
  // Removed resizingImage state - not needed anymore
  
  const editorRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isUpdatingRef = useRef(false);
  const lastValueRef = useRef(value);

  // Debounced onChange to prevent excessive updates
  const debouncedOnChange = useCallback((newValue: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      lastValueRef.current = newValue;
      onChange(newValue);
    }, 150);
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

  // Save text selection for color application
  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }
    
    try {
      const range = selection.getRangeAt(0);
      const text = selection.toString();
      
      if (!text || text.length === 0) {
        return null;
      }
      
      // Save the selection details
      return {
        text: text,
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: range.endContainer,
        endOffset: range.endOffset
      };
    } catch (error) {
      console.warn('Error saving selection:', error);
      return null;
    }
  };

  // Restore text selection for color application
  const restoreSelection = (savedSelection: any) => {
    if (!savedSelection || !editorRef.current) return;
    
    try {
      const selection = window.getSelection();
      if (!selection) return;
      
      const range = document.createRange();
      range.setStart(savedSelection.startContainer, savedSelection.startOffset);
      range.setEnd(savedSelection.endContainer, savedSelection.endOffset);
      
      selection.removeAllRanges();
      selection.addRange(range);
      
      console.log('🔄 Selection restored successfully');
    } catch (error) {
      console.warn('Error restoring selection:', error);
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
    if (!editorRef.current) return;
    
    const currentContent = editorRef.current.innerHTML;
    const shouldUpdate = value !== currentContent && 
                        value !== lastValueRef.current && 
                        !isUpdatingRef.current;
    
    if (shouldUpdate) {
      // Save cursor position before updating
      const cursorPosition = saveCursorPosition();
      
      // Update content
      editorRef.current.innerHTML = value;
      lastValueRef.current = value;
      
      // Restore cursor position after DOM update
      requestAnimationFrame(() => {
        restoreCursorPosition(cursorPosition);
      });
    }
  }, [value]);

  // Initialize lastValueRef with the initial value
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

  // Click outside handler for color picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  // Add image resize handlers after content updates - moved after makeImageResizable definition

  const execCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    
    try {
      // Ensure the editor has focus before executing commands
      editorRef.current.focus();
      
      // Restore selection if needed
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        // If no selection, place cursor at end
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      
      document.execCommand(command, false, value);
      handleInput();
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
          setIsBold(!isBold);
          break;
        case 'italic':
          execCommand('italic');
          setIsItalic(!isItalic);
          break;
        case 'underline':
          execCommand('underline');
          setIsUnderline(!isUnderline);
          break;
      }
    } catch (error) {
      console.warn('Error applying style:', style, error);
    }
  };

  const applyColor = (color: string) => {
    console.log('🎨 APPLYING COLOR:', color);
    
    if (!editorRef.current) {
      console.error('❌ No editor ref');
      return;
    }
    
    // Get the saved selection from when color picker was opened
    const savedSelection = (window as any).savedTextSelection;
    console.log('💾 Retrieved saved selection:', savedSelection);
    
    if (!savedSelection || !savedSelection.text || savedSelection.text.length === 0) {
      console.log('⚠️ NO TEXT SELECTED! Please select text first, then choose a color.');
      alert('Bitte markieren Sie zuerst Text, dann wählen Sie eine Farbe!');
      setShowColorPicker(false);
      return;
    }
    
    // Force focus first
    editorRef.current.focus();
    
    // Restore the saved selection
    restoreSelection(savedSelection);
    
    // Get the restored selection
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    
    console.log('📝 Restored text:', `"${selectedText}"`, 'Length:', selectedText.length);
    
    if (selectedText && selectedText.length > 0) {
      // Text is selected - wrap it in a colored span
      console.log('✅ Wrapping selected text in colored span');
      
      const range = selection!.getRangeAt(0);
      const span = document.createElement('span');
      span.style.color = color;
      span.textContent = selectedText;
      
      // Replace the selected text with colored span
      range.deleteContents();
      range.insertNode(span);
      
      // Move cursor to end of span
      range.setStartAfter(span);
      range.collapse(true);
      selection!.removeAllRanges();
      selection!.addRange(range);
      
      console.log('🎯 SUCCESS: Color applied to selected text');
      
      // Clear the saved selection
      (window as any).savedTextSelection = null;
    } else {
      console.log('❌ Failed to restore selection');
      alert('Fehler beim Anwenden der Farbe. Bitte versuchen Sie es erneut.');
      setShowColorPicker(false);
      return;
    }
    
    setSelectedColor(color);
    setShowColorPicker(false);
    handleInput();
    
    console.log('✅ Color application complete');
  };

  const applyAlignment = (align: 'left' | 'center' | 'right') => {
    try {
      execCommand(`justify${align.charAt(0).toUpperCase() + align.slice(1)}`);
      setAlignment(align);
    } catch (error) {
      console.warn('Error applying alignment:', error);
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
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Fehler beim Hochladen des Bildes');
      }
      
      const result = await response.json();
      
      // Bild in den Editor einfügen
      if (editorRef.current) {
        const imgElement = document.createElement('img');
        imgElement.src = result.imagePath;
        imgElement.alt = result.fileName;
        imgElement.style.maxWidth = '100%';
        imgElement.style.height = 'auto';
        imgElement.style.margin = '8px 0';
        imgElement.style.cursor = 'nw-resize';
        imgElement.style.position = 'relative';
        
        // Store original dimensions
        imgElement.setAttribute('data-original-width', '0');
        imgElement.setAttribute('data-original-height', '0');
        
        // Wait for image to load to get natural dimensions
        imgElement.onload = () => {
          imgElement.setAttribute('data-original-width', imgElement.naturalWidth.toString());
          imgElement.setAttribute('data-original-height', imgElement.naturalHeight.toString());
          // Mark as resizable and add resize functionality
          imgElement.setAttribute('data-resizable', 'true');
          makeImageResizable(imgElement);
        };
        
        // Bild an der aktuellen Cursor-Position einfügen
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(imgElement);
          range.setStartAfter(imgElement);
          range.setEndAfter(imgElement);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          // Wenn keine Auswahl, am Ende einfügen
          editorRef.current.appendChild(imgElement);
        }
        
        // Cursor nach dem Bild setzen
        const newRange = document.createRange();
        newRange.setStartAfter(imgElement);
        newRange.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(newRange);
        
        // onChange auslösen
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

  const handleInput = () => {
    if (editorRef.current && !isUpdatingRef.current) {
      isUpdatingRef.current = true;
      const newValue = editorRef.current.innerHTML;
      
      // Only trigger onChange if content actually changed
      if (newValue !== value && newValue !== lastValueRef.current) {
        debouncedOnChange(newValue);
      }
      
      // Reset the flag after a short delay
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }
  };

  const makeImageResizable = useCallback((img: HTMLImageElement) => {
    console.log('🎯 DEBUG: makeImageResizable aufgerufen für:', img.src);
    
    // Remove any existing resize functionality
    const existingHandle = img.querySelector('.resize-handle');
    if (existingHandle) {
      console.log('🗑️ Entferne existierenden Handle');
      existingHandle.remove();
    }
    
    // Add visual styling
    img.style.position = 'relative';
    img.style.display = 'inline-block';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.cursor = 'default';
    
    // Create resize handle (small square in bottom-right corner)
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.style.cssText = `
      position: absolute;
      bottom: -8px;
      right: -8px;
      width: 16px;
      height: 16px;
      background: ${appColors.primary};
      border: 2px solid white;
      border-radius: 4px;
      cursor: se-resize;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
    
    console.log('🔧 Handle erstellt:', handle);
    
    // Show handle on hover
    img.addEventListener('mouseenter', () => {
      console.log('🖱️ Hover über Bild, zeige Handle');
      handle.style.opacity = '1';
    });
    
    img.addEventListener('mouseleave', () => {
      console.log('🖱️ Hover verlassen, verstecke Handle');
      handle.style.opacity = '0';
    });
    
    // Right click to delete
    img.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.confirm('Möchten Sie dieses Bild löschen?')) {
        img.remove();
        handleInput();
      }
    });
    
    // Resize functionality
    let isResizing = false;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    
    const startResize = (e: MouseEvent) => {
      console.log('🎯 Starte Resize');
      e.preventDefault();
      e.stopPropagation();
      
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = img.offsetWidth;
      startHeight = img.offsetHeight;
      
      // Change cursor
      document.body.style.cursor = 'se-resize';
      document.body.style.userSelect = 'none';
      
      // Add event listeners
      document.addEventListener('mousemove', doResize);
      document.addEventListener('mouseup', endResize);
    };
    
    const doResize = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      // Calculate new dimensions (maintain aspect ratio)
      const aspectRatio = startWidth / startHeight;
      const newWidth = Math.max(50, Math.min(800, startWidth + deltaX));
      const newHeight = newWidth / aspectRatio;
      
      // Apply new dimensions
      img.style.width = `${newWidth}px`;
      img.style.height = `${newHeight}px`;
    };
    
    const endResize = () => {
      if (!isResizing) return;
      
      console.log('🏁 Beende Resize');
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Remove event listeners
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', endResize);
      
      // Trigger change
      handleInput();
    };
    
    // Add resize handle to image
    img.appendChild(handle);
    console.log('✅ Handle zum Bild hinzugefügt');
    console.log('🔍 Handle DOM-Element:', handle);
    console.log('🔍 Handle im Bild gefunden:', img.querySelector('.resize-handle'));
    console.log('🔍 Handle Computed Styles:', window.getComputedStyle(handle));
    
    // Add resize event listener to handle
    handle.addEventListener('mousedown', startResize);
    console.log('✅ Event Listener für Handle hinzugefügt');
    
  }, [handleInput]);

  // Add image resize handlers after content updates
  useEffect(() => {
    console.log('🔍 DEBUG: useEffect für Bildgrößenänderung aufgerufen');
    if (editorRef.current) {
      console.log('✅ Editor ref gefunden');
      // Wait a bit for DOM to be fully updated
      const timeoutId = setTimeout(() => {
        const images = editorRef.current?.querySelectorAll('img');
        console.log('🔍 Gefundene Bilder:', images?.length || 0);
        if (images) {
          images.forEach((img, index) => {
            console.log(`🖼️ Bild ${index}:`, img.src, img.hasAttribute('data-resizable'));
            // Only add resize functionality if not already added
            if (!img.hasAttribute('data-resizable')) {
              console.log(`🔧 Mache Bild ${index} resizable`);
              img.setAttribute('data-resizable', 'true');
              makeImageResizable(img);
            }
          });
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    } else {
      console.log('❌ Kein Editor ref gefunden');
    }
  }, [value, makeImageResizable]);

  // Simple image resize function - removed complex corner handling

  // OLD RESIZE FUNCTION REMOVED - Using inline approach now

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  const handleFocus = () => {
    try {
      // Update button states based on current selection
      if (editorRef.current) {
        setIsBold(document.queryCommandState('bold'));
        setIsItalic(document.queryCommandState('italic'));
        setIsUnderline(document.queryCommandState('underline'));
      }
    } catch (error) {
      console.warn('Error updating button states:', error);
    }
  };

  const handleBlur = () => {
    // Don't close color picker on blur to allow clicking on it
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    try {
      // Get plain text from clipboard
      const text = e.clipboardData.getData('text/plain');
      
      // Insert text at cursor position
      if (editorRef.current) {
        document.execCommand('insertText', false, text);
      }
    } catch (error) {
      console.warn('Error handling paste:', error);
    }
  };

  return (
    <Box
      sx={{
        border: `1px solid ${appColors.border}`,
        borderRadius: 2,
        backgroundColor: appColors.cardBg,
        overflow: 'hidden',
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
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.25,
          p: compact ? 0.5 : 1,
          borderBottom: `1px solid ${appColors.border}`,
          backgroundColor: appColors.background,
          flexWrap: 'nowrap',
          overflow: 'hidden'
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
        <Tooltip title="Bild einfügen">
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
        
        {/* Color Picker */}
        <Box ref={colorPickerRef} sx={{ position: 'relative' }}>
          <Tooltip title="Textfarbe">
            <IconButton
              size="small"
              onClick={() => {
                // Save selection before opening color picker
                const savedSelection = saveSelection();
                if (savedSelection && savedSelection.text && savedSelection.text.length > 0) {
                  console.log('💾 Color picker opened with saved selection:', savedSelection.text);
                  // Store the selection globally so applyColor can access it
                  (window as any).savedTextSelection = savedSelection;
                  setShowColorPicker(!showColorPicker);
                } else {
                  console.log('⚠️ No text selected for color picker');
                  alert('Bitte markieren Sie zuerst Text, dann öffnen Sie die Farbpalette!');
                }
              }}
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
              <Palette fontSize="small" />
              <Box
                sx={{
                  width: compact ? 8 : 10,
                  height: compact ? 8 : 10,
                  borderRadius: '50%',
                  backgroundColor: selectedColor,
                  border: `1px solid ${appColors.border}`,
                  borderColor: appColors.border,
                  position: 'absolute',
                  bottom: 1,
                  right: 1
                }}
              />
            </IconButton>
          </Tooltip>
          
          <Popover
            open={showColorPicker}
            anchorEl={colorPickerRef.current}
            onClose={() => setShowColorPicker(false)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            slotProps={{
              paper: {
                sx: {
                  p: 1,
                  backgroundColor: appColors.cardBg,
                  border: `1px solid ${appColors.border}`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                }
              }
            }}
          >
            <Grid container spacing={0.5} sx={{ width: 160 }}>
              {colors.map((color) => (
                <Grid item key={color.value}>
                  <Tooltip title={color.name}>
                    <Box
                      onClick={() => applyColor(color.value)}
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 0.5,
                        backgroundColor: color.value,
                        border: `1px solid ${appColors.border}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'scale(1.1)',
                          borderColor: appColors.primary,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }
                      }}
                    />
                  </Tooltip>
                </Grid>
              ))}
            </Grid>
          </Popover>
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
      </Box>
      
      {/* Editor */}
      <Box
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
        sx={{
          p: compact ? 2 : 3,
          minHeight: `${Math.max(rows * 1.5, 4)}rem`,
          lineHeight: 1.5,
          color: appColors.textPrimary,
          fontSize: '0.875rem',
          outline: 'none',
          '&:focus': {
            boxShadow: `0 0 0 2px ${appColors.primary}40`
          },
          '&[contenteditable="true"]:empty:before': {
            content: `"${placeholder || ''}"`,
            color: appColors.textSecondary,
            pointerEvents: 'none'
          },
          '& img': {
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

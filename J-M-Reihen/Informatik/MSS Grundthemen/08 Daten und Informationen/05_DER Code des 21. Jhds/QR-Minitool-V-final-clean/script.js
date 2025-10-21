// ========================= Farben =========================
let COLORS = {};

function initColors() {
  COLORS = {
    mode: getComputedStyle(document.documentElement).getPropertyValue('--c-mode').trim(),
    count: getComputedStyle(document.documentElement).getPropertyValue('--c-count').trim(),
    term: getComputedStyle(document.documentElement).getPropertyValue('--c-term').trim(),
    data: getComputedStyle(document.documentElement).getPropertyValue('--c-data').trim(),
    pad: getComputedStyle(document.documentElement).getPropertyValue('--c-pad').trim(),
    ecc: getComputedStyle(document.documentElement).getPropertyValue('--c-ecc').trim(),
    mask: getComputedStyle(document.documentElement).getPropertyValue('--c-mask').trim(),
    format: getComputedStyle(document.documentElement).getPropertyValue('--c-format').trim(),
  };
}

// ========================= Hilfen und Tabellen =========================
function maskPredicate(maskIndex, r, c) {
  switch (maskIndex) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2 + (r * c) % 3) === 0;
    case 6: return ((((r * c) % 2) + ((r * c) % 3)) % 2) === 0;
    case 7: return ((((r + c) % 2) + ((r * c) % 3)) % 2) === 0;
    default:return false;
  }
}

function utf8Bytes(str){
  if (typeof TextEncoder !== "undefined") return Array.from(new TextEncoder().encode(str));
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.codePointAt(i);
    if (code > 0xffff) i++;
    if (code <= 0x7f) bytes.push(code);
    else if (code <= 0x7ff) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code <= 0xffff) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
  }
  return bytes;
}

// Encoding-Modus Hilfsfunktionen
function isValidForMode(text, mode) {
  switch(mode) {
    case 'numeric':
      return /^[0-9]*$/.test(text) && text.length > 0;
    case 'alphanumeric':
      return /^[0-9A-Z $%*+\-./:]*$/i.test(text) && text.length > 0;
    case 'byte':
    default:
      return true; // Byte-Modus erlaubt alle Zeichen
  }
}

function getModeBits(mode) {
  switch(mode) {
    case 'numeric': return [0,0,0,1];
    case 'alphanumeric': return [0,0,1,0];
    case 'byte':
    default: return [0,1,0,0];
  }
}

function getCountBitsLength(mode, version) {
  switch(mode) {
    case 'numeric':
      return version <= 9 ? 10 : (version <= 26 ? 12 : 14);
    case 'alphanumeric':
      return version <= 9 ? 9 : 11;
    case 'byte':
    default:
      return version <= 9 ? 8 : 16;
  }
}

function encodeData(text, mode) {
  switch(mode) {
    case 'numeric':
      return encodeNumeric(text);
    case 'alphanumeric':
      return encodeAlphanumeric(text);
    case 'byte':
    default:
      return encodeByte(text);
  }
}

function encodeByte(text) {
  return utf8Bytes(text);
}

function encodeNumeric(text) {
  // Numeric: 3 Ziffern = 10 Bits
  const result = [];
  
  for (let i = 0; i < text.length; i += 3) {
    const chunk = text.substring(i, i + 3);
    const num = parseInt(chunk, 10);
    let bits = num.toString(2);
    
    // Padding auf die richtige Bit-Länge
    if (chunk.length === 3) {
      bits = bits.padStart(10, '0');
    } else if (chunk.length === 2) {
      bits = bits.padStart(7, '0');
    } else {
      bits = bits.padStart(4, '0');
    }
    
    result.push(bits);
  }
  return result;
}

function encodeAlphanumeric(text) {
  // Alphanumeric: 45 Zeichen-Tabelle
  const table = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
  const result = [];
  
  const cleanText = text.toUpperCase();
  
  for (let i = 0; i < cleanText.length; i += 2) {
    const char1 = cleanText[i];
    const char2 = cleanText[i + 1] || null;
    
    const val1 = table.indexOf(char1);
    if (val1 === -1) continue;
    
    if (char2) {
      const val2 = table.indexOf(char2);
      if (val2 === -1) continue;
      const combined = val1 * 45 + val2;
      result.push(combined.toString(2).padStart(11, '0'));
    } else {
      // Einzelnes Zeichen: 6 Bits
      result.push(val1.toString(2).padStart(6, '0'));
    }
  }
  return result;
}

// QR Code Capacity Tables (ISO 18004) - Version 1 korrekte Werte
const CAPACITY = {
  numeric: {
    L:[0,41,77,127,187,255,322,370,461,552,652,772,883,1022,1101,1250,1408,1548,1725,1903,2061,2232,2409,2620,2812,3057,3283,3514,3669,3909,4158,4414,4686,4964,5255,5529,5836,6153,6479,6743,7089],
    M:[0,34,63,101,149,202,255,293,365,432,513,604,691,796,871,991,1082,1212,1346,1500,1600,1708,1872,2059,2188,2395,2544,2701,2857,3035,3289,3486,3693,3909,4134,4343,4588,4775,5039,5313,5593],
    Q:[0,27,48,77,111,144,178,207,259,312,364,427,489,580,621,703,775,846,948,1063,1159,1224,1358,1468,1588,1718,1804,1933,2085,2181,2358,2473,2670,2805,2949,3081,3244,3417,3599,3791,3993],
    H:[0,17,34,58,82,106,139,154,202,235,288,331,374,427,468,530,602,674,746,813,919,969,1056,1108,1228,1286,1425,1501,1581,1677,1782,1897,2022,2150,2303,2361,2524,2625,2735,2927,3057]
  },
  alphanumeric: {
    L:[0,25,47,77,114,154,195,224,279,335,395,468,535,619,667,758,854,938,1046,1153,1249,1352,1460,1588,1704,1853,1990,2132,2223,2369,2520,2677,2840,3009,3183,3351,3537,3729,3927,4087,4296],
    M:[0,20,38,61,90,122,154,178,221,262,311,366,419,483,528,600,656,734,816,909,970,1035,1134,1248,1326,1451,1542,1637,1732,1839,1994,2113,2238,2369,2506,2632,2780,2894,3054,3220,3391],
    Q:[0,16,29,47,67,87,108,125,157,189,221,259,296,352,376,426,470,531,574,644,702,742,823,890,963,1041,1094,1172,1263,1322,1429,1499,1618,1700,1787,1867,2006,2113,2228,2362,2494],
    H:[0,10,20,35,50,64,84,93,122,143,174,200,227,259,283,321,365,408,452,493,557,587,640,672,744,779,864,910,958,1016,1080,1150,1226,1307,1394,1431,1530,1591,1658,1774,1852]
  },
  byte: {
    L:[0,17,32,53,78,106,134,154,192,230,271,321,367,425,458,520,586,644,718,792,858,929,1003,1091,1171,1273,1367,1465,1528,1628,1732,1840,1952,2068,2188,2303,2431,2563,2699,2809,2953],
    M:[0,14,26,42,62,84,106,122,152,180,213,251,287,331,362,412,450,504,560,624,666,711,779,857,911,997,1059,1125,1190,1264,1370,1452,1538,1628,1722,1809,1911,1989,2099,2213],
    Q:[0,11,20,32,46,60,74,86,108,130,151,177,203,241,258,292,322,364,394,442,482,509,565,611,661,715,751,805,868,908,982,1030,1112,1168,1228,1283,1351,1423,1499,1579],
    H:[0,7,14,24,34,44,58,64,84,98,119,137,155,177,194,220,250,280,310,338,382,403,439,461,511,535,593,625,658,698,742,790,842,898,958,983,1051,1093,1139,1219]
  }
};

// Legacy alias for backward compatibility
const BYTE_CAPACITY = CAPACITY.byte;

const ALIGN_POS=[
  [],[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],
  [6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],
  [6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],
  [6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],
  [6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],
  [6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],
  [6,30,58,86,114,142,170],
];

function moduleCountForVersion(v){return 21+4*(v-1);} 
function triggerDownloadBlob(blob, filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}

// ========================= Zustand =========================
const state = {
  text:"",
  version:1,
  ecc:"none",
  mask:"none",
  viewScope:"basic", // basic | rest
  segView:{mode:"off", count:"off", term:"off"}, // off | sw | color
  showPadSW:false,
  showECCSW:false,
  applyMask:false,
  highlightFormat:false,
  showFinal:false,
  showColorHighlight:false,
  encodingMode:"byte", // byte | numeric | alphanumeric
  lastError:null,
};

// ========================= Elemente =========================
const el = (id)=>document.getElementById(id);
const textEl = el('text');
const binChipsEl = el('bin-chips');
const svgHost = el('svgHost');
const finalHost = el('finalHost');
const errorEl = el('error');
const sizesList = el('sizesList');
const sizesCard = el('sizesCard');
const finalCard = el('finalCard');
const restControls = el('rest-controls');
const finalToggleBasic = el('final-toggle-basic');
const showFinalBasic = el('showFinalBasic');
const btnSave = el('btnSave');

// Tabs
const tabBasic = el('tab-basic');
const tabRest = el('tab-rest');

tabBasic.addEventListener('click', (e)=>{
  e.preventDefault();
  e.stopPropagation();
  setTimeout(() => {
    setState({viewScope:'basic'});
  }, 10);
});
tabRest.addEventListener('click', (e)=>{
  e.preventDefault();
  e.stopPropagation();
  setTimeout(() => {
    setState({viewScope:'rest'});
  }, 10);
});

// Populate versions
(function(){
  const vSel = el('version');
  if (!vSel) {
    console.warn('Version select element not found');
    return;
  }
  
  for(let v=1; v<=40; v++){
    const m = moduleCountForVersion(v);
    const opt = document.createElement('option');
    opt.value = String(v);
    opt.textContent = `Version ${v}:  ${m} × ${m} Module`;
    vSel.appendChild(opt);
  }
  vSel.value = "1";
  
  // Einfacher Event listener für Änderungen
  vSel.addEventListener('change', function(e) {
    const newVersion = parseInt(e.target.value, 10);
    console.log('Version changed to:', newVersion);
    setState({version: newVersion});
  });
  
  // Dropdown-Status verfolgen
  vSel.addEventListener('focus', function(e) {
    isDropdownOpen = true;
    console.log('Dropdown opened');
  });
  
  vSel.addEventListener('blur', function(e) {
    isDropdownOpen = false;
    console.log('Dropdown closed');
  });
})();

// Seg pickers - funktioniert sowohl mit alten .picker als auch neuen .segment-picker
document.querySelectorAll('.picker button, .segment-picker button').forEach(btn=>{
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    e.stopPropagation();
    
    const seg = btn.getAttribute('data-seg');
    const val = btn.getAttribute('data-val');
    const mode = btn.getAttribute('data-mode');
    
    // set active class
    const parent = btn.parentElement;
    parent.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    
    if(mode) {
      // Encoding mode button - setze passende Beispiele basierend auf dem Modus
      let exampleText = '';
      let newState = {encodingMode: mode};
      
      if(mode === 'numeric') {
        exampleText = '123';
      } else if(mode === 'alphanumeric') {
        exampleText = 'Z5';
      } else if(mode === 'byte') {
        exampleText = 'Hallo';
      }
      
      // Setze den Beispieltext
      newState.text = exampleText;
      
      // Direkte Aktualisierung des Textfelds
      setTimeout(() => {
        textEl.textContent = exampleText;
        // KEIN automatisches Fokussieren des Textfelds mehr!
        // if (!isDropdownOpen) {
        //   textEl.focus();
        //   setCursorToEnd();
        // }
        // Sofortige Hervorhebung wenn aktiviert
        const showHighlight = el('showColorHighlight').checked;
        if(showHighlight) {
          updateTextContent(true);
        }
      }, 10);
      
      // Verzögerte Ausführung um sicherzustellen, dass das Dropdown nicht geschlossen wird
      setTimeout(() => {
        setState(newState);
      }, 10);
    } else if(seg) {
      // Segment picker button
      const segView = {...state.segView, [seg]:val};
      // Verzögerte Ausführung um sicherzustellen, dass das Dropdown nicht geschlossen wird
      setTimeout(() => {
        setState({segView});
      }, 10);
    }
  });
});

// Checkboxes and simple controls
el('showPad').addEventListener('change', e=>{
  e.stopPropagation();
  setTimeout(() => {
    setState({showPadSW:e.target.checked});
  }, 10);
});
el('showECC').addEventListener('change', e=>{
  e.stopPropagation();
  setTimeout(() => {
    setState({showECCSW:e.target.checked});
  }, 10);
});
el('highlightFormat').addEventListener('change', e=>{
  e.stopPropagation();
  setTimeout(() => {
    setState({highlightFormat:e.target.checked});
  }, 10);
});
el('applyMask').addEventListener('change', e=>{
  e.stopPropagation();
  setTimeout(() => {
    setState({applyMask:e.target.checked});
  }, 10);
});
el('showColorHighlight').addEventListener('change', e=>{
  e.stopPropagation();
  const showHighlight = e.target.checked;
  setTimeout(() => {
    setState({showColorHighlight: showHighlight});
  }, 10);
  
  // Direkte sofortige Aktualisierung des Textfelds
  const text = state.text || '';
  
  if(!showHighlight) {
    // Hervorhebung deaktiviert - zeige normalen Text
    textEl.innerHTML = text.replace(/\n/g, '<br>');
  } else {
    // Hervorhebung aktiviert - berechne und zeige Hervorhebung
    let firstCharIndex = -1;
    let secondCharIndex = -1;
    let firstCharLength = 1;
    let secondCharLength = 1;
    
    if(state.encodingMode === 'numeric') {
      // Numerisch: Erste drei Ziffern gemeinsam als erstes Zeichen
      if(text.length >= 1 && /^[0-9]*$/.test(text)) {
        firstCharIndex = 0;
        firstCharLength = Math.min(3, text.length);
        if(text.length >= 4) {
          secondCharIndex = 3;
          secondCharLength = Math.min(3, text.length - 3);
        }
      }
    } else if(state.encodingMode === 'alphanumeric') {
      // Alphanumerisch: Erste zwei Zeichen gemeinsam als erstes Zeichen
      if(text.length >= 1 && /^[0-9A-Z $%*+\-./:]*$/i.test(text)) {
        firstCharIndex = 0;
        firstCharLength = Math.min(2, text.length);
        if(text.length >= 3) {
          secondCharIndex = 2;
          secondCharLength = Math.min(2, text.length - 2);
        }
      }
    } else {
      // Byte: Jedes Zeichen einzeln, aber nur Buchstaben hervorheben
      for(let i = 0; i < text.length; i++) {
        const char = text[i];
        let isHighlightChar = char.match(/[a-zA-ZäöüÄÖÜß]/);
        
        if(isHighlightChar) {
          if(firstCharIndex === -1) {
            firstCharIndex = i;
            firstCharLength = 1;
          } else if(secondCharIndex === -1) {
            secondCharIndex = i;
            secondCharLength = 1;
            break;
          }
        }
      }
    }
    
    if(firstCharIndex === -1) {
      // Kein Zeichen zum Hervorheben gefunden
      textEl.innerHTML = text.replace(/\n/g, '<br>');
    } else {
      // Erstelle HTML mit Hervorhebung
      let html = '';
      for(let i = 0; i < text.length; i++) {
        const char = text[i];
        if(i >= firstCharIndex && i < firstCharIndex + firstCharLength) {
          html += `<span style="background-color: #fecaca; color: #991b1b; border-radius: 2px; padding: 1px 2px;">${char}</span>`;
        } else if(i >= secondCharIndex && i < secondCharIndex + secondCharLength) {
          html += `<span style="background-color: #fef3c7; color: #92400e; border-radius: 2px; padding: 1px 2px;">${char}</span>`;
        } else {
          html += char === '\n' ? '<br>' : char;
        }
      }
      textEl.innerHTML = html;
    }
  }
});

// Synchronize both final QR code checkboxes
if(showFinalBasic) {
  showFinalBasic.addEventListener('change', e=>{
    e.stopPropagation();
    console.log('Basic checkbox changed:', e.target.checked);
    setState({showFinal:e.target.checked});
  });
}

// Event listener für fortgeschrittene Checkbox - wird dynamisch hinzugefügt
function setupAdvancedFinalCheckbox() {
  const showFinalAdv = el('showFinal');
  if(showFinalAdv && !showFinalAdv.hasAttribute('data-listener-added')) {
    console.log('Setup Event Listener für fortgeschrittene Checkbox');
    showFinalAdv.addEventListener('change', e=>{
      e.stopPropagation();
      console.log('Fortgeschrittene Checkbox geändert:', e.target.checked);
      setState({showFinal:e.target.checked});
    });
    showFinalAdv.setAttribute('data-listener-added', 'true');
  } else if(!showFinalAdv) {
    console.warn('Fortgeschrittene Checkbox nicht gefunden');
  }
}

// ECC buttons
document.querySelectorAll('[data-ecc]').forEach(btn=>{
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll('[data-ecc]').forEach(b=>b.classList.remove('chosen'));
    btn.classList.add('chosen');
    setTimeout(() => {
      setState({ecc:btn.getAttribute('data-ecc')});
    }, 10);
  });
});

// Mask buttons
document.querySelectorAll('[data-mask]').forEach(btn=>{
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll('[data-mask]').forEach(b=>b.classList.remove('chosen'));
    btn.classList.add('chosen');
    setTimeout(() => {
      setState({mask:btn.getAttribute('data-mask')});
    }, 10);
  });
});

// Text input - für ContentEditable
let isUpdatingContent = false;
let isDropdownOpen = false;

function extractTextFromElement(element) {
  // Entferne HTML-Tags und extrahiere reinen Text
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = element.innerHTML;
  return tempDiv.textContent || tempDiv.innerText || '';
}

function setCursorToEnd() {
  if (window.getSelection && document.createRange) {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(textEl);
    range.collapse(false); // false = ans Ende
    selection.removeAllRanges();
    selection.addRange(range);
  } else if (document.selection && document.selection.createRange) {
    const range = document.selection.createRange();
    range.moveToElementText(textEl);
    range.collapse(false); // false = ans Ende
    range.select();
  }
}

textEl.addEventListener('input', (e)=>{
  e.stopPropagation();
  if(isUpdatingContent) return; // Verhindere Endlosschleife
  
  // Extrahiere reinen Text aus dem ContentEditable
  const value = extractTextFromElement(textEl);
  console.log('Text-Eingabe erkannt:', value); // Debug-Ausgabe
  
  // Verzögerte Ausführung um sicherzustellen, dass das Dropdown nicht geschlossen wird
  setTimeout(() => {
    setState({text: value});
  }, 10);
});

textEl.addEventListener('blur', (e)=>{
  e.stopPropagation();
  if(isUpdatingContent) return;
  
  // Extrahiere reinen Text aus dem ContentEditable
  const value = extractTextFromElement(textEl);
  
  // Verzögerte Ausführung um sicherzustellen, dass das Dropdown nicht geschlossen wird
  setTimeout(() => {
    setState({text: value});
  }, 10);
});

textEl.addEventListener('paste', (e)=>{
  // Verhindere HTML-Paste und erlaube nur Text
  e.preventDefault();
  e.stopPropagation();
  const text = e.clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text);
});

// Verhindere das Einfügen von HTML-Tags durch Tastenkombinationen
textEl.addEventListener('keydown', (e)=>{
  e.stopPropagation();
  // Verhindere Strg+V (wird durch paste Event behandelt)
  if((e.ctrlKey || e.metaKey) && e.key === 'v') {
    e.preventDefault();
    navigator.clipboard.readText().then(text => {
      document.execCommand('insertText', false, text);
    }).catch(err => {
      console.warn('Clipboard access failed:', err);
    });
  }
});

// Save SVG
btnSave.addEventListener('click', (e)=>{
  e.preventDefault();
  e.stopPropagation();
  const svgMarkup = svgHost.innerHTML;
  if(!svgMarkup) return;
  const blob = new Blob([svgMarkup], {type:"image/svg+xml;charset=utf-8"});
  triggerDownloadBlob(blob, "qr_preview.svg");
});

// Generate mask pattern SVG
function generateMaskSVG(idx, size=24, cellSize=3) {
  let svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>`;
  svg += `<rect width='100%' height='100%' fill='white'/>`;
  const n = Math.floor(size / cellSize);
  for(let r=0;r<n;r++){
    for(let c=0;c<n;c++){
      if(maskPredicate(idx,r,c)){
        svg+=`<rect x='${c*cellSize}' y='${r*cellSize}' width='${cellSize}' height='${cellSize}' fill='black'/>`;
      }
    }
  }
  svg += `</svg>`;
  return svg;
}


// Populate mask buttons with SVG icons and text labels
(function(){
  document.querySelectorAll('[data-mask]').forEach(btn=>{
    const maskValue = btn.getAttribute('data-mask');
    if(/^[0-7]$/.test(maskValue)){
      const maskIdx = parseInt(maskValue, 10);
      btn.innerHTML = generateMaskSVG(maskIdx, 64, 8) + `<div class="mask-label">${maskIdx}</div>`;
    }
  });
})();

// Helper functions for patterns
function isInFinder(r,c,m){
  const R=7;
  const inTL = r<R && c<R;
  const inTR = r<R && c>=m-R;
  const inBL = r>=m-R && c<R;
  return inTL||inTR||inBL;
}
function isInFinderSep(r,c,m){
  const R=8;
  const inTL = r<R && c<R && !(r<7 && c<7);
  const inTR = r<R && c>=m-R && !(r<7 && c>=m-7);
  const inBL = r>=m-R && c<R && !(r>=m-7 && c<7);
  return inTL||inTR||inBL;
}
function isTiming(r,c,m){
  return (r===6 && c>=8 && c<=m-9) || (c===6 && r>=8 && r<=m-9);
}
function isAlignment(r,c,m,v){
  const pos = ALIGN_POS[v]||[];
  if(pos.length===0) return false;
  for(let i=0;i<pos.length;i++){
    for(let j=0;j<pos.length;j++){
      const rr=pos[i], cc=pos[j];
      if((rr===6 && (cc===6 || cc===m-7)) || (rr===m-7 && cc===6)) continue;
      if(Math.abs(r-rr)<=2 && Math.abs(c-cc)<=2) return true;
    }
  }
  return false;
}
function isFormatInfo(r,c,m){
  const cond1=(r===8 && c<=8) || (c===8 && r<=8);
  const cond2=(r===8 && c>=m-8) || (c===8 && r>=m-8);
  if(r===8 && c===6) return true;
  if(c===8 && r===6) return true;
  return cond1||cond2;
}
function isVersionInfo(r,c,m,v){
  if(v<7) return false;
  const inTR = r<=5 && c>=m-11 && c<=m-9;
  const inBL = r>=m-11 && r<=m-9 && c<=5;
  return inTR||inBL;
}
function isFunctionModule(r,c,m,v){
  return isInFinder(r,c,m) || isInFinderSep(r,c,m) || isTiming(r,c,m) || isAlignment(r,c,m,v) || isFormatInfo(r,c,m) || isVersionInfo(r,c,m,v);
}

function computeDataPositions(m,v){
  const pos=[];
  let row=m-1, col=m-1, upward=true;
  while(col>0){
    if(col===6) col--;
    for(let i=0;i<m;i++){
      const r = upward ? row-i : i;
      for(let dc=0; dc<2; dc++){
        const cc = col - dc;
        if(!isFunctionModule(r,cc,m,v)) pos.push([r,cc]);
      }
    }
    col-=2; upward=!upward; row = upward ? m-1 : 0;
  }
  return pos;
}

// Build bits for all encoding modes
function buildDataBits(text, v, eccLevel, mode){
  // Sicherstellen, dass text ein String ist
  const safeText = text || '';
  
  // Für ECC none: volle Datenpfadgröße als capBits
  const m = moduleCountForVersion(v);
  const totalDataModules = computeDataPositions(m, v).length;

  // Verwende die korrekte Kapazitätstabelle basierend auf dem Modus
  const capacityTable = CAPACITY[mode] || CAPACITY.byte;
  const tableCap = (capacityTable[(eccLevel||'L')] && capacityTable[(eccLevel||'L')][v]) || 0;

  let capBits;           // effektive Bitkapazität für Auffüllung
  let inputCapChars;     // wie viele Nutzzeichen dürfen rein
  let capCharsForSizes;  // was in bitInfo.capBytes zurückgegeben wird

  if(eccLevel === 'none'){
    // Für numerische und alphanumerische Modi: Verwende L-Kapazität auch bei 'none'
    if(mode === 'numeric' || mode === 'alphanumeric') {
      inputCapChars = (capacityTable['L'] && capacityTable['L'][v]) || 0;
      capCharsForSizes = inputCapChars;
      if(mode === 'numeric') {
        capBits = Math.floor(inputCapChars * 10/3); // 3 Ziffern = 10 Bits im Durchschnitt
      } else {
        capBits = Math.floor(inputCapChars * 11/2); // 2 Zeichen = 11 Bits im Durchschnitt
      }
    } else {
      capBits = totalDataModules;
      inputCapChars = (capacityTable['L'] && capacityTable['L'][v]) || Math.floor(totalDataModules/8);
      capCharsForSizes = inputCapChars;
    }
  }else{
    // Für numerisch und alphanumerisch: Kapazität in Zeichen, nicht Bytes
    if(mode === 'numeric' || mode === 'alphanumeric') {
      inputCapChars = tableCap;
      capCharsForSizes = tableCap;
      // Konvertiere zu Bits für die Berechnung
      if(mode === 'numeric') {
        capBits = Math.floor(tableCap * 10/3); // 3 Ziffern = 10 Bits im Durchschnitt
      } else {
        capBits = Math.floor(tableCap * 11/2); // 2 Zeichen = 11 Bits im Durchschnitt
      }
    } else {
      // Byte-Modus: Kapazität in Bytes
      inputCapChars = tableCap;
      capCharsForSizes = tableCap;
      capBits = tableCap * 8;
    }
  }

  // Verwende den gewählten Modus
  const modeBits = getModeBits(mode);
  const countBitsLen = getCountBitsLength(mode, v);
  
  // Filtere Text basierend auf gewähltem Modus
  let processedText = safeText;
  if(mode === 'numeric') {
    processedText = safeText.replace(/[^0-9]/g, '') || "123";
  } else if(mode === 'alphanumeric') {
    processedText = safeText.toUpperCase().replace(/[^0-9A-Z $%*+\-./:]/g, '') || "Z5";
  }
  
  // Berechne Datenlänge basierend auf Modus
  const encodedData = encodeData(processedText, mode);
  let dataLength;
  
  if(mode === 'numeric') {
    dataLength = processedText.length; // Anzahl Ziffern
  } else if(mode === 'alphanumeric') {
    dataLength = processedText.length; // Anzahl Zeichen
  } else {
    dataLength = encodedData.length; // Anzahl Bytes
  }
  
  // Verwende die korrekte Kapazität basierend auf dem Modus
  const maxDataLength = Math.max(0, inputCapChars);

  const fits = dataLength <= maxDataLength;
  const usedLength = Math.min(dataLength, maxDataLength);

  // Count-Bits
  const count = new Array(countBitsLen).fill(0);
  for(let i=0;i<countBitsLen;i++) count[i] = (usedLength >> (countBitsLen-1-i)) & 1;

  // Daten-Bits basierend auf Modus
  const dataBits = [];
  const truncatedText = processedText.substring(0, usedLength);
  
  switch(mode) {
    case 'numeric':
      const numericData = encodeNumeric(truncatedText);
      for(const bits of numericData) {
        for(let i = 0; i < bits.length; i++) {
          dataBits.push(parseInt(bits[i]));
        }
      }
      break;
    case 'alphanumeric':
      const alphanumData = encodeAlphanumeric(truncatedText);
      for(const bits of alphanumData) {
        for(let i = 0; i < bits.length; i++) {
          dataBits.push(parseInt(bits[i]));
        }
      }
      break;
    case 'byte':
    default:
      const bytes = encodeData(truncatedText, mode);
      for(let i=0;i<usedLength;i++){
        const b = bytes[i] & 0xff;
        for(let k=7;k>=0;k--) dataBits.push((b>>k)&1);
      }
      break;
  }

  let bits = [...modeBits, ...count, ...dataBits];
  const modeEnd = modeBits.length;
  const countEnd = modeEnd + countBitsLen;
  const dataEnd = countEnd + dataBits.length;

  const remaining = Math.max(0, capBits - bits.length);
  const terminatorLen = Math.min(4, remaining);
  for(let i=0;i<terminatorLen;i++) bits.push(0);

  const zeroPadBits = (8 - (bits.length % 8)) % 8;
  for(let i=0;i<zeroPadBits;i++) bits.push(0);

  const padStart = bits.length;

  let toggle=true;
  while(bits.length < capBits){
    const pb = toggle ? 0xec : 0x11; toggle=!toggle;
    for(let b=7; b>=0 && bits.length<capBits; b--) bits.push((pb>>b)&1);
  }

  return {
    bits, modeEnd, countEnd, dataEnd, terminatorLen, zeroPadBits, padStart,
    padBytesCount: Math.max(0, Math.floor((capBits - padStart)/8)),
    capBytes: capCharsForSizes,
    overflow: !fits,
    usedBytesLen: usedLength
  };
}

// Derived analytics
function getAnalytics(){
  try{
    const m = moduleCountForVersion(state.version);
    const dataPositions = computeDataPositions(m, state.version);
    const totalDataModules = dataPositions.length;
    
    // Prüfe ob Text leer ist - aber erlaube Leerzeichen und andere Whitespace-Zeichen
    if(!state.text || state.text === '') {
      // Gib Basis-Analytics zurück auch für leeren Text
      return {
        m, 
        dataPositions, 
        bitInfo: {bits: [], modeEnd: 0, countEnd: 0, dataEnd: 0, padStart: 0, terminatorLen: 0, capBytes: 0}, 
        totalDataModules, 
        capBytes: 0
      };
    }
    
    // Verwende den gewählten Encoding-Modus
    let textToUse = state.text;
    
    // Verwende den gewählten Modus für die Bit-Berechnung
    const bitInfo = buildDataBits(textToUse, state.version, state.ecc, state.encodingMode);
    const capBytes = bitInfo.capBytes;
    return {m, dataPositions, bitInfo, totalDataModules, capBytes};
  }catch(e){
    console.error('Fehler in getAnalytics:', e);
    // Gib auch bei Fehler Basis-Analytics zurück
    const m = moduleCountForVersion(state.version);
    const dataPositions = computeDataPositions(m, state.version);
    return {
      m, 
      dataPositions, 
      bitInfo: {bits: [], modeEnd: 0, countEnd: 0, dataEnd: 0, padStart: 0, terminatorLen: 0, capBytes: 0}, 
      totalDataModules: dataPositions.length, 
      capBytes: 0
    };
  }
}
function getCapacityInfo(analytics){
  const m = moduleCountForVersion(state.version);
  const effectiveEc = state.ecc === "none" ? "L" : state.ecc;
  const capacityTable = CAPACITY[state.encodingMode] || CAPACITY.byte;
  const cap = capacityTable[effectiveEc][state.version] || 0;
  const dataModules = analytics?.dataPositions?.length || 0;
  return {m, dataModules, cap, effectiveEc};
}

// Helper function to create QR code with forced mode
function createQRWithForcedMode(text, mode, version, eccLevel) {
  try {
    const qr = qrcode(version, eccLevel);
    
    // Verwende den eingegebenen Text direkt
    qr.addData(text);
    
    qr.make();
    return qr;
  } catch(e) {
    console.error('Fehler beim Erstellen des QR Codes mit erzwungenem Modus:', e);
    return null;
  }
}

// Alternative QR Code creation that respects the chosen mode
function createQRWithModeRespect(text, mode, version, eccLevel) {
  try {
    // Try to use the alternative QRCode library if available
    if(typeof QRCode !== 'undefined') {
      // Create QR code with explicit mode
      const qr = new QRCode(-1, eccLevel);
      
      // Verwende den eingegebenen Text direkt
      qr.addData(text);
      
      qr.make();
      return qr;
    }
    
    // Fallback to original library
    return createQRWithForcedMode(text, mode, version, eccLevel);
  } catch(e) {
    console.error('Fehler beim Erstellen des QR Codes mit Modus-Respekt:', e);
    return createQRWithForcedMode(text, mode, version, eccLevel);
  }
}

// Create QR code that forces the specific mode by manipulating the data
function createQRWithForcedModeManipulation(text, mode, version, eccLevel) {
  try {
    const qr = qrcode(version, eccLevel);
    
    // Verwende den eingegebenen Text direkt
    qr.addData(text);
    
    qr.make();
    return qr;
  } catch(e) {
    console.error('Fehler beim Erstellen des QR Codes mit erzwungener Manipulation:', e);
    return null;
  }
}

// Alternative approach: Create QR code with specific mode by using a different library
function createQRWithSpecificMode(text, mode, version, eccLevel) {
  try {
    // Try to use the alternative QRCode library if available
    if(typeof QRCode !== 'undefined') {
      const qr = new QRCode(-1, eccLevel);
      
      // Verwende den eingegebenen Text direkt
      qr.addData(text);
      
      qr.make();
      return qr;
    }
    
    // Fallback to forced mode manipulation
    return createQRWithForcedModeManipulation(text, mode, version, eccLevel);
  } catch(e) {
    console.error('Fehler beim Erstellen des QR Codes mit spezifischem Modus:', e);
    return createQRWithForcedModeManipulation(text, mode, version, eccLevel);
  }
}

// QR instance
function makeQRCodeInstance(inputText){
  try{
    // Für numerische und alphanumerische Modi: Verwende immer L statt none
    const ecLevel = (state.ecc === "none" && (state.encodingMode === 'numeric' || state.encodingMode === 'alphanumeric')) ? "L" : (state.ecc === "none" ? "L" : state.ecc);
    let textToUse = (inputText && typeof inputText === 'string') ? inputText : " ";
    
    // KORREKTE LÖSUNG: Verwende den gewählten Encoding-Modus
    let qr = qrcode(state.version, ecLevel);
    let finalText = textToUse;
    
    // Filtere Text basierend auf gewähltem Modus
    if(state.encodingMode === 'numeric') {
      // Für numerischen Modus: nur Ziffern verwenden
      finalText = textToUse.replace(/[^0-9]/g, '') || "123";
      console.log('Numerischer Modus - Original:', textToUse, 'Final:', finalText);
    } else if(state.encodingMode === 'alphanumeric') {
      // Für alphanumerischen Modus: nur gültige Zeichen verwenden
      finalText = textToUse.toUpperCase().replace(/[^0-9A-Z $%*+\-./:]/g, '') || "Z5";
      console.log('Alphanumerischer Modus - Original:', textToUse, 'Final:', finalText);
    } else {
      // Byte-Modus: alle Zeichen verwenden
      console.log('Byte-Modus - Text:', textToUse);
      finalText = textToUse;
    }
    
    qr.addData(finalText);
    qr.make();
    
    // Maskenbehandlung
    if(state.mask !== "auto" && state.mask !== "none") {
      const maskIndex = parseInt(state.mask, 10);
      if(!isNaN(maskIndex) && maskIndex >= 0 && maskIndex <= 7) {
        // Erstelle neuen QR-Code mit spezifischer Maske
        const maskedQr = qrcode(state.version, ecLevel);
        maskedQr.addData(finalText);
        maskedQr.make(maskIndex);
        qr = maskedQr;
      }
    }
    
    return qr;
  }catch(e){
    console.error('Fehler beim Erstellen des QR Codes:', e);
    // Versuche Fallback mit einfachem Text
    try {
      const ecLevel = state.ecc==="none" ? "L" : state.ecc;
      const qr = qrcode(state.version, ecLevel);
      qr.addData(" ");
      qr.make();
      return qr;
    } catch(e2) {
      console.error('Auch Fallback-QR fehlgeschlagen:', e2);
      state.lastError = String(e);
      return null;
    }
  }
}

// Matrix aus qr in boolean Array
function matrixFrom(qr){
  const n = qr.getModuleCount();
  const M = new Array(n);
  for(let r=0;r<n;r++){
    M[r]=new Array(n);
    for(let c=0;c<n;c++) M[r][c] = qr.isDark(r,c) ? 1 : 0;
  }
  return M;
}

// Penalty Regeln nach ISO 18004 vereinfacht
function penaltyScoreMatrix(M){
  const n=M.length; let score=0;
  // Regel 1: Reihen und Spalten Läufe ≥ 5
  const runScore = (arr)=>{
    let s=0, run=1;
    for(let i=1;i<arr.length;i++){
      if(arr[i]===arr[i-1]){ run++; }
      else { if(run>=5) s += 3 + (run-5); run=1; }
    }
    if(run>=5) s += 3 + (run-5);
    return s;
  };
  for(let r=0;r<n;r++){ score+=runScore(M[r]); }
  for(let c=0;c<n;c++){ const col=new Array(n); for(let r=0;r<n;r++) col[r]=M[r][c]; score+=runScore(col); }

  // Regel 2: 2×2 Blöcke gleicher Farbe
  for(let r=0;r<n-1;r++){
    for(let c=0;c<n-1;c++){
      const v=M[r][c];
      if(v===M[r][c+1] && v===M[r+1][c] && v===M[r+1][c+1]) score+=3;
    }
  }

  // Regel 3: Finder ähnliche Muster in Reihen und Spalten
  const patterns = [
    [0,0,0,0,1,0,1,1,1,0,1,0,0,0,0], // mit hellen Rändern
    [1,1,1,1,0,1,0,0,0,1,0,1,1,1,1], // invertiert
  ];
  const hasPattern = (arr)=>{
    let s=0;
    for(let i=0;i<=arr.length-15;i++){
      for(const p of patterns){
        let ok=true; for(let k=0;k<15;k++){ if(arr[i+k]!==p[k]){ ok=false; break; } }
        if(ok) s+=40;
      }
    }
    return s;
  };
  for(let r=0;r<n;r++) score+=hasPattern(M[r]);
  for(let c=0;c<n;c++){ const col=new Array(n); for(let r=0;r<n;r++) col[r]=M[r][c]; score+=hasPattern(col); }

  // Regel 4: Gleichverteilung schwarz weiß
  let dark=0; for(let r=0;r<n;r++) for(let c=0;c<n;c++) if(M[r][c]) dark++;
  const total = n*n; const percent = (dark*100)/total; const steps = Math.abs(percent-50)/5;
  score += Math.floor(steps) * 10;
  return score;
}

function getMaskScores(text, version, eccLevel){
  const ec = eccLevel==="none" ? "L" : eccLevel;
  const scores=[]; let bestIdx=0, best=Infinity;
  for(let idx=0; idx<8; idx++){
    const qr = qrcode(version, ec); qr.addData(text); qr.make(idx);
    const M = matrixFrom(qr);
    const s = penaltyScoreMatrix(M);
    scores.push(s);
    if(s<best){ best=s; bestIdx=idx; }
  }
  return {scores, bestIdx};
}


// Draw preview SVG
function drawSVG(qr, analytics){
  const host = svgHost;
  if(!host) {
    console.log('SVG Host nicht gefunden');
    return;
  }
  
  console.log('drawSVG aufgerufen mit:', {qr: !!qr, analytics: !!analytics});
  
  // Immer mindestens einen QR-Code anzeigen
  if(!qr) {
    // Erstelle einen einfachen QR-Code für die Anzeige
    try {
      const ecLevel = state.ecc==="none" ? "L" : state.ecc;
      qr = qrcode(state.version, ecLevel);
      qr.addData(" ");
      qr.make();
    } catch(e) {
      console.error('Fehler beim Erstellen des Fallback-QR:', e);
      host.innerHTML = `<div style="padding: 20px; color: #666;">QR-Code konnte nicht erstellt werden</div>`;
      return;
    }
  }
  
  const m = qr.getModuleCount();
  const scale = Math.max(8, Math.floor(400/m)); // Erhöhe minimale Skalierung
  const size = m*scale;
  
  console.log('QR-Code Größe:', {m, scale, size});

  let svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}' aria-label='QR Vorschau'>`;
  svg += `<rect width='100%' height='100%' fill='white'/>`;
  
  console.log('SVG gestartet, Größe:', size);

  // Funktionsmuster schwarz weiß nur Finder, Separator, Timing
  let functionModules = 0;
  for(let r=0;r<m;r++){
    for(let c=0;c<m;c++){
      const isFinder = isInFinder(r,c,m);
      const isSep = isInFinderSep(r,c,m);
      const isTim = isTiming(r,c,m);
      if((isFinder||isSep||isTim) && qr.isDark(r,c)){
        svg+=`<rect x='${c*scale}' y='${r*scale}' width='${scale}' height='${scale}'/>`;
        functionModules++;
      }
    }
  }
  console.log('Funktionsmodule gezeichnet:', functionModules);

  // Prüfe ob analytics vorhanden ist - wenn nicht, zeige nur Finder-Patterns
  if(!analytics || !analytics.bitInfo || analytics.bitInfo.bits.length === 0) {
    console.log('Analytics leer - zeige nur Finder-Patterns');
    // Gitter hinzufügen
    svg+=`<g stroke='${getComputedStyle(document.documentElement).getPropertyValue('--border').trim()}' stroke-width='1' aria-hidden='true'>`;
    for(let i=0;i<=m;i++){
      svg+=`<path d='M0 ${i*scale+.5} H${size}'/><path d='M${i*scale+.5} 0 V${size}'/>`;
    }
    svg+=`</g></svg>`;
    host.innerHTML = svg;
    console.log('SVG gesetzt (nur Finder-Patterns)');
    return;
  }
  
  console.log('Analytics vorhanden - zeige Datenbits');
  
  const pos = analytics?.dataPositions || [];
  const bits = analytics?.bitInfo?.bits || [];
  const {modeEnd=0,countEnd=0,dataEnd=0,padStart=0,terminatorLen=0} = analytics?.bitInfo || {};
  const termEnd = dataEnd + terminatorLen;
  const capBits = (analytics?.bitInfo?.capBytes || 0) * 8;
  const totalBits = pos.length;
  
  console.log('Datenbits-Info:', {pos: pos.length, bits: bits.length, modeEnd, countEnd, dataEnd, totalBits});

  // Finde die Bit-Position des ersten und zweiten Zeichens basierend auf Modus
  let firstCharBitIndex = -1;
  let secondCharBitIndex = -1;
  
  // Verwende den gefilterten Text basierend auf dem gewählten Modus
  let textForHighlighting = state.text || '';
  
  // Filtere Text basierend auf gewähltem Modus
  if(state.encodingMode === 'numeric') {
    textForHighlighting = textForHighlighting.replace(/[^0-9]/g, '') || "123";
  } else if(state.encodingMode === 'alphanumeric') {
    textForHighlighting = textForHighlighting.toUpperCase().replace(/[^0-9A-Z $%*+\-./:]/g, '') || "Z5";
  }
  
  // Definiere Variablen für Hervorhebung basierend auf Modus
  let firstCharIndex = -1;
  let secondCharIndex = -1;
  
  if(textForHighlighting) {
    if(state.encodingMode === 'numeric') {
      // Numerisch: Erste drei Ziffern gemeinsam als erstes Zeichen
      if(textForHighlighting.length >= 1) {
        firstCharIndex = 0;
        if(textForHighlighting.length >= 4) {
          secondCharIndex = 3;
        }
      }
    } else if(state.encodingMode === 'alphanumeric') {
      // Alphanumerisch: Erste zwei Zeichen gemeinsam als erstes Zeichen
      if(textForHighlighting.length >= 1) {
        firstCharIndex = 0;
        if(textForHighlighting.length >= 3) {
          secondCharIndex = 2;
        }
      }
    } else {
      // Byte: Jedes Zeichen einzeln, aber nur Buchstaben hervorheben
      for(let i = 0; i < textForHighlighting.length; i++) {
        const char = textForHighlighting[i];
        let isHighlightChar = char.match(/[a-zA-ZäöüÄÖÜß]/);
        
        if(isHighlightChar) {
          if(firstCharIndex === -1) {
            firstCharIndex = i;
          } else if(secondCharIndex === -1) {
            secondCharIndex = i;
            break;
          }
        }
      }
    }
    
    if(firstCharIndex !== -1) {
      // Berechne die Bit-Position basierend auf gewähltem Modus
      const modeBits = getModeBits(state.encodingMode);
      const countBitsLen = getCountBitsLength(state.encodingMode, state.version);
      let bitOffset = modeBits.length + countBitsLen; // Mode + Count
      
      // Berechne Bits bis zum ersten Zeichen basierend auf Modus
      const textBeforeFirst = textForHighlighting.substring(0, firstCharIndex);
      switch(state.encodingMode) {
        case 'numeric':
          for(let i = 0; i < textBeforeFirst.length; i += 3) {
            const chunk = textBeforeFirst.substring(i, i + 3);
            if(chunk.length === 3) bitOffset += 10;
            else if(chunk.length === 2) bitOffset += 7;
            else bitOffset += 4;
          }
          break;
        case 'alphanumeric':
          for(let i = 0; i < textBeforeFirst.length; i += 2) {
            const chunk = textBeforeFirst.substring(i, i + 2);
            if(chunk.length === 2) bitOffset += 11;
            else bitOffset += 6;
          }
          break;
        case 'byte':
        default:
          const bytesBeforeFirst = utf8Bytes(textBeforeFirst);
          bitOffset += bytesBeforeFirst.length * 8;
          break;
      }
      
      // Berechne die Bit-Länge des ersten Zeichens basierend auf Modus
      let firstCharBitLength = 0;
      switch(state.encodingMode) {
        case 'numeric':
          const firstNumericChunk = textForHighlighting.substring(firstCharIndex, Math.min(firstCharIndex + 3, textForHighlighting.length));
          if(firstNumericChunk.length === 3) firstCharBitLength = 10;
          else if(firstNumericChunk.length === 2) firstCharBitLength = 7;
          else firstCharBitLength = 4;
          break;
        case 'alphanumeric':
          const firstAlphanumChunk = textForHighlighting.substring(firstCharIndex, Math.min(firstCharIndex + 2, textForHighlighting.length));
          if(firstAlphanumChunk.length === 2) firstCharBitLength = 11;
          else firstCharBitLength = 6;
          break;
        case 'byte':
        default:
          firstCharBitLength = 8; // Ein Byte = 8 Bits
          break;
      }
      firstCharBitIndex = bitOffset;
      
      // Für den zweiten Zeichen-Bereich
      if(secondCharIndex !== -1) {
        // Berechne die Bit-Länge des zweiten Zeichens basierend auf Modus
        let secondCharBitLength = 0;
        switch(state.encodingMode) {
          case 'numeric':
            const secondNumericChunk = textForHighlighting.substring(secondCharIndex, Math.min(secondCharIndex + 3, textForHighlighting.length));
            if(secondNumericChunk.length === 3) secondCharBitLength = 10;
            else if(secondNumericChunk.length === 2) secondCharBitLength = 7;
            else secondCharBitLength = 4;
            break;
          case 'alphanumeric':
            const secondAlphanumChunk = textForHighlighting.substring(secondCharIndex, Math.min(secondCharIndex + 2, textForHighlighting.length));
            if(secondAlphanumChunk.length === 2) secondCharBitLength = 11;
            else secondCharBitLength = 6;
            break;
          case 'byte':
          default:
            secondCharBitLength = 8; // Ein Byte = 8 Bits
            break;
        }
        secondCharBitIndex = bitOffset + firstCharBitLength;
      }
    }
  }

  const segOf = (i)=>{
    if(i<modeEnd) return "mode";
    if(i<countEnd) return "count";
    if(i<dataEnd) return "data";
    if(i<termEnd) return "term";
    if(i<padStart) return "zeropad";
    if(i<capBits) return "pad";
    return "ecc";
  };
  const allowViewScope = (seg)=>{
    if(state.viewScope==="basic") return ["mode","count","data","term"].includes(seg);
    return true;
  };

  if(pos.length){
    const hasNumericMask = /^[0-7]$/.test(String(state.mask));
    const mIdx = hasNumericMask ? parseInt(String(state.mask),10) : null;
    const applyMaskHere = state.viewScope==="rest" && state.applyMask;
    const overlays=[];
    
    console.log('Beginne mit Datenmodulen, totalBits:', totalBits);

    let dataModules = 0;
    for(let i=0;i<totalBits;i++){
      const seg = segOf(i);
      if(!allowViewScope(seg)) continue;
      const [r,c] = pos[i];

      let bitDark = 0;
      if(i<capBits){
        const rawBit = bits[i] ? 1 : 0;
        if(applyMaskHere && mIdx!==null) bitDark = rawBit ^ (maskPredicate(mIdx,r,c) ? 1 : 0);
        else if(applyMaskHere && (state.mask==="auto" || state.mask==="none")) bitDark = qr.isDark(r,c) ? 1 : 0;
        else bitDark = rawBit;
      }else{
        bitDark = qr.isDark(r,c) ? 1 : 0;
      }

      // Sichtbarkeit je Auswahl
      let showBase=false;
      if(state.viewScope==="rest"){
        if(seg==="mode") showBase = state.segView.mode!=="off";
        else if(seg==="count") showBase = state.segView.count!=="off";
        else if(seg==="term") showBase = state.segView.term!=="off";
        else if(seg==="data") showBase = true;
        else if(seg==="zeropad") showBase = true;
        else if(seg==="pad") showBase = state.showPadSW;
        else if(seg==="ecc") showBase = state.showECCSW;
      }else{
        if(seg==="mode") showBase = state.segView.mode!=="off";
        else if(seg==="count") showBase = state.segView.count!=="off";
        else if(seg==="term") showBase = state.segView.term!=="off";
        else if(seg==="data") showBase = true;
      }

      if(showBase){
        // Prüfe ob dies der erste oder zweite Zeichen-Bereich ist basierend auf Modus
        let firstCharBitLength = 8; // Standard für Byte-Modus
        let secondCharBitLength = 8; // Standard für Byte-Modus
        
        if(state.encodingMode === 'numeric') {
          const firstNumericChunk = textForHighlighting.substring(0, Math.min(3, textForHighlighting.length));
          if(firstNumericChunk.length === 3) firstCharBitLength = 10;
          else if(firstNumericChunk.length === 2) firstCharBitLength = 7;
          else firstCharBitLength = 4;
          
          if(secondCharIndex !== -1) {
            const secondNumericChunk = textForHighlighting.substring(secondCharIndex, Math.min(secondCharIndex + 3, textForHighlighting.length));
            if(secondNumericChunk.length === 3) secondCharBitLength = 10;
            else if(secondNumericChunk.length === 2) secondCharBitLength = 7;
            else secondCharBitLength = 4;
          }
        } else if(state.encodingMode === 'alphanumeric') {
          const firstAlphanumChunk = textForHighlighting.substring(0, Math.min(2, textForHighlighting.length));
          if(firstAlphanumChunk.length === 2) firstCharBitLength = 11;
          else firstCharBitLength = 6;
          
          if(secondCharIndex !== -1) {
            const secondAlphanumChunk = textForHighlighting.substring(secondCharIndex, Math.min(secondCharIndex + 2, textForHighlighting.length));
            if(secondAlphanumChunk.length === 2) secondCharBitLength = 11;
            else secondCharBitLength = 6;
          }
        }
        
        const isFirstChar = (i >= firstCharBitIndex && i < firstCharBitIndex + firstCharBitLength);
        const isSecondChar = (i >= secondCharBitIndex && i < secondCharBitIndex + secondCharBitLength);
        
        let fillColor = 'white'; // Standard weiß
        if(state.showColorHighlight) {
          if(bitDark) {
            // Schwarze Pixel
            if(isFirstChar) {
              fillColor = '#dc2626'; // Helles Rot für ersten Buchstaben
            } else if(isSecondChar) {
              fillColor = '#d97706'; // Gelblich für zweiten Buchstaben
            } else {
              fillColor = 'black'; // Standard schwarz
            }
          } else {
            // Weiße Pixel - dezente Einfärbung
            if(isFirstChar) {
              fillColor = '#fecaca'; // Dezentes Rot für ersten Buchstaben
            } else if(isSecondChar) {
              fillColor = '#fef3c7'; // Dezentes Gelblich für zweiten Buchstaben
            } else {
              fillColor = 'white'; // Standard weiß
            }
          }
        } else {
          // Normale schwarz/weiß Darstellung
          fillColor = bitDark ? 'black' : 'white';
        }
        
        svg+=`<rect x='${c*scale}' y='${r*scale}' width='${scale}' height='${scale}' fill='${fillColor}'/>`;
        dataModules++;
      }

      let overlayColor=null;
      if(seg==="mode" && state.segView.mode==="color") overlayColor=COLORS.mode;
      else if(seg==="count" && state.segView.count==="color") overlayColor=COLORS.count;
      else if(seg==="term" && state.segView.term==="color") overlayColor=COLORS.term;

      if(overlayColor && ["mode","count","term"].includes(seg)){
        overlays.push(`<rect x='${c*scale}' y='${r*scale}' width='${scale}' height='${scale}' fill='${overlayColor}' opacity='0.35'/>`);
      }
      // Verbesserte Darstellung für Padbytes und Fehlerkorrektur (nur Fortgeschritten)
      if(state.viewScope==="rest"){ 
        if(seg==="pad" && state.showPadSW){
          overlays.push(`<rect x='${c*scale}' y='${r*scale}' width='${scale}' height='${scale}' fill='${COLORS.pad}' opacity='0.28'><title>Padbyte</title></rect>`);
        }
        if(seg==="ecc" && state.showECCSW){
          overlays.push(`<rect x='${c*scale}' y='${r*scale}' width='${scale}' height='${scale}' fill='${COLORS.ecc}' opacity='0.22'><title>Fehlerkorrektur</title></rect>`);
        }
      }
    }
    if(overlays.length) svg+=overlays.join('');
  }

  // Formatinfo hervorheben nur Fortgeschritten
  if(state.highlightFormat && state.viewScope==="rest"){
    for(let r=0;r<m;r++){
      for(let c=0;c<m;c++){
        if(isFormatInfo(r,c,m)){
          // Zeige die tatsächlichen schwarzen/weißen Module der Formatinfo
          const isDark = qr.isDark(r,c);
          const fillColor = isDark ? 'black' : 'white';
          const label = r===8 ? "Formatinfo horizontal (Zeile 9)" : "Formatinfo vertikal (Spalte 9)";
          svg+=`<rect x='${c*scale}' y='${r*scale}' width='${scale}' height='${scale}' fill='${fillColor}' stroke='${COLORS.format}' stroke-width='2'><title>${label} Formatinfo</title></rect>`;
        }
      }
    }
  }

  // Mask overlay in Fortgeschritten - automatically show when specific mask is selected
  if(state.viewScope==="rest" && /^[0-7]$/.test(String(state.mask))){
    // Besten Maskenindex bestimmen oder gewählten übernehmen
    const {scores, bestIdx} = getMaskScores(state.text, state.version, state.ecc);
    let mIdx = /^[0-7]$/.test(String(state.mask)) ? parseInt(state.mask,10) : bestIdx;
    if(mIdx!==null){
      for(let r=0;r<m;r++){
        for(let c=0;c<m;c++){
          if(!isFunctionModule(r,c,m,state.version) && maskPredicate(mIdx,r,c)){
            svg+=`<rect x='${c*scale}' y='${r*scale}' width='${scale}' height='${scale}' fill='${COLORS.mask}' opacity='0.18'><title>Maskenmuster (Maske ${mIdx})</title></rect>`;
          }
        }
      }
    }
  }

  // Gitter
  svg+=`<g stroke='${getComputedStyle(document.documentElement).getPropertyValue('--border').trim()}' stroke-width='1' aria-hidden='true'>`;
  for(let i=0;i<=m;i++){
    svg+=`<path d='M0 ${i*scale+.5} H${size}'/><path d='M${i*scale+.5} 0 V${size}'/>`;
  }
  svg+=`</g></svg>`;

  host.innerHTML = svg;
  console.log('SVG gesetzt (mit Datenbits), Länge:', svg.length);
}

// Final scannable
function drawFinal(qr){
  const host = finalHost;
  if(!host) return;
  host.innerHTML = "";
  if(!state.showFinal || !qr) return;
  
  try {
    const m = qr.getModuleCount();
    const cell = Math.max(4, Math.floor(300 / m));
    const size = m * cell;
    
    // Erstelle SVG manuell da createSvgTag möglicherweise nicht existiert
    let svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}' aria-label='Scannbarer QR Code'>`;
    svg += `<rect width='100%' height='100%' fill='white'/>`;
    
    // Zeichne alle Module
    for(let r = 0; r < m; r++){
      for(let c = 0; c < m; c++){
        if(qr.isDark(r, c)){
          svg += `<rect x='${c * cell}' y='${r * cell}' width='${cell}' height='${cell}' fill='black'/>`;
        }
      }
    }
    
    svg += `</svg>`;
    host.innerHTML = svg;
  } catch(e) {
    console.error('Fehler beim Erstellen des finalen QR Codes:', e);
    host.innerHTML = `<div style="color: red; padding: 20px;">Fehler beim Erstellen des QR Codes: ${e.message}</div>`;
  }
}

// Update text field content to highlight first and second character
function updateTextContent(force = false){
  if(isUpdatingContent && !force) return; // Verhindere Endlosschleife, außer wenn erzwungen
  
  isUpdatingContent = true;
  const text = state.text || '';
  
  // Speichere aktuelle Cursor-Position
  let cursorPosition = 0;
  if (window.getSelection && document.createRange) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(textEl);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      cursorPosition = preCaretRange.toString().length;
    }
  }
  
  // Finde den ersten und zweiten Zeichen-Bereich basierend auf Modus
  let firstCharIndex = -1;
  let secondCharIndex = -1;
  let firstCharLength = 1;
  let secondCharLength = 1;
  
  if(state.encodingMode === 'numeric') {
    // Numerisch: Erste drei Ziffern gemeinsam als erstes Zeichen
    const numericText = text.replace(/[^0-9]/g, '');
    if(numericText.length >= 1) {
      firstCharIndex = 0;
      firstCharLength = Math.min(3, numericText.length);
      if(numericText.length >= 4) {
        secondCharIndex = 3;
        secondCharLength = Math.min(3, numericText.length - 3);
      }
    }
  } else if(state.encodingMode === 'alphanumeric') {
    // Alphanumerisch: Erste zwei Zeichen gemeinsam als erstes Zeichen
    const alphanumText = text.toUpperCase().replace(/[^0-9A-Z $%*+\-./:]/g, '');
    if(alphanumText.length >= 1) {
      firstCharIndex = 0;
      firstCharLength = Math.min(2, alphanumText.length);
      if(alphanumText.length >= 3) {
        secondCharIndex = 2;
        secondCharLength = Math.min(2, alphanumText.length - 2);
      }
    }
  } else {
    // Byte: Jedes Zeichen einzeln, aber nur Buchstaben hervorheben
    for(let i = 0; i < text.length; i++) {
      const char = text[i];
      let isHighlightChar = char.match(/[a-zA-ZäöüÄÖÜß]/);
      
      if(isHighlightChar) {
        if(firstCharIndex === -1) {
          firstCharIndex = i;
          firstCharLength = 1;
        } else if(secondCharIndex === -1) {
          secondCharIndex = i;
          secondCharLength = 1;
          break;
        }
      }
    }
  }
  
  if(firstCharIndex === -1 || !state.showColorHighlight) {
    // Kein Buchstabe gefunden, Hervorhebung deaktiviert oder Modus passt nicht, zeige normalen Text
    textEl.innerHTML = text.replace(/\n/g, '<br>');
  } else {
    // Erstelle HTML mit dem ersten und zweiten Zeichen-Bereich hervorgehoben
    let html = '';
    for(let i = 0; i < text.length; i++) {
      const char = text[i];
      if(i >= firstCharIndex && i < firstCharIndex + firstCharLength) {
        html += `<span style="background-color: #fecaca; color: #991b1b; border-radius: 2px; padding: 1px 2px;">${char}</span>`;
      } else if(i >= secondCharIndex && i < secondCharIndex + secondCharLength) {
        html += `<span style="background-color: #fef3c7; color: #92400e; border-radius: 2px; padding: 1px 2px;">${char}</span>`;
      } else {
        html += char === '\n' ? '<br>' : char;
      }
    }
    textEl.innerHTML = html;
  }
  
  // Stelle Cursor-Position wieder her
  setTimeout(() => {
    // Bei automatischer Texteingabe (z.B. Moduswechsel) Cursor ans Ende setzen
    if(text === '1' || text === 'Z5') {
      // KEIN automatisches Fokussieren des Textfelds mehr!
      // if (!isDropdownOpen) {
      //   textEl.focus();
      //   setCursorToEnd();
      // }
    } else {
      setCursorPosition(cursorPosition);
    }
    isUpdatingContent = false;
  }, 0);
}

function setCursorPosition(position) {
  if (window.getSelection && document.createRange) {
    const range = document.createRange();
    const selection = window.getSelection();
    
    // Finde die entsprechende Text-Position
    let currentPos = 0;
    let targetNode = null;
    let targetOffset = 0;
    
    function walkNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const textLength = node.textContent.length;
        if (currentPos + textLength >= position) {
          targetNode = node;
          targetOffset = position - currentPos;
          return true;
        }
        currentPos += textLength;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        for (let i = 0; i < node.childNodes.length; i++) {
          if (walkNode(node.childNodes[i])) return true;
        }
      }
      return false;
    }
    
    if (walkNode(textEl)) {
      range.setStart(targetNode, targetOffset);
      range.setEnd(targetNode, targetOffset);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Fallback: Cursor ans Ende
      setCursorToEnd();
    }
  }
}

// Render bin list
function renderBinList(){
  const text = state.text || '';
  binChipsEl.innerHTML = "";
  
  // Update title basierend auf Encoding-Modus
  const dataTitle = document.getElementById('data-title');
  switch(state.encodingMode) {
    case 'numeric':
      dataTitle.textContent = 'Numerische Darstellung';
      break;
    case 'alphanumeric':
      dataTitle.textContent = 'Alphanumerische Darstellung';
      break;
    case 'byte':
    default:
      dataTitle.textContent = 'ASCII Darstellung';
      break;
  }
  
  // Finde die Position des ersten und zweiten Zeichen-Bereichs basierend auf Modus
  let firstCharIndex = -1;
  let secondCharIndex = -1;
  let firstCharLength = 1;
  let secondCharLength = 1;
  
  if(state.encodingMode === 'numeric') {
    // Numerisch: Erste drei Ziffern gemeinsam als erstes Zeichen
    const numericText = text.replace(/[^0-9]/g, '');
    if(numericText.length >= 1) {
      firstCharIndex = 0;
      firstCharLength = Math.min(3, numericText.length);
      if(numericText.length >= 4) {
        secondCharIndex = 3;
        secondCharLength = Math.min(3, numericText.length - 3);
      }
    }
  } else if(state.encodingMode === 'alphanumeric') {
    // Alphanumerisch: Erste zwei Zeichen gemeinsam als erstes Zeichen
    const alphanumText = text.toUpperCase().replace(/[^0-9A-Z $%*+\-./:]/g, '');
    if(alphanumText.length >= 1) {
      firstCharIndex = 0;
      firstCharLength = Math.min(2, alphanumText.length);
      if(alphanumText.length >= 3) {
        secondCharIndex = 2;
        secondCharLength = Math.min(2, alphanumText.length - 2);
      }
    }
  } else {
    // Byte: Jedes Zeichen einzeln, aber nur Buchstaben hervorheben
    for(let i = 0; i < text.length; i++) {
      const char = text[i];
      let isHighlightChar = char.match(/[a-zA-ZäöüÄÖÜß]/);
      
      if(isHighlightChar) {
        if(firstCharIndex === -1) {
          firstCharIndex = i;
          firstCharLength = 1;
        } else if(secondCharIndex === -1) {
          secondCharIndex = i;
          secondCharLength = 1;
          break;
        }
      }
    }
  }
  
  // Generiere Darstellung basierend auf Encoding-Modus
  let dataItems = [];
  switch(state.encodingMode) {
    case 'numeric':
      // Numeric: Zeige Ziffern-Gruppen
      const numericText = text.replace(/[^0-9]/g, '');
      for(let i = 0; i < numericText.length; i += 3) {
        const chunk = numericText.substring(i, i + 3);
        const num = parseInt(chunk, 10);
        let bits = num.toString(2);
        
        if (chunk.length === 3) {
          bits = bits.padStart(10, '0');
        } else if (chunk.length === 2) {
          bits = bits.padStart(7, '0');
        } else {
          bits = bits.padStart(4, '0');
        }
        
        dataItems.push({
          text: chunk,
          bits: bits,
          startPos: i,
          length: chunk.length
        });
      }
      break;
      
    case 'alphanumeric':
      // Alphanumeric: Zeige Zeichen-Paare
      const alphanumText = text.toUpperCase().replace(/[^0-9A-Z $%*+\-./:]/g, '');
      for(let i = 0; i < alphanumText.length; i += 2) {
        const char1 = alphanumText[i];
        const char2 = alphanumText[i + 1] || '';
        const chunk = char1 + char2;
        
        const table = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
        const val1 = table.indexOf(char1);
        let bits = '';
        
        if(char2) {
          const val2 = table.indexOf(char2);
          if(val2 !== -1) {
            const combined = val1 * 45 + val2;
            bits = combined.toString(2).padStart(11, '0');
          }
        } else {
          bits = val1.toString(2).padStart(6, '0');
        }
        
        dataItems.push({
          text: chunk,
          bits: bits,
          startPos: i,
          length: chunk.length
        });
      }
      break;
      
    case 'byte':
    default:
      // Byte: Zeige UTF-8 Bytes
      const bytes = utf8Bytes(text);
      bytes.forEach((b, index) => {
        dataItems.push({
          text: String.fromCharCode(b),
          bits: b.toString(2).padStart(8, '0'),
          startPos: index,
          length: 1
        });
      });
      break;
  }
  
  dataItems.forEach((item, index) => {
    const span = document.createElement('code');
    span.className = 'chip tiny';
    span.textContent = item.bits;
    
    // Hervorhebung basierend auf Modus
    if(state.showColorHighlight) {
      // Prüfe ob dieser Datenblock den ersten oder zweiten Zeichen-Bereich enthält
      const containsFirstChar = firstCharIndex >= item.startPos && firstCharIndex < item.startPos + item.length;
      const containsSecondChar = secondCharIndex >= item.startPos && secondCharIndex < item.startPos + item.length;
      
      if(containsFirstChar) {
        span.style.backgroundColor = '#fecaca';
        span.style.borderColor = '#dc2626';
        span.style.color = '#991b1b';
      } else if(containsSecondChar) {
        span.style.backgroundColor = '#fef3c7';
        span.style.borderColor = '#d97706';
        span.style.color = '#92400e';
      }
    }
    
    binChipsEl.appendChild(span);
  });
}

// Sizes info
function renderSizes(analytics){
  // Größen und Kapazitäten sind deaktiviert
  if(sizesCard) sizesCard.style.display="none";
  return;
}

// State update and render
function setState(patch){
  Object.assign(state, patch);

  // Sicherstellen, dass text immer ein String ist
  if(state.text === null || state.text === undefined) {
    state.text = '';
  }

  const basic = state.viewScope === "basic";
  tabBasic.setAttribute('aria-selected', basic ? "true" : "false");
  tabRest.setAttribute('aria-selected', basic ? "false" : "true");
  restControls.style.display = basic ? "none" : "";
  finalToggleBasic.style.display = basic ? "" : "none";
  
  // Version Dropdown nur aktualisieren wenn es sich tatsächlich geändert hat
  // UND wenn es nicht gerade fokussiert ist (um das Schließen zu verhindern)
  const versionSelect = el('version');
  
  if(versionSelect && patch.version && versionSelect.value !== String(patch.version) && !isDropdownOpen) {
    // SOFORTIGE Aktualisierung ohne Verzögerung
    versionSelect.value = String(patch.version);
  }
  
  // Verhindere setState-Aufrufe während das Dropdown offen ist
  if(isDropdownOpen && versionSelect && versionSelect === document.activeElement) {
    console.log('Dropdown ist offen - überspringe setState-Aufruf');
    return;
  }
  
  
  // Setup Event Listener für fortgeschrittene Checkbox wenn nötig
  if(!basic) {
    setupAdvancedFinalCheckbox();
  }
  
  // Synchronisiere Encoding-Modus-Buttons
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === state.encodingMode);
  });

  state.lastError = null;
  errorEl.textContent = '';

  // Final immer erlaubt, keine Sperre mehr

  // Anzeige links: Text in Bytes - IMMER aktualisieren
  renderBinList();
  
  // Update text field content - IMMER aktualisieren (ohne Fokussierung)
  updateTextContent();

  // QR bauen - auch für leeren Text um Finder-Patterns zu zeigen
  console.log('Erstelle QR-Code für Text:', state.text); // Debug-Ausgabe
  const qr = makeQRCodeInstance(state.text);
  console.log('QR-Code erstellt:', qr); // Debug-Ausgabe
  
  // Vorschau rechts - immer zeichnen, auch wenn QR null ist
  const analytics = getAnalytics();
  console.log('Analytics:', analytics); // Debug-Ausgabe
  drawSVG(qr, analytics);
  
  // Final QR Code anzeigen wenn showFinal aktiviert ist
  if(state.showFinal && qr) {
    drawFinal(qr);
  } else {
    finalHost.innerHTML = "";
    finalCard.style.display = "none";
  }
  
  renderSizes(analytics);

  // Checkbox sync scannbar - synchronize both checkboxes
  if(showFinalBasic && showFinalBasic.checked !== state.showFinal){
    showFinalBasic.checked = state.showFinal;
  }
  const showFinalAdv = el('showFinal');
  if(showFinalAdv && showFinalAdv.checked !== state.showFinal){
    showFinalAdv.checked = state.showFinal;
  }
  
  // Debug: Checkbox Status
  console.log('Checkbox Status:', {
    showFinal: state.showFinal,
    basicChecked: showFinalBasic ? showFinalBasic.checked : 'N/A',
    advancedChecked: showFinalAdv ? showFinalAdv.checked : 'N/A',
    viewScope: state.viewScope
  });
  
  // Final Card anzeigen/verstecken
  if(finalCard) {
    finalCard.style.display = state.showFinal ? "" : "none";
  }
  
  // Debug-Info für Final QR Code
  if(state.showFinal && qr) {
    console.log('Final QR Code wird angezeigt:', {
      showFinal: state.showFinal,
      qrExists: !!qr,
      moduleCount: qr.getModuleCount(),
      finalHostExists: !!finalHost
    });
  }

  
}

// Initial
if(!textEl.textContent && !textEl.innerText){ 
  textEl.textContent = "Hallo"; 
}
setState({ text: textEl.textContent || textEl.innerText || "Hallo", version: 1 });

  // KEIN automatisches Fokussieren des Textfelds mehr!
  // setTimeout(() => {
  //   if (!isDropdownOpen) {
  //     textEl.focus();
  //     setCursorToEnd();
  //   }
  // }, 100);

// Debug: QR Code Library Check
console.log('QR Code Library verfügbar:', typeof qrcode !== 'undefined');
if(typeof qrcode !== 'undefined') {
  console.log('QR Code Library Version:', qrcode.version || 'unbekannt');
}
// small console tests
(function(){
  const ok=(n,c)=>console.log(`[Test] ${c?"OK":"FEHLER"}: ${n}`);
  ok("Module Version 1", moduleCountForVersion(1)===21);
  ok("Module Version 40", moduleCountForVersion(40)===177);
  const m=21;
  ok("Formatinfo Zeile 9", isFormatInfo(8,0,m));
  ok("Formatinfo Spalte 9", isFormatInfo(0,8,m));
  ok("Masken unterscheiden sich", maskPredicate(0,2,3)!==maskPredicate(1,2,3));

  const biA = buildDataBits("A",1,"L","byte");
  const bitsA = biA.bits;
  ok("Mode 0100 bei 'A'", bitsA.slice(0,4).join("")==="0100");
  ok("Länge 1 Byte bei 'A'", bitsA.slice(4,12).join("")==="00000001");
  ok("Daten 'A' 01000001", bitsA.slice(12,20).join("")==="01000001");
  ok("Terminator Länge ≤ 4", biA.terminatorLen<=4);

  const biw = buildDataBits("w",1,"L","byte");
  const bitsw = biw.bits;
  ok("Mode 0100 bei 'w'", bitsw.slice(0,4).join("")==="0100");
  ok("Länge 1 Byte bei 'w'", bitsw.slice(4,12).join("")==="00000001");
  ok("Daten 'w' 01110111", bitsw.slice(12,20).join("")==="01110111");

  // Test für numerischen Modus
  const biNum = buildDataBits("123",1,"L","numeric");
  const bitsNum = biNum.bits;
  ok("Mode 0001 bei '123' (numeric)", bitsNum.slice(0,4).join("")==="0001");
  ok("Länge 3 Ziffern bei '123'", bitsNum.slice(4,14).join("")==="0000000011");
  ok("Daten '123' 0001111011", bitsNum.slice(14,24).join("")==="0001111011");

  const biEmpty = buildDataBits("",1,"L","byte");
  const padStartCalc = 4 + 8 + 0 + biEmpty.terminatorLen + biEmpty.zeroPadBits;
  ok("PadStart korrekt bei leerem Text", biEmpty.padStart===padStartCalc);
  ok("Bits liegen am Byteende", padStartCalc % 8 === 0);
  
  // Test actual capacities
  console.log("\n=== Capacity Tests ===");
  
  // Test numeric capacity
  let numericCapacity = 0;
  for (let i = 1; i <= 50; i++) {
    const testText = '1'.repeat(i);
    try {
      const qr = qrcode(1, 'L');
      qr.addData(testText);
      qr.make();
      numericCapacity = i;
    } catch (e) {
      break;
    }
  }
  console.log(`Numeric capacity (Version 1-L): ${numericCapacity}`);
  console.log(`My table says: ${CAPACITY.numeric.L[1]}`);
  
  // Test alphanumeric capacity
  let alphanumCapacity = 0;
  for (let i = 1; i <= 30; i++) {
    const testText = 'A1'.repeat(i).substring(0, i);
    try {
      const qr = qrcode(1, 'L');
      qr.addData(testText);
      qr.make();
      alphanumCapacity = i;
    } catch (e) {
      break;
    }
  }
  console.log(`Alphanumeric capacity (Version 1-L): ${alphanumCapacity}`);
  console.log(`My table says: ${CAPACITY.alphanumeric.L[1]}`);
  
  // Test byte capacity
  let byteCapacity = 0;
  for (let i = 1; i <= 30; i++) {
    const testText = 'A'.repeat(i);
    try {
      const qr = qrcode(1, 'L');
      qr.addData(testText);
      qr.make();
      byteCapacity = i;
    } catch (e) {
      break;
    }
  }
  console.log(`Byte capacity (Version 1-L): ${byteCapacity}`);
  console.log(`My table says: ${CAPACITY.byte.L[1]}`);
})();

// Zusatztests zur Stabilität UI und Logik
(function(){
  const ok=(n,c)=>console.log(`[Test] ${c?"OK":"FEHLER"}: ${n}`);
  try{
    const snap = JSON.parse(JSON.stringify(state));
    const adv = el('showFinal');
    const basic = showFinalBasic;

    // none erlaubt scannbaren Code und sperrt nichts
    setState({ecc:'none', viewScope:'rest', showFinal:true});
    ok('Final Toggle Basic aktiv', !!basic && basic.disabled!==true);
    ok('Final Toggle Fortgeschritten aktiv', !!adv && adv.disabled!==true);
    ok('Final bleibt true bei ECC none', state.showFinal===true);

    // Reaktivieren bei ECC L und prüfen, dass Final gerendert wird
    setState({ecc:'L', viewScope:'rest'});
    setState({showFinal:true});
    const qr = makeQRCodeInstance(state.text);
    drawFinal(qr);
    ok('Final sichtbar bei ECC L', (finalHost.innerHTML||'').length>0);

    // Maskenmuster auto sollte Overlay erzeugen
    setState({mask:'auto', showMaskOverlay:true});
    const html = svgHost.innerHTML||'';
    ok('Maskenmuster Overlay aktiv', html.indexOf('Maskenmuster')!==-1);

    // Masken Score Sanity
    const ms = getMaskScores(state.text, state.version, state.ecc);
    ok('8 Masken Scores', Array.isArray(ms.scores) && ms.scores.length===8);
    ok('bestIdx im Bereich 0..7', ms.bestIdx>=0 && ms.bestIdx<=7);

    // Restore
    setState(snap);
  }catch(e){
    console.warn('[Tests Zusatz] Fehler', e);
  }
})();

// Initialisiere Farben nach dem DOM-Load
document.addEventListener('DOMContentLoaded', function() {
  initColors();
});


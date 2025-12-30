import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

export interface FlashcardData {
  front: string;
  back: string;
  hint?: string;
}

export interface ParsedFlashcardDocument {
  title: string;
  cards: FlashcardData[];
}

export async function parseFlashcardWordFile(filePath: string): Promise<ParsedFlashcardDocument> {
  try {
    let absolutePath: string;
    
    // Handle different path formats
    if (filePath.startsWith('/Users/')) {
      // Absolute path - use as is
      absolutePath = filePath;
    } else if (filePath.startsWith('/material/')) {
      // Relative path from material directory
      absolutePath = path.join(process.cwd(), '..', filePath.replace('/material/', 'material/'));
    } else {
      // Fallback: assume it's relative to material directory
      absolutePath = path.join(process.cwd(), '..', 'material', filePath);
    }
    
    console.log('Parsing flashcard file at:', absolutePath);
    
    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Datei nicht gefunden: ${absolutePath}`);
    }
    
    let text: string;
    
    // Check file extension
    const ext = path.extname(absolutePath).toLowerCase();
    
    if (ext === '.docx' || ext === '.doc') {
      // Read Word document
      const result = await mammoth.extractRawText({ path: absolutePath });
      text = result.value;
    } else if (ext === '.txt' || ext === '.md') {
      // Read text file or markdown file
      text = fs.readFileSync(absolutePath, 'utf-8');
      // No conversion needed - the parser will detect markdown format automatically
    } else {
      throw new Error('Nicht unterstütztes Dateiformat. Nur .docx, .doc, .txt und .md Dateien werden unterstützt.');
    }
    
    console.log('Extracted text:', text);
    
    // Parse the text according to the schema
    const parsedDocument = parseFlashcardText(text);
    
    console.log('Parsed flashcard document:', parsedDocument);
    
    return parsedDocument;
  } catch (error) {
    console.error('Error parsing flashcard file:', error);
    throw new Error(`Fehler beim Parsen der Karteikarten-Datei: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function parseFlashcardText(text: string): ParsedFlashcardDocument {
  const allLines = text.split('\n');
  
  if (allLines.length === 0) {
    throw new Error('Die Datei ist leer oder konnte nicht gelesen werden.');
  }
  
  // Extract title from first non-empty line (usually the main heading)
  let firstLine = '';
  for (const line of allLines) {
    if (line.trim().length > 0) {
      firstLine = line.trim();
      break;
    }
  }
  const title = extractTitle(firstLine);
  
  // Try to detect the format and parse accordingly
  // For markdown format, pass original lines to preserve formatting
  const cards = detectAndParseFormat(allLines);
  
  if (cards.length === 0) {
    throw new Error('Keine Karteikarten in der Datei gefunden. Bitte überprüfen Sie das Format.');
  }
  
  return {
    title,
    cards
  };
}

function extractTitle(firstLine: string): string {
  // Remove common heading markers and clean up
  let title = firstLine
    .replace(/^[#\s]+/, '') // Remove leading # and spaces
    .replace(/^[0-9]+\.\s*/, '') // Remove leading numbers like "1. "
    .replace(/^[A-Z]+\s*/, '') // Remove leading uppercase words like "KAPITEL "
    .trim();
  
  // If title is empty, use a default
  if (!title) {
    title = 'Neues Karteikarten-Deck';
  }
  
  return title;
}

function detectAndParseFormat(lines: string[]): FlashcardData[] {
  // Try to detect markdown format (## headings followed by content)
  if (detectMarkdownFormat(lines)) {
    console.log('Detected markdown format');
    return parseMarkdownFormat(lines);
  }
  
  // Try to detect table format first (most common)
  if (detectTableFormat(lines)) {
    console.log('Detected table format');
    return parseTableFormat(lines);
  }
  
  // Try to detect alternating format
  if (detectAlternatingFormat(lines)) {
    console.log('Detected alternating format');
    return parseAlternatingFormat(lines);
  }
  
  // Fallback: try to parse as generic format
  console.log('Using generic format parsing');
  return parseGenericFormat(lines);
}

function detectTableFormat(lines: string[]): boolean {
  // Look for patterns that suggest table format
  // Usually has consistent separators like tabs, multiple spaces, or | characters
  let nonEmptyCount = 0;
  let tableIndicators = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      nonEmptyCount++;
      if (line.includes('\t') || 
          line.match(/\s{3,}/) || 
          line.includes('|') ||
          line.match(/^.+?\s{2,}.+$/)) {
        tableIndicators++;
      }
    }
  }
  
  return nonEmptyCount > 0 && tableIndicators > nonEmptyCount * 0.3; // At least 30% of non-empty lines look like table rows
}

function parseTableFormat(lines: string[]): FlashcardData[] {
  const cards: FlashcardData[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    
    // Split by tabs, multiple spaces, or | character
    const parts = line.split(/\t|\s{3,}|\|/).map(part => part.trim()).filter(part => part.length > 0);
    
    if (parts.length >= 2) {
      const front = parts[0];
      const back = parts[1];
      const hint = parts[2]; // Optional third column for hints
      
      if (front && back && front !== back) {
        cards.push({
          front,
          back,
          hint: hint || undefined
        });
      }
    }
  }
  
  return cards;
}

function detectAlternatingFormat(lines: string[]): boolean {
  // Look for patterns like "Frage:", "Antwort:", "Q:", "A:", etc.
  let nonEmptyCount = 0;
  let questionIndicators = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      nonEmptyCount++;
      const lower = trimmed.toLowerCase();
      if (lower.match(/^(frage|question|q|f):\s*/) ||
          lower.match(/^(antwort|answer|a|ant):\s*/)) {
        questionIndicators++;
      }
    }
  }
  
  return nonEmptyCount > 0 && questionIndicators > nonEmptyCount * 0.4; // At least 40% of non-empty lines have question/answer indicators
}

function parseAlternatingFormat(lines: string[]): FlashcardData[] {
  const cards: FlashcardData[] = [];
  let currentCard: Partial<FlashcardData> = {};
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.startsWith('frage:') || lowerLine.startsWith('question:') || lowerLine.startsWith('q:')) {
      // Save previous card if complete
      if (currentCard.front && currentCard.back) {
        cards.push(currentCard as FlashcardData);
      }
      
      // Start new card
      currentCard = {
        front: line.substring(line.indexOf(':') + 1).trim()
      };
    } else if (lowerLine.startsWith('antwort:') || lowerLine.startsWith('answer:') || lowerLine.startsWith('a:')) {
      currentCard.back = line.substring(line.indexOf(':') + 1).trim();
    } else if (lowerLine.startsWith('tipp:') || lowerLine.startsWith('hint:') || lowerLine.startsWith('t:')) {
      currentCard.hint = line.substring(line.indexOf(':') + 1).trim();
    } else if (currentCard.front && !currentCard.back) {
      // If we have a question but no answer yet, this line might be the answer
      currentCard.back = line;
    } else if (currentCard.front && currentCard.back) {
      // If we have both question and answer, this might be additional info for the answer
      currentCard.back += '\n' + line;
    }
  }
  
  // Add the last card if complete
  if (currentCard.front && currentCard.back) {
    cards.push(currentCard as FlashcardData);
  }
  
  return cards;
}

function detectMarkdownFormat(lines: string[]): boolean {
  // Check if we have ## headings (markdown format)
  for (const line of lines) {
    if (line.trim().startsWith('## ')) {
      return true;
    }
  }
  return false;
}

function parseMarkdownFormat(lines: string[]): FlashcardData[] {
  const cards: FlashcardData[] = [];
  let currentFront = '';
  let currentBack: string[] = [];
  let insideCard = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines (but preserve them in content)
    if (trimmedLine.length === 0) {
      if (insideCard && currentFront) {
        // Add empty line to back content to preserve formatting
        currentBack.push('');
      }
      continue;
    }
    
    // Skip main title (# heading, not ##)
    if (trimmedLine.startsWith('# ') && !trimmedLine.startsWith('## ')) {
      continue;
    }
    
    // Stop at summary sections
    if (trimmedLine.includes('Zusammenfassung')) {
      break;
    }
    
    // Check for section headers (## headings) - these become card fronts
    if (trimmedLine.startsWith('## ')) {
      // Save previous card before starting a new one
      if (insideCard && currentFront && currentBack.length > 0) {
        // Join back content and trim trailing empty lines
        const backContent = currentBack.join('\n').replace(/\n+$/, '');
        cards.push({
          front: currentFront,
          back: backContent
        });
      }
      
      // Extract section title (remove emoji and clean up) - this becomes the front
      currentFront = trimmedLine
        .replace(/^##\s+/, '')
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Remove emojis
        .trim();
      currentBack = [];
      insideCard = true;
      continue;
    }
    
    // Skip separator lines (---) - they just mark boundaries
    if (trimmedLine === '---') {
      continue;
    }
    
    // Collect content for the back (all lines between ## headings)
    if (insideCard && currentFront) {
      currentBack.push(line);
    }
  }
  
  // Save the last card if we have one
  if (insideCard && currentFront && currentBack.length > 0) {
    const backContent = currentBack.join('\n').replace(/\n+$/, '');
    cards.push({
      front: currentFront,
      back: backContent
    });
  }
  
  return cards;
}

function parseGenericFormat(lines: string[]): FlashcardData[] {
  const cards: FlashcardData[] = [];
  let currentCard: Partial<FlashcardData> = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines and common headers
    if (trimmed.length === 0 || trimmed.toLowerCase().match(/^(kapitel|chapter|abschnitt|section|teil|part)/)) {
      continue;
    }
    
    // If we don't have a question yet, this line becomes the question
    if (!currentCard.front) {
      currentCard.front = trimmed;
    } else if (!currentCard.back) {
      // If we have a question but no answer, this line becomes the answer
      currentCard.back = trimmed;
      
      // Create the card
      cards.push({
        front: currentCard.front,
        back: currentCard.back
      });
      
      // Reset for next card
      currentCard = {};
    }
  }
  
  return cards;
}

/**
 * Converts Markdown format to a format that the flashcard parser can understand
 * Handles the specific format used for geometry flashcards with ## headings as card fronts
 */
function convertMarkdownToFlashcardFormat(markdownText: string): string {
  const lines = markdownText.split('\n');
  const output: string[] = [];
  
  // Find the title (first # heading)
  let titleFound = false;
  let currentFront = '';
  let currentBack: string[] = [];
  let inSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Extract title from first # heading
    if (!titleFound && trimmedLine.startsWith('# ')) {
      const title = trimmedLine.replace(/^#\s+/, '').replace(/\s*Karteikarten:\s*/, '');
      output.push(title);
      titleFound = true;
      continue;
    }
    
    // Skip main title line and separator lines
    if (trimmedLine === '---' || (!titleFound && trimmedLine.startsWith('#'))) {
      continue;
    }
    
    // Skip summary sections
    if (trimmedLine.includes('Zusammenfassung')) {
      break;
    }
    
    // Check for section headers (## headings) - these become card fronts
    if (trimmedLine.startsWith('## ')) {
      // Save previous card if we have one
      if (currentFront && currentBack.length > 0) {
        output.push(''); // Empty line between cards for generic format parser
        output.push(currentFront);
        output.push(currentBack.join('\n'));
        currentFront = '';
        currentBack = [];
      }
      
      // Extract section title (remove emoji and clean up) - this becomes the front
      currentFront = trimmedLine
        .replace(/^##\s+/, '')
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Remove emojis
        .trim();
      inSection = true;
      continue;
    }
    
    // If we're in a section, collect content for the back
    if (inSection && currentFront) {
      // Skip empty lines at the start of content
      if (!trimmedLine && currentBack.length === 0) {
        continue;
      }
      
      // Stop at separator
      if (trimmedLine === '---') {
        continue;
      }
      
      // Add content to back (keep original line for formatting)
      if (line || currentBack.length > 0) {
        currentBack.push(line);
      }
    }
  }
  
  // Add the last card if we have one
  if (currentFront && currentBack.length > 0) {
    output.push(''); // Empty line
    output.push(currentFront);
    output.push(currentBack.join('\n'));
  }
  
  return output.join('\n');
}

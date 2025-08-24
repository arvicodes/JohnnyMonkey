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
    } else if (ext === '.txt') {
      // Read text file
      text = fs.readFileSync(absolutePath, 'utf-8');
    } else {
      throw new Error('Nicht unterstütztes Dateiformat. Nur .docx, .doc und .txt Dateien werden unterstützt.');
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
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length === 0) {
    throw new Error('Die Datei ist leer oder konnte nicht gelesen werden.');
  }
  
  // Extract title from first line (usually the main heading)
  const title = extractTitle(lines[0]);
  
  // Try to detect the format and parse accordingly
  const cards = detectAndParseFormat(lines.slice(1));
  
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
  const tableIndicators = lines.filter(line => 
    line.includes('\t') || 
    line.match(/\s{3,}/) || 
    line.includes('|') ||
    line.match(/^.+?\s{2,}.+$/)
  );
  
  return tableIndicators.length > lines.length * 0.3; // At least 30% of lines look like table rows
}

function parseTableFormat(lines: string[]): FlashcardData[] {
  const cards: FlashcardData[] = [];
  
  for (const line of lines) {
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
  const questionIndicators = lines.filter(line => 
    line.toLowerCase().match(/^(frage|question|q|f):\s*/) ||
    line.toLowerCase().match(/^(antwort|answer|a|ant):\s*/)
  );
  
  return questionIndicators.length > lines.length * 0.4; // At least 40% of lines have question/answer indicators
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

function parseGenericFormat(lines: string[]): FlashcardData[] {
  const cards: FlashcardData[] = [];
  let currentCard: Partial<FlashcardData> = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines and common headers
    if (!line || line.toLowerCase().match(/^(kapitel|chapter|abschnitt|section|teil|part)/)) {
      continue;
    }
    
    // If we don't have a question yet, this line becomes the question
    if (!currentCard.front) {
      currentCard.front = line;
    } else if (!currentCard.back) {
      // If we have a question but no answer, this line becomes the answer
      currentCard.back = line;
      
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

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface FlashcardData {
  title: string;
  front: string;
  back: string;
}

function parseMarkdownFile(filePath: string): FlashcardData[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const cards: FlashcardData[] = [];
  
  // Split by sections (## headings)
  const sections = content.split(/^##\s+/m).filter(section => section.trim());
  
  for (const section of sections) {
    const lines = section.split('\n');
    const titleLine = lines[0].trim();
    
    // Skip the main title and summary sections
    if (titleLine.includes('Karteikarten:') || titleLine.includes('Zusammenfassung')) {
      continue;
    }
    
    // Extract title (remove emoji and any problematic UTF-16 surrogates)
    let title = titleLine.trim();
    
    // Remove emoji characters at the start (using common emoji ranges)
    title = title.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+\s*/u, '').trim();
    
    // Front side: just the clean title
    const front = title;
    
    // Back side: all content (definition + properties + grafik)
    let back = '';
    let inGrafikSection = false;
    
    // Process the content (skip title line)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Stop at separator
      if (line.trim() === '---') {
        break;
      }
      
      // Add all content to back (including Grafik section)
      back += line + '\n';
    }
    
    // Clean up back content
    back = back.trim();
    
    // If we have content, create the card
    if (front && back) {
      cards.push({
        title,
        front,
        back
      });
    }
  }
  
  return cards;
}

async function createGeometrieDeck() {
  try {
    console.log('🔄 Erstelle Geometrie Grundbegriffe Deck...');
    
    // Finde den ersten Lehrer
    const teacher = await prisma.user.findFirst({
      where: {
        role: 'TEACHER'
      }
    });
    
    if (!teacher) {
      console.error('❌ Kein Lehrer in der Datenbank gefunden');
      return;
    }
    
    console.log(`✅ Lehrer gefunden: ${teacher.name} (ID: ${teacher.id})`);
    
    // Finde Subject "Klasse 7 > Karteikarten"
    let subject = await prisma.subject.findFirst({
      where: {
        name: 'Klasse 7 > Karteikarten',
        teacherId: teacher.id
      }
    });
    
    if (!subject) {
      console.log('📁 Subject "Klasse 7 > Karteikarten" nicht gefunden, erstelle es...');
      subject = await prisma.subject.create({
        data: {
          name: 'Klasse 7 > Karteikarten',
          description: 'Karteikarten für Klasse 7',
          teacherId: teacher.id,
          order: 0
        }
      });
      console.log(`✅ Subject "Klasse 7 > Karteikarten" erstellt (ID: ${subject.id})`);
    } else {
      console.log(`✅ Subject "Klasse 7 > Karteikarten" gefunden (ID: ${subject.id})`);
    }
    
    // Prüfe ob das Deck bereits existiert
    const existingDeck = await prisma.flashcardDeck.findFirst({
      where: {
        title: 'Geometrie Grundbegriffe',
        teacherId: teacher.id
      },
      include: {
        cards: true
      }
    });
    
    if (existingDeck) {
      console.log('⚠️  Deck "Geometrie Grundbegriffe" existiert bereits (ID: ' + existingDeck.id + ')');
      console.log(`   Aktuell ${existingDeck.cards.length} Karteikarten vorhanden`);
      console.log('   Lösche altes Deck und erstelle es neu...');
      
      // Delete all cards first
      await prisma.flashcard.deleteMany({
        where: { deckId: existingDeck.id }
      });
      
      // Delete the deck
      await prisma.flashcardDeck.delete({
        where: { id: existingDeck.id }
      });
      
      console.log('   ✅ Altes Deck gelöscht');
    }
    
    // Parse Markdown file
    const markdownPath = path.join(
      __dirname,
      '../../J-M-Reihen/Mathe/Klasse 7/Karteikarten/karteikarten-geometrische-abbildungen.md'
    );
    
    if (!fs.existsSync(markdownPath)) {
      console.error(`❌ Markdown-Datei nicht gefunden: ${markdownPath}`);
      return;
    }
    
    console.log(`📖 Lese Markdown-Datei: ${markdownPath}`);
    const cards = parseMarkdownFile(markdownPath);
    console.log(`✅ ${cards.length} Karteikarten gefunden`);
    
    // Create the deck
    const deck = await prisma.flashcardDeck.create({
      data: {
        title: 'Geometrie Grundbegriffe',
        description: 'Karteikarten zu den wichtigsten geometrischen Abbildungen (Kapitel 3)',
        teacherId: teacher.id,
        subjectId: subject.id,
        isPublic: false
      }
    });
    
    console.log(`✅ Deck erstellt (ID: ${deck.id})`);
    
    // Create flashcards
    console.log('🔄 Erstelle Karteikarten...');
    const createdCards = [];
    
    for (let index = 0; index < cards.length; index++) {
      const card = cards[index];
      
      // Clean and normalize strings to handle UTF-8 encoding properly
      // Remove any broken UTF-16 surrogate pairs
      let front = card.front.replace(/[\uD800-\uDFFF]/g, '').normalize('NFKC').trim();
      let back = card.back.replace(/[\uD800-\uDFFF]/g, '').normalize('NFKC').trim();
      
      if (!front || !back) {
        console.warn(`⚠️  Karteikarte ${index + 1} übersprungen: leerer Inhalt`);
        continue;
      }
      
      const createdCard = await prisma.flashcard.create({
        data: {
          deckId: deck.id,
          front: front,
          back: back,
          hint: null,
          difficulty: 1,
          order: index
        }
      });
      
      createdCards.push(createdCard);
    }
    
    console.log(`✅ ${createdCards.length} Karteikarten erfolgreich erstellt`);
    console.log('✨ Deck "Geometrie Grundbegriffe" ist fertig!');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createGeometrieDeck();


import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  Download, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

// Interfaces
interface Flashcard {
  id?: string;
  front: string;
  back: string;
  hint?: string;
  difficulty: number;
  order: number;
}

interface FlashcardDeck {
  id?: string;
  title: string;
  description?: string;
  subjectId?: string;
  isPublic: boolean;
  cards: Flashcard[];
}

interface ImportedDeck {
  title: string;
  description?: string;
  cards: Flashcard[];
}

interface FlashcardImportExportProps {
  onImport?: (deck: ImportedDeck) => void;
  onExport?: (deck: FlashcardDeck) => void;
  existingDeck?: FlashcardDeck;
}

export const FlashcardImportExport: React.FC<FlashcardImportExportProps> = ({
  onImport,
  onExport,
  existingDeck
}) => {
  const [importedDeck, setImportedDeck] = useState<ImportedDeck | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Export function to Word document
  const exportToWord = async (deck: FlashcardDeck) => {
    if (!deck || deck.cards.length === 0) {
      setError('Kein Deck oder keine Karten zum Exportieren vorhanden.');
      return;
    }

    setIsExporting(true);
    setError(null);
    setSuccess(null);

    try {
      // Create Word document structure
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Title
            new Paragraph({
              text: deck.title,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            
            // Description if available
            ...(deck.description ? [
              new Paragraph({
                text: deck.description,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
              })
            ] : []),
            
            // Cards table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                // Header row
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: 'Vorderseite', heading: HeadingLevel.HEADING_2 })],
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      shading: { fill: 'E7E6E6' }
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Rückseite', heading: HeadingLevel.HEADING_2 })],
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      shading: { fill: 'E7E6E6' }
                    })
                  ]
                }),
                // Card rows
                ...deck.cards.map((card, index) => 
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({ text: `Karte ${index + 1}:`, heading: HeadingLevel.HEADING_3 }),
                          new Paragraph({ text: card.front }),
                                                     ...(card.hint ? [new Paragraph({ 
                             children: [new TextRun({ text: `Tipp: ${card.hint}`, color: '666666' })]
                           })] : []),
                           new Paragraph({ 
                             children: [new TextRun({ text: `Schwierigkeit: ${card.difficulty}/5`, color: '666666' })]
                           })
                        ],
                        width: { size: 50, type: WidthType.PERCENTAGE }
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({ text: card.back }),
                        ],
                        width: { size: 50, type: WidthType.PERCENTAGE }
                      })
                    ]
                  })
                )
              ]
            })
          ]
        }]
      });

      // Generate and save the document
      const blob = await Packer.toBlob(doc);
      const fileName = `${deck.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_karteideck.docx`;
      saveAs(blob, fileName);

      setSuccess(`Deck "${deck.title}" erfolgreich als Word-Dokument exportiert!`);
      onExport?.(deck);

    } catch (err) {
      console.error('Export error:', err);
      setError('Fehler beim Exportieren des Decks. Bitte versuchen Sie es erneut.');
    } finally {
      setIsExporting(false);
    }
  };

  // Import function from Word document
  const importFromWord = async (file: File) => {
    if (!file) return;

    setIsImporting(true);
    setError(null);
    setSuccess(null);

    try {
      // For now, we'll use a simple text-based approach
      // In a real implementation, you'd parse the .docx file properly
      const text = await file.text();
      
      // Simple parsing logic - this is a basic implementation
      // In production, you'd want to use a proper .docx parser
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 3) {
        throw new Error('Die Datei scheint kein gültiges Karteideck zu enthalten.');
      }

      // Try to extract title and cards
      const title = lines[0].trim();
      const cards: Flashcard[] = [];
      
      let currentCard: Partial<Flashcard> = {};
      let cardIndex = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.toLowerCase().includes('karte') || line.toLowerCase().includes('card')) {
          // Save previous card if exists
          if (currentCard.front && currentCard.back) {
            cards.push({
              ...currentCard,
              difficulty: currentCard.difficulty || 1,
              order: cards.length
            } as Flashcard);
          }
          
          // Start new card
          currentCard = { difficulty: 1, order: cards.length };
          cardIndex++;
        } else if (line && !line.toLowerCase().includes('tipp:') && !line.toLowerCase().includes('hint:')) {
          if (!currentCard.front) {
            currentCard.front = line;
          } else if (!currentCard.back) {
            currentCard.back = line;
          }
        } else if (line.toLowerCase().includes('tipp:') || line.toLowerCase().includes('hint:')) {
          const hintText = line.split(':')[1]?.trim() || '';
          if (hintText) {
            currentCard.hint = hintText;
          }
        }
      }

      // Add last card
      if (currentCard.front && currentCard.back) {
        cards.push({
          ...currentCard,
          difficulty: currentCard.difficulty || 1,
          order: cards.length
        } as Flashcard);
      }

      if (cards.length === 0) {
        throw new Error('Keine Karten in der Datei gefunden. Bitte überprüfen Sie das Format.');
      }

      const deck: ImportedDeck = {
        title,
        description: `Importiert aus ${file.name} - ${cards.length} Karten`,
        cards
      };

      setImportedDeck(deck);
      setSuccess(`${cards.length} Karten erfolgreich importiert!`);
      onImport?.(deck);

    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Importieren der Datei.');
    } finally {
      setIsImporting(false);
    }
  };

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.docx') || file.name.endsWith('.txt')) {
        importFromWord(file);
      } else {
        setError('Bitte wählen Sie eine .docx oder .txt Datei aus.');
      }
    }
    // Reset file input
    event.target.value = '';
  };

  // Clear imported deck
  const clearImportedDeck = () => {
    setImportedDeck(null);
    setError(null);
    setSuccess(null);
  };

  // Add card to imported deck
  const addCardToImportedDeck = () => {
    if (!importedDeck) return;

    const newCard: Flashcard = {
      front: '',
      back: '',
      hint: '',
      difficulty: 1,
      order: importedDeck.cards.length
    };

    setImportedDeck({
      ...importedDeck,
      cards: [...importedDeck.cards, newCard]
    });
  };

  // Update card in imported deck
  const updateCardInImportedDeck = (index: number, field: keyof Flashcard, value: any) => {
    if (!importedDeck) return;

    const updatedCards = [...importedDeck.cards];
    updatedCards[index] = { ...updatedCards[index], [field]: value };

    setImportedDeck({
      ...importedDeck,
      cards: updatedCards
    });
  };

  // Remove card from imported deck
  const removeCardFromImportedDeck = (index: number) => {
    if (!importedDeck) return;

    const updatedCards = importedDeck.cards.filter((_, i) => i !== index);
    const reorderedCards = updatedCards.map((card, i) => ({
      ...card,
      order: i
    }));

    setImportedDeck({
      ...importedDeck,
      cards: reorderedCards
    });
  };

  return (
    <div className="space-y-6">
      {/* Export Section */}
      {existingDeck && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Deck exportieren
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Exportieren Sie das aktuelle Deck als Word-Dokument (.docx)
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FileText className="w-4 h-4" />
                  <span>{existingDeck.title}</span>
                  <Badge variant="outline">{existingDeck.cards.length} Karten</Badge>
                </div>
              </div>
              
              <Button 
                onClick={() => exportToWord(existingDeck)}
                disabled={isExporting || existingDeck.cards.length === 0}
                className="w-full"
              >
                {isExporting ? (
                  <>Exportiere...</>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Als Word-Dokument exportieren
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Deck importieren
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-file" className="block mb-2">
                Word-Dokument oder Text-Datei auswählen
              </Label>
              <Input
                id="import-file"
                type="file"
                accept=".docx,.txt"
                onChange={handleFileChange}
                disabled={isImporting}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Unterstützte Formate: .docx, .txt
              </p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">{error}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-700">{success}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSuccess(null)}
                  className="ml-auto text-green-500 hover:text-green-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Imported Deck Preview */}
            {importedDeck && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{importedDeck.title}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearImportedDeck}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {importedDeck.description && (
                  <p className="text-gray-600 mb-4">{importedDeck.description}</p>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Karten ({importedDeck.cards.length})</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addCardToImportedDeck}
                      className="text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Karte hinzufügen
                    </Button>
                  </div>

                  {importedDeck.cards.map((card, index) => (
                    <div key={index} className="border rounded p-3 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-medium">Vorderseite</Label>
                          <Input
                            value={card.front}
                            onChange={(e) => updateCardInImportedDeck(index, 'front', e.target.value)}
                            placeholder="Frage oder Begriff"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Rückseite</Label>
                          <Input
                            value={card.back}
                            onChange={(e) => updateCardInImportedDeck(index, 'back', e.target.value)}
                            placeholder="Antwort oder Definition"
                            className="text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                        <div>
                          <Label className="text-xs font-medium">Tipp (optional)</Label>
                          <Input
                            value={card.hint || ''}
                            onChange={(e) => updateCardInImportedDeck(index, 'hint', e.target.value)}
                            placeholder="Hilfreicher Tipp"
                            className="text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Label className="text-xs font-medium">Schwierigkeit</Label>
                            <select
                              value={card.difficulty}
                              onChange={(e) => updateCardInImportedDeck(index, 'difficulty', parseInt(e.target.value))}
                              className="w-full text-sm border rounded px-2 py-1"
                            >
                              <option value={1}>1 - Sehr einfach</option>
                              <option value={2}>2 - Einfach</option>
                              <option value={3}>3 - Mittel</option>
                              <option value={4}>4 - Schwer</option>
                              <option value={5}>5 - Sehr schwer</option>
                            </select>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCardFromImportedDeck(index)}
                            className="text-red-500 hover:text-red-700"
                            title="Karte entfernen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <Button 
                    onClick={() => onImport?.(importedDeck)}
                    className="w-full"
                    disabled={importedDeck.cards.length === 0}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Import bestätigen
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

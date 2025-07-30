import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

interface QuizQuestion {
  question: string;
  correctAnswer: string;
  options: string[];
}

export async function parseWordFile(filePath: string): Promise<QuizQuestion[]> {
  try {
    // Convert relative path to absolute path
    const absolutePath = path.join(__dirname, '../../../', filePath.replace('/material/', 'material/'));
    
    console.log('Parsing file at:', absolutePath);
    
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
    const questions = parseQuizText(text);
    
    console.log('Parsed questions:', questions);
    
    return questions;
  } catch (error) {
    console.error('Error parsing file:', error);
    throw new Error('Fehler beim Parsen der Datei');
  }
}

function parseQuizText(text: string): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let currentQuestion: Partial<QuizQuestion> | null = null;
  let currentOptions: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line starts a new question (bullet point)
    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line)) {
      // Save previous question if exists
      if (currentQuestion && currentQuestion.question && currentOptions.length > 0) {
        questions.push({
          question: currentQuestion.question,
          correctAnswer: currentOptions[0], // First answer is always correct
          options: currentOptions
        });
      }
      
      // Start new question
      currentQuestion = {
        question: line.replace(/^[•\-*\d\.\s]+/, '').trim()
      };
      currentOptions = [];
    }
    // Check if this line is an answer option (a), b), c), etc.)
    else if (/^[a-z]\)/.test(line.toLowerCase())) {
      const option = line.replace(/^[a-z]\)\s*/, '').trim();
      if (option.length > 0) {
        currentOptions.push(option);
      }
    }
    // If it's not a bullet point or answer option, it might be part of the question
    else if (currentQuestion && currentQuestion.question && !currentQuestion.question.includes(line)) {
      currentQuestion.question += ' ' + line;
    }
  }
  
  // Don't forget the last question
  if (currentQuestion && currentQuestion.question && currentOptions.length > 0) {
    questions.push({
      question: currentQuestion.question,
      correctAnswer: currentOptions[0], // First answer is always correct
      options: currentOptions
    });
  }
  
  return questions;
} 
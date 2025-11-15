const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const adventDoors = [
  {
    day: 1,
    funFact: "Wusstest du, dass eine Schneeflocke immer sechs Arme hat? Jede Schneeflocke ist einzigartig, aber alle haben sechs Ecken!",
    question: "Wenn du 3 Schneeflocken hast und jede hat 6 Arme, wie viele Arme haben alle zusammen?",
    correctAnswer: "18",
    explanation: "3 Schneeflocken × 6 Arme = 18 Arme. Jede Schneeflocke hat genau 6 Arme, weil Wassermoleküle sich zu sechseckigen Kristallen formen."
  },
  {
    day: 2,
    funFact: "Pinguine können nicht fliegen, aber sie sind super Schwimmer! Sie können bis zu 20 km/h schnell schwimmen.",
    question: "Ein Pinguin schwimmt 20 km/h. Wenn er 2 Stunden lang schwimmt, wie viele Kilometer legt er zurück?",
    correctAnswer: "40",
    explanation: "20 km/h × 2 Stunden = 40 Kilometer. Pinguine nutzen ihre Flügel wie Paddel und sind fantastische Schwimmer!"
  },
  {
    day: 3,
    funFact: "Die Erde dreht sich einmal am Tag um sich selbst. Das ist der Grund, warum wir Tag und Nacht haben!",
    question: "Ein Tag hat 24 Stunden. Wie viele Stunden hat eine Woche?",
    correctAnswer: "168",
    explanation: "24 Stunden × 7 Tage = 168 Stunden. Die Erde braucht genau 24 Stunden für eine Umdrehung, und eine Woche hat 7 Tage."
  },
  {
    day: 4,
    funFact: "Bienen summen, weil ihre Flügel sehr schnell schlagen - bis zu 200 Mal pro Sekunde! Das erzeugt das Summ-Geräusch.",
    question: "Eine Biene hat 6 Beine. Wenn 4 Bienen zusammen sind, wie viele Beine haben sie insgesamt?",
    correctAnswer: "24",
    explanation: "4 Bienen × 6 Beine = 24 Beine. Bienen nutzen ihre Beine zum Sammeln von Pollen und zum Transport zum Bienenstock."
  },
  {
    day: 5,
    funFact: "Ein Regenbogen entsteht, wenn Sonnenlicht auf Wassertropfen trifft. Das Licht wird in alle Farben des Regenbogens aufgeteilt!",
    question: "Ein Regenbogen hat 7 Farben. Wenn du die ersten 3 Farben (Rot, Orange, Gelb) und die letzten 2 Farben (Indigo, Violett) zählst, wie viele Farben sind das zusammen?",
    correctAnswer: "5",
    explanation: "3 Farben (Rot, Orange, Gelb) + 2 Farben (Indigo, Violett) = 5 Farben. Die 7 Regenbogenfarben sind: Rot, Orange, Gelb, Grün, Blau, Indigo, Violett."
  },
  {
    day: 6,
    funFact: "Delfine sind sehr schlaue Tiere! Sie können sich selbst im Spiegel erkennen und haben sogar Namen für sich selbst.",
    question: "Ein Delfin hat 4 Flossen. Wenn 3 Delfine zusammen schwimmen, wie viele Flossen siehst du insgesamt?",
    correctAnswer: "12",
    explanation: "3 Delfine × 4 Flossen = 12 Flossen. Jeder Delfin hat eine Rückenflosse, zwei Brustflossen und eine Schwanzflosse."
  },
  {
    day: 7,
    funFact: "Die Sonne ist eigentlich ein Stern! Sie ist der uns am nächsten gelegene Stern und gibt uns Licht und Wärme.",
    question: "In unserem Sonnensystem gibt es 8 Planeten. Wenn 3 Planeten Gasplaneten sind (Jupiter, Saturn, Uranus) und der Rest Gesteinsplaneten, wie viele Gesteinsplaneten gibt es?",
    correctAnswer: "5",
    explanation: "8 Planeten - 3 Gasplaneten = 5 Gesteinsplaneten. Die Gesteinsplaneten sind: Merkur, Venus, Erde, Mars und Neptun (manchmal auch als Eisriese bezeichnet)."
  },
  {
    day: 8,
    funFact: "Schnecken können bis zu 3 Jahre alt werden! Sie haben ein Haus auf dem Rücken, in das sie sich zurückziehen können.",
    question: "Eine Schnecke ist 2 Jahre alt. Sie wird noch 1 Jahr älter, dann lebt sie noch 2 weitere Jahre. Wie alt wird sie insgesamt?",
    correctAnswer: "5",
    explanation: "2 Jahre + 1 Jahr + 2 Jahre = 5 Jahre. Schnecken können tatsächlich bis zu 3 Jahre alt werden, manche sogar länger!"
  },
  {
    day: 9,
    funFact: "Ein Elefant kann bis zu 5 Liter Wasser mit seinem Rüssel auf einmal trinken! Der Rüssel ist wie eine Super-Nase und ein Super-Arm in einem.",
    question: "Ein Elefant trinkt 5 Liter Wasser. Wenn er das 3 Mal am Tag macht, wie viele Liter trinkt er insgesamt?",
    correctAnswer: "15",
    explanation: "5 Liter × 3 = 15 Liter. Elefanten brauchen viel Wasser - bis zu 200 Liter am Tag! Der Rüssel kann bis zu 5 Liter auf einmal aufnehmen."
  },
  {
    day: 10,
    funFact: "Schmetterlinge schmecken mit ihren Füßen! Sie können damit erkennen, ob eine Pflanze essbar ist, bevor sie ihre Eier darauf legen.",
    question: "Ein Schmetterling hat 6 Beine. Wenn 5 Schmetterlinge auf einer Blume sitzen, wie viele Beine sind das zusammen?",
    correctAnswer: "30",
    explanation: "5 Schmetterlinge × 6 Beine = 30 Beine. Schmetterlinge nutzen ihre Beine nicht nur zum Laufen, sondern auch zum Schmecken!"
  },
  {
    day: 11,
    funFact: "Ein Giraffenhals ist so lang, dass eine Giraffe bis zu 6 Meter hoch werden kann! Das ist so hoch wie ein zweistöckiges Haus.",
    question: "Eine Giraffe ist 6 Meter hoch. Wenn ein Stockwerk eines Hauses 3 Meter hoch ist, wie viele Stockwerke entspricht das?",
    correctAnswer: "2",
    explanation: "6 Meter ÷ 3 Meter = 2 Stockwerke. Giraffen haben genau 7 Halswirbel wie Menschen, aber ihre Wirbel sind viel länger - jeder über 25 cm!"
  },
  {
    day: 12,
    funFact: "Weihnachtsbäume werden oft Tannenbäume genannt, aber die meisten sind eigentlich Fichten! Echte Tannen haben weiche, flache Nadeln.",
    question: "Ein Schneeflocken-Stern hat 6 Seiten. Wenn du 4 solche Sterne zeichnest, wie viele Seiten haben sie zusammen?",
    correctAnswer: "24",
    explanation: "4 Sterne × 6 Seiten = 24 Seiten. Jede Schneeflocke hat 6 Arme, weil Wassermoleküle sich zu sechseckigen Kristallen formen."
  },
  {
    day: 13,
    funFact: "Polarbären haben schwarze Haut unter ihrem weißen Fell! Das hilft ihnen, Wärme von der Sonne zu speichern.",
    question: "Ein Eisbär frisst 3 Fische am Morgen, 2 Fische am Mittag und 4 Fische am Abend. Wie viele Fische hat er insgesamt gegessen?",
    correctAnswer: "9",
    explanation: "3 + 2 + 4 = 9 Fische. Eisbären sind große Jäger und können bis zu 20 kg Fleisch auf einmal essen!"
  },
  {
    day: 14,
    funFact: "Wale sind die größten Tiere der Welt! Der Blauwal kann bis zu 30 Meter lang werden - das ist so lang wie 3 Schulbusse!",
    question: "Ein Blauwal ist 30 Meter lang. Ein Schulbus ist 10 Meter lang. Wie viele Schulbusse lang ist der Wal?",
    correctAnswer: "3",
    explanation: "30 Meter ÷ 10 Meter = 3 Schulbusse. Wale haben 3 Flossen: zwei Brustflossen und eine große Schwanzflosse (Fluke)."
  },
  {
    day: 15,
    funFact: "Eulen können ihren Kopf fast vollständig drehen! Sie können ihren Kopf um 270 Grad drehen - das ist fast eine ganze Umdrehung!",
    question: "Eine Eule hat 2 Augen. Wenn 6 Eulen zusammen sind, wie viele Augen haben sie insgesamt?",
    correctAnswer: "12",
    explanation: "6 Eulen × 2 Augen = 12 Augen. Eulen haben große Augen, die nach vorne gerichtet sind, um ihre Beute genau zu sehen - auch im Dunkeln!"
  },
  {
    day: 16,
    funFact: "Ein Känguru kann nicht rückwärts springen! Sie können nur vorwärts hüpfen und sind die einzigen großen Tiere, die das so machen.",
    question: "Ein Känguru springt 5 Meter weit. Wenn es 4 Sprünge macht, wie viele Meter ist es insgesamt gesprungen?",
    correctAnswer: "20",
    explanation: "5 Meter × 4 Sprünge = 20 Meter. Kängurus haben 2 starke Hinterbeine zum Springen und können bis zu 9 Meter weit springen!"
  },
  {
    day: 17,
    funFact: "Schneemänner werden traditionell mit 3 Schneekugeln gebaut: eine große für den Körper, eine mittlere für den Bauch und eine kleine für den Kopf!",
    question: "Du baust 2 Schneemänner. Jeder braucht 3 Schneekugeln. Wie viele Schneekugeln brauchst du insgesamt?",
    correctAnswer: "6",
    explanation: "2 Schneemänner × 3 Schneekugeln = 6 Schneekugeln. Ein klassischer Schneemann besteht aus 3 Kugeln: Körper, Bauch und Kopf."
  },
  {
    day: 18,
    funFact: "Pinguine leben in großen Gruppen zusammen, die man Kolonien nennt. Manche Kolonien haben über eine Million Pinguine!",
    question: "5 Pinguine stehen zusammen. 3 weitere kommen dazu. Dann gehen 2 weg. Wie viele Pinguine sind jetzt da?",
    correctAnswer: "6",
    explanation: "5 + 3 - 2 = 6 Pinguine. Pinguine sind sehr gesellige Tiere und leben gerne in großen Gruppen, die man Kolonien nennt!"
  },
  {
    day: 19,
    funFact: "Rentiere haben spezielle Nasen, die die kalte Luft erwärmen, bevor sie in ihre Lungen kommt. Das hilft ihnen in der Kälte!",
    question: "Ein Rentier hat 4 Hufe. Wenn der Weihnachtsmann 8 Rentiere hat, wie viele Hufe haben alle Rentiere zusammen?",
    correctAnswer: "32",
    explanation: "8 Rentiere × 4 Hufe = 32 Hufe. Rentiere haben breite Hufe, die ihnen helfen, nicht im Schnee einzusinken."
  },
  {
    day: 20,
    funFact: "Weihnachtssterne (Poinsettien) sind eigentlich keine Blumen, sondern die bunten Blätter sind Hochblätter! Die eigentlichen Blüten sind winzig klein.",
    question: "Eine Blume hat normalerweise 5 Blütenblätter. Wenn du einen Strauß mit 6 Blumen machst, wie viele Blütenblätter sind das?",
    correctAnswer: "30",
    explanation: "6 Blumen × 5 Blütenblätter = 30 Blütenblätter. Viele Blumen wie Rosen, Kirschblüten und Apfelblüten haben 5 Blütenblätter."
  },
  {
    day: 21,
    funFact: "Der kürzeste Tag des Jahres ist der 21. Dezember - das ist die Wintersonnenwende! Danach werden die Tage wieder länger.",
    question: "Ein Jahr hat 12 Monate. Wie viele Monate sind 2 Jahre?",
    correctAnswer: "24",
    explanation: "12 Monate × 2 Jahre = 24 Monate. Die 12 Monate sind: Januar, Februar, März, April, Mai, Juni, Juli, August, September, Oktober, November und Dezember."
  },
  {
    day: 22,
    funFact: "Weihnachtskekse wurden ursprünglich in Formen gebacken, die wie Tiere, Sterne und andere Figuren aussahen. Das macht das Backen noch mehr Spaß!",
    question: "Du backst 12 Weihnachtskekse. Du isst 4 davon und verschenkst 3. Wie viele Kekse bleiben übrig?",
    correctAnswer: "5",
    explanation: "12 Kekse - 4 Kekse - 3 Kekse = 5 Kekse. Weihnachtskekse schmecken am besten, wenn man sie mit anderen teilt!"
  },
  {
    day: 23,
    funFact: "Der Weihnachtsmann hat 8 Rentiere, die seinen Schlitten ziehen: Dasher, Dancer, Prancer, Vixen, Comet, Cupid, Donner und Blitzen!",
    question: "Der Weihnachtsmann hat 8 Rentiere. Wenn jedes Rentier 4 Hufe hat, wie viele Hufe haben alle Rentiere zusammen?",
    correctAnswer: "32",
    explanation: "8 Rentiere × 4 Hufe = 32 Hufe. Die 8 Rentiere heißen: Dasher, Dancer, Prancer, Vixen, Comet, Cupid, Donner und Blitzen. Rudolph kam später dazu!"
  },
  {
    day: 24,
    funFact: "An Heiligabend werden in vielen Ländern Geschenke ausgepackt! In manchen Ländern bringt der Weihnachtsmann die Geschenke, in anderen das Christkind.",
    question: "Ein Adventskalender hat 24 Türchen. Wenn du jeden Tag 1 Türchen öffnest, wie viele Tage brauchst du, um alle zu öffnen?",
    correctAnswer: "24",
    explanation: "24 Türchen ÷ 1 Türchen pro Tag = 24 Tage. Ein Adventskalender hat 24 Türchen - eines für jeden Tag vom 1. bis zum 24. Dezember. Heute ist Heiligabend - das letzte Türchen!"
  }
];

async function createAdventCalendar() {
  try {
    const year = new Date().getFullYear();
    
    console.log('Erstelle Adventskalender für das Jahr', year, '...');
    
    // Erstelle alle Türchen
    for (const door of adventDoors) {
      await prisma.adventCalendarDoor.upsert({
        where: {
          day_year: {
            day: door.day,
            year: year
          }
        },
        update: {
          funFact: door.funFact,
          question: door.question,
          correctAnswer: door.correctAnswer,
          explanation: door.explanation
        },
        create: {
          day: door.day,
          year: year,
          funFact: door.funFact,
          question: door.question,
          correctAnswer: door.correctAnswer,
          explanation: door.explanation
        }
      });
      console.log(`✓ Türchen ${door.day} erstellt`);
    }
    
    console.log('\n✅ Adventskalender erfolgreich erstellt!');
    console.log(`📅 ${adventDoors.length} Türchen für das Jahr ${year} erstellt.`);
  } catch (error) {
    console.error('Fehler beim Erstellen des Adventskalenders:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdventCalendar();


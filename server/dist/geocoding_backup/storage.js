"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.MemStorage = void 0;
class MemStorage {
    constructor() {
        this.users = new Map();
        this.topics = new Map();
        this.topicProgress = new Map();
        this.gameStates = new Map();
        this.pointsOfInterest = new Map();
        this.puzzleAttempts = new Map();
        this.currentUserId = 1;
        this.currentTopicId = 1;
        this.currentProgressId = 1;
        this.currentGameStateId = 1;
        this.currentPointId = 1;
        this.currentAttemptId = 1;
        this.initializeTopics();
        this.initializeDefaultPoints();
    }
    initializeTopics() {
        const informatikThemen = [
            {
                name: "Algorithmik & Programmierung",
                description: "Grundlagen der Programmierung und Algorithmusentwicklung",
                category: "Programmierung",
                color: "#2563eb",
                icon: "code",
                order: 1
            },
            {
                name: "Datenstrukturen",
                description: "Arrays, Listen, Bäume und Graphen",
                category: "Datenorganisation",
                color: "#dc2626",
                icon: "storage",
                order: 2
            },
            {
                name: "Objektorientierte Modellierung",
                description: "Klassen, Objekte und Design Patterns",
                category: "Softwareentwicklung",
                color: "#059669",
                icon: "category",
                order: 3
            },
            {
                name: "Technische Informatik",
                description: "Schaltnetze, Schaltwerke und Digitaltechnik",
                category: "Hardware",
                color: "#7c3aed",
                icon: "memory",
                order: 4
            },
            {
                name: "Datenbanken",
                description: "Relationale Datenbanken und SQL",
                category: "Datenmanagement",
                color: "#ea580c",
                icon: "database",
                order: 5
            },
            {
                name: "Webentwicklung",
                description: "HTML, CSS und moderne Webtechnologien",
                category: "Frontend",
                color: "#0891b2",
                icon: "web",
                order: 6
            },
            {
                name: "Gesellschaftliche Aspekte",
                description: "Ethik, Datenschutz und digitale Kompetenz",
                category: "Gesellschaft",
                color: "#be185d",
                icon: "group",
                order: 7
            }
        ];
        informatikThemen.forEach((topic) => __awaiter(this, void 0, void 0, function* () {
            yield this.createTopic(topic);
        }));
    }
    initializeDefaultPoints() {
        return __awaiter(this, void 0, void 0, function* () {
            const allPoints = [];
            // Generator für zufällige, gut verteilte Koordinaten um Lahnstein
            const generateCoordinates = () => {
                const centerLat = 50.31010;
                const centerLng = 7.59530;
                const radius = 0.015; // Ca. 1.5km Radius
                // Zufällige Polarkoordinaten für gleichmäßige Verteilung
                const angle = Math.random() * 2 * Math.PI;
                const distance = Math.sqrt(Math.random()) * radius;
                const lat = centerLat + (distance * Math.cos(angle));
                const lng = centerLng + (distance * Math.sin(angle) * 1.5); // Längerer Osten-Westen-Faktor
                return {
                    latitude: lat.toFixed(5),
                    longitude: lng.toFixed(5)
                };
            };
            // THEMA 1: ALGORITHMIK & PROGRAMMIERUNG - EINFACH
            const algorithmEasy = [
                Object.assign(Object.assign({ topicId: 1, index: 0, difficulty: "easy", name: "Johanniskirche - Algorithmus-Begriff", description: "Was ist ein Algorithmus?" }, generateCoordinates()), { puzzleType: "algorithm", puzzleData: {
                        question: "Was ist ein Algorithmus?",
                        answer: "Handlungsvorschrift", hint1: "Eine Schritt-für-Schritt Anleitung", hint2: "Löst ein Problem systematisch", points: 15,
                        explanation: "Ein Algorithmus ist eine eindeutige Handlungsvorschrift zur Lösung eines Problems in endlich vielen Schritten.",
                        retryQuestion: "Welche drei Eigenschaften muss ein Algorithmus haben?", retryAnswer: "endlich, eindeutig, ausführbar"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 1, difficulty: "easy", name: "Marktplatz - Variablen", description: "Daten speichern" }, generateCoordinates()), { puzzleType: "variables", puzzleData: {
                        question: "In Python: x = 5. Was passiert hier?",
                        answer: "Zuweisung", hint1: "Der Wert 5 wird gespeichert", hint2: "= ist der Zuweisungsoperator", points: 15,
                        explanation: "Eine Zuweisung speichert einen Wert in einer Variable. x erhält den Wert 5.",
                        retryQuestion: "Wie nennt man den Namen einer Variable?", retryAnswer: "Bezeichner"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 2, difficulty: "easy", name: "Rathaus - Datentypen", description: "Arten von Daten" }, generateCoordinates()), { puzzleType: "types", puzzleData: {
                        question: "Welcher Datentyp speichert True oder False?",
                        answer: "Boolean", hint1: "Nur zwei mögliche Werte", hint2: "Nach dem Mathematiker George...", points: 15,
                        explanation: "Boolean-Werte können nur True oder False sein, benannt nach George Boole.",
                        retryQuestion: "Welcher Datentyp speichert ganze Zahlen?", retryAnswer: "Integer"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 3, difficulty: "easy", name: "Schloss - Schleifen", description: "Code wiederholen" }, generateCoordinates()), { puzzleType: "loops", puzzleData: {
                        question: "Welche Schleife läuft eine bestimmte Anzahl von Malen?",
                        answer: "for", hint1: "Man kennt die Anzahl im Voraus", hint2: "for i in range(10):", points: 15,
                        explanation: "For-Schleifen werden verwendet, wenn die Anzahl der Wiederholungen bekannt ist.",
                        retryQuestion: "Welche Schleife läuft solange eine Bedingung wahr ist?", retryAnswer: "while"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 4, difficulty: "easy", name: "Bahnhof - Bedingungen", description: "Entscheidungen treffen" }, generateCoordinates()), { puzzleType: "conditions", puzzleData: {
                        question: "Mit welchem Schlüsselwort beginnt eine Bedingung in Python?",
                        answer: "if", hint1: "Es bedeutet 'falls' auf Englisch", hint2: "Gefolgt von einer Bedingung und :", points: 15,
                        explanation: "IF-Anweisungen ermöglichen Entscheidungen im Code basierend auf Bedingungen.",
                        retryQuestion: "Was folgt nach if, wenn die Bedingung falsch ist?", retryAnswer: "else"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 5, difficulty: "easy", name: "Parkplatz - Funktionen", description: "Code strukturieren" }, generateCoordinates()), { puzzleType: "functions", puzzleData: {
                        question: "Wie definiert man eine Funktion in Python?",
                        answer: "def", hint1: "Steht für 'define'", hint2: "def funktionsname():", points: 15,
                        explanation: "Das def-Schlüsselwort definiert eine neue Funktion in Python.",
                        retryQuestion: "Wie gibt eine Funktion einen Wert zurück?", retryAnswer: "return"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 6, difficulty: "easy", name: "Bibliothek - Listen", description: "Mehrere Werte speichern" }, generateCoordinates()), { puzzleType: "lists", puzzleData: {
                        question: "Wie greift man auf das erste Element einer Liste zu?",
                        answer: "liste[0]", hint1: "Listen beginnen bei Index 0", hint2: "Eckige Klammern verwenden", points: 15,
                        explanation: "Listen sind nullindexiert. Das erste Element hat Index 0.",
                        retryQuestion: "Wie fügt man ein Element am Ende einer Liste hinzu?", retryAnswer: "append"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 7, difficulty: "easy", name: "Schule - Ein-/Ausgabe", description: "Mit Benutzern kommunizieren" }, generateCoordinates()), { puzzleType: "io", puzzleData: {
                        question: "Welche Funktion gibt Text in Python aus?",
                        answer: "print", hint1: "Druckt auf die Konsole", hint2: "print('Hallo')", points: 15,
                        explanation: "print() gibt Text oder Werte auf der Konsole aus.",
                        retryQuestion: "Welche Funktion liest Benutzereingaben?", retryAnswer: "input"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 8, difficulty: "easy", name: "Post - Operatoren", description: "Berechnungen durchführen" }, generateCoordinates()), { puzzleType: "operators", puzzleData: {
                        question: "Was ist das Ergebnis von 7 % 3 in Python?",
                        answer: "1", hint1: "% ist der Modulo-Operator", hint2: "Rest bei Division: 7 ÷ 3 = 2 Rest ?", points: 15,
                        explanation: "Der Modulo-Operator % gibt den Rest einer Division zurück. 7 geteilt durch 3 ist 2 Rest 1.",
                        retryQuestion: "Was ist 8 % 4?", retryAnswer: "0"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 9, difficulty: "easy", name: "Kirche - Debugging", description: "Fehler finden" }, generateCoordinates()), { puzzleType: "debugging", puzzleData: {
                        question: "Wie nennt man Fehler im Programmcode?",
                        answer: "Bugs", hint1: "Kleine Käfer...", hint2: "Das Entfernen nennt man Debugging", points: 15,
                        explanation: "Bugs sind Programmfehler. Der Begriff entstand, als ein echter Käfer einen Computer störte.",
                        retryQuestion: "Wie nennt man den Prozess der Fehlersuche?", retryAnswer: "Debugging"
                    } })
            ];
            // THEMA 1: ALGORITHMIK & PROGRAMMIERUNG - MITTEL
            const algorithmMedium = [
                Object.assign(Object.assign({ topicId: 1, index: 0, difficulty: "medium", name: "Johanniskirche - Rekursion", description: "Selbstaufruf von Funktionen" }, generateCoordinates()), { puzzleType: "recursion", puzzleData: {
                        question: "Was ist das Wichtigste bei rekursiven Funktionen?",
                        answer: "Abbruchbedingung", hint1: "Ohne sie läuft die Funktion endlos", hint2: "Base Case auf Englisch", points: 25,
                        explanation: "Rekursive Funktionen brauchen eine Abbruchbedingung, sonst entsteht eine Endlosschleife.",
                        retryQuestion: "Wie nennt man eine Funktion, die sich selbst aufruft?", retryAnswer: "rekursiv"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 1, difficulty: "medium", name: "Marktplatz - Sortieren", description: "Daten ordnen" }, generateCoordinates()), { puzzleType: "sorting", puzzleData: {
                        question: "Welcher Sortieralgorithmus vergleicht immer benachbarte Elemente?",
                        answer: "Bubble Sort", hint1: "Größere Elemente 'blubbern' nach oben", hint2: "Sehr einfach aber langsam", points: 25,
                        explanation: "Bubble Sort vertauscht benachbarte Elemente, bis die Liste sortiert ist. Zeitkomplexität O(n²).",
                        retryQuestion: "Welcher Sortieralgorithmus teilt die Liste in zwei Hälften?", retryAnswer: "Merge Sort"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 2, difficulty: "medium", name: "Rathaus - Komplexität", description: "Effizienz messen" }, generateCoordinates()), { puzzleType: "complexity", puzzleData: {
                        question: "Was bedeutet O(n) bei der Zeitkomplexität?",
                        answer: "linear", hint1: "Die Zeit wächst proportional zur Eingabegröße", hint2: "Verdoppelt sich n, verdoppelt sich die Zeit", points: 25,
                        explanation: "O(n) bedeutet lineare Zeitkomplexität - die Laufzeit wächst proportional zur Eingabegröße.",
                        retryQuestion: "Was ist besser: O(n) oder O(log n)?", retryAnswer: "O(log n)"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 3, difficulty: "medium", name: "Schloss - Suchverfahren", description: "Daten finden" }, generateCoordinates()), { puzzleType: "search", puzzleData: {
                        question: "Welche Voraussetzung braucht die binäre Suche?",
                        answer: "sortierte Liste", hint1: "Die Daten müssen geordnet sein", hint2: "Sonst funktioniert das Halbieren nicht", points: 25,
                        explanation: "Binäre Suche halbiert den Suchbereich in jedem Schritt, funktioniert nur bei sortierten Daten.",
                        retryQuestion: "Welche Zeitkomplexität hat die binäre Suche?", retryAnswer: "O(log n)"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 4, difficulty: "medium", name: "Bahnhof - Datenstrukturen", description: "Stapel und Warteschlangen" }, generateCoordinates()), { puzzleType: "structures", puzzleData: {
                        question: "Welches Prinzip verfolgt ein Stack (Stapel)?",
                        answer: "LIFO", hint1: "Last In, First Out", hint2: "Wie ein Stapel Teller", points: 25,
                        explanation: "Ein Stack folgt dem LIFO-Prinzip: Das zuletzt hinzugefügte Element wird zuerst entfernt.",
                        retryQuestion: "Welches Prinzip verfolgt eine Queue (Warteschlange)?", retryAnswer: "FIFO"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 5, difficulty: "medium", name: "Parkplatz - Hash-Tabellen", description: "Schneller Zugriff" }, generateCoordinates()), { puzzleType: "hashing", puzzleData: {
                        question: "Was ist der Hauptvorteil von Hash-Tabellen?",
                        answer: "O(1) Zugriff", hint1: "Konstante Zugriffszeit", hint2: "Sehr schnell im Durchschnitt", points: 25,
                        explanation: "Hash-Tabellen ermöglichen durchschnittlich konstante Zugriffszeit O(1) durch Hash-Funktionen.",
                        retryQuestion: "Was kann bei Hash-Tabellen problematisch werden?", retryAnswer: "Kollisionen"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 6, difficulty: "medium", name: "Bibliothek - Graphen", description: "Vernetzte Strukturen" }, generateCoordinates()), { puzzleType: "graphs", puzzleData: {
                        question: "Wie nennt man einen Graphen ohne Zyklen?",
                        answer: "Baum", hint1: "Hierarchische Struktur", hint2: "Wie ein Familienstammbaum", points: 25,
                        explanation: "Ein zusammenhängender azyklischer Graph wird als Baum bezeichnet.",
                        retryQuestion: "Wie nennt man die Verbindungen in einem Graphen?", retryAnswer: "Kanten"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 7, difficulty: "medium", name: "Schule - Divide & Conquer", description: "Teile und herrsche" }, generateCoordinates()), { puzzleType: "divide", puzzleData: {
                        question: "Welcher Sortieralgorithmus nutzt Divide & Conquer?",
                        answer: "Quick Sort", hint1: "Teilt um ein Pivot-Element", hint2: "Sehr effizient im Durchschnitt", points: 25,
                        explanation: "Quick Sort teilt die Liste um ein Pivot-Element und sortiert die Teile rekursiv.",
                        retryQuestion: "Welcher andere Sortieralgorithmus nutzt auch Divide & Conquer?", retryAnswer: "Merge Sort"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 8, difficulty: "medium", name: "Post - Greedy-Algorithmen", description: "Gierige Strategien" }, generateCoordinates()), { puzzleType: "greedy", puzzleData: {
                        question: "Was charakterisiert Greedy-Algorithmen?",
                        answer: "lokale Optima", hint1: "Sie wählen immer das beste verfügbare", hint2: "Ohne Rücksicht auf globale Lösung", points: 25,
                        explanation: "Greedy-Algorithmen treffen in jedem Schritt die lokal beste Entscheidung.",
                        retryQuestion: "Garantieren Greedy-Algorithmen immer die optimale Lösung?", retryAnswer: "Nein"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 9, difficulty: "medium", name: "Kirche - Backtracking", description: "Systematisches Probieren" }, generateCoordinates()), { puzzleType: "backtracking", puzzleData: {
                        question: "Was macht Backtracking bei einer Sackgasse?",
                        answer: "zurückgehen", hint1: "Einen Schritt rückgängig machen", hint2: "Andere Möglichkeiten probieren", points: 25,
                        explanation: "Backtracking geht bei Sackgassen einen Schritt zurück und probiert andere Wege.",
                        retryQuestion: "Welches klassische Problem löst Backtracking?", retryAnswer: "N-Damen"
                    } })
            ];
            // THEMA 1: ALGORITHMIK & PROGRAMMIERUNG - SCHWER  
            const algorithmHard = [
                Object.assign(Object.assign({ topicId: 1, index: 0, difficulty: "hard", name: "Johanniskirche - NP-Vollständigkeit", description: "Komplexitätstheorie" }, generateCoordinates()), { puzzleType: "complexity-theory", puzzleData: {
                        question: "Was bedeutet es, wenn ein Problem NP-vollständig ist?",
                        answer: "schwierigste NP-Probleme", hint1: "Alle NP-Probleme sind darauf reduzierbar", hint2: "TSP ist ein Beispiel", points: 40,
                        explanation: "NP-vollständige Probleme sind die schwierigsten in NP. Wenn eines in P liegt, dann P=NP.",
                        retryQuestion: "Ist das P-vs-NP Problem gelöst?", retryAnswer: "Nein"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 1, difficulty: "hard", name: "Marktplatz - Dynamische Programmierung", description: "Optimale Teilstrukturen" }, generateCoordinates()), { puzzleType: "dynamic", puzzleData: {
                        question: "Was ist der Kerngedanke der dynamischen Programmierung?",
                        answer: "Memoization", hint1: "Bereits berechnete Ergebnisse speichern", hint2: "Vermeidet redundante Berechnungen", points: 40,
                        explanation: "DP speichert Teillösungen, um sie bei ähnlichen Teilproblemen wiederzuverwenden.",
                        retryQuestion: "Welche Eigenschaft müssen Probleme für DP haben?", retryAnswer: "optimale Teilstruktur"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 2, difficulty: "hard", name: "Rathaus - Approximationsalgorithmen", description: "Näherungslösungen" }, generateCoordinates()), { puzzleType: "approximation", puzzleData: {
                        question: "Was gibt der Approximationsfaktor an?",
                        answer: "Güte der Näherung", hint1: "Verhältnis zur optimalen Lösung", hint2: "2-Approximation = maximal doppelt so schlecht", points: 40,
                        explanation: "Der Approximationsfaktor beschreibt, wie weit die Lösung maximal vom Optimum entfernt ist.",
                        retryQuestion: "Ist ein kleinerer Approximationsfaktor besser?", retryAnswer: "Ja"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 3, difficulty: "hard", name: "Schloss - Parallele Algorithmen", description: "Mehrkern-Computing" }, generateCoordinates()), { puzzleType: "parallel", puzzleData: {
                        question: "Was beschreibt Amdahls Gesetz?",
                        answer: "Parallelisierungsgrenze", hint1: "Speedup-Begrenzung durch sequentielle Anteile", hint2: "Nicht alles ist parallelisierbar", points: 40,
                        explanation: "Amdahls Gesetz besagt, dass sequentielle Programmteile die Parallelisierung begrenzen.",
                        retryQuestion: "Was limitiert die theoretische Beschleunigung?", retryAnswer: "sequentielle Teile"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 4, difficulty: "hard", name: "Bahnhof - Machine Learning", description: "Lernende Algorithmen" }, generateCoordinates()), { puzzleType: "ml", puzzleData: {
                        question: "Welcher ML-Algorithmus verwendet Hyperebenen zur Klassifikation?",
                        answer: "SVM", hint1: "Support Vector...", hint2: "Machines", points: 40,
                        explanation: "Support Vector Machines finden optimale Hyperebenen zur Trennung von Datenklassen.",
                        retryQuestion: "Was maximieren SVMs?", retryAnswer: "Margin"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 5, difficulty: "hard", name: "Parkplatz - Quantenalgorithmen", description: "Quantencomputing" }, generateCoordinates()), { puzzleType: "quantum", puzzleData: {
                        question: "Welcher Quantenalgorithmus bedroht RSA?",
                        answer: "Shor", hint1: "Nach Peter Shor benannt", hint2: "Faktorisiert große Zahlen exponentiell schneller", points: 40,
                        explanation: "Shors Algorithmus kann auf Quantencomputern große Zahlen effizient faktorisieren.",
                        retryQuestion: "Was nutzen Quantenalgorithmen aus?", retryAnswer: "Superposition"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 6, difficulty: "hard", name: "Bibliothek - Kryptographie", description: "Sichere Algorithmen" }, generateCoordinates()), { puzzleType: "crypto", puzzleData: {
                        question: "Worauf basiert die Sicherheit von RSA?",
                        answer: "Faktorisierung", hint1: "Primzahlen sind leicht zu multiplizieren", hint2: "Aber schwer zu faktorisieren", points: 40,
                        explanation: "RSA nutzt die Schwierigkeit der Primfaktorzerlegung großer Zahlen.",
                        retryQuestion: "Was sind die beiden RSA-Schlüssel?", retryAnswer: "öffentlich und privat"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 7, difficulty: "hard", name: "Schule - Genetische Algorithmen", description: "Evolutionäre Optimierung" }, generateCoordinates()), { puzzleType: "genetic", puzzleData: {
                        question: "Was simuliert Crossover bei genetischen Algorithmen?",
                        answer: "Fortpflanzung", hint1: "Vermischung von Eltern-Genen", hint2: "Entstehung neuer Nachkommen", points: 40,
                        explanation: "Crossover kombiniert Eigenschaften zweier Elternlösungen zu neuen Lösungen.",
                        retryQuestion: "Was simuliert Mutation?", retryAnswer: "zufällige Änderungen"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 8, difficulty: "hard", name: "Post - Distributed Computing", description: "Verteilte Systeme" }, generateCoordinates()), { puzzleType: "distributed", puzzleData: {
                        question: "Was besagt das CAP-Theorem?",
                        answer: "nur 2 von 3", hint1: "Consistency, Availability, Partition tolerance", hint2: "Unmöglich alle drei gleichzeitig", points: 40,
                        explanation: "Verteilte Systeme können maximal 2 der 3 CAP-Eigenschaften gleichzeitig erfüllen.",
                        retryQuestion: "Welche CAP-Eigenschaft kann bei Netzwerkausfällen nicht aufgegeben werden?", retryAnswer: "Partition tolerance"
                    } }),
                Object.assign(Object.assign({ topicId: 1, index: 9, difficulty: "hard", name: "Kirche - Blockchain", description: "Dezentrale Algorithmen" }, generateCoordinates()), { puzzleType: "blockchain", puzzleData: {
                        question: "Was ist das Hauptproblem von Proof of Work?",
                        answer: "Energieverbrauch", hint1: "Mining benötigt viel Rechenleistung", hint2: "Umweltproblem", points: 40,
                        explanation: "Proof of Work erfordert intensive Berechnungen, was zu hohem Energieverbrauch führt.",
                        retryQuestion: "Was ist eine Alternative zu Proof of Work?", retryAnswer: "Proof of Stake"
                    } })
            ];
            // THEMA 2: DATENSTRUKTUREN - Alle Schwierigkeiten
            const dataStructuresEasy = [
                Object.assign(Object.assign({ topicId: 2, index: 0, difficulty: "easy", name: "Array-Grundlagen", description: "Listen verstehen" }, generateCoordinates()), { puzzleType: "array", puzzleData: { question: "Wie greift man auf das erste Element eines Arrays zu?", answer: "Index 0", hint1: "Arrays beginnen bei 0", hint2: "arr[?]", points: 15,
                        explanation: "Arrays sind nullindexiert - das erste Element hat Index 0.", retryQuestion: "Was ist der Index des zweiten Elements?", retryAnswer: "1" } }),
                Object.assign(Object.assign({ topicId: 2, index: 1, difficulty: "easy", name: "Array-Größe", description: "Länge bestimmen" }, generateCoordinates()), { puzzleType: "array", puzzleData: { question: "Mit welcher Methode bestimmt man die Länge eines Arrays in Python?", answer: "len", hint1: "Kurz für length", hint2: "len(array)", points: 15,
                        explanation: "len() gibt die Anzahl der Elemente in einer Liste zurück.", retryQuestion: "Ist len() eine Funktion oder Methode?", retryAnswer: "Funktion" } }),
                Object.assign(Object.assign({ topicId: 2, index: 2, difficulty: "easy", name: "Listen-Methoden", description: "Elemente hinzufügen" }, generateCoordinates()), { puzzleType: "list", puzzleData: { question: "Welche Methode fügt ein Element am Ende einer Liste hinzu?", answer: "append", hint1: "Anhängen auf Englisch", hint2: "list.append(element)", points: 15,
                        explanation: "append() fügt ein Element am Ende der Liste hinzu.", retryQuestion: "Welche Methode fügt an einer bestimmten Position ein?", retryAnswer: "insert" } }),
                Object.assign(Object.assign({ topicId: 2, index: 3, difficulty: "easy", name: "String-Arrays", description: "Text als Liste" }, generateCoordinates()), { puzzleType: "string", puzzleData: { question: "Wie greift man auf den ersten Buchstaben eines Strings zu?", answer: "text[0]", hint1: "Strings sind wie Listen von Zeichen", hint2: "Eckige Klammern verwenden", points: 15,
                        explanation: "Strings verhalten sich wie Arrays von Zeichen und sind nullindexiert.", retryQuestion: "Wie greift man auf den letzten Buchstaben zu?", retryAnswer: "text[-1]" } }),
                Object.assign(Object.assign({ topicId: 2, index: 4, difficulty: "easy", name: "Tupel", description: "Unveränderliche Listen" }, generateCoordinates()), { puzzleType: "tuple", puzzleData: { question: "Was ist der Hauptunterschied zwischen Listen und Tupeln?", answer: "unveränderlich", hint1: "Tupel können nicht verändert werden", hint2: "Immutable auf Englisch", points: 15,
                        explanation: "Tupel sind unveränderliche Sequenzen, Listen sind veränderlich.", retryQuestion: "Welche Klammern verwendet man für Tupel?", retryAnswer: "runde" } }),
                Object.assign(Object.assign({ topicId: 2, index: 5, difficulty: "easy", name: "Dictionaries", description: "Schlüssel-Wert-Paare" }, generateCoordinates()), { puzzleType: "dict", puzzleData: { question: "Wie greift man auf einen Wert im Dictionary zu?", answer: "dict[key]", hint1: "Über den Schlüssel", hint2: "Eckige Klammern mit Schlüssel", points: 15,
                        explanation: "Dictionaries speichern Schlüssel-Wert-Paare und ermöglichen Zugriff über Schlüssel.", retryQuestion: "Welche Klammern definieren ein Dictionary?", retryAnswer: "geschweifte" } }),
                Object.assign(Object.assign({ topicId: 2, index: 6, difficulty: "easy", name: "Sets", description: "Eindeutige Elemente" }, generateCoordinates()), { puzzleType: "set", puzzleData: { question: "Was ist die Besonderheit von Sets?", answer: "keine Duplikate", hint1: "Jedes Element nur einmal", hint2: "Mathematische Menge", points: 15,
                        explanation: "Sets enthalten jedes Element nur einmal und haben keine feste Reihenfolge.", retryQuestion: "Sind Sets geordnet?", retryAnswer: "nein" } }),
                Object.assign(Object.assign({ topicId: 2, index: 7, difficulty: "easy", name: "List Slicing", description: "Teilbereiche extrahieren" }, generateCoordinates()), { puzzleType: "slice", puzzleData: { question: "Was gibt list[1:3] zurück?", answer: "Elemente 1 und 2", hint1: "Start inklusive, Ende exklusive", hint2: "Index 1 bis 2", points: 15,
                        explanation: "Slicing mit [start:end] gibt Elemente von start bis end-1 zurück.", retryQuestion: "Was gibt list[:3] zurück?", retryAnswer: "erste drei Elemente" } }),
                Object.assign(Object.assign({ topicId: 2, index: 8, difficulty: "easy", name: "Nested Lists", description: "Listen in Listen" }, generateCoordinates()), { puzzleType: "nested", puzzleData: { question: "Wie greift man auf ein Element in einer verschachtelten Liste zu?", answer: "liste[i][j]", hint1: "Zwei Indizes verwenden", hint2: "Erst äußere, dann innere Liste", points: 15,
                        explanation: "Verschachtelte Listen erfordern mehrere Indizes für den Zugriff.", retryQuestion: "Was ist eine 2D-Liste?", retryAnswer: "Matrix" } }),
                Object.assign(Object.assign({ topicId: 2, index: 9, difficulty: "easy", name: "List Comprehensions", description: "Listen elegant erstellen" }, generateCoordinates()), { puzzleType: "comprehension", puzzleData: { question: "Was erstellt [x*2 for x in range(3)]?", answer: "[0, 2, 4]", hint1: "Jedes x wird verdoppelt", hint2: "x = 0, 1, 2", points: 15,
                        explanation: "List Comprehensions erstellen Listen mit einer kompakten Syntax.", retryQuestion: "Was ist die lange Form von List Comprehensions?", retryAnswer: "for-Schleife" } })
            ];
            const dataStructuresMedium = [
                Object.assign(Object.assign({ topicId: 2, index: 0, difficulty: "medium", name: "Stack Implementation", description: "LIFO-Prinzip" }, generateCoordinates()), { puzzleType: "stack", puzzleData: { question: "Welche Operation entfernt das oberste Element vom Stack?", answer: "pop", hint1: "Last In, First Out", hint2: "Gegenteil von push", points: 25,
                        explanation: "pop() entfernt und gibt das zuletzt hinzugefügte Element zurück.", retryQuestion: "Welche Operation fügt ein Element hinzu?", retryAnswer: "push" } }),
                Object.assign(Object.assign({ topicId: 2, index: 1, difficulty: "medium", name: "Queue Implementation", description: "FIFO-Prinzip" }, generateCoordinates()), { puzzleType: "queue", puzzleData: { question: "Wo wird bei einer Queue ein neues Element hinzugefügt?", answer: "am Ende", hint1: "First In, First Out", hint2: "Wie in einer Warteschlange", points: 25,
                        explanation: "Queues fügen hinten hinzu (enqueue) und entfernen vorne (dequeue).", retryQuestion: "Wo wird ein Element entfernt?", retryAnswer: "am Anfang" } }),
                Object.assign(Object.assign({ topicId: 2, index: 2, difficulty: "medium", name: "Linked Lists", description: "Verkettete Listen" }, generateCoordinates()), { puzzleType: "linked", puzzleData: { question: "Was speichert jeder Knoten in einer verketteten Liste?", answer: "Daten und Zeiger", hint1: "Wert und Verweis", hint2: "Data und Next", points: 25,
                        explanation: "Jeder Knoten enthält Daten und einen Zeiger auf den nächsten Knoten.", retryQuestion: "Was ist der Vorteil gegenüber Arrays?", retryAnswer: "dynamische Größe" } }),
                Object.assign(Object.assign({ topicId: 2, index: 3, difficulty: "medium", name: "Binary Trees", description: "Binäre Bäume" }, generateCoordinates()), { puzzleType: "tree", puzzleData: { question: "Wie viele Kinder hat maximal ein Knoten im Binärbaum?", answer: "2", hint1: "Binär bedeutet zwei", hint2: "Links und rechts", points: 25,
                        explanation: "Binärbäume haben maximal zwei Kindknoten pro Knoten: links und rechts.", retryQuestion: "Wie nennt man Knoten ohne Kinder?", retryAnswer: "Blätter" } }),
                Object.assign(Object.assign({ topicId: 2, index: 4, difficulty: "medium", name: "Hash Tables", description: "Assoziative Arrays" }, generateCoordinates()), { puzzleType: "hash", puzzleData: { question: "Was ist das Ziel einer guten Hash-Funktion?", answer: "gleichmäßige Verteilung", hint1: "Kollisionen vermeiden", hint2: "Alle Slots nutzen", points: 25,
                        explanation: "Eine gute Hash-Funktion verteilt Schlüssel gleichmäßig über alle verfügbaren Slots.", retryQuestion: "Was passiert bei einer Kollision?", retryAnswer: "mehrere Elemente gleicher Hash" } }),
                Object.assign(Object.assign({ topicId: 2, index: 5, difficulty: "medium", name: "Heaps", description: "Prioritätswarteschlangen" }, generateCoordinates()), { puzzleType: "heap", puzzleData: { question: "Welche Eigenschaft hat ein Min-Heap?", answer: "Eltern kleiner als Kinder", hint1: "Minimum an der Wurzel", hint2: "Kleinste Wert oben", points: 25,
                        explanation: "In einem Min-Heap ist jeder Elternknoten kleiner als seine Kindknoten.", retryQuestion: "Wo steht das Maximum in einem Max-Heap?", retryAnswer: "an der Wurzel" } }),
                Object.assign(Object.assign({ topicId: 2, index: 6, difficulty: "medium", name: "Trie", description: "Präfix-Bäume" }, generateCoordinates()), { puzzleType: "trie", puzzleData: { question: "Wofür werden Tries hauptsächlich verwendet?", answer: "Wörterbücher", hint1: "Speichern von Strings", hint2: "Autocompletion", points: 25,
                        explanation: "Tries sind spezialisierte Bäume für effiziente String-Operationen und Präfix-Suchen.", retryQuestion: "Was bedeutet Trie?", retryAnswer: "retrieval" } }),
                Object.assign(Object.assign({ topicId: 2, index: 7, difficulty: "medium", name: "Graph Representation", description: "Graphen darstellen" }, generateCoordinates()), { puzzleType: "graph", puzzleData: { question: "Welche zwei Hauptarten gibt es, Graphen zu speichern?", answer: "Adjazenzmatrix und Adjazenzliste", hint1: "Matrix oder Listen", hint2: "Nachbarschaft darstellen", points: 25,
                        explanation: "Graphen können als Matrix (alle Verbindungen) oder Listen (nur existierende Kanten) gespeichert werden.", retryQuestion: "Was ist platzeffizienter bei wenigen Kanten?", retryAnswer: "Adjazenzliste" } }),
                Object.assign(Object.assign({ topicId: 2, index: 8, difficulty: "medium", name: "Deque", description: "Double-ended Queue" }, generateCoordinates()), { puzzleType: "deque", puzzleData: { question: "Was ist das Besondere an einer Deque?", answer: "Einfügen und Entfernen an beiden Enden", hint1: "Double-ended", hint2: "Vorne und hinten", points: 25,
                        explanation: "Deques erlauben effizientes Hinzufügen und Entfernen an beiden Enden.", retryQuestion: "Welche Zeitkomplexität haben die Operationen?", retryAnswer: "O(1)" } }),
                Object.assign(Object.assign({ topicId: 2, index: 9, difficulty: "medium", name: "Disjoint Set", description: "Union-Find" }, generateCoordinates()), { puzzleType: "union-find", puzzleData: { question: "Was macht die Union-Operation?", answer: "verbindet zwei Mengen", hint1: "Vereinigung von Sets", hint2: "Zusammenführen", points: 25,
                        explanation: "Union-Find verwaltet disjunkte Mengen und unterstützt Union- und Find-Operationen.", retryQuestion: "Was macht die Find-Operation?", retryAnswer: "findet Repräsentant" } })
            ];
            const dataStructuresHard = [
                Object.assign(Object.assign({ topicId: 2, index: 0, difficulty: "hard", name: "B-Trees", description: "Selbstbalancierende Bäume" }, generateCoordinates()), { puzzleType: "btree", puzzleData: { question: "Warum werden B-Bäume in Datenbanken verwendet?", answer: "minimieren Festplattenzugriffe", hint1: "Breite statt Tiefe", hint2: "Viele Schlüssel pro Knoten", points: 40,
                        explanation: "B-Bäume minimieren Festplattenzugriffe durch flache, breite Struktur mit vielen Schlüsseln pro Knoten.", retryQuestion: "Was ist die Ordnung eines B-Baums?", retryAnswer: "maximale Anzahl Kinder" } }),
                Object.assign(Object.assign({ topicId: 2, index: 1, difficulty: "hard", name: "Red-Black Trees", description: "Rot-Schwarz-Bäume" }, generateCoordinates()), { puzzleType: "rb-tree", puzzleData: { question: "Welche Eigenschaft garantiert die Balance in Rot-Schwarz-Bäumen?", answer: "schwarze Höhe", hint1: "Jeder Pfad hat gleich viele schwarze Knoten", hint2: "Keine zwei roten Knoten nacheinander", points: 40,
                        explanation: "Die schwarze Höhe (Anzahl schwarzer Knoten auf jedem Pfad) ist konstant und garantiert Balance.", retryQuestion: "Dürfen zwei rote Knoten benachbart sein?", retryAnswer: "nein" } }),
                Object.assign(Object.assign({ topicId: 2, index: 2, difficulty: "hard", name: "Segment Trees", description: "Bereichsabfragen" }, generateCoordinates()), { puzzleType: "segment", puzzleData: { question: "Welche Zeitkomplexität haben Bereichsabfragen in Segment Trees?", answer: "O(log n)", hint1: "Logarithmisch", hint2: "Wie bei binären Bäumen", points: 40,
                        explanation: "Segment Trees ermöglichen Bereichsabfragen und -updates in O(log n) Zeit.", retryQuestion: "Wofür werden Segment Trees verwendet?", retryAnswer: "Bereichsoperationen" } }),
                Object.assign(Object.assign({ topicId: 2, index: 3, difficulty: "hard", name: "Fenwick Trees", description: "Binary Indexed Trees" }, generateCoordinates()), { puzzleType: "fenwick", puzzleData: { question: "Was ist der Hauptvorteil von Fenwick Trees gegenüber Segment Trees?", answer: "weniger Speicher", hint1: "Kompaktere Darstellung", hint2: "Nur Array statt Baum", points: 40,
                        explanation: "Fenwick Trees (BIT) benötigen weniger Speicher als Segment Trees für Präfixsummen.", retryQuestion: "Welche Operation nutzt Fenwick Trees intern?", retryAnswer: "Bit-Operationen" } }),
                Object.assign(Object.assign({ topicId: 2, index: 4, difficulty: "hard", name: "Suffix Arrays", description: "String-Indizierung" }, generateCoordinates()), { puzzleType: "suffix", puzzleData: { question: "Wie werden Suffix Arrays konstruiert?", answer: "Sortierung aller Suffixe", hint1: "Alle Endungen des Strings", hint2: "Lexikographisch ordnen", points: 40,
                        explanation: "Suffix Arrays enthalten alle Suffixe eines Strings in sortierter Reihenfolge für schnelle Suchoperationen.", retryQuestion: "Welche Zeitkomplexität hat die Suche?", retryAnswer: "O(log n)" } }),
                Object.assign(Object.assign({ topicId: 2, index: 5, difficulty: "hard", name: "Van Emde Boas Trees", description: "Integer-Datenstrukturen" }, generateCoordinates()), { puzzleType: "veb", puzzleData: { question: "Welche Zeitkomplexität haben Operationen in vEB-Trees?", answer: "O(log log u)", hint1: "Doppelt logarithmisch", hint2: "u ist das Universum", points: 40,
                        explanation: "Van Emde Boas Trees erreichen O(log log u) Zeit für Integer-Operationen.", retryQuestion: "Für welche Art von Schlüsseln sind sie optimiert?", retryAnswer: "Integers" } }),
                Object.assign(Object.assign({ topicId: 2, index: 6, difficulty: "hard", name: "Persistent Data Structures", description: "Unveränderliche Strukturen" }, generateCoordinates()), { puzzleType: "persistent", puzzleData: { question: "Was ist der Vorteil persistenter Datenstrukturen?", answer: "alle Versionen verfügbar", hint1: "Keine Mutation", hint2: "Strukturelles Teilen", points: 40,
                        explanation: "Persistente Strukturen bewahren alle vorherigen Versionen und teilen gemeinsame Teile.", retryQuestion: "Wie heißt das Prinzip des Teilens?", retryAnswer: "structural sharing" } }),
                Object.assign(Object.assign({ topicId: 2, index: 7, difficulty: "hard", name: "Rope Data Structure", description: "Effiziente Strings" }, generateCoordinates()), { puzzleType: "rope", puzzleData: { question: "Warum sind Ropes bei sehr langen Strings vorteilhaft?", answer: "effiziente Verkettung", hint1: "Keine Kopien des gesamten Strings", hint2: "Binärer Baum von Strings", points: 40,
                        explanation: "Ropes ermöglichen effiziente String-Operationen ohne vollständige Kopien durch Baumstruktur.", retryQuestion: "Welche Zeitkomplexität hat die Verkettung?", retryAnswer: "O(1)" } }),
                Object.assign(Object.assign({ topicId: 2, index: 8, difficulty: "hard", name: "Bloom Filters", description: "Probabilistische Datenstrukturen" }, generateCoordinates()), { puzzleType: "bloom", puzzleData: { question: "Was können Bloom Filter nicht garantieren?", answer: "definitives Ja", hint1: "Falsch-positive möglich", hint2: "Aber keine falsch-negativen", points: 40,
                        explanation: "Bloom Filter können falsch-positive Ergebnisse liefern, aber nie falsch-negative.", retryQuestion: "Wofür werden sie hauptsächlich verwendet?", retryAnswer: "Mitgliedschaftstest" } }),
                Object.assign(Object.assign({ topicId: 2, index: 9, difficulty: "hard", name: "Skip Lists", description: "Probabilistische Balance" }, generateCoordinates()), { puzzleType: "skip", puzzleData: { question: "Wie erreichen Skip Lists ihre Effizienz?", answer: "multiple Level", hint1: "Verschiedene Ebenen mit unterschiedlicher Dichte", hint2: "Probabilistische Struktur", points: 40,
                        explanation: "Skip Lists verwenden mehrere Ebenen mit abnehmender Dichte für effiziente Operationen.", retryQuestion: "Welche durchschnittliche Zeitkomplexität haben Operationen?", retryAnswer: "O(log n)" } })
            ];
            // THEMA 3: OBJEKTORIENTIERTE MODELLIERUNG - Alle Schwierigkeiten  
            const oopEasy = [
                Object.assign(Object.assign({ topicId: 3, index: 0, difficulty: "easy", name: "Klassen-Konzept", description: "OOP Grundlagen" }, generateCoordinates()), { puzzleType: "oop", puzzleData: { question: "Was ist eine Klasse?", answer: "Bauplan", hint1: "Vorlage für Objekte", hint2: "Definiert Struktur und Verhalten", points: 15,
                        explanation: "Eine Klasse ist ein Bauplan für Objekte und definiert deren Eigenschaften und Methoden.", retryQuestion: "Was erstellt man aus einer Klasse?", retryAnswer: "Objekt" } }),
                Object.assign(Object.assign({ topicId: 3, index: 1, difficulty: "easy", name: "Objekterstellung", description: "Instanziierung" }, generateCoordinates()), { puzzleType: "object", puzzleData: { question: "Wie erstellt man ein Objekt aus einer Klasse?", answer: "Instanziierung", hint1: "Aufruf des Konstruktors", hint2: "new Klassenname() in Java", points: 15,
                        explanation: "Objekte werden durch Instanziierung einer Klasse erstellt.", retryQuestion: "Wie nennt man ein erstelltes Objekt?", retryAnswer: "Instanz" } }),
                Object.assign(Object.assign({ topicId: 3, index: 2, difficulty: "easy", name: "Attribute", description: "Objekteigenschaften" }, generateCoordinates()), { puzzleType: "attributes", puzzleData: { question: "Was sind Attribute in der OOP?", answer: "Eigenschaften", hint1: "Daten eines Objekts", hint2: "Variablen in der Klasse", points: 15,
                        explanation: "Attribute sind die Eigenschaften oder Daten, die ein Objekt besitzt.", retryQuestion: "Wie greift man auf Attribute zu?", retryAnswer: "objekt.attribut" } }),
                Object.assign(Object.assign({ topicId: 3, index: 3, difficulty: "easy", name: "Methoden", description: "Objektverhalten" }, generateCoordinates()), { puzzleType: "methods", puzzleData: { question: "Was sind Methoden in der OOP?", answer: "Funktionen", hint1: "Verhalten eines Objekts", hint2: "Operationen auf Daten", points: 15,
                        explanation: "Methoden definieren das Verhalten eines Objekts und können auf dessen Daten zugreifen.", retryQuestion: "Wie ruft man eine Methode auf?", retryAnswer: "objekt.methode()" } }),
                Object.assign(Object.assign({ topicId: 3, index: 4, difficulty: "easy", name: "Konstruktor", description: "Objektinitialisierung" }, generateCoordinates()), { puzzleType: "constructor", puzzleData: { question: "Was macht ein Konstruktor?", answer: "initialisiert Objekt", hint1: "Wird bei Objekterstellung aufgerufen", hint2: "Setzt Anfangswerte", points: 15,
                        explanation: "Der Konstruktor initialisiert ein Objekt bei seiner Erstellung mit Anfangswerten.", retryQuestion: "Wann wird der Konstruktor aufgerufen?", retryAnswer: "bei Objekterstellung" } }),
                Object.assign(Object.assign({ topicId: 3, index: 5, difficulty: "easy", name: "Kapselung", description: "Datenschutz" }, generateCoordinates()), { puzzleType: "encapsulation", puzzleData: { question: "Was bedeutet Kapselung in der OOP?", answer: "Daten verstecken", hint1: "Private Attribute und Methoden", hint2: "Zugriff nur über definierte Schnittstellen", points: 15,
                        explanation: "Kapselung versteckt interne Daten und ermöglicht kontrollierten Zugriff.", retryQuestion: "Welches Schlüsselwort macht Attribute privat?", retryAnswer: "private" } }),
                Object.assign(Object.assign({ topicId: 3, index: 6, difficulty: "easy", name: "Vererbung", description: "Klassen erweitern" }, generateCoordinates()), { puzzleType: "inheritance", puzzleData: { question: "Was ermöglicht Vererbung?", answer: "Eigenschaften übernehmen", hint1: "Kindklasse von Elternklasse", hint2: "extends in Java", points: 15,
                        explanation: "Vererbung ermöglicht es, Eigenschaften und Methoden einer Klasse zu übernehmen.", retryQuestion: "Wie nennt man die übergeordnete Klasse?", retryAnswer: "Superklasse" } }),
                Object.assign(Object.assign({ topicId: 3, index: 7, difficulty: "easy", name: "Polymorphismus", description: "Vielgestaltigkeit" }, generateCoordinates()), { puzzleType: "polymorphism", puzzleData: { question: "Was ist Polymorphismus?", answer: "gleiche Schnittstelle, verschiedenes Verhalten", hint1: "Methodenüberladung und -überschreibung", hint2: "Ein Interface, viele Implementierungen", points: 15,
                        explanation: "Polymorphismus ermöglicht es, dass Objekte verschiedener Klassen gleiche Methoden unterschiedlich implementieren.", retryQuestion: "Welche Art von Polymorphismus gibt es?", retryAnswer: "Überladung und Überschreibung" } }),
                Object.assign(Object.assign({ topicId: 3, index: 8, difficulty: "easy", name: "Abstraktion", description: "Vereinfachung" }, generateCoordinates()), { puzzleType: "abstraction", puzzleData: { question: "Was ist Abstraktion in der OOP?", answer: "Vereinfachung", hint1: "Weglassen unwichtiger Details", hint2: "Fokus auf das Wesentliche", points: 15,
                        explanation: "Abstraktion reduziert Komplexität durch Weglassen unwichtiger Details.", retryQuestion: "Was ist eine abstrakte Klasse?", retryAnswer: "unvollständige Klasse" } }),
                Object.assign(Object.assign({ topicId: 3, index: 9, difficulty: "easy", name: "Interface", description: "Verträge definieren" }, generateCoordinates()), { puzzleType: "interface", puzzleData: { question: "Was definiert ein Interface?", answer: "Methodensignaturen", hint1: "Vertrag für Implementierung", hint2: "Ohne Implementierung", points: 15,
                        explanation: "Ein Interface definiert Methodensignaturen, die implementiert werden müssen.", retryQuestion: "Kann ein Interface Methoden implementieren?", retryAnswer: "nein" } })
            ];
            const oopMedium = [
                Object.assign(Object.assign({ topicId: 3, index: 0, difficulty: "medium", name: "Design Patterns", description: "Bewährte Lösungen" }, generateCoordinates()), { puzzleType: "patterns", puzzleData: { question: "Was ist das Singleton Pattern?", answer: "nur eine Instanz", hint1: "Genau ein Objekt einer Klasse", hint2: "Globaler Zugriffspunkt", points: 25,
                        explanation: "Das Singleton Pattern stellt sicher, dass eine Klasse nur eine Instanz hat.", retryQuestion: "Welches Pattern trennt Objekt von seiner Darstellung?", retryAnswer: "Observer" } }),
                Object.assign(Object.assign({ topicId: 3, index: 1, difficulty: "medium", name: "Factory Pattern", description: "Objekterstellung" }, generateCoordinates()), { puzzleType: "factory", puzzleData: { question: "Was macht das Factory Pattern?", answer: "Objekte erstellen", hint1: "Kapselt Objekterstellung", hint2: "Entscheidet welche Klasse instanziiert wird", points: 25,
                        explanation: "Das Factory Pattern kapselt die Objekterstellung und entscheidet zur Laufzeit, welche Klasse verwendet wird.", retryQuestion: "Warum ist Factory Pattern nützlich?", retryAnswer: "lose Kopplung" } }),
                Object.assign(Object.assign({ topicId: 3, index: 2, difficulty: "medium", name: "Observer Pattern", description: "Benachrichtigungen" }, generateCoordinates()), { puzzleType: "observer", puzzleData: { question: "Wofür wird das Observer Pattern verwendet?", answer: "Benachrichtigungen", hint1: "Ein Objekt informiert viele", hint2: "Lose Kopplung zwischen Objekten", points: 25,
                        explanation: "Das Observer Pattern ermöglicht es einem Objekt, andere über Änderungen zu benachrichtigen.", retryQuestion: "Wie nennt man die benachrichtigten Objekte?", retryAnswer: "Observer" } }),
                Object.assign(Object.assign({ topicId: 3, index: 3, difficulty: "medium", name: "Strategy Pattern", description: "Austauschbare Algorithmen" }, generateCoordinates()), { puzzleType: "strategy", puzzleData: { question: "Was ermöglicht das Strategy Pattern?", answer: "Algorithmen austauschen", hint1: "Verschiedene Implementierungen zur Laufzeit", hint2: "Kapselt Algorithmen in eigene Klassen", points: 25,
                        explanation: "Das Strategy Pattern ermöglicht es, Algorithmen zur Laufzeit auszutauschen.", retryQuestion: "Welches OOP-Prinzip nutzt Strategy?", retryAnswer: "Polymorphismus" } }),
                Object.assign(Object.assign({ topicId: 3, index: 4, difficulty: "medium", name: "Decorator Pattern", description: "Objekte erweitern" }, generateCoordinates()), { puzzleType: "decorator", puzzleData: { question: "Was macht das Decorator Pattern?", answer: "Funktionalität hinzufügen", hint1: "Ohne Vererbung erweitern", hint2: "Zur Laufzeit anpassbar", points: 25,
                        explanation: "Das Decorator Pattern fügt Objekten dynamisch neue Funktionalität hinzu.", retryQuestion: "Ist Decorator flexibler als Vererbung?", retryAnswer: "ja" } }),
                Object.assign(Object.assign({ topicId: 3, index: 5, difficulty: "medium", name: "Adapter Pattern", description: "Inkompatible Interfaces" }, generateCoordinates()), { puzzleType: "adapter", puzzleData: { question: "Wofür wird das Adapter Pattern verwendet?", answer: "Interfaces anpassen", hint1: "Inkompatible Klassen verbinden", hint2: "Wrapper um bestehende Klasse", points: 25,
                        explanation: "Das Adapter Pattern ermöglicht die Zusammenarbeit inkompatibler Interfaces.", retryQuestion: "Ist ein Adapter ein Wrapper?", retryAnswer: "ja" } }),
                Object.assign(Object.assign({ topicId: 3, index: 6, difficulty: "medium", name: "Command Pattern", description: "Anfragen kapseln" }, generateCoordinates()), { puzzleType: "command", puzzleData: { question: "Was kapselt das Command Pattern?", answer: "Anfragen", hint1: "Aktionen als Objekte", hint2: "Ermöglicht Undo/Redo", points: 25,
                        explanation: "Das Command Pattern kapselt Anfragen als Objekte und ermöglicht deren Verwaltung.", retryQuestion: "Welche Funktionalität ermöglicht Command?", retryAnswer: "Undo" } }),
                Object.assign(Object.assign({ topicId: 3, index: 7, difficulty: "medium", name: "MVC Pattern", description: "Architektur trennen" }, generateCoordinates()), { puzzleType: "mvc", puzzleData: { question: "Wofür steht MVC?", answer: "Model View Controller", hint1: "Trennt Daten, Darstellung und Logik", hint2: "Architekturmuster", points: 25,
                        explanation: "MVC trennt Anwendungslogik in Model (Daten), View (Darstellung) und Controller (Steuerung).", retryQuestion: "Welcher Teil verwaltet die Daten?", retryAnswer: "Model" } }),
                Object.assign(Object.assign({ topicId: 3, index: 8, difficulty: "medium", name: "Dependency Injection", description: "Abhängigkeiten verwalten" }, generateCoordinates()), { puzzleType: "di", puzzleData: { question: "Was ist Dependency Injection?", answer: "Abhängigkeiten von außen", hint1: "Objekte werden injiziert", hint2: "Reduziert Kopplung", points: 25,
                        explanation: "Dependency Injection übergibt Abhängigkeiten von außen statt sie intern zu erstellen.", retryQuestion: "Was verbessert DI?", retryAnswer: "Testbarkeit" } }),
                Object.assign(Object.assign({ topicId: 3, index: 9, difficulty: "medium", name: "SOLID Prinzipien", description: "Design-Grundsätze" }, generateCoordinates()), { puzzleType: "solid", puzzleData: { question: "Wofür steht das S in SOLID?", answer: "Single Responsibility", hint1: "Eine Klasse, eine Aufgabe", hint2: "Jede Klasse hat nur einen Grund zur Änderung", points: 25,
                        explanation: "Single Responsibility besagt, dass jede Klasse nur eine Verantwortlichkeit haben sollte.", retryQuestion: "Wofür steht das O in SOLID?", retryAnswer: "Open/Closed" } })
            ];
            const oopHard = [
                Object.assign(Object.assign({ topicId: 3, index: 0, difficulty: "hard", name: "Metaprogramming", description: "Code über Code" }, generateCoordinates()), { puzzleType: "meta", puzzleData: { question: "Was ist Metaprogramming?", answer: "Programme schreiben Programme", hint1: "Code zur Laufzeit ändern", hint2: "Reflection und Introspection", points: 40,
                        explanation: "Metaprogramming ermöglicht es Programmen, andere Programme oder sich selbst zu modifizieren.", retryQuestion: "Was ist Reflection?", retryAnswer: "Laufzeit-Inspektion" } }),
                Object.assign(Object.assign({ topicId: 3, index: 1, difficulty: "hard", name: "Aspect-Oriented Programming", description: "Querschnittsfunktionen" }, generateCoordinates()), { puzzleType: "aop", puzzleData: { question: "Was löst AOP?", answer: "Cross-cutting Concerns", hint1: "Logging, Security über mehrere Klassen", hint2: "Trennt Geschäftslogik von technischen Aspekten", points: 40,
                        explanation: "AOP separiert Querschnittsfunktionen wie Logging von der Hauptgeschäftslogik.", retryQuestion: "Was sind Pointcuts in AOP?", retryAnswer: "Eingriffspunkte" } }),
                Object.assign(Object.assign({ topicId: 3, index: 2, difficulty: "hard", name: "Domain-Driven Design", description: "Fachlichkeit im Fokus" }, generateCoordinates()), { puzzleType: "ddd", puzzleData: { question: "Was ist das Herzstück von DDD?", answer: "Domain Model", hint1: "Fachliche Domäne steht im Zentrum", hint2: "Ubiquitous Language", points: 40,
                        explanation: "DDD stellt die fachliche Domäne ins Zentrum der Softwareentwicklung.", retryQuestion: "Was ist Ubiquitous Language?", retryAnswer: "gemeinsame Sprache" } }),
                Object.assign(Object.assign({ topicId: 3, index: 3, difficulty: "hard", name: "Event Sourcing", description: "Ereignisse speichern" }, generateCoordinates()), { puzzleType: "event-sourcing", puzzleData: { question: "Was speichert Event Sourcing?", answer: "Ereignisse statt Zustand", hint1: "Komplette Historie verfügbar", hint2: "Zustand durch Replay rekonstruierbar", points: 40,
                        explanation: "Event Sourcing speichert alle Änderungen als Ereignisse statt den aktuellen Zustand.", retryQuestion: "Wie rekonstruiert man den Zustand?", retryAnswer: "Event Replay" } }),
                Object.assign(Object.assign({ topicId: 3, index: 4, difficulty: "hard", name: "CQRS", description: "Command Query Separation" }, generateCoordinates()), { puzzleType: "cqrs", puzzleData: { question: "Was trennt CQRS?", answer: "Lesen und Schreiben", hint1: "Commands ändern Zustand", hint2: "Queries lesen Daten", points: 40,
                        explanation: "CQRS trennt Lese- und Schreiboperationen in separate Modelle.", retryQuestion: "Was sind Commands in CQRS?", retryAnswer: "Schreibbefehle" } }),
                Object.assign(Object.assign({ topicId: 3, index: 5, difficulty: "hard", name: "Microservices", description: "Kleine Services" }, generateCoordinates()), { puzzleType: "microservices", puzzleData: { question: "Was charakterisiert Microservices?", answer: "kleine, unabhängige Services", hint1: "Single Responsibility auf Service-Ebene", hint2: "Dezentrale Datenhaltung", points: 40,
                        explanation: "Microservices sind kleine, unabhängig deploybare Services mit eigener Datenhaltung.", retryQuestion: "Welches Problem lösen Microservices?", retryAnswer: "Monolith-Komplexität" } }),
                Object.assign(Object.assign({ topicId: 3, index: 6, difficulty: "hard", name: "Reactive Programming", description: "Asynchrone Datenströme" }, generateCoordinates()), { puzzleType: "reactive", puzzleData: { question: "Was sind Observables in Reactive Programming?", answer: "asynchrone Datenströme", hint1: "Push-basierte Sequenzen", hint2: "Observer Pattern für asynchrone Daten", points: 40,
                        explanation: "Observables repräsentieren asynchrone Datenströme in der reaktiven Programmierung.", retryQuestion: "Was ist der Unterschied zu Iterables?", retryAnswer: "Push statt Pull" } }),
                Object.assign(Object.assign({ topicId: 3, index: 7, difficulty: "hard", name: "Functional OOP", description: "Funktional und objektorientiert" }, generateCoordinates()), { puzzleType: "functional-oop", puzzleData: { question: "Was kombiniert Functional OOP?", answer: "Funktionale und OO Paradigmen", hint1: "Immutable Objects", hint2: "Higher-Order Functions in Objekten", points: 40,
                        explanation: "Functional OOP kombiniert funktionale Konzepte wie Unveränderlichkeit mit OOP.", retryQuestion: "Was sind Immutable Objects?", retryAnswer: "unveränderliche Objekte" } }),
                Object.assign(Object.assign({ topicId: 3, index: 8, difficulty: "hard", name: "Type Systems", description: "Typsicherheit" }, generateCoordinates()), { puzzleType: "types", puzzleData: { question: "Was ist der Unterschied zwischen statischer und dynamischer Typisierung?", answer: "Zeitpunkt der Typprüfung", hint1: "Compile-time vs Runtime", hint2: "Java vs Python", points: 40,
                        explanation: "Statische Typisierung prüft Typen zur Compile-Zeit, dynamische zur Laufzeit.", retryQuestion: "Was ist starke Typisierung?", retryAnswer: "strikte Typregeln" } }),
                Object.assign(Object.assign({ topicId: 3, index: 9, difficulty: "hard", name: "Memory Management", description: "Speicherverwaltung" }, generateCoordinates()), { puzzleType: "memory", puzzleData: { question: "Was ist Garbage Collection?", answer: "automatische Speicherfreigabe", hint1: "Nicht mehr referenzierte Objekte", hint2: "Mark and Sweep Algorithm", points: 40,
                        explanation: "Garbage Collection gibt automatisch Speicher von nicht mehr referenzierten Objekten frei.", retryQuestion: "Was sind Memory Leaks?", retryAnswer: "nicht freigegebener Speicher" } })
            ];
            // THEMA 4: TECHNISCHE INFORMATIK - Mit zufälligen Koordinaten
            const technicalEasy = Array.from({ length: 10 }, (_, i) => (Object.assign(Object.assign({ topicId: 4, index: i, difficulty: "easy", name: `Binärtechnik ${i + 1}`, description: "Digitale Grundlagen" }, generateCoordinates()), { puzzleType: "binary", puzzleData: {
                    question: `Was ist ${i % 2 ? '1 AND 0' : '1 OR 0'}?`,
                    answer: `${i % 2 ? '0' : '1'}`,
                    hint1: `${i % 2 ? 'AND braucht beide 1' : 'OR braucht mindestens eine 1'}`,
                    hint2: "Logische Verknüpfung", points: 15,
                    explanation: `${i % 2 ? 'AND gibt nur 1 aus wenn beide Eingänge 1 sind' : 'OR gibt 1 aus wenn mindestens ein Eingang 1 ist'}.`,
                    retryQuestion: "Was ist ein Bit?", retryAnswer: "kleinste Informationseinheit"
                } })));
            const technicalMedium = Array.from({ length: 10 }, (_, i) => (Object.assign(Object.assign({ topicId: 4, index: i, difficulty: "medium", name: `Prozessortechnik ${i + 1}`, description: "Hardware-Architektur" }, generateCoordinates()), { puzzleType: "hardware", puzzleData: {
                    question: `Was macht die ${i % 3 === 0 ? 'ALU' : i % 3 === 1 ? 'CPU' : 'GPU'}?`,
                    answer: `${i % 3 === 0 ? 'Berechnungen' : i % 3 === 1 ? 'Befehle ausführen' : 'Grafik berechnen'}`,
                    hint1: `${i % 3 === 0 ? 'Arithmetic Logic Unit' : i % 3 === 1 ? 'Central Processing Unit' : 'Graphics Processing Unit'}`,
                    hint2: "Wichtige Hardware-Komponente", points: 25,
                    explanation: `Die ${i % 3 === 0 ? 'ALU führt arithmetische und logische Operationen aus' : i % 3 === 1 ? 'CPU ist das Herzstück des Computers' : 'GPU ist spezialisiert auf parallele Berechnungen'}.`,
                    retryQuestion: "Was ist ein Prozessorkern?", retryAnswer: "Ausführungseinheit"
                } })));
            const technicalHard = Array.from({ length: 10 }, (_, i) => (Object.assign(Object.assign({ topicId: 4, index: i, difficulty: "hard", name: `Compilerbau ${i + 1}`, description: "Übersetzer-Technik" }, generateCoordinates()), { puzzleType: "compiler", puzzleData: {
                    question: `Was macht die ${i % 4 === 0 ? 'lexikalische Analyse' : i % 4 === 1 ? 'syntaktische Analyse' : i % 4 === 2 ? 'semantische Analyse' : 'Codegenerierung'}?`,
                    answer: `${i % 4 === 0 ? 'Token erkennen' : i % 4 === 1 ? 'Syntax prüfen' : i % 4 === 2 ? 'Bedeutung prüfen' : 'Maschinencode erzeugen'}`,
                    hint1: `${i % 4 === 0 ? 'Zerlegung in Grundelemente' : i % 4 === 1 ? 'Grammatik überprüfen' : i % 4 === 2 ? 'Typen und Gültigkeit' : 'Zielcode erstellen'}`,
                    hint2: "Compiler-Phase", points: 40,
                    explanation: `${i % 4 === 0 ? 'Lexikalische Analyse zerlegt Quellcode in Token' : i % 4 === 1 ? 'Syntaktische Analyse prüft die Grammatik' : i % 4 === 2 ? 'Semantische Analyse prüft Bedeutung und Typen' : 'Codegenerierung erzeugt den Zielcode'}.`,
                    retryQuestion: "Was ist ein Token?", retryAnswer: "Grundelement der Sprache"
                } })));
            // THEMA 5: DATENBANKEN - Mit zufälligen Koordinaten
            const databaseEasy = Array.from({ length: 10 }, (_, i) => (Object.assign(Object.assign({ topicId: 5, index: i, difficulty: "easy", name: `SQL Grundlagen ${i + 1}`, description: "Datenbankabfragen" }, generateCoordinates()), { puzzleType: "sql", puzzleData: {
                    question: `Welcher SQL-Befehl ${i % 3 === 0 ? 'holt Daten' : i % 3 === 1 ? 'fügt Daten ein' : 'löscht Daten'}?`,
                    answer: `${i % 3 === 0 ? 'SELECT' : i % 3 === 1 ? 'INSERT' : 'DELETE'}`,
                    hint1: `${i % 3 === 0 ? 'Auswählen' : i % 3 === 1 ? 'Einfügen' : 'Entfernen'}`,
                    hint2: "SQL-Grundbefehl", points: 15,
                    explanation: `${i % 3 === 0 ? 'SELECT holt Daten aus Tabellen' : i % 3 === 1 ? 'INSERT fügt neue Datensätze ein' : 'DELETE entfernt Datensätze'}.`,
                    retryQuestion: "Was ist eine Tabelle?", retryAnswer: "strukturierte Datensammlung"
                } })));
            const databaseMedium = Array.from({ length: 10 }, (_, i) => (Object.assign(Object.assign({ topicId: 5, index: i, difficulty: "medium", name: `Datenbank-Design ${i + 1}`, description: "Normalisierung" }, generateCoordinates()), { puzzleType: "design", puzzleData: {
                    question: `Was verhindert die ${i % 3 === 0 ? 'erste' : i % 3 === 1 ? 'zweite' : 'dritte'} Normalform?`,
                    answer: `${i % 3 === 0 ? 'Wiederholungsgruppen' : i % 3 === 1 ? 'partielle Abhängigkeiten' : 'transitive Abhängigkeiten'}`,
                    hint1: `${i % 3 === 0 ? 'Atomare Werte' : i % 3 === 1 ? 'Voll funktional abhängig' : 'Nur vom Primärschlüssel abhängig'}`,
                    hint2: "Normalisierungsregel", points: 25,
                    explanation: `Die ${i % 3 === 0 ? 'erste NF verlangt atomare Werte' : i % 3 === 1 ? 'zweite NF eliminiert partielle Abhängigkeiten' : 'dritte NF eliminiert transitive Abhängigkeiten'}.`,
                    retryQuestion: "Was ist ein Primärschlüssel?", retryAnswer: "eindeutiger Bezeichner"
                } })));
            const databaseHard = Array.from({ length: 10 }, (_, i) => (Object.assign(Object.assign({ topicId: 5, index: i, difficulty: "hard", name: `NoSQL & BigData ${i + 1}`, description: "Moderne Datenbanken" }, generateCoordinates()), { puzzleType: "nosql", puzzleData: {
                    question: `Was charakterisiert ${i % 4 === 0 ? 'Document Stores' : i % 4 === 1 ? 'Key-Value Stores' : i % 4 === 2 ? 'Column Stores' : 'Graph Databases'}?`,
                    answer: `${i % 4 === 0 ? 'JSON-ähnliche Dokumente' : i % 4 === 1 ? 'Einfache Schlüssel-Wert-Paare' : i % 4 === 2 ? 'Spaltenorientierte Speicherung' : 'Knoten und Kanten'}`,
                    hint1: `${i % 4 === 0 ? 'MongoDB, CouchDB' : i % 4 === 1 ? 'Redis, DynamoDB' : i % 4 === 2 ? 'Cassandra, HBase' : 'Neo4j, ArangoDB'}`,
                    hint2: "NoSQL-Kategorie", points: 40,
                    explanation: `${i % 4 === 0 ? 'Document Stores speichern strukturierte Dokumente' : i % 4 === 1 ? 'Key-Value Stores sind die einfachste NoSQL-Form' : i % 4 === 2 ? 'Column Stores optimieren für Analysen' : 'Graph DBs modellieren Beziehungen'}.`,
                    retryQuestion: "Was ist CAP-Theorem?", retryAnswer: "Consistency, Availability, Partition tolerance"
                } })));
            // THEMA 6: WEBENTWICKLUNG - Kompakte Versionen
            const webEasy = Array.from({ length: 10 }, (_, i) => ({
                topicId: 6, index: i, difficulty: "easy", name: `HTML/CSS ${i + 1}`, description: "Web-Grundlagen",
                puzzleType: "web",
                puzzleData: {
                    question: `Welcher ${i % 3 === 0 ? 'HTML-Tag' : i % 3 === 1 ? 'CSS-Selektor' : 'HTTP-Status'} ist richtig?`,
                    answer: `${i % 3 === 0 ? 'h1' : i % 3 === 1 ? '.class' : '200'}`,
                    hint1: `${i % 3 === 0 ? 'Überschrift' : i % 3 === 1 ? 'Klassen-Selektor' : 'Erfolg'}`,
                    hint2: `${i % 3 === 0 ? 'Heading 1' : i % 3 === 1 ? 'Punkt vor Klassenname' : 'OK Status'}`, points: 15,
                    explanation: `${i % 3 === 0 ? 'h1 ist der HTML-Tag für die größte Überschrift' : i % 3 === 1 ? '.class selektiert Elemente mit CSS-Klasse' : 'HTTP 200 bedeutet Erfolg'}.`,
                    retryQuestion: "Was ist HTTP?", retryAnswer: "HyperText Transfer Protocol"
                }
            }));
            const webMedium = Array.from({ length: 10 }, (_, i) => ({
                topicId: 6, index: i, difficulty: "medium", name: `JavaScript/Framework ${i + 1}`, description: "Interaktive Webanwendungen",
                puzzleType: "javascript",
                puzzleData: {
                    question: `Was ist ${i % 4 === 0 ? 'DOM' : i % 4 === 1 ? 'AJAX' : i % 4 === 2 ? 'JSON' : 'SPA'}?`,
                    answer: `${i % 4 === 0 ? 'Document Object Model' : i % 4 === 1 ? 'Asynchronous JavaScript' : i % 4 === 2 ? 'JavaScript Object Notation' : 'Single Page Application'}`,
                    hint1: `${i % 4 === 0 ? 'HTML-Baum im Speicher' : i % 4 === 1 ? 'Ohne Seitenreload' : i % 4 === 2 ? 'Datenformat' : 'Eine Seite, viele Ansichten'}`,
                    hint2: `${i % 4 === 0 ? 'Programmatisch änderbar' : i % 4 === 1 ? 'XMLHttpRequest' : i % 4 === 2 ? 'Schlüssel-Wert-Paare' : 'Client-seitiges Routing'}`, points: 25,
                    explanation: `${i % 4 === 0 ? 'DOM ist die Programmschnittstelle für HTML' : i % 4 === 1 ? 'AJAX ermöglicht asynchrone Datenübertragung' : i % 4 === 2 ? 'JSON ist ein leichtgewichtiges Datenformat' : 'SPAs laden einmal und ändern dann nur Inhalte'}.`,
                    retryQuestion: "Was ist ein Framework?", retryAnswer: "Programmiergerüst"
                }
            }));
            const webHard = Array.from({ length: 10 }, (_, i) => ({
                topicId: 6, index: i, difficulty: "hard", name: `Web-Architektur ${i + 1}`, description: "Skalierbare Systeme",
                puzzleType: "architecture",
                puzzleData: {
                    question: `Was ist ${i % 4 === 0 ? 'Load Balancing' : i % 4 === 1 ? 'CDN' : i % 4 === 2 ? 'Caching' : 'Sharding'}?`,
                    answer: `${i % 4 === 0 ? 'Last verteilen' : i % 4 === 1 ? 'Content Delivery Network' : i % 4 === 2 ? 'Zwischenspeichern' : 'Daten aufteilen'}`,
                    hint1: `${i % 4 === 0 ? 'Mehrere Server' : i % 4 === 1 ? 'Geografisch verteilt' : i % 4 === 2 ? 'Schnellerer Zugriff' : 'Horizontale Partitionierung'}`,
                    hint2: `${i % 4 === 0 ? 'Hochverfügbarkeit' : i % 4 === 1 ? 'Akamai, CloudFlare' : i % 4 === 2 ? 'Redis, Memcached' : 'Datenbank-Aufteilung'}`, points: 40,
                    explanation: `${i % 4 === 0 ? 'Load Balancer verteilen Anfragen auf mehrere Server' : i % 4 === 1 ? 'CDNs bringen Inhalte näher zum Nutzer' : i % 4 === 2 ? 'Caching reduziert Ladezeiten durch Zwischenspeicherung' : 'Sharding teilt große Datenbanken auf mehrere Server auf'}.`,
                    retryQuestion: "Was ist Microservices?", retryAnswer: "kleine unabhängige Services"
                }
            }));
            // THEMA 7: GESELLSCHAFTLICHE ASPEKTE - Kompakte Versionen
            const societyEasy = Array.from({ length: 10 }, (_, i) => ({
                topicId: 7, index: i, difficulty: "easy", name: `Datenschutz ${i + 1}`, description: "Grundrechte digital",
                puzzleType: "privacy",
                puzzleData: {
                    question: `Was regelt die ${i % 3 === 0 ? 'DSGVO' : i % 3 === 1 ? 'BDSG' : 'ePrivacy-Verordnung'}?`,
                    answer: `${i % 3 === 0 ? 'EU-Datenschutz' : i % 3 === 1 ? 'deutsches Datenschutzrecht' : 'elektronische Kommunikation'}`,
                    hint1: `${i % 3 === 0 ? 'General Data Protection Regulation' : i % 3 === 1 ? 'Bundesdatenschutzgesetz' : 'Cookies und E-Mail'}`,
                    hint2: `${i % 3 === 0 ? 'Seit 2018' : i % 3 === 1 ? 'Nationale Umsetzung' : 'Ergänzt DSGVO'}`, points: 15,
                    explanation: `${i % 3 === 0 ? 'DSGVO regelt Datenschutz in der EU seit 2018' : i % 3 === 1 ? 'BDSG ist das deutsche Datenschutzgesetz' : 'ePrivacy regelt spezielle Bereiche wie Cookies'}.`,
                    retryQuestion: "Was sind personenbezogene Daten?", retryAnswer: "identifizierbare Personeninformationen"
                }
            }));
            const societyMedium = Array.from({ length: 10 }, (_, i) => ({
                topicId: 7, index: i, difficulty: "medium", name: `Digitale Ethik ${i + 1}`, description: "Verantwortung in der IT",
                puzzleType: "ethics",
                puzzleData: {
                    question: `Was ist ${i % 4 === 0 ? 'Algorithmic Bias' : i % 4 === 1 ? 'Filter Bubble' : i % 4 === 2 ? 'Digital Divide' : 'Surveillance Capitalism'}?`,
                    answer: `${i % 4 === 0 ? 'Algorithmus-Voreingenommenheit' : i % 4 === 1 ? 'Informationsblase' : i % 4 === 2 ? 'digitale Kluft' : 'Überwachungskapitalismus'}`,
                    hint1: `${i % 4 === 0 ? 'Unfaire KI-Entscheidungen' : i % 4 === 1 ? 'Personalisierte Inhalte' : i % 4 === 2 ? 'Ungleicher Technologiezugang' : 'Daten als Geschäftsmodell'}`,
                    hint2: `${i % 4 === 0 ? 'Diskriminierende Algorithmen' : i % 4 === 1 ? 'Echo Chamber' : i % 4 === 2 ? 'Digital Gap' : 'Shoshana Zuboff'}`, points: 25,
                    explanation: `${i % 4 === 0 ? 'Algorithmic Bias führt zu unfairen, diskriminierenden Entscheidungen' : i % 4 === 1 ? 'Filter Bubbles isolieren Nutzer in Informationsblasen' : i % 4 === 2 ? 'Digital Divide beschreibt ungleichen Zugang zu Technologie' : 'Surveillance Capitalism macht Überwachung zum Geschäftsmodell'}.`,
                    retryQuestion: "Was ist KI-Ethik?", retryAnswer: "verantwortliche KI-Entwicklung"
                }
            }));
            const societyHard = Array.from({ length: 10 }, (_, i) => ({
                topicId: 7, index: i, difficulty: "hard", name: `Digitale Souveränität ${i + 1}`, description: "Technologische Unabhängigkeit",
                puzzleType: "sovereignty",
                puzzleData: {
                    question: `Was bedroht ${i % 4 === 0 ? 'digitale Souveränität' : i % 4 === 1 ? 'Technologiesouveränität' : i % 4 === 2 ? 'Datensouveränität' : 'KI-Souveränität'}?`,
                    answer: `${i % 4 === 0 ? 'Abhängigkeit von Tech-Giganten' : i % 4 === 1 ? 'fehlende eigene Technologien' : i % 4 === 2 ? 'Datenabfluss ins Ausland' : 'ausländische KI-Systeme'}`,
                    hint1: `${i % 4 === 0 ? 'GAFAM-Dominanz' : i % 4 === 1 ? 'Keine europäischen Alternativen' : i % 4 === 2 ? 'CLOUD Act, FISA' : 'China und USA dominieren'}`,
                    hint2: `${i % 4 === 0 ? 'Vendor Lock-in' : i % 4 === 1 ? 'Eigene Chip-Produktion' : i % 4 === 2 ? 'GAIA-X Initiative' : 'Europäische KI-Strategie'}`, points: 40,
                    explanation: `${i % 4 === 0 ? 'Digitale Souveränität erfordert Unabhängigkeit von ausländischen Tech-Konzernen' : i % 4 === 1 ? 'Technologiesouveränität bedeutet eigene Schlüsseltechnologien' : i % 4 === 2 ? 'Datensouveränität verlangt Kontrolle über eigene Daten' : 'KI-Souveränität braucht eigene KI-Entwicklung und -Standards'}.`,
                    retryQuestion: "Was ist GAIA-X?", retryAnswer: "europäische Cloud-Initiative"
                }
            }));
            allPoints.push(...algorithmEasy, ...algorithmMedium, ...algorithmHard, ...dataStructuresEasy, ...dataStructuresMedium, ...dataStructuresHard, ...oopEasy, ...oopMedium, ...oopHard, ...technicalEasy, ...technicalMedium, ...technicalHard, ...databaseEasy, ...databaseMedium, ...databaseHard, ...webEasy, ...webMedium, ...webHard, ...societyEasy, ...societyMedium, ...societyHard);
            // Alle Punkte zur Datenbank hinzufügen
            for (const point of allPoints) {
                yield this.createPoint(point);
            }
        });
    }
    // User methods
    getUser(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.users.get(id);
        });
    }
    getUserByUsername(username) {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.users.values()).find((user) => user.username === username);
        });
    }
    createUser(insertUser) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = this.currentUserId++;
            const user = Object.assign(Object.assign({}, insertUser), { id });
            this.users.set(id, user);
            return user;
        });
    }
    // Topic methods
    getAllTopics() {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.topics.values()).sort((a, b) => a.order - b.order);
        });
    }
    getTopic(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.topics.get(id);
        });
    }
    createTopic(insertTopic) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = this.currentTopicId++;
            const topic = Object.assign(Object.assign({}, insertTopic), { id });
            this.topics.set(id, topic);
            return topic;
        });
    }
    // Topic progress methods
    getTopicProgress(userId, topicId, difficulty) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = `${userId}-${topicId}-${difficulty}`;
            return this.topicProgress.get(key);
        });
    }
    getUserTopicProgress(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.topicProgress.values()).filter(progress => progress.userId === userId);
        });
    }
    createTopicProgress(insertProgress) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = this.currentProgressId++;
            const progress = Object.assign(Object.assign({}, insertProgress), { id, createdAt: new Date() });
            const key = `${insertProgress.userId}-${insertProgress.topicId}-${insertProgress.difficulty}`;
            this.topicProgress.set(key, progress);
            return progress;
        });
    }
    updateTopicProgress(userId, topicId, difficulty, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = `${userId}-${topicId}-${difficulty}`;
            const existing = this.topicProgress.get(key);
            if (!existing)
                return undefined;
            const updated = Object.assign(Object.assign({}, existing), updates);
            this.topicProgress.set(key, updated);
            return updated;
        });
    }
    // Game state methods
    getGameState(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.gameStates.values()).find((state) => state.userId === userId);
        });
    }
    createGameState(insertGameState) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const id = this.currentGameStateId++;
            const now = new Date();
            const gameState = {
                id,
                userId: insertGameState.userId,
                selectedTopicId: (_a = insertGameState.selectedTopicId) !== null && _a !== void 0 ? _a : null,
                selectedDifficulty: (_b = insertGameState.selectedDifficulty) !== null && _b !== void 0 ? _b : "easy",
                currentPointIndex: (_c = insertGameState.currentPointIndex) !== null && _c !== void 0 ? _c : 0,
                playerPosition: (_d = insertGameState.playerPosition) !== null && _d !== void 0 ? _d : null,
                createdAt: now,
                updatedAt: now
            };
            this.gameStates.set(id, gameState);
            return gameState;
        });
    }
    updateGameState(userId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingState = yield this.getGameState(userId);
            if (!existingState)
                return undefined;
            const updatedState = Object.assign(Object.assign(Object.assign({}, existingState), updates), { updatedAt: new Date() });
            this.gameStates.set(existingState.id, updatedState);
            return updatedState;
        });
    }
    // Points of interest methods
    getAllPoints() {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.pointsOfInterest.values()).sort((a, b) => a.index - b.index);
        });
    }
    getPointsByTopicAndDifficulty(topicId, difficulty) {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.pointsOfInterest.values())
                .filter((point) => point.topicId === topicId && point.difficulty === difficulty)
                .sort((a, b) => a.index - b.index);
        });
    }
    getPoint(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.pointsOfInterest.get(id);
        });
    }
    createPoint(insertPoint) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const id = this.currentPointId++;
            const point = {
                id,
                topicId: insertPoint.topicId,
                index: insertPoint.index,
                difficulty: insertPoint.difficulty,
                name: insertPoint.name,
                description: (_a = insertPoint.description) !== null && _a !== void 0 ? _a : null,
                latitude: insertPoint.latitude,
                longitude: insertPoint.longitude,
                puzzleType: insertPoint.puzzleType,
                puzzleData: insertPoint.puzzleData
            };
            this.pointsOfInterest.set(id, point);
            return point;
        });
    }
    // Puzzle attempts
    createPuzzleAttempt(insertAttempt) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const id = this.currentAttemptId++;
            const attempt = {
                id,
                userId: insertAttempt.userId,
                pointId: insertAttempt.pointId,
                answer: insertAttempt.answer,
                isCorrect: insertAttempt.isCorrect,
                hintsUsed: (_a = insertAttempt.hintsUsed) !== null && _a !== void 0 ? _a : 0,
                gaveUp: (_b = insertAttempt.gaveUp) !== null && _b !== void 0 ? _b : false,
                completedRetry: (_c = insertAttempt.completedRetry) !== null && _c !== void 0 ? _c : false,
                createdAt: new Date()
            };
            this.puzzleAttempts.set(id, attempt);
            return attempt;
        });
    }
    getPuzzleAttempts(userId, pointId) {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.puzzleAttempts.values()).filter((attempt) => attempt.userId === userId && attempt.pointId === pointId);
        });
    }
}
exports.MemStorage = MemStorage;
exports.storage = new MemStorage();

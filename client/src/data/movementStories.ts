/**
 * Bewegungsgeschichten – Klassiker nach der Idee von Ch. Walther / S. Verlemann (WIMASU):
 * https://wimasu.de/bewegungsgeschichten-fuer-sportlehrkraefte/
 * Je Zeile: Erzählung (links vorlesen) · Bewegung (rechts, kurz für die Gruppe).
 */

export type MovementStoryBeat = {
  narration: string;
  movement: string;
};

export type MovementStory = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
  beats: MovementStoryBeat[];
};

/** Statische Bilder unter `client/public/movement-stories/`.
 * Für einzelne Themen werden externe, themenbezogene Bilder verwendet, falls lokale Assets nicht passen.
 */
const img = (file: string) => {
  const base = (process.env.PUBLIC_URL ?? '').replace(/\/$/, '');
  return `${base}/movement-stories/${file}`;
};

export const MOVEMENT_STORIES: MovementStory[] = [
  {
    id: 'pferderennen',
    title: 'Pferderennen',
    subtitle: 'Rennbahn, Zuschauer:innen, Parcours – dann das Rennen nur noch per Kommando',
    imageUrl:
      'https://images.unsplash.com/photo-1755972202476-3d66ad4964c0?fm=jpg&q=60&w=1200&auto=format&fit=crop',
    imageAlt: 'Pferde bei einem Rennen auf einer Rennbahn',
    beats: [
      {
        narration:
          '„Willkommen auf der Rennbahn. Heute erleben wir einen spannenden Renntag bei hervorragendem Wetter. Die Stimmung ist zum Bersten gespannt.“',
        movement: 'Kreis bilden, kurz in die Hände klatschen – Stimmung aufbauen.',
      },
      {
        narration:
          '„Vor dem Rennen gehen die Pferde vor der Haupttribüne auf und ab und stellen sich den Zuschauer:innen vor.“',
        movement: 'Abwechselnd in die Hände klatschen, dann ruhig auf die Oberschenkel.',
      },
      {
        narration: '„Die Zuschauer:innen begrüßen die Pferde und Reiter:innen.“',
        movement: 'Leichter Applaus.',
      },
      {
        narration:
          'Kommando „Tribüne“: Die Damen und Herren auf den Sitzplätzen begrüßen die Pferde und Reiter:innen euphorisch.',
        movement: 'Beide Hände heben, laut kreischen, La-Ola-Welle machen.',
      },
      {
        narration: 'Kommando „Ehrentribüne“: Die Damen und Herren begrüßen die Pferde.',
        movement: 'Gemäßigter, langsamer Applaus.',
      },
      {
        narration: 'Kommando „Letzte Reihe“: Die letzte Reihe verfolgt das Rennen mit Ferngläsern.',
        movement: 'Hände als „Fernglas“ vor die Augen, von links nach rechts schauen.',
      },
      {
        narration: '„Die Pferde gehen in die Startboxen und kommen dort langsam zur Ruhe.“',
        movement: 'Langsam auf die Oberschenkel klatschen, bis es verebbt.',
      },
      {
        narration: 'Kommando „Kameras“: Die Kameraleute beginnen zu filmen und zu fotografieren.',
        movement: 'Pantomimisch filmen bzw. Fotos machen (Handy hoch oder alte Kamera).',
      },
      {
        narration:
          '„Nun wird ein Probelauf durch die Hindernisse des Parcours gemacht und dabei erklärt, wie diese zu überwinden sind.“',
        movement: 'Kurz auf der Stelle „trampeln“, dann Aufmerksamkeit auf die Kommandos.',
      },
      {
        narration: 'Kommando „Galopp“: Pferde rennen im Galopp.',
        movement: 'Schnell auf die Oberschenkel klatschen und auf der Stelle rennen.',
      },
      {
        narration: 'Kommando „Rechtskurve“: Es geht weiter in die erste Rechtskurve.',
        movement:
          'Wie Galopp; Oberkörper nach rechts neigen oder im Kreis nach rechts laufen.',
      },
      {
        narration: 'Kommando „Linkskurve“: Es folgt eine Linkskurve.',
        movement:
          'Wie Galopp; Oberkörper nach links neigen oder im Kreis nach links laufen.',
      },
      {
        narration: 'Kommando „Holzbrücke“: Die Pferde laufen über eine Holzbrücke.',
        movement: 'Mit den Fäusten auf die Brust schlagen und „Brücke“ rufen.',
      },
      {
        narration: 'Kommando „Gras“: Die Pferde laufen über ein Grasstück.',
        movement: 'Hände aneinander reiben.',
      },
      {
        narration: 'Kommando „Ochser“: Das erste Hindernis, ein sogenannter Ochser, wird übersprungen.',
        movement: 'Mit beiden Armen Übersprung zeigen, hochspringen, „Hui“ rufen.',
      },
      {
        narration:
          'Kommando „Doppel-Ochser“: Das nächste Hindernis, ein Doppel-Ochser, wird übersprungen.',
        movement: 'Zweimal hintereinander überspringen, jedes Mal „Hui“.',
      },
      {
        narration:
          'Kommando „Doppelkurve“: Eine Linkskurve, direkt gefolgt von einer Rechtskurve.',
        movement:
          'Galopp auf der Stelle, Oberkörper schnell nacheinander nach links und rechts neigen.',
      },
      {
        narration: 'Kommando „Wassergraben“: Ein Wassergraben muss überwunden werden.',
        movement:
          'Eine Hand die Nase zuhalten, mit Fingern der anderen Hand Blubberblasen am Mund.',
      },
      {
        narration: 'Kommando „Überholen“: Im Rennen wird ein Pferd überholt.',
        movement: 'Zunge raus, zur Seite gehen, nach hinten schauen.',
      },
      {
        narration: 'Kommando „Sieger:innenfoto“: Der/Die Gewinner:in möchte gut im Bild sein!',
        movement: 'Übertrieben grinsen und Victory-Zeichen.',
      },
      {
        narration: 'Sonderkommando „Hufeisen verloren“: Das Pferd verliert ein Hufeisen.',
        movement: 'Mit dem Finger im Mund ein „Flopp“-Geräusch machen.',
      },
      {
        narration:
          'Jetzt das eigentliche Rennen: Nur noch Kommandos rufen – schnell und deutlich. Kommandos variieren und wiederholen (z. B. „Galopp“, „Rechtskurve“), dazu neue Ideen wie „Vierer-Ochser“ oder „Zielgerade“. In der Halle ggf. auf Socken, damit es nicht zu laut wird – oder kniend/sitzend mit Händen auf Boden oder Tisch.',
        movement:
          'Parcours-Kommandos im schnellen Wechsel; wer mag, kommentiert dazwischen.',
      },
    ],
  },
  {
    id: 'elefantenwaschen',
    title: 'Elefantenwaschen',
    subtitle: 'Tierpfleger:innen – Eimer, Leiter, schrubben, abspritzen, trockenreiben',
    imageUrl:
      'https://images.unsplash.com/photo-1756216275478-36de3865d226?fm=jpg&q=60&w=1200&auto=format&fit=crop',
    imageAlt: 'Elefant am Wasser beim Baden',
    beats: [
      {
        narration:
          '„Stellt euch vor, ihr seid Tierpfleger:innen und eure Aufgabe ist es heute, den Elefanten zu waschen. In diesem Sinne: los geht’s.“',
        movement: 'Kreis, alle schauen in die Mitte – Start.',
      },
      {
        narration: '„Guten Morgen! Es ist ein toller Tag. Aufstehen, Zähne putzen, frühstücken!“',
        movement: 'Strecken, Zahnputzbewegungen, ein Müsli löffeln.',
      },
      {
        narration: '„Dann die Elefantenwaschklamotten anziehen.“',
        movement: 'Pantomimisch Schuhe, Jacke, Hose und Mütze anziehen.',
      },
      {
        narration: '„Auf geht es zum Elefanten.“',
        movement: 'Auf der Stelle gehen.',
      },
      {
        narration: '„Wir schließen die Tür zum Gehege auf.“',
        movement: 'Tür aufschließen und aufmachen.',
      },
      {
        narration: '„Wir begrüßen den Elefanten.“',
        movement: 'Winken.',
      },
      {
        narration:
          '„Wir merken, dass wir gar keinen Eimer dabei haben! Also wieder zurück durch die Tür und abschließen.“',
        movement: 'An die Stirn schlagen, Tür zu und abschließen.',
      },
      {
        narration:
          '„Wir gehen zum Schuppen und holen dort zwei Eimer mit Schwämmen, Wasser und einem Handtuch.“',
        movement: 'Auf der Stelle laufen, Eimer pantomimisch nehmen, weiterlaufen.',
      },
      {
        narration: '„Jetzt merken wir auch noch, dass wir die Leiter vergessen haben!“',
        movement: 'Eimer abstellen.',
      },
      {
        narration:
          '„Schnell zum Schuppen rennen, die Leiter auf die Schulter legen und zurück.“',
        movement: 'Schneller auf der Stelle laufen, Leiter schultern, noch schneller zurück.',
      },
      {
        narration: '„Endlich können wir alles zum Elefanten bringen.“',
        movement: 'Eimer abstellen, Leiter aufstellen, „Uff“ sagen.',
      },
      {
        narration:
          '„Nun beginnen wir den Elefanten zu waschen. Erstmal nass machen. Erst mit dem Schwamm das Wasser über den Rücken, den Kopf und über alle vier Beine verteilen.“',
        movement: 'Sechsmal Schwamm in den Eimer tauchen und über dem Elefanten ausdrücken.',
      },
      {
        narration: '„Anschließend schön einschäumen und rubbeln. Alles der Reihe nach …“',
        movement: 'Kräftig reiben – dann auf die Kommandos warten.',
      },
      {
        narration: 'Kommando „Linkes Bein hinten“',
        movement: 'Zur linken Seite gehen, mit beiden Händen kräftig hoch und runter wischen.',
      },
      {
        narration: 'Kommando „Rechtes Bein hinten“',
        movement: 'Zur rechten Seite gehen, mit beiden Händen hoch und runter wischen.',
      },
      {
        narration: 'Kommando „Linkes Bein vorne“',
        movement: 'Zur linken Seite, wie oben.',
      },
      {
        narration: 'Kommando „Rechtes Bein vorne“',
        movement: 'Zur rechten Seite, wie oben.',
      },
      {
        narration: 'Kommando „Unter dem Bauch“',
        movement: 'Auf den Rücken legen, über Kopf mit beiden Händen wischen.',
      },
      {
        narration:
          'Kommando „Rücken“: Auf die Leiter steigen und den Rücken schrubben, wieder absteigen nicht vergessen.',
        movement: 'Ein paar Schritte auf der Stelle, mit beiden Händen nach unten wischen, wieder Schritte.',
      },
      {
        narration: 'Kommando „Rüssel“: Zum Schluss noch den Rüssel schrubben.',
        movement: 'Mit beiden Händen seitlich hoch und runter wischen.',
      },
      {
        narration: '„Abschließend nehmen wir den Gartenschlauch und spritzen den Elefant überall ab.“',
        movement: 'Gartenschlauch pantomimisch – abspritzen.',
      },
      {
        narration:
          '„Jetzt müssen wir den Elefanten nur noch mit dem Handtuch trockenreiben. Wieder der Reihe nach …“ (Kommandos wie beim Waschen, etwas mehr „Trocken-Rubbeln“.)',
        movement: 'Auf der Stelle gehen, dann: Linkes/rechtes Bein vorne/hinten, Bauch, Rücken wie oben – trocken reiben.',
      },
      {
        narration: '„Wir streicheln den Elefanten zum Abschied über den Kopf.“',
        movement: 'Streichelbewegung.',
      },
      {
        narration:
          '„Wir wünschen dem Elefanten einen schönen Tag und machen uns auf den Heimweg.“',
        movement: 'Winken, verabschieden – los auf die Piste 🙂',
      },
    ],
  },
  {
    id: 'loewenjagd',
    title: 'Löwenjagd',
    subtitle: 'Refrain, Hindernisse, Höhle – der Löwe bleibt am Leben; zurück wie hin',
    imageUrl: img('loewenjagd.jpg'),
    imageAlt: 'Löwe in der Savanne',
    beats: [
      {
        narration:
          'Refrain: „Gehen wir jetzt auf Löwenjagd? Ja, wir gehen auf Löwenjagd! HALT! Was ist das? Ist das der Löwe? NEIIIN, das ist … eine Wiese!“',
        movement: 'Stampfen oder auf die Oberschenkel klatschen, anhalten, Augen beschatten.',
      },
      {
        narration:
          '„Wir kommen nicht links vorbei, wir kommen nicht rechts vorbei, wir kommen nicht drüber, wir kommen nicht drunter, wir müssen mitten hindurch!“',
        movement: 'Hände nach links, rechts, oben, unten deuten – in die Mitte zeigen.',
      },
      {
        narration: 'Kommando „Durch die Wiese“',
        movement: 'Hände aneinander reiben, mit Blättern rascheln.',
      },
      {
        narration: '„Puhh geschafft!“',
        movement: 'Schweiß von der Stirn wischen.',
      },
      {
        narration:
          'Refrain wiederholen – nächstes Hindernis: „… das ist …“ (nicht der Löwe). Dann: Kommando „Durch den Teich“',
        movement: 'Wie Refrain; beim Teich: Klamotten pantomimisch ausziehen, auf den Kopf legen, schwimmen.',
      },
      {
        narration: 'Kommando „Durch den Sumpf“',
        movement: 'Schuhe/Socken „aus“, schmatzend auf der Stelle gehen, wieder anziehen.',
      },
      {
        narration: 'Kommando „Durch superdichtes Gras“',
        movement: 'Wie mit einer Machete vor sich schlagend gehen.',
      },
      {
        narration: 'Kommando „Über den Berg“',
        movement: 'Langsam hochlaufen, kurz Pause, schnell wieder runter.',
      },
      {
        narration: 'Kommando „In die dunkle Höhle“',
        movement: 'Taschenlampe an, schleichen.',
      },
      {
        narration:
          '„Wir sehen in der dunklen Höhle zwei funkelnde Augen, wir fühlen ein großes Maul, spitze Zähne, eine flauschige lange Mähne.“',
        movement: 'Zwei Finger zeigen, mit geschlossenen Augen tasten.',
      },
      {
        narration: '„AHHHHHH DER LÖWE!!“',
        movement: 'Schreien, auf den Löwen zeigen.',
      },
      {
        narration: '„Schnell wir müssen zurück!“ Kommando „Durch die Höhle“',
        movement: 'Hektisch auf der Stelle laufen.',
      },
      {
        narration: 'Kommando „Über den Berg“',
        movement: 'Langsam hinauf, schnell hinunter.',
      },
      {
        narration: 'Kommando „Durch superdichtes Gras“',
        movement: 'Hin und her schlagen.',
      },
      {
        narration: 'Kommando „Durch den Sumpf“',
        movement: 'Socken/Schuhe aus, Schmatzgeräusche, wieder an.',
      },
      {
        narration: 'Kommando „Durch den Teich“',
        movement: 'Schwimmbewegungen.',
      },
      {
        narration: 'Kommando „Durch die Wiese“',
        movement: 'Hände reiben / rascheln.',
      },
      {
        narration:
          '„Wir erreichen unser Haus und gehen hinein.“ „Puuuhhh geschafft! Fast hätten wir einen Löwen gefangen.“',
        movement: 'Tür auf- und zumachen, hinsetzen.',
      },
    ],
  },
];

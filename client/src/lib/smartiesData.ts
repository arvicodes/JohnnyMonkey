export type SmartieColorCard = { name: string; hex: string; question: string };

export const smartieVersion1: SmartieColorCard[] = [
  { name: 'Rot', hex: '#E53935', question: 'In welchem Fach wäre KI völlig überfordert?' },
  { name: 'Orange', hex: '#FB8C00', question: 'Welchen Lehrersatz müsste man KI erklären?' },
  { name: 'Gelb', hex: '#FDD835', question: 'Wegen welcher typischen Lehreraufgabe würde KI nach einer Woche kündigen?' },
  { name: 'Grün', hex: '#43A047', question: 'Wenn KI einen Elternabend moderieren müsste: Was könnte schiefgehen?' },
  { name: 'Blau', hex: '#1E88E5', question: 'Was wäre der schlimmste KI-Vorschlag für eine Klassenarbeit?' },
  { name: 'Violett', hex: '#8E24AA', question: 'Welche AG würde KI anbieten und niemand würde kommen?' },
  { name: 'Pink', hex: '#EC407A', question: 'Welche Zeugnisbemerkung würde KI viel zu ehrlich formulieren?' },
  { name: 'Braun', hex: '#6D4C41', question: 'Was wäre KIs Lieblingsort in der Schule?' },
];

export const smartieVersion2: SmartieColorCard[] = [
  { name: 'Rot', hex: '#E53935', question: 'Was wäre KIs Lieblingsort in der Schule?' },
  { name: 'Orange', hex: '#FB8C00', question: 'Welche Klassenfahrt würde KI aus Sicherheitsgründen absagen?' },
  { name: 'Gelb', hex: '#FDD835', question: 'Welche Ausrede würde KI nicht glauben?' },
  { name: 'Grün', hex: '#43A047', question: 'Was wäre KIs größter Fehler im Lehrerzimmer?' },
  { name: 'Blau', hex: '#1E88E5', question: 'Was würde KI als „pädagogisch wertvoll“ verkaufen?' },
  { name: 'Violett', hex: '#8E24AA', question: 'Was würde KI in der Pausenaufsicht melden?' },
  { name: 'Pink', hex: '#EC407A', question: 'Was wäre der peinlichste KI-Vorschlag für einen Elternabend?' },
  { name: 'Braun', hex: '#6D4C41', question: 'Welche Sitzordnung würde KI vorschlagen?' },
];

export const defaultSmartieCustomMix = (): SmartieColorCard[] =>
  smartieVersion1.map((card, index) => ({
    ...card,
    question: smartieVersion2[index]?.question ?? card.question,
  }));

export function normalizeSmartieCards(cards: SmartieColorCard[]): SmartieColorCard[] {
  if (!Array.isArray(cards) || cards.length !== 8) return defaultSmartieCustomMix();
  return cards.map((card, index) => ({
    name: smartieVersion1[index]?.name ?? card.name,
    hex: smartieVersion1[index]?.hex ?? card.hex,
    question: String(card.question ?? '').trim() || smartieVersion1[index].question,
  }));
}

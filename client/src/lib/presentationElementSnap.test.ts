import { snapElementMove } from './presentationElementSnap';

describe('snapElementMove', () => {
  const box = { id: 'a', x: 40, y: 30, w: 20, h: 10 };

  it('rastet die Mitte an der Folienmitte ein', () => {
    const almost = { ...box, x: 40.8 };
    const snapped = snapElementMove(almost, []);
    expect(snapped.x).toBeCloseTo(40, 5);
    expect(snapped.guides.some((g) => g.axis === 'x' && g.kind === 'center' && !g.preview && g.pos === 50)).toBe(
      true,
    );
  });

  it('bevorzugt Folienmitte gegenüber einem nahen anderen Element', () => {
    const peer = { id: 'b', x: 41.2, y: 10, w: 20, h: 8 };
    const almostCenter = { ...box, x: 40.7 };
    const snapped = snapElementMove(almostCenter, [peer]);
    expect(snapped.x).toBeCloseTo(40, 5);
  });

  it('nutzt die Mitte der zweiten Seite', () => {
    const onPage2 = { id: 'a', x: 10, y: 145.4, w: 20, h: 10 };
    const snapped = snapElementMove(onPage2, [], { pageCount: 2, yMax: 200 });
    expect(snapped.y).toBeCloseTo(145, 5);
    expect(snapped.guides.some((g) => g.axis === 'y' && g.kind === 'center' && g.pos === 150 && !g.preview)).toBe(
      true,
    );
  });
});

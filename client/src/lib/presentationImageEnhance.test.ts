import { enhanceWorksheetRgba, enhanceWorksheetPercentile } from './presentationImageEnhance';

describe('enhanceWorksheetRgba', () => {
  it('liest Perzentil aus dem Histogramm', () => {
    const hist = new Uint32Array(256);
    hist[10] = 10;
    hist[200] = 90;
    expect(enhanceWorksheetPercentile(hist, 0.05)).toBe(10);
    expect(enhanceWorksheetPercentile(hist, 0.96)).toBe(200);
  });

  it('macht graues Papier weiß und dunkle Schrift dunkler', () => {
    const w = 4;
    const h = 4;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      const paper = i === 5;
      data[o] = paper ? 40 : 210;
      data[o + 1] = paper ? 40 : 210;
      data[o + 2] = paper ? 40 : 208;
      data[o + 3] = 255;
    }
    enhanceWorksheetRgba(data, w, h);
    expect(data[0]).toBeGreaterThan(240);
    expect(data[1]).toBeGreaterThan(240);
    expect(data[2]).toBeGreaterThan(240);
    expect(data[5 * 4]).toBeLessThan(80);
  });
});

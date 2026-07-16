export const circuitGeometry = {
  resistor: { halfBody: 18, halfHeight: 8, labelOffset: 13 },
  capacitor: { negativePlateOffset: 5, positivePlateOffset: 6, halfPlate: 12, labelOffset: 21 },
  battery: { negativePlateOffset: 5, positivePlateOffset: 6, negativeHalfPlate: 9, positiveHalfPlate: 15 },
  inductor: { halfBody: 20, halfHeight: 15, turns: 4, labelOffset: 19 },
  switch: { leftGap: 12, rightGap: 14, bladeLength: 12, bladeLift: 12 },
  meter: { radius: 15, labelBaseline: 5 },
  source: { radius: 16, glyphHalfLength: 8, labelOffset: 28 },
} as const;

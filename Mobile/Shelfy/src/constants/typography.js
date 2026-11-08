const regular = { fontFamily: 'BeVietnamPro', fontWeight: '400' };
const semibold = { fontFamily: 'BeVietnamPro-SemiBold', fontWeight: '600' };
const bold = { fontFamily: 'BeVietnamPro-Bold', fontWeight: '700' };

export const typography = {
  editorialLg: { fontFamily: 'Lora', fontWeight: '400', fontSize: 34, lineHeight: 45, letterSpacing: -0.8 },
  editorialMd: { fontFamily: 'Lora', fontWeight: '400', fontSize: 28, lineHeight: 38, letterSpacing: -0.5 },
  eyebrow: { ...semibold, fontSize: 10, lineHeight: 16, letterSpacing: 1.6 },
  // Display & Headlines
  displayLg: { ...bold, fontSize: 32, lineHeight: 42, letterSpacing: -0.5 },
  headlineLg: { ...bold, fontSize: 26, fontWeight: '700', lineHeight: 34, letterSpacing: -0.3 },
  headlineMd: { ...bold, fontSize: 22, fontWeight: '700', lineHeight: 30, letterSpacing: -0.2 },
  headlineSm: { ...semibold, fontSize: 20, fontWeight: '600', lineHeight: 28 },

  // Titles
  titleLg: { ...semibold, fontSize: 18, fontWeight: '600', lineHeight: 26 },
  titleMd: { ...semibold, fontSize: 16, fontWeight: '600', lineHeight: 24 },
  titleSm: { ...semibold, fontSize: 14, fontWeight: '600', lineHeight: 20 },

  // Body
  bodyLg: { ...regular, fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMd: { ...regular, fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodySm: { ...regular, fontSize: 12, fontWeight: '400', lineHeight: 16 },

  // Labels & Buttons
  labelLg: { ...semibold, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  labelMd: { ...semibold, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  labelSm: { ...semibold, fontSize: 11, fontWeight: '600', lineHeight: 16, letterSpacing: 0.2 },

  // Caption
  caption: { ...regular, fontSize: 11, fontWeight: '400', lineHeight: 14 },
};

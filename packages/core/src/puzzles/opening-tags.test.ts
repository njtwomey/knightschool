import { describe, expect, it } from 'vitest';
import { openingKey, openingTagsOf } from './opening-tags';

describe('openingTagsOf', () => {
  // Each expected pair is a tag pair that occurs in the puzzle database.
  it.each([
    ['Italian Game: Giuoco Piano, Pianissimo', 'Italian_Game', 'Italian_Game_Giuoco_Piano'],
    ['Italian Game: Giuoco Pianissimo', 'Italian_Game', 'Italian_Game_Giuoco_Pianissimo'],
    ['Italian Game', 'Italian_Game', 'Italian_Game_Other_variations'],
    ["King's Gambit Accepted: Salvio Gambit", 'Kings_Gambit_Accepted', 'Kings_Gambit_Accepted_Salvio_Gambit'],
    ['Caro-Kann Defense: Exchange Variation', 'Caro-Kann_Defense', 'Caro-Kann_Defense_Exchange_Variation'],
    [
      "King's Indian Defense: Semi-Averbakh System",
      'Kings_Indian_Defense',
      'Kings_Indian_Defense_Semi-Averbakh_System',
    ],
    ['Grünfeld Defense: Botvinnik Variation', 'Grunfeld_Defense', 'Grunfeld_Defense_Botvinnik_Variation'],
    [
      'Benko Gambit Declined: Hjørring Countergambit',
      'Benko_Gambit_Declined',
      'Benko_Gambit_Declined_Hjrring_Countergambit',
    ],
  ])('%s', (name, family, variation) => expect(openingTagsOf(name)).toEqual({ family, variation }));
});

describe('openingKey', () => {
  it('drops accents and punctuation and joins words with underscores', () => {
    expect(openingKey("  Queen's Pawn Game, Chigorin  ")).toBe('Queens_Pawn_Game_Chigorin');
  });
});

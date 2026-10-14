import { describe, expect, it } from 'vitest';
import { epdAfterPgn } from '../chess';
import { fenToEpd } from '../epd';
import { explainMotifs } from './motif';

const after = (pgn: string) => epdAfterPgn(pgn);
const fen = (text: string) => fenToEpd(text);
const texts = (epd: string, uci: string) => explainMotifs(epd, uci).map((explanation) => explanation.text);
const motifs = (epd: string, uci: string) => explainMotifs(epd, uci).flatMap((explanation) => explanation.motifs);

describe('hanging pieces', () => {
  // [name, position before the move, the move, the piece it names]
  const cases: [string, string, string, string][] = [
    ['queen takes a defended pawn', after('1. e4 e5 2. Qh5 Nc6'), 'h5e5', 'queen on e5'],
    ['knight takes a defended pawn', after('1. e4 e5 2. Nf3 Nc6'), 'f3e5', 'knight on e5'],
    [
      'knight takes a pawn and is lost',
      after('1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Nbd7 5. cxd5 exd5'),
      'c3d5',
      'knight on d5',
    ],
    ['queen grabs a pawn next to a bishop', after('1. e4 d5 2. exd5 Qxd5 3. Nc3'), 'd5g2', 'queen on g2'],
    ['knight walks into a queen', after('1. e4 e5 2. Nf3 d6 3. Bc4 Be6 4. Bxe6 fxe6'), 'f3g5', 'knight on g5'],
    [
      'queen takes a pawn guarded by a bishop, with check',
      fen('4k3/2b5/8/4p2Q/8/8/8/4K3 w - - 0 1'),
      'h5e5',
      'queen on e5',
    ],
    ['rook steps onto a bishop ray', fen('3bk3/8/8/3p4/8/8/8/R3K3 w - - 0 1'), 'a1a5', 'rook on a5'],
    ['knight steps in front of a pawn', fen('4k3/8/8/8/4n3/8/3P4/4K3 b - - 0 1'), 'e4c3', 'knight on c3'],
    ['queen steps onto a knight attack', fen('4k3/3q4/8/8/8/2N5/8/4K3 b - - 0 1'), 'd7b5', 'queen on b5'],
    ['bishop steps in front of a rook', fen('3rk3/8/8/8/8/8/8/4KB2 w - - 0 1'), 'f1d3', 'bishop on d3'],
  ];

  it.each(cases)('%s', (_name, position, uci, piece) => {
    const [first] = explainMotifs(position, uci).filter((explanation) => explanation.motifs.includes('hanging-piece'));
    expect(first?.text).toContain(piece);
    expect(first?.kind).toBe('why-bad');
    expect(first?.shapes?.length).toBeGreaterThan(0);
  });

  it.each([
    ['a quiet developing move', after(''), 'e2e4'],
    ['a knight whose square the queen cannot see', after('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6'), 'f3g5'],
    ['an even trade of bishop for knight', after('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6'), 'a4c6'],
    ['a trade with recapture by a pawn', after('1. d4 d5 2. Bg5 Nf6'), 'g5f6'],
  ])('does not report %s', (_name, position, uci) => {
    expect(motifs(position, uci)).not.toContain('hanging-piece');
  });

  it('says a lesser attacker can take a defended piece', () => {
    // Both rooks on the a-file, so the moved rook is defended, but a pawn attacks it.
    const [note] = explainMotifs(fen('4k3/8/8/8/1p6/8/R7/R3K3 w - - 0 1'), 'a2a3').filter((e) =>
      e.motifs.includes('hanging-piece'),
    );
    expect(note?.text).toBe('The rook on a3 can be taken by a pawn, which is worth less.');
  });

  it('says nothing protects an undefended piece', () => {
    const [note] = explainMotifs(fen('4k3/8/8/8/1p6/8/8/R3K3 w - - 0 1'), 'a1a3').filter((e) =>
      e.motifs.includes('hanging-piece'),
    );
    expect(note?.text).toBe('This leaves the rook on a3 hanging: nothing protects it.');
  });

  it('reports a checking piece that can simply be captured', () => {
    // Qxe5+ gives check, but the bishop answers it by taking the queen.
    const notes = explainMotifs(fen('4k3/2b5/8/4p2Q/8/8/8/4K3 w - - 0 1'), 'h5e5').filter((e) =>
      e.motifs.includes('hanging-piece'),
    );
    expect(notes).toHaveLength(1);
    expect(notes[0]?.text).toContain('queen on e5');
  });
});

describe('forks', () => {
  it('names both targets of a knight fork', () => {
    const [fork] = explainMotifs(fen('k2q3r/8/8/4N3/8/8/8/3RK3 w - - 0 1'), 'e5f7').filter((e) =>
      e.motifs.includes('fork'),
    );
    expect(fork?.text).toContain('knight on f7');
    expect(fork?.text).toContain('queen on d8');
    expect(fork?.text).toContain('rook on h8');
    expect(fork?.shapes).toEqual(expect.arrayContaining(['Rf7d8', 'Rf7h8']));
  });

  it('is not a fork when the forking piece is simply taken', () => {
    // Same fork, but the black king stands next to f7 and the knight is undefended.
    expect(motifs(fen('3q2kr/8/8/4N3/8/8/8/3RK3 w - - 0 1'), 'e5f7')).not.toContain('fork');
  });

  it('needs two targets', () => {
    expect(motifs(fen('k2q4/8/8/4N3/8/8/8/3RK3 w - - 0 1'), 'e5f7')).not.toContain('fork');
  });
});

describe('pins and skewers', () => {
  it('finds a pin to the king', () => {
    const [pin] = explainMotifs(fen('4k3/4n3/8/8/8/8/8/R6K w - - 0 1'), 'a1e1').filter((e) => e.motifs.includes('pin'));
    expect(pin?.text).toMatch(/Pins the knight on e7 to the king/);
  });

  it('finds a pin to a more valuable piece', () => {
    const [pin] = explainMotifs(fen('3qk3/8/8/8/3n4/8/8/R3K3 w - - 0 1'), 'a1d1').filter((e) =>
      e.motifs.includes('pin'),
    );
    expect(pin?.text).toBe('Pins the knight on d4 to the queen on d8: if it moves, the more valuable piece is lost.');
  });

  it('finds a skewer through the king', () => {
    const [skewer] = explainMotifs(fen('3k3q/8/8/8/8/8/8/R3K3 w - - 0 1'), 'a1a8').filter((e) =>
      e.motifs.includes('skewer'),
    );
    expect(skewer?.text).toMatch(/Skewers the king/);
    expect(skewer?.text).toContain('queen on h8');
  });

  it('does not report a pin that already existed', () => {
    const position = fen('4k3/4n3/8/8/8/8/R7/4RK2 w - - 0 1');
    expect(motifs(position, 'a2a3')).not.toContain('pin');
  });
});

describe('mate threats', () => {
  it('sees a back-rank mate threat', () => {
    const [threat] = explainMotifs(fen('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1'), 'h2h3').filter((e) =>
      e.motifs.includes('mate-threat'),
    );
    expect(threat?.text).toBe('Threatens mate in one with Ra8#.');
  });

  it('sees no threat in the opening', () => {
    expect(motifs(after(''), 'e2e4')).not.toContain('mate-threat');
  });
});

describe('captures', () => {
  it('names a free piece', () => {
    expect(texts(fen('4k3/8/8/3n4/8/8/8/3RK3 w - - 0 1'), 'd1d5')).toContain('Wins a free knight.');
  });

  it('names a favourable exchange', () => {
    expect(texts(fen('4k3/8/2p5/3q4/4P3/8/8/4K3 w - - 0 1'), 'e4d5')).toContain('Wins a queen for a pawn.');
  });
});

describe('other notes', () => {
  it('flags the attack on an undefended piece', () => {
    expect(texts(fen('4k3/8/2n5/8/8/8/8/3QK3 w - - 0 1'), 'd1d6')).toContain('Attacks the undefended knight on c6.');
  });

  it('flags a king move that gives up castling', () => {
    const [lost] = explainMotifs(after('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5'), 'e1f1').filter((e) =>
      e.motifs.includes('castling-lost'),
    );
    expect(lost?.text).toBe('Gives up the right to castle on either side.');
  });

  it('does not flag castling itself', () => {
    expect(motifs(after('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6'), 'e1g1')).not.toContain('castling-lost');
  });

  it('returns nothing for an illegal move and puts the most confident first', () => {
    expect(explainMotifs(after(''), 'e2e5')).toEqual([]);
    const all = explainMotifs(fen('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1'), 'a1a7');
    const confidences = all.map((e) => e.confidence);
    expect([...confidences].sort((a, b) => b - a)).toEqual(confidences);
  });
});

describe('pins of pawns', () => {
  it('are not worth a sentence: 3.Bc4 does not "pin the f7 pawn to the knight"', () => {
    expect(motifs(after('1. e4 e5 2. Nf3 Nc6'), 'f1c4')).not.toContain('pin');
  });
});

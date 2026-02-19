export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type PieceColor = 'white' | 'black';

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
  id: string;
  hasMoved?: boolean;
}

export type BoardCell = ChessPiece | null;
export type Board = BoardCell[][];

export interface Position {
  row: number;
  col: number;
}

export const PIECE_SYMBOLS: Record<PieceType, string> = {
  king: '♔',
  queen: '♕',
  rook: '♖',
  bishop: '♗',
  knight: '♘',
  pawn: '♙',
};

export function createInitialBoard(): Board {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));

  const backRow: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

  // Black pieces (top)
  backRow.forEach((type, col) => {
    board[0][col] = { type, color: 'black', id: `black-${type}-${col}` };
    board[1][col] = { type: 'pawn', color: 'black', id: `black-pawn-${col}` };
  });

  // White pieces (bottom)
  backRow.forEach((type, col) => {
    board[7][col] = { type, color: 'white', id: `white-${type}-${col}` };
    board[6][col] = { type: 'pawn', color: 'white', id: `white-pawn-${col}` };
  });

  return board;
}

export function getValidMoves(board: Board, pos: Position): Position[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  const moves: Position[] = [];
  const { row, col } = pos;

  const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const isEmpty = (r: number, c: number) => inBounds(r, c) && board[r][c] === null;
  const isEnemy = (r: number, c: number) => inBounds(r, c) && board[r][c] !== null && board[r][c]!.color !== piece.color;
  const canMoveTo = (r: number, c: number) => isEmpty(r, c) || isEnemy(r, c);

  const addSlidingMoves = (directions: [number, number][]) => {
    for (const [dr, dc] of directions) {
      let r = row + dr, c = col + dc;
      while (inBounds(r, c)) {
        if (isEmpty(r, c)) {
          moves.push({ row: r, col: c });
        } else if (isEnemy(r, c)) {
          moves.push({ row: r, col: c });
          break;
        } else {
          break;
        }
        r += dr;
        c += dc;
      }
    }
  };

  switch (piece.type) {
    case 'pawn': {
      const dir = piece.color === 'white' ? -1 : 1;
      const startRow = piece.color === 'white' ? 6 : 1;
      if (isEmpty(row + dir, col)) {
        moves.push({ row: row + dir, col });
        if (row === startRow && isEmpty(row + dir * 2, col)) {
          moves.push({ row: row + dir * 2, col });
        }
      }
      if (isEnemy(row + dir, col - 1)) moves.push({ row: row + dir, col: col - 1 });
      if (isEnemy(row + dir, col + 1)) moves.push({ row: row + dir, col: col + 1 });
      break;
    }
    case 'rook':
      addSlidingMoves([[0,1],[0,-1],[1,0],[-1,0]]);
      break;
    case 'bishop':
      addSlidingMoves([[1,1],[1,-1],[-1,1],[-1,-1]]);
      break;
    case 'queen':
      addSlidingMoves([[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]);
      break;
    case 'king': {
      const dirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
      dirs.forEach(([dr, dc]) => {
        if (inBounds(row+dr, col+dc) && canMoveTo(row+dr, col+dc)) {
          moves.push({ row: row+dr, col: col+dc });
        }
      });
      break;
    }
    case 'knight': {
      const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      knightMoves.forEach(([dr, dc]) => {
        if (inBounds(row+dr, col+dc) && canMoveTo(row+dr, col+dc)) {
          moves.push({ row: row+dr, col: col+dc });
        }
      });
      break;
    }
  }

  return moves;
}

export function isCapture(board: Board, from: Position, to: Position): boolean {
  return board[to.row][to.col] !== null && board[to.row][to.col]!.color !== board[from.row][from.col]!.color;
}

export function applyMove(board: Board, from: Position, to: Position): Board {
  const newBoard = board.map(row => [...row]);
  newBoard[to.row][to.col] = newBoard[from.row][from.col];
  newBoard[from.row][from.col] = null;
  // Pawn promotion
  if (newBoard[to.row][to.col]?.type === 'pawn') {
    if (to.row === 0 || to.row === 7) {
      newBoard[to.row][to.col] = { ...newBoard[to.row][to.col]!, type: 'queen' };
    }
  }
  return newBoard;
}

export function isKingCaptured(board: Board, color: PieceColor): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.type === 'king' && board[r][c]?.color === color) return false;
    }
  }
  return true;
}

export const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 100,
};

import { useState, useCallback } from 'react';
import ChessBoard3D from '@/components/ChessBoard3D';
import FPSBattle from '@/components/FPSBattle';
import {
  Board, Position, ChessPiece,
  createInitialBoard, getValidMoves, isCapture, applyMove, isKingCaptured
} from '@/game/chessLogic';

type GameMode = 'chess' | 'battle' | 'gameover';

interface BattlePending {
  from: Position;
  to: Position;
  attacker: ChessPiece;
  defender: ChessPiece;
}

export default function Index() {
  const [board, setBoard] = useState<Board>(createInitialBoard);
  const [currentTurn, setCurrentTurn] = useState<'white' | 'black'>('white');
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [captureMoves, setCaptureMoves] = useState<Position[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>('chess');
  const [battlePending, setBattlePending] = useState<BattlePending | null>(null);
  const [winner, setWinner] = useState<'white' | 'black' | null>(null);
  const [capturedWhite, setCapturedWhite] = useState<ChessPiece[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<ChessPiece[]>([]);
  const [message, setMessage] = useState('White to move — Click a piece to begin');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  const PIECE_SYMBOLS: Record<string, string> = {
    king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟',
  };

  const handleSquareClick = useCallback((pos: Position) => {
    if (gameMode !== 'chess') return;

    const piece = board[pos.row][pos.col];

    // If we have a selection
    if (selectedPos) {
      const isMoveValid = validMoves.some(m => m.row === pos.row && m.col === pos.col) ||
        captureMoves.some(m => m.row === pos.row && m.col === pos.col);

      if (isMoveValid) {
        const fromPiece = board[selectedPos.row][selectedPos.col]!;
        const capture = isCapture(board, selectedPos, pos);

        if (capture) {
          const defender = board[pos.row][pos.col]!;
          // Trigger FPS battle!
          setBattlePending({ from: selectedPos, to: pos, attacker: fromPiece, defender });
          setGameMode('battle');
          setSelectedPos(null);
          setValidMoves([]);
          setCaptureMoves([]);
          setMessage(`⚔️ BATTLE! ${fromPiece.color} ${fromPiece.type} vs ${defender.color} ${defender.type}`);
        } else {
          // Normal move
          const newBoard = applyMove(board, selectedPos, pos);
          const fromRow = String.fromCharCode(65 + selectedPos.col) + (8 - selectedPos.row);
          const toRow = String.fromCharCode(65 + pos.col) + (8 - pos.row);
          setMoveHistory(prev => [...prev, `${fromPiece.color[0].toUpperCase()} ${fromPiece.type}: ${fromRow}→${toRow}`]);
          setBoard(newBoard);
          setCurrentTurn(t => t === 'white' ? 'black' : 'white');
          setSelectedPos(null);
          setValidMoves([]);
          setCaptureMoves([]);
          const next = currentTurn === 'white' ? 'black' : 'white';
          setMessage(`${next.charAt(0).toUpperCase() + next.slice(1)} to move`);
        }
        return;
      }

      // Clicking own piece: reselect
      if (piece && piece.color === currentTurn) {
        selectPiece(pos, piece);
        return;
      }

      // Deselect
      setSelectedPos(null);
      setValidMoves([]);
      setCaptureMoves([]);
      return;
    }

    // Select a piece
    if (piece && piece.color === currentTurn) {
      selectPiece(pos, piece);
    }
  }, [board, selectedPos, validMoves, captureMoves, currentTurn, gameMode]);

  const selectPiece = (pos: Position, piece: ChessPiece) => {
    const moves = getValidMoves(board, pos);
    const captures = moves.filter(m => isCapture(board, pos, m));
    const nonCaptures = moves.filter(m => !isCapture(board, pos, m));
    setSelectedPos(pos);
    setValidMoves(nonCaptures);
    setCaptureMoves(captures);
    setMessage(`${piece.color} ${piece.type} selected — ${moves.length} move${moves.length !== 1 ? 's' : ''} available`);
  };

  const handleBattleEnd = useCallback((attackerWins: boolean) => {
    if (!battlePending) return;
    const { from, to, attacker, defender } = battlePending;

    const fromLabel = String.fromCharCode(65 + from.col) + (8 - from.row);
    const toLabel = String.fromCharCode(65 + to.col) + (8 - to.row);

    if (attackerWins) {
      const newBoard = applyMove(board, from, to);
      if (attacker.color === 'white') {
        setCapturedWhite(prev => [...prev, defender]);
      } else {
        setCapturedBlack(prev => [...prev, defender]);
      }
      setMoveHistory(prev => [...prev, `${attacker.color[0].toUpperCase()} ${attacker.type} ×${defender.type}: ${fromLabel}→${toLabel} ✓`]);

      if (isKingCaptured(newBoard, defender.color)) {
        setBoard(newBoard);
        setWinner(attacker.color);
        setGameMode('gameover');
        setMessage(`${attacker.color.toUpperCase()} WINS! The ${defender.color} king has fallen!`);
      } else {
        setBoard(newBoard);
        const next = currentTurn === 'white' ? 'black' : 'white';
        setCurrentTurn(next);
        setGameMode('chess');
        setMessage(`Capture successful! ${next.charAt(0).toUpperCase() + next.slice(1)} to move`);
      }
    } else {
      // Defender wins — piece stays
      setMoveHistory(prev => [...prev, `${attacker.color[0].toUpperCase()} ${attacker.type} ×${defender.type}: ${fromLabel}→${toLabel} ✗`]);
      const next = currentTurn === 'white' ? 'black' : 'white';
      setCurrentTurn(next);
      setGameMode('chess');
      setMessage(`${defender.color} ${defender.type} repelled the attack! ${next.charAt(0).toUpperCase() + next.slice(1)} to move`);
    }

    setBattlePending(null);
  }, [battlePending, board, currentTurn]);

  const resetGame = () => {
    setBoard(createInitialBoard());
    setCurrentTurn('white');
    setSelectedPos(null);
    setValidMoves([]);
    setCaptureMoves([]);
    setGameMode('chess');
    setBattlePending(null);
    setWinner(null);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setMessage('White to move — Click a piece to begin');
    setMoveHistory([]);
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border"
        style={{ background: 'linear-gradient(90deg, hsl(220 25% 7%), hsl(220 20% 9%))' }}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">♟</span>
          <div>
            <h1 className="font-chess text-xl text-gold leading-none">Battle Chess 3D</h1>
            <p className="font-fps text-xs text-muted-foreground tracking-widest">TACTICAL WARFARE EDITION</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="font-fps text-sm px-4 py-2 rounded border"
            style={{
              borderColor: currentTurn === 'white' ? 'hsl(var(--gold))' : 'hsl(220 70% 60%)',
              color: currentTurn === 'white' ? 'hsl(var(--gold))' : 'hsl(220 70% 70%)',
              background: currentTurn === 'white' ? 'hsl(var(--gold) / 0.1)' : 'hsl(220 70% 60% / 0.1)',
            }}>
            {currentTurn === 'white' ? '○' : '●'} {currentTurn.toUpperCase()}'S TURN
          </div>
          <button onClick={resetGame}
            className="font-fps text-xs tracking-widest px-3 py-2 rounded border border-border text-muted-foreground hover:border-gold hover:text-gold transition-all uppercase">
            New Game
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chess Board */}
        <div className="flex-1 relative">
          <ChessBoard3D
            board={board}
            selectedPos={selectedPos}
            validMoves={validMoves}
            captureMoves={captureMoves}
            onSquareClick={handleSquareClick}
            currentTurn={currentTurn}
          />

          {/* Status message */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-fps text-sm px-6 py-2 rounded"
            style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid hsl(var(--gold)/0.4)', color: 'hsl(var(--gold))' }}>
            {message}
          </div>

          {/* Game over overlay */}
          {gameMode === 'gameover' && (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.85)' }}>
              <div className="flex flex-col items-center gap-6 p-12 border border-gold rounded-xl"
                style={{ background: 'linear-gradient(135deg, hsl(220 25% 7%), hsl(38 30% 8%))', boxShadow: '0 0 60px hsl(var(--gold)/0.4)' }}>
                <div className="text-7xl">♛</div>
                <h2 className="font-chess text-5xl text-gold">CHECKMATE</h2>
                <p className="font-fps text-xl text-foreground tracking-widest">
                  {winner?.toUpperCase()} WINS
                </p>
                <button onClick={resetGame}
                  className="font-fps tracking-widest px-8 py-3 rounded border border-gold text-gold hover:bg-gold/20 transition-all uppercase">
                  Play Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-52 flex flex-col border-l border-border overflow-y-auto"
          style={{ background: 'linear-gradient(180deg, hsl(220 25% 7%), hsl(220 20% 6%))' }}>

          {/* Captured pieces */}
          <div className="p-3 border-b border-border">
            <div className="font-fps text-xs text-muted-foreground mb-2 tracking-widest">CAPTURED</div>
            <div className="space-y-2">
              <div>
                <div className="font-fps text-xs text-gold mb-1">White took:</div>
                <div className="flex flex-wrap gap-1">
                  {capturedWhite.map((p, i) => (
                    <span key={i} className="text-lg" style={{ color: 'hsl(220 70% 70%)' }}>
                      {PIECE_SYMBOLS[p.type]}
                    </span>
                  ))}
                  {capturedWhite.length === 0 && <span className="font-fps text-xs text-muted-foreground">—</span>}
                </div>
              </div>
              <div>
                <div className="font-fps text-xs text-gold mb-1">Black took:</div>
                <div className="flex flex-wrap gap-1">
                  {capturedBlack.map((p, i) => (
                    <span key={i} className="text-lg" style={{ color: 'hsl(38 60% 75%)' }}>
                      {PIECE_SYMBOLS[p.type]}
                    </span>
                  ))}
                  {capturedBlack.length === 0 && <span className="font-fps text-xs text-muted-foreground">—</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Move history */}
          <div className="p-3 flex-1">
            <div className="font-fps text-xs text-muted-foreground mb-2 tracking-widest">MOVE LOG</div>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {moveHistory.slice(-20).map((m, i) => (
                <div key={i} className="font-fps text-xs py-1 px-2 rounded"
                  style={{
                    background: 'hsl(220 15% 10%)',
                    color: m.includes('✓') ? 'hsl(var(--fps-green))' : m.includes('✗') ? 'hsl(var(--fps-red))' : 'hsl(var(--muted-foreground))'
                  }}>
                  {i + 1}. {m}
                </div>
              ))}
              {moveHistory.length === 0 && (
                <div className="font-fps text-xs text-muted-foreground">No moves yet</div>
              )}
            </div>
          </div>

          {/* Battle hint */}
          <div className="p-3 border-t border-border">
            <div className="font-fps text-xs text-fps-red/80 text-center">
              ⚔ Capture = FPS Battle!<br />
              <span className="text-muted-foreground">Win to take the piece</span>
            </div>
          </div>
        </aside>
      </div>

      {/* FPS Battle overlay */}
      {gameMode === 'battle' && battlePending && (
        <FPSBattle
          attackingPiece={battlePending.attacker}
          defendingPiece={battlePending.defender}
          onBattleEnd={handleBattleEnd}
        />
      )}
    </div>
  );
}

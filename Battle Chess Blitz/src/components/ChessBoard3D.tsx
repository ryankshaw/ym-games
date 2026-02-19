import { useRef, useState } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Board, Position, ChessPiece, PieceType } from '@/game/chessLogic';

interface SquareProps {
  row: number;
  col: number;
  isLight: boolean;
  isSelected: boolean;
  isValidMove: boolean;
  isCapture: boolean;
  onClick: () => void;
}

function Square({ row, col, isLight, isSelected, isValidMove, isCapture, onClick }: SquareProps) {
  const x = col - 3.5;
  const z = row - 3.5;

  let color = isLight ? '#c8a97a' : '#3a4a6a';
  if (isSelected) color = '#f0d060';
  else if (isCapture) color = '#e04040';
  else if (isValidMove) color = '#60d060';

  return (
    <group position={[x, 0, z]}>
      <mesh onClick={onClick} receiveShadow>
        <boxGeometry args={[0.98, 0.15, 0.98]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={isSelected ? 0.3 : 0.1} />
      </mesh>
      {(isSelected || isValidMove || isCapture) && (
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[0.98, 0.01, 0.98]} />
          <meshStandardMaterial
            color={isCapture ? '#ff3333' : isSelected ? '#ffee00' : '#33ff33'}
            transparent
            opacity={0.6}
            emissive={isCapture ? '#ff0000' : isSelected ? '#ffaa00' : '#00ff00'}
            emissiveIntensity={0.8}
          />
        </mesh>
      )}
    </group>
  );
}

interface PieceMeshProps {
  piece: ChessPiece;
  position: [number, number, number];
  isSelected: boolean;
  onClick: () => void;
}

function PieceMesh({ piece, position, isSelected, onClick }: PieceMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const isWhite = piece.color === 'white';

  useFrame((state) => {
    if (groupRef.current && isSelected) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.08 + 0.08;
    } else if (groupRef.current) {
      groupRef.current.position.y = position[1];
    }
  });

  const baseColor = isWhite ? '#f0e8d0' : '#1a1a2e';
  const emissive = isSelected ? (isWhite ? '#aa8800' : '#4466ff') : '#000000';
  const emissiveIntensity = isSelected ? 0.5 : 0;

  const PieceShape = () => {
    switch (piece.type) {
      case 'pawn':
        return (
          <group>
            <mesh position={[0, 0.1, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.22, 0.08, 16]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.6} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
            <mesh position={[0, 0.22, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.18, 0.18, 16]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.6} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
            <mesh position={[0, 0.38, 0]} castShadow>
              <sphereGeometry args={[0.14, 16, 16]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.6} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
          </group>
        );
      case 'rook':
        return (
          <group>
            <mesh position={[0, 0.1, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.26, 0.08, 16]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.6} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
            <mesh position={[0, 0.3, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.22, 0.35, 16]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.6} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
            <mesh position={[0, 0.52, 0]} castShadow>
              <boxGeometry args={[0.38, 0.12, 0.38]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.6} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
          </group>
        );
      case 'knight':
        return (
          <group>
            <mesh position={[0, 0.1, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.24, 0.08, 16]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.6} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
            <mesh position={[0, 0.28, 0]} castShadow>
              <cylinderGeometry args={[0.13, 0.2, 0.28, 16]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.6} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
            <mesh position={[0.05, 0.5, 0]} castShadow rotation={[0.3, 0, 0.2]}>
              <boxGeometry args={[0.2, 0.28, 0.14]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.6} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
            <mesh position={[0.06, 0.64, 0.08]} castShadow>
              <sphereGeometry args={[0.1, 12, 12]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.6} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
          </group>
        );
      case 'bishop':
        return (
          <group>
            <mesh position={[0, 0.1, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.24, 0.08, 16]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.6} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
            <mesh position={[0, 0.3, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.2, 0.32, 16]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.6} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
            <mesh position={[0, 0.52, 0]} castShadow>
              <sphereGeometry args={[0.13, 16, 16]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.6} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
            <mesh position={[0, 0.68, 0]} castShadow>
              <coneGeometry args={[0.05, 0.15, 8]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.6} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
          </group>
        );
      case 'queen':
        return (
          <group>
            <mesh position={[0, 0.1, 0]} castShadow>
              <cylinderGeometry args={[0.24, 0.28, 0.1, 16]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.7} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
            <mesh position={[0, 0.32, 0]} castShadow>
              <cylinderGeometry args={[0.12, 0.24, 0.3, 16]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.7} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
            <mesh position={[0, 0.55, 0]} castShadow>
              <sphereGeometry args={[0.17, 16, 16]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.7} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
            {[0,1,2,3,4].map(i => (
              <mesh key={i} position={[Math.cos(i/5*Math.PI*2)*0.12, 0.78, Math.sin(i/5*Math.PI*2)*0.12]} castShadow>
                <sphereGeometry args={[0.045, 8, 8]} />
                <meshStandardMaterial color={isWhite ? '#d4a017' : '#8844ff'} emissive={isWhite ? '#d4a017' : '#6622cc'} emissiveIntensity={0.5} />
              </mesh>
            ))}
          </group>
        );
      case 'king':
        return (
          <group>
            <mesh position={[0, 0.1, 0]} castShadow>
              <cylinderGeometry args={[0.24, 0.28, 0.1, 16]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.8} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
            <mesh position={[0, 0.35, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.24, 0.32, 16]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.8} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
            <mesh position={[0, 0.58, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.14, 0.1, 16]} />
              <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.8} emissive={emissive} emissiveIntensity={emissiveIntensity} />
            </mesh>
            {/* Cross */}
            <mesh position={[0, 0.82, 0]} castShadow>
              <boxGeometry args={[0.06, 0.28, 0.06]} />
              <meshStandardMaterial color={isWhite ? '#d4a017' : '#cc3333'} emissive={isWhite ? '#aa8800' : '#990000'} emissiveIntensity={0.6} />
            </mesh>
            <mesh position={[0, 0.9, 0]} castShadow>
              <boxGeometry args={[0.18, 0.06, 0.06]} />
              <meshStandardMaterial color={isWhite ? '#d4a017' : '#cc3333'} emissive={isWhite ? '#aa8800' : '#990000'} emissiveIntensity={0.6} />
            </mesh>
          </group>
        );
      default:
        return null;
    }
  };

  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      <PieceShape />
    </group>
  );
}

interface ChessBoard3DProps {
  board: Board;
  selectedPos: Position | null;
  validMoves: Position[];
  captureMoves: Position[];
  onSquareClick: (pos: Position) => void;
  currentTurn: 'white' | 'black';
}

export default function ChessBoard3D({ board, selectedPos, validMoves, captureMoves, onSquareClick, currentTurn }: ChessBoard3DProps) {
  const isValidMove = (r: number, c: number) => validMoves.some(m => m.row === r && m.col === c);
  const isCaptureMove = (r: number, c: number) => captureMoves.some(m => m.row === r && m.col === c);
  const isSelected = (r: number, c: number) => selectedPos?.row === r && selectedPos?.col === c;

  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        camera={{ position: [0, 8, 8], fov: 50 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-5, 8, -5]} intensity={0.5} color="#c8a060" />
        <pointLight position={[5, 8, -5]} intensity={0.3} color="#4466ff" />

        {/* Board border */}
        <mesh position={[0, -0.1, 0]} receiveShadow>
          <boxGeometry args={[9.2, 0.3, 9.2]} />
          <meshStandardMaterial color="#1a1208" roughness={0.8} metalness={0.3} />
        </mesh>

        {/* Squares */}
        {Array(8).fill(null).map((_, row) =>
          Array(8).fill(null).map((_, col) => (
            <Square
              key={`${row}-${col}`}
              row={row}
              col={col}
              isLight={(row + col) % 2 === 0}
              isSelected={isSelected(row, col)}
              isValidMove={isValidMove(row, col) && !isCaptureMove(row, col)}
              isCapture={isCaptureMove(row, col)}
              onClick={() => onSquareClick({ row, col })}
            />
          ))
        )}

        {/* Pieces */}
        {board.map((row, rowIdx) =>
          row.map((piece, colIdx) => {
            if (!piece) return null;
            const x = colIdx - 3.5;
            const z = rowIdx - 3.5;
            return (
              <PieceMesh
                key={piece.id}
                piece={piece}
                position={[x, 0.12, z]}
                isSelected={isSelected(rowIdx, colIdx)}
                onClick={() => onSquareClick({ row: rowIdx, col: colIdx })}
              />
            );
          })
        )}

        {/* Row/col labels */}
        {Array(8).fill(null).map((_, i) => (
          <group key={`label-${i}`}>
            <Text position={[-4.2, 0.15, i - 3.5]} fontSize={0.25} color="#c8a060" rotation={[-Math.PI / 2, 0, 0]}>
              {8 - i}
            </Text>
            <Text position={[i - 3.5, 0.15, 4.3]} fontSize={0.25} color="#c8a060" rotation={[-Math.PI / 2, 0, 0]}>
              {String.fromCharCode(65 + i)}
            </Text>
          </group>
        ))}

        <OrbitControls
          enablePan={false}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={6}
          maxDistance={18}
          target={[0, 0, 0]}
        />

        {/* Fog */}
        <fog attach="fog" args={['#0a0d1a', 15, 35]} />
      </Canvas>
    </div>
  );
}

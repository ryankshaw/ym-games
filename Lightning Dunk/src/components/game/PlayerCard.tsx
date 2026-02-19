import React from 'react';
import { Player } from './types';

interface PlayerCardProps {
  player: Player;
  isCurrentTurn: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, isCurrentTurn }) => {
  return (
    <div
      className={`relative rounded-xl p-3 transition-all duration-300 border ${
        player.isEliminated
          ? 'opacity-40 border-border bg-muted'
          : isCurrentTurn
          ? 'border-primary bg-card glow-orange scale-105'
          : 'border-border bg-card'
      }`}
    >
      {isCurrentTurn && !player.isEliminated && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-display px-2 py-0.5 rounded-full">
            SHOOTING
          </span>
        </div>
      )}
      {player.isEliminated && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
          <span className="bg-destructive text-destructive-foreground text-xs font-display px-2 py-0.5 rounded-full">
            OUT ⚡
          </span>
        </div>
      )}

      <div className="text-center mb-2">
        <p className={`font-display text-lg ${isCurrentTurn && !player.isEliminated ? 'text-primary text-glow' : 'text-foreground'}`}>
          {player.name}
        </p>
      </div>

      {/* Strikes */}
      <div className="flex justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={i < player.strikes ? 'strike-dot-filled' : 'strike-dot'}
          />
        ))}
      </div>
      <p className="text-center text-muted-foreground text-xs mt-1 font-display">
        {player.strikes}/3 strikes
      </p>
    </div>
  );
};

export default PlayerCard;

import React from 'react';

interface PowerBarProps {
  power: number;
  isCharging: boolean;
}

const PowerBar: React.FC<PowerBarProps> = ({ power, isCharging }) => {
  const getColor = () => {
    if (power < 35) return 'bg-destructive';
    if (power < 55) return 'hsl-accent-bg';
    if (power > 85) return 'bg-destructive';
    return 'bg-primary';
  };

  const getLabel = () => {
    if (power < 35) return 'TOO WEAK';
    if (power > 85) return 'TOO STRONG';
    if (power >= 45 && power <= 75) return '🎯 SWEET SPOT';
    return 'GOOD';
  };

  const getBgClass = () => {
    if (power < 35 || power > 85) return 'bg-destructive';
    if (power >= 45 && power <= 75) return 'bg-primary';
    return 'bg-accent';
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-display text-sm text-muted-foreground">POWER</span>
        <span className={`font-display text-sm ${power >= 45 && power <= 75 ? 'text-primary' : power < 35 || power > 85 ? 'text-destructive' : 'text-accent'}`}>
          {getLabel()}
        </span>
      </div>
      <div className="relative h-5 bg-muted rounded-full overflow-hidden border border-border">
        {/* Sweet spot indicator */}
        <div
          className="absolute top-0 h-full bg-primary opacity-20 rounded"
          style={{ left: '45%', width: '30%' }}
        />
        {/* Power fill */}
        <div
          className={`h-full rounded-full transition-none ${getBgClass()}`}
          style={{ width: `${power}%` }}
        />
        {/* Pulsing edge */}
        {isCharging && (
          <div
            className="absolute top-0 h-full w-2 bg-foreground opacity-60 rounded-full"
            style={{ left: `calc(${power}% - 4px)` }}
          />
        )}
      </div>
      {/* Sweet spot markers */}
      <div className="relative h-2">
        <div className="absolute text-xs text-muted-foreground" style={{ left: '45%' }}>▲</div>
        <div className="absolute text-xs text-muted-foreground" style={{ left: '72%' }}>▲</div>
      </div>
    </div>
  );
};

export default PowerBar;

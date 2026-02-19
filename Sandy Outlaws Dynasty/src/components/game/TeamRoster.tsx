import { PlayerCard, SANDY_OUTLAWS_ROSTER } from "./PlayerCard";
import { ChevronLeft } from "lucide-react";

interface TeamRosterProps {
  onBack: () => void;
}

export function TeamRoster({ onBack }: TeamRosterProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-gold transition-colors font-heading tracking-wide text-sm uppercase"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="h-6 w-px bg-border" />
          <div>
            <p className="text-muted-foreground font-heading text-xs tracking-widest uppercase">Dynasty · 2024</p>
            <h1 className="font-display text-2xl text-gold leading-none tracking-wide">Sandy Outlaws Roster</h1>
          </div>
        </div>
      </div>

      {/* Team banner */}
      <div className="relative overflow-hidden border-b border-border" style={{ background: "linear-gradient(135deg, hsl(var(--dirt)), hsl(var(--rust)/0.8))" }}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "repeating-linear-gradient(45deg, hsl(38 85% 55% / 0.3) 0px, hsl(38 85% 55% / 0.3) 1px, transparent 1px, transparent 10px)"
        }} />
        <div className="relative max-w-6xl mx-auto px-6 py-8 text-center">
          <div className="text-5xl mb-2">🤠⚾</div>
          <h2 className="font-display text-5xl text-foreground tracking-wider mb-1">THE SANDY OUTLAWS</h2>
          <p className="font-heading text-sand/80 tracking-[0.3em] text-sm uppercase">Est. 1987 · Sandy, Utah</p>
          <div className="flex items-center justify-center gap-8 mt-4">
            <div className="text-center">
              <div className="font-display text-3xl text-gold">92-58</div>
              <div className="font-heading text-xs text-muted-foreground tracking-widest uppercase">Record</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <div className="font-display text-3xl text-gold">1st</div>
              <div className="font-heading text-xs text-muted-foreground tracking-widest uppercase">Division</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <div className="font-display text-3xl text-gold">14</div>
              <div className="font-heading text-xs text-muted-foreground tracking-widest uppercase">Game Lead</div>
            </div>
          </div>
        </div>
      </div>

      {/* Roster grid */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-6">
          <span className="font-heading text-muted-foreground text-xs tracking-widest uppercase">Active Roster</span>
          <div className="flex-1 h-px bg-border" />
          <span className="font-heading text-muted-foreground text-xs">{SANDY_OUTLAWS_ROSTER.length} Players</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SANDY_OUTLAWS_ROSTER.map((player) => (
            <PlayerCard key={player.number} player={player} />
          ))}
        </div>
      </div>
    </div>
  );
}

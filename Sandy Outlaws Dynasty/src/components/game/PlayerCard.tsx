interface Player {
  number: number;
  name: string;
  position: string;
  avg: string;
  hr: number;
  rbi: number;
  description: string;
  emoji: string;
}

interface PlayerCardProps {
  player: Player;
}

export const SANDY_OUTLAWS_ROSTER: Player[] = [
  { number: 1,  name: "Lincoln",  position: "CF", avg: ".341", hr: 24, rbi: 88,  description: "First to the ball, every time",    emoji: "⚡" },
  { number: 7,  name: "Davis",    position: "1B", avg: ".308", hr: 38, rbi: 112, description: "The wall at first base",            emoji: "🏔️" },
  { number: 14, name: "McCrae",   position: "P",  avg: ".189", hr: 2,  rbi: 9,   description: "Unhittable on his best days",       emoji: "🔥" },
  { number: 22, name: "Noah",     position: "C",  avg: ".279", hr: 18, rbi: 74,  description: "Ice in his veins behind the plate", emoji: "🧊" },
  { number: 11, name: "Mateo",    position: "SS", avg: ".326", hr: 14, rbi: 66,  description: "Quickest hands in the west",        emoji: "🧲" },
  { number: 3,  name: "Matias",   position: "2B", avg: ".314", hr: 11, rbi: 59,  description: "Double play machine",               emoji: "⚙️" },
  { number: 9,  name: "James",    position: "LF", avg: ".297", hr: 21, rbi: 81,  description: "Gap-to-gap devastation",            emoji: "💥" },
  { number: 44, name: "Rhett",    position: "3B", avg: ".289", hr: 27, rbi: 96,  description: "Hot corner legend",                 emoji: "🎯" },
  { number: 0,  name: "Cro",      position: "RF", avg: ".333", hr: 32, rbi: 104, description: "The closer in right field",         emoji: "🦅" },
];

export function PlayerCard({ player }: PlayerCardProps) {
  return (
    <div className="relative group cursor-pointer">
      <div className="relative overflow-hidden rounded-lg border border-border bg-card p-5 transition-all duration-300 group-hover:border-gold group-hover:shadow-gold shadow-card">
        {/* Number badge */}
        <div className="absolute top-3 right-3 w-10 h-10 rounded-full gradient-gold flex items-center justify-center">
          <span className="font-display text-primary-foreground text-lg leading-none">{player.number}</span>
        </div>

        {/* Emoji avatar */}
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-3xl mb-3 border-2 border-border group-hover:border-gold transition-colors">
          {player.emoji}
        </div>

        {/* Position badge */}
        <div className="inline-flex items-center px-2 py-0.5 rounded bg-rust/20 border border-rust/40 mb-2">
          <span className="text-rust font-heading text-xs tracking-widest">{player.position}</span>
        </div>

        <h3 className="font-heading text-lg text-foreground leading-tight mb-1">{player.name}</h3>
        <p className="text-muted-foreground text-xs italic mb-4">"{player.description}"</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
          <div className="text-center">
            <div className="font-display text-gold text-xl">{player.avg}</div>
            <div className="text-muted-foreground text-xs font-heading tracking-wider">AVG</div>
          </div>
          <div className="text-center">
            <div className="font-display text-gold text-xl">{player.hr}</div>
            <div className="text-muted-foreground text-xs font-heading tracking-wider">HR</div>
          </div>
          <div className="text-center">
            <div className="font-display text-gold text-xl">{player.rbi}</div>
            <div className="text-muted-foreground text-xs font-heading tracking-wider">RBI</div>
          </div>
        </div>
      </div>
    </div>
  );
}

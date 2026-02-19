import { useNavigate } from "react-router-dom";

const GameCard = ({
  emoji, title, badge, desc, tags, color, borderVar, glowVar,
  onClick,
}: {
  emoji: string; title: string; badge: string; desc: string; tags: string[];
  color: string; borderVar?: string; glowVar?: string; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="group relative bg-card border border-border rounded-2xl p-6 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
    onMouseEnter={(e) => {
      if (borderVar) e.currentTarget.style.borderColor = borderVar;
      if (glowVar)   e.currentTarget.style.boxShadow = glowVar;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = '';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div className="flex items-center gap-5">
      <div className="text-6xl">{emoji}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-3xl" style={{ color }}>{title}</h2>
          <span className="text-xs font-display px-2 py-0.5 rounded-full border"
            style={{ background: `${color}22`, color, borderColor: `${color}66` }}>
            {badge}
          </span>
        </div>
        <p className="text-muted-foreground text-sm mt-1">{desc}</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          {tags.map(t => (
            <span key={t} className="text-xs bg-muted text-muted-foreground font-display px-2 py-1 rounded-lg">{t}</span>
          ))}
        </div>
      </div>
      <span className="text-muted-foreground text-2xl group-hover:translate-x-1 transition-transform">›</span>
    </div>
  </button>
);

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-1">
          <h1 className="font-display text-7xl text-foreground">ARCADE</h1>
          <p className="text-muted-foreground font-display text-lg tracking-widest">SPORTS GAMES</p>
        </div>

        <div className="grid gap-4">
          <GameCard
            emoji="🏀" title="LIGHTNING" badge="⚡"
            desc="Free throw elimination — last shooter standing wins"
            tags={["2–4 PLAYERS", "ELIMINATION"]}
            color="hsl(25, 95%, 53%)"
            borderVar="hsl(25, 95%, 53%)"
            glowVar="0 0 30px hsl(25 95% 53% / 0.2)"
            onClick={() => navigate('/basketball')}
          />
          <GameCard
            emoji="⚽" title="PENALTY" badge="KICKS"
            desc="Aim, shoot and beat the goalkeeper to score"
            tags={["1 PLAYER", "3–7 ROUNDS"]}
            color="hsl(var(--soccer-green))"
            borderVar="hsl(var(--soccer-green))"
            glowVar="0 0 30px hsl(var(--soccer-green) / 0.2)"
            onClick={() => navigate('/soccer')}
          />
          <GameCard
            emoji="🐂" title="BULL ARENA" badge="FIGHT"
            desc="Control a raging bull — fight waves of wild animals and upgrade your abilities"
            tags={["1 PLAYER", "WAVES", "3D"]}
            color="hsl(0, 85%, 55%)"
            borderVar="hsl(0, 85%, 55%)"
            glowVar="0 0 30px hsl(0 85% 55% / 0.2)"
            onClick={() => navigate('/bull')}
          />
          <GameCard
            emoji="🦕" title="DINO RUN" badge="ENDLESS"
            desc="Jump over cacti, duck under pterodactyls — how far can you go?"
            tags={["1 PLAYER", "HIGH SCORE", "ENDLESS"]}
            color="hsl(45, 95%, 60%)"
            borderVar="hsl(45, 95%, 55%)"
            glowVar="0 0 30px hsl(45 95% 55% / 0.2)"
            onClick={() => navigate('/dino')}
          />
        </div>

        <p className="text-center text-muted-foreground text-xs font-display tracking-widest">MORE GAMES COMING SOON</p>
      </div>
    </div>
  );
};

export default Index;

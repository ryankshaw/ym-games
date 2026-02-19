import heroStadium from "@/assets/hero-stadium.jpg";

interface HomeScreenProps {
  onNavigate: (screen: string) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Hero background */}
      <div className="absolute inset-0">
        <img src={heroStadium} alt="Sandy Outlaws Stadium" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        {/* Extra dark overlay at top */}
        <div className="absolute inset-0 bg-gradient-to-b from-night/80 via-transparent to-transparent" />
      </div>

      {/* Ticker tape */}
      <div className="relative z-10 bg-rust/90 border-b border-rust py-1 overflow-hidden">
        <div className="animate-ticker whitespace-nowrap flex items-center gap-8 text-accent-foreground font-heading text-sm tracking-wider">
          <span>⚾ DYNASTY SEASON 2024</span>
          <span>•</span>
          <span>SANDY OUTLAWS — 1ST PLACE WESTERN DIVISION</span>
          <span>•</span>
          <span>RAMIREZ HITS .334 — SEASON HIGH</span>
          <span>•</span>
          <span>CALLOWAY CRUSHES 41 HOME RUNS</span>
          <span>•</span>
          <span>OUTLAWS CLINCH PLAYOFF BERTH</span>
          <span>•</span>
          <span>⚾ DYNASTY SEASON 2024</span>
          <span>•</span>
          <span>SANDY OUTLAWS — 1ST PLACE WESTERN DIVISION</span>
          <span>•</span>
          <span>RAMIREZ HITS .334 — SEASON HIGH</span>
          <span>•</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Team badge */}
        <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/40 bg-gold/10 backdrop-blur-sm">
          <span className="text-gold font-heading tracking-widest text-sm uppercase">Western Division Champions</span>
        </div>

        {/* Game title */}
        <div className="mb-2">
          <h1 className="font-display text-[clamp(4rem,15vw,12rem)] leading-none text-foreground tracking-wide" style={{ textShadow: "0 4px 30px hsl(38 85% 55% / 0.4)" }}>
            DYNASTY
          </h1>
        </div>

        {/* Team name */}
        <div className="flex items-center gap-4 mb-2">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold" />
          <h2 className="font-display text-[clamp(1.5rem,5vw,3rem)] text-gold tracking-[0.3em] uppercase leading-none">
            Sandy Outlaws
          </h2>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold" />
        </div>

        <p className="text-sand text-sm font-heading tracking-[0.2em] uppercase mb-12 opacity-80">
          ⚾ The Grit. The Glory. The Dynasty. ⚾
        </p>

        {/* Navigation buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          <button
            onClick={() => onNavigate("game")}
            className="group relative overflow-hidden rounded-lg p-0.5 animate-pulse-gold"
            style={{ background: "var(--gradient-gold)" }}
          >
            <div className="relative flex flex-col items-center gap-1 bg-night/20 rounded-md px-6 py-4 backdrop-blur-sm group-hover:bg-transparent transition-all">
              <span className="text-3xl">⚾</span>
              <span className="font-heading text-primary-foreground text-lg tracking-wider uppercase">Play Ball</span>
              <span className="text-primary-foreground/70 text-xs font-body">Batting Challenge</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate("roster")}
            className="group rounded-lg border border-border bg-card/80 backdrop-blur-sm px-6 py-4 flex flex-col items-center gap-1 hover:border-gold hover:shadow-gold transition-all duration-300"
          >
            <span className="text-3xl">👥</span>
            <span className="font-heading text-foreground text-lg tracking-wider uppercase">Roster</span>
            <span className="text-muted-foreground text-xs font-body">Meet the Team</span>
          </button>

          <button
            onClick={() => onNavigate("standings")}
            className="group rounded-lg border border-border bg-card/80 backdrop-blur-sm px-6 py-4 flex flex-col items-center gap-1 hover:border-gold hover:shadow-gold transition-all duration-300"
          >
            <span className="text-3xl">🏆</span>
            <span className="font-heading text-foreground text-lg tracking-wider uppercase">Standings</span>
            <span className="text-muted-foreground text-xs font-body">League Table</span>
          </button>
        </div>
      </div>

      {/* Footer stamp */}
      <div className="relative z-10 text-center pb-6">
        <p className="font-heading text-muted-foreground text-xs tracking-[0.3em] uppercase">
          Dynasty Baseball · Season 2024 · Est. 1987
        </p>
      </div>
    </div>
  );
}

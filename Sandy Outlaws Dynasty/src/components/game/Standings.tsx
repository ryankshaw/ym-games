import { ChevronLeft } from "lucide-react";

interface StandingsProps {
  onBack: () => void;
}

const WESTERN_DIVISION = [
  { team: "Sandy Outlaws", abbr: "SDO", w: 92, l: 58, gb: "—", streak: "W4", emoji: "🤠", highlight: true },
  { team: "Cactus Kings", abbr: "CKG", w: 78, l: 72, gb: "14", streak: "L2", emoji: "🌵", highlight: false },
  { team: "Desert Wolves", abbr: "DWL", w: 74, l: 76, gb: "18", streak: "W1", emoji: "🐺", highlight: false },
  { team: "Mesa Bandits", abbr: "MSB", w: 70, l: 80, gb: "22", streak: "L3", emoji: "🎭", highlight: false },
  { team: "Tucson Vipers", abbr: "TUV", w: 61, l: 89, gb: "31", streak: "L5", emoji: "🐍", highlight: false },
];

const RECENT_GAMES = [
  { date: "Aug 18", home: "Sandy Outlaws", away: "Cactus Kings", score: "7-3", result: "W" },
  { date: "Aug 17", home: "Sandy Outlaws", away: "Cactus Kings", score: "4-2", result: "W" },
  { date: "Aug 16", home: "Desert Wolves", away: "Sandy Outlaws", score: "6-8", result: "W" },
  { date: "Aug 15", home: "Desert Wolves", away: "Sandy Outlaws", score: "5-3", result: "L" },
  { date: "Aug 14", home: "Sandy Outlaws", away: "Mesa Bandits", score: "11-2", result: "W" },
];

export function Standings({ onBack }: StandingsProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-gold transition-colors font-heading tracking-wide text-sm uppercase">
            <ChevronLeft className="w-4 h-4" />Back
          </button>
          <div className="h-6 w-px bg-border" />
          <div>
            <p className="text-muted-foreground font-heading text-xs tracking-widest uppercase">Dynasty · 2024</p>
            <h1 className="font-display text-2xl text-gold leading-none tracking-wide">League Standings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Division Standings */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="bg-secondary/50 border-b border-border px-6 py-3 flex items-center gap-2">
            <span className="font-heading text-gold text-xs tracking-widest uppercase">Western Division Standings</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 font-heading text-muted-foreground text-xs tracking-widest uppercase">Team</th>
                  <th className="text-center px-3 py-3 font-heading text-muted-foreground text-xs tracking-widest uppercase">W</th>
                  <th className="text-center px-3 py-3 font-heading text-muted-foreground text-xs tracking-widest uppercase">L</th>
                  <th className="text-center px-3 py-3 font-heading text-muted-foreground text-xs tracking-widest uppercase">PCT</th>
                  <th className="text-center px-3 py-3 font-heading text-muted-foreground text-xs tracking-widest uppercase">GB</th>
                  <th className="text-center px-3 py-3 font-heading text-muted-foreground text-xs tracking-widest uppercase">Streak</th>
                </tr>
              </thead>
              <tbody>
                {WESTERN_DIVISION.map((team, i) => (
                  <tr
                    key={team.abbr}
                    className={`border-b border-border transition-colors ${
                      team.highlight
                        ? "bg-gold/10 border-l-2 border-l-gold"
                        : "hover:bg-secondary/30"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{team.emoji}</span>
                        <div>
                          <div className={`font-heading text-sm tracking-wide ${team.highlight ? "text-gold" : "text-foreground"}`}>
                            {team.team}
                            {team.highlight && <span className="ml-2 text-xs bg-gold/20 text-gold px-1.5 py-0.5 rounded font-body">YOU</span>}
                          </div>
                          <div className="font-heading text-muted-foreground text-xs">{team.abbr}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center px-3 py-4 font-display text-lg text-foreground">{team.w}</td>
                    <td className="text-center px-3 py-4 font-display text-lg text-muted-foreground">{team.l}</td>
                    <td className="text-center px-3 py-4 font-heading text-sm text-foreground">
                      {(team.w / (team.w + team.l)).toFixed(3)}
                    </td>
                    <td className="text-center px-3 py-4 font-heading text-sm text-muted-foreground">{team.gb}</td>
                    <td className="text-center px-3 py-4">
                      <span className={`font-heading text-sm px-2 py-0.5 rounded ${
                        team.streak.startsWith("W")
                          ? "bg-field-green/20 text-emerald-400"
                          : "bg-rust/20 text-rust"
                      }`}>
                        {team.streak}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Games */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="bg-secondary/50 border-b border-border px-6 py-3">
            <span className="font-heading text-muted-foreground text-xs tracking-widest uppercase">Sandy Outlaws · Recent Results</span>
          </div>
          <div className="divide-y divide-border">
            {RECENT_GAMES.map((game, i) => (
              <div key={i} className="flex items-center px-6 py-4 hover:bg-secondary/20 transition-colors">
                <div className="w-16 font-heading text-muted-foreground text-xs">{game.date}</div>
                <div className="flex-1 font-heading text-sm text-foreground">{game.home} vs {game.away}</div>
                <div className="font-display text-lg text-foreground mr-4">{game.score}</div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display text-sm ${
                  game.result === "W"
                    ? "bg-field-green/20 text-emerald-400 border border-field-green/40"
                    : "bg-rust/20 text-rust border border-rust/40"
                }`}>
                  {game.result}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Season Leaders */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
    { stat: "Batting Avg", player: "Lincoln", value: ".341", emoji: "🏏" },
    { stat: "Home Runs", player: "Davis", value: "38", emoji: "💥" },
    { stat: "ERA", player: "McCrae", value: "2.71", emoji: "🔥" },
          ].map((leader) => (
            <div key={leader.stat} className="rounded-xl border border-border bg-card p-5 shadow-card hover:border-gold transition-colors">
              <div className="text-2xl mb-2">{leader.emoji}</div>
              <div className="font-heading text-muted-foreground text-xs tracking-widest uppercase mb-1">{leader.stat} Leader</div>
              <div className="font-display text-3xl text-gold mb-1">{leader.value}</div>
              <div className="font-heading text-foreground text-sm">{leader.player}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

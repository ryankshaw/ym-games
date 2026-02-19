import { useState } from "react";
import { HomeScreen } from "@/components/game/HomeScreen";
import { TeamRoster } from "@/components/game/TeamRoster";
import { BattingGame } from "@/components/game/BattingGame";
import { Standings } from "@/components/game/Standings";

type Screen = "home" | "roster" | "game" | "standings";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("home");

  return (
    <div className="min-h-screen bg-background">
      {screen === "home" && <HomeScreen onNavigate={(s) => setScreen(s as Screen)} />}
      {screen === "roster" && <TeamRoster onBack={() => setScreen("home")} />}
      {screen === "game" && <BattingGame onBack={() => setScreen("home")} />}
      {screen === "standings" && <Standings onBack={() => setScreen("home")} />}
    </div>
  );
};

export default Index;

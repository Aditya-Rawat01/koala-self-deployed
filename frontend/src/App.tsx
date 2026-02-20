import { Toaster } from "react-hot-toast";
import DashBoard from "./Dashboard";
import "./index.css";
import { useEffect, useState } from "react";
import TitleScreen from "./components/TitleScreen";

export default function App() {
  const [stage, setStage] = useState<"welcome" | "app">("welcome");
  useEffect(() => {
    const seen = localStorage.getItem("koalaWelcomeSeen");
    if (seen) setStage("app");
  }, []);
  return (
    <>
      {stage === "welcome" && <TitleScreen onEnter={() => {
        localStorage.setItem("koalaWelcomeSeen", "true");
        setStage("app")}} />}

      {stage === "app" && <DashBoard />}

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#111",
            color: "#fff",
            borderRadius: "12px",
          },
        }}
      />
    </>
  );
}


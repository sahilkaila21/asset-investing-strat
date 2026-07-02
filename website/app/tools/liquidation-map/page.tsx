import ComingSoon from "@/components/ComingSoon";
import { Zap } from "lucide-react";
export const metadata = { title: "Liquidation Heatmap — Alphabit" };
export default function Page() {
  return <ComingSoon title="Liquidation Heatmap" icon={Zap} description="A map of where leveraged positions are clustered across exchanges — useful context on where volatility risk is concentrated, not a prediction of where price will go." />;
}

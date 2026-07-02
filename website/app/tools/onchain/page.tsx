import ComingSoon from "@/components/ComingSoon";
import { Link2 } from "lucide-react";
export const metadata = { title: "On-Chain Analytics — Alphabit" };
export default function Page() {
  return <ComingSoon title="On-Chain Analytics" icon={Link2} description="Exchange inflows/outflows, MVRV Z-score, active addresses, and miner revenue trends — the same on-chain data underlying the risk model, broken out in one dashboard." />;
}

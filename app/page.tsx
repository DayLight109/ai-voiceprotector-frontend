import Header from "@/components/Header";
import StatusTicker from "@/components/StatusTicker";
import Hero from "@/components/Hero";
import CrisisStats from "@/components/CrisisStats";
import PainPoints from "@/components/PainPoints";
import DefenseStack from "@/components/DefenseStack";
import CallSimulator from "@/components/CallSimulator";
import ComparisonTable from "@/components/ComparisonTable";
import Personas from "@/components/Personas";
import Policy from "@/components/Policy";
import GlobalView from "@/components/GlobalView";
import SocialValue from "@/components/SocialValue";
import Sources from "@/components/Sources";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <Header />
      <StatusTicker />
      <Hero />
      <CrisisStats />
      <PainPoints />
      <DefenseStack />
      <CallSimulator />
      <ComparisonTable />
      <Personas />
      <Policy />
      <GlobalView />
      <SocialValue />
      <Sources />
      <Footer />
    </main>
  );
}

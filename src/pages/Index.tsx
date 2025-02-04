import { Hero } from "@/components/Hero";
import { PricingSection } from "@/components/PricingSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { ThreeBackground } from "@/components/ThreeBackground";

const Index = () => {
  return (
    <div className="bg-white relative overflow-hidden">
      <ThreeBackground />
      <Hero />
      <FeaturesSection />
      <PricingSection />
    </div>
  );
};

export default Index;
import { Hero } from "@/components/Hero";
import { PricingSection } from "@/components/PricingSection";
import { FeaturesSection } from "@/components/FeaturesSection";

const Index = () => {
  return (
    <div className="bg-white">
      <Hero />
      <FeaturesSection />
      <PricingSection />
    </div>
  );
};

export default Index;
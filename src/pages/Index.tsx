
import { Hero } from "@/components/Hero";
import { PricingSection } from "@/components/PricingSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { ThreeBackground } from "@/components/ThreeBackground";

const Index = () => {
  return (
    <div className="relative overflow-hidden min-h-screen">
      <ThreeBackground />
      <Hero />
      <FeaturesSection />
      <PricingSection />
      <footer className="py-12 text-center text-sm text-gray-500">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <img 
            src="/lovable-uploads/6671c039-73ff-4f5e-8c43-c07406d0970c.png" 
            alt="CareerSarthi Logo" 
            className="h-16 mx-auto mb-6"
          />
          <p>© {new Date().getFullYear()} CareerSarthi. All rights reserved.</p>
          <div className="mt-4 flex justify-center space-x-6">
            <a href="#" className="text-gray-500 hover:text-primary">Terms</a>
            <a href="#" className="text-gray-500 hover:text-primary">Privacy</a>
            <a href="#" className="text-gray-500 hover:text-primary">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

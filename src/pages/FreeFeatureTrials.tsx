
import { FreeSkillGapAnalysis } from "@/components/FreeSkillGapAnalysis";
import { useLocation } from "react-router-dom";

const FreeFeatureTrials = () => {
  const location = useLocation();
  const path = location.pathname;
  
  // Return the appropriate free trial component based on the path
  if (path.includes('skill-gap-analysis')) {
    return <FreeSkillGapAnalysis />;
  }
  
  // Default fallback - should not happen with proper routing
  return <div className="container py-8">Feature not found</div>;
};

export default FreeFeatureTrials;

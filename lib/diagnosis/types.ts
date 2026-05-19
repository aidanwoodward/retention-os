import { SeverityInfo } from "@/components/diagnosis/SeverityIndicator";
import { CausalityFactor } from "@/components/diagnosis/CausalitySection";

export interface EnhancedDiagnosisResult {
  sentence: string | null;
  severity: SeverityInfo | null;
  causality: CausalityFactor[];
}

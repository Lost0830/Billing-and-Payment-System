import { LandingPage } from "../LandingPage";

interface LandingPageContainerProps {
  onNavigateToLogin: (system: string) => void;
}

export function LandingPageContainer({ onNavigateToLogin }: LandingPageContainerProps) {
  return <LandingPage onNavigateToLogin={onNavigateToLogin} />;
}
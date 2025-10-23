import { LoginPage } from "../LoginPage";
import { LoginCredentials } from "../../hooks/useAuth";

interface LoginPageContainerProps {
  system: string;
  onLogin: (credentials: LoginCredentials) => void;
  onBack: () => void;
}

export function LoginPageContainer({ system, onLogin, onBack }: LoginPageContainerProps) {
  return (
    <LoginPage 
      system={system} 
      onLogin={onLogin}
      onBack={onBack}
    />
  );
}
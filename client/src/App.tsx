import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import SplashScreen from "@/pages/splash";
import AuthScreen from "@/pages/auth";
import OnboardingScreen from "@/pages/onboarding";
import WelcomeScreen from "@/pages/welcome";
import HomeScreen from "@/pages/home";
import BiometricsScreen from "@/pages/biometrics";

function Router() {
  return (
    <Switch>
      <Route path="/" component={SplashScreen} />
      <Route path="/auth" component={AuthScreen} />
      <Route path="/onboarding" component={OnboardingScreen} />
      <Route path="/welcome" component={WelcomeScreen} />
      <Route path="/home" component={HomeScreen} />
      <Route path="/biometrics" component={BiometricsScreen} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

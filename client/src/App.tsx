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
import BiometricsDevicesScreen from "@/pages/biometrics/devices";
import BiometricsLinkScreen from "@/pages/biometrics/link";
import BiometricsScanScreen from "@/pages/biometrics/scan";
import NutritionScreen from "@/pages/nutrition";
import NutritionAddScreen from "@/pages/nutrition/add";
import NutritionScaleScreen from "@/pages/nutrition/scale";
import TrainingScreen from "@/pages/training";
import TrainingDetailsScreen from "@/pages/training/details";
import TrainingPlayerScreen from "@/pages/training/player";
import SupplementsScreen from "@/pages/supplements";
import PantryScreen from "@/pages/pantry";
import HydrationScreen from "@/pages/hydration";
import ProfileScreen from "@/pages/profile";
import { useState } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/">{() => <SplashScreen />}</Route>
      <Route path="/auth" component={AuthScreen} />
      <Route path="/onboarding" component={OnboardingScreen} />
      <Route path="/welcome" component={WelcomeScreen} />
      <Route path="/home" component={HomeScreen} />
      <Route path="/profile" component={ProfileScreen} />
      
      {/* Nutrition Module */}
      <Route path="/nutrition" component={NutritionScreen} />
      <Route path="/nutrition/add" component={NutritionAddScreen} />
      <Route path="/nutrition/scale" component={NutritionScaleScreen} />
      <Route path="/pantry" component={PantryScreen} />
      <Route path="/hydration" component={HydrationScreen} />

      {/* Training Module */}
      <Route path="/training" component={TrainingScreen} />
      <Route path="/training/details" component={TrainingDetailsScreen} />
      <Route path="/training/player" component={TrainingPlayerScreen} />
      
      {/* Biometrics Module */}
      <Route path="/biometrics" component={BiometricsScreen} />
      <Route path="/biometrics/devices" component={BiometricsDevicesScreen} />
      <Route path="/biometrics/link" component={BiometricsLinkScreen} />
      <Route path="/biometrics/scan" component={BiometricsScanScreen} />

      {/* Supplements Module */}
      <Route path="/supplements" component={SupplementsScreen} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

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

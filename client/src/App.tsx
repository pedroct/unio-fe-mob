import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
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
import TrainingPlanDetailScreen from "@/pages/training/plan-detail";
import TrainingExercisesScreen from "@/pages/training/exercises";
import TrainingSessionsScreen from "@/pages/training/sessions";
import TrainingPlayerScreen from "@/pages/training/player";
import SupplementsScreen from "@/pages/supplements";
import PantryScreen from "@/pages/pantry";
import ShoppingListScreen from "@/pages/pantry/shopping-list";
import HydrationScreen from "@/pages/hydration";
import ProfileScreen from "@/pages/profile";
import { useState, type ReactNode } from "react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Redirect to="/auth" />;

  return <Component />;
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <Switch>
      <Route path="/">{() => <Redirect to={user ? "/home" : "/auth"} />}</Route>
      <Route path="/auth">{() => user ? <Redirect to="/home" /> : <AuthScreen />}</Route>
      <Route path="/onboarding" component={OnboardingScreen} />
      <Route path="/welcome" component={WelcomeScreen} />

      <Route path="/home">{() => <ProtectedRoute component={HomeScreen} />}</Route>
      <Route path="/profile">{() => <ProtectedRoute component={ProfileScreen} />}</Route>

      <Route path="/nutrition">{() => <ProtectedRoute component={NutritionScreen} />}</Route>
      <Route path="/nutrition/add">{() => <ProtectedRoute component={NutritionAddScreen} />}</Route>
      <Route path="/nutrition/scale">{() => <ProtectedRoute component={NutritionScaleScreen} />}</Route>
      <Route path="/pantry">{() => <ProtectedRoute component={PantryScreen} />}</Route>
      <Route path="/pantry/shopping-list">{() => <ProtectedRoute component={ShoppingListScreen} />}</Route>
      <Route path="/hydration">{() => <ProtectedRoute component={HydrationScreen} />}</Route>

      <Route path="/training">{() => <ProtectedRoute component={TrainingScreen} />}</Route>
      <Route path="/training/plans/:planoId">{() => <ProtectedRoute component={TrainingPlanDetailScreen} />}</Route>
      <Route path="/training/exercises">{() => <ProtectedRoute component={TrainingExercisesScreen} />}</Route>
      <Route path="/training/sessions">{() => <ProtectedRoute component={TrainingSessionsScreen} />}</Route>
      <Route path="/training/player/:planoId">{() => <ProtectedRoute component={TrainingPlayerScreen} />}</Route>

      <Route path="/biometrics">{() => <ProtectedRoute component={BiometricsScreen} />}</Route>
      <Route path="/biometrics/devices">{() => <ProtectedRoute component={BiometricsDevicesScreen} />}</Route>
      <Route path="/biometrics/link">{() => <ProtectedRoute component={BiometricsLinkScreen} />}</Route>
      <Route path="/biometrics/scan">{() => <ProtectedRoute component={BiometricsScanScreen} />}</Route>

      <Route path="/supplements">{() => <ProtectedRoute component={SupplementsScreen} />}</Route>

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
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

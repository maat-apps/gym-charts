import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router";

import { AppLockGate } from "../components/app-lock-gate";

const HomeView = lazy(() =>
  import("../views/home/home-view").then((m) => ({ default: m.HomeView })),
);
const ExerciseView = lazy(() =>
  import("../views/exercise/exercise-view").then((m) => ({
    default: m.ExerciseView,
  })),
);

export function AppRouter() {
  return (
    <AppLockGate>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/exercise/:id" element={<ExerciseView />} />
        </Routes>
      </BrowserRouter>
    </AppLockGate>
  );
}

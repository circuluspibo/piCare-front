import "./index.css";

import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";

// Router
import {
  Route,
  RouterProvider,
  BrowserRouter,
  createBrowserRouter,
  createRoutesFromElements,
} from "react-router-dom";

import IndexLayout from "@/Layouts/IndexLayout";
// Pages
import NotFound from "@/pages/NotFound";
import Main from "@/pages/IndexPages";
import ExercisePage from "@/pages/ExercisePage";
import AiPage from "@/pages/AiPage";

// Components
import { Loading } from "@/components/Loading";
import { GlobalContextProvider } from "./contexts/GlobalContext";
import { VoiceChatProvider } from "./contexts/VoiceChatContext";
import TrainingPage from "@/pages/TrainingPage";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<IndexLayout />} errorElement={<NotFound />}>
      {/** 메인 페이지 */}
      <Route path="/" element={<Main />} />
      <Route path="/exercise" element={<ExercisePage />} />
      <Route path="/ai" element={<AiPage />} />
      <Route path="/training" element={<TrainingPage />} />
    </Route>
  )
);

createRoot(document.getElementById("root")).render(
  <Suspense fallback={<Loading />}>
    <GlobalContextProvider>
      <VoiceChatProvider>
        <RouterProvider router={router} />
      </VoiceChatProvider>
    </GlobalContextProvider>
  </Suspense>
);

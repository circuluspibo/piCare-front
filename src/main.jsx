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

// Pages
import NotFound from "@/pages/NotFound";
import Main from "@/pages/IndexPages";
import ExercisePage from "@/Layouts/exercise/ExerciseLayout";

// Components
import { Loading } from "@/components/Loading";
import { GlobalContextProvider } from "./contexts/GlobalContext";
import { VoiceChatProvider } from "./contexts/VoiceChatContext";

import ModeSelectView from "@/components/ModelSelectView";

// Layouts
import IndexLayout from "@/Layouts/IndexLayout";
import TrainingLayout from "./Layouts/training/TrainingLayout";
import AiLayout from "@/Layouts/ai/AiLayout";

// Pages
import VoiceReplication from "@/pages/ai/VoiceReplication";
import MagicMirror from "@/pages/ai/MagicMirror";
import DrawByVoice from "@/pages/ai/DrawByVoice";
import ColorTraining from "./pages/training/ColorTraining";
import NumberTraining from "./pages/training/NumberTraining";
import PianoTraining from "./pages/training/PianoTraining";
import FlagGame from "./pages/exercise/FlagGame";
import HeadGame from "./pages/exercise/HeadGame";
import GrabGame from "./pages/exercise/GrabGame";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<IndexLayout />} errorElement={<NotFound />}>
      {/** 메인 페이지 */}
      <Route path="/" element={<Main />} />
      {/** 신체훈련 */}
      <Route path="/exercise" element={<ExercisePage />}>
        <Route index element={<ModeSelectView />} />
        <Route path="flag" element={<FlagGame />} />
        <Route path="head" element={<HeadGame />} />
        <Route path="grab" element={<GrabGame />} />
      </Route>
      {/** AI훈련 */}
      <Route path="/ai" element={<AiLayout />}>
        <Route index element={<ModeSelectView />} />
        <Route path="draw" element={<DrawByVoice />} />
        <Route path="mirror" element={<MagicMirror />} />
        <Route path="voice" element={<VoiceReplication />} />
      </Route>
      {/** 인지훈련 */}
      <Route path="/training" element={<TrainingLayout />}>
        <Route index element={<ModeSelectView />} />
        <Route path="color" element={<ColorTraining />} />
        <Route path="number" element={<NumberTraining />} />
        <Route path="piano" element={<PianoTraining />} />
      </Route>
    </Route>,
  ),
);

createRoot(document.getElementById("root")).render(
  <Suspense fallback={<Loading />}>
    <GlobalContextProvider>
      <VoiceChatProvider>
        <RouterProvider router={router} />
      </VoiceChatProvider>
    </GlobalContextProvider>
  </Suspense>,
);

import "./index.css";
import { Suspense } from "react";
import { createRoot } from "react-dom/client";

// React Router - 필요한 기능만 임포트 (BrowserRouter 삭제)
import {
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from "react-router-dom";

// Context Providers
import { GlobalContextProvider } from "./contexts/GlobalContext";
import { VoiceChatProvider } from "./contexts/VoiceChatContext";

// Components & Layouts
import { Loading } from "@/components/Loading";
import ModelSelectView from "@/components/ModelSelectView";
import IndexLayout from "@/Layouts/IndexLayout";
import ExerciseLayout from "@/Layouts/exercise/ExerciseLayout"; // 이름 일관성 수정
import TrainingLayout from "@/Layouts/training/TrainingLayout";
import AiLayout from "@/Layouts/ai/AiLayout";

// Pages
import NotFound from "@/pages/NotFound";
import Main from "@/pages/IndexPages";
import VoiceReplication from "@/pages/ai/VoiceReplication";
import MagicMirror from "@/pages/ai/MagicMirror";
import DrawByVoice from "@/pages/ai/DrawByVoice";
import ColorTraining from "@/pages/training/ColorTraining";
import NumberTraining from "@/pages/training/NumberTraining";
import PianoTraining from "@/pages/training/PianoTraining";
import FlagGame from "@/pages/exercise/FlagGame";
import HeadGame from "@/pages/exercise/HeadGame";
import GrabGame from "@/pages/exercise/GrabGame";
import LearnLayout from "./Layouts/hani/LearnLayout";
import Character from "./pages/hani/Character";
import Target from "./pages/hani/Target";
import QueryProvider from "./provider/QueryProvider";
import { LearnProvider } from "./contexts/learnContext";
import Method from "./pages/hani/Method";
import Learn from "./pages/hani/Learn";

/** * 1. 라우터 설정 분리
 * createBrowserRouter를 사용하면 최신 데이터 API를 사용할 수 있어 성능상 이점이 있습니다.
 */
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<IndexLayout />} errorElement={<NotFound />}>
      {/* 메인 페이지 */}
      <Route index element={<Main />} />
      {/* 또박한글 Lite */}
      <Route
        path="learn"
        element={
          <LearnProvider>
            <LearnLayout />
          </LearnProvider>
        }
      >
        <Route index element={<Character />} />
        <Route path=":character" element={<Target />} />
        <Route path=":character/:chapter" element={<Method />} />
        <Route path=":character/:chapter/:method" element={<Learn />} />
      </Route>

      {/* 신체훈련 */}
      <Route path="exercise" element={<ExerciseLayout />}>
        <Route index element={<ModelSelectView />} />
        <Route path="flag" element={<FlagGame />} />
        <Route path="head" element={<HeadGame />} />
        <Route path="grab" element={<GrabGame />} />
      </Route>

      {/* AI훈련 */}
      <Route path="ai" element={<AiLayout />}>
        <Route index element={<ModelSelectView />} />
        <Route path="draw" element={<DrawByVoice />} />
        <Route path="mirror" element={<MagicMirror />} />
        <Route path="voice" element={<VoiceReplication />} />
      </Route>

      {/* 인지훈련 */}
      <Route path="training" element={<TrainingLayout />}>
        <Route index element={<ModelSelectView />} />
        <Route path="color" element={<ColorTraining />} />
        <Route path="number" element={<NumberTraining />} />
        <Route path="piano" element={<PianoTraining />} />
      </Route>
    </Route>,
  ),
);

/**
 * 2. Root 컴포넌트
 * Provider의 순서: Global -> VoiceChat 순으로 감싸야
 * VoiceChat 안에서 GlobalContext의 값을 안전하게 참조할 수 있습니다.
 */
const App = () => {
  return (
    <QueryProvider>
      <GlobalContextProvider>
        <VoiceChatProvider>
          <Suspense fallback={<Loading />}>
            <RouterProvider router={router} />
          </Suspense>
        </VoiceChatProvider>
      </GlobalContextProvider>
    </QueryProvider>
  );
};

// 3. 렌더링 실행
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

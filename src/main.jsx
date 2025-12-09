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
import DrawPage from "@/pages/DrawPage";

// Components
import { Loading } from "@/components/Loading";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<IndexLayout />} errorElement={<NotFound />}>
      {/** 메인 페이지 */}
      <Route path="/" element={<Main />} />
      <Route path="/exercise" element={<ExercisePage />} />
      <Route path="/draw" element={<DrawPage />} />
    </Route>
  )
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Suspense fallback={<Loading />}>
      <RouterProvider router={router} />
    </Suspense>
  </StrictMode>
);

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
import { Loading } from "./components/Loading";
import IndexLayout from "./Layouts/IndexLayout";
import Main from "./pages/IndexPages";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<IndexLayout />} errorElement={<NotFound />}>
      {/** 메인 페이지 */}
      <Route path="/" element={<Main />} />
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

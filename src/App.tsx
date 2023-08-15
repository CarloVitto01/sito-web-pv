import "./PVsito.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import RootLayout from "./pages/Root";
import ErrorPage from "./pages/Error";
import HomePage from "./pages/Home";
import GraficaPage from "./pages/Grafica";
import StampaPage from "./pages/Stampa";
import FotoPage from "./pages/Foto";
import VideoPage from "./pages/Video";

const router = createBrowserRouter([
  {
    path: "",
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "grafica", element: <GraficaPage /> },
      { path: "stampa", element: <StampaPage /> },
      { path: "foto", element: <FotoPage /> },
      { path: "video", element: <VideoPage /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;

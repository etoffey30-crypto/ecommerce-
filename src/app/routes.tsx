import { Outlet, createBrowserRouter } from "react-router";
import { AppProvider } from "./context/AppContext";
import StorePage from "./pages/StorePage";
import AdminPage from "./pages/AdminPage";

function AppLayout() {
  return (
    <AppProvider>
      <Outlet />
    </AppProvider>
  );
}

export const router = createBrowserRouter(
  [
    {
      Component: AppLayout,
      children: [
        {
          path: "/",
          Component: StorePage,
        },
        {
          path: "/admin",
          Component: AdminPage,
        },
        {
          path: "*",
          Component: StorePage,
        },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL }
);

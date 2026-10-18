import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import "./globals.css";
import { routes } from "./app/routes";
import { SupabaseAuthProvider } from "./auth/supabase-auth-provider";

const queryClient = new QueryClient();
const router = createBrowserRouter(routes);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SupabaseAuthProvider>
        <RouterProvider router={router} />
      </SupabaseAuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

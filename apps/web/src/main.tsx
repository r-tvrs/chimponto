import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import "./globals.css";
import { routes } from "./app/routes";
import { SupabaseAuthProvider } from "./auth/supabase-auth-provider";
import { CompaniesContext } from "./company/company";
import { supabaseCompanies } from "./company/supabase-companies";
import { PunchesContext } from "./punches/punches";
import { supabasePunches } from "./punches/supabase-punches";

const queryClient = new QueryClient();
const router = createBrowserRouter(routes);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SupabaseAuthProvider>
        <CompaniesContext.Provider value={supabaseCompanies}>
          <PunchesContext.Provider value={supabasePunches}>
            <RouterProvider router={router} />
          </PunchesContext.Provider>
        </CompaniesContext.Provider>
      </SupabaseAuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

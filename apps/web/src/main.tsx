import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import "./globals.css";
import { routes } from "./app/routes";
import { SupabaseAuthProvider } from "./auth/supabase-auth-provider";
import { CompaniesContext } from "./company/company";
import { supabaseCompanies } from "./company/supabase-companies";
import { OfflineDb } from "./lib/offline-db";
import { createQueryPersister } from "./lib/query-persister";
import { initTheme } from "./lib/theme";
import { createOutbox, OutboxContext } from "./punches/outbox";
import { PunchesContext } from "./punches/punches";
import { supabasePunches } from "./punches/supabase-punches";

// O cache persistido vale por uma semana; o gcTime precisa cobrir esse prazo para não descartá-lo.
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

initTheme();

const db = new OfflineDb();
const outbox = createOutbox(db);
const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: CACHE_MAX_AGE_MS } } });
const persistOptions = { persister: createQueryPersister(db), maxAge: CACHE_MAX_AGE_MS };
const router = createBrowserRouter(routes);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <SupabaseAuthProvider>
        <CompaniesContext.Provider value={supabaseCompanies}>
          <PunchesContext.Provider value={supabasePunches}>
            <OutboxContext.Provider value={outbox}>
              <RouterProvider router={router} />
            </OutboxContext.Provider>
          </PunchesContext.Provider>
        </CompaniesContext.Provider>
      </SupabaseAuthProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
);

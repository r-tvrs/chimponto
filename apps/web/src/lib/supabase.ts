import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  throw new Error(
    "Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (apps/web/.env.example)",
  );
}

export const supabase = createClient<Database>(url, key, {
  auth: {
    // Implícito: o link mágico entra mesmo aberto num navegador diferente do que o pediu.
    // Com PKCE, o verificador fica só no navegador de origem e o login falharia.
    flowType: "implicit",
  },
});

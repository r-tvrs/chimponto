import { companyRulesSchema } from "@chimponto/domain";
import { supabase } from "@/lib/supabase";
import type { Companies, Membership } from "./company";

export const supabaseCompanies: Companies = {
  async membershipOf(userId) {
    const { data, error } = await supabase
      .from("company_members")
      .select("company_id, role, companies(rules)")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    // O check da tabela garante 'admin' | 'member'. As regras passam pelo schema, que preenche os
    // campos que faltarem em empresas criadas antes deles.
    return {
      companyId: data.company_id,
      role: data.role as Membership["role"],
      rules: companyRulesSchema.parse(data.companies.rules),
    };
  },

  async create(name, rules) {
    const { error } = await supabase.rpc("create_company", { name, rules });
    if (!error) return "created";
    // create_company devolve 23505 a quem já pertence a uma empresa.
    return error.code === "23505" ? "already_member" : "failed";
  },
};

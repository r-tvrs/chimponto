import type { CompanyRules } from "@chimponto/domain";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { useSignedInUser } from "@/auth/auth";

/** Vínculo do usuário com a empresa, com as regras dela. Na v1, cada usuário tem no máximo um. */
export type Membership = {
  companyId: string;
  companyName: string;
  role: "admin" | "member";
  rules: CompanyRules;
};

/** `already_member`: o usuário já tem empresa (por exemplo, criada em outra aba). */
export type CreateCompanyResult = "created" | "already_member" | "failed";

/** Acesso às empresas: Supabase no app, versão em memória nos testes. */
export type Companies = {
  membershipOf: (userId: string) => Promise<Membership | null>;
  /** Cria a empresa com o usuário da sessão como admin. */
  create: (name: string, rules: CompanyRules) => Promise<CreateCompanyResult>;
  /** Grava as regras da empresa. Só o admin consegue (RLS); para os outros, "failed". */
  updateRules: (companyId: string, rules: CompanyRules) => Promise<"saved" | "failed">;
};

export const CompaniesContext = createContext<Companies | null>(null);

function useCompanies(): Companies {
  const companies = useContext(CompaniesContext);
  if (!companies) throw new Error("useCompanies precisa de um CompaniesContext.Provider");
  return companies;
}

const membershipKey = (userId: string) => ["membership", userId];

/** Empresa do usuário da sessão; `data` é null enquanto ele não tem empresa. */
export function useMembership() {
  const companies = useCompanies();
  const user = useSignedInUser();
  return useQuery({
    queryKey: membershipKey(user.id),
    queryFn: () => companies.membershipOf(user.id),
  });
}

/** Regras da empresa do usuário; dentro de `RequireCompany`, só ficam indefinidas ao carregar. */
export function useCompanyRules(): CompanyRules | undefined {
  return useMembership().data?.rules;
}

/** Cria a empresa e só retorna depois de recarregar o vínculo, que as guardas de rota leem. */
export function useCreateCompany() {
  const companies = useCompanies();
  const user = useSignedInUser();
  const queryClient = useQueryClient();
  return async (name: string, rules: CompanyRules): Promise<CreateCompanyResult> => {
    const result = await companies.create(name, rules);
    if (result !== "failed") {
      await queryClient.invalidateQueries({ queryKey: membershipKey(user.id) });
    }
    return result;
  };
}

/** Grava as regras e recarrega o vínculo, que Hoje e Período leem para o cálculo. */
export function useUpdateCompanyRules() {
  const companies = useCompanies();
  const user = useSignedInUser();
  const queryClient = useQueryClient();
  return async (companyId: string, rules: CompanyRules): Promise<"saved" | "failed"> => {
    const result = await companies.updateRules(companyId, rules);
    if (result === "saved") {
      await queryClient.invalidateQueries({ queryKey: membershipKey(user.id) });
    }
    return result;
  };
}

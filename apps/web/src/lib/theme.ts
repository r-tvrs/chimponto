export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "chimponto:theme";

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)");

/** Tema lembrado no aparelho; sem escolha (ou sem acesso ao armazenamento), "system". */
export function storedTheme(): Theme {
  try {
    const theme = localStorage.getItem(STORAGE_KEY);
    return theme === "light" || theme === "dark" ? theme : "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && systemDark().matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** Aplica o tema na classe `.dark` do `<html>` e o lembra no aparelho. */
export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Sem armazenamento, o tema vale só até fechar o app.
  }
  applyTheme(theme);
}

/** Na abertura do app: aplica o tema lembrado e, em "Sistema", acompanha o aparelho. */
export function initTheme() {
  applyTheme(storedTheme());
  systemDark().addEventListener("change", () => applyTheme(storedTheme()));
}

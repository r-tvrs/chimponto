import { Navigate, type RouteObject } from "react-router";
import { AppShell } from "@/components/app-shell";
import { CompanyScreen } from "@/screens/company";
import { LoginScreen } from "@/screens/login";
import { PeriodScreen } from "@/screens/period";
import { SalaryScreen } from "@/screens/salary";
import { SettingsScreen } from "@/screens/settings";
import { TodayScreen } from "@/screens/today";
import { RequireCompany, RequireNoCompany, RequireNoSession, RequireSession } from "./guards";
import { RouteError } from "./route-error";

export const routes: RouteObject[] = [
  {
    errorElement: <RouteError />,
    children: [
      {
        path: "login",
        element: (
          <RequireNoSession>
            <LoginScreen />
          </RequireNoSession>
        ),
      },
      {
        path: "empresa",
        element: (
          <RequireSession>
            <RequireNoCompany>
              <CompanyScreen />
            </RequireNoCompany>
          </RequireSession>
        ),
      },
      {
        element: (
          <RequireSession>
            <RequireCompany>
              <AppShell />
            </RequireCompany>
          </RequireSession>
        ),
        children: [
          { index: true, element: <TodayScreen /> },
          { path: "periodo", element: <PeriodScreen /> },
          { path: "salario", element: <SalaryScreen /> },
          { path: "ajustes", element: <SettingsScreen /> },
        ],
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
];

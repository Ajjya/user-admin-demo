"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { ReactNode } from "react";
import { theme } from "@/theme/theme";

/**
 * Client boundary for MUI: Emotion and the theme live in React context, which only exists on the
 * client. AppRouterCacheProvider collects Emotion's styles during server rendering and injects
 * them into the HTML, so server-rendered pages arrive already styled.
 */
export function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}

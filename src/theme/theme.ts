import { createTheme } from "@mui/material/styles";

/**
 * Both palettes are emitted as CSS variables and switched by a class on <html>. The init script
 * sets that class before the first paint, so a reload never flashes the wrong theme.
 */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: { light: true, dark: true },
  typography: {
    // System fonts: no web font download at build or run time.
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
});

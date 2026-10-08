"use client";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useColorScheme } from "@mui/material/styles";
import type { ReactNode } from "react";

type Mode = "light" | "system" | "dark";

const OPTIONS: { mode: Mode; label: string; icon: ReactNode }[] = [
  { mode: "light", label: "Light theme", icon: <LightModeIcon fontSize="small" /> },
  { mode: "system", label: "System theme", icon: <SettingsBrightnessIcon fontSize="small" /> },
  { mode: "dark", label: "Dark theme", icon: <DarkModeIcon fontSize="small" /> },
];

/** MUI stores the choice in localStorage ("mui-mode") and applies it on every page load. */
export function ThemeToggle(): ReactNode {
  // `mode` is undefined until the component mounts: the server cannot know localStorage.
  const { mode, setMode } = useColorScheme();

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={mode ?? null}
      onChange={(_event, next: Mode | null) => {
        if (next) {
          setMode(next);
        }
      }}
      aria-label="Theme"
    >
      {OPTIONS.map(({ mode: option, label, icon }) => (
        <ToggleButton key={option} value={option} aria-label={label} title={label}>
          {icon}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

"use client";

import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { href: "/dashboard", label: "Users" },
  { href: "/sessions", label: "Sessions" },
];

/** Header of the signed-in pages: greeting, navigation, theme and log out. */
export function AppHeader({ firstName }: { firstName: string }): ReactNode {
  const pathname = usePathname();

  return (
    <AppBar position="static" color="default" elevation={0}>
      <Toolbar sx={{ gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
          Hello, {firstName}
        </Typography>
        <Stack component="nav" direction="row" spacing={1} aria-label="Main">
          {NAV.map(({ href, label }) => (
            <Button
              key={href}
              component={NextLink}
              href={href}
              color="inherit"
              aria-current={pathname === href ? "page" : undefined}
              sx={{ fontWeight: pathname === href ? 700 : 400 }}
            >
              {label}
            </Button>
          ))}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <ThemeToggle />
          <SignOutButton />
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

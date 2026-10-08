import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "User Admin",
  description: "Back-office user management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The init script changes the <html> class before React hydrates, so the server HTML and the
    // client DOM legitimately differ on this one element.
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Inline script that reads the stored theme and sets the class before the first paint. */}
        <InitColorSchemeScript attribute="class" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

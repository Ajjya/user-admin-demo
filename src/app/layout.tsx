import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Admin",
  description: "Back-office user management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

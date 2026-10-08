import { CenteredCard } from "@/components/CenteredCard";

// Route group "(auth)": shares this layout between /sign-in and /sign-up without adding a URL segment.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <CenteredCard>{children}</CenteredCard>;
}

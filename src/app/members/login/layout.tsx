import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Members login | Canary Dashboard" },
  robots: { index: false, follow: false },
};

export default function MembersLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

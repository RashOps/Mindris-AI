import { AppShell } from "@/components/layout/AppShell";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      contentClassName="bg-background"
    >
      {children}
    </AppShell>
  );
}

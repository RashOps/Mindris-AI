import { AppShell } from "@/components/layout/AppShell";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      title="Workspace"
      description="Build, analyze and export career documents through backend-owned APIs."
      contentClassName="bg-background"
    >
      {children}
    </AppShell>
  );
}

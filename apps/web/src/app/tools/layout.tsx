import { AppShell } from "@/components/layout/AppShell";
import { PRODUCT_COPY } from "@/lib/product-copy";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      title={PRODUCT_COPY.app.workspaceTitle}
      description={PRODUCT_COPY.app.workspaceDescription}
      contentClassName="bg-background"
    >
      {children}
    </AppShell>
  );
}

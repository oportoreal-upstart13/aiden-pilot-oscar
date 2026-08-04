import type { ReactNode } from "react";
import { PageHeader } from "@upstart13-com/aiden-ui";
import { SettingsNav } from "@/components/settings/settings-nav";

interface SettingsLayoutProps {
  children: ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your account, security, and preferences."
      />

      <div className="px-6 py-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          <SettingsNav />
          <div className="max-w-2xl min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

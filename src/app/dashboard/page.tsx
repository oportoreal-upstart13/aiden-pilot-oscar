import { PageHeader } from "@upstart13-com/aiden-ui";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Welcome to your AIDEN workspace. Replace this with your app's home view."
      />
      <div className="space-y-8 px-6 py-8">
        <p className="text-muted-foreground text-sm">
          The dashboard shell, navigation, and settings tabs are wired up via
          <code className="bg-muted ml-1 rounded-sm px-1 py-0.5 font-mono text-xs">
            @upstart13-com/aiden-ui
          </code>
          . Use the sidebar to access your account settings.
        </p>
      </div>
    </div>
  );
}

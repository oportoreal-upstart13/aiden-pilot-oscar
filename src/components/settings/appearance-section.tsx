"use client";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ThemeSelector,
} from "@upstart13-com/aiden-ui";

export function AppearanceSection() {
  return (
    <div className="space-y-6">
      <ThemeCard />
      <LocaleCard />
    </div>
  );
}

function ThemeCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
        <CardDescription>
          Choose how the app looks. System follows your OS setting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ThemeSelector />
      </CardContent>
    </Card>
  );
}

function LocaleCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Language</CardTitle>
          <Badge variant="outline">Coming soon</Badge>
        </div>
        <CardDescription>
          Localization will land in a future release. For now the app is
          English-only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border-border bg-muted/30 text-muted-foreground inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          English (United States)
        </div>
      </CardContent>
    </Card>
  );
}

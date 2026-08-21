import { auth } from "@/lib/auth";
import { brand, copyright } from "@/config/brand";
import { aidenConfig } from "@/../aiden.config";
import { SiteHeader } from "@upstart13-com/aiden-ui/layout/site-header";
import { SiteFooter } from "@upstart13-com/aiden-ui/layout/site-footer";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader session={session} brand={brand} />
      <main className="flex-1">{children}</main>
      <SiteFooter
        brand={brand}
        links={aidenConfig.app.footerLinks}
        tagline={brand.tagline}
        copyright={copyright}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Button } from "@upstart13-com/aiden-ui";
import { Filter, X } from "lucide-react";

interface AuditOrgFilterProps {
  initialOrgId: string;
}

export function AuditOrgFilter({ initialOrgId }: AuditOrgFilterProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialOrgId);

  function apply(orgId: string) {
    router.push(orgId ? `/admin/audit?orgId=${orgId}` : "/admin/audit");
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Filter by org ID…"
        className="max-w-xs"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") apply(value);
        }}
      />
      <Button variant="outline" size="sm" onClick={() => apply(value)}>
        <Filter className="mr-2 size-4" strokeWidth={1.5} />
        Filter
      </Button>
      {initialOrgId ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setValue("");
            apply("");
          }}
        >
          <X className="mr-2 size-4" strokeWidth={1.5} />
          Clear
        </Button>
      ) : null}
    </div>
  );
}

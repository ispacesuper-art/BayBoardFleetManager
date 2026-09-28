"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/book", label: "Book" },
  { href: "/shop", label: "Shop" },
] as const;

export function SiteNav() {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1.5">
      {LINKS.map((link) => {
        const current =
          link.href === "/"
            ? path === "/"
            : path === link.href || path.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              buttonVariants({
                size: "sm",
                variant: current ? "default" : "outline",
              })
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

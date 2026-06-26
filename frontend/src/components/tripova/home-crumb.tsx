"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/api";

// Breadcrumb "Home" link that respects where the visitor belongs. A logged-in
// traveller browsing a public page (destinations / food) expects "Home" to take
// them back into the app (/), not out to the marketing landing (/welcome).
export function HomeCrumb({ color }: { color: string }) {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    // Two-pass token read (see note above) — adopted after mount to avoid a mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(!!getToken());
  }, []);
  return (
    <Link href={authed ? "/" : "/welcome"} style={{ color, textDecoration: "none" }}>
      Home
    </Link>
  );
}

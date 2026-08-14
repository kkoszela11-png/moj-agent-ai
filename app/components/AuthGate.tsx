"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/app/lib/supabase";
import Nav from "@/app/components/Nav";

type Props = {
  children: React.ReactNode;
};

export default function AuthGate({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const isLoginPage = useMemo(() => pathname === "/login", [pathname]);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      const nextUser = data.user ?? null;
      setUser(nextUser);
      setChecking(false);

      if (!isLoginPage && !nextUser) {
        router.replace("/login");
      }

      if (isLoginPage && nextUser) {
        router.replace("/");
      }
    }

    void checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (!isLoginPage && !nextUser) {
        router.replace("/login");
      }

      if (isLoginPage && nextUser) {
        router.replace("/");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isLoginPage, router]);

  if (checking) {
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", color: "#cbd5e1" }}>
        Sprawdzam sesję...
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px" }}>
        <Nav />
      </div>
      {children}
    </>
  );
}

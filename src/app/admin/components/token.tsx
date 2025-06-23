"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const TokenGuard = ({ children }: { children: React.ReactNode }) => {
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const authStr = localStorage.getItem("adminAuth");
    if (!authStr) {
      router.replace("/admin/login");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;

  return <>{children}</>;
};

const TokenDisplay = () => {
  const [auth, setAuth] = useState<
    { adminToken: string; username: string } | null
  >(null);
  const router = useRouter();

  useEffect(() => {
    const authStr = localStorage.getItem("adminAuth");
    if (authStr) {
      try {
        const parsed = JSON.parse(authStr);
        setAuth(parsed);
      } catch {
        setAuth(null);
        router.replace("/admin/login");
      }
    } else {
      setAuth(null);
      router.replace("/admin/login");
    }
  }, [router]);

  if (!auth) return null;

  return <div style={{ wordBreak: "break-all" }}></div>;
};

export default function AdminPage() {
  return (
    <TokenGuard>
      <TokenDisplay />
    </TokenGuard>
  );
}
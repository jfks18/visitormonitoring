"use client";
import React ,{ useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface GuardAuthProps {
  children: React.ReactNode;
}

const GuardAuth: React.FC<GuardAuthProps> = ({ children }) => {
  const router = useRouter();

  const [debugRole, setDebugRole] = React.useState<any>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('guardAuth') || localStorage.getItem('adminAuth');
      if (!raw) {
        setDebugRole('none');
        router.replace('/guard/login');
        return;
      }
      const auth = JSON.parse(raw);
      setDebugRole(auth.role);
      console.log('[GuardAuth] auth.role:', auth.role);
      if (auth.role !== 4 && auth.role !== '4') {
        router.replace('/guard/login');
        return;
      }
    } catch {
      setDebugRole('error');
      router.replace('/guard/login');
    }
  }, [router]);

  return <>
    {/* Debug output for role value */}
    {children}
  </>;
};

export default GuardAuth;

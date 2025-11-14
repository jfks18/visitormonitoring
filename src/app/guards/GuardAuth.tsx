"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface GuardAuthProps {
  children: React.ReactNode;
}

const GuardAuth: React.FC<GuardAuthProps> = ({ children }) => {
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('guardAuth') || localStorage.getItem('adminAuth');
      if (!raw) {
        router.replace('/guard/login');
        return;
      }
      const auth = JSON.parse(raw);
      if (auth.role !== 4 && auth.role !== '4') {
        router.replace('/guard/login');
        return;
      }
    } catch {
      router.replace('/guard/login');
    }
  }, [router]);

  return <>{children}</>;
};

export default GuardAuth;

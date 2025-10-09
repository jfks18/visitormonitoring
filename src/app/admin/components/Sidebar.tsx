"use client";
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';

const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
  await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://apivisitor.onrender.com'}/api/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      localStorage.removeItem('adminAuth');
      router.replace('/admin/login');
    } catch (err) {
      alert('Logout failed.');
    }
  };

  const menu = [
    { label: 'Overview', path: '/admin/dashboard' },
    { label: 'Manage Office', path: '/admin/offices' },
    { label: 'Manage Employee', path: '/admin/professors' },
    { label: 'Manage Services', path: '/admin/service' },
    { label: 'Manage Position', path: '/admin/position' },
    { label: 'departments', path: '/admin/departments' },
    
  ];

  return (
    <aside style={{
      width: 220,
      background: '#e3f6fd',
      minHeight: '100vh',
      padding: '32px 0 0 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      borderRight: '1px solid #dbeafe',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
        <Image src="/backgrounds/passlogo.png" alt="GrandPass Logo" width={40} height={40} />
        <span style={{ fontWeight: 700, fontSize: 22, color: '#22577A', marginLeft: 10 }}>GrandPass</span>
      </div>
      <nav style={{ width: '100%' }}>
        <ul style={{ listStyle: 'none', padding: 0, width: '100%' }}>
          {menu.map((item, idx) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.label} style={{ margin: '8px 0' }}>
                <a
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    if (item.path !== '#') router.push(item.path);
                  }}
                  style={{
                    display: 'block',
                    padding: '10px 24px',
                    borderRadius: 8,
                    background: isActive ? '#fff' : 'none',
                    color: isActive ? '#22577A' : '#555',
                    fontWeight: isActive ? 700 : 500,
                    textDecoration: 'none',
                    fontSize: 15
                  }}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
          <li style={{ margin: '8px 0' }}>
            <a
              href="#"
              onClick={handleLogout}
              style={{
                display: 'block',
                padding: '10px 24px',
                borderRadius: 8,
                background: 'none',
                color: '#d32f2f',
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 15
              }}
            >
              Logout
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;

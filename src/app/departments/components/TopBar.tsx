import Image from 'next/image';

const TopBar = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '24px 40px 0 260px',
    background: '#eaf9fc',
    minHeight: 80
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Image src="/backgrounds/passlogo.png" alt="Profile" width={36} height={36} style={{ borderRadius: '50%' }} />
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 700, color: '#22577A', fontSize: 15 }}>PSU Admin</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>Admin account</div>
      </div>
    </div>
  </div>
);

export default TopBar;

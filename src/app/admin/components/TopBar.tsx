import Image from 'next/image';

const TopBar = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end', // align right
    padding: '24px 40px 0 240px',
    background: 'transparent',
    minHeight: 80
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Image src="/backgrounds/passlogo.png" alt="Profile" width={36} height={36} style={{ borderRadius: '50%' }} />
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 700, color: '#22577A', fontSize: 15 }}>PSU Admin</div>
        <div style={{ fontSize: 13, color: '#888' }}>Admin account</div>
      </div>
    </div>
  </div>
);

export default TopBar;

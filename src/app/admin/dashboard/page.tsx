import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import StatCards from '../components/StatCards';
import Navbar from '../components/navbar';
import Table from '../components/table';
import Token from '../components/token';
import { TokenGuard } from '../components/token';

const Dashboard = () => {
  return (
    <TokenGuard>
      <div style={{ background: '#e3f6fd', minHeight: '100vh', width: '100vw' }}>
        <Sidebar />
        <div style={{ marginLeft: 220, minHeight: '100vh' }}>
          <TopBar />
          <StatCards />
          <div style={{ padding: '32px 0 40px 40px' }}>
            <Token />
            <Table />
          </div>
        </div>
      </div>
    </TokenGuard>
  );
};

export default Dashboard;
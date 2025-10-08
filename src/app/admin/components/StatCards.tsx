"use client";
import React, { useEffect, useState } from 'react';

const StatCards = () => {
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [monthCount, setMonthCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStartStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const monthEndStr = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
    setLoading(true);
    Promise.all([
  fetch(`https://apivisitor.onrender.com/api/visitors?createdAt=${todayStr}`, {
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      }).then(res => res.json()),
  fetch(`https://apivisitor.onrender.com/api/visitors?startDate=${monthStartStr}&endDate=${monthEndStr}`, {
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      }).then(res => res.json())
    ]).then(([todayData, monthData]) => {
      setTodayCount(Array.isArray(todayData) ? todayData.length : 0);
      setMonthCount(Array.isArray(monthData) ? monthData.length : 0);
      setLoading(false);
    }).catch(() => {
      setTodayCount(null);
      setMonthCount(null);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{
      display: 'flex',
      gap: 32,
      padding: '32px 0 0 40px',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    }}>
      <div style={{
        background: '#FFFDD0',
        borderRadius: 18,
        boxShadow: '0 2px 12px #0001',
        padding: '28px 32px',
        minWidth: 170,
        minHeight: 110,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        flex: 1,
        maxWidth: 220
      }}>
        <div style={{ color: '#1877F2', fontWeight: 700, fontSize: 32 }}>
          {loading ? '...' : todayCount}
        </div>
        <div style={{ color: '#bdbdbd', fontSize: 15, fontWeight: 500 }}>Today</div>
        <div style={{ color: '#222', fontWeight: 600, fontSize: 16, marginTop: 8 }}>Visitors</div>
      </div>
      <div style={{
        background: '#FFFDD0',
        borderRadius: 18,
        boxShadow: '0 2px 12px #0001',
        padding: '28px 32px',
        minWidth: 170,
        minHeight: 110,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        flex: 1,
        maxWidth: 220
      }}>
        <div style={{ color: '#1877F2', fontWeight: 700, fontSize: 32 }}>
          {loading ? '...' : monthCount}
        </div>
        <div style={{ color: '#bdbdbd', fontSize: 15, fontWeight: 500 }}>This Month</div>
        <div style={{ color: '#222', fontWeight: 600, fontSize: 16, marginTop: 8 }}>Visitors</div>
      </div>
    </div>
  );
};

export default StatCards;

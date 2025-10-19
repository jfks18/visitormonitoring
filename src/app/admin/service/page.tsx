"use client";
import React from 'react';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import Table from './table';

const ServicePage = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#e3f6fd' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 220, minHeight: '100vh' }}>
        <TopBar />
        <div style={{ padding: 32 }}>
          <Table />
        </div>
      </div>
    </div>
  );
};

export default ServicePage;

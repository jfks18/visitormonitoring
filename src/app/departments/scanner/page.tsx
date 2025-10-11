import React from 'react'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import Scanner from './component/scanner'

const page = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#e3f6fd' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 220, minHeight: '100vh' }}>
        <TopBar />
        <div style={{ padding: 32 }}>
          <Scanner />
        </div>
      </div>
    </div>
  )
}

export default page

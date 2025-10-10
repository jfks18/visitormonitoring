import React from 'react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'

const dashboard = () => {
  return (
    <div>
      <Sidebar />
      <TopBar />
      <div>dashboard</div>
    </div>
  )
}

export default dashboard
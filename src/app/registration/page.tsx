import React from 'react'
import Navbar from './components/navbar'
import RegistrationCard from './components/registrationCard'

const page = () => {
  // Set body background color on mount
 

  return (
    <div style={{background: '#1976d2' }}>
      <Navbar />
      <RegistrationCard />
    </div>
  )
}

export default page

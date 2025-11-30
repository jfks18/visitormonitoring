
import React from 'react';
import Navbar from './components/navbar';
import RegistrationCard from './components/registrationCard';
import GuardAuth from '../guards/GuardAuth';


const page = () => {
  return (
    <GuardAuth>
      <div style={{ background: '#1976d2' }}>
        <Navbar />
        <RegistrationCard />
      </div>
    </GuardAuth>
  );
};

export default page;

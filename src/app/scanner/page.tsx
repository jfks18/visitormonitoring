
import React from 'react';
import Scanner from './component/scanner';
import GuardAuth from '../guards/GuardAuth';


const page = () => {
  return (
    <GuardAuth>
      <div>
        <Scanner />
      </div>
    </GuardAuth>
  );
};

export default page;
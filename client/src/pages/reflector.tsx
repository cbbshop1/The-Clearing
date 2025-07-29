import React from 'react';
import EthicsReflectionBar from '../components/EthicsReflectionBar';

const ReflectorPage: React.FC = () => {
  return (
    <div className="p-6 flex justify-center items-center min-h-screen bg-gray-50">
      <EthicsReflectionBar />
    </div>
  );
};

export default ReflectorPage;
import React, { useState } from 'react';
import { UserAddOutlined } from '@ant-design/icons';

const AddUserButton: React.FC = () => {
  const [isAdmin] = useState(true); // This should come from your auth system

  if (!isAdmin) return null;

  return (
    <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
      <UserAddOutlined />
      <span>AddUser</span>
    </button>
  );
};

export default AddUserButton; 
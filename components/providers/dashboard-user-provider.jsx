'use client';

import { createContext, useContext } from 'react';

const DashboardUserContext = createContext(null);

export function DashboardUserProvider({ user, children }) {
  return (
    <DashboardUserContext.Provider value={user}>
      {children}
    </DashboardUserContext.Provider>
  );
}

export function useUser() {
  return useContext(DashboardUserContext);
}

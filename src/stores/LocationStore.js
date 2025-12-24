import React from 'react'
import { create } from 'zustand'

const useLocationStore = create((set) => ({
    location: null,
    setLocation: (userData) => set({ location: userData }),
    clearLocation: () => set({ location: null })
}));

export default useLocationStore;

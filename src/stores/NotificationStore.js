import React from 'react'
import { create } from 'zustand'

const useNotificationStore = create((set) => ({
    notification: null,
    setNotification: (userData) => set({ notification: userData }),
    clearNotification: () => set({ notification: null }),

    notificationList: [],
    setNotificationList: (data) => set({ notificationList: data }),
    clearNotificationList: () => set({ notificationList: [] })
}));

export default useNotificationStore;

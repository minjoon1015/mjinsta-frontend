import { create } from "zustand";

const useStompClientStore = create((set) => ({
  stompClient: null,
  connected: false,
  setStompClient: (client) => set({ stompClient: client }),
  setConnected: (val) => set({ connected: val }),
}));

export default useStompClientStore;

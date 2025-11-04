import { create } from 'zustand';

const useSearchPanelStore = create((set) => ({
  showSearch: false,
  toggleSearch: () => set((state) => ({ showSearch: !state.showSearch })),
  closeSearch: () => set({ showSearch: false }),
}));

export default useSearchPanelStore;
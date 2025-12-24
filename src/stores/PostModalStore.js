import { create } from 'zustand';

const usePostModalStore = create((set) => ({
    selectedPostId: null, 

    openPostModal: (postId) => set({ selectedPostId: postId }),

    closePostModal: () => set({ selectedPostId: null }),
}));

export default usePostModalStore;
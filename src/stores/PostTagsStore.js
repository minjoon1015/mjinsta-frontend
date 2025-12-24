import { create } from 'zustand';

const usePostTagsStore = create((set) => ({
    postTags: {},
    setPostTags: (newTags) => set({ postTags: newTags }),
    
    removeTagsByIndex: (indexToRemove) => set((state) => {
        const newTags = { ...state.postTags };

        delete newTags[indexToRemove];

        const updatedTags = {};
        
        // 2. 삭제된 인덱스 뒤의 모든 인덱스를 1씩 감소시켜 재정렬
        Object.keys(newTags).forEach(key => {
            const index = parseInt(key);
            
            if (index < indexToRemove) {
                // 삭제 인덱스 앞의 태그는 인덱스 유지
                updatedTags[index] = newTags[key];
            } else if (index > indexToRemove) {
                // 삭제 인덱스 뒤의 태그는 인덱스를 1 감소시켜 업데이트
                updatedTags[index - 1] = newTags[key];
            }
        });

        return { postTags: updatedTags };
    }),

    clearPostTags: () => set({ postTags: {} })
}));

export default usePostTagsStore;
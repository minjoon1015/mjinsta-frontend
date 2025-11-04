export const followUser = async (token, followingUserId) => {
    const apiUrl = process.env.REACT_APP_API_URL;

    try {
        const response = await fetch(`${apiUrl}/api/user/follow`, {
            method:"POST",
            headers:{
                "Authorization":`Bearer ${token}`,
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                "followingId":followingUserId
            })
        })
        const data = await response.json();
        return data;
    } catch (error) {
        
    }
}
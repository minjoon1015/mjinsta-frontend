export const unFollowUser = async (token, unFollowingUserId) => {
    const apiUrl = process.env.REACT_APP_API_URL;

    try {
        const response = await fetch(`${apiUrl}/api/user/un_follow`, {
            method:"POST",
            headers:{
                "Authorization":`Bearer ${token}`,
                "Content-Type":"Application/json"
            },
            body:JSON.stringify({
                "unFollowingId":unFollowingUserId
            })
        })
        const data = await response.json();
        return data;
    } catch (error) {
        
    }
}
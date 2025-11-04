export const getUserMe = async (token) => {
  const apiUrl = process.env.REACT_APP_API_URL;
  try {
    const response = await fetch(`${apiUrl}/api/user/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (data.code !== "SC") {
      return false;
    }
    return data.user;
  } catch (error) {

  }
};
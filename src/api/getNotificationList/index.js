export const getNotifyList = async (token) => {
  const apiUrl = process.env.REACT_APP_API_URL;

  try {
    const response = await fetch(`${apiUrl}/api/alarm/getList`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      },
    });
    const data = await response.json();
    if (data.code !== "SC") {
      return null;
    }
    return data.list;
  } catch (error) {

  }
};
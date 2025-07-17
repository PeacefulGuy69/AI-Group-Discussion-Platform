const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  socketURL: process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000'
};

export default API_CONFIG;

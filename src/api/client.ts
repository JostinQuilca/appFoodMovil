// src/api/client.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// URL de tu backend en producción
const API_URL = "https://foodapp-g0jx.onrender.com/graphql";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: Antes de cada petición, busca el token en el celular y lo agrega
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;

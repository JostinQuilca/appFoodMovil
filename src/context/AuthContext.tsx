// src/context/AuthContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../api/client";
import { User } from "../types";

const LOGIN_MUTATION = `
  mutation UserLogin($loginInput: LoginInput!) {
    login(loginInput: $loginInput) {
      access_token
      user {
        cedula
        nombre
        email
        direccionPrincipal
        rol { nombre }
      }
    }
  }
`;

const REGISTER_MUTATION = `
  mutation RegisterUser($createUsuarioInput: CreateUsuarioInput!) {
    register(createUsuarioInput: $createUsuarioInput) {
      cedula
      email
      nombre
    }
  }
`;

const CHANGE_PASSWORD_MUTATION = `
  mutation ChangePassword($changePasswordInput: ChangePasswordInput!) {
    changePassword(changePasswordInput: $changePasswordInput) {
      message
      success
    }
  }
`;

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => Promise<void>;
  changePassword: (
    oldPassword: string,
    newPassword: string,
  ) => Promise<{ success: boolean; message: string }>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        const token = await AsyncStorage.getItem("access_token");
        if (storedUser && token) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.log("Error cargando sesión:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const response = await apiClient.post("", {
        query: LOGIN_MUTATION,
        variables: { loginInput: { email, password: pass } },
      });

      const data = response.data.data?.login;

      if (data) {
        await AsyncStorage.setItem("access_token", data.access_token);
        await AsyncStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error en login:", error);
      return false;
    }
  };

  const register = async (userData: any) => {
    try {
      // CORRECCIÓN: Mapeo exacto según tu schema.gql del backend
      // El backend espera: cedula, nombre, email, password, direccionPrincipal, rolId
      const input = {
        cedula: userData.cedula,
        nombre: userData.nombre,
        apellido: userData.apellido,
        email: userData.email,
        telefono: userData.telefono,
        // Aquí estaba el error: el backend pide 'password', no 'contrasena'
        password: userData.password || userData.contrasena,
        // El backend pide 'direccionPrincipal', no 'direccion_principal'
        direccionPrincipal:
          userData.direccionPrincipal || userData.direccion_principal,
        rolId: 2, // Cliente por defecto
      };

      const response = await apiClient.post("", {
        query: REGISTER_MUTATION,
        variables: { createUsuarioInput: input },
      });

      // Si hay errores de GraphQL (ej. campos extraños), response.data.errors tendrá datos
      if (response.data.errors) {
        console.error("Errores GraphQL:", response.data.errors);
        return false;
      }

      if (response.data.data?.register) {
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error de red en registro:", error);
      return false;
    }
  };

  const logout = async () => {
    await AsyncStorage.clear();
    setUser(null);
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      const response = await apiClient.post("", {
        query: CHANGE_PASSWORD_MUTATION,
        variables: {
          changePasswordInput: {
            oldPassword,
            newPassword,
          },
        },
      });

      if (response.data.errors) {
        console.error("Errores GraphQL:", response.data.errors);
        return {
          success: false,
          message:
            response.data.errors[0]?.message || "Error al cambiar contraseña",
        };
      }

      if (response.data.data?.changePassword?.success) {
        return {
          success: true,
          message:
            response.data.data.changePassword.message ||
            "Contraseña actualizada exitosamente",
        };
      }

      return {
        success: false,
        message: "No se pudo cambiar la contraseña",
      };
    } catch (error: any) {
      console.error("Error al cambiar contraseña:", error);
      return {
        success: false,
        message: error.message || "Error de conexión",
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, changePassword, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

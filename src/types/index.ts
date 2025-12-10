// src/types/index.ts

export interface Role {
  id: number;
  nombre: "CLIENTE" | "ADMINISTRADOR";
}

export interface User {
  cedula: string;
  nombre: string;
  email: string;
  rol: Role;
  direccionPrincipal: string;
}

export interface Dish {
  id: number;
  nombreItem: string;
  descripcion?: string;
  precio: number;
  disponible: boolean;
  estado: "ACTIVO" | "DESCONTINUADO";
  categoriaNombre: string;
}

export interface CartItem extends Dish {
  quantity: number;
  notasAdicionales?: string;
}

export interface LoginResponse {
  data: {
    login: {
      access_token: string;
      user: User;
    };
  };
}

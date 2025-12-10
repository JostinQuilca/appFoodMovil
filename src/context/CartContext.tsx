// src/context/CartContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CartItem, Dish } from "../types";

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Dish) => void;
  removeFromCart: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void; // <--- ESTO FALTABA
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Cargar carrito guardado
  useEffect(() => {
    AsyncStorage.getItem("cart").then((data) => {
      if (data) setCartItems(JSON.parse(data));
    });
  }, []);

  // Guardar carrito al cambiar
  useEffect(() => {
    AsyncStorage.setItem("cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item: Dish) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Función para subir/bajar cantidad
  const updateQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCartItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, quantity } : i))
      );
    }
  };

  const clearCart = () => setCartItems([]);

  const cartTotal = cartItems.reduce(
    (acc, item) => acc + item.precio * item.quantity,
    0
  );
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

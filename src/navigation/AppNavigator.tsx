import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

// Iconos
import {
  Utensils,
  ShoppingCart,
  History,
  ClipboardList,
  Package,
} from "lucide-react-native";

// Contextos
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

// Componente de Cabecera
import HeaderAuth from "../components/HeaderAuth";

// Pantallas Cliente
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import CartScreen from "../screens/CartScreen";
import OrdersScreen from "../screens/OrdersScreen";
import ProfileScreen from "../screens/ProfileScreen"; // <--- Importante

// Pantallas Admin
import AdminOrdersScreen from "../screens/admin/AdminOrdersScreen";
import AdminMenuScreen from "../screens/admin/AdminMenuScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 1. NAVEGACIÓN DE CLIENTE (Menú, Pedidos, Carrito)
function ClientTabs() {
  const { cartCount } = useCart();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#D7263D",
        headerRight: () => <HeaderAuth />,
      }}
    >
      <Tab.Screen
        name="Menú"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color }) => <Utensils color={color} /> }}
      />
      <Tab.Screen
        name="Mis Pedidos"
        component={OrdersScreen}
        options={{ tabBarIcon: ({ color }) => <History color={color} /> }}
      />
      <Tab.Screen
        name="Carrito"
        component={CartScreen}
        options={{
          tabBarIcon: ({ color }) => <ShoppingCart color={color} />,
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
        }}
      />
    </Tab.Navigator>
  );
}

// 2. NAVEGACIÓN DE ADMINISTRADOR
function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#D7263D",
        headerRight: () => <HeaderAuth />,
      }}
    >
      <Tab.Screen
        name="Gestión Pedidos"
        component={AdminOrdersScreen}
        options={{ tabBarIcon: ({ color }) => <ClipboardList color={color} /> }}
      />
      <Tab.Screen
        name="Gestión Platillos"
        component={AdminMenuScreen}
        options={{ tabBarIcon: ({ color }) => <Package color={color} /> }}
      />
    </Tab.Navigator>
  );
}

// 3. NAVEGADOR PRINCIPAL
export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* LÓGICA DE ROLES PARA PANTALLA PRINCIPAL */}
        {user?.rol?.nombre === "ADMINISTRADOR" ? (
          <Stack.Screen name="AdminPanel" component={AdminTabs} />
        ) : (
          <Stack.Screen name="ClientApp" component={ClientTabs} />
        )}

        {/* PANTALLAS COMUNES (Modales o Stacks) */}

        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            headerShown: true,
            title: "Iniciar Sesión",
            headerTintColor: "#D7263D",
          }}
        />

        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{
            headerShown: true,
            title: "Crear Cuenta",
            headerTintColor: "#D7263D",
          }}
        />

        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            headerShown: true,
            title: "Mi Perfil",
            headerTintColor: "#D7263D",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

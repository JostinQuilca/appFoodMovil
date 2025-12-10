// src/screens/CartScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { Trash2, Plus, Minus } from "lucide-react-native";
import apiClient from "../api/client";

const CREATE_PEDIDO_MUTATION = `
  mutation CreatePedidoMaestroDetalle($createPedidoInput: CreatePedidoInput!) {
    createPedido(createPedidoInput: $createPedidoInput) {
      id
      montoTotal
    }
  }
`;

export default function CartScreen() {
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartTotal } =
    useCart();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState<{ [key: number]: string }>({}); // Notas locales temporales

  const handleUpdateNote = (id: number, text: string) => {
    setNotes((prev) => ({ ...prev, [id]: text }));
  };

  const handleCheckout = async () => {
    // 1. VALIDACIÓN DE USUARIO: Si no hay usuario, mandar a Login
    if (!user) {
      Alert.alert(
        "Inicia Sesión",
        "Necesitas una cuenta para confirmar tu pedido.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Ir a Login", onPress: () => navigation.navigate("Login") },
        ]
      );
      return;
    }

    // 2. Proceso de Pedido (Solo si hay usuario)
    setIsSubmitting(true);
    try {
      const detalles = cartItems.map((item) => ({
        itemId: item.id,
        cantidad: item.quantity,
        precioUnitario: item.precio,
        subtotal: item.precio * item.quantity,
        notasAdicionales: notes[item.id] || null,
      }));

      const input = {
        usuarioCedula: user.cedula,
        tipoEntrega: "Delivery",
        direccionEntrega: user.direccionPrincipal,
        montoTotal: cartTotal,
        estadoPedido: "Pendiente",
        detalles: detalles,
      };

      const response = await apiClient.post("", {
        query: CREATE_PEDIDO_MUTATION,
        variables: { createPedidoInput: input },
      });

      if (response.data.data?.createPedido) {
        Alert.alert("¡Pedido Enviado!", "Tu comida está en camino.");
        clearCart();
        navigation.navigate("Menú"); // Volver al inicio
      } else {
        Alert.alert("Error", "No se pudo procesar el pedido.");
        console.log(response.data.errors);
      }
    } catch (error) {
      Alert.alert("Error", "Fallo de conexión");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Tu carrito está vacío 🍔</Text>
        <TouchableOpacity
          style={styles.shopBtn}
          onPress={() => navigation.navigate("Menú")}
        >
          <Text style={styles.shopBtnText}>Ir al Menú</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cartItems}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.title}>{item.nombreItem}</Text>
              <Text style={styles.price}>
                ${(item.precio * item.quantity).toFixed(2)}
              </Text>
            </View>

            <TextInput
              style={styles.inputNote}
              placeholder="Notas (ej. sin cebolla)"
              value={notes[item.id]}
              onChangeText={(text) => handleUpdateNote(item.id, text)}
            />

            <View style={styles.controls}>
              <View style={styles.counter}>
                <TouchableOpacity
                  onPress={() => updateQuantity(item.id, item.quantity - 1)}
                >
                  <Minus size={20} color="#333" />
                </TouchableOpacity>
                <Text style={styles.qty}>{item.quantity}</Text>
                <TouchableOpacity
                  onPress={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus size={20} color="#333" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                <Trash2 size={20} color="#D7263D" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>${cartTotal.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutBtn, isSubmitting && { opacity: 0.7 }]}
          onPress={handleCheckout}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.checkoutText}>
              {user ? "Confirmar Pedido" : "Iniciar Sesión para Ordenar"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 18, color: "#666", marginBottom: 20 },
  shopBtn: { backgroundColor: "#D7263D", padding: 12, borderRadius: 8 },
  shopBtnText: { color: "white", fontWeight: "bold" },
  card: {
    backgroundColor: "white",
    margin: 10,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: "bold" },
  price: { fontSize: 16, color: "#D7263D", fontWeight: "bold" },
  inputNote: {
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
    padding: 8,
    fontSize: 12,
    marginBottom: 10,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  counter: { flexDirection: "row", alignItems: "center", gap: 15 },
  qty: { fontSize: 16, fontWeight: "bold" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  totalLabel: { fontSize: 18, fontWeight: "bold" },
  totalValue: { fontSize: 20, fontWeight: "bold", color: "#D7263D" },
  checkoutBtn: {
    backgroundColor: "#D7263D",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  checkoutText: { color: "white", fontWeight: "bold", fontSize: 16 },
});

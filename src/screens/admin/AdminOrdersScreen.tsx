// src/screens/admin/AdminOrdersScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import apiClient from "../../api/client";
import { Check, Truck, PackageCheck, X } from "lucide-react-native";

const GET_ALL_PEDIDOS = `
  query {
    pedidos {
      id
      usuarioCedula
      montoTotal
      estadoPedido
      fechaPedido
      usuario { nombre email }
      detalles {
        cantidad
        platillo { 
          id
          nombreItem 
          precio
        }
      }
    }
  }
`;

const UPDATE_PEDIDO = `
    mutation UpdatePedidoEstado($updatePedidoInput: UpdatePedidoInput!) {
        updatePedido(updatePedidoInput: $updatePedidoInput) {
            id
            estadoPedido
        }
    }
`;

const GET_PLATILLOS = `
  query {
    platillos {
      id
      nombreItem
      precio
    }
  }
`;

export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const response = await apiClient.post("", { query: GET_ALL_PEDIDOS });
      const all = response.data.data?.pedidos || [];
      // Ordenar por fecha: más recientes primero
      setOrders(
        all.sort(
          (a: any, b: any) =>
            new Date(b.fechaPedido).getTime() -
            new Date(a.fechaPedido).getTime(),
        ),
      );
    } catch (error) {
      console.error("[AdminOrders] Error fetching orders:", error);
      console.error(
        "[AdminOrders] Error response data:",
        (error as any).response?.data,
      );
      console.error(
        "[AdminOrders] Error response status:",
        (error as any).response?.status,
      );
      Alert.alert(
        "Error",
        "No se pudieron cargar los pedidos. Revisa la consola para más detalles.",
      );
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPlatillosMap = async () => {
    try {
      const res = await apiClient.post("", { query: GET_PLATILLOS });
      const list = res.data.data?.platillos || [];
      const map: Record<string, any> = {};
      list.forEach((p: any) => {
        if (p.nombreItem) map[p.nombreItem.toLowerCase()] = p;
        if (p.item_id) map[p.item_id] = p;
        if (p.id) map[p.id] = p;
      });
      return map;
    } catch (err) {
      console.error("[AdminOrders] No se pudieron cargar platillos:", err);
      return {};
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, []),
  );

  const changeStatus = (id: number, newStatus: string) => {
    Alert.alert("Confirmar", `¿Cambiar estado a "${newStatus}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí, cambiar",
        onPress: async () => {
          // Actualización optimista (visual inmediata)
          setOrders((prev) =>
            prev.map((o) =>
              o.id === id ? { ...o, estadoPedido: newStatus } : o,
            ),
          );

          try {
            await apiClient.post("", {
              query: UPDATE_PEDIDO,
              variables: { updatePedidoInput: { id, estadoPedido: newStatus } },
            });
            // Si el admin autoriza el pedido, NO crear factura automáticamente.
            // El vendedor será quien consulte "Pedidos autorizados" y genere la factura manualmente.
            if (newStatus === "Autorizado") {
              Alert.alert(
                "Pedido autorizado",
                "El pedido fue autorizado. El vendedor lo verá en su pantalla para crear la factura.",
              );
            }
          } catch (e) {
            Alert.alert("Error", "No se pudo actualizar en el servidor");
            fetchOrders(); // Revertir si falla
          }
        },
      },
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pendiente":
        return "orange";
      case "Autorizado":
        return "#3b82f6"; // Azul
      case "Enviado":
        return "#8b5cf6"; // Violeta
      case "Entregado":
        return "#10b981"; // Verde
      default:
        return "gray";
    }
  };

  // --- LÓGICA DE BOTONES DINÁMICOS ---
  const renderActions = (item: any) => {
    const status = item.estadoPedido;

    // Pendiente -> allow Cancelar or Autorizar
    if (status === "Pendiente") {
      return (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#ef4444" }]}
            onPress={() => changeStatus(item.id, "Cancelado")}
          >
            <X color="white" size={16} />
            <Text style={styles.btnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#10b981" }]}
            onPress={() => changeStatus(item.id, "Autorizado")}
          >
            <Check color="white" size={16} />
            <Text style={styles.btnText}>Autorizar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Autorizado -> allow Enviar
    if (status === "Autorizado") {
      return (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#3b82f6" }]}
            onPress={() => changeStatus(item.id, "Enviado")}
          >
            <Truck color="white" size={16} />
            <Text style={styles.btnText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Enviado -> allow Entregado
    if (status === "Enviado") {
      return (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#10b981" }]}
            onPress={() => changeStatus(item.id, "Entregado")}
          >
            <PackageCheck color="white" size={16} />
            <Text style={styles.btnText}>Entregado</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  if (loading && !refreshing)
    return (
      <ActivityIndicator
        size="large"
        color="#D7263D"
        style={{ marginTop: 50 }}
      />
    );

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Pedido #{item.id}</Text>
              <Text
                style={[
                  styles.status,
                  { color: getStatusColor(item.estadoPedido) },
                ]}
              >
                {item.estadoPedido}
              </Text>
            </View>
            <Text style={styles.user}>
              {item.usuario?.nombre || item.usuarioCedula}
            </Text>
            <Text style={styles.total}>
              Total: ${item.montoTotal.toFixed(2)}
            </Text>

            <View style={styles.details}>
              {item.detalles.map((d: any, index: number) => (
                <Text key={index} style={styles.detailText}>
                  • {d.cantidad}x {d.platillo.nombreItem}
                </Text>
              ))}
            </View>

            {/* Renderizamos los botones dinámicamente */}
            {renderActions(item)}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 10 },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  title: { fontWeight: "bold", fontSize: 16 },
  status: { fontWeight: "bold" },
  user: { color: "#666", marginBottom: 5 },
  total: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#D7263D",
    marginBottom: 10,
  },
  details: {
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  detailText: { fontSize: 12, color: "#444" },
  actions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
  },
  btn: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignItems: "center",
    gap: 5,
  },
  btnText: { color: "white", fontWeight: "bold", fontSize: 12 },
});

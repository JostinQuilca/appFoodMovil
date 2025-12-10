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
        platillo { nombreItem }
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
            new Date(a.fechaPedido).getTime()
        )
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
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
              o.id === id ? { ...o, estadoPedido: newStatus } : o
            )
          );

          try {
            await apiClient.post("", {
              query: UPDATE_PEDIDO,
              variables: { updatePedidoInput: { id, estadoPedido: newStatus } },
            });
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
    if (
      item.estadoPedido === "Entregado" ||
      item.estadoPedido === "Cancelado"
    ) {
      return null; // No mostrar botones si ya terminó el ciclo
    }

    return (
      <View style={styles.actions}>
        {/* Si está PENDIENTE -> Mostrar AUTORIZAR o CANCELAR */}
        {item.estadoPedido === "Pendiente" && (
          <>
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
          </>
        )}

        {/* Si está AUTORIZADO -> Mostrar ENVIAR */}
        {item.estadoPedido === "Autorizado" && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#3b82f6" }]}
            onPress={() => changeStatus(item.id, "Enviado")}
          >
            <Truck color="white" size={16} />
            <Text style={styles.btnText}>Enviar Pedido</Text>
          </TouchableOpacity>
        )}

        {/* Si está ENVIADO -> Mostrar ENTREGAR */}
        {item.estadoPedido === "Enviado" && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#8b5cf6" }]}
            onPress={() => changeStatus(item.id, "Entregado")}
          >
            <PackageCheck color="white" size={16} />
            <Text style={styles.btnText}>Marcar Entregado</Text>
          </TouchableOpacity>
        )}
      </View>
    );
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

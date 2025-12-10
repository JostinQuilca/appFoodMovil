// src/screens/OrdersScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import apiClient from "../api/client";
import { Clock, CheckCircle, XCircle, Truck } from "lucide-react-native";

const GET_PEDIDOS_QUERY = `
  query {
    pedidos {
      id
      usuarioCedula
      montoTotal
      estadoPedido
      fechaPedido
      detalles {
        id
        cantidad
        platillo {
          nombreItem
        }
      }
    }
  }
`;

export default function OrdersScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    if (!user) return; // Si no hay usuario, no buscamos nada

    try {
      const response = await apiClient.post("", { query: GET_PEDIDOS_QUERY });
      const allOrders = response.data.data?.pedidos || [];

      // Filtramos solo los pedidos de ESTE usuario y ordenamos por fecha (más reciente primero)
      const myOrders = allOrders
        .filter((o: any) => o.usuarioCedula === user.cedula)
        .sort(
          (a: any, b: any) =>
            new Date(b.fechaPedido).getTime() -
            new Date(a.fechaPedido).getTime()
        );

      setOrders(myOrders);
    } catch (error) {
      console.error("Error cargando pedidos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Recargar pedidos cada vez que entras a la pantalla
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pendiente":
        return "#f59e0b"; // Ámbar
      case "Autorizado":
        return "#3b82f6"; // Azul
      case "Enviado":
        return "#8b5cf6"; // Violeta
      case "Entregado":
        return "#10b981"; // Verde
      case "Cancelado":
        return "#ef4444"; // Rojo
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pendiente":
        return <Clock size={20} color={getStatusColor(status)} />;
      case "Autorizado":
      case "Enviado":
        return <Truck size={20} color={getStatusColor(status)} />;
      case "Entregado":
        return <CheckCircle size={20} color={getStatusColor(status)} />;
      case "Cancelado":
        return <XCircle size={20} color={getStatusColor(status)} />;
      default:
        return <Clock size={20} color={getStatusColor(status)} />;
    }
  };

  // Si no está logueado, mostramos mensaje
  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>
          Inicia sesión para ver tu historial
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.btnText}>Ir al Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && !refreshing)
    return (
      <ActivityIndicator
        style={{ marginTop: 50 }}
        size="large"
        color="#D7263D"
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
        ListEmptyComponent={
          <Text style={styles.noOrdersText}>Aún no tienes pedidos.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.idText}>Pedido #{item.id}</Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: getStatusColor(item.estadoPedido) + "20" },
                ]}
              >
                {getStatusIcon(item.estadoPedido)}
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(item.estadoPedido) },
                  ]}
                >
                  {item.estadoPedido}
                </Text>
              </View>
            </View>

            <Text style={styles.date}>
              {new Date(item.fechaPedido).toLocaleDateString()} -{" "}
              {new Date(item.fechaPedido).toLocaleTimeString()}
            </Text>

            <View style={styles.divider} />

            {item.detalles.map((d: any) => (
              <Text key={d.id} style={styles.detailText}>
                • {d.cantidad}x {d.platillo.nombreItem}
              </Text>
            ))}

            <View style={styles.footer}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                ${Number(item.montoTotal).toFixed(2)}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 10 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  idText: { fontSize: 18, fontWeight: "bold", color: "#333" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statusText: { fontWeight: "bold", fontSize: 12 },
  date: { color: "#888", fontSize: 12, marginBottom: 10 },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 8 },
  detailText: { fontSize: 14, color: "#444", marginBottom: 2 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  totalLabel: { fontSize: 16, fontWeight: "bold" },
  totalValue: { fontSize: 18, fontWeight: "bold", color: "#D7263D" },
  emptyText: { fontSize: 16, color: "#666", marginBottom: 20 },
  noOrdersText: {
    textAlign: "center",
    marginTop: 50,
    color: "#666",
    fontSize: 16,
  },
  btn: { backgroundColor: "#D7263D", padding: 12, borderRadius: 8 },
  btnText: { color: "white", fontWeight: "bold" },
});

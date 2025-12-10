// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import apiClient from "../api/client";
import { useCart } from "../context/CartContext";
import { Dish } from "../types";
import { Plus } from "lucide-react-native";

const GET_PLATILLOS = `
  query {
    platillos {
      id
      nombreItem
      descripcion
      precio
      disponible
      estado
      categoriaNombre
    }
  }
`;

export default function HomeScreen() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    apiClient
      .post("", { query: GET_PLATILLOS })
      .then((res) => {
        const all = res.data.data?.platillos || [];
        // Filtramos solo activos y disponibles, igual que en tu web
        setDishes(
          all.filter((d: Dish) => d.disponible && d.estado === "ACTIVO")
        );
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
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
        data={dishes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.info}>
              <Text style={styles.category}>{item.categoriaNombre}</Text>
              <Text style={styles.title}>{item.nombreItem}</Text>
              <Text style={styles.desc} numberOfLines={2}>
                {item.descripcion}
              </Text>
              <Text style={styles.price}>
                ${Number(item.precio).toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => addToCart(item)}
            >
              <Plus color="white" size={24} />
            </TouchableOpacity>
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
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  info: { flex: 1, paddingRight: 10 },
  category: {
    fontSize: 10,
    color: "#D7263D",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  title: { fontSize: 18, fontWeight: "bold", color: "#333" },
  desc: { color: "#666", fontSize: 12, marginVertical: 4 },
  price: { fontSize: 16, fontWeight: "bold", color: "#333" },
  addBtn: {
    backgroundColor: "#D7263D",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});

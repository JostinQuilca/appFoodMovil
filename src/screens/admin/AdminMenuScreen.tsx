// src/screens/admin/AdminMenuScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import apiClient from "../../api/client";
import { Package, Plus, X } from "lucide-react-native";

const GET_ALL_PLATILLOS = `
  query {
    platillos {
      id
      nombreItem
      precio
      estado
      categoriaNombre
      descripcion
    }
  }
`;

const UPDATE_PLATILLO = `
    mutation updatePlatillo($updatePlatilloInput: UpdatePlatilloInput!) {
        updatePlatillo(updatePlatilloInput: $updatePlatilloInput) {
            id
            estado
        }
    }
`;

// Misma mutación que en tu web src/app/admin/dishes/page.tsx
const CREATE_PLATILLO = `
  mutation createPlatillo($createPlatilloInput: CreatePlatilloInput!) {
    createPlatillo(createPlatilloInput: $createPlatilloInput) {
      id
      nombreItem
    }
  }
`;

export default function AdminMenuScreen() {
  const [dishes, setDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para el Modal de Crear
  const [modalVisible, setModalVisible] = useState(false);
  const [newItem, setNewItem] = useState({
    nombreItem: "",
    categoriaNombre: "",
    descripcion: "",
    precio: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  const fetchDishes = async () => {
    try {
      const response = await apiClient.post("", { query: GET_ALL_PLATILLOS });
      setDishes(response.data.data?.platillos || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDishes();
    }, [])
  );

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVO" ? "DESCONTINUADO" : "ACTIVO";
    setDishes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, estado: newStatus } : d))
    );

    try {
      await apiClient.post("", {
        query: UPDATE_PLATILLO,
        variables: { updatePlatilloInput: { id, estado: newStatus } },
      });
    } catch (e) {
      console.error("Error actualizando", e);
      fetchDishes();
    }
  };

  const handleCreate = async () => {
    if (!newItem.nombreItem || !newItem.precio || !newItem.categoriaNombre) {
      Alert.alert("Error", "Nombre, Precio y Categoría son obligatorios");
      return;
    }

    setIsCreating(true);
    try {
      const input = {
        nombreItem: newItem.nombreItem,
        categoriaNombre: newItem.categoriaNombre,
        descripcion: newItem.descripcion,
        precio: parseFloat(newItem.precio),
        estado: "ACTIVO",
        disponible: true,
      };

      const response = await apiClient.post("", {
        query: CREATE_PLATILLO,
        variables: { createPlatilloInput: input },
      });

      if (response.data.data?.createPlatillo) {
        Alert.alert("Éxito", "Platillo creado correctamente");
        setModalVisible(false);
        setNewItem({
          nombreItem: "",
          categoriaNombre: "",
          descripcion: "",
          precio: "",
        }); // Reset
        fetchDishes(); // Recargar lista
      } else {
        Alert.alert("Error", "No se pudo crear el platillo");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Fallo de conexión al crear");
    } finally {
      setIsCreating(false);
    }
  };

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
      {/* Lista de Platillos */}
      <FlatList
        data={dishes}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 80 }} // Espacio para el botón flotante
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.nombreItem}</Text>
              <Text style={styles.cat}>
                {item.categoriaNombre} - ${Number(item.precio).toFixed(2)}
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 10,
                  marginBottom: 5,
                  color: item.estado === "ACTIVO" ? "green" : "red",
                }}
              >
                {item.estado}
              </Text>
              <Switch
                trackColor={{ false: "#767577", true: "#D7263D" }}
                value={item.estado === "ACTIVO"}
                onValueChange={() => toggleStatus(item.id, item.estado)}
              />
            </View>
          </View>
        )}
      />

      {/* Botón Flotante para Agregar */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Plus color="white" size={30} />
      </TouchableOpacity>

      {/* Modal de Creación */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Platillo</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nombre del Platillo *"
              value={newItem.nombreItem}
              onChangeText={(t) => setNewItem({ ...newItem, nombreItem: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Categoría (ej. Postres) *"
              value={newItem.categoriaNombre}
              onChangeText={(t) =>
                setNewItem({ ...newItem, categoriaNombre: t })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Precio (ej. 5.50) *"
              keyboardType="numeric"
              value={newItem.precio}
              onChangeText={(t) => setNewItem({ ...newItem, precio: t })}
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Descripción"
              multiline
              value={newItem.descripcion}
              onChangeText={(t) => setNewItem({ ...newItem, descripcion: t })}
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveBtnText}>Guardar Platillo</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
  },
  name: { fontWeight: "bold", fontSize: 16 },
  cat: { color: "#666", fontSize: 14 },

  // Estilos del Botón Flotante (FAB)
  fab: {
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    right: 20,
    bottom: 20,
    backgroundColor: "#D7263D",
    borderRadius: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },

  // Estilos del Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#D7263D" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: "#fafafa",
  },
  saveBtn: {
    backgroundColor: "#D7263D",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
});

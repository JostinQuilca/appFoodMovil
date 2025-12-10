import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

export default function HeaderAuth() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  // CASO 1: Usuario Logueado (Mostrar Burbuja)
  if (user) {
    const inicial = user.nombre ? user.nombre.charAt(0).toUpperCase() : "U";

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate("Profile")} // <--- Navega al Perfil
        style={styles.bubbleContainer}
      >
        <View style={styles.avatarBubble}>
          <Text style={styles.avatarText}>{inicial}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // CASO 2: Usuario No Logueado (Mostrar Botones)
  return (
    <View style={styles.authButtonsContainer}>
      <TouchableOpacity
        onPress={() => navigation.navigate("Login")}
        style={styles.loginBtn}
      >
        <Text style={styles.loginText}>Ingresar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate("Register")}
        style={styles.registerBtn}
      >
        <Text style={styles.registerText}>Registro</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Estilos Burbuja
  bubbleContainer: {
    marginRight: 15,
  },
  avatarBubble: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: "#D7263D",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  avatarText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },

  // Estilos Botones
  authButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
    gap: 8,
  },
  loginBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  loginText: {
    color: "#D7263D",
    fontWeight: "bold",
    fontSize: 14,
  },
  registerBtn: {
    backgroundColor: "#D7263D",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  registerText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
});

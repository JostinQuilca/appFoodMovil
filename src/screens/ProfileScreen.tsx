// src/screens/ProfileScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import {
  User,
  Lock,
  Mail,
  Phone,
  Shield,
  LogOut,
  Save,
} from "lucide-react-native";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();

  // Estados para el formulario (pre-cargados con datos del usuario)
  const [nombre, setNombre] = useState(user?.nombre || "");
  const [apellido, setApellido] = useState(""); // El contexto actual no guarda apellido explícito en el login, pero lo preparamos
  const [password, setPassword] = useState("");

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro de que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", onPress: logout, style: "destructive" },
    ]);
  };

  const handleUpdate = () => {
    // AQUÍ IRÍA LA LLAMADA A LA API
    // Como tu backend actual no tiene la mutación 'updateUsuario' expuesta,
    // mostramos una alerta informativa.
    if (!password && nombre === user?.nombre) {
      Alert.alert("Sin cambios", "No has modificado ninguna información.");
      return;
    }

    Alert.alert(
      "Información",
      "La función de actualizar perfil está en desarrollo en el servidor. Los cambios no se guardarán permanentemente todavía."
    );
  };

  const roleColor =
    user?.rol?.nombre === "ADMINISTRADOR" ? "#D7263D" : "#3b82f6";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* CABECERA DE PERFIL */}
      <View style={styles.header}>
        <View style={[styles.avatarContainer, { borderColor: roleColor }]}>
          <Text style={[styles.avatarText, { color: roleColor }]}>
            {user?.nombre?.charAt(0).toUpperCase() || "U"}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.nombre}</Text>
        <View style={[styles.badge, { backgroundColor: roleColor + "20" }]}>
          <Shield size={14} color={roleColor} />
          <Text style={[styles.roleText, { color: roleColor }]}>
            {user?.rol?.nombre}
          </Text>
        </View>
      </View>

      {/* FORMULARIO DE DATOS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información Personal</Text>

        <View style={styles.inputGroup}>
          <User size={20} color="#666" style={styles.icon} />
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre"
          />
        </View>

        <View style={styles.inputGroup}>
          <Mail size={20} color="#666" style={styles.icon} />
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={user?.email}
            editable={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Lock size={20} color="#666" style={styles.icon} />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Nueva Contraseña (opcional)"
            secureTextEntry
          />
        </View>
      </View>

      {/* BOTONES DE ACCIÓN */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate}>
          <Save size={20} color="white" />
          <Text style={styles.saveText}>Guardar Cambios</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color="#D7263D" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
    alignItems: "center",
  },
  header: { alignItems: "center", marginBottom: 30, marginTop: 20 },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    marginBottom: 15,
    elevation: 5,
  },
  avatarText: { fontSize: 40, fontWeight: "bold" },
  userName: { fontSize: 24, fontWeight: "bold", color: "#333" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
  },
  roleText: { fontWeight: "bold", fontSize: 12 },

  section: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: "#333" },
  disabledInput: { color: "#999" },

  actions: { width: "100%", gap: 15 },
  saveBtn: {
    backgroundColor: "#D7263D",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    gap: 10,
    elevation: 3,
  },
  saveText: { color: "white", fontWeight: "bold", fontSize: 16 },
  logoutBtn: {
    backgroundColor: "white",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#D7263D",
  },
  logoutText: { color: "#D7263D", fontWeight: "bold", fontSize: 16 },
});

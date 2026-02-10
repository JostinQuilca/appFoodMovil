import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native"; // <--- Importante
import {
  User,
  Mail,
  Shield,
  LogOut,
  CreditCard,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react-native";

export default function ProfileScreen() {
  const { user, logout, changePassword } = useAuth();
  const navigation = useNavigation<any>(); // <--- Inicializar navegación

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro de que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí, Salir",
        style: "destructive",
        onPress: async () => {
          await logout();
          // ✅ No necesitas navigation.reset() - el AppNavigator se rerenderiza automáticamente
          // cuando user cambia a null en el contexto de autenticación
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Las nuevas contraseñas no coinciden");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (oldPassword === newPassword) {
      Alert.alert(
        "Error",
        "La nueva contraseña debe ser diferente a la anterior",
      );
      return;
    }

    setLoading(true);
    const result = await changePassword(oldPassword, newPassword);
    setLoading(false);

    if (result.success) {
      Alert.alert("Éxito", result.message, [
        {
          text: "OK",
          onPress: () => {
            setShowChangePassword(false);
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
          },
        },
      ]);
    } else {
      Alert.alert("Error", result.message);
    }
  };

  // Definir color según el rol
  const roleColor =
    user?.rol?.nombre === "ADMINISTRADOR" ? "#D7263D" : "#3b82f6";

  // Obtener inicial del rol
  const roleInitial = user?.rol?.nombre === "ADMINISTRADOR" ? "A" : "C";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 1. CABECERA CON AVATAR */}
      <View style={styles.header}>
        <View style={[styles.avatarContainer, { borderColor: roleColor }]}>
          <Text style={[styles.avatarText, { color: roleColor }]}>
            {user?.nombre?.charAt(0).toUpperCase() || "U"}
          </Text>

          <Shield size={14} color={roleColor} />
          <Text style={[styles.roleText, { color: roleColor }]}>
            {roleInitial}
          </Text>
        </View>
      </View>

      {/* 2. TARJETA DE INFORMACIÓN (Solo Lectura) */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Detalles de la Cuenta</Text>

        {/* Email */}
        <View style={styles.infoRow}>
          <View style={styles.iconBox}>
            <Mail size={20} color="#555" />
          </View>
          <View>
            <Text style={styles.label}>Correo Electrónico</Text>
            <Text style={styles.value}>{user?.email}</Text>
          </View>
        </View>

        {/* Cédula */}
        <View style={styles.infoRow}>
          <View style={styles.iconBox}>
            <CreditCard size={20} color="#555" />
          </View>
          <View>
            <Text style={styles.label}>Cédula</Text>
            <Text style={styles.value}>{user?.cedula || "No registrada"}</Text>
          </View>
        </View>

        {/* Dirección (si existe) */}
        {user?.direccionPrincipal && (
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <User size={20} color="#555" />
            </View>
            <View>
              <Text style={styles.label}>Dirección Principal</Text>
              <Text style={styles.value}>{user.direccionPrincipal}</Text>
            </View>
          </View>
        )}
      </View>

      {/* 3. BOTÓN DE CAMBIAR CONTRASEÑA - DESACTIVADO TEMPORALMENTE */}
      {/* <TouchableOpacity
        style={styles.changePasswordBtn}
        onPress={() => setShowChangePassword(true)}
      >
        <Lock size={20} color="#fff" />
        <Text style={styles.changePasswordText}>Cambiar Contraseña</Text>
      </TouchableOpacity> */}

      {/* 4. BOTÓN DE CERRAR SESIÓN */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut size={20} color="#D7263D" />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      {/* MODAL: CAMBIAR CONTRASEÑA */}
      <Modal
        visible={showChangePassword}
        transparent
        animationType="slide"
        onRequestClose={() => !loading && setShowChangePassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Cambiar Contraseña</Text>

            {/* Contraseña Anterior */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                placeholder="Contraseña Actual"
                secureTextEntry={!showOldPassword}
                value={oldPassword}
                onChangeText={setOldPassword}
                editable={!loading}
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                onPress={() => setShowOldPassword(!showOldPassword)}
                disabled={loading}
              >
                {showOldPassword ? (
                  <Eye size={20} color="#666" />
                ) : (
                  <EyeOff size={20} color="#666" />
                )}
              </TouchableOpacity>
            </View>

            {/* Nueva Contraseña */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nueva Contraseña"
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!loading}
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                disabled={loading}
              >
                {showNewPassword ? (
                  <Eye size={20} color="#666" />
                ) : (
                  <EyeOff size={20} color="#666" />
                )}
              </TouchableOpacity>
            </View>

            {/* Confirmar Contraseña */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                placeholder="Confirmar Nueva Contraseña"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <Eye size={20} color="#666" />
                ) : (
                  <EyeOff size={20} color="#666" />
                )}
              </TouchableOpacity>
            </View>

            {/* Botones */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.cancelBtn, loading && { opacity: 0.5 }]}
                onPress={() => {
                  setShowChangePassword(false);
                  setOldPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                disabled={loading}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  loading && { backgroundColor: "#3b82f6aa" },
                ]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>Cambiar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // Cabecera
  header: { alignItems: "center", marginBottom: 25, marginTop: 10 },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    marginBottom: 12,
    elevation: 4,
  },
  avatarText: { fontSize: 36, fontWeight: "bold" },
  userName: { fontSize: 22, fontWeight: "bold", color: "#333" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    marginTop: 6,
    gap: 5,
  },
  roleText: { fontWeight: "bold", fontSize: 12 },

  // Tarjeta de Información
  infoCard: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    marginBottom: 25,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#888",
    marginBottom: 20,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Filas de Datos
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  iconBox: {
    width: 40,
    height: 40,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  label: { fontSize: 12, color: "#888", marginBottom: 2 },
  value: { fontSize: 16, color: "#333", fontWeight: "500" },

  // Botón Cambiar Contraseña
  changePasswordBtn: {
    width: "100%",
    backgroundColor: "#3b82f6",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 10,
    elevation: 1,
    marginBottom: 15,
  },
  changePasswordText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  // Botón Salir
  logoutBtn: {
    width: "100%",
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#D7263D",
    elevation: 1,
  },
  logoutText: {
    color: "#D7263D",
    fontWeight: "bold",
    fontSize: 16,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    paddingBottom: 35,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: "#333",
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 25,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelBtnText: {
    color: "#666",
    fontWeight: "bold",
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});

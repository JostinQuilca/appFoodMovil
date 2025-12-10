import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { Utensils } from "lucide-react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogin = async () => {
    // 1. Validaciones básicas
    if (!email || !password) {
      Alert.alert("Error", "Por favor ingresa correo y contraseña");
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. Llamada al login del Contexto
      const success = await login(email, password);
      setIsSubmitting(false);

      if (success) {
        // 3. ÉXITO:
        // El AuthContext ya actualizó el usuario.
        // El AppNavigator detectará el cambio y renderizará las pestañas correctas (Admin o Cliente).
        // Nosotros solo cerramos esta pantalla de Login para revelar la App.
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      } else {
        // 4. FALLO: Credenciales mal
        Alert.alert("Error", "Credenciales incorrectas");
      }
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert("Error", "Ocurrió un problema inesperado de conexión");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Utensils color="#D7263D" size={60} />
          <Text style={styles.title}>Pedido Listo</Text>
          <Text style={styles.subtitle}>Bienvenido de vuelta</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Correo Electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@correo.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.link}>Regístrate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#F7E9EB",
    justifyContent: "center",
    padding: 20,
  },
  header: { alignItems: "center", marginBottom: 40 },
  title: { fontSize: 32, fontWeight: "bold", color: "#D7263D", marginTop: 10 },
  subtitle: { fontSize: 16, color: "#666", marginTop: 5 },
  form: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    elevation: 4,
  },
  label: { fontWeight: "600", marginBottom: 5, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: "#fafafa",
  },
  button: {
    backgroundColor: "#D7263D",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  link: { color: "#D7263D", fontWeight: "bold" },
});

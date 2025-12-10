// src/screens/RegisterScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    cedula: "",
    email: "",
    telefono: "",
    direccionPrincipal: "",
    password: "",
  });

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const handleRegister = async () => {
    if (!form.cedula || !form.email || !form.password || !form.nombre) {
      Alert.alert("Error", "Por favor completa los campos obligatorios");
      return;
    }

    setLoading(true);
    // CORRECCIÓN: Pasamos el 'form' directo. El AuthContext ya sabe qué campos extraer.
    // Esto evita enviar campos duplicados o con nombres incorrectos.
    const success = await register(form);

    setLoading(false);

    if (success) {
      Alert.alert("¡Éxito!", "Cuenta creada correctamente", [
        { text: "Ir a Login", onPress: () => navigation.navigate("Login") },
      ]);
    } else {
      Alert.alert(
        "Error",
        "No se pudo registrar. Revisa los datos ingresados."
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Crear Cuenta</Text>
        <Text style={styles.subtitle}>
          Únete para disfrutar la mejor comida
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nombre *"
            value={form.nombre}
            onChangeText={(t) => handleChange("nombre", t)}
          />
          <TextInput
            style={styles.input}
            placeholder="Apellido"
            value={form.apellido}
            onChangeText={(t) => handleChange("apellido", t)}
          />
          <TextInput
            style={styles.input}
            placeholder="Cédula (10 dígitos) *"
            value={form.cedula}
            onChangeText={(t) => handleChange("cedula", t)}
            keyboardType="numeric"
            maxLength={10}
          />
          <TextInput
            style={styles.input}
            placeholder="Teléfono"
            value={form.telefono}
            onChangeText={(t) => handleChange("telefono", t)}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Correo Electrónico *"
            value={form.email}
            onChangeText={(t) => handleChange("email", t)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Dirección Principal *"
            value={form.direccionPrincipal}
            onChangeText={(t) => handleChange("direccionPrincipal", t)}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña *"
            value={form.password}
            onChangeText={(t) => handleChange("password", t)}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Registrarse</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginTop: 15, alignItems: "center" }}
          >
            <Text style={{ color: "#666" }}>
              ¿Ya tienes cuenta? <Text style={styles.link}>Inicia Sesión</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7E9EB" },
  scrollContent: { padding: 20, paddingTop: 60 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#D7263D",
    textAlign: "center",
  },
  subtitle: { textAlign: "center", color: "#666", marginBottom: 30 },
  form: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: "#eee",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
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
  link: { color: "#D7263D", fontWeight: "bold" },
});

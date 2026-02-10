import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "./client";

// Derivar la base REST desde la URL GraphQL configurada en apiClient
let REST_BASE = process.env.REST_BASE;
const graphBase = apiClient?.defaults?.baseURL || "";
if (!REST_BASE) {
  if (graphBase.includes("/graphql")) {
    REST_BASE = graphBase.replace(/\/graphql\/?$/, "/api");
  } else {
    REST_BASE = graphBase.replace(/\/?$/, "/api");
  }
}

const restClient = axios.create({
  baseURL: REST_BASE,
  headers: { "Content-Type": "application/json" },
});

restClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function getMisFacturas() {
  const res = await restClient.get("/facturacion/mis-facturas");
  return res.data;
}

export async function getFacturaById(id: number) {
  const res = await restClient.get(`/facturacion/${id}`);
  return res.data;
}

export async function crearFacturaDirecta(payload: any) {
  try {
    // Defensive: filter detalles to ensure no null/undefined values
    const safePayload = { ...payload };
    if (Array.isArray(payload?.detalles)) {
      const filtered = payload.detalles.filter(
        (d: any) =>
          d.itemId != null && d.cantidad != null && d.precioUnitario != null,
      );

      safePayload.detalles = filtered;
      if (filtered.length !== payload.detalles.length) {
        console.warn(
          "[facturacion] Removed invalid detalles entries before sending",
          {
            originalCount: payload.detalles.length,
            sentCount: filtered.length,
          },
        );
      }
    }

    console.log(
      "[facturacion] Sending payload:",
      JSON.stringify(safePayload, null, 2),
    );
    const res = await restClient.post(
      "/facturacion/crear-directa",
      safePayload,
    );
    return res.data;
  } catch (err: any) {
    console.error("[facturacion] Error creating factura directa:", err.message);
    console.error("[facturacion] Response data:", err.response?.data);
    console.error("[facturacion] Response status:", err.response?.status);
    throw err;
  }
}

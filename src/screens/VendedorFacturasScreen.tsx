import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Share,
  Button,
  Modal,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { format } from "date-fns";
import { getMisFacturas, crearFacturaDirecta } from "../api/facturacion";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import apiClient from "../api/client";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Factura = Record<string, any>;

function getVal(obj: any, ...keys: string[]) {
  for (const k of keys) {
    if (!obj) continue;
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function normalizeDetalles(detalles: any): any[] {
  if (!detalles) return [];
  // If it's already an array, possibly flatten one level when first element is an array
  if (Array.isArray(detalles)) {
    if (detalles.length > 0 && Array.isArray(detalles[0])) return detalles[0];
    return detalles;
  }

  // If detalles comes as an object with numeric keys or as a map, convert to values
  if (typeof detalles === "object") {
    try {
      const vals = Object.values(detalles);
      // If values are arrays and there's only one array, return that array
      if (vals.length === 1 && Array.isArray(vals[0])) return vals[0];
      // Flatten nested arrays of values
      return vals.flat ? vals.flat() : ([] as any[]).concat(...vals);
    } catch (e) {
      return [];
    }
  }

  return [];
}

function resolveProductName(det: any): string {
  if (!det) return "N/A";

  // Try common direct keys
  const direct = getVal(
    det,
    "descripcion_item",
    "descripcionItem",
    "item_name",
    "nombre",
    "nombre_item",
    "nombrePlatillo",
    "producto",
    "producto_nombre",
    "nombre_producto",
    "name",
    "title",
    "descripcion",
    "label",
  );
  if (direct) return String(direct);

  // Check nested common containers
  if (det?.platillo && (det.platillo.nombre || det.platillo.name)) {
    return String(det.platillo.nombre || det.platillo.name);
  }
  if (
    det?.producto &&
    (det.producto.nombre ||
      det.producto.name ||
      det.producto.title ||
      det.producto.nombre_producto)
  ) {
    return String(
      det.producto.nombre ||
        det.producto.name ||
        det.producto.title ||
        det.producto.nombre_producto,
    );
  }
  if (det?.item && (det.item.nombre || det.item.name))
    return String(det.item.nombre || det.item.name);

  // If API only provides an item id, return an identifier so it's traceable in logs
  const itemId = getVal(det, "item_id", "itemId", "itemId");
  if (itemId) return `#${itemId}`;

  // Fallbacks
  if (det?.nombrePlatillo) return String(det.nombrePlatillo);
  if (det?.nombreProducto) return String(det.nombreProducto);

  // Log unresolved detalle to help debugging (temporary)
  try {
    console.log("[VendedorFacturas] unresolved detalle:", JSON.stringify(det));
  } catch (e) {
    console.log(
      "[VendedorFacturas] unresolved detalle (non-serializable):",
      det,
    );
  }

  return "N/A";
}

// Helper to create authenticated REST client
async function getAuthRestClient() {
  let REST_BASE = process.env.REST_BASE;
  const graphBase = apiClient?.defaults?.baseURL || "";
  if (!REST_BASE) {
    if (graphBase.includes("/graphql")) {
      REST_BASE = graphBase.replace(/\/graphql\/?$/, "/api");
    } else {
      REST_BASE = graphBase.replace(/\/?$/, "/api");
    }
  }

  const client = axios.create({
    baseURL: REST_BASE,
    headers: { "Content-Type": "application/json" },
  });

  const token = await AsyncStorage.getItem("access_token");
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  return client;
}

export default function VendedorFacturasScreen(): JSX.Element {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [platillosMap, setPlatillosMap] = useState<Record<string, string>>({});
  const [pedidosAutorizados, setPedidosAutorizados] = useState<any[]>([]);
  const [loadingAutorizados, setLoadingAutorizados] = useState(false);
  const [creatingFacturaFor, setCreatingFacturaFor] = useState<number | null>(
    null,
  );

  useEffect(() => {
    loadFacturas();
  }, []);

  const fetchPlatillos = async () => {
    try {
      const GET_ALL_PLATILLOS = `
        query { platillos { id nombreItem nombreItem } }
      `;
      const res = await apiClient.post("", { query: GET_ALL_PLATILLOS });
      const list = res.data?.data?.platillos || [];
      const map: Record<string, string> = {};
      list.forEach((p: any) => {
        const name = p.nombreItem || p.nombre || p.name || p.nombre_item;
        if (p.id || p.id === 0) map[String(p.id)] = name || String(p.id);
      });
      setPlatillosMap(map);
    } catch (e) {
      console.warn("[VendedorFacturas] fetchPlatillos failed:", e);
    }
  };

  const GET_ALL_PEDIDOS = `
    query {
      pedidos {
        id
        usuarioCedula
        montoTotal
        estadoPedido
        fechaPedido
        usuario { nombre email }
        detalles { cantidad platillo { id nombreItem precio } }
      }
    }
  `;

  const fetchPedidosAutorizados = async () => {
    setLoadingAutorizados(true);
    try {
      const res = await apiClient.post("", { query: GET_ALL_PEDIDOS });
      const all = res.data.data?.pedidos || [];
      const autorizados = all.filter(
        (p: any) => p.estadoPedido === "Autorizado",
      );
      setPedidosAutorizados(autorizados);
    } catch (e) {
      console.error("[VendedorFacturas] fetchPedidosAutorizados failed:", e);
      Alert.alert("Error", "No se pudieron cargar pedidos autorizados");
    } finally {
      setLoadingAutorizados(false);
    }
  };

  const createFacturaFromPedido = async (pedido: any) => {
    try {
      setCreatingFacturaFor(pedido.id);

      console.log(
        "[VendedorFacturas STEP 1] Pedido recibido:",
        JSON.stringify(pedido, null, 2),
      );
      console.log(
        "[VendedorFacturas STEP 1a] Detalles sin procesar:",
        pedido.detalles,
      );

      // Normalize detalles
      const detalles = (pedido.detalles || [])
        .map((d: any, idx: number) => {
          const itemId =
            d.itemId || d.platillo?.id || d.platillo?.item_id || null;
          const precioUnitario =
            d.precioUnitario || d.platillo?.precio || d.precio || 0;
          console.log(`[VendedorFacturas STEP 2] Detalle[${idx}] raw:`, d);
          console.log(`[VendedorFacturas STEP 2] Detalle[${idx}] extracted:`, {
            itemId,
            precioUnitario,
          });
          return { itemId, cantidad: d.cantidad, precioUnitario };
        })
        .filter((x: any) => x.itemId && x.precioUnitario !== undefined);

      console.log(
        "[VendedorFacturas STEP 3] Detalles después del filtro:",
        detalles,
      );

      if (detalles.length === 0) {
        Alert.alert(
          "Error",
          "El pedido no tiene detalles válidos para crear factura",
        );
        return;
      }

      // Calcular subtotal, IVA (19%) y total
      const subtotal = detalles.reduce(
        (sum: number, d: any) => sum + d.cantidad * d.precioUnitario,
        0,
      );
      const iva = subtotal * 0.19;
      const total = subtotal + iva;

      const payload = {
        usuarioCedula: pedido.usuarioCedula,
        detalles: detalles.map((d: any) => ({
          itemId: d.itemId,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
        })),
        montoSubtotal: subtotal,
        montoIva: iva,
        montoTotal: total,
        descripcion: `Factura generada manualmente desde app (Pedido #${pedido.id})`,
      };

      console.log(
        "[VendedorFacturas STEP 4] Payload final a enviar:",
        JSON.stringify(payload, null, 2),
      );
      const res = await crearFacturaDirecta(payload);
      console.log("[VendedorFacturas] crearFacturaDirecta res:", res);
      Alert.alert("Éxito", "Factura creada correctamente");

      // If the backend response contains the created factura but
      // `getMisFacturas()` doesn't return it immediately (server-side filtering
      // or eventual consistency), insert the returned factura locally so the
      // seller sees it right away, then still refresh the list.
      try {
        const createdId = res?.id || res?.factura_id || res?.id_factura;
        if (createdId) {
          setFacturas((prev) => {
            // avoid duplicates
            const exists = prev.some(
              (f: any) => f?.id === createdId || f?.factura_id === createdId,
            );
            if (exists) return prev;
            return [res, ...prev];
          });
        }
      } catch (e) {
        console.warn(
          "[VendedorFacturas] Could not append created factura locally:",
          e,
        );
      }

      // Remove the pedido from the authorized list since factura was created
      setPedidosAutorizados((prev) => prev.filter((p) => p.id !== pedido.id));

      // Refresh facturas list to sync with server
      await loadFacturas();
    } catch (err: any) {
      console.error("[VendedorFacturas] Error creando factura:", err);
      console.error(
        "[VendedorFacturas] Error response data:",
        err.response?.data,
      );
      console.error(
        "[VendedorFacturas] Error response status:",
        err.response?.status,
      );
      const serverMsg =
        err.response?.data?.message || err.response?.data || err.message;
      Alert.alert(
        "Error creando factura",
        typeof serverMsg === "string" ? serverMsg : JSON.stringify(serverMsg),
      );
    } finally {
      setCreatingFacturaFor(null);
    }
  };

  const loadFacturas = async () => {
    setLoading(true);
    try {
      // Try to fetch ALL facturas from a new REST endpoint
      const restClient = await getAuthRestClient();
      const allRes = await restClient.get("/facturacion");
      const data = allRes.data || [];
      console.log("[VendedorFacturas] fetched all facturas", data);

      const arr = Array.isArray(data) ? data : [data];
      const filtered = arr.filter((f) => f && typeof f === "object");

      setFacturas(filtered);
      fetchPlatillos();
    } catch (err: any) {
      console.error(
        "[VendedorFacturas] error loading ALL facturas:",
        err.message,
      );

      // Fallback: use getMisFacturas (only current user's invoices)
      try {
        console.log("[VendedorFacturas] Falling back to mis-facturas");
        const fallbackData = await getMisFacturas();
        let arr: Factura[] = [];
        if (Array.isArray(fallbackData)) {
          arr = fallbackData;
        } else if (fallbackData?.data?.facturas) {
          arr = fallbackData.data.facturas;
        } else if (fallbackData?.facturas) {
          arr = fallbackData.facturas;
        } else if (fallbackData?.data && Array.isArray(fallbackData.data)) {
          arr = fallbackData.data;
        } else {
          arr = [fallbackData];
        }
        arr = arr.filter((f) => f && typeof f === "object");
        setFacturas(arr);
      } catch (fallbackErr) {
        console.error("[VendedorFacturas] error on fallback:", fallbackErr);
        setFacturas([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatFacturaAsHTML = (factura: Factura): string => {
    const numero = getVal(factura, "numero_factura", "numeroFactura", "number");
    const fecha = getVal(factura, "fecha_factura", "fechaFactura", "date");

    const usuarioObj = getVal(factura, "usuario");
    const clienteNombre =
      getVal(factura, "cliente_nombre", "clienteNombre", "cli_nombre") ||
      usuarioObj?.nombre;
    const clienteEmail =
      getVal(factura, "cliente_email", "clienteEmail", "cli_email") ||
      usuarioObj?.email;
    const clienteCedula =
      getVal(factura, "usuario_cedula", "usuarioCedula", "client_id") ||
      usuarioObj?.cedula;

    const subtotal = getVal(
      factura,
      "monto_subtotal",
      "montoSubtotal",
      "subtotal",
    );
    let iva = getVal(factura, "monto_iva", "montoIva", "tax");
    const total = getVal(factura, "monto_total", "montoTotal", "total");
    const estado = getVal(factura, "estado_factura", "estadoFactura", "status");
    const detalles = getVal(factura, "detalles", "detalle_factura", "items");

    const fechaStr = fecha
      ? format(new Date(fecha), "dd/MM/yyyy")
      : new Date().toLocaleDateString();

    const subtotalNum = Number(subtotal || 0);
    const ivaNum = Number(iva || 0) === 0 ? subtotalNum * 0.19 : Number(iva || 0);
    // Total siempre es subtotal + IVA (recalcular para garantizar consistencia)
    const totalNum = subtotalNum + ivaNum;

    const detallesList = normalizeDetalles(detalles);
    let detallesHTML = "";
    if (detallesList.length > 0) {
      detallesHTML = detallesList
        .map((det: any) => {
          const producto = ((): string => {
            const base = resolveProductName(det);
            if (base && base !== "N/A" && !base.startsWith("#")) return base;
            const id = getVal(det, "item_id", "itemId", "item_id", "itemId");
            if (id && platillosMap[String(id)]) return platillosMap[String(id)];
            return base;
          })();
          const cant = getVal(det, "cantidad", "qty") || "0";
          const precio = Number(
            getVal(det, "precio_unitario", "precioUnitario", "price") ||
              det?.precio ||
              0,
          ).toFixed(2);
          const sub = Number(
            getVal(det, "subtotal", "subtotal") || det?.subTotal || 0,
          ).toFixed(2);

          return `
            <tr>
              <td>${producto}</td>
              <td style="text-align:center">${cant}</td>
              <td style="text-align:right">$${precio}</td>
              <td style="text-align:right">$${sub}</td>
            </tr>
          `;
        })
        .join("");
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Factura ${numero}</title>
          <style>
            * { margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; color: #333; }
            .container { width: 100%; max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #D7263D; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { font-size: 28px; color: #D7263D; margin-bottom: 10px; }
            .header p { font-size: 12px; color: #666; }
            .invoice-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .info-box { padding: 15px; background-color: #f9f9f9; border-left: 3px solid #D7263D; }
            .info-box h3 { color: #D7263D; margin-bottom: 10px; font-size: 14px; }
            .info-box p { font-size: 12px; margin-bottom: 5px; line-height: 1.6; }
            .info-box strong { color: #333; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background-color: #D7263D; color: white; padding: 12px; text-align: left; font-size: 12px; font-weight: bold; }
            td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 12px; }
            .total-section { margin: 20px 0; text-align: right; }
            .total-row { display: grid; grid-template-columns: 300px 100px; gap: 20px; justify-content: end; margin-bottom: 10px; font-size: 12px; }
            .total-row.final { border-top: 2px solid #D7263D; padding-top: 15px; margin-top: 15px; }
            .total-row.final strong { color: #D7263D; font-size: 16px; }
            .total-label { text-align: right; font-weight: bold; }
            .total-value { text-align: right; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 10px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>FACTURA</h1>
              <p>N° ${numero}</p>
            </div>

            <div class="invoice-info">
              <div class="info-box">
                <h3>Información General</h3>
                <p><strong>Fecha:</strong> ${fechaStr}</p>
                <p><strong>Estado:</strong> ${estado || "N/A"}</p>
              </div>
              <div class="info-box">
                <h3>Cliente</h3>
                <p><strong>Nombre:</strong> ${clienteNombre || "N/A"}</p>
                <p><strong>Cédula:</strong> ${clienteCedula || "N/A"}</p>
                <p><strong>Correo:</strong> ${clienteEmail || "N/A"}</p>
              </div>
            </div>

            <h3 style="color: #D7263D; margin: 20px 0 10px 0; font-size: 14px;">Detalle de Productos</h3>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style="text-align:center">Cantidad</th>
                  <th style="text-align:right">Precio Unit.</th>
                  <th style="text-align:right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${detallesHTML || "<tr><td colspan='4' style='text-align:center;'>Sin productos</td></tr>"}
              </tbody>
            </table>

            <div class="total-section">
              <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span class="total-value">$${subtotalNum.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span class="total-label">IVA (19%):</span>
                <span class="total-value">$${ivaNum.toFixed(2)}</span>
              </div>
              <div class="total-row final">
                <strong style="text-align: right;">TOTAL:</strong>
                <strong style="text-align: right;">$${totalNum.toFixed(2)}</strong>
              </div>
            </div>

            <div class="footer">
              <p>Factura generada el ${new Date().toLocaleString()}</p>
              <p>Gracias por su compra</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return html;
  };

  const exportFacturaAsPDF = async (factura: Factura) => {
    try {
      const html = formatFacturaAsHTML(factura);
      const numero =
        getVal(factura, "numero_factura", "numeroFactura") || "factura";

      // Generar PDF desde HTML
      const pdf = await Print.printToFileAsync({
        html: html,
        base64: false,
      });

      const fileName = `Factura_${numero}_${new Date().getTime()}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // Copiar el PDF generado a documentDirectory
      await FileSystem.copyAsync({
        from: pdf.uri,
        to: fileUri,
      });

      Alert.alert(
        "✓ PDF Creado",
        `Factura: ${numero}.pdf\n\nArchivo guardado en tu dispositivo`,
        [
          { text: "Cancelar", onPress: () => {}, style: "cancel" },
          {
            text: "Compartir / Descargar",
            onPress: async () => {
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                  mimeType: "application/pdf",
                  dialogTitle: `Factura ${numero}`,
                });
              } else {
                Alert.alert("Información", "El archivo se guardó en descargas");
              }
            },
          },
        ],
      );

      console.log("[exportFacturaAsPDF] PDF creado en:", fileUri);
    } catch (err: any) {
      console.error("[exportFacturaAsPDF] error:", err);
      Alert.alert("Error", "No se pudo crear el PDF: " + err.message);
    }
  };

  const exportAllCsv = async () => {
    try {
      if (!facturas.length) {
        Alert.alert("Advertencia", "No hay facturas para exportar");
        return;
      }

      const header =
        "Factura,Fecha,Cliente,Cedula,Correo,Producto,Cantidad,Precio Unitario,Subtotal Item";
      const rows: string[] = [];

      facturas.forEach((f) => {
        const numero =
          getVal(f, "numero_factura", "numeroFactura", "numero") || "N/A";
        const fecha = getVal(f, "fecha_factura", "fechaFactura", "fecha") || "";
        const fechaStr = fecha ? format(new Date(fecha), "dd/MM/yyyy") : "N/A";

        // Extraer info del cliente - puede venir en usuario.nombre o cliente_nombre
        const usuarioObj = getVal(f, "usuario");
        const clienteNombre =
          getVal(f, "cliente_nombre", "clienteNombre", "cli_nombre") ||
          usuarioObj?.nombre ||
          "N/A";
        const clienteCedula =
          getVal(f, "usuario_cedula", "usuarioCedula", "client_id") ||
          usuarioObj?.cedula ||
          "N/A";
        const clienteEmail =
          getVal(f, "cliente_email", "clienteEmail", "cli_email") ||
          usuarioObj?.email ||
          "N/A";

        const detallesRaw =
          getVal(f, "detalles", "detalle_factura", "items") || [];
        const detallesList = normalizeDetalles(detallesRaw);

        if (detallesList.length > 0) {
          detallesList.forEach((det: any) => {
            const producto = (() => {
              const base = resolveProductName(det);
              if (base && base !== "N/A" && !base.startsWith("#")) return base;
              const id = getVal(det, "item_id", "itemId", "item_id", "itemId");
              if (id && platillosMap[String(id)])
                return platillosMap[String(id)];
              return base;
            })();
            const cantidad = getVal(det, "cantidad", "qty") || "0";
            const precio =
              getVal(det, "precio_unitario", "precioUnitario", "price") ||
              det?.precio ||
              "0";
            const subtotal =
              getVal(det, "subtotal", "subtotal") || det?.subTotal || "0";

            const safe = (v: any) => {
              const s = String(v).replace(/"/g, '""');
              return `"${s}"`;
            };

            rows.push(
              [
                numero,
                fechaStr,
                clienteNombre,
                clienteCedula,
                clienteEmail,
                producto,
                cantidad,
                precio,
                subtotal,
              ]
                .map(safe)
                .join(","),
            );
          });
        } else {
          rows.push(
            [
              numero,
              fechaStr,
              clienteNombre,
              clienteCedula,
              clienteEmail,
              "",
              "",
              "",
              "",
            ]
              .map((v) => `"${String(v).replace(/"/g, '""')}"`)
              .join(","),
          );
        }
      });

      const csv = [header, ...rows].join("\n");
      const fileName = `Facturas_${format(new Date(), "dd-MM-yyyy_HHmmss")}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // Crear archivo CSV
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: "utf8",
      });

      Alert.alert(
        "✓ CSV Creado",
        `Archivo: ${fileName}\n\n${facturas.length} factura(s) exportada(s)`,
        [
          { text: "Cancelar", onPress: () => {}, style: "cancel" },
          {
            text: "Compartir / Descargar",
            onPress: async () => {
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                  mimeType: "text/csv",
                  dialogTitle: "Exportar Facturas",
                });
              } else {
                Alert.alert("Información", "El archivo se guardó en descargas");
              }
            },
          },
        ],
      );

      console.log("[exportAllCsv] CSV creado en:", fileUri);
    } catch (err: any) {
      console.error("[exportAllCsv] error:", err);
      Alert.alert("Error", "No se pudo crear el CSV: " + err.message);
    }
  };

  const openDetailModal = (factura: Factura) => {
    setSelectedFactura(factura);
    setModalVisible(true);
  };

  const renderDetailRow = (label: string, value: any) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{String(value || "N/A")}</Text>
    </View>
  );

  const renderFacturaDetail = () => {
    if (!selectedFactura) return null;

    const numero = getVal(
      selectedFactura,
      "numero_factura",
      "numeroFactura",
      "number",
    );
    const fecha = getVal(
      selectedFactura,
      "fecha_factura",
      "fechaFactura",
      "date",
    );
    const clienteNombre =
      getVal(
        selectedFactura,
        "cliente_nombre",
        "clienteNombre",
        "cli_nombre",
      ) || selectedFactura?.usuario?.nombre;
    const clienteEmail =
      getVal(selectedFactura, "cliente_email", "clienteEmail", "cli_email") ||
      selectedFactura?.usuario?.email;
    const clienteCedula =
      getVal(selectedFactura, "usuario_cedula", "usuarioCedula", "client_id") ||
      selectedFactura?.usuario?.cedula;
    let subtotal = getVal(
      selectedFactura,
      "monto_subtotal",
      "montoSubtotal",
      "subtotal",
    );
    let iva = getVal(selectedFactura, "monto_iva", "montoIva", "tax");
    let total = getVal(selectedFactura, "monto_total", "montoTotal", "total");
    
    // Si no viene IVA del servidor, calcular a partir del subtotal (19%)
    const subtotalNum = Number(subtotal || 0);
    if (!iva || Number(iva) === 0) {
      iva = subtotalNum * 0.19;
    }
    // Total siempre es subtotal + IVA (recalcular para garantizar consistencia)
    total = subtotalNum + Number(iva);
    
    const estado = getVal(
      selectedFactura,
      "estado_factura",
      "estadoFactura",
      "status",
    );
    const detalles = getVal(
      selectedFactura,
      "detalles",
      "detalle_factura",
      "items",
    );

    const fechaStr = fecha ? format(new Date(fecha), "dd/MM/yyyy") : "N/A";

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalle Factura</Text>
            <Pressable onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información General</Text>
              {renderDetailRow("N° Factura", numero)}
              {renderDetailRow("Fecha", fechaStr)}
              {renderDetailRow("Estado", estado)}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cliente</Text>
              {renderDetailRow("Nombre", clienteNombre)}
              {renderDetailRow("Cédula", clienteCedula)}
              {renderDetailRow("Correo", clienteEmail)}
            </View>

            {(() => {
              const detallesList = normalizeDetalles(detalles);
              if (!detallesList || detallesList.length === 0) return null;

              return (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Productos</Text>
                  {detallesList.map((det: any, idx: number) => (
                    <View key={idx} style={styles.productCard}>
                      {renderDetailRow(
                        "Producto",
                        (() => {
                          const base = resolveProductName(det);
                          if (base && base !== "N/A" && !base.startsWith("#"))
                            return base;
                          const id = getVal(
                            det,
                            "item_id",
                            "itemId",
                            "item_id",
                            "itemId",
                          );
                          if (id && platillosMap[String(id)])
                            return platillosMap[String(id)];
                          return base;
                        })(),
                      )}
                      {renderDetailRow(
                        "Cantidad",
                        getVal(det, "cantidad", "qty"),
                      )}
                      {renderDetailRow(
                        "Precio Unit.",
                        `$${Number(
                          getVal(
                            det,
                            "precio_unitario",
                            "precioUnitario",
                            "price",
                          ) ||
                            det?.precio ||
                            0,
                        ).toFixed(2)}`,
                      )}
                      {renderDetailRow(
                        "Subtotal",
                        `$${Number(getVal(det, "subtotal", "subtotal") || det?.subTotal || 0).toFixed(2)}`,
                      )}
                    </View>
                  ))}
                </View>
              );
            })()}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resumen Financiero</Text>
              {renderDetailRow(
                "Subtotal",
                `$${subtotalNum.toFixed(2)}`,
              )}
              {renderDetailRow("IVA (19%)", `$${Number(iva).toFixed(2)}`)}
              <View style={styles.divider} />
              {renderDetailRow("TOTAL", `$${Number(total).toFixed(2)}`)}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.printBtn]}
                onPress={() => exportFacturaAsPDF(selectedFactura)}
              >
                <Text style={styles.actionBtnText}>📄 Descargar PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.closeModalBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.actionBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderItem = ({ item }: { item: Factura }) => {
    const numero =
      getVal(item, "numero_factura", "numeroFactura", "numero") || "N/A";
    const fecha = getVal(item, "fecha_factura", "fechaFactura", "fecha");
    const clienteNombre =
      getVal(item, "cliente_nombre", "clienteNombre", "cli_nombre") ||
      item?.usuario?.nombre ||
      "Cliente";
    const subtotal = getVal(item, "monto_subtotal", "montoSubtotal", "subtotal") || "0";
    let iva = getVal(item, "monto_iva", "montoIva", "tax") || "0";
    let total = getVal(item, "monto_total", "montoTotal", "total") || "0";
    
    // Recalcular total si es 0: total = subtotal + iva (si iva es 0, entonces iva = subtotal * 0.19)
    const subtotalNum = Number(subtotal);
    const ivaNum = Number(iva);
    const totalNum = Number(total);
    
    let finalTotal = totalNum;
    if (finalTotal === 0) {
      const calculatedIva = ivaNum === 0 ? subtotalNum * 0.19 : ivaNum;
      finalTotal = subtotalNum + calculatedIva;
    }
    
    const estado =
      getVal(item, "estado_factura", "estadoFactura", "estado") || "N/A";

    const fechaStr = fecha ? format(new Date(fecha), "dd/MM/yyyy") : "N/A";

    return (
      <Pressable style={styles.card} onPress={() => openDetailModal(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardNumber}>Factura #{numero}</Text>
          <Text style={[styles.cardStatus, { color: "#D7263D" }]}>
            {estado}
          </Text>
        </View>
        <View style={styles.cardBody}>
          <View>
            <Text style={styles.cardLabel}>Cliente:</Text>
            <Text style={styles.cardText}>{clienteNombre}</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.cardLabel}>Fecha:</Text>
            <Text style={styles.cardText}>{fechaStr}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardLabel}>Total:</Text>
          <Text style={styles.cardTotal}>${finalTotal.toFixed(2)}</Text>
        </View>
        <Text style={styles.cardHint}>Toca para ver detalles</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Pedidos autorizados moved to separate screen */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mis Facturas</Text>
          <Text style={styles.subtitle}>
            {facturas.length} factura{facturas.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity style={styles.exportBtn} onPress={exportAllCsv}>
          <Text style={styles.exportBtnText}>📊 Exportar CSV</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#D7263D" />
        </View>
      ) : facturas.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No hay facturas</Text>
        </View>
      ) : (
        <FlatList
          data={facturas}
          keyExtractor={(i) =>
            String(getVal(i, "factura_id", "id") || Math.random())
          }
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {renderFacturaDetail()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  exportBtn: {
    backgroundColor: "#D7263D",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  exportBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  listContent: {
    padding: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#D7263D",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardRight: {
    alignItems: "flex-end",
  },
  cardLabel: {
    fontSize: 11,
    color: "#888",
    fontWeight: "600",
  },
  cardText: {
    fontSize: 13,
    color: "#333",
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  cardTotal: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D7263D",
  },
  cardHint: {
    fontSize: 10,
    color: "#aaa",
    marginTop: 6,
    fontStyle: "italic",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    marginTop: 0,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },
  closeBtn: {
    fontSize: 24,
    color: "#999",
    fontWeight: "300",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D7263D",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  detailValue: {
    fontSize: 12,
    color: "#222",
    fontWeight: "600",
  },
  productCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#D7263D",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 8,
  },
  modalActions: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  printBtn: {
    backgroundColor: "#D7263D",
  },
  closeModalBtn: {
    backgroundColor: "#999",
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
});

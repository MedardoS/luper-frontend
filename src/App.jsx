import React, { useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  CheckCircle2,
  Download,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

import { jsPDF } from "jspdf";

import Logo from "./components/Logo";
import Header from "./components/Header";
import ProductCard from "./components/ProductCard";
import { categories, categoryImages } from "./data";

const STORAGE_SELECTION = "luper_selection";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "56920162009";

function App() {
  const [screen, setScreen] = useState("home");

  // ======================================================
  // PRODUCTOS DESDE POSTGRESQL
  // ======================================================

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState("");

  // ======================================================
  // SELECCIÓN DEL CLIENTE
  // ======================================================

  const [selection, setSelection] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SELECTION);

      if (!saved) {
        return [];
      }

      const parsed = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        return [];
      }

      // Solo conservar selecciones del formato nuevo:
      // { productId, talla, cantidad }
      return parsed.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          Number.isInteger(Number(item.productId)) &&
          item.talla !== undefined &&
          item.talla !== null &&
          String(item.talla).trim() !== "" &&
          Number(item.cantidad) > 0,
      );
    } catch (error) {
      console.error("Error leyendo selección guardada:", error);

      return [];
    }
  });

  const [category, setCategory] = useState("Hombre");
  const [adminLogged, setAdminLogged] = useState(false);
  const [adminToken, setAdminToken] = useState(
    localStorage.getItem("luper_admin_token") || "",
  );
  const [solicitudes, setSolicitudes] = useState([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [solicitudesError, setSolicitudesError] = useState("");
  const [filtroSolicitudes, setFiltroSolicitudes] = useState("pendiente");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [solicitudEnviada, setSolicitudEnviada] = useState(null);

  const [newProduct, setNewProduct] = useState({
    model: "",
    category: "Hombre",
    sizes: [{ size: "", stock: 1 }],
    imageFile: null,
  });

  const [imagePreview, setImagePreview] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);

  // ======================================================
  // GUARDAR SELECCIÓN EN LOCALSTORAGE
  // ======================================================

  useEffect(() => {
    localStorage.setItem(STORAGE_SELECTION, JSON.stringify(selection));
  }, [selection]);

  // ======================================================
  // CARGAR PRODUCTOS DESDE EL BACKEND
  // ======================================================

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        setLoadingProducts(true);
        setProductsError("");

        const response = await fetch(`${API_URL}/productos`);

        if (!response.ok) {
          throw new Error("No se pudieron cargar los productos");
        }

        const data = await response.json();

        /*
          PostgreSQL devuelve:

          modelo
          categoria
          talla
          imagen
          estado

          Nuestro frontend actualmente utiliza:

          model
          category
          size
          image
          status

          Por eso hacemos esta adaptación.
        */

        const productosAdaptados = data.map((producto) => ({
          id: producto.id,
          model: producto.modelo,
          category: producto.categoria,
          size: producto.talla,
          tallas: producto.tallas || [],
          image: producto.imagen,
          status: producto.estado,
          createdAt: producto.creado_en,
        }));
        setProducts(productosAdaptados);
      } catch (error) {
        console.error("Error cargando productos:", error);

        setProductsError("No se pudo conectar con el catálogo.");
      } finally {
        setLoadingProducts(false);
      }
    };

    cargarProductos();
  }, []);

  // ======================================================
  // PRODUCTOS FILTRADOS
  // ======================================================

  const filteredProducts = useMemo(
    () => products.filter((product) => product.category === category),
    [products, category],
  );

  // ======================================================
  // PRODUCTOS SELECCIONADOS
  // ======================================================

  const selectedProducts = selection
    .map((selectedItem) => {
      const product = products.find(
        (item) => item.id === selectedItem.productId,
      );

      if (!product) {
        return null;
      }

      return {
        ...product,
        selectedSize: selectedItem.talla,
        quantity: selectedItem.cantidad,
      };
    })
    .filter(Boolean);

  // ======================================================
  // VOLVER AL INICIO
  // ======================================================
  const goHome = () => {
    localStorage.removeItem("luper_admin_token");

    setAdminToken("");
    setAdminLogged(false);
    setScreen("home");
  };

  // ======================================================
  // SELECCIONAR PRODUCTO
  // ======================================================

  const toggleSelection = (product, talla, cantidad = 1) => {
    if (product.status !== "disponible") {
      return;
    }

    setSelection((current) => {
      const existingIndex = current.findIndex(
        (item) =>
          item.productId === product.id && String(item.talla) === String(talla),
      );

      // Si ya está exactamente ese producto + talla,
      // lo quitamos de la selección.
      if (existingIndex !== -1) {
        return current.filter((_, index) => index !== existingIndex);
      }

      // Si no está, lo agregamos con talla y cantidad.
      return [
        ...current,
        {
          productId: product.id,
          talla: String(talla),
          cantidad: Number(cantidad),
        },
      ];
    });
  };

  // ======================================================
  // ACTUALIZAR ESTADO EN POSTGRESQL
  // ======================================================
  const createProduct = async () => {
    try {
      if (
        !newProduct.model.trim() ||
        !newProduct.category ||
        !newProduct.imageFile ||
        newProduct.sizes.length === 0 ||
        newProduct.sizes.some(
          (item) =>
            !item.size.trim() ||
            !Number.isInteger(Number(item.stock)) ||
            Number(item.stock) < 0,
        )
      ) {
        alert(
          "Completa modelo, categoría, tallas, unidades y selecciona una foto.",
        );
        return;
      }

      setSavingProduct(true);

      // 1. Subir imagen a Cloudinary mediante nuestro backend
      const formData = new FormData();
      formData.append("imagen", newProduct.imageFile);

      const uploadResponse = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadData.mensaje || "Error subiendo la imagen");
      }

      console.log("☁️ Imagen subida:", uploadData);

      // 2. Crear producto en PostgreSQL
      const productResponse = await fetch(`${API_URL}/productos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          modelo: newProduct.model.trim(),
          categoria: newProduct.category,
          tallas: newProduct.sizes.map((item) => ({
            talla: item.size.trim(),
            stock: Number(item.stock),
          })),
          imagen: uploadData.imagen,
          imagen_public_id: uploadData.publicId,
        }),
      });

      const productData = await productResponse.json();

      if (!productResponse.ok) {
        throw new Error(productData.mensaje || "Error creando el producto");
      }

      console.log("🐘 Producto guardado:", productData);

      // 3. Convertir formato PostgreSQL -> React
      const dbProduct = productData.producto;

      const createdProduct = {
        id: dbProduct.id,
        model: dbProduct.modelo,
        category: dbProduct.categoria,
        size: dbProduct.talla,
       tallas: dbProduct.tallas || [],
        image: dbProduct.imagen,
        status: dbProduct.estado,
      };

      // 4. Mostrar inmediatamente el nuevo producto
      setProducts((currentProducts) => [createdProduct, ...currentProducts]);

      // 5. Limpiar formulario
      setNewProduct({
        model: "",
        category: "Hombre",
        sizes: [{ size: "", stock: 1 }],
        imageFile: null,
      });

      setImagePreview("");
      setShowAddProduct(false);

      alert("🔥 Producto agregado correctamente");
    } catch (error) {
      console.error("❌ Error guardando producto:", error);

      alert(error.message || "Ocurrió un error guardando el producto");
    } finally {
      setSavingProduct(false);
    }
  };

  const deleteProduct = async (product) => {
    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar "${product.model}"?`,
    );

    if (!confirmar) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/productos/${product.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.mensaje || "Error eliminando el producto");
      }

      setProducts((currentProducts) =>
        currentProducts.filter((item) => item.id !== product.id),
      );

      setSelection((currentSelection) =>
        currentSelection.filter((item) => item.productId !== product.id),
      );

      alert("🗑️ Producto eliminado correctamente");
    } catch (error) {
      console.error("❌ Error eliminando producto:", error);

      alert(error.message || "Ocurrió un error eliminando el producto");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const response = await fetch(`${API_URL}/productos/${id}`, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },

        body: JSON.stringify({
          estado: status,
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo actualizar el producto");
      }

      const data = await response.json();

      // Actualizamos React con la respuesta real del servidor

      setProducts((current) =>
        current.map((product) =>
          product.id === id
            ? {
                ...product,
                status: data.producto.estado,
              }
            : product,
        ),
      );

      // Si deja de estar disponible,
      // lo quitamos de la selección del cliente.

      if (data.producto.estado !== "disponible") {
        setSelection((current) =>
          current.filter((item) => item.productId !== id),
        );
      }
    } catch (error) {
      console.error("Error actualizando estado:", error);

      alert("No se pudo actualizar el estado del producto.");
    }
  };
  const cargarSolicitudes = async () => {
    if (!adminToken) {
      return;
    }

    try {
      setLoadingSolicitudes(true);
      setSolicitudesError("");

      const response = await fetch(`${API_URL}/solicitudes`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.mensaje || "Error cargando las solicitudes");
      }

      setSolicitudes(data);
    } catch (error) {
      console.error("❌ Error cargando solicitudes:", error);

      setSolicitudesError(error.message);
    } finally {
      setLoadingSolicitudes(false);
    }
  };
  const contactarCliente = (solicitud) => {
    if (!solicitud.telefono_cliente) {
      alert("Esta solicitud no tiene teléfono.");
      return;
    }

    // Dejamos solamente números
    let telefono = solicitud.telefono_cliente.replace(/\D/g, "");

    // Si escribieron un número chileno comenzando en 9,
    // agregamos el código de país 56.
    if (telefono.length === 9 && telefono.startsWith("9")) {
      telefono = `56${telefono}`;
    }

    const productos = solicitud.productos
      .map((producto) => `${producto.modelo} - Talla ${producto.talla}`)
      .join(", ");

    const mensaje =
      `Hola ${solicitud.nombre_cliente || ""} 👋\n\n` +
      `Somos LUPER 👟\n` +
      `Tu solicitud #${solicitud.id} fue recibida.\n\n` +
      `Producto: ${productos}\n\n` +
      `Queremos coordinar contigo los detalles de tu pedido.`;

    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

    window.open(url, "_blank");
  };
  const procesarSolicitud = async (id, accion) => {
    const mensaje =
      accion === "aprobar"
        ? `¿Seguro que deseas APROBAR la solicitud #${id}? El producto pasará a APARTADO.`
        : `¿Seguro que deseas RECHAZAR la solicitud #${id}?`;

    const confirmado = window.confirm(mensaje);

    if (!confirmado) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/solicitudes/${id}/${accion}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.mensaje || "Error procesando la solicitud");
      }

      alert(
        accion === "aprobar"
          ? "✅ Solicitud aprobada"
          : "❌ Solicitud rechazada",
      );

      await cargarSolicitudes();

      // Actualizar también los productos,
      // porque al aprobar uno pasa a "apartado"
      const productosResponse = await fetch(`${API_URL}/productos`);

      const productosData = await productosResponse.json();

      const productosAdaptados = productosData.map((product) => ({
        id: product.id,
        model: product.modelo,
        category: product.categoria,
        size: product.talla,
        tallas: product.tallas || [],
        image: product.imagen,
        status: product.estado,
      }));

      setProducts(productosAdaptados);
    } catch (error) {
      console.error("❌ Error procesando solicitud:", error);

      alert(error.message);
    }
  };

  useEffect(() => {
    if (adminLogged && adminToken) {
      cargarSolicitudes();
    }
  }, [adminLogged, adminToken]);

  // ======================================================
  // GENERAR PDF
  // ======================================================

  const downloadPdf = () => {
    const doc = new jsPDF();

    doc.setFillColor(28, 28, 28);
    doc.rect(0, 0, 210, 38, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(23);

    doc.text("LUPER", 105, 17, {
      align: "center",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    doc.text("TU ESTILO, TU IDENTIDAD", 105, 25, {
      align: "center",
    });

    doc.setTextColor(28, 28, 28);

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");

    doc.text("Solicitud de productos", 20, 55);

    let y = 72;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");

    doc.text("Producto", 20, y);
    doc.text("Talla", 135, y);
    doc.text("Cant.", 165, y);

    y += 9;

    doc.setFont("helvetica", "normal");

    selectedProducts.forEach((product) => {
      doc.text(product.model, 20, y);
      doc.text(String(product.selectedSize), 135, y);
      doc.text(String(product.quantity), 165, y);

      y += 9;
    });

    doc.setDrawColor(198, 167, 125);

    doc.line(20, y + 2, 190, y + 2);

    doc.setFontSize(10);

    const totalUnidades = selectedProducts.reduce(
      (total, product) => total + Number(product.quantity || 1),
      0,
    );

    doc.text(`Total de unidades: ${totalUnidades}`, 20, y + 14);

    doc.text(`Fecha: ${new Date().toLocaleDateString("es-CL")}`, 20, y + 22);

    doc.setFont("helvetica", "bold");

    doc.text("Estado: SOLICITUD RECIBIDA", 20, y + 34);

    doc.save("solicitud-luper.pdf");
  };

  // ======================================================
  // WHATSAPP
  // ======================================================

  const openWhatsApp = () => {
    const text = [
      "Hola LUPER ",
      "",
      `Mi nombre es: ${customerName.trim()}`,
      `Mi teléfono / WhatsApp: ${customerPhone.trim()}`,
      "",
      "Me interesan los siguientes productos:",
      "",
      ...selectedProducts.map(
        (product) =>
          `• ${product.model} - Talla ${product.selectedSize} - Cantidad: ${product.quantity}`,
      ),
      "",
      "Quedo atento/a. ¡Gracias!",
    ].join("\n");

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

  const enviarSolicitud = async () => {
    if (selectedProducts.length === 0) {
      alert("Debes seleccionar al menos un producto.");
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      alert("Debes ingresar tu nombre y teléfono.");
      return;
    }

    try {
      setSendingRequest(true);

      const response = await fetch(`${API_URL}/solicitudes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          productos: selectedProducts.map((product) => ({
            producto_id: product.id,
            talla: product.selectedSize,
            cantidad: product.quantity,
          })),
          nombre_cliente: customerName.trim(),
          telefono_cliente: customerPhone.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.mensaje || "No se pudo enviar la solicitud");
      }

      setSolicitudEnviada({
        id: data.solicitud.id,
        nombre: customerName.trim(),
        telefono: customerPhone.trim(),
      });

      setSelection([]);
      localStorage.removeItem(STORAGE_SELECTION);

      setCustomerName("");
      setCustomerPhone("");

      setScreen("request-success");
    } catch (error) {
      console.error("❌ Error enviando solicitud:", error);

      alert(error.message);
    } finally {
      setSendingRequest(false);
    }
  };

  // ======================================================
  // PANTALLA INICIO
  // ======================================================

  if (screen === "home") {
    return (
      <main className="splash-screen">
        <div className="splash-image" />

        <div className="splash-content">
          <Logo light />

          <p>Tu estilo, tu identidad</p>

          <button
            className="round-enter"
            onClick={() => setScreen("roles")}
            aria-label="Comenzar"
          >
            <ArrowRight size={22} />
          </button>

          <span>Haz clic para comenzar</span>
        </div>
      </main>
    );
  }

  // ======================================================
  // COMPRADOR / ADMINISTRADOR
  // ======================================================

  if (screen === "roles") {
    return (
      <main className="page-shell role-page">
        <button className="back-top" onClick={goHome}>
          ← Volver
        </button>

        <Logo compact />

        <section className="role-hero">
          <span className="eyebrow">BIENVENIDO A</span>

          <h1>LUPER</h1>

          <p>Selecciona cómo quieres entrar.</p>
        </section>

        <div className="role-grid">
          <button
            className="role-card buyer"
            onClick={() => setScreen("categories")}
          >
            <ShoppingBag />

            <strong>Comprador</strong>

            <span>Explora nuestra colección y elige tus modelos.</span>

            <ArrowRight />
          </button>

          <button
            className="role-card admin"
            onClick={() => setScreen("admin-login")}
          >
            <ShieldCheck />

            <strong>Administrador</strong>

            <span>Gestiona disponibilidad y solicitudes.</span>

            <ArrowRight />
          </button>
        </div>
      </main>
    );
  }

  // ======================================================
  // CATEGORÍAS
  // ======================================================

  if (screen === "categories") {
    return (
      <main className="page-shell">
        <Header
          onBack={() => setScreen("roles")}
          selectionCount={selection.length}
          onSelection={() => setScreen("selection")}
        />

        <section className="section-heading">
          <span className="eyebrow">COLECCIÓN LUPER</span>

          <h1>Elige tu estilo</h1>

          <p>Selecciona una categoría para ver los modelos disponibles.</p>
        </section>

        {loadingProducts && (
          <div className="empty-state">
            <ShoppingBag size={38} />

            <h2>Cargando colección...</h2>

            <p>Estamos buscando los productos de LUPER.</p>
          </div>
        )}

        {productsError && (
          <div className="empty-state">
            <h2>No pudimos cargar el catálogo</h2>

            <p>{productsError}</p>
          </div>
        )}

        {!loadingProducts && !productsError && (
          <div className="category-grid">
            {categories.map((item) => (
              <button
                key={item}
                className="category-card"
                onClick={() => {
                  setCategory(item);
                  setScreen("catalog");
                }}
              >
                <div
                  className="category-photo"
                  style={{
                    backgroundImage: `url(${categoryImages[item]})`,
                  }}
                />

                <div className="category-content">
                  <h2>{item}</h2>

                  <span>
                    Explorar
                    <ArrowRight size={15} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    );
  }

  // ======================================================
  // CATÁLOGO
  // ======================================================

  if (screen === "catalog") {
    return (
      <main className="page-shell">
        <Header
          onBack={() => setScreen("categories")}
          selectionCount={selection.length}
          onSelection={() => setScreen("selection")}
        />

        <section className="section-heading catalog-heading">
          <div>
            <span className="eyebrow">COLECCIÓN</span>

            <h1>{category}</h1>

            <p>Selecciona los modelos que te gusten.</p>
          </div>

          <div className="category-tabs">
            {categories.map((item) => (
              <button
                className={category === item ? "active" : ""}
                key={item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {loadingProducts ? (
          <div className="empty-state">
            <h2>Cargando productos...</h2>
          </div>
        ) : productsError ? (
          <div className="empty-state">
            <h2>Error cargando productos</h2>

            <p>{productsError}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <ShoppingBag size={38} />

            <h2>Próximamente</h2>

            <p>Todavía no tenemos productos registrados en esta categoría.</p>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                selectedItems={selection.filter(
                  (item) => item.productId === product.id,
                )}
                onSelect={toggleSelection}
                admin={false}
              />
            ))}
          </div>
        )}
      </main>
    );
  }

  // ======================================================
  // SELECCIÓN
  // ======================================================

  if (screen === "selection") {
    return (
      <main className="page-shell">
        <Header
          onBack={() => setScreen("catalog")}
          selectionCount={selection.length}
          onSelection={() => setScreen("selection")}
        />

        <section className="section-heading">
          <span className="eyebrow">TU SELECCIÓN</span>

          <h1>Mis modelos</h1>

          <p>{selectedProducts.length} producto(s) seleccionado(s).</p>
        </section>

        {selectedProducts.length === 0 ? (
          <div className="empty-state">
            <ShoppingBag size={38} />

            <h2>Aún no has seleccionado modelos</h2>

            <p>Vuelve al catálogo y agrega los que te interesen.</p>

            <button
              className="primary-button"
              onClick={() => setScreen("categories")}
            >
              Ver colección
            </button>
          </div>
        ) : (
          <>
            <div className="selection-list">
              {selectedProducts.map((product) => (
                <div
                  className="selection-item"
                  key={`${product.id}-${product.selectedSize}`}
                >
                  <img src={product.image} alt={product.model} />

                  <div>
                    <strong>{product.model}</strong>

                    <span>Talla {product.selectedSize}</span>

                    <span>Cantidad: {product.quantity}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      toggleSelection(
                        product,
                        product.selectedSize,
                        product.quantity,
                      )
                    }
                    aria-label="Eliminar"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="selection-footer">
              <span>{selectedProducts.length} modelos seleccionados</span>

              <button
                className="primary-button"
                onClick={() => setScreen("confirmation")}
              >
                Confirmar solicitud
                <ArrowRight size={17} />
              </button>
            </div>
          </>
        )}
      </main>
    );
  }

  // ======================================================
  // CONFIRMACIÓN
  // ======================================================

  if (screen === "confirmation") {
    return (
      <main className="page-shell centered-page">
        <Logo compact />

        <div className="confirmation-card">
          <div className="success-icon">
            <CheckCircle2 size={32} />
          </div>

          <span className="eyebrow">SOLICITUD PREPARADA</span>

          <h1>¡Tu selección está lista!</h1>

          <p>Ya puedes guardar tu solicitud o enviarla directamente a LUPER.</p>
          <div className="customer-form">
            <div className="customer-field">
              <label htmlFor="customer-name">Nombre</label>

              <input
                id="customer-name"
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Ej: Juan Pérez"
                autoComplete="name"
              />
            </div>

            <div className="customer-field">
              <label htmlFor="customer-phone">WhatsApp / teléfono</label>

              <input
                id="customer-phone"
                type="tel"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="Ej: +56 9 1234 5678"
                autoComplete="tel"
              />
            </div>
          </div>
          <div className="confirm-actions">
            <button
              className="primary-button"
              onClick={enviarSolicitud}
              disabled={sendingRequest}
            >
              <ShoppingBag size={17} />
              {sendingRequest ? "Enviando..." : "Enviar solicitud"}
            </button>

            <button className="primary-button" onClick={downloadPdf}>
              <Download size={17} />
              Descargar PDF
            </button>

            <button className="whatsapp-button" onClick={openWhatsApp}>
              <MessageCircle size={17} />
              Enviar por WhatsApp
            </button>
          </div>

          <button className="text-button" onClick={goHome}>
            Volver al inicio
          </button>
        </div>
      </main>
    );
  }

  // ======================================================
  // LOGIN ADMIN
  // ======================================================

  if (screen === "admin-login") {
    return (
      <AdminLogin
        onBack={() => setScreen("roles")}
        onSuccess={(token) => {
          setAdminToken(token);
          setAdminLogged(true);
          setScreen("admin");
        }}
      />
    );
  }

  // ======================================================
  // SOLICITUD ENVIADA
  // ======================================================

  if (screen === "request-success" && solicitudEnviada) {
    return (
      <main className="page-shell centered-page">
        <Logo compact />

        <div className="confirmation-card request-success-card">
          <div className="success-icon">
            <CheckCircle2 size={32} />
          </div>

          <span className="eyebrow">SOLICITUD ENVIADA</span>

          <h1>¡Todo listo!</h1>

          <p>
            Gracias, <strong>{solicitudEnviada.nombre}</strong>. Tu solicitud
            fue recibida correctamente por LUPER.
          </p>

          <div className="request-success-number">
            <span>NÚMERO DE SOLICITUD</span>

            <strong>#{solicitudEnviada.id}</strong>
          </div>

          <div className="request-success-info">
            <p>👟 Revisaremos la disponibilidad de tus productos.</p>

            <p>📱 Te contactaremos al WhatsApp:</p>

            <strong>{solicitudEnviada.telefono}</strong>
          </div>

          <div className="confirm-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setSolicitudEnviada(null);
                setScreen("categories");
              }}
            >
              <ShoppingBag size={17} />
              Volver al catálogo
            </button>

            <button
              type="button"
              className="outline-button"
              onClick={() => {
                setSolicitudEnviada(null);
                goHome();
              }}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ======================================================
  // ORDENAR SOLICITUDES
  // ======================================================

  const solicitudesOrdenadas = [...solicitudes]
    .filter((solicitud) => solicitud.estado === filtroSolicitudes)
    .sort((a, b) => b.id - a.id);

  const cantidadPendientes = solicitudes.filter(
    (solicitud) => solicitud.estado === "pendiente",
  ).length;

  const cantidadAprobadas = solicitudes.filter(
    (solicitud) => solicitud.estado === "aprobada",
  ).length;

  const cantidadRechazadas = solicitudes.filter(
    (solicitud) => solicitud.estado === "rechazada",
  ).length;

  // ======================================================
  // PANEL ADMIN
  // ======================================================

  if (screen === "admin" && adminLogged) {
    return (
      <main className="admin-page">
        <aside className="admin-sidebar">
          <Logo light compact />

          <div className="admin-nav">
            <span className="active">Productos</span>

            <button onClick={goHome}>Cerrar sesión</button>
          </div>
        </aside>

        <section className="admin-content">
          {/* ============================= */}
          {/* CABECERA ADMIN */}
          {/* ============================= */}

          <div className="admin-top">
            <div>
              <span className="eyebrow">PANEL ADMINISTRADOR</span>

              <h1>Gestión de productos</h1>
            </div>

            <div className="admin-top-actions">
              <button
                className="primary-button"
                onClick={() => setShowAddProduct(true)}
              >
                + Agregar producto
              </button>

              <button className="outline-button" onClick={goHome}>
                Salir
              </button>
            </div>
          </div>

          {/* ============================= */}
          {/* AGREGAR PRODUCTO */}
          {/* ============================= */}

          {showAddProduct && (
            <div className="add-product-panel">
              <div className="add-product-header">
                <div>
                  <span className="eyebrow">NUEVO PRODUCTO</span>

                  <h2>Agregar producto</h2>
                </div>

                <button
                  type="button"
                  className="outline-button"
                  onClick={() => {
                    setShowAddProduct(false);
                    setImagePreview("");

                    setNewProduct({
                      model: "",
                      category: "Hombre",
                      size: "",
                      imageFile: null,
                    });
                  }}
                >
                  × Cerrar
                </button>
              </div>

              <div className="add-product-form">
                <label>
                  Modelo
                  <input
                    type="text"
                    placeholder="Ej: Nike Air Max 90"
                    value={newProduct.model}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        model: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Categoría
                  <select
                    value={newProduct.category}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        category: e.target.value,
                      })
                    }
                  >
                    <option value="Hombre">Hombre</option>

                    <option value="Mujer">Mujer</option>

                    <option value="Kids">Kids</option>
                  </select>
                </label>

                <div className="product-sizes-field">
                  <span>Tallas y unidades disponibles</span>

                  <div className="product-sizes-list">
                    {newProduct.sizes.map((item, index) => (
                      <div className="product-size-row" key={index}>
                        <label>
                          Talla
                          <input
                            type="text"
                            placeholder="Ej: 42"
                            value={item.size}
                            onChange={(e) => {
                              const sizes = [...newProduct.sizes];
                              sizes[index] = {
                                ...sizes[index],
                                size: e.target.value,
                              };
                              setNewProduct({ ...newProduct, sizes });
                            }}
                          />
                        </label>

                        <label>
                          Unidades
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.stock}
                            onChange={(e) => {
                              const sizes = [...newProduct.sizes];
                              sizes[index] = {
                                ...sizes[index],
                                stock: e.target.value,
                              };
                              setNewProduct({ ...newProduct, sizes });
                            }}
                          />
                        </label>

                        <button
                          type="button"
                          className="outline-button size-remove-button"
                          disabled={newProduct.sizes.length === 1}
                          onClick={() =>
                            setNewProduct({
                              ...newProduct,
                              sizes: newProduct.sizes.filter(
                                (_, i) => i !== index,
                              ),
                            })
                          }
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="outline-button add-size-button"
                    onClick={() =>
                      setNewProduct({
                        ...newProduct,
                        sizes: [...newProduct.sizes, { size: "", stock: 1 }],
                      })
                    }
                  >
                    + Agregar otra talla
                  </button>
                </div>

                <div className="product-photo-field">
                  <span>Foto del producto</span>

                  <label className="photo-upload-button">
                    📷 Seleccionar foto
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];

                        if (!file) return;

                        setNewProduct({
                          ...newProduct,
                          imageFile: file,
                        });

                        setImagePreview(URL.createObjectURL(file));
                      }}
                    />
                  </label>

                  {imagePreview && (
                    <div className="image-preview">
                      <img src={imagePreview} alt="Vista previa del producto" />

                      <span>✓ Foto seleccionada</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="primary-button"
                  disabled={savingProduct}
                  onClick={createProduct}
                >
                  {savingProduct ? "Guardando..." : "Guardar producto"}
                </button>
              </div>
            </div>
          )}

          {/* ============================= */}
          {/* CATEGORÍAS */}
          {/* ============================= */}

          <div className="admin-tabs">
            {categories.map((item) => (
              <button
                className={category === item ? "active" : ""}
                key={item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {/* ============================= */}
          {/* PRODUCTOS */}
          {/* ============================= */}

          {loadingProducts ? (
            <div className="empty-state">
              <h2>Cargando productos...</h2>
            </div>
          ) : productsError ? (
            <div className="empty-state">
              <h2>No se pudo cargar el inventario</h2>

              <p>{productsError}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <ShoppingBag size={38} />

              <h2>Sin productos</h2>

              <p>No hay productos registrados en {category}.</p>
            </div>
          ) : (
            <div className="admin-product-list">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  admin
                  onStatusChange={updateStatus}
                  onDelete={deleteProduct}
                />
              ))}
            </div>
          )}

          {/* ================================= */}
          {/* SOLICITUDES DE CLIENTES */}
          {/* ================================= */}

          <section className="admin-requests-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">PEDIDOS</span>

                <h2>Solicitudes de clientes</h2>
              </div>
              <div className="request-filters">
                <button
                  type="button"
                  className={filtroSolicitudes === "pendiente" ? "active" : ""}
                  onClick={() => setFiltroSolicitudes("pendiente")}
                >
                  Pendientes ({cantidadPendientes})
                </button>

                <button
                  type="button"
                  className={filtroSolicitudes === "aprobada" ? "active" : ""}
                  onClick={() => setFiltroSolicitudes("aprobada")}
                >
                  Aprobadas ({cantidadAprobadas})
                </button>

                <button
                  type="button"
                  className={filtroSolicitudes === "rechazada" ? "active" : ""}
                  onClick={() => setFiltroSolicitudes("rechazada")}
                >
                  Rechazadas ({cantidadRechazadas})
                </button>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={cargarSolicitudes}
              >
                Actualizar
              </button>
            </div>

            {loadingSolicitudes ? (
              <div className="loading-box">Cargando solicitudes...</div>
            ) : solicitudesError ? (
              <div className="error-box">{solicitudesError}</div>
            ) : solicitudesOrdenadas.length === 0 ? (
              <div className="empty-state">
                <ShoppingBag size={34} />

                <h3>No hay solicitudes</h3>

                <p>No hay solicitudes con estado "{filtroSolicitudes}".</p>
              </div>
            ) : (
              <div className="requests-list">
                {solicitudesOrdenadas.map((solicitud) => (
                  <article key={solicitud.id} className="request-card">
                    {/* CABECERA SOLICITUD */}

                    <div className="request-card-header">
                      <div>
                        <span className="eyebrow">
                          SOLICITUD #{solicitud.id}
                        </span>

                        <h3>
                          {solicitud.estado === "pendiente"
                            ? "Pendiente"
                            : solicitud.estado === "aprobada"
                              ? "Aprobada"
                              : "Rechazada"}
                        </h3>

                        {/* DATOS CLIENTE */}

                        {(solicitud.nombre_cliente ||
                          solicitud.telefono_cliente) && (
                          <div className="request-customer">
                            {solicitud.nombre_cliente && (
                              <p>
                                <strong>Cliente:</strong>{" "}
                                {solicitud.nombre_cliente}
                              </p>
                            )}

                            {solicitud.telefono_cliente && (
                              <p>
                                <strong>WhatsApp:</strong>{" "}
                                {solicitud.telefono_cliente}
                              </p>
                            )}
                          </div>
                        )}

                        {/* WHATSAPP */}

                        {solicitud.telefono_cliente && (
                          <button
                            type="button"
                            className="request-whatsapp-button"
                            onClick={() => contactarCliente(solicitud)}
                          >
                            Contactar por WhatsApp
                          </button>
                        )}
                      </div>

                      {/* ESTADO */}

                      <span
                        className={`request-status request-${solicitud.estado}`}
                      >
                        {solicitud.estado}
                      </span>
                    </div>

                    {/* PRODUCTOS SOLICITADOS */}

                    <div className="request-products">
                      {solicitud.productos.map((producto) => (
                        <div key={producto.id} className="request-product">
                          {producto.imagen && (
                            <img src={producto.imagen} alt={producto.modelo} />
                          )}

                          <div>
                            <strong>{producto.modelo}</strong>

                            <span>
                              <div className="request-product-details">
                                <span>Talla {producto.talla}</span>

                                <span>Cantidad: {producto.cantidad || 1}</span>
                              </div>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* APROBAR / RECHAZAR */}

                    {solicitud.estado === "pendiente" && (
                      <div className="request-actions">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() =>
                            procesarSolicitud(solicitud.id, "aprobar")
                          }
                        >
                          ✓ Aprobar
                        </button>

                        <button
                          type="button"
                          className="reject-button"
                          onClick={() =>
                            procesarSolicitud(solicitud.id, "rechazar")
                          }
                        >
                          ✕ Rechazar
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </main>
    );
  }

  return null;
}

// ========================================================
// LOGIN ADMINISTRADOR
// ========================================================

function AdminLogin({ onBack, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.mensaje || "No se pudo iniciar sesión");
      }

      localStorage.setItem("luper_admin_token", data.token);

      onSuccess(data.token);
    } catch (error) {
      console.error("❌ Error login:", error);

      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login">
      <div className="admin-login-bg" />

      <div className="admin-login-content">
        <Logo light />

        <span className="eyebrow">ACCESO ADMINISTRADOR</span>

        <h1>Gestiona LUPER</h1>

        <form onSubmit={submit}>
          <label>Correo electrónico</label>

          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            placeholder="admin@luper.cl"
            autoComplete="email"
            required
          />

          <label>Contraseña</label>

          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          {error && <small className="error-text">{error}</small>}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}

            {!loading && <ArrowRight size={17} />}
          </button>
        </form>

        <button className="light-text-button" onClick={onBack} type="button">
          ← Volver al menú
        </button>
      </div>
    </main>
  );
}

export default App;

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Check, LockKeyhole, Trash2, Minus } from "lucide-react";

import { statusInfo } from "../data";

export default function ProductCard({
  product,
  selectedItems = [],
  onSelect,
  admin,
  onStatusChange,
  onDelete,
}) {
  const info = statusInfo[product.status] || statusInfo.disponible;

  const productImages = useMemo(() => {
    const gallery = Array.isArray(product.images)
      ? product.images
          .map((item) => (typeof item === "string" ? item : item?.imagen))
          .filter(Boolean)
      : [];

    if (gallery.length > 0) {
      return gallery;
    }

    return product.image ? [product.image] : [];
  }, [product.images, product.image]);

  const [activeImage, setActiveImage] = useState(
    productImages[0] || product.image || "",
  );

  useEffect(() => {
    setActiveImage(productImages[0] || product.image || "");
  }, [productImages, product.image]);

  const tallasDisponibles = useMemo(
    () => (product.tallas || []).filter((item) => Number(item.stock) > 0),
    [product.tallas],
  );

  const [selectedSize, setSelectedSize] = useState(
    tallasDisponibles[0]?.talla || "",
  );

  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (
      selectedSize &&
      tallasDisponibles.some(
        (item) => String(item.talla) === String(selectedSize),
      )
    ) {
      return;
    }

    setSelectedSize(tallasDisponibles[0]?.talla || "");
    setQuantity(1);
  }, [tallasDisponibles, selectedSize]);

  const selectedSizeInfo = tallasDisponibles.find(
    (item) => String(item.talla) === String(selectedSize),
  );

  const availableStock = Number(selectedSizeInfo?.stock) || 0;

  const selected = selectedItems.some(
    (item) => String(item.talla) === String(selectedSize),
  );

  const disabled =
    !admin &&
    (product.status !== "disponible" || tallasDisponibles.length === 0);

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const increaseQuantity = () => {
    setQuantity((current) => Math.min(availableStock, current + 1));
  };

  const handleSizeChange = (event) => {
    setSelectedSize(event.target.value);
    setQuantity(1);
  };

  const handleSelect = () => {
    if (
      disabled ||
      !selectedSize ||
      quantity < 1 ||
      quantity > availableStock
    ) {
      return;
    }

    onSelect(product, selectedSize, quantity);
  };

  return (
    <article
      className={`product-card ${
        selected ? "selected" : ""
      } ${disabled ? "is-disabled" : ""}`}
    >
      <div className="product-gallery">
        <div className="product-image-wrap">
          <img
            src={activeImage || product.image}
            alt={product.model}
            className="product-image"
          />

          {disabled && (
            <div className="image-overlay">
              <LockKeyhole size={18} />

              <span>
                {tallasDisponibles.length === 0 ? "Sin stock" : info.label}
              </span>
            </div>
          )}
        </div>

        {productImages.length > 1 && (
          <div
            className="product-thumbnails"
            aria-label={`Fotos de ${product.model}`}
          >
            {productImages.map((image, index) => (
              <button
                key={`${product.id}-image-${index}`}
                type="button"
                className={`product-thumbnail ${
                  activeImage === image ? "active" : ""
                }`}
                onClick={() => setActiveImage(image)}
                aria-label={`Ver foto ${index + 1} de ${product.model}`}
              >
                <img src={image} alt={`${product.model} - foto ${index + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="product-info">
        <h3>{product.model}</h3>

        {/* =============================== */}
        {/* ADMINISTRADOR */}
        {/* =============================== */}

        {admin ? (
          <>
            {product.tallas && product.tallas.length > 0 ? (
              <div className="product-sizes-stock">
                <strong>Tallas disponibles</strong>

                <div className="sizes-stock-list">
                  {product.tallas.map((item) => (
                    <span
                      key={item.id || item.talla}
                      className={
                        Number(item.stock) === 0 ? "size-out-stock" : ""
                      }
                    >
                      <strong>Talla {item.talla}</strong>
                      <small>
                        {item.stock}{" "}
                        {Number(item.stock) === 1 ? "unidad" : "unidades"}
                      </small>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p>Talla {product.size}</p>
            )}

            <div className="admin-status-row">
              <span className={`status-pill ${info.className}`}>
                {info.label}
              </span>

              <select
                value={product.status}
                onChange={(e) => onStatusChange(product.id, e.target.value)}
                aria-label={`Estado de ${product.model}`}
              >
                <option value="disponible">Disponible</option>

                <option value="apartado">Apartado</option>

                <option value="agotado">Agotado</option>
              </select>
            </div>

            <button
              type="button"
              className="delete-product-button"
              onClick={() => onDelete(product)}
            >
              <Trash2 size={16} />
              Eliminar producto
            </button>
          </>
        ) : (
          <>
            {/* =============================== */}
            {/* COMPRADOR */}
            {/* =============================== */}

            {product.tallas && product.tallas.length > 0 ? (
              <>
                <div className="buyer-size-field">
                  <label htmlFor={`size-${product.id}`}>Talla</label>

                  <select
                    id={`size-${product.id}`}
                    value={selectedSize}
                    onChange={handleSizeChange}
                    disabled={disabled}
                  >
                    {product.tallas.map((item) => (
                      <option
                        key={item.id || item.talla}
                        value={item.talla}
                        disabled={Number(item.stock) <= 0}
                      >
                        {item.talla}
                        {Number(item.stock) <= 0 ? " — Agotada" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSizeInfo && (
                  <p className="available-stock">
                    {availableStock}{" "}
                    {availableStock === 1
                      ? "unidad disponible"
                      : "unidades disponibles"}
                  </p>
                )}

                <div className="quantity-selector">
                  <span>Cantidad</span>

                  <div className="quantity-controls">
                    <button
                      type="button"
                      onClick={decreaseQuantity}
                      disabled={disabled || quantity <= 1}
                      aria-label="Disminuir cantidad"
                    >
                      <Minus size={16} />
                    </button>

                    <strong>{quantity}</strong>

                    <button
                      type="button"
                      onClick={increaseQuantity}
                      disabled={disabled || quantity >= availableStock}
                      aria-label="Aumentar cantidad"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p>Talla {product.size}</p>
            )}

            <button
              type="button"
              className={`select-product ${selected ? "selected-button" : ""}`}
              disabled={disabled}
              onClick={handleSelect}
            >
              {selected ? <Check size={17} /> : <Plus size={17} />}

              {selected ? "Seleccionado" : "Agregar a mi selección"}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

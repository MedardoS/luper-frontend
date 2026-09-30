import React from "react";
import {
  Plus,
  Check,
  LockKeyhole,
  Trash2,
} from "lucide-react";

import { statusInfo } from "../data";

export default function ProductCard({
  product,
  selected,
  onSelect,
  admin,
  onStatusChange,
  onDelete,
}) {
  const info =
    statusInfo[product.status] ||
    statusInfo.disponible;

  const disabled =
    !admin && product.status !== "disponible";

  return (
    <article
      className={`product-card ${
        selected ? "selected" : ""
      } ${disabled ? "is-disabled" : ""}`}
    >
      <div className="product-image-wrap">
        <img
          src={product.image}
          alt={product.model}
          className="product-image"
        />

        {disabled && (
          <div className="image-overlay">
            <LockKeyhole size={18} />
            <span>{info.label}</span>
          </div>
        )}
      </div>

      <div className="product-info">
        <h3>{product.model}</h3>

        <p>Talla {product.size}</p>

        {admin ? (
          <>
            <div className="admin-status-row">
              <span
                className={`status-pill ${info.className}`}
              >
                {info.label}
              </span>

              <select
                value={product.status}
                onChange={(e) =>
                  onStatusChange(
                    product.id,
                    e.target.value
                  )
                }
                aria-label={`Estado de ${product.model}`}
              >
                <option value="disponible">
                  Disponible
                </option>

                <option value="apartado">
                  Apartado
                </option>

                <option value="agotado">
                  Agotado
                </option>
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
          <button
            className={`select-product ${
              selected ? "selected-button" : ""
            }`}
            disabled={disabled}
            onClick={() => onSelect(product)}
          >
            {selected ? (
              <Check size={17} />
            ) : (
              <Plus size={17} />
            )}

            {selected
              ? "Seleccionado"
              : "Seleccionar"}
          </button>
        )}
      </div>
    </article>
  );
}
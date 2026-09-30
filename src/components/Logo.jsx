import React from "react";

export default function Logo({ light = false, compact = false }) {
  return (
    <div
      className={`brand ${light ? "brand-light" : ""} ${
        compact ? "brand-compact" : ""
      }`}
    >
      <img src="/logo.jpeg" alt="LUPER" />
    </div>
  );
}
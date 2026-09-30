import React from "react";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import Logo from "./Logo";

export default function Header({ onBack, selectionCount, onSelection }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="icon-button" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={19} />
        </button>
        <Logo compact />
        <button className="selection-button" onClick={onSelection}>
          <ShoppingBag size={18} />
          <span>{selectionCount}</span>
        </button>
      </div>
    </header>
  );
}
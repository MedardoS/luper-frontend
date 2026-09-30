export const initialProducts = [
  {
    id: 1,
    category: "Hombre",
    model: "Nike Air Force 1",
    size: "42",
    status: "disponible",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 2,
    category: "Hombre",
    model: "Adidas Forum",
    size: "40",
    status: "disponible",
    image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 3,
    category: "Hombre",
    model: "New Balance 550",
    size: "41",
    status: "apartado",
    image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 4,
    category: "Hombre",
    model: "Jordan 1 Low",
    size: "42",
    status: "disponible",
    image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 5,
    category: "Mujer",
    model: "Nike Air Max 90",
    size: "38",
    status: "disponible",
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 6,
    category: "Mujer",
    model: "Adidas Gazelle",
    size: "36",
    status: "disponible",
    image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 7,
    category: "Mujer",
    model: "New Balance 574",
    size: "39",
    status: "disponible",
    image: "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 8,
    category: "Mujer",
    model: "Puma Cali",
    size: "37",
    status: "agotado",
    image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 9,
    category: "Kids",
    model: "Nike Air Force 1 Kids",
    size: "32",
    status: "disponible",
    image: "https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 10,
    category: "Kids",
    model: "Adidas Superstar Kids",
    size: "30",
    status: "disponible",
    image: "https://images.unsplash.com/photo-1562183241-b937e95585b6?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 11,
    category: "Kids",
    model: "New Balance 574 Kids",
    size: "31",
    status: "disponible",
    image: "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 12,
    category: "Kids",
    model: "Puma Rickie Kids",
    size: "29",
    status: "disponible",
    image: "https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=900&q=85"
  }
];

export const categories = ["Hombre", "Mujer", "Kids"];

export const categoryImages = {
  Hombre:
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",

  Mujer:
    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=85",

  Kids:
    "https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=900&q=85",
};

export const statusInfo = {
  disponible: { label: "Disponible", className: "status-available" },
  apartado: { label: "Apartado", className: "status-reserved" },
  agotado: { label: "Agotado", className: "status-sold" }
};
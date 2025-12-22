const API = "https://themodestcompany.onrender.com";


/* ================================
   AUTH
================================ */
function login() {
  const key = loginKey.value.trim();
  if (!key) return;

  sessionStorage.setItem("ADMIN_KEY", key);
  checkAuth();
}

function logout() {
  sessionStorage.removeItem("ADMIN_KEY");
  location.reload();
}

function checkAuth() {
  const key = sessionStorage.getItem("ADMIN_KEY");
  if (!key) return;

  fetch(`${API}/api/admin/products`, {
    headers: { "x-admin-key": key }
  })
    .then(res => {
      if (!res.ok) throw new Error("Unauthorized");
      loginScreen.style.display = "none";
      dashboard.style.display = "block";
      loadProducts();
      loadAnalytics();
    })
    .catch(() => {
      loginError.innerText = "Invalid admin key";
      sessionStorage.removeItem("ADMIN_KEY");
    });
}

function headers(json = true) {
  const h = { "x-admin-key": sessionStorage.getItem("ADMIN_KEY") };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

/* ================================
   IMAGE UPLOAD → CLOUDINARY
   Endpoint: POST /api/admin/upload
================================ */
let uploadedImages = [];

async function uploadImages(files) {
  uploadedImages = [];

  const fd = new FormData();
  [...files].forEach(f => fd.append("images", f));
  fd.append("category", category.value);

  const res = await fetch(`${API}/api/admin/upload`, {
    method: "POST",
    headers: { "x-admin-key": sessionStorage.getItem("ADMIN_KEY") },
    body: fd
  });

  if (!res.ok) throw new Error("Image upload failed");

  const data = await res.json();
  uploadedImages = data.images || [];

  // preview
  uploadPreview.innerHTML = "";
  uploadedImages.forEach(img => {
    const el = document.createElement("img");
    el.src = img.url;
    el.className = "miniimg";
    uploadPreview.appendChild(el);
  });
}

/* ================================
   PRODUCTS
================================ */
async function addProduct() {
  try {
    status.innerText = "Adding product...";

    const body = {
      title: title.value.trim(),
      price: Number(price.value),
      category: category.value,
      stock: Number(stock.value),
      description: description.value.trim(),
      images: uploadedImages
    };

    const res = await fetch(`${API}/api/admin/products`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      status.innerText = data.error || "Error adding product";
      return;
    }

    status.innerText = "Product added ✅";
    uploadedImages = [];
    uploadPreview.innerHTML = "";
    imageUpload.value = "";

    loadProducts();
  } catch (e) {
    status.innerText = "Server error";
  }
}

async function loadProducts() {
  const res = await fetch(`${API}/api/admin/products`, {
    headers: headers(false)
  });

  const products = await res.json();
  productRows.innerHTML = "";

  products.forEach(p => {
    const img = p.images?.[0]?.url || "";

    productRows.innerHTML += `
      <tr>
        <td>${img ? `<img src="${img}" class="miniimg" />` : "—"}</td>
        <td>${p.title}</td>
        <td>${p.category}</td>
        <td>₹${p.price}</td>
        <td>
          <button class="danger" onclick="del('${p._id}')">Delete</button>
        </td>
      </tr>
    `;
  });
}

async function del(id) {
  if (!confirm("Delete product?")) return;

  await fetch(`${API}/api/admin/products/${id}`, {
    method: "DELETE",
    headers: headers(false)
  });

  loadProducts();
}

/* ================================
   ANALYTICS
================================ */
async function loadAnalytics() {
  const range = rangeSelect.value;

  const res = await fetch(`${API}/api/admin/analytics?range=${range}`, {
    headers: headers(false)
  });

  const d = await res.json();

  statRevenue.innerText = `₹${(d.totalRevenue || 0).toLocaleString("en-IN")}`;
  statOrders.innerText = d.totalOrders || 0;
  statTop.innerText = d.topProducts?.[0]?.title || "—";
}

/* ================================
   INIT
================================ */
checkAuth();

/* ================================
   EVENTS
================================ */
imageUpload.addEventListener("change", e => {
  if (e.target.files.length) {
    uploadImages(e.target.files).catch(() => {
      alert("Image upload failed");
    });
  }
});

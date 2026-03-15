// Navigation Toggle for Mobile
const navSlide = () => {
  const burger = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav-links');
  const navLinks = document.querySelectorAll('.nav-links li');

  if (burger) {
    burger.addEventListener('click', () => {
      // Toggle Nav
      nav.classList.toggle('nav-active');

      // Animate Links
      navLinks.forEach((link, index) => {
        if (link.style.animation) {
          link.style.animation = '';
        } else {
          link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
        }
      });

      // Burger Animation
      burger.classList.toggle('toggle');
    });
  }
}

// Navbar Scroll Effect
const navScroll = () => {
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

// Scroll Animation (Fade In)
const scrollAnimation = () => {
  const fadeElements = document.querySelectorAll('.fade-in');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  fadeElements.forEach(element => {
    observer.observe(element);
  });
}

// --- Cart & Search Logic ---

function toggleSearch() {
  const overlay = document.getElementById('searchOverlay');
  if (overlay) overlay.classList.toggle('active');
}

function toggleCart() {
  const drawer = document.getElementById('cartDrawer');
  if (drawer) drawer.classList.toggle('active');
}

let cart = JSON.parse(localStorage.getItem('choco_cart')) || [];

function saveCart() {
  localStorage.setItem('choco_cart', JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  const cartItemsContainer = document.getElementById('cartItems');
  const cartTotalAmount = document.getElementById('cartTotalAmount');
  const cartCount = document.querySelectorAll('#cartCount'); // Update all icons if multiple
  
  if (!cartItemsContainer || !cartTotalAmount) return;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 50px;">Your bag is empty.</p>';
    cartTotalAmount.innerText = '$0.00';
    cartCount.forEach(el => el.innerText = '0');
    return;
  }

  let html = '';
  let total = 0;

  cart.forEach((item, index) => {
    total += item.price;
    html += `
      <div class="cart-item">
        <img src="${item.img}" alt="${item.name}">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p>$${item.price.toFixed(2)}</p>
        </div>
        <i class="fa-solid fa-trash cart-remove" onclick="removeFromCart(${index})"></i>
      </div>
    `;
  });

  cartItemsContainer.innerHTML = html;
  cartTotalAmount.innerText = '$' + total.toFixed(2);
  cartCount.forEach(el => el.innerText = cart.length.toString());
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
}

function checkout() {
  if (cart.length === 0) {
    alert("Your bag is empty!");
    return;
  }
  alert("Redirecting to secure checkout...");
  cart = [];
  saveCart();
  toggleCart();
}

// Show toast notification on mobile instead of opening cart
function showCartToast(name) {
  let toast = document.getElementById('cartToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cartToast';
    toast.className = 'cart-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = '✓ ' + name + ' added to bag!';
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// Attach event listeners to all Add To Bag buttons
function setupCartButtons() {
  const buttons = document.querySelectorAll('.shop-btn, .add-to-cart-btn');
  buttons.forEach(btn => {
    btn.removeAttribute('onclick'); // Remove inline alerts from earlier
    btn.addEventListener('click', (e) => {
      let card = e.target.closest('.product-card');
      let name = 'Chocolate Item';
      let priceText = '0';
      let img = 'assets/images/hero.jpg';

      if (card) {
        let nameEl = card.querySelector('.product-name');
        let priceEl = card.querySelector('.product-price');
        let imgEl = card.querySelector('.product-img');
        if (nameEl) name = nameEl.innerText;
        if (priceEl) priceText = priceEl.innerText;
        if (imgEl) img = imgEl.src;
      } else {
        let container = e.target.closest('.product-detail-container');
        if (container) {
          let nameEl = container.querySelector('.product-title');
          let priceEl = container.querySelector('.product-price');
          let imgEl = container.querySelector('.main-image');
          if (nameEl) name = nameEl.innerText;
          if (priceEl) priceText = priceEl.innerText;
          if (imgEl) img = imgEl.src;
        }
      }

      let price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      if (isNaN(price)) price = 0;

      let qtyInput = document.getElementById('qty');
      let qty = qtyInput ? parseInt(qtyInput.value) : 1;
      if (isNaN(qty) || qty < 1) qty = 1;

      for(let i = 0; i < qty; i++) {
        cart.push({ name, price, img });
      }
      saveCart();

      // On mobile: show toast, on desktop: open cart drawer
      if (window.innerWidth <= 768) {
        showCartToast(name);
      } else {
        toggleCart();
      }
    });
  });
}

function updateProfileIcon() {
  const profileIcon = document.getElementById('profileIcon');
  if (profileIcon) {
    const isLoggedIn = localStorage.getItem('choco_logged_in') === 'true';
    if (isLoggedIn) {
      profileIcon.innerHTML = '<i class="fa-solid fa-user-check" style="color: var(--gold)"></i>';
      profileIcon.href = "javascript:void(0)";
      profileIcon.onclick = () => {
        if(confirm("Do you want to logout?")) {
          localStorage.setItem('choco_logged_in', 'false');
          window.location.reload();
        }
      };
    }
  }
}

// --- Shop Sorting & Filtering Logic ---
function initShopLogic() {
  const categoryFilter = document.getElementById('categoryFilter');
  const priceFilter = document.getElementById('priceFilter');
  const sortSelect = document.getElementById('sortSelect');
  const productGrid = document.getElementById('productGrid');
  const shopControls = document.querySelector('.shop-controls span');

  if (!categoryFilter || !sortSelect || !productGrid) return; // Not on shop page

  const filterLinks = categoryFilter.querySelectorAll('a');
  const priceLinks = priceFilter ? priceFilter.querySelectorAll('a') : [];
  let currentCategory = 'all';
  let currentPriceMin = 0;
  let currentPriceMax = 999999;

  // Extract products into an array of objects
  const productCards = Array.from(productGrid.querySelectorAll('.product-card'));
  
  // Store them so we can re-render them based on sort/filter
  const productsData = productCards.map(card => {
    return {
      element: card,
      category: card.dataset.category || '',
      price: parseFloat(card.dataset.price) || 0,
      rating: parseFloat(card.dataset.rating) || 0
    };
  });

  function renderGrid() {
    // 1. Filter by category
    let filtered = productsData.filter(prod => {
      if (currentCategory === 'all') return true;
      return prod.category.includes(currentCategory);
    });

    // 2. Filter by price range
    filtered = filtered.filter(prod => {
      return prod.price >= currentPriceMin && prod.price <= currentPriceMax;
    });

    // 3. Sort
    const sortVal = sortSelect.value;
    if (sortVal === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortVal === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortVal === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    }

    // 4. Render
    productGrid.innerHTML = '';
    if (filtered.length === 0) {
      productGrid.innerHTML = '<p style="color: var(--text-muted); text-align: center; grid-column: 1 / -1; padding: 60px 0; font-size: 1.1rem;">No products found in this price range.</p>';
    } else {
      filtered.forEach(prod => {
        productGrid.appendChild(prod.element);
      });
    }

    // Update results count
    if (shopControls) {
      const total = filtered.length;
      shopControls.textContent = total > 0 
        ? `Showing 1-${total} of ${total} results` 
        : 'No results found';
    }
  }

  // Category Filter Event Listeners
  filterLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      filterLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      currentCategory = link.dataset.filter || 'all';
      renderGrid();
    });
  });

  // Price Filter Event Listeners
  priceLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      priceLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      currentPriceMin = parseFloat(link.dataset.priceMin) || 0;
      currentPriceMax = parseFloat(link.dataset.priceMax) || 999999;
      renderGrid();
    });
  });

  // Sort Event Listeners
  sortSelect.addEventListener('change', () => {
    renderGrid();
  });
}

// Initialize scripts
document.addEventListener('DOMContentLoaded', () => {
  navSlide();
  navScroll();
  scrollAnimation();
  
  renderCart();
  setupCartButtons();
  updateProfileIcon();
  initShopLogic();
  initScrollSpy();
  initEnquiryForm();

  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    // If it's a login or signup form
    if(form.closest('.auth-box')) {
      form.addEventListener('submit', () => {
        localStorage.setItem('choco_logged_in', 'true');
      });
    }
  });
});


// Enquiry Form Handler (AJAX via formsubmit.co)
function initEnquiryForm() {
  const form = document.getElementById('enquiryForm');
  if (!form) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const submitBtn = form.querySelector('.submit-btn');
    const statusEl = document.getElementById('formStatus');
    const formData = new FormData(form);

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    if (statusEl) { statusEl.style.display = 'none'; }

    fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success === "true" || data.success === true) {
        // Success
        if (statusEl) {
          statusEl.style.display = 'block';
          statusEl.style.color = '#4CAF50';
          statusEl.textContent = '✅ Thank you! Your message has been sent successfully. We will get back to you within 24 hours.';
        }
        form.reset();
      } else {
        // FormSubmit returned an error
        if (statusEl) {
          statusEl.style.display = 'block';
          statusEl.style.color = '#ff4d4d';
          statusEl.textContent = '❌ Something went wrong. Please try again or email us directly.';
        }
      }
    })
    .catch(error => {
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = '#ff4d4d';
        statusEl.textContent = '❌ Network error. Please check your internet connection and try again.';
      }
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    });
  });
}

// Scroll Spy for Navigation Links
function initScrollSpy() {
  const sectionIds = ['home', 'shop', 'gifts', 'about', 'contact'];
  const sections = sectionIds.map(id => document.getElementById(id)).filter(el => el);
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      // Trigger update slightly before reaching the section
      if (scrollY >= (sectionTop - 250)) {
        current = section.getAttribute('id');
      }
    });

    if (current) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
          link.classList.add('active');
        }
      });
    }
  });
}

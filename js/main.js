/* ============================================
   OLYMPUS STUDIO - JavaScript compartido
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  const updateNavbar = () => {
    if (navbar) navbar.classList.toggle('scrolled', window.pageYOffset > 30);
  };
  updateNavbar();
  window.addEventListener('scroll', updateNavbar, { passive: true });

  /* === MENU MOVIL === */
  const mobileToggle = document.getElementById('mobileToggle');
  const navLinks = document.getElementById('navLinks');
  const closeMobileMenu = () => {
    if (!mobileToggle || !navLinks) return;
    mobileToggle.classList.remove('active');
    navLinks.classList.remove('open');
    mobileToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      mobileToggle.classList.toggle('active', isOpen);
      mobileToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMobileMenu));
  }

  /* === ENLACE ACTIVO === */
  const currentPage = document.body.dataset.page;
  if (currentPage) {
    document.querySelectorAll('[data-page-link]').forEach(link => {
      if (link.dataset.pageLink === currentPage) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  /* === ANIMACIONES AL ENTRAR EN PANTALLA === */
  const animated = document.querySelectorAll('.animate-on-scroll');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          instance.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    animated.forEach(el => observer.observe(el));
  } else {
    animated.forEach(el => el.classList.add('visible'));
  }

  /* === FAQ ACCORDION === */
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      const group = item.closest('.faq-list');
      (group ? group.querySelectorAll('.faq-item') : [item]).forEach(other => {
        other.classList.remove('active');
        const otherQuestion = other.querySelector('.faq-question');
        if (otherQuestion) otherQuestion.setAttribute('aria-expanded', 'false');
      });
      if (!isActive) {
        item.classList.add('active');
        question.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* === FORMULARIO DE CONTACTO === */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', event => {
      event.preventDefault();
      const formData = new FormData(contactForm);
      const nombre = String(formData.get('nombre') || '').trim();
      const correo = String(formData.get('correo') || '').trim();
      const whatsapp = String(formData.get('whatsapp') || '').trim();
      const tipo = String(formData.get('tipo') || '').trim();
      const mensaje = String(formData.get('mensaje') || '').trim();
      if (!nombre || !correo || !whatsapp || !tipo || !mensaje) {
        alert('Por favor completa todos los campos.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        alert('Por favor ingresa un correo válido.');
        return;
      }
      const text = [
        'Hola Olympus Studio,',
        '',
        `Mi nombre es: ${nombre}`,
        `Correo: ${correo}`,
        `WhatsApp: ${whatsapp}`,
        `Tipo de proyecto: ${tipo}`,
        '',
        `Mensaje: ${mensaje}`
      ].join('\n');
      window.open(`https://wa.me/573026104924?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
      contactForm.reset();
    });
  }

  /* === SCROLL SUAVE SOLO PARA ANCLAS DE LA MISMA PÁGINA === */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', event => {
      const targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        event.preventDefault();
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - 90;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        history.replaceState(null, '', targetId);
      }
    });
  });

  /* === PARALLAX SUTIL EN HOME === */
  const heroVisual = document.querySelector('.hero-visual');
  if (heroVisual && window.matchMedia('(min-width: 769px)').matches) {
    window.addEventListener('scroll', () => {
      const offset = Math.min(window.pageYOffset * 0.12, 80);
      heroVisual.style.transform = `translateY(${offset}px)`;
    }, { passive: true });
  }

  /* === MODALES LEGALES === */
  let modalReturnFocus = null;
  window.showModal = type => {
    const overlay = document.getElementById('modalOverlay');
    const modalId = type === 'terminos' ? 'modalTerminos' : type === 'privacidad' ? 'modalPrivacidad' : 'modalCookies';
    const modal = document.getElementById(modalId);
    if (overlay && modal) {
      modalReturnFocus = document.activeElement;
      overlay.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      modal.querySelector('.modal-close')?.focus();
    }
  };
  window.closeModal = () => {
    document.querySelectorAll('.modal-overlay, .modal').forEach(el => {
      el.classList.remove('active');
      el.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = '';
    modalReturnFocus?.focus?.();
  };
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') window.closeModal();
  });

  /* === ACCESO Y PERFIL EN NAVEGACIÓN === */
  const sessionKey = 'olympus_session_v2';
  let accountSession = null;
  try {
    accountSession = JSON.parse(localStorage.getItem(sessionKey) || sessionStorage.getItem(sessionKey) || 'null');
  } catch { accountSession = null; }
  if (accountSession && navLinks) {
    const loginItem = navLinks.querySelector('.nav-login-link')?.closest('li');
    if (loginItem) {
      loginItem.innerHTML = '';
      const profileLink = document.createElement('a');
      profileLink.className = 'nav-link nav-profile-link';
      profileLink.href = 'login.html?perfil=1';
      profileLink.setAttribute('aria-label', `Mi perfil de ${accountSession.fullName || accountSession.username || 'usuario'}`);
      if (accountSession.avatar) {
        const avatar = document.createElement('img');
        avatar.className = 'nav-user-avatar';
        avatar.src = accountSession.avatar;
        avatar.alt = '';
        profileLink.append(avatar);
      }
      profileLink.append(document.createTextNode('Mi perfil'));
      loginItem.append(profileLink);
    }
    const logoutItem = document.createElement('li');
    const logoutLink = document.createElement('a');
    logoutLink.href = 'login.html';
    logoutLink.className = 'nav-link nav-logout-link';
    logoutLink.textContent = 'Cerrar sesión';
    logoutLink.addEventListener('click', event => {
      event.preventDefault();
      localStorage.removeItem(sessionKey);
      sessionStorage.removeItem(sessionKey);
      window.location.href = 'login.html';
    });
    logoutItem.append(logoutLink);
    navLinks.append(logoutItem);
  }
});


/* Precarga en el formulario el servicio desde los enlaces de las tarjetas. */
document.addEventListener('DOMContentLoaded', () => {
  const serviceSelect = document.getElementById('tipo');
  const requestedService = new URLSearchParams(window.location.search).get('servicio');
  const serviceOptions = {
    '1': 'Página web', '2': 'Identidad visual', '3': 'Tarjetas corporativas',
    '4': 'Producción 2D', '5': 'Diseño para redes', '6': 'Campañas de marca'
  };
  if (serviceSelect && serviceOptions[requestedService]) serviceSelect.value = serviceOptions[requestedService];
});

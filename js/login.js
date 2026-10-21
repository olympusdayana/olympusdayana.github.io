/* Olympus Studio — acceso y perfil para prototipo local. */
document.addEventListener('DOMContentLoaded', () => {
  const ACCOUNTS_KEY = 'olympus_accounts_v2';
  const SESSION_KEY = 'olympus_session_v2';
  const ADMIN_PROFILE_KEY = 'olympus_admin_profile_v2';
  const ADMIN_USER = { username: 'admin', email: 'admin@olympus.studio', fullName: 'Administrador Olympus' };

  const tabs = [...document.querySelectorAll('.login-tab')];
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const verifyForm = document.getElementById('verifyForm');
  const forgotForm = document.getElementById('forgotForm');
  const profilePanel = document.getElementById('profilePanel');
  const messageBox = document.getElementById('messageBox');
  const messageText = document.getElementById('messageText');
  const messageIcon = document.getElementById('messageIcon');
  const indicator = document.querySelector('.login-tab-indicator');
  const loginTabs = document.querySelector('.login-tabs');
  const divider = document.getElementById('loginDivider');
  const backLink = document.getElementById('loginBackLink');
  let pendingChallenge = null;
  let avatarDraft = '';
  let activeSession = null;
  let rememberSession = false;

  const readAccounts = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch { return []; }
  };
  const saveAccounts = accounts => localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  const DEMO_ACCOUNTS = [
    { username: 'visitante', email: 'visitante@olympus.demo', fullName: 'Alex Visitante', password: 'Olympus2026!', passwordHash: '2c6789bc1479383be98bc6d0e4cd646c6856a2ffd13ca67eab466851bfdf8854' },
    { username: 'cliente1', email: 'cliente1@olympus.demo', fullName: 'Camila Creativa', password: 'Marca2026!', passwordHash: '283793677290505bd91e9da2a82bc012e4a7142573dec97d75249dc12718abc4' },
    { username: 'cliente2', email: 'cliente2@olympus.demo', fullName: 'Daniel Digital', password: 'Diseno2026!', passwordHash: '5db68706357de1be33bdb5e8315b89b077f05e3f37cd300c786a67308f79a342' }
  ];
  function seedDemoAccounts() {
    const accounts = readAccounts();
    let changed = false;
    DEMO_ACCOUNTS.forEach(demo => {
      const index = accounts.findIndex(account => normalize(account.username) === normalize(demo.username));
      if (index < 0) {
        accounts.push({ username: demo.username, email: demo.email, fullName: demo.fullName,
          passwordHash: demo.passwordHash, avatar: '', verified: true, demo: true });
        changed = true;
      } else if (accounts[index].demo && accounts[index].passwordHash !== demo.passwordHash) {
        // Update only the demo password hash; keep any profile edits from this browser.
        accounts[index].passwordHash = demo.passwordHash;
        accounts[index].verified = true;
        changed = true;
      }
    });
    if (changed) saveAccounts(accounts);
  }
  const normalize = value => String(value || '').trim().toLowerCase();
  const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  async function hashPassword(password) {
    if (!window.crypto?.subtle) throw new Error('Abre el sitio mediante HTTPS o localhost para crear cuentas de demostración.');
    const buffer = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  seedDemoAccounts();

  function showMessage(message, type = 'error') {
    messageText.textContent = message;
    messageBox.className = `message-box show${type === 'success' ? ' success' : ''}`;
    messageIcon.textContent = type === 'success' ? '✓' : '!';
  }
  function hideMessage() { messageBox.classList.remove('show', 'success'); }

  function setActiveForm(form) {
    document.querySelectorAll('.login-form').forEach(item => item.classList.remove('active'));
    if (form) form.classList.add('active');
  }
  function setTab(name) {
    tabs.forEach(tab => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    if (indicator) indicator.style.transform = name === 'register' ? 'translateX(100%)' : 'translateX(0)';
  }
  function showLogin(message = '') {
    pendingChallenge = null;
    setActiveForm(loginForm);
    loginTabs.style.display = 'flex';
    divider.hidden = false;
    backLink.hidden = false;
    setTab('login');
    hideMessage();
    if (message) showMessage(message, 'success');
  }

  tabs.forEach(tab => tab.addEventListener('click', () => {
    pendingChallenge = null;
    setTab(tab.dataset.tab);
    setActiveForm(tab.dataset.tab === 'register' ? registerForm : loginForm);
    loginTabs.style.display = 'flex';
    divider.hidden = false;
    backLink.hidden = false;
    hideMessage();
  }));

  function setupToggle(buttonId, inputId) {
    const button = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    if (!button || !input) return;
    button.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
  }
  setupToggle('toggleLoginPassword', 'loginPassword');
  setupToggle('toggleRegPassword', 'regPassword');
  setupToggle('toggleRegConfirm', 'regConfirm');
  document.querySelectorAll('[data-demo-user]').forEach(button => {
    button.addEventListener('click', () => {
      document.getElementById('loginUsername').value = button.dataset.demoUser;
      document.getElementById('loginPassword').value = button.dataset.demoPassword;
      document.getElementById('loginUsername').focus();
      showMessage('Datos de demostración cargados. Pulsa “Continuar” para entrar.', 'success');
    });
  });
  const requestedDemo = new URLSearchParams(window.location.search).get('demo');
  if (requestedDemo) {
    const demo = DEMO_ACCOUNTS.find(account => account.username === requestedDemo);
    if (demo) {
      document.getElementById('loginUsername').value = demo.username;
      document.getElementById('loginPassword').value = demo.password;
      showMessage(`Cuenta de muestra “${demo.username}” lista. Pulsa “Continuar” para entrar.`, 'success');
    }
  }

  function makeCode() {
    const numbers = new Uint32Array(1);
    window.crypto.getRandomValues(numbers);
    return String(numbers[0] % 1000000).padStart(6, '0');
  }

  function issueCode(type, username) {
    pendingChallenge = { type, username, code: makeCode(), expiresAt: Date.now() + 5 * 60 * 1000 };
    document.getElementById('verificationCode').value = '';
    document.getElementById('verifyTitle').textContent = type === 'register' ? 'Confirma tu correo' : 'Verifica tu acceso';
    document.getElementById('verifyCopy').textContent = type === 'register'
      ? 'Confirma el correo de la cuenta con el código de seis dígitos.'
      : 'Escribe el código de seis dígitos para completar el inicio de sesión.';
    document.getElementById('demoCode').textContent = `Código de demostración: ${pendingChallenge.code} · No se envía por correo.`;
    setActiveForm(verifyForm);
    loginTabs.style.display = 'none';
    divider.hidden = true;
    backLink.hidden = true;
    hideMessage();
    document.getElementById('verificationCode').focus();
  }

  function getAccount(identity) {
    return readAccounts().find(account => normalize(account.username) === normalize(identity) || normalize(account.email) === normalize(identity));
  }

  function getAdminProfile() {
    try { return JSON.parse(localStorage.getItem(ADMIN_PROFILE_KEY) || '{}'); } catch { return {}; }
  }

  function storeSession(user, remember) {
    activeSession = {
      username: user.username,
      fullName: user.fullName || user.username,
      email: user.email || '',
      avatar: user.avatar || '',
      isAdmin: Boolean(user.isAdmin)
    };
    rememberSession = remember;
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(activeSession));
  }

  function readSession() {
    try {
      const remembered = localStorage.getItem(SESSION_KEY);
      const current = remembered || sessionStorage.getItem(SESSION_KEY);
      if (!current) return null;
      rememberSession = Boolean(remembered);
      return JSON.parse(current);
    } catch { return null; }
  }

  function renderAvatar(dataUrl, fullName) {
    const image = document.getElementById('profileAvatarPreview');
    const fallback = document.getElementById('profileAvatarFallback');
    if (dataUrl) {
      image.src = dataUrl;
      image.hidden = false;
      fallback.hidden = true;
    } else {
      image.removeAttribute('src');
      image.hidden = true;
      fallback.hidden = false;
      fallback.textContent = (fullName || 'O').trim().charAt(0).toUpperCase();
    }
  }

  function showProfile() {
    if (!activeSession) return;
    pendingChallenge = null;
    setActiveForm(profilePanel);
    loginTabs.style.display = 'none';
    divider.hidden = true;
    backLink.hidden = true;
    document.getElementById('profileName').value = activeSession.fullName || '';
    document.getElementById('profileUsername').value = activeSession.username || '';
    document.getElementById('profileEmail').value = activeSession.email || '';
    avatarDraft = activeSession.avatar || '';
    renderAvatar(avatarDraft, activeSession.fullName);
    hideMessage();
    if (new URLSearchParams(location.search).has('perfil')) document.getElementById('profileHeading').focus?.();
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    hideMessage();
    const identity = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!identity || !password) return showMessage('Por favor ingresa tu usuario y contraseña.');

    try {
      const adminProfile = getAdminProfile();
      const adminMatch = normalize(identity) === 'admin' || normalize(identity) === normalize(ADMIN_USER.email) || normalize(identity) === normalize(adminProfile.username);
      if (adminMatch && password === 'olympus2026') {
        issueCode('login', 'admin');
        return;
      }
      const account = getAccount(identity);
      if (!account || account.passwordHash !== await hashPassword(password)) {
        showMessage('Usuario o contraseña incorrectos. Intenta de nuevo.');
        document.getElementById('loginPassword').value = '';
        return;
      }
      if (!account.verified) {
        issueCode('register', account.username);
        return;
      }
      issueCode('login', account.username);
    } catch (error) {
      showMessage(error.message || 'No se pudo validar la cuenta.');
    }
  });

  registerForm.addEventListener('submit', async event => {
    event.preventDefault();
    hideMessage();
    const fullName = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;
    if (!fullName || !email || !username || !password || !confirm) return showMessage('Por favor completa todos los campos.');
    if (!validEmail(email)) return showMessage('Por favor ingresa un correo válido.');
    if (username.length < 3 || !/^[\p{L}\p{N}._-]+$/u.test(username)) return showMessage('El usuario debe tener al menos 3 caracteres y solo letras, números, punto, guion o guion bajo.');
    if (password.length < 8) return showMessage('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirm) return showMessage('Las contraseñas no coinciden.');
    if (!document.getElementById('regTerms').checked) return showMessage('Debes aceptar los términos y condiciones.');
    const accounts = readAccounts();
    const adminUsername = getAdminProfile().username || 'admin';
    if (normalize(username) === 'admin' || normalize(username) === normalize(adminUsername) || normalize(email) === normalize(ADMIN_USER.email) || accounts.some(account => normalize(account.username) === normalize(username) || normalize(account.email) === normalize(email))) {
      return showMessage('Ese usuario o correo ya está registrado.');
    }
    try {
      accounts.push({ username, email, fullName, passwordHash: await hashPassword(password), avatar: '', verified: false });
      saveAccounts(accounts);
      registerForm.reset();
      issueCode('register', username);
    } catch (error) {
      showMessage(error.message || 'No se pudo guardar la cuenta.');
    }
  });

  verifyForm.addEventListener('submit', event => {
    event.preventDefault();
    hideMessage();
    const enteredCode = document.getElementById('verificationCode').value.trim();
    if (!pendingChallenge) return showLogin('La verificación expiró; inicia el proceso de nuevo.');
    if (Date.now() > pendingChallenge.expiresAt) {
      pendingChallenge = null;
      setActiveForm(loginForm);
      loginTabs.style.display = 'flex';
      divider.hidden = false;
      backLink.hidden = false;
      return showMessage('El código venció. Solicita uno nuevo iniciando de nuevo.');
    }
    if (!/^\d{6}$/.test(enteredCode) || enteredCode !== pendingChallenge.code) return showMessage('El código no coincide. Revisa e intenta otra vez.');

    if (pendingChallenge.type === 'register') {
      const accounts = readAccounts();
      const account = accounts.find(item => normalize(item.username) === normalize(pendingChallenge.username));
      if (!account) return showLogin('No se encontró la cuenta por verificar.');
      account.verified = true;
      saveAccounts(accounts);
      pendingChallenge = null;
      showLogin('Correo verificado. Ya puedes iniciar sesión.');
      return;
    }

    const username = pendingChallenge.username;
    if (document.getElementById('rememberMe').checked) localStorage.setItem('olympus_username', username);
    else localStorage.removeItem('olympus_username');
    if (normalize(username) === 'admin') {
      const profile = getAdminProfile();
      storeSession({ username: profile.username || 'admin', fullName: profile.fullName || ADMIN_USER.fullName, email: ADMIN_USER.email, avatar: profile.avatar || '', isAdmin: true }, document.getElementById('rememberMe').checked);
    } else {
      const account = getAccount(username);
      if (!account) return showLogin('La cuenta ya no está disponible.');
      storeSession(account, document.getElementById('rememberMe').checked);
    }
    showProfile();
    showMessage('Acceso verificado. Ya puedes editar tu perfil.', 'success');
  });

  document.getElementById('resendCode').addEventListener('click', () => {
    if (!pendingChallenge) return showLogin();
    issueCode(pendingChallenge.type, pendingChallenge.username);
    showMessage('Generamos otro código de demostración.', 'success');
  });
  document.getElementById('cancelVerification').addEventListener('click', event => { event.preventDefault(); showLogin(); });

  forgotForm.addEventListener('submit', event => {
    event.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();
    if (!validEmail(email)) return showMessage('Por favor ingresa un correo válido.');
    showMessage('La recuperación necesita un servicio de correo conectado; esta demostración no envía mensajes. Contacta a Olympus Studio para restablecerla.');
  });

  function imageToAvatar(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) return reject(new Error('Selecciona un archivo de imagen.'));
      if (file.size > 5 * 1024 * 1024) return reject(new Error('La imagen debe pesar menos de 5 MB.'));
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        const sx = (image.naturalWidth - side) / 2;
        const sy = (image.naturalHeight - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        canvas.getContext('2d').drawImage(image, sx, sy, side, side, 0, 0, 256, 256);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('No se pudo leer esa imagen.')); };
      image.src = objectUrl;
    });
  }

  document.getElementById('profileAvatarInput').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      avatarDraft = await imageToAvatar(file);
      renderAvatar(avatarDraft, document.getElementById('profileName').value);
      showMessage('Foto lista. Guarda los cambios para aplicarla.', 'success');
    } catch (error) { showMessage(error.message); }
  });

  document.getElementById('profileForm').addEventListener('submit', event => {
    event.preventDefault();
    const fullName = document.getElementById('profileName').value.trim();
    const username = document.getElementById('profileUsername').value.trim();
    if (!fullName || !username) return showMessage('Completa el nombre y el usuario.');
    if (username.length < 3 || !/^[\p{L}\p{N}._-]+$/u.test(username)) return showMessage('El usuario debe tener al menos 3 caracteres y solo letras, números, punto, guion o guion bajo.');
    const accounts = readAccounts();
    const duplicate = accounts.some(account => normalize(account.username) === normalize(username) && normalize(account.username) !== normalize(activeSession.username));
    const adminUsername = getAdminProfile().username || 'admin';
    if (duplicate || (normalize(username) === normalize(adminUsername) && !activeSession.isAdmin)) return showMessage('Ese nombre de usuario ya está ocupado.');

    const oldUsername = activeSession.username;
    if (activeSession.isAdmin) {
      const profile = { username, fullName, avatar: avatarDraft };
      localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(profile));
    } else {
      const account = accounts.find(item => normalize(item.username) === normalize(oldUsername));
      if (!account) return showMessage('No se encontró la cuenta para guardar.');
      account.username = username;
      account.fullName = fullName;
      account.avatar = avatarDraft;
      saveAccounts(accounts);
    }
    storeSession({ ...activeSession, username, fullName, avatar: avatarDraft }, rememberSession);
    renderAvatar(avatarDraft, fullName);
    document.getElementById('profileHeading').focus?.();
    showMessage('Perfil actualizado correctamente.', 'success');
  });

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    activeSession = null;
    avatarDraft = '';
    document.getElementById('loginPassword').value = '';
    showLogin('Sesión cerrada correctamente.');
  }
  document.getElementById('logoutButton').addEventListener('click', logout);

  window.showForgot = () => {
    setActiveForm(forgotForm);
    loginTabs.style.display = 'none';
    divider.hidden = true;
    backLink.hidden = false;
    hideMessage();
  };
  window.showLogin = showLogin;
  window.showTerms = () => {
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('modalTerms').classList.add('active');
  };
  window.showPrivacy = () => {
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('modalPrivacy').classList.add('active');
  };
  window.closeModal = () => document.querySelectorAll('.modal-overlay, .modal').forEach(item => item.classList.remove('active'));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') window.closeModal(); });

  const savedUsername = localStorage.getItem('olympus_username');
  if (savedUsername) {
    document.getElementById('loginUsername').value = savedUsername;
    document.getElementById('rememberMe').checked = true;
  }
  activeSession = readSession();
  if (activeSession) showProfile();

  const wrapper = document.querySelector('.login-wrapper');
  if (wrapper) {
    wrapper.style.opacity = '0';
    wrapper.style.transform = 'translateY(20px)';
    requestAnimationFrame(() => {
      wrapper.style.transition = 'opacity .45s ease, transform .45s ease';
      wrapper.style.opacity = '1';
      wrapper.style.transform = 'translateY(0)';
    });
  }
});

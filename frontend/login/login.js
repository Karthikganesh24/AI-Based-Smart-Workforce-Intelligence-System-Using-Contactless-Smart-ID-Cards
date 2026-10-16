/**
 * frontend/login/login.js
 * 
 * Authentication Portal Controller for SmartWorkforce.
 * Handles Company Admin sign-in, Employee sign-in, and Company Registration.
 */

(function () {
  'use strict';

  const { showToast, escapeHtml } = window.SmartWorkforceCommon || {
    showToast: (msg) => alert(msg),
    escapeHtml: (str) => str
  };

  const loginPortal = document.getElementById('loginPortal');
  const companyRegistrationPortal = document.getElementById('companyRegistrationPortal');

  const tabCompanyAdmin = document.getElementById('tabCompanyAdmin');
  const tabEmployee = document.getElementById('tabEmployee');

  const loginHeading = document.getElementById('loginHeading');
  const loginSubheading = document.getElementById('loginSubheading');
  const loginIdentityLabel = document.getElementById('loginIdentityLabel');
  const loginIdentityInput = document.getElementById('loginIdentityInput');
  const loginPasswordInput = document.getElementById('loginPasswordInput');
  const btnTogglePassword = document.getElementById('btnTogglePassword');
  const employeePortalHint = document.getElementById('employeePortalHint');
  const linkForgotPassword = document.getElementById('linkForgotPassword');
  const loginForm = document.getElementById('loginForm');
  const loginStatusBanner = document.getElementById('loginStatusBanner');
  const btnOpenCompanyRegistration = document.getElementById('btnOpenCompanyRegistration');

  // Registration Portal Elements
  const btnBackToLogin = document.getElementById('btnBackToLogin');
  const btnCancelRegistration = document.getElementById('btnCancelRegistration');
  const companyRegistrationForm = document.getElementById('companyRegistrationForm');
  const regStatusNotice = document.getElementById('regStatusNotice');

  let currentPortalMode = 'ADMIN'; // 'ADMIN' or 'EMPLOYEE'

  function showView(view) {
    if (view === 'login') {
      loginPortal.classList.remove('hidden');
      companyRegistrationPortal.classList.add('hidden');
    } else if (view === 'register') {
      loginPortal.classList.add('hidden');
      companyRegistrationPortal.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function selectCompanyAdminTab(clearInputs = true) {
    currentPortalMode = 'ADMIN';
    if (tabCompanyAdmin) {
      tabCompanyAdmin.classList.add('active');
      tabCompanyAdmin.setAttribute('aria-selected', 'true');
    }
    if (tabEmployee) {
      tabEmployee.classList.remove('active');
      tabEmployee.setAttribute('aria-selected', 'false');
    }

    if (loginHeading) loginHeading.textContent = 'Welcome Back';
    if (loginSubheading) loginSubheading.textContent = 'Sign in to access your SmartWorkforce dashboard';
    if (loginIdentityLabel) loginIdentityLabel.textContent = 'Company Email / Admin ID';
    if (loginIdentityInput) loginIdentityInput.placeholder = 'Enter your company email or admin ID';
    if (clearInputs) {
      if (loginIdentityInput) loginIdentityInput.value = '';
      if (loginPasswordInput) loginPasswordInput.value = '';
    }

    if (employeePortalHint) employeePortalHint.style.display = 'none';
  }

  // Check for one-time registration success flash message
  const regSuccessMsg = sessionStorage.getItem('sw_reg_success');
  const regEmail = sessionStorage.getItem('sw_reg_email');
  if (regSuccessMsg) {
    // Immediately remove from sessionStorage so it NEVER shows again on page refresh or later visits
    sessionStorage.removeItem('sw_reg_success');
    sessionStorage.removeItem('sw_reg_email');

    // Select Company Admin tab by default
    selectCompanyAdminTab(false);

    // Pre-fill registered admin email
    if (regEmail && loginIdentityInput) {
      loginIdentityInput.value = regEmail;
    }

    // Display clear success message on the login card
    if (loginStatusBanner) {
      loginStatusBanner.className = 'login-status-banner info';
      loginStatusBanner.innerHTML = `✓ ${escapeHtml(regSuccessMsg)}`;
      loginStatusBanner.style.display = 'block';
    }

    if (loginPasswordInput) {
      loginPasswordInput.focus();
    }
  }

  // Tab Switching
  if (tabCompanyAdmin) {
    tabCompanyAdmin.addEventListener('click', () => {
      selectCompanyAdminTab(true);
      if (loginStatusBanner) loginStatusBanner.style.display = 'none';
      if (loginIdentityInput) loginIdentityInput.focus();
    });
  }

  if (tabEmployee) {
    tabEmployee.addEventListener('click', () => {
      currentPortalMode = 'EMPLOYEE';
      tabEmployee.classList.add('active');
      tabEmployee.setAttribute('aria-selected', 'true');
      tabCompanyAdmin.classList.remove('active');
      tabCompanyAdmin.setAttribute('aria-selected', 'false');

      loginHeading.textContent = 'Employee Sign In';
      loginSubheading.textContent = 'Sign in using credentials assigned by your company administrator';
      loginIdentityLabel.textContent = 'Employee ID';
      loginIdentityInput.placeholder = 'Enter your employee ID (e.g. EMP-101)';
      loginIdentityInput.value = '';
      loginPasswordInput.value = '';

      if (employeePortalHint) employeePortalHint.style.display = 'block';
      if (loginStatusBanner) loginStatusBanner.style.display = 'none';
      loginIdentityInput.focus();
    });
  }

  // Password Visibility Toggle
  if (btnTogglePassword && loginPasswordInput) {
    btnTogglePassword.addEventListener('click', () => {
      const isPassword = loginPasswordInput.type === 'password';
      loginPasswordInput.type = isPassword ? 'text' : 'password';

      btnTogglePassword.innerHTML = isPassword
        ? `<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
        : `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    });
  }

  // Forgot Password Link
  if (linkForgotPassword) {
    linkForgotPassword.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentPortalMode === 'ADMIN') {
        showToast('Company Admin Recovery: Password reset instructions sent to registered domain.', 'info');
      } else {
        showToast('Employee Recovery: Please contact your Company Administrator to reissue portal access.', 'warning');
      }
    });
  }

  // Login Form Submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identityVal = loginIdentityInput.value.trim();
      const passwordVal = loginPasswordInput.value.trim();

      if (!identityVal || !passwordVal) {
        loginStatusBanner.className = 'login-status-banner warning';
        loginStatusBanner.innerHTML = '⚠️ Please enter both your ' + (currentPortalMode === 'ADMIN' ? 'company email/admin ID' : 'employee ID') + ' and password.';
        loginStatusBanner.style.display = 'block';
        return;
      }

      const submitBtn = document.getElementById('btnSignInSubmit');
      const origContent = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Signing In...</span>';
      }

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identity: identityVal,
            password: passwordVal,
            portalMode: currentPortalMode
          })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          loginStatusBanner.className = 'login-status-banner error';
          loginStatusBanner.innerHTML = `⚠️ Sign in failed: ${escapeHtml(data.error || 'Invalid credentials.')}`;
          loginStatusBanner.style.display = 'block';
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origContent;
          }
          return;
        }

        if (data.csrfToken) {
          window.__swCsrfToken = data.csrfToken;
        }

        if (currentPortalMode === 'EMPLOYEE') {
          if (data.mustChangePassword) {
            loginStatusBanner.className = 'login-status-banner warning';
            loginStatusBanner.innerHTML = `
              <div><strong>Authentication Verified:</strong> Mandatory password change required on initial login.</div>
              <div style="margin-top: 6px; font-size: 12px; opacity: 0.85;">Transferring to credential setup portal...</div>
            `;
            loginStatusBanner.style.display = 'block';
            showToast('Authentication verified. Password change required.', 'warning');
          } else {
            loginStatusBanner.className = 'login-status-banner info';
            loginStatusBanner.innerHTML = `
              <div><strong>Authenticated:</strong> Welcome, <em>${escapeHtml(data.user ? data.user.fullName : 'Employee')}</em>.</div>
              <div style="margin-top: 6px; font-size: 12px; opacity: 0.85;">Opening personal employee dashboard...</div>
            `;
            loginStatusBanner.style.display = 'block';
            showToast('Sign in successful. Redirecting...', 'success');
          }

          setTimeout(() => {
            const redirectTarget = data.redirectTo || '/employee';
            window.location.href = redirectTarget;
          }, 500);

        } else {
          // Admin portal mode
          loginStatusBanner.className = 'login-status-banner info';
          loginStatusBanner.innerHTML = `
            <div><strong>Authenticated:</strong> Welcome, <em>${escapeHtml(data.user ? data.user.fullName : 'Administrator')}</em>.</div>
            <div style="margin-top: 6px; font-size: 12px; opacity: 0.85;">Launching company dashboard...</div>
          `;
          loginStatusBanner.style.display = 'block';
          showToast('Sign in successful. Redirecting...', 'success');

          setTimeout(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const redirectTarget = urlParams.get('redirect') || data.redirectTo || '/admin';
            window.location.href = redirectTarget;
          }, 500);
        }

      } catch (err) {
        loginStatusBanner.className = 'login-status-banner error';
        loginStatusBanner.innerHTML = `⚠️ Network error: ${escapeHtml(err.message || 'Server unreachable')}`;
        loginStatusBanner.style.display = 'block';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origContent;
        }
      }
    });
  }

  // Open Company Registration
  if (btnOpenCompanyRegistration) {
    btnOpenCompanyRegistration.addEventListener('click', () => showView('register'));
  }

  // Back to Login from Registration
  if (btnBackToLogin) {
    btnBackToLogin.addEventListener('click', () => showView('login'));
  }
  if (btnCancelRegistration) {
    btnCancelRegistration.addEventListener('click', () => showView('login'));
  }

  // Company Registration Form Submit
  if (companyRegistrationForm) {
    companyRegistrationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const companyName = (document.getElementById('regCompanyName').value || '').trim();
      const industry = (document.getElementById('regIndustry').value || '').trim();
      const email = (document.getElementById('regCompanyEmail').value || '').trim();
      const adminName = (document.getElementById('regAdminName').value || '').trim();
      const adminPw = document.getElementById('regAdminPassword').value;
      const adminPwConfirm = document.getElementById('regAdminPasswordConfirm').value;

      if (!companyName || !industry || !email || !adminName || !adminPw) {
        regStatusNotice.className = 'login-status-banner warning';
        regStatusNotice.innerHTML = '⚠️ Please fill out all required company registration fields.';
        regStatusNotice.style.display = 'block';
        return;
      }

      if (adminPw.length < 8) {
        regStatusNotice.className = 'login-status-banner warning';
        regStatusNotice.innerHTML = '⚠️ Master Admin password must be at least 8 characters long.';
        regStatusNotice.style.display = 'block';
        return;
      }

      if (adminPw !== adminPwConfirm) {
        regStatusNotice.className = 'login-status-banner error';
        regStatusNotice.innerHTML = '⚠️ Master Admin passwords do not match. Please re-enter passwords.';
        regStatusNotice.style.display = 'block';
        return;
      }

      const submitBtn = document.getElementById('btnSubmitCompanyReg');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering Organization...';
      }

      try {
        const res = await fetch('/api/auth/register-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName,
            industry,
            adminFullName: adminName,
            email,
            password: adminPw
          })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          regStatusNotice.className = 'login-status-banner error';
          regStatusNotice.innerHTML = `⚠️ Registration failed: ${escapeHtml(data.error || 'Unable to register company.')}`;
          regStatusNotice.style.display = 'block';
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register Company & Setup Admin';
          }
          return;
        }

        // Clear sensitive registration password fields
        const pwField = document.getElementById('regAdminPassword');
        const pwConfirmField = document.getElementById('regAdminPasswordConfirm');
        if (pwField) pwField.value = '';
        if (pwConfirmField) pwConfirmField.value = '';

        // Store one-time success message and email in sessionStorage
        sessionStorage.setItem('sw_reg_success', 'Company registered successfully! Please log in using your registered email and password.');
        sessionStorage.setItem('sw_reg_email', email);

        showToast('Company registered successfully! Please log in.', 'success');

        // Redirect to login portal (never /admin)
        setTimeout(() => {
          window.location.href = data.redirectTo || '/login';
        }, 400);

      } catch (err) {
        regStatusNotice.className = 'login-status-banner error';
        regStatusNotice.innerHTML = `⚠️ Network error: ${escapeHtml(err.message || 'Server unreachable')}`;
        regStatusNotice.style.display = 'block';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Register Company & Setup Admin';
        }
      }
    });
  }

})();

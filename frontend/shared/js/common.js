/**
 * frontend/shared/js/common.js
 * 
 * Shared Client Utilities, Sound Synthesizers, Theme Manager, and API Client
 * for SmartWorkforce Multi-Portal Architecture.
 */

(function (window) {
  'use strict';

  // -------------------------------------------------------------
  // 1. Web Audio API Industrial Sound Synthesizers
  // -------------------------------------------------------------
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playScannerBeep(isEntry = true) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isEntry ? 880 : 587.33, ctx.currentTime);
      if (isEntry) {
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
      } else {
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.14);
      }

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isEntry ? 0.15 : 0.18));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + (isEntry ? 0.16 : 0.20));
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  function playScannerWarning() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.setValueAtTime(390, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.10, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.24);
    } catch (e) {}
  }

  function playScannerBuzz() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.32);
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // 2. Toast Notification System
  // -------------------------------------------------------------
  function showToast(message, type = 'entry') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      entry: '🟢 [ENTRY]',
      exit: '🔵 [EXIT]',
      warning: '⚠️ [NOTICE]',
      error: '🔴 [REJECTED]',
      info: 'ℹ️ [SYSTEM]'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || '🔔'}</span>
      <span class="toast-msg">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4000);
  }

  // -------------------------------------------------------------
  // 3. String & Date Formatting Helpers
  // -------------------------------------------------------------
  function getInitials(name) {
    if (!name) return '??';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  function getFormattedCurrentTimestamp() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }

  function getFormattedTimeOnly() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${pad(hours)}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${ampm}`;
  }

  function getRandomHexByte() {
    return Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
  }

  function generateRandomCardUid() {
    return `${getRandomHexByte()}:${getRandomHexByte()}:${getRandomHexByte()}:${getRandomHexByte()}`;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // -------------------------------------------------------------
  // 4. Live Clock & Theme Manager
  // -------------------------------------------------------------
  function initLiveClock(clockElementId) {
    const clockEl = document.getElementById(clockElementId);
    if (!clockEl) return;

    function tick() {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      let hours = now.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const timeStr = `${pad(hours)}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${ampm}`;
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      clockEl.textContent = `${timeStr} • ${dateStr}`;
    }

    tick();
    setInterval(tick, 1000);
  }

  function initThemeToggle(buttonId) {
    const toggleBtn = document.getElementById(buttonId);
    const savedTheme = localStorage.getItem('sw_theme') || 'dark';

    function applyTheme(theme) {
      document.body.setAttribute('data-theme', theme);
      localStorage.setItem('sw_theme', theme);
      if (toggleBtn) {
        toggleBtn.textContent = theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
        toggleBtn.setAttribute('title', `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`);
      }
    }

    applyTheme(savedTheme);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const current = document.body.getAttribute('data-theme') || 'dark';
        applyTheme(current === 'light' ? 'dark' : 'light');
      });
    }
  }

  // -------------------------------------------------------------
  // 5. Unified REST API Client
  // -------------------------------------------------------------
  const SmartWorkforceAPI = {
    async request(method, endpoint, body = null) {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      const csrfToken = window.__swCsrfToken || (function() {
        const match = document.cookie.match(/(?:^|;\s*)sw_csrf=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
      })();
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase()) && csrfToken) {
        options.headers['X-CSRF-Token'] = csrfToken;
      }
      if (body) {
        options.body = JSON.stringify(body);
      }
      const res = await fetch(endpoint, options);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = new Error(data.error || `HTTP ${res.status}`);
        error.status = res.status;
        error.data = data;
        throw error;
      }
      return data;
    },

    async getEmployees() {
      return this.request('GET', '/api/employees');
    },

    async createEmployee(employeeData) {
      return this.request('POST', '/api/employees', employeeData);
    },

    async getAttendanceLogs() {
      return this.request('GET', '/api/attendance/logs');
    },

    async recordCardScan(scanData) {
      return this.request('POST', '/api/attendance/scan', scanData);
    },

    async clearAttendanceLogs() {
      return this.request('DELETE', '/api/attendance/logs');
    },

    async getAnalyticsOverview() {
      return this.request('GET', '/api/analytics/overview');
    },

    async getDepartmentAnalytics() {
      return this.request('GET', '/api/analytics/departments');
    },

    async getPunctualityAnalytics() {
      return this.request('GET', '/api/analytics/punctuality');
    },

    async getRiskAnalytics() {
      return this.request('GET', '/api/analytics/risks');
    },

    async getAnomaliesAnalytics() {
      return this.request('GET', '/api/analytics/anomalies');
    },

    async getSimulationReport() {
      return this.request('GET', '/api/simulation/report');
    },

    async resetSimulationReport() {
      return this.request('DELETE', '/api/simulation/report');
    },

    async getEmployeeMe() {
      return this.request('GET', '/api/employee/me');
    },

    async getEmployeeAttendance() {
      return this.request('GET', '/api/employee/attendance');
    },

    async employeeTapCard(data) {
      return this.request('POST', '/api/employee/tap', data);
    },

    async changeEmployeePassword(data) {
      return this.request('POST', '/api/employee/change-password', data);
    },

    async logout() {
      return this.request('POST', '/api/auth/logout');
    }
  };

  // Expose on global window object
  window.SmartWorkforceCommon = {
    playScannerBeep,
    playScannerWarning,
    playScannerBuzz,
    showToast,
    getInitials,
    getFormattedCurrentTimestamp,
    getFormattedTimeOnly,
    getRandomHexByte,
    generateRandomCardUid,
    escapeHtml,
    initLiveClock,
    initThemeToggle,
    api: SmartWorkforceAPI
  };

})(window);

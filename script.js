const APP_VERSION = 'v4.0.0';
const versionEl = document.querySelector('#appVersion');
if (versionEl) versionEl.textContent = `Version: ${APP_VERSION}`;
const refreshButton = document.querySelector('#refreshButton');
refreshButton?.addEventListener('click', () => window.location.reload());

/* ============================================
   ARMINDO FORMS - Cookie Consent (GDPR)
   ============================================ */

const CookieConsent = {
    consent: {
        essential: true,
        analytics: false,
        marketing: false
    },

    init: function () {
        const saved = localStorage.getItem('cookieConsent');
        if (saved) {
            try {
                this.consent = JSON.parse(saved);
                this.applyConsent();
            } catch (e) {
                console.warn('Invalid cookie consent data found, resetting...');
                localStorage.removeItem('cookieConsent');
                this.showBanner();
            }
        } else {
            this.showBanner();
        }
    },

    applyConsent: function () {
        // Essential cookies are always on (Auth, functionality)

        // Analytics
        if (this.consent.analytics) {
            console.log('🍪 Analytics Cookies Enabled');
            // Enable Firebase Analytics if initialized
            if (window.firebase && firebase.analytics) {
                firebase.analytics().setAnalyticsCollectionEnabled(true);
            }
            // Initialize other analytic scripts here
        } else {
            console.log('🍪 Analytics Cookies Disabled');
            if (window.firebase && firebase.analytics) {
                firebase.analytics().setAnalyticsCollectionEnabled(false);
            }
        }

        // Marketing
        if (this.consent.marketing) {
            console.log('🍪 Marketing Cookies Enabled');
            // Init marketing pixels
        }
    },

    showBanner: function () {
        if (document.getElementById('cookie-consent-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.className = 'cookie-banner'; // Ensure logic uses classes for cleaner DOM if css existed, but inline safe
        banner.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            max-width: 600px;
            background: var(--bg-card, #1E1E28);
            border: 1px solid var(--border-color, rgba(255,255,255,0.1));
            border-radius: var(--radius-lg, 12px);
            padding: 24px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 20px;
            animation: slideUp 0.5s ease;
            font-family: 'Inter', sans-serif;
        `;

        banner.innerHTML = `
            <div style="display: flex; gap: 20px; align-items: flex-start;">
                <div style="font-size: 32px; background: rgba(74, 95, 229, 0.1); padding: 10px; border-radius: 12px;">🍪</div>
                <div>
                    <h4 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: var(--text-primary, white);">A sua privacidade é importante</h4>
                    <p style="margin: 0; font-size: 14px; color: var(--text-secondary, #A0AEC0); line-height: 1.6;">
                        Utilizamos cookies para garantir que o nosso site funciona corretamente. Com o seu consentimento, também utilizamos cookies para analisar o tráfego e personalizar conteúdos. Pode alterar as suas preferências a qualquer momento.
                        <a href="privacy.html" style="color: var(--primary, #4A5FE5); text-decoration: none; font-weight: 500;">Ler Política de Cookies</a>.
                    </p>
                </div>
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;">
                <button id="cookie-customize" class="btn btn-ghost" style="font-size: 13px; padding: 8px 16px; border: 1px solid var(--border-color, #ffffff20); border-radius: 6px; color: var(--text-primary, white); background: transparent; cursor: pointer;">Personalizar</button>
                <button id="cookie-reject" class="btn" style="font-size: 13px; padding: 8px 16px; border-radius: 6px; background: #2D2D44; color: white; border: none; cursor: pointer;">Rejeitar Opcionais</button>
                <button id="cookie-accept" class="btn btn-primary" style="font-size: 13px; padding: 8px 16px; border-radius: 6px; background: var(--primary, #4A5FE5); color: white; border: none; font-weight: 500; cursor: pointer;">Aceitar Tudo</button>
            </div>
        `;

        document.body.appendChild(banner);

        document.getElementById('cookie-accept').addEventListener('click', () => this.savePreferences({ essential: true, analytics: true, marketing: true }));
        document.getElementById('cookie-reject').addEventListener('click', () => this.savePreferences({ essential: true, analytics: false, marketing: false }));
        document.getElementById('cookie-customize').addEventListener('click', () => this.showModal());
    },

    showModal: function () {
        this.hideBanner();

        let modal = document.getElementById('cookie-settings-modal');
        if (modal) return modal.style.display = 'flex';

        modal = document.createElement('div');
        modal.id = 'cookie-settings-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
        `;

        modal.innerHTML = `
            <div style="background: var(--bg-secondary, #1E1E28); width: 90%; max-width: 600px; border-radius: 16px; padding: 32px; color: white; border: 1px solid var(--border-color, #ffffff20);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h3 style="margin: 0; font-size: 20px;">Preferências de Cookies</h3>
                    <button id="close-cookie-modal" style="background:none; border:none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 20px; max-height: 60vh; overflow-y: auto;">
                    
                    <!-- Essential -->
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h5 style="margin: 0 0 5px 0;">Estritamente Necessários</h5>
                            <p style="margin: 0; font-size: 13px; color: #A0AEC0;">Essenciais para o funcionamento do site (login, segurança).</p>
                        </div>
                        <input type="checkbox" checked disabled style="width: 20px; height: 20px; accent-color: #4A5FE5;">
                    </div>

                    <!-- Analytics -->
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h5 style="margin: 0 0 5px 0;">Analíticos</h5>
                            <p style="margin: 0; font-size: 13px; color: #A0AEC0;">Ajudam-nos a entender como os visitantes interagem com o site.</p>
                        </div>
                        <input type="checkbox" id="pref-analytics" ${this.consent.analytics ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #4A5FE5;">
                    </div>

                    <!-- Marketing -->
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h5 style="margin: 0 0 5px 0;">Marketing</h5>
                            <p style="margin: 0; font-size: 13px; color: #A0AEC0;">Usados para exibir anúncios relevantes noutros sites.</p>
                        </div>
                        <input type="checkbox" id="pref-marketing" ${this.consent.marketing ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #4A5FE5;">
                    </div>
                </div>

                <div style="margin-top: 32px; display: flex; justify-content: flex-end; gap: 12px;">
                    <button id="save-preferences" style="background: var(--primary, #4A5FE5); color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 500; cursor: pointer;">Guardar Preferências</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('close-cookie-modal').addEventListener('click', () => modal.style.display = 'none');
        document.getElementById('save-preferences').addEventListener('click', () => {
            this.savePreferences({
                essential: true,
                analytics: document.getElementById('pref-analytics').checked,
                marketing: document.getElementById('pref-marketing').checked
            });
            modal.style.display = 'none';
        });
    },

    savePreferences: function (prefs) {
        this.consent = prefs;
        localStorage.setItem('cookieConsent', JSON.stringify(prefs));
        this.applyConsent();
        this.hideBanner();
        ArmindoForms.Utils.showToast('Preferências de cookies guardadas.', 'success');
    },

    hideBanner: function () {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) banner.remove();
    },

    reset: function () {
        localStorage.removeItem('cookieConsent');
        location.reload();
    }
};

// Global Exposure
window.ArmindoForms = window.ArmindoForms || {};
window.ArmindoForms.CookieConsent = CookieConsent;

// Auto-init
document.addEventListener('DOMContentLoaded', () => CookieConsent.init());

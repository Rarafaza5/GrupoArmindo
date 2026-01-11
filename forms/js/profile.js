/* ============================================
   ARMINDO FORMS - Profile Logic
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Ensure Firebase is initialized (idempotent call)
    if (!ArmindoForms.initFirebase()) {
        console.error('Failed to initialize Firebase in profile.js');
    }

    // Auth state listener specific to profile
    ArmindoForms.Auth.onAuthStateChanged((user) => {
        if (user) {
            populateProfileForm(user);
        } else {
            window.location.href = 'index.html';
        }
    });

    setupProfileEventListeners();
});

function populateProfileForm(user) {
    document.getElementById('displayName').value = user.displayName || '';
    document.getElementById('email').value = user.email || '';

    const avatarLarge = document.getElementById('profileAvatarLarge');
    if (user.photoURL) {
        avatarLarge.style.backgroundImage = `url(${user.photoURL})`;
        avatarLarge.style.backgroundSize = 'cover';
        avatarLarge.textContent = '';
    } else {
        avatarLarge.textContent = (user.displayName || user.email || '?')[0].toUpperCase();
        avatarLarge.style.backgroundImage = 'none';
    }
}

function setupProfileEventListeners() {
    // Profile Photo Upload
    const avatarOverlay = document.getElementById('avatarOverlay');
    const avatarInput = document.getElementById('avatarInput');

    if (avatarOverlay && avatarInput) {
        avatarOverlay.addEventListener('click', () => {
            avatarInput.click();
        });

        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate file
            if (!file.type.startsWith('image/')) {
                ArmindoForms.Utils.showToast('Por favor selecione uma imagem.', 'error');
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                ArmindoForms.Utils.showToast('A imagem deve ter menos de 5MB.', 'error');
                return;
            }

            try {
                // Show loading state
                const originalContent = avatarOverlay.innerHTML;
                avatarOverlay.innerHTML = '<span class="loader-spinner-sm"></span>';
                avatarOverlay.style.opacity = '1';
                avatarOverlay.style.pointerEvents = 'none';

                const currentUser = firebase.auth().currentUser;
                const storageRef = firebase.storage().ref();
                const fileRef = storageRef.child(`users/${currentUser.uid}/avatar.jpg`);

                // Upload file
                await fileRef.put(file);
                const photoURL = await fileRef.getDownloadURL();

                // Update profile
                await currentUser.updateProfile({ photoURL: photoURL });

                // Update UI
                const avatarLarge = document.getElementById('profileAvatarLarge');
                avatarLarge.style.backgroundImage = `url(${photoURL})`;
                avatarLarge.style.backgroundSize = 'cover';
                avatarLarge.textContent = '';

                // Update sidebar avatar if visible
                const sidebarAvatar = document.getElementById('userAvatar');
                if (sidebarAvatar) {
                    // Usually sidebar avatar is text content or bg image? dashboard.js handles it.
                    // We might need to refresh it here manually or let page reload handle it.
                    // Let's force a reload for full consistency or just update simple UI
                }

                ArmindoForms.Utils.showToast('Foto de perfil atualizada!', 'success');

            } catch (error) {
                console.error('Error uploading avatar:', error);
                ArmindoForms.Utils.showToast('Erro ao atualizar foto: ' + error.message, 'error');
            } finally {
                // Reset loading state
                avatarOverlay.innerHTML = originalContent; // Original SVG
                avatarOverlay.style.opacity = '';
                avatarOverlay.style.pointerEvents = '';
                avatarInput.value = ''; // Reset input
            }
        });
    }

    // Save Profile
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('saveProfileBtn');
        const originalText = btn.innerHTML;

        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="loader-spinner-sm"></span> A guardar...';

            const newName = document.getElementById('displayName').value;
            const currentUser = firebase.auth().currentUser;

            if (newName !== currentUser.displayName) {
                await currentUser.updateProfile({
                    displayName: newName
                });

                ArmindoForms.Utils.showToast('Perfil atualizado com sucesso!', 'success');
                // Update sidebar info
                document.getElementById('userName').textContent = newName;
                document.getElementById('userAvatar').textContent = newName[0].toUpperCase();
            } else {
                ArmindoForms.Utils.showToast('Nenhuma alteração detetada.', 'info');
            }

        } catch (error) {
            console.error('Error updating profile:', error);
            ArmindoForms.Utils.showToast('Erro ao atualizar perfil.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    // Export Data (GDPR)
    document.getElementById('exportDataBtn').addEventListener('click', async () => {
        const btn = document.getElementById('exportDataBtn');
        const originalText = btn.innerHTML;

        try {
            btn.disabled = true;
            btn.innerHTML = 'A gerar ficheiro...';

            const currentUser = firebase.auth().currentUser;
            if (!currentUser) return;

            // Fetch all user forms
            const forms = await ArmindoForms.Database.forms.getByUser(currentUser.uid);

            // For each form, fetch responses (this might be heavy for huge accounts, but ok for now)
            const fullData = {
                user: {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL,
                    createdAt: currentUser.metadata.creationTime,
                    lastLoginAt: currentUser.metadata.lastSignInTime
                },
                forms: [],
                exportDate: new Date().toISOString()
            };

            for (const form of forms) {
                const responses = await ArmindoForms.Database.responses.getByForm(form.id);
                fullData.forms.push({
                    ...form,
                    responses: responses
                });
            }

            initiateDownload(fullData, `armindo_forms_export_${currentUser.uid}.json`);
            ArmindoForms.Utils.showToast('Exportação concluída com sucesso.', 'success');

        } catch (error) {
            console.error('Error exporting data:', error);
            ArmindoForms.Utils.showToast('Erro ao exportar dados.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    // Delete Account Flow
    document.getElementById('deleteAccountBtn').addEventListener('click', () => {
        document.getElementById('deleteAccountModal').classList.add('active');
    });

    document.getElementById('deleteConfirmationInput').addEventListener('input', (e) => {
        const btn = document.getElementById('confirmDeleteAccountBtn');
        btn.disabled = e.target.value !== 'ELIMINAR';
    });

    document.getElementById('confirmDeleteAccountBtn').addEventListener('click', async () => {
        if (!confirm('Último aviso: Esta ação é permanente. Continuar?')) return;

        try {
            const currentUser = firebase.auth().currentUser;

            // 1. Delete user data from Firestore (forms and responses)
            // Ideally should be done via Cloud Functions for reliability, but client-side for MVP
            const forms = await ArmindoForms.Database.forms.getByUser(currentUser.uid);

            // Delete forms one by one (responses deletion logic is usually separate or cascaded)
            // For rigorous cleanup we would need to delete subcollections or associated responses
            for (const form of forms) {
                await ArmindoForms.Database.forms.delete(form.id);
            }

            // 2. Delete Auth User
            await currentUser.delete();

            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error deleting account:', error);
            if (error.code === 'auth/requires-recent-login') {
                ArmindoForms.Utils.showToast('Por segurança, faça login novamente antes de eliminar a conta.', 'error');
                setTimeout(() => {
                    firebase.auth().signOut().then(() => window.location.href = 'index.html');
                }, 2000);
            } else {
                ArmindoForms.Utils.showToast('Erro ao eliminar conta: ' + error.message, 'error');
            }
        }
    });

    window.closeDeleteAccountModal = function () {
        document.getElementById('deleteAccountModal').classList.remove('active');
        document.getElementById('deleteConfirmationInput').value = '';
    }
}

function initiateDownload(data, filename) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

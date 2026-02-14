/* ============================================
   ALink - Main Application JavaScript
   © 2026 Grupo Armindo
   ============================================ */

// ============================================
// CONFIG & STATE
// ============================================

const CONFIG = {
    postsPerLoad: 20,
    maxPostLength: 500,
    streakResetHours: 36, // Hours before streak resets
    xp: {
        post: 50,
        like: 10,
        comment: 20,
        quiz: 100,
        follow: 30,
        wordBattle: 80
    },
    adminUIDs: ['Xf1O6f8C5qS6S8S8S8S8S8S8S8S8S8S8'] // We will replace with user's actual UID on first load or use a helper
};

const OWNER_UID = 'rarafaza'; // Placeholder, will set dynamically or use provided
let isAdmin = false;

let currentUser = null;
let userProfile = null;
let alinkProfile = null;
let db = null;
let unsubscribeFeed = null;

// Feed State
let lastFeedDoc = null;
let isLoadingMore = false;
let currentView = 'feed';
let currentViewId = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', init);

let isInitialized = false;

async function init() {
    // Check for ArmindoAccount SDK
    if (typeof ArmindoAccount === 'undefined') {
        console.error('ArmindoAccount SDK not loaded');
        showToast('Erro ao carregar SDK', 'error');
        return;
    }

    ArmindoAccount.init();
    db = ArmindoAccount.getFirestore();

    // Listen for auth state changes
    ArmindoAccount.onAuthStateChanged(async (user, profile) => {
        if (user) {
            currentUser = user;
            userProfile = profile;
            isInitialized = true;
            // Event Listeners
            initEventListeners();
            await setupApp();
        } else if (isInitialized) {
            // Only redirect if we were already initialized (user logged out)
            window.location.replace('index.html');
        } else {
            // First load with no user - redirect after a delay to avoid race condition
            isInitialized = true;
            setTimeout(() => {
                if (!currentUser) {
                    window.location.replace('index.html');
                }
            }, 1500);
        }
    });

    // Setup navigation
    setupNavigation();
    setupModals();
    setupTheme();
}

function initEventListeners() {
    const postImageInput = document.getElementById('postImage');
    if (postImageInput) {
        postImageInput.addEventListener('change', handleImageSelect);
    }

    // Avatar Upload
    const avatarInput = document.getElementById('avatarUpload');
    if (avatarInput) {
        avatarInput.addEventListener('change', handleAvatarSelect);
    }

    const triggerAvatarUpload = () => avatarInput?.click();
    const triggerBannerUpload = () => document.getElementById('bannerUpload')?.click();

    window.triggerAvatarUpload = triggerAvatarUpload;
    window.triggerBannerUpload = triggerBannerUpload;

    document.getElementById('userAvatar')?.addEventListener('click', triggerAvatarUpload);
    document.getElementById('profileAvatar')?.addEventListener('click', triggerAvatarUpload);
    document.getElementById('editAvatarPreview')?.addEventListener('click', triggerAvatarUpload);

    // Banner Upload
    const bannerInput = document.getElementById('bannerUpload');
    if (bannerInput) {
        bannerInput.addEventListener('change', handleBannerSelect);
    }
}

async function handleBannerSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Por favor seleciona uma imagem válida.', 'error');
        return;
    }

    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target.result;
            // Compress banner (wider, 1200px)
            const compressedBase64 = await compressImage(base64, 1200, 600, 0.6);

            // Update local state
            if (alinkProfile) {
                alinkProfile.banner = compressedBase64;
                await ArmindoAccount.setProjectData('alink', alinkProfile);
            }

            // Update Firestore
            await db.collection('alink_users').doc(currentUser.uid).update({
                banner: compressedBase64
            });

            showToast('Capa atualizada!', 'success');
            updateUserUI();
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('Error updating banner:', error);
        showToast('Erro ao atualizar a capa.', 'error');
    }
}

async function handleAvatarSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Por favor seleciona uma imagem válida.', 'error');
        return;
    }

    if (file.size > 3 * 1024 * 1024) { // 3MB limit (it will be compressed)
        showToast('O avatar é muito grande (máx 3MB).', 'error');
        return;
    }

    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target.result;

            // Compress if it's too large or just for optimization
            const compressedBase64 = await compressImage(base64, 400, 400, 0.7);

            // Update local profile
            if (alinkProfile) {
                alinkProfile.avatar = compressedBase64;
                await ArmindoAccount.setProjectData('alink', alinkProfile);
            }

            // Sync with base userProfile
            if (userProfile) {
                if (!userProfile.profile) userProfile.profile = {};
                userProfile.profile.avatar = compressedBase64;
            }

            // Sync with edit profile modal input
            const editAvatarInput = document.getElementById('editAvatar');
            if (editAvatarInput) editAvatarInput.value = compressedBase64;

            // Update Firestore user doc
            await db.collection('alink_users').doc(currentUser.uid).update({
                avatar: compressedBase64
            });

            showToast('Avatar atualizado com sucesso!', 'success');
            updateUserUI();
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('Error updating avatar:', error);
        showToast('Erro ao atualizar o avatar.', 'error');
    }
}

let selectedImageBase64 = null;

async function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Por favor seleciona uma imagem válida.', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit (will be compressed)
        showToast('Imagem muito grande (máx 5MB).', 'error');
        return;
    }

    console.log('Image selected:', file.name, file.size);

    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target.result;

            // Compress image (max 1080px, 70% quality)
            selectedImageBase64 = await compressImage(base64, 1080, 1080, 0.7);

            const preview = document.getElementById('postPreview');
            const previewImg = document.getElementById('previewImage');
            if (preview && previewImg) {
                previewImg.src = selectedImageBase64;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('Error reading image:', error);
        showToast('Erro ao carregar a imagem.', 'error');
    }
}

function removeImage() {
    selectedImageBase64 = null;
    const preview = document.getElementById('postPreview');
    const previewImg = document.getElementById('previewImage');
    const input = document.getElementById('postImage');
    if (preview) preview.style.display = 'none';
    if (previewImg) previewImg.src = '';
    if (input) input.value = '';
}

async function setupApp() {
    // Load or create ALink profile
    await loadAlinkProfile();

    // Update streak
    await updateStreak();

    // Update UI with user data
    updateUserUI();

    // Show app, hide loading
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('app').style.display = 'grid';

    // Load initial feed
    loadFeed();

    // Load suggestions
    loadSuggestions();

    // Start Presence Heartbeat
    startHeartbeat();

    // Start Activity Ticker
    loadActivityTicker();
}

async function loadActivityTicker() {
    const containers = [
        document.getElementById('activityTicker'),
        document.getElementById('mobileActivityTicker')
    ].filter(c => c !== null);

    if (containers.length === 0) return;

    // Listen for recent posts globally to show activity
    db.collection('alink_posts')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .onSnapshot(snapshot => {
            containers.forEach(container => {
                container.innerHTML = '';
                const content = document.createElement('div');
                content.className = 'ticker-content';

                snapshot.forEach(doc => {
                    const post = doc.data();
                    const item = document.createElement('div');
                    item.className = 'ticker-item';
                    item.textContent = `⚡ @${post.authorUsername} publicou no feed: "${post.content.substring(0, 20)}..."`;
                    content.appendChild(item);
                });

                // Add some generic activities if sparse
                if (snapshot.size < 5) {
                    const generic = ['🔥 Várias pessoas entraram no ALink hoje!', '🏆 Consulta o Ranking Global para veres as lendas.', '💬 Grupos estão a fervilhar de atividade!'];
                    generic.forEach(txt => {
                        const item = document.createElement('div');
                        item.className = 'ticker-item';
                        item.textContent = `✨ ${txt}`;
                        content.appendChild(item);
                    });
                }

                container.appendChild(content);
            });
        });
}

function startHeartbeat() {
    // Update online status every 2 minutes
    const updateStatus = async () => {
        if (!currentUser) return;
        try {
            await db.collection('alink_users').doc(currentUser.uid).update({
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) { console.error('Heartbeat error:', e); }
    };

    updateStatus();
    setInterval(updateStatus, 120000); // 2 mins
}

// ============================================
// ALINK PROFILE
// ============================================

async function loadAlinkProfile() {
    try {
        // 1. Get local profile
        alinkProfile = await ArmindoAccount.getProjectData('alink');

        // 2. Get Firestore record (absolute source for social features)
        const userDoc = await db.collection('alink_users').doc(currentUser.uid).get();
        const firestoreData = userDoc.exists ? userDoc.data() : null;

        if (!alinkProfile) {
            // No local/project profile, initialize one
            const baseProfile = userProfile?.profile || {};
            alinkProfile = {
                username: firestoreData?.username || generateUsername(baseProfile.displayName || currentUser.email),
                bio: firestoreData?.bio || '',
                followersCount: firestoreData?.followersCount || 0,
                followingCount: firestoreData?.followingCount || 0,
                postsCount: firestoreData?.postsCount || 0,
                xp: firestoreData?.xp || 0,
                level: firestoreData?.level || 1,
                badges: firestoreData?.badges || [],
                streak: firestoreData?.streak || 0,
                lastStreakUpdate: firestoreData?.lastStreakUpdate || null,
                lastAccess: firestoreData?.lastAccess || null,
                avatar: firestoreData?.avatar || baseProfile.avatar || null,
                banner: firestoreData?.banner || null,
                createdAt: firestoreData?.createdAt || new Date().toISOString()
            };
        } else {
            // Merge existing local profile with firestore data (trust firestore for avatar/banner)
            if (firestoreData) {
                alinkProfile = {
                    ...alinkProfile,
                    ...firestoreData,
                    // Ensure we don't lose local-only temp state if any
                    avatar: firestoreData.avatar || alinkProfile.avatar,
                    banner: firestoreData.banner || alinkProfile.banner
                };
            }
        }

        // Save back to both to ensure sync
        await ArmindoAccount.setProjectData('alink', alinkProfile);

        // Strip undefined values — Firestore rejects them
        function stripUndefined(obj) {
            const clean = {};
            for (const [key, value] of Object.entries(obj)) {
                if (value !== undefined) clean[key] = value;
            }
            return clean;
        }

        // Update firestore with everything (merge ensures we don't overwrite server-only fields)
        await db.collection('alink_users').doc(currentUser.uid).set(stripUndefined({
            ...alinkProfile,
            displayName: userProfile?.profile?.displayName || currentUser.displayName || 'Utilizador',
            email: currentUser.email,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }), { merge: true });

    } catch (error) {
        console.error('Error loading ALink profile:', error);
        showToast('Erro ao carregar perfil', 'error');
    }
}

function generateUsername(name) {
    const base = name ? name.toLowerCase().replace(/[^a-z0-9]/g, '') : 'user';
    const random = Math.floor(Math.random() * 9999);
    return base + random;
}

// ============================================
// STREAK SYSTEM
// ============================================

async function updateStreak() {
    if (!alinkProfile) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const lastUpdateStr = alinkProfile.lastStreakUpdate || null;

    let currentStreak = alinkProfile.streak || 0;

    if (lastUpdateStr) {
        if (todayStr === lastUpdateStr) {
            // Already updated today
            console.log('Streak already updated today');
        } else {
            const lastDate = new Date(lastUpdateStr);
            const todayDate = new Date(todayStr);
            const diffTime = Math.abs(todayDate - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                currentStreak++;
                showToast(`🔥 Streak: ${currentStreak} dias!`, 'success');
            } else if (diffDays > 1) {
                if (currentStreak > 0) {
                    showToast('😢 Streak perdida! Começa de novo.', 'error');
                }
                currentStreak = 1;
            }
            alinkProfile.lastStreakUpdate = todayStr;
        }
    } else {
        currentStreak = 1;
        alinkProfile.lastStreakUpdate = todayStr;
    }

    // Update profile
    alinkProfile.streak = currentStreak;
    alinkProfile.lastAccess = now.toISOString();

    await ArmindoAccount.setProjectData('alink', alinkProfile);
    await db.collection('alink_users').doc(currentUser.uid).update({
        streak: currentStreak,
        lastStreakUpdate: alinkProfile.lastStreakUpdate,
        lastAccess: firebase.firestore.FieldValue.serverTimestamp()
    });

    updateStreakUI(currentStreak);
}

function updateStreakUI(streak) {
    const streakCount = document.getElementById('streakCount');
    if (streakCount) streakCount.textContent = streak;

    const userStreak = document.getElementById('userStreak');
    if (userStreak) userStreak.textContent = `🔥 ${streak} dias`;

    const profileStreak = document.getElementById('profileStreak');
    if (profileStreak) profileStreak.textContent = `🔥 ${streak}`;

    const streakBig = document.querySelector('.streak-number');
    if (streakBig) streakBig.textContent = streak;

    const mobileStreakEl = document.getElementById('mobileStreak');
    if (mobileStreakEl) {
        mobileStreakEl.innerHTML = `<span class="streak-number">${streak} dias</span>`;
    }
}

// ============================================
// THEME SYSTEM
// ============================================

function setupTheme() {
    const savedTheme = localStorage.getItem('alink_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('alink_theme', newTheme);
}

// ============================================
// GAMIFICATION SYSTEM
// ============================================

async function addXP(amount) {
    if (!alinkProfile) return;

    // Streak Multiplier Logic
    const multiplier = getStreakMultiplier();
    const finalAmount = Math.round(amount * multiplier);

    const oldXP = alinkProfile.xp || 0;
    const newXP = oldXP + finalAmount;
    alinkProfile.xp = newXP;

    const oldLevel = calculateLevel(oldXP);
    const newLevel = calculateLevel(newXP);
    alinkProfile.level = newLevel;

    try {
        await ArmindoAccount.setProjectData('alink', alinkProfile);
        await db.collection('alink_users').doc(currentUser.uid).update({
            xp: newXP,
            level: newLevel,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (newLevel > oldLevel) {
            showToast(`🎉 Nível UP! Agora estás no nível ${newLevel}!`, 'success');
            checkBadges();
        }

        if (multiplier > 1) {
            console.log(`XP Boost: ${multiplier}x due to ${alinkProfile.streak} day streak!`);
        }
    } catch (error) {
        console.error('Error adding XP:', error);
    }

    updateUserUI();
}

function getStreakMultiplier() {
    const streak = alinkProfile?.streak || 0;
    if (streak >= 30) return 1.5;
    if (streak >= 14) return 1.3;
    if (streak >= 7) return 1.2;
    if (streak >= 3) return 1.1;
    return 1.0;
}

function calculateLevel(xp) {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function getXPToNextLevel(level) {
    return Math.pow(level, 2) * 100;
}

async function checkBadges() {
    const badges = alinkProfile.badges || [];
    const newBadges = [];

    if (!badges.includes('post_master') && alinkProfile.postsCount >= 10) {
        newBadges.push('post_master');
        showToast('🏅 Medalha Desbloqueada: Post Master!', 'success');
    }

    if (!badges.includes('veteran') && alinkProfile.level >= 5) {
        newBadges.push('veteran');
        showToast('🏅 Medalha Desbloqueada: Veterano!', 'success');
    }

    if (newBadges.length > 0) {
        alinkProfile.badges = [...badges, ...newBadges];
        await ArmindoAccount.setProjectData('alink', alinkProfile);
        await db.collection('alink_users').doc(currentUser.uid).update({
            badges: alinkProfile.badges
        });
    }
}

// ============================================
// UI UPDATES
// ============================================

function updateUserUI() {
    const displayName = userProfile?.profile?.displayName || currentUser.displayName || 'Utilizador';
    const username = alinkProfile?.username || 'user';
    const level = alinkProfile?.level || calculateLevel(alinkProfile?.xp || 0);
    const xp = alinkProfile?.xp || 0;
    const nextLevelXP = getXPToNextLevel(level);

    const avatar = alinkProfile?.avatar || userProfile?.profile?.avatar || currentUser.photoURL || '';
    const banner = alinkProfile?.banner || '';

    // User avatars in various places
    const avatarElements = [
        'userAvatar', 'newPostAvatar', 'createPostAvatar', 'commentUserAvatar', 'profileAvatar', 'editAvatarPreview'
    ];

    avatarElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.backgroundImage = avatar ? `url(${avatar})` : '';
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';

            // Add Online Dot to my avatars
            if (id === 'userAvatar' || id === 'profileAvatar') {
                if (!el.querySelector('.online-dot')) {
                    const dot = document.createElement('div');
                    dot.className = 'online-dot';
                    el.appendChild(dot);
                }
            }
        }
    });

    // Banners
    const bannerElements = ['profileBanner'];
    bannerElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.backgroundImage = banner ? `url(${banner})` : '';
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
        }
    });

    // User card
    const nameEl = document.getElementById('userName');
    if (nameEl) nameEl.textContent = displayName;

    const streakEl = document.getElementById('userStreak');
    if (streakEl) streakEl.textContent = `🔥 ${alinkProfile?.streak || 0} dias • Nível ${level}`;

    // Update level badge in sidebar if exists
    const levelBadge = document.getElementById('userLevelBadge');
    if (levelBadge) levelBadge.textContent = `Lvl ${level}`;

    // New post modal
    const postName = document.getElementById('newPostName');
    if (postName) postName.textContent = displayName;

    // Profile view (if it's my profile and active)
    const profileView = document.getElementById('profileView');
    if (profileView && profileView.classList.contains('active') && (!alinkProfile.currentViewUserId || alinkProfile.currentViewUserId === currentUser.uid)) {
        const pName = document.getElementById('profileName');
        if (pName) pName.textContent = displayName;

        const pUser = document.getElementById('profileUsername');
        if (pUser) pUser.textContent = '@' + username;

        const pBio = document.getElementById('profileBio');
        if (pBio) pBio.textContent = alinkProfile?.bio || 'Sem bio ainda...';

        const pPosts = document.getElementById('profilePostsCount');
        if (pPosts) pPosts.textContent = alinkProfile?.postsCount || 0;

        const pFollowers = document.getElementById('profileFollowers');
        if (pFollowers) pFollowers.textContent = alinkProfile?.followersCount || 0;

        const pFollowing = document.getElementById('profileFollowing');
        if (pFollowing) pFollowing.textContent = alinkProfile?.followingCount || 0;

        const pStreak = document.getElementById('profileStreak');
        if (pStreak) pStreak.textContent = `🔥 ${alinkProfile?.streak || 0}`;
    }

    // Streak UI
    updateStreakUI(alinkProfile?.streak || 0);

    // XP Bar (if added)
    const xpProgress = document.getElementById('xpProgress');
    if (xpProgress) {
        const percent = (xp / nextLevelXP) * 100;
        xpProgress.style.width = percent + '%';
    }

    // Admin Access Check
    isAdmin = CONFIG.adminUIDs.includes(currentUser.uid) || currentUser.uid === 'TNo6vX0l6NfW8bM8bM8bM8bM8bM8bM'; // Adding current session UID for immediate access
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin ? 'flex' : 'none';
    });
}

// ============================================
// NAVIGATION
// ============================================

function setupNavigation() {
    // Sidebar nav
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(item.dataset.view);
        });
    });

    // Bottom nav
    document.querySelectorAll('.bottom-nav-item[data-view]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(item.dataset.view);
        });
    });
}

function switchView(viewName, params = null) {
    // Update active states
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll(`[data-view="${viewName}"]`).forEach(n => n.classList.add('active'));

    // Switch view
    // Transition effect
    document.querySelector('main').style.opacity = '0';
    document.querySelector('main').style.transform = 'translateY(10px)';

    currentView = viewName;
    currentViewId = params;

    setTimeout(() => {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const targetView = document.getElementById(viewName + 'View');
        if (targetView) targetView.classList.add('active');

        document.querySelector('main').style.opacity = '1';
        document.querySelector('main').style.transform = 'translateY(0)';
    }, 150);

    // Load view-specific content
    if (viewName === 'profile') {
        const userId = params || currentUser.uid;
        loadProfileHeader(userId);
        loadUserPosts(userId);
        setupProfileTabs(userId);
    }
    if (viewName === 'explore') loadTrending();
    if (viewName === 'messages') loadConversations();
    if (viewName === 'notifications') loadNotifications();
    if (viewName === 'groups') loadGroups();
    if (viewName === 'admin') loadAdminDashboard();
    if (viewName === 'groupDetail') loadGroupDetail(params);
}

async function loadProfileHeader(userId) {
    const isMe = userId === currentUser.uid;

    try {
        const userDoc = await db.collection('alink_users').doc(userId).get();
        if (!userDoc.exists) return;

        const user = userDoc.data();

        const pName = document.getElementById('profileName');
        if (pName) {
            pName.innerHTML = `
                ${escapeHtml(user.displayName)}
                ${user.isVerified ? `
                <span class="verified-badge" title="Verificado">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                </span>` : ''}
            `;
        }

        const pUser = document.getElementById('profileUsername');
        if (pUser) pUser.textContent = '@' + (user.username || 'user');

        const pBio = document.getElementById('profileBio');
        if (pBio) pBio.textContent = user.bio || (isMe ? 'Escreve algo sobre ti...' : 'Este utilizador ainda não tem bio.');

        const pPosts = document.getElementById('profilePostsCount');
        if (pPosts) pPosts.textContent = user.postsCount || 0;

        const pFollowers = document.getElementById('profileFollowers');
        if (pFollowers) pFollowers.textContent = user.followersCount || 0;

        const pLevel = document.getElementById('profileLevel');
        if (pLevel) pLevel.textContent = user.level || 1;

        const pStreak = document.getElementById('profileStreak');
        if (pStreak) pStreak.textContent = `🔥 ${user.streak || 0}`;

        const pFollowing = document.getElementById('profileFollowing');
        if (pFollowing) pFollowing.textContent = user.followingCount || 0;

        const avatar = user.avatar;
        const banner = user.banner;

        const profileAvatar = document.getElementById('profileAvatar');
        if (profileAvatar) {
            profileAvatar.style.backgroundImage = avatar ? `url(${avatar})` : '';
            profileAvatar.style.backgroundSize = 'cover';
        }

        const profileBanner = document.getElementById('profileBanner');
        if (profileBanner) {
            profileBanner.style.backgroundImage = banner ? `url(${banner})` : '';
            profileBanner.style.backgroundSize = 'cover';
        }

        // Show/Hide Edit vs Follow button
        const followBtn = document.getElementById('profileFollowBtn');
        const editBtn = document.getElementById('profileEditBtn');
        const messageBtn = document.getElementById('profileMessageBtn');

        // Hide/show edit overlays
        const bannerOverlay = document.querySelector('.banner-edit-overlay');
        const avatarOverlay = document.querySelector('.avatar-edit-overlay');

        // Hide settings tab by default
        const settingsTab = document.getElementById('profileSettingsTab');
        if (settingsTab) settingsTab.style.display = 'none';

        if (isMe) {
            if (editBtn) editBtn.style.display = 'block';
            if (followBtn) followBtn.style.display = 'none';
            if (messageBtn) messageBtn.style.display = 'none';
            if (bannerOverlay) bannerOverlay.style.display = '';
            if (avatarOverlay) avatarOverlay.style.display = '';
            // Show settings tab only on personal profile
            if (settingsTab) settingsTab.style.display = 'block';
        } else {
            if (editBtn) editBtn.style.display = 'none';
            if (messageBtn) { messageBtn.style.display = 'block'; messageBtn.onclick = () => openChat(userId); }
            if (bannerOverlay) bannerOverlay.style.display = 'none';
            if (avatarOverlay) avatarOverlay.style.display = 'none';
            if (followBtn) {
                followBtn.style.display = 'block';
                // Check if already following
                const followId = `${currentUser.uid}_${userId}`;
                const followDoc = await db.collection('alink_follows').doc(followId).get();
                if (followDoc.exists) {
                    followBtn.textContent = 'A seguir';
                    followBtn.className = 'btn-secondary';
                    followBtn.onclick = () => toggleFollow(userId);
                } else {
                    followBtn.textContent = 'Seguir';
                    followBtn.className = 'btn-primary';
                    followBtn.onclick = () => toggleFollow(userId);
                }
            }
        }

    } catch (error) {
        console.error('Error loading profile header:', error);
    }
}

// ============================================
// FEED
// ============================================

async function loadFeed(isMore = false) {
    const feed = document.getElementById('postsFeed');
    if (!feed) return;

    if (!isMore) {
        if (unsubscribeFeed) unsubscribeFeed();
        showSkeletons(feed, 3);
        lastFeedDoc = null;
    }

    try {
        let query = db.collection('alink_posts')
            .orderBy('createdAt', 'desc')
            .limit(CONFIG.postsPerLoad);

        if (isMore && lastFeedDoc) {
            query = query.startAfter(lastFeedDoc);
        }

        const snapshot = await query.get();

        if (!isMore) feed.innerHTML = '';

        if (snapshot.empty && !isMore) {
            feed.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 60px 40px;">
                    <div style="font-size: 4rem; margin-bottom: 20px;">📭</div>
                    <h3 style="font-size: 1.5rem; margin-bottom: 10px;">Nada para ver aqui</h3>
                    <p style="color: var(--text-secondary);">Sê o primeiro a publicar algo!</p>
                </div>
            `;
            return;
        }

        snapshot.forEach(doc => {
            const post = { id: doc.id, ...doc.data() };
            feed.appendChild(createPostElement(post));
        });

        lastFeedDoc = snapshot.docs[snapshot.docs.length - 1];

        // Add/update Load More button
        let loadMoreBtn = document.getElementById('loadMoreBtn');
        if (snapshot.docs.length < CONFIG.postsPerLoad) {
            if (loadMoreBtn) loadMoreBtn.remove();
        } else {
            if (!loadMoreBtn) {
                loadMoreBtn = document.createElement('button');
                loadMoreBtn.id = 'loadMoreBtn';
                loadMoreBtn.className = 'btn-secondary shadow-premium';
                loadMoreBtn.style.cssText = 'width: 100%; margin: var(--spacing-6) 0; padding: var(--spacing-4); font-weight: 600; display: block;';
                loadMoreBtn.textContent = 'Carregar mais posts';
                loadMoreBtn.onclick = () => loadFeed(true);
            }
            feed.appendChild(loadMoreBtn);
        }

    } catch (error) {
        console.error('Error in loadFeed:', error);
        if (!isMore) feed.innerHTML = '<p class="text-error" style="text-align:center; padding: 20px;">Erro ao carregar o feed.</p>';
    }
}

function createPostElement(post) {
    const div = document.createElement('div');
    div.className = 'post-card';
    div.dataset.postId = post.id;

    const isMe = post.authorId === currentUser.uid;
    const authorAvatar = isMe ? (alinkProfile?.avatar || post.authorAvatar) : post.authorAvatar;
    const isLiked = post.likedBy?.includes(currentUser.uid);
    const timeAgo = getTimeAgo(post.createdAt?.toDate?.() || new Date(post.createdAt));

    div.innerHTML = `
        <div class="post-header">
            <div class="post-avatar" style="${authorAvatar ? `background-image: url(${authorAvatar});` : ''}" onclick="switchView('profile', '${post.authorId}')"></div>
            <div class="post-user-info" style="cursor: pointer;" onclick="switchView('profile', '${post.authorId}')">
                <span class="post-user-name">
                    ${escapeHtml(post.authorName || 'Utilizador')}
                    ${post.authorVerified ? `
                    <span class="verified-badge" title="Verificado">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                    </span>` : ''}
                </span>
                <div class="post-meta">
                    <span class="post-username">@${escapeHtml(post.authorUsername || 'user')}</span>
                    <span>•</span>
                    <span class="post-time">${timeAgo}</span>
                </div>
            </div>
            ${post.authorId === currentUser.uid ? `
            <button class="btn-icon post-delete" onclick="deletePost('${post.id}')" title="Apagar post">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
            </button>
            ` : ''}
        </div>
        <div class="post-content">
            <p class="post-text">${escapeHtml(post.content)}</p>
            ${(post.image || post.imageUrl) ? `<img src="${post.image || post.imageUrl}" alt="Post image" class="post-image">` : ''}
        </div>
        <div class="post-actions">
            <button class="post-action ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
                <span>${post.likesCount || 0}</span>
            </button>
            <button class="post-action" onclick="openComments('${post.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                <span>${post.commentsCount || 0}</span>
            </button>
            <button class="post-action" onclick="sharePost('${post.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
                </svg>
            </button>
        </div>
    `;

    return div;
}

// ============================================
// POST CREATION
// ============================================

function setupModals() {
    // No longer needed here, event listener moved to initEventListeners
}

function openNewPost() {
    document.getElementById('newPostModal').classList.add('active');
    document.getElementById('postContent').focus();
}

function closeNewPost() {
    document.getElementById('newPostModal').classList.remove('active');
    document.getElementById('postContent').value = '';
    removeImage();
}


async function publishPost() {
    const content = document.getElementById('postContent').value.trim();

    if (!content && !selectedImageBase64) {
        showToast('Escreve algo ou adiciona uma imagem!', 'error');
        return;
    }

    if (content.length > CONFIG.maxPostLength) {
        showToast(`Máximo ${CONFIG.maxPostLength} caracteres`, 'error');
        return;
    }

    const publishBtn = document.querySelector('button[onclick="publishPost()"]');
    if (publishBtn) {
        publishBtn.disabled = true;
        publishBtn.textContent = 'A publicar...';
    }

    try {
        const displayName = userProfile?.profile?.displayName || currentUser.displayName || 'Utilizador';

        const post = {
            authorId: currentUser.uid,
            authorName: displayName,
            authorUsername: alinkProfile?.username || 'user',
            authorAvatar: alinkProfile?.avatar || userProfile?.profile?.avatar || currentUser.photoURL || null,
            content: content,
            image: selectedImageBase64,
            likesCount: 0,
            commentsCount: 0,
            likedBy: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            groupId: currentView === 'groupDetail' ? currentViewId : null
        };

        console.log('Publishing post...', post);
        await db.collection('alink_posts').add(post);

        // Award XP
        addXP(CONFIG.xp.post);

        // Update post count
        alinkProfile.postsCount = (alinkProfile.postsCount || 0) + 1;
        await ArmindoAccount.setProjectData('alink', alinkProfile);

        // Reset and close
        closeNewPost();
        removeImage();
        showToast('Publicado com sucesso!', 'success');
        loadFeed();
        updateUserUI();
    } catch (error) {
        console.error('Error publishing post:', error);
        showToast('Erro ao publicar. Verifica o tamanho da imagem.', 'error');
    } finally {
        if (publishBtn) {
            publishBtn.disabled = false;
            publishBtn.textContent = 'Publicar';
        }
    }
}

// ============================================
// POST INTERACTIONS
// ============================================

async function deletePost(postId) {
    // Delegated to window.deletePost at bottom of file (handles admin + regular flow)
    return window.deletePost(postId);
}

async function toggleLike(postId) {
    try {
        const postRef = db.collection('alink_posts').doc(postId);
        const postDoc = await postRef.get();

        if (!postDoc.exists) return;

        const post = postDoc.data();
        const likedBy = post.likedBy || [];
        const isLiked = likedBy.includes(currentUser.uid);

        if (!isLiked) {
            // Like
            await postRef.update({
                likedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
                likesCount: firebase.firestore.FieldValue.increment(1)
            });

            // Award XP
            addXP(CONFIG.xp.like);

            // Notify author
            if (post.authorId) {
                const displayName = userProfile?.profile?.displayName || 'Alguém';
                sendNotification(post.authorId, 'like', `${displayName} gostou do teu post.`, { postId: postId });
            }
        }

        // Update UI
        const postCard = document.querySelector(`[data-post-id="${postId}"]`);
        if (postCard) {
            const likeBtn = postCard.querySelector('.post-action');
            const likeCount = likeBtn.querySelector('span');
            const currentCount = parseInt(likeCount.textContent) || 0;

            if (isLiked) {
                likeBtn.classList.remove('liked');
                likeBtn.querySelector('svg').setAttribute('fill', 'none');
                likeCount.textContent = currentCount - 1;
            } else {
                likeBtn.classList.add('liked');
                likeBtn.querySelector('svg').setAttribute('fill', 'currentColor');
                likeCount.textContent = currentCount + 1;
            }
        }

    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

// ============================================
// COMMENTS
// ============================================

let currentPostId = null;

function openComments(postId) {
    currentPostId = postId;
    document.getElementById('commentsModal').classList.add('active');

    // Set current user avatar in input
    const userAvatar = userProfile?.profile?.avatar;
    document.getElementById('commentUserAvatar').style.backgroundImage = userAvatar ? `url(${userAvatar})` : '';
    document.getElementById('commentUserAvatar').style.backgroundSize = 'cover';

    loadComments(postId);
}

function closeComments() {
    document.getElementById('commentsModal').classList.remove('active');
    currentPostId = null;
    document.getElementById('commentsList').innerHTML = '';
}

async function loadComments(postId) {
    const container = document.getElementById('commentsList');
    showSkeletons(container, 3, 'comment');

    try {
        const snapshot = await db.collection('alink_posts').doc(postId).collection('comments')
            .orderBy('createdAt', 'asc')
            .get();

        container.innerHTML = '';

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state" style="padding: var(--spacing-8) 0;">
                    <div class="empty-icon" style="font-size: 3rem;">💬</div>
                    <h3 style="font-size: var(--text-lg);">Sem comentários</h3>
                    <p style="font-size: var(--text-sm);">Sê o primeiro a comentar!</p>
                </div>
            `;
            return;
        }

        snapshot.docs.forEach(doc => {
            const comment = doc.data();
            const timeAgo = getTimeAgo(comment.createdAt?.toDate?.() || new Date(comment.createdAt));

            container.innerHTML += `
                <div class="comment-item">
                    <div class="comment-avatar" style="${comment.authorAvatar ? `background-image: url(${comment.authorAvatar}); background-size: cover;` : ''}; cursor: pointer;" onclick="switchView('profile', '${comment.authorId}')"></div>
                    <div class="comment-body">
                        <div class="comment-header" style="cursor: pointer;" onclick="switchView('profile', '${comment.authorId}')">
                            <span class="comment-author">
                                ${escapeHtml(comment.authorName)}
                                ${comment.authorVerified ? `
                                <span class="verified-badge" title="Verificado" style="width: 12px; height: 12px;">
                                    <svg viewBox="0 0 24 24" fill="currentColor" style="width: 8px; height: 8px;">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                                    </svg>
                                </span>` : ''}
                            </span>
                            <span class="comment-time">${timeAgo}</span>
                        </div>
                        <p class="comment-text">${escapeHtml(comment.content)}</p>
                    </div>
                </div>
            `;
        });

        // Scroll to bottom
        const content = document.querySelector('.comments-content');
        content.scrollTop = content.scrollHeight;

    } catch (error) {
        console.error('Error loading comments:', error);
        container.innerHTML = '<div class="error-state">Erro ao carregar comentários</div>';
    }
}

async function postComment() {
    if (!currentPostId) return;

    const input = document.getElementById('commentInput');
    const content = input.value.trim();

    if (!content) return;

    try {
        const displayName = userProfile?.profile?.displayName || currentUser.displayName || 'Utilizador';

        await db.collection('alink_posts').doc(currentPostId).collection('comments').add({
            authorId: currentUser.uid,
            authorName: displayName,
            authorAvatar: userProfile?.profile?.avatar || null,
            content: content,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Award XP
        addXP(CONFIG.xp.comment);

        // Update comment count
        await db.collection('alink_posts').doc(currentPostId).update({
            commentsCount: firebase.firestore.FieldValue.increment(1)
        });

        // Notify post author (fetch post to get authorId)
        db.collection('alink_posts').doc(currentPostId).get().then(doc => {
            if (doc.exists) {
                const post = doc.data();
                if (post.authorId && post.authorId !== currentUser.uid) {
                    const displayName = userProfile?.profile?.displayName || 'Alguém';
                    sendNotification(post.authorId, 'comment', `${displayName} comentou o teu post.`, { postId: currentPostId });
                }
            }
        });

        input.value = '';
        loadComments(currentPostId);

        // Update UI count if visible
        const postCard = document.querySelector(`[data-post-id="${currentPostId}"]`);
        if (postCard) {
            const commentBtn = postCard.querySelectorAll('.post-action')[1]; // Assuming it's the 2nd button
            const countSpan = commentBtn.querySelector('span');
            countSpan.textContent = parseInt(countSpan.textContent || 0) + 1;
        }

    } catch (error) {
        console.error('Error posting comment:', error);
        showToast('Erro ao comentar', 'error');
    }
}

function sharePost(postId) {
    // Copy link
    const url = window.location.origin + '/alink/post.html?id=' + postId;
    navigator.clipboard?.writeText(url);
    showToast('Link copiado!', 'success');
}

// ============================================
// SUGGESTIONS
// ============================================

async function loadSuggestions() {
    try {
        // Simple query - get recent users (can't combine __name__ filter with other orderBy)
        const snapshot = await db.collection('alink_users')
            .orderBy('updatedAt', 'desc')
            .limit(10)
            .get();

        const container = document.getElementById('whoToFollow');
        if (!container) return;

        container.innerHTML = '';

        // Filter out current user and limit to 5
        const filteredDocs = snapshot.docs
            .filter(doc => doc.id !== currentUser.uid)
            .slice(0, 5);

        filteredDocs.forEach(doc => {
            const user = doc.data();
            container.innerHTML += `
                <div class="follow-item" style="cursor: pointer;" onclick="switchView('profile', '${doc.id}')">
                    <div class="follow-avatar" style="${user.avatar ? `background-image: url(${user.avatar}); background-size: cover;` : ''}"></div>
                    <div class="follow-info">
                        <span class="follow-name">
                            ${escapeHtml(user.displayName || 'Utilizador')}
                            ${user.isVerified ? `
                                <span class="verified-badge" style="width: 12px; height: 12px;">
                                    <svg viewBox="0 0 24 24" fill="currentColor" style="width: 8px; height: 8px;">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                                    </svg>
                                </span>` : ''}
                        </span>
                        <span class="follow-username">@${escapeHtml(user.username || 'user')}</span>
                    </div>
                    <button class="btn-follow" onclick="event.stopPropagation(); followUser('${doc.id}')">Seguir</button>
                </div>
            `;
        });

        if (filteredDocs.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Sem sugestões</p>';
        }

    } catch (error) {
        console.error('Error loading suggestions:', error);
    }
}

async function toggleFollow(userId) {
    try {
        const followId = `${currentUser.uid}_${userId}`;
        const followDoc = await db.collection('alink_follows').doc(followId).get();

        if (followDoc.exists) {
            // Unfollow
            await db.collection('alink_follows').doc(followId).delete();
            await db.collection('alink_users').doc(currentUser.uid).update({
                followingCount: firebase.firestore.FieldValue.increment(-1)
            });
            await db.collection('alink_users').doc(userId).update({
                followersCount: firebase.firestore.FieldValue.increment(-1)
            });
            if (alinkProfile) {
                alinkProfile.followingCount = Math.max(0, (alinkProfile.followingCount || 1) - 1);
            }
            showToast('Deixaste de seguir', 'info');
        } else {
            // Follow
            await followUser(userId);
            return;
        }

        // Refresh profile if viewing
        const profileView = document.getElementById('profileView');
        if (profileView && profileView.classList.contains('active')) {
            loadProfileHeader(userId);
        }
        loadSuggestions();
        updateUserUI();
    } catch (error) {
        console.error('Error toggling follow:', error);
        showToast('Erro', 'error');
    }
}

async function followUser(userId) {
    try {
        const followId = `${currentUser.uid}_${userId}`;

        await db.collection('alink_follows').doc(followId).set({
            followerId: currentUser.uid,
            followingId: userId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update counts
        await db.collection('alink_users').doc(currentUser.uid).update({
            followingCount: firebase.firestore.FieldValue.increment(1)
        });

        await db.collection('alink_users').doc(userId).update({
            followersCount: firebase.firestore.FieldValue.increment(1)
        });

        if (alinkProfile) {
            alinkProfile.followingCount = (alinkProfile.followingCount || 0) + 1;
        }

        // Award XP
        addXP(CONFIG.xp.follow);

        // Notify user
        const displayName = userProfile?.profile?.displayName || 'Alguém';
        sendNotification(userId, 'follow', `${displayName} começou a seguir-te.`, {});

        showToast('A seguir!', 'success');

        // Refresh profile if viewing
        const profileView = document.getElementById('profileView');
        if (profileView && profileView.classList.contains('active')) {
            loadProfileHeader(userId);
        }
        loadSuggestions();
        updateUserUI();

    } catch (error) {
        console.error('Error following user:', error);
        showToast('Erro ao seguir', 'error');
    }
}

// ============================================
// OTHER VIEWS (Placeholder)
// ============================================

async function loadUserPosts(userId = currentUser.uid) {
    const container = document.getElementById('userPostsGrid'); // Let's use a specific ID for the feed
    if (!container) return;
    showSkeletons(container, 3);

    try {
        const snapshot = await db.collection('alink_posts')
            .where('authorId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        container.innerHTML = '';

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <h3>Sem posts</h3>
                    <p>${userId === currentUser.uid ? 'Publica o teu primeiro post!' : 'Este utilizador ainda não publicou nada.'}</p>
                </div>
            `;
            return;
        }

        snapshot.docs.forEach(doc => {
            const post = { id: doc.id, ...doc.data() };
            container.appendChild(createPostElement(post));
        });

    } catch (error) {
        console.error('Error loading user posts:', error);
        container.innerHTML = '<div class="error-state">Erro ao carregar posts</div>';
    }
}

async function loadTrending() {
    const container = document.getElementById('trendingPosts');
    const sidebarContainer = document.getElementById('trending');

    if (container) showSkeletons(container, 3);
    if (sidebarContainer) showSkeletons(sidebarContainer, 3, 'trending');

    try {
        // Weighted trending logic: likes / (hours_passed + 2)^1.5
        // Since we can't do complex math in Firestore query, we'll fetch recent highly-liked posts and sort client-side
        const snapshot = await db.collection('alink_posts')
            .where('likesCount', '>=', 1)
            .orderBy('likesCount', 'desc')
            .limit(20)
            .get();

        const now = new Date();
        const trendingPosts = snapshot.docs.map(doc => {
            const post = doc.data();
            const createdAt = post.createdAt?.toDate?.() || new Date();
            const hoursPassed = (now - createdAt) / 3600000;
            const score = (post.likesCount || 0) / Math.pow(hoursPassed + 2, 1.5);
            return { id: doc.id, score, ...post };
        }).sort((a, b) => b.score - a.score).slice(0, 5);

        if (container) container.innerHTML = '';
        if (sidebarContainer) sidebarContainer.innerHTML = '';

        if (snapshot.empty) {
            const noData = '<p class="text-muted" style="text-align: center;">Nada em alta ainda</p>';
            if (container) container.innerHTML = noData;
            if (sidebarContainer) sidebarContainer.innerHTML = noData;
            return;
        }

        // Render for Explore View (Full details)
        if (container) {
            trendingPosts.forEach(post => {
                container.appendChild(createPostElement(post));
            });
        }

        // Render for Sidebar (Compact)
        if (sidebarContainer) {
            trendingPosts.forEach((post, index) => {
                sidebarContainer.innerHTML += `
                    <div class="trending-item" style="margin-bottom: var(--spacing-3); padding-bottom: var(--spacing-3); border-bottom: 1px solid var(--border-subtle); cursor: pointer;" onclick="switchView('feed')">
                        <div style="font-size: var(--text-xs); color: var(--text-tertiary);">#${index + 1} Trending</div>
                        <div style="font-weight: var(--font-medium); margin: 4px 0;">${escapeHtml(post.content.substring(0, 40))}${post.content.length > 40 ? '...' : ''}</div>
                        <div style="font-size: var(--text-xs); color: var(--text-secondary);">${post.likesCount || 0} likes • por @${escapeHtml(post.authorUsername || 'user')}</div>
                    </div>
                `;
            });
        }

    } catch (error) {
        console.error('Error loading trending:', error);
    }
}

// Search Functionality
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim().toLowerCase();
        const container = document.getElementById('suggestedUsers');

        if (!query) {
            loadSuggestions(); // Reset to default
            return;
        }

        try {
            const snapshot = await db.collection('alink_users')
                .limit(30)
                .get();

            container.innerHTML = '';

            const filtered = snapshot.docs.filter(doc => {
                const user = doc.data();
                return (user.displayName && user.displayName.toLowerCase().includes(query)) ||
                    (user.username && user.username.toLowerCase().includes(query));
            });

            if (filtered.length === 0) {
                container.innerHTML = '<p class="text-muted" style="text-align: center; padding: var(--spacing-4);">Nenhum utilizador encontrado</p>';
                return;
            }

            filtered.forEach(doc => {
                const user = doc.data();
                container.innerHTML += `
                <div class="follow-item" style="cursor: pointer;" onclick="switchView('profile', '${doc.id}')">
                    <div class="follow-avatar" style="${user.avatar ? `background-image: url(${user.avatar}); background-size: cover;` : ''}"></div>
                    <div class="follow-info">
                        <span class="follow-name">${escapeHtml(user.displayName || 'Utilizador')}</span>
                        <span class="follow-username">@${escapeHtml(user.username || 'user')}</span>
                    </div>
                    <button class="btn-follow" onclick="event.stopPropagation(); switchView('profile', '${doc.id}')">Ver</button>
                </div>
            `;
            });

        } catch (error) {
            console.error('Search error:', error);
        }
    }, 500));
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// MESSAGING
// ============================================

let currentChatUserId = null;
let unsubscribeChat = null;

async function loadConversations() {
    const container = document.getElementById('conversationsList');
    if (container) container.innerHTML = '<div class="loading-feed">Carregando conversas...</div>';

    try {
        // Use real-time listener for the conversation list
        db.collection('alink_conversations')
            .where('participants', 'array-contains', currentUser.uid)
            .orderBy('updatedAt', 'desc')
            .onSnapshot(snapshot => {
                if (container) container.innerHTML = '';

                if (snapshot.empty) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">💬</div>
                            <h3>Sem conversas</h3>
                            <p>Começa uma conversa com alguém!</p>
                        </div>
                    `;
                    return;
                }

                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const otherUserId = data.participants.find(id => id !== currentUser.uid);

                    // Fallback to searching the other user info if not in conversation doc
                    const otherUser = data.users?.[otherUserId] || { name: 'Utilizador', avatar: null };
                    const timeAgo = getTimeAgo(data.updatedAt?.toDate?.() || new Date(data.updatedAt));

                    const item = document.createElement('div');
                    item.className = 'conversation-item';
                    item.onclick = () => openChat(otherUserId);
                    item.style.cssText = 'display: flex; gap: var(--spacing-3); padding: var(--spacing-4); border-bottom: 1px solid var(--border-subtle); cursor: pointer; transition: background 0.2s;';
                    item.innerHTML = `
                        <div class="comment-avatar" style="${otherUser.avatar ? `background-image: url(${otherUser.avatar}); background-size: cover;` : ''}"></div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                                <span style="font-weight: var(--font-semibold);">${escapeHtml(otherUser.name)}</span>
                                <span style="font-size: var(--text-xs); color: var(--text-tertiary);">${timeAgo}</span>
                            </div>
                            <p style="margin: 0; font-size: var(--text-sm); color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(data.lastMessage || '')}</p>
                        </div>
                    `;
                    container.appendChild(item);
                });
            });

    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

async function openChat(userId) {
    if (currentChatUserId === userId) return;

    currentChatUserId = userId;
    document.getElementById('chatModal').classList.add('active');
    document.getElementById('chatMessages').innerHTML = '<div class="loading-feed">A carregar...</div>';

    // Get user info (cached or fetch)
    try {
        const userDoc = await db.collection('alink_users').doc(userId).get();
        if (userDoc.exists) {
            const user = userDoc.data();
            document.getElementById('chatUserName').textContent = user.displayName;
            document.getElementById('chatUserAvatar').style.backgroundImage = user.avatar ? `url(${user.avatar})` : '';
            document.getElementById('chatUserAvatar').style.backgroundSize = 'cover';
        }
    } catch (e) {
        console.error('Error fetching chat user:', e);
    }

    loadMessages(userId);
}

function closeChat() {
    document.getElementById('chatModal').classList.remove('active');
    currentChatUserId = null;
    if (unsubscribeChat) {
        unsubscribeChat();
        unsubscribeChat = null;
    }
}

function getConversationId(userId) {
    return [currentUser.uid, userId].sort().join('_');
}

function loadMessages(userId) {
    const convoId = getConversationId(userId);
    const container = document.getElementById('chatMessages');

    if (unsubscribeChat) unsubscribeChat();

    unsubscribeChat = db.collection('alink_messages')
        .doc(convoId)
        .collection('messages')
        .orderBy('createdAt', 'asc')
        .limit(50)
        .onSnapshot(snapshot => {
            container.innerHTML = '';

            if (snapshot.empty) {
                container.innerHTML = '<p class="text-muted" style="text-align: center; margin-top: 20px;">Diz olá! 👋</p>';
                return;
            }

            let lastDate = null;

            snapshot.docs.forEach(doc => {
                const msg = doc.data();
                const isMe = msg.senderId === currentUser.uid;

                // Date separator? (Simplification: skip for now)

                const msgDiv = document.createElement('div');
                msgDiv.style.cssText = `
                    align-self: ${isMe ? 'flex-end' : 'flex-start'};
                    background: ${isMe ? 'var(--primary-600)' : 'var(--surface-secondary)'};
                    color: ${isMe ? 'white' : 'var(--text-primary)'};
                    padding: 8px 16px;
                    border-radius: 16px;
                    border-bottom-${isMe ? 'right' : 'left'}-radius: 4px;
                    max-width: 70%;
                    word-wrap: break-word;
                    font-size: var(--text-sm);
                `;
                msgDiv.textContent = msg.content;
                container.appendChild(msgDiv);
            });

            container.scrollTop = container.scrollHeight;
        });
}

function handleChatKey(e) {
    if (e.key === 'Enter') sendMessage();
}

async function sendMessage() {
    if (!currentChatUserId) return;

    const input = document.getElementById('chatInput');
    const content = input.value.trim();

    if (!content) return;

    const convoId = getConversationId(currentChatUserId);

    try {
        const batch = db.batch();
        const msgRef = db.collection('alink_messages').doc(convoId).collection('messages').doc();
        const convoRef = db.collection('alink_conversations').doc(convoId);

        // Add message
        batch.set(msgRef, {
            senderId: currentUser.uid,
            content: content,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update conversation metadata
        const userBasicInfo = {
            [currentUser.uid]: {
                name: userProfile?.profile?.displayName || 'Eu',
                avatar: userProfile?.profile?.avatar || null
            },
            //Ideally we fetch the other user info too if it doesn't exist, but this is an update
        };

        batch.set(convoRef, {
            participants: [currentUser.uid, currentChatUserId],
            lastMessage: content,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            // We need to merge user info carefully in real app
            users: userBasicInfo
        }, { merge: true });

        await batch.commit();
        input.value = '';

    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Erro ao enviar', 'error');
    }
}

async function loadNotifications() {
    const container = document.getElementById('notificationsList');
    if (container) container.innerHTML = '<div class="loading-feed">Carregando...</div>';

    try {
        // Real-time notifications
        db.collection('alink_notifications')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .onSnapshot(snapshot => {
                const badges = [
                    document.getElementById('notifBadge'),
                    document.getElementById('mobileNotifBadge')
                ].filter(b => b !== null);

                let unreadCount = 0;

                if (snapshot.empty) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">🔔</div>
                            <h3>Tudo em dia</h3>
                            <p>Não tens notificações novas</p>
                        </div>
                    `;
                    badges.forEach(b => b.style.display = 'none');
                    return;
                }

                snapshot.docs.forEach(doc => {
                    const notif = doc.data();
                    if (!notif.read) unreadCount++;

                    const timeAgo = getTimeAgo(notif.createdAt?.toDate?.() || new Date(notif.createdAt));

                    let icon = '🔔';
                    if (notif.type === 'like') icon = '❤️';
                    if (notif.type === 'comment') icon = '💬';
                    if (notif.type === 'follow') icon = '👤';
                    if (notif.type === 'group') icon = '👥';

                    const item = document.createElement('div');
                    item.className = `notification-item ${notif.read ? '' : 'unread'}`;
                    item.style.cssText = `display: flex; gap: var(--spacing-3); padding: var(--spacing-4); border-bottom: 1px solid var(--border-subtle); align-items: center; cursor: pointer; background: ${notif.read ? 'transparent' : 'var(--surface-glass)'}; border-left: ${notif.read ? 'none' : '4px solid var(--primary-500)'};`;
                    item.onclick = async () => {
                        if (!notif.read) await db.collection('alink_notifications').doc(doc.id).update({ read: true });
                        if (notif.data?.postId) switchView('feed'); // Or specific post view if implemented
                        if (notif.data?.userId) switchView('profile', notif.data.userId);
                    };

                    item.innerHTML = `
                        <div class="notif-icon" style="font-size: 1.5rem; width: 40px; text-align: center;">${icon}</div>
                        <div class="notif-content" style="flex: 1;">
                            <p style="margin: 0; font-size: var(--text-sm); line-height: 1.5; color: ${notif.read ? 'var(--text-secondary)' : 'var(--text-primary)'}; font-weight: ${notif.read ? 'normal' : '600'};">${notif.content}</p>
                            <span style="font-size: var(--text-xs); color: var(--text-tertiary);">${timeAgo}</span>
                        </div>
                    `;
                    container.appendChild(item);
                });

                const badgeText = unreadCount > 9 ? '9+' : unreadCount;
                badges.forEach(badge => {
                    if (unreadCount > 0) {
                        badge.textContent = badgeText;
                        badge.style.display = 'flex';
                        badge.classList.add('pulse');
                    } else {
                        badge.style.display = 'none';
                    }
                });
            });

    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

async function sendNotification(userId, type, message, data = {}) {
    if (userId === currentUser.uid) return; // Don't notify self

    try {
        await db.collection('alink_notifications').add({
            userId: userId,
            type: type,
            content: message,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            data: data,
            fromUser: {
                id: currentUser.uid,
                name: userProfile?.profile?.displayName || 'Alguém'
            }
        });
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

async function loadGroups() {
    const myGroupsContainer = document.getElementById('myGroups');
    const discoverGroupsContainer = document.getElementById('discoverGroups');

    if (myGroupsContainer) myGroupsContainer.innerHTML = '<div class="loading-feed">Carregando...</div>';
    if (discoverGroupsContainer) discoverGroupsContainer.innerHTML = '<div class="loading-feed">Carregando...</div>';

    try {
        const snapshot = await db.collection('alink_groups').orderBy('createdAt', 'desc').get();

        if (myGroupsContainer) myGroupsContainer.innerHTML = '';
        if (discoverGroupsContainer) discoverGroupsContainer.innerHTML = '';

        const myGroups = [];
        const otherGroups = [];

        snapshot.docs.forEach(doc => {
            const group = { id: doc.id, ...doc.data() };
            if (group.members && group.members.includes(currentUser.uid)) {
                myGroups.push(group);
            } else {
                otherGroups.push(group);
            }
        });

        // Render My Groups
        if (myGroups.length === 0) {
            myGroupsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <h3>Sem grupos</h3>
                    <p>Junta-te a um grupo!</p>
                </div>
            `;
        } else {
            myGroups.forEach(group => {
                myGroupsContainer.innerHTML += createGroupCard(group, true);
            });
        }

        // Render Discover Groups
        if (otherGroups.length === 0) {
            discoverGroupsContainer.innerHTML = '<p class="text-muted">Sem novos grupos para descobrir</p>';
        } else {
            otherGroups.forEach(group => {
                discoverGroupsContainer.innerHTML += createGroupCard(group, false);
            });
        }

    } catch (error) {
        console.error('Error loading groups:', error);
    }
}

function createGroupCard(group, isMember) {
    const memberCount = group.members ? group.members.length : 0;
    const isOwner = group.createdBy === currentUser.uid;

    return `
        <div class="group-card shadow-premium" data-group-id="${group.id}" onclick="switchView('groupDetail', '${group.id}')" style="cursor: pointer;">
            <div class="group-card-header">
                <div class="group-icon-wrapper">${group.icon || '👥'}</div>
                <div class="group-badge">${isMember ? 'Membro' : 'Público'}</div>
            </div>
            <div class="group-card-body">
                <h3 class="group-name">${escapeHtml(group.name)}</h3>
                <p class="group-desc">${escapeHtml(group.description)}</p>
                
                <div class="group-stats">
                    <div class="group-stat">
                        <span class="stat-value">${memberCount}</span>
                        <span class="stat-label">membros</span>
                    </div>
                </div>
            </div>
            <div class="group-card-footer">
                ${!isMember ? `
                    <button class="btn-primary btn-full" onclick="event.stopPropagation(); joinGroup('${group.id}')">
                        Participar
                    </button>
                ` : `
                    <button class="btn-secondary btn-full" onclick="event.stopPropagation(); switchView('groupDetail', '${group.id}')">
                        Ver Grupo
                    </button>
                `}
            </div>
        </div>
    `;
}

async function joinGroup(groupId) {
    try {
        await db.collection('alink_groups').doc(groupId).update({
            members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
        });
        showToast('Entraste no grupo!', 'success');
        loadGroups();
    } catch (error) {
        console.error('Error joining group:', error);
        showToast('Erro ao entrar no grupo', 'error');
    }
}

function openCreateGroup() {
    document.getElementById('createGroupModal').classList.add('active');
}

function closeCreateGroup() {
    document.getElementById('createGroupModal').classList.remove('active');
    document.getElementById('groupName').value = '';
    document.getElementById('groupDesc').value = '';
    document.getElementById('groupIcon').value = '';
}

async function createGroup() {
    const name = document.getElementById('groupName').value.trim();
    const desc = document.getElementById('groupDesc').value.trim();
    const icon = document.getElementById('groupIcon').value.trim() || '👥';

    if (!name) {
        showToast('Nome é obrigatório', 'error');
        return;
    }

    try {
        await db.collection('alink_groups').add({
            name: name,
            description: desc,
            icon: icon,
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            members: [currentUser.uid]
        });

        showToast('Grupo criado!', 'success');
        closeCreateGroup();
        loadGroups();
    } catch (error) {
        console.error('Error creating group:', error);
        showToast('Erro ao criar grupo', 'error');
    }
}

// ============================================
// GAMES - QUIZ
// ============================================

let currentQuizQuestion = null;

function startDailyQuiz() {
    const questions = [
        { q: "Qual o ano de fundação do Grupo Armindo?", a: "2024", hint: "Foi há pouco tempo..." },
        { q: "Qual a cor principal do ALink?", a: "indigo", hint: "Pensa no gradiente...", altAnswers: ["roxo", "purple", "azul", "violet"] },
        { q: "Qual o nome do nosso CEO?", a: "armindo", hint: "Está no nome do grupo!" },
        { q: "O ALink é que tipo de plataforma?", a: "rede social", hint: "Estás a usá-la agora!", altAnswers: ["social", "social network"] },
        { q: "Quantas cores tem o gradiente principal do ALink?", a: "3", hint: "Indigo, roxo e...", altAnswers: ["três", "tres"] },
        { q: "Qual o emoji do streak no ALink?", a: "fogo", hint: "🔥", altAnswers: ["🔥", "fire", "chama"] },
        { q: "Em que linguagem foi construído o ALink?", a: "javascript", hint: "Rima com 'java' mas não é Java", altAnswers: ["js"] }
    ];

    const day = new Date().getDate();
    currentQuizQuestion = questions[day % questions.length];

    document.getElementById('quizQuestion').innerHTML = `
        <div style="font-size: 1.2rem; font-weight: var(--font-semibold); line-height: 1.5;">${currentQuizQuestion.q}</div>
        <p style="color: var(--text-tertiary); font-size: var(--text-sm); margin-top: var(--spacing-2);">💡 Dica: ${currentQuizQuestion.hint}</p>
    `;
    document.getElementById('quizAnswer').value = '';
    document.getElementById('quizFeedback').style.display = 'none';
    document.getElementById('quizSubmitBtn').style.display = '';
    document.getElementById('quizModal').classList.add('active');
    setTimeout(() => document.getElementById('quizAnswer').focus(), 300);
}

function submitQuizAnswer() {
    if (!currentQuizQuestion) return;
    const input = document.getElementById('quizAnswer').value.trim().toLowerCase();
    if (!input) return;

    const feedback = document.getElementById('quizFeedback');
    const correct = input.includes(currentQuizQuestion.a.toLowerCase()) ||
        (currentQuizQuestion.altAnswers && currentQuizQuestion.altAnswers.some(a => input.includes(a.toLowerCase())));

    if (correct) {
        feedback.innerHTML = `
            <div style="text-align: center; padding: var(--spacing-4);">
                <div style="font-size: 3rem;">🎉</div>
                <p style="font-weight: var(--font-bold); color: var(--success-500); margin-top: var(--spacing-2);">Correto! +${CONFIG.xp.quiz} XP</p>
            </div>
        `;
        addXP(CONFIG.xp.quiz);
    } else {
        feedback.innerHTML = `
            <div style="text-align: center; padding: var(--spacing-4);">
                <div style="font-size: 3rem;">❌</div>
                <p style="font-weight: var(--font-bold); color: var(--error-500, #ef4444); margin-top: var(--spacing-2);">Errado! A resposta era: ${currentQuizQuestion.a}</p>
                <p style="color: var(--text-secondary); font-size: var(--text-sm);">Tenta novamente amanhã!</p>
            </div>
        `;
    }

    feedback.style.display = 'block';
    document.getElementById('quizSubmitBtn').style.display = 'none';
}

function closeQuiz() {
    document.getElementById('quizModal').classList.remove('active');
    currentQuizQuestion = null;
}

// ============================================
// GAMES - BUDDY MATCH
// ============================================

let currentBuddyId = null;

async function startBuddyMatch() {
    document.getElementById('buddyModal').classList.add('active');
    document.getElementById('buddyLoading').style.display = '';
    document.getElementById('buddyResult').style.display = 'none';
    document.getElementById('buddyEmpty').style.display = 'none';

    try {
        const snapshot = await db.collection('alink_users').limit(20).get();
        const users = [];
        snapshot.docs.forEach(doc => {
            if (doc.id !== currentUser.uid) users.push({ id: doc.id, ...doc.data() });
        });

        // Simulate search delay for effect
        await new Promise(r => setTimeout(r, 1500));

        if (users.length === 0) {
            document.getElementById('buddyLoading').style.display = 'none';
            document.getElementById('buddyEmpty').style.display = '';
            return;
        }

        const randomUser = users[Math.floor(Math.random() * users.length)];
        currentBuddyId = randomUser.id;

        // Populate card
        const avatarEl = document.getElementById('buddyAvatar');
        avatarEl.style.backgroundImage = randomUser.avatar ? `url(${randomUser.avatar})` : '';
        avatarEl.style.backgroundSize = 'cover';
        avatarEl.style.backgroundPosition = 'center';

        document.getElementById('buddyName').textContent = randomUser.displayName || 'Utilizador';
        document.getElementById('buddyUsername').textContent = '@' + (randomUser.username || 'user');
        document.getElementById('buddyBio').textContent = randomUser.bio || 'Este utilizador ainda não tem bio.';

        // Wire buttons
        document.getElementById('buddyFollowBtn').onclick = () => {
            toggleFollow(randomUser.id);
            closeBuddy();
        };
        document.getElementById('buddyProfileBtn').onclick = () => {
            closeBuddy();
            switchView('profile', randomUser.id);
        };

        document.getElementById('buddyLoading').style.display = 'none';
        document.getElementById('buddyResult').style.display = '';

    } catch (error) {
        console.error('Buddy match error:', error);
        document.getElementById('buddyLoading').style.display = 'none';
        document.getElementById('buddyEmpty').style.display = '';
    }
}

function closeBuddy() {
    document.getElementById('buddyModal').classList.remove('active');
    currentBuddyId = null;
}

// ============================================
// GAMES - DAILY CHALLENGE
// ============================================

async function startDailyChallenge() {
    document.getElementById('challengeModal').classList.add('active');
    const container = document.getElementById('challengeTasks');
    const rewardEl = document.getElementById('challengeReward');
    container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">A verificar progresso...</p>';
    rewardEl.style.display = 'none';

    try {
        const today = new Date().toISOString().split('T')[0];

        // Check task 1: Posted today?
        const postsSnap = await db.collection('alink_posts')
            .where('authorId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        const lastPostDate = postsSnap.docs.length > 0 ?
            postsSnap.docs[0].data().createdAt?.toDate?.()?.toISOString().split('T')[0] : null;
        const task1Done = lastPostDate === today;

        // Check task 2: Liked 3 posts today? (We'll check likedBy in recent posts for simplicity)
        // Since we don't track individual like timestamps, we'll approximate by checking if user has liked >= 3 posts total
        const likedSnap = await db.collection('alink_posts')
            .where('likedBy', 'array-contains', currentUser.uid)
            .limit(3)
            .get();
        const task2Done = likedSnap.docs.length >= 3;

        // Check task 3: Commented today?
        // Check the most recent comment by this user across any post
        const task3Done = (alinkProfile?.xp || 0) > 0; // Simplified: user has interacted

        const tasks = [
            { label: 'Publicar um post', icon: '📝', done: task1Done, xp: 50 },
            { label: 'Dar like em 3 posts', icon: '❤️', done: task2Done, xp: 30 },
            { label: 'Comentar num post', icon: '💬', done: task3Done, xp: 20 }
        ];

        const allDone = tasks.every(t => t.done);

        container.innerHTML = tasks.map(task => `
            <div class="challenge-task ${task.done ? 'completed' : ''}">
                <div class="challenge-task-left">
                    <span class="challenge-check">${task.done ? '✅' : '⬜'}</span>
                    <span class="challenge-icon">${task.icon}</span>
                    <span class="challenge-label">${task.label}</span>
                </div>
                <span class="challenge-xp">+${task.xp} XP</span>
            </div>
        `).join('');

        if (allDone) {
            rewardEl.style.display = 'block';
            // Check if already claimed today
            const claimedKey = `challenge_claimed_${today}`;
            if (!localStorage.getItem(claimedKey)) {
                addXP(150);
                localStorage.setItem(claimedKey, 'true');
                showToast('🎉 Desafio completo! +150 XP bónus!', 'success');
            }
        }

        // Update status on game card
        const doneCount = tasks.filter(t => t.done).length;
        const statusEl = document.getElementById('challengeStatus');
        if (statusEl) statusEl.textContent = allDone ? '✅ Completo!' : `${doneCount}/3 tarefas`;

    } catch (error) {
        console.error('Challenge error:', error);
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Erro ao carregar desafios.</p>';
    }
}

function closeChallenge() {
    document.getElementById('challengeModal').classList.remove('active');
}

// ============================================
// GAMES - WORD BATTLE
// ============================================

let currentWord = null;
let originalWord = null;

function startWordBattle() {
    const words = [
        "Amigo", "Escola", "Familia", "Cidade", "Natureza", "Sol", "Lua", "Estrela", "Mar", "Rio",
        "Montanha", "Floresta", "Animal", "Gato", "Cao", "Cavalo", "Passaro", "Peixe", "Fruta", "Maca",
        "Banana", "Laranja", "Uva", "Comida", "Pao", "Arroz", "Feijao", "Leite", "Agua", "Suco",
        "Casa", "Quarto", "Cozinha", "Janela", "Porta", "Mesa", "Cadeira", "Cama", "Roupa", "Sapato",
        "Livro", "Caneta", "Papel", "Telefone", "Musica", "Danca", "Cinema", "Teatro", "Arte", "Pintura",
        "Teletrabalho", "Viagem", "Ferias", "Trabalho", "Estudo", "Saude", "Desporto", "Futebol", "Brincar", "Rir",
        "Feliz", "Alegria", "Amor", "Paz", "Esperanca", "Liberdade", "Sonho", "Coragem", "Forca", "Verdade",
        "Tempo", "Hoje", "Amanha", "Ontem", "Semana", "Mes", "Ano", "Manha", "Tarde", "Noite",
        "Computador", "Internet", "Telemovel", "Mensagem", "Foto", "Video", "Jogo", "Pessoas", "Mundo", "Vida"
    ];
    originalWord = words[Math.floor(Math.random() * words.length)];

    // Scramble word
    currentWord = originalWord.split('').sort(() => Math.random() - 0.5).join('');
    if (currentWord === originalWord) return startWordBattle(); // Try again if it didn't scramble

    document.getElementById('wordScramble').textContent = currentWord;
    document.getElementById('wordAnswer').value = '';
    document.getElementById('wordFeedback').style.display = 'none';
    document.getElementById('wordSubmitBtn').style.display = '';
    document.getElementById('wordBattleModal').classList.add('active');
    setTimeout(() => document.getElementById('wordAnswer').focus(), 300);
}

function submitWordAnswer() {
    const input = document.getElementById('wordAnswer').value.trim().toLowerCase();
    if (!input) return;

    const feedback = document.getElementById('wordFeedback');
    feedback.style.display = 'block';

    if (input === originalWord.toLowerCase()) {
        feedback.innerHTML = `
            <div style="text-align: center; padding: var(--spacing-4);">
                <div style="font-size: 3rem;">⚔️</div>
                <p style="font-weight: var(--font-bold); color: var(--success-500); margin-top: var(--spacing-2);">Vitória! +${CONFIG.xp.wordBattle} XP</p>
            </div>
        `;
        addXP(CONFIG.xp.wordBattle);
    } else {
        feedback.innerHTML = `
            <div style="text-align: center; padding: var(--spacing-4);">
                <div style="font-size: 3rem;">💀</div>
                <p style="font-weight: var(--font-bold); color: var(--error-500); margin-top: var(--spacing-2);">Foste derrotado! Era: ${originalWord}</p>
            </div>
        `;
    }
    document.getElementById('wordSubmitBtn').style.display = 'none';
}

function closeWordBattle() {
    document.getElementById('wordBattleModal').classList.remove('active');
}

// ============================================
// PROFILE TABS
// ============================================

let currentProfileUserId = null;

function setupProfileTabs(userId) {
    const tabs = document.querySelectorAll('.profile-tab');
    const contents = document.querySelectorAll('.profile-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            // Update tabs
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update content
            contents.forEach(content => {
                content.style.display = 'none';
                content.classList.remove('active');
            });

            const activeContent = document.getElementById(`profileTab${target.charAt(0).toUpperCase() + target.slice(1)}`);
            if (activeContent) {
                activeContent.style.display = 'block';
                activeContent.classList.add('active');
            }

            // Load content
            if (target === 'likes') loadUserLikes(userId);
            if (target === 'media') loadUserMedia(userId);
            if (target === 'posts') loadUserPosts(userId);
        });
    });
}


async function loadUserPosts(userId) {
    const container = document.getElementById('userPosts');
    if (!container) return;

    showSkeletons(container, 3);

    try {
        const snapshot = await db.collection('alink_posts')
            .where('authorId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        container.innerHTML = '';

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">❤️</div>
                    <h3>Sem posts</h3>
                    <p>${userId === currentUser.uid ? 'Ainda não publicaste nenhum post.' : 'Este utilizador ainda não publicou posts.'}</p>
                </div>
            `;
            return;
        }

        snapshot.docs.forEach(doc => {
            const post = { id: doc.id, ...doc.data() };
            container.appendChild(createPostElement(post));
        });

    } catch (error) {
        console.error('Error loading user posts:', error);
        container.innerHTML = '<div class="error-state">Erro ao carregar posts</div>';
    }
}

async function loadUserLikes(userId) {
    const container = document.getElementById('userLikes');
    if (!container) return;
    showSkeletons(container, 3);

    try {
        const snapshot = await db.collection('alink_posts')
            .where('likedBy', 'array-contains', userId)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        container.innerHTML = '';

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">❤️</div>
                    <h3>Sem likes</h3>
                    <p>${userId === currentUser.uid ? 'Ainda não deste like em nenhum post.' : 'Este utilizador ainda não deu likes.'}</p>
                </div>
            `;
            return;
        }

        snapshot.docs.forEach(doc => {
            const post = { id: doc.id, ...doc.data() };
            container.appendChild(createPostElement(post));
        });

    } catch (error) {
        console.error('Error loading user likes:', error);
        container.innerHTML = '<div class="error-state">Erro ao carregar likes</div>';
    }
}

async function loadUserMedia(userId) {
    const container = document.getElementById('userMedia');
    if (!container) return;
    showSkeletons(container, 3);

    try {
        const snapshot = await db.collection('alink_posts')
            .where('authorId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(30)
            .get();

        container.innerHTML = '';

        const mediaPosts = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.image || data.imageUrl;
        });

        if (mediaPosts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📷</div>
                    <h3>Sem media</h3>
                    <p>${userId === currentUser.uid ? 'Publica um post com imagem!' : 'Este utilizador não tem posts com media.'}</p>
                </div>
            `;
            return;
        }

        mediaPosts.forEach(doc => {
            const post = { id: doc.id, ...doc.data() };
            container.appendChild(createPostElement(post));
        });

    } catch (error) {
        console.error('Error loading user media:', error);
        container.innerHTML = '<div class="error-state">Erro ao carregar media</div>';
    }
}

// ============================================
// PROFILE
// ============================================

function editProfile() {
    const displayName = userProfile?.profile?.displayName || currentUser.displayName || 'Utilizador';
    const bio = alinkProfile?.bio || '';
    const avatar = userProfile?.profile?.avatar || '';

    document.getElementById('editName').value = displayName;
    document.getElementById('editBio').value = bio;
    document.getElementById('editAvatar').value = avatar;

    document.getElementById('editProfileModal').classList.add('active');
    updateUserUI();
}

function closeEditProfile() {
    document.getElementById('editProfileModal').classList.remove('active');
}

async function saveProfile() {
    const newName = document.getElementById('editName').value.trim();
    const newBio = document.getElementById('editBio').value.trim();
    const newAvatar = document.getElementById('editAvatar').value.trim();

    if (!newName) {
        showToast('O nome é obrigatório', 'error');
        return;
    }

    try {
        // Update local object
        alinkProfile.bio = newBio;

        // Update user profile object (simulated)
        if (!userProfile.profile) userProfile.profile = {};
        userProfile.profile.displayName = newName;
        userProfile.profile.avatar = newAvatar;

        // Save to Firestore
        await ArmindoAccount.setProjectData('alink', alinkProfile);

        // Update alink_users for discovery
        await db.collection('alink_users').doc(currentUser.uid).update({
            displayName: newName,
            bio: newBio,
            avatar: newAvatar,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // If ArmindoAccount supports updating base profile, we would do it here
        // For now, we just update our local view

        showToast('Perfil atualizado!', 'success');
        closeEditProfile();
        updateUserUI();
        if (currentView === 'profile' && currentViewId === currentUser.uid) {
            loadProfileHeader(currentUser.uid);
        }

        // Refresh feed to show new avatar/name in new posts (optional, complex to update old posts)

    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('Erro ao guardar perfil', 'error');
    }
}

// ============================================
// AUTH
// ============================================

async function logout() {
    if (confirm('Queres mesmo sair?')) {
        await ArmindoAccount.signOut();
        window.location.href = 'index.html';
    }
}

// ============================================
// UTILITIES
// ============================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.warn('Toast container not found');
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ============================================
// THEME MANAGEMENT
// ============================================

function initTheme() {
    const savedTheme = localStorage.getItem('alink-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme(e) {
    if (e) e.preventDefault();
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('alink-theme', newTheme);
    updateThemeIcon(newTheme);

    showToast(`Modo ${newTheme === 'dark' ? 'escuro' : 'claro'} ativado`, 'success');
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle svg');
    if (!icon) return;

    if (theme === 'dark') {
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    } else {
        icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>';
    }
}

// Call initTheme on load
initTheme();

// ============================================
// UI FEEDBACK (Skeletons)
// ============================================

function showSkeletons(container, count = 3, type = 'post') {
    if (typeof container === 'string') container = document.getElementById(container);
    if (!container) return;

    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        if (type === 'post') {
            div.className = 'post-card skeleton-container';
            div.innerHTML = `
                <div class="post-header">
                    <div class="skeleton-avatar skeleton"></div>
                    <div class="post-user-info" style="flex: 1;">
                        <div class="skeleton-text skeleton" style="width: 40%"></div>
                        <div class="skeleton-text skeleton" style="width: 20%"></div>
                    </div>
                </div>
                <div class="post-content">
                    <div class="skeleton-text skeleton"></div>
                    <div class="skeleton-text skeleton" style="width: 80%"></div>
                    <div class="skeleton-image skeleton" style="height: 150px; margin-top: 10px;"></div>
                </div>
            `;
        } else if (type === 'comment') {
            div.className = 'comment-item';
            div.innerHTML = `
                <div class="skeleton-avatar skeleton" style="width: 32px; height: 32px;"></div>
                <div class="comment-body" style="flex: 1;">
                    <div class="skeleton-text skeleton" style="width: 30%"></div>
                    <div class="skeleton-text skeleton"></div>
                </div>
            `;
        } else if (type === 'trending') {
            div.className = 'trending-item';
            div.innerHTML = `
                <div class="skeleton-text skeleton" style="width: 20%"></div>
                <div class="skeleton-text skeleton"></div>
                <div class="skeleton-text skeleton" style="width: 60%"></div>
            `;
        }
        container.appendChild(div);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// HELPERS
// ============================================

function getTimeAgo(date) {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    const seconds = Math.floor((new Date() - d) / 1000);

    if (seconds < 60) return 'agora';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd';

    return d.toLocaleDateString('pt-PT');
}

// ============================================
// ADMIN PANEL LOGIC
// ============================================

async function loadAdminDashboard() {
    if (!isAdmin) {
        showToast('Acesso negado', 'error');
        switchView('feed');
        return;
    }

    try {
        // Stats
        // Real-time stats listener
        db.collection('alink_users').onSnapshot(snap => {
            document.getElementById('adminTotalUsers').textContent = snap.size;
        });
        db.collection('alink_posts').onSnapshot(snap => {
            document.getElementById('adminTotalPosts').textContent = snap.size;
        });

        const container = document.getElementById('adminListContainer');
        const header = document.createElement('div');
        header.style.cssText = 'padding: 12px; background: var(--surface-secondary); border-radius: 8px; margin-bottom: 16px; font-size: 13px; display: flex; justify-content: space-between; align-items: center;';
        header.innerHTML = `
            <span>O teu UID: <code style="background: var(--bg-primary); padding: 2px 6px; border-radius: 4px;">${currentUser.uid}</code></span>
            <button class="btn-primary" style="padding: 4px 12px;" onclick="copyUID()">Copiar ID</button>
        `;

        loadAdminUsers();

        // Listeners for admin tabs
        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (btn.dataset.adminView === 'users') loadAdminUsers();
                if (btn.dataset.adminView === 'posts') loadAdminPosts();
            };
        });
    } catch (e) {
        console.error('Admin Dashboard error:', e);
    }
}

async function loadAdminUsers() {
    const container = document.getElementById('adminListContainer');
    container.innerHTML = '<div class="loading-feed">A carregar utilizadores...</div>';

    try {
        const snap = await db.collection('alink_users').orderBy('updatedAt', 'desc').limit(50).get();
        container.innerHTML = '';

        snap.forEach(doc => {
            const user = doc.data();
            const div = document.createElement('div');
            div.className = 'admin-list-item';
            div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-subtle);';
            div.innerHTML = `
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div class="follow-avatar" style="${user.avatar ? `background-image: url(${user.avatar}); background-size: cover;` : ''}"></div>
                    <div>
                        <div style="font-weight: 600;">${escapeHtml(user.displayName)} ${user.isVerified ? '✅' : ''}</div>
                        <div style="font-size: 12px; color: var(--text-tertiary);">@${escapeHtml(user.username)}</div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-primary" style="padding: 4px 8px; font-size: 10px;" onclick="verifyUser('${doc.id}', ${!user.isVerified})">
                        ${user.isVerified ? 'Tirar Selo' : 'Verificar'}
                    </button>
                    ${doc.id !== currentUser.uid ? `<button class="btn-icon" style="color: var(--secondary-500);" onclick="deleteUser('${doc.id}')">🗑️</button>` : ''}
                </div>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        container.innerHTML = 'Erro ao carregar';
    }
}

async function loadAdminPosts() {
    const container = document.getElementById('adminListContainer');
    container.innerHTML = '<div class="loading-feed">A carregar posts...</div>';

    try {
        const snap = await db.collection('alink_posts').orderBy('createdAt', 'desc').limit(50).get();
        container.innerHTML = '';

        snap.forEach(doc => {
            const post = doc.data();
            const div = document.createElement('div');
            div.className = 'admin-list-item';
            div.style.cssText = 'padding: 12px; border-bottom: 1px solid var(--border-subtle);';
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-weight: 600;">@${escapeHtml(post.authorUsername)}</span>
                    <button class="btn-icon" style="color: var(--secondary-500);" onclick="deletePost('${doc.id}')">🗑️ Apagar</button>
                </div>
                <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">${escapeHtml(post.content.substring(0, 100))}${post.content.length > 100 ? '...' : ''}</p>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        container.innerHTML = 'Erro ao carregar';
    }
}

async function verifyUser(userId, status) {
    try {
        await db.collection('alink_users').doc(userId).update({ isVerified: status });
        showToast(status ? 'Utilizador verificado!' : 'Selo removido', 'success');
        loadAdminUsers();
    } catch (e) {
        showToast('Erro ao atualizar', 'error');
    }
}

// ============================================
// ENHANCED GROUPS LOGIC
// ============================================

async function loadGroupDetail(groupId) {
    if (!groupId) return;
    const container = document.getElementById('groupDetailView');

    try {
        const doc = await db.collection('alink_groups').doc(groupId).get();
        if (!doc.exists) {
            showToast('Grupo não encontrado', 'error');
            switchView('groups');
            return;
        }

        const group = doc.data();
        document.getElementById('groupDetailName').textContent = group.name;
        document.getElementById('groupDetailDesc').textContent = group.description;
        document.getElementById('groupDetailIcon').textContent = group.icon || '👥';
        document.getElementById('groupDetailStats').textContent = `${group.members ? group.members.length : 0} membros`;

        const isMember = group.members && group.members.includes(currentUser.uid);
        const actions = document.getElementById('groupDetailActions');
        actions.innerHTML = isMember ?
            `<button class="btn-secondary" onclick="leaveGroup('${groupId}')">Sair do Grupo</button>` :
            `<button class="btn-primary" onclick="joinGroup('${groupId}')">Participar</button>`;

        loadGroupPosts(groupId);

        // Tab switching
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(`groupTab${tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)}`).classList.add('active');
                if (tab.dataset.tab === 'members') loadGroupMembers(group.members);
            };
        });

    } catch (e) {
        console.error('Group Detail error:', e);
    }
}

async function loadGroupPosts(groupId) {
    const feed = document.getElementById('groupPostsFeed');
    feed.innerHTML = '<div class="loading-feed">Carregando posts do grupo...</div>';

    try {
        const snap = await db.collection('alink_posts')
            .where('groupId', '==', groupId)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        feed.innerHTML = '';
        if (snap.empty) {
            feed.innerHTML = '<p class="text-muted" style="text-align: center; padding: 40px;">Este grupo ainda não tem posts.</p>';
            return;
        }

        snap.forEach(doc => {
            const post = { id: doc.id, ...doc.data() };
            feed.appendChild(createPostElement(post));
        });
    } catch (e) {
        feed.innerHTML = 'Erro ao carregar posts';
    }
}

async function loadGroupMembers(memberIds) {
    const container = document.getElementById('groupMembersList');
    container.innerHTML = '<div class="loading-feed">Carregando membros...</div>';

    try {
        container.innerHTML = '';
        for (const id of memberIds) {
            const userDoc = await db.collection('alink_users').doc(id).get();
            if (userDoc.exists) {
                const user = userDoc.data();
                container.innerHTML += `
                    <div class="member-item" style="display: flex; gap: 12px; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-subtle); cursor: pointer;" onclick="switchView('profile', '${id}')">
                        <div class="follow-avatar" style="${user.avatar ? `background-image: url(${user.avatar}); background-size: cover;` : ''}"></div>
                        <div>
                            <div style="font-weight: 600;">${escapeHtml(user.displayName)}</div>
                            <div style="font-size: 12px; color: var(--text-tertiary);">@${escapeHtml(user.username)}</div>
                        </div>
                    </div>
                `;
            }
        }
    } catch (e) {
        container.innerHTML = 'Erro ao carregar membros';
    }
}

async function leaveGroup(groupId) {
    if (!confirm('Queres mesmo sair deste grupo?')) return;
    try {
        await db.collection('alink_groups').doc(groupId).update({
            members: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
        });
        showToast('Saíste do grupo', 'info');
        loadGroupDetail(groupId);
    } catch (e) {
        showToast('Erro ao sair', 'error');
    }
}

window.copyUID = () => {
    navigator.clipboard.writeText(currentUser.uid);
    showToast('UID copiado para a área de transferência!', 'success');
};

// Globalize for onclick handlers
window.verifyUser = verifyUser;

window.deletePost = async (postId) => {
    if (!confirm('Apagar este post permanentemente?')) return;
    try {
        await db.collection('alink_posts').doc(postId).delete();
        showToast('Post removido', 'success');
        if (isAdmin) loadAdminPosts();
    } catch (e) {
        showToast('Erro ao apagar', 'error');
    }
};

window.deleteUser = async (userId) => {
    if (!confirm('Banir este utilizador permanentemente?')) return;
    try {
        // Just a simulation of banning by adding a flag or deleting from alink_users
        await db.collection('alink_users').doc(userId).delete();
        showToast('Utilizador banido', 'success');
        if (isAdmin) loadAdminUsers();
    } catch (e) {
        showToast('Erro ao banir', 'error');
    }
};

function compressImage(base64, maxWidth, maxHeight, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
    });
}

// Globalize new functions
window.startDailyQuiz = startDailyQuiz;
window.submitQuizAnswer = submitQuizAnswer;
window.closeQuiz = closeQuiz;
window.startBuddyMatch = startBuddyMatch;
window.closeBuddy = closeBuddy;
window.startDailyChallenge = startDailyChallenge;
window.closeChallenge = closeChallenge;
window.toggleFollow = toggleFollow;
window.setupProfileTabs = setupProfileTabs;
window.startWordBattle = startWordBattle;
window.submitWordAnswer = submitWordAnswer;
window.closeWordBattle = closeWordBattle;
window.sendMessage = sendMessage;
window.openChat = openChat;
window.closeChat = closeChat;

async function deleteAccount() {
    if (!confirm('AVISO CRÍTICO: Esta ação é irreversível. Todos os teus posts, mensagens e dados serão apagados permanentemente. Queres mesmo continuar?')) return;

    try {
        const batch = db.batch();

        // Delete posts
        const posts = await db.collection('alink_posts').where('authorId', '==', currentUser.uid).get();
        posts.forEach(doc => batch.delete(doc.ref));

        // Delete follows
        const followers = await db.collection('alink_follows').where('followingId', '==', currentUser.uid).get();
        followers.forEach(doc => batch.delete(doc.ref));
        const following = await db.collection('alink_follows').where('followerId', '==', currentUser.uid).get();
        following.forEach(doc => batch.delete(doc.ref));

        // Delete user doc
        batch.delete(db.collection('alink_users').doc(currentUser.uid));

        await batch.commit();
        await ArmindoAccount.signOut();
        window.location.href = 'index.html';

    } catch (e) {
        console.error('Error deleting account:', e);
        showToast('Erro ao apagar conta', 'error');
    }
}

window.deleteAccount = deleteAccount;

// ============================================
// GLOBAL LEADERBOARD
// ============================================

async function loadLeaderboard() {
    const container = document.getElementById('leaderboardList');
    if (!container) return;

    container.innerHTML = '<div class="loading-feed">A carregar lendas...</div>';

    try {
        const snapshot = await db.collection('alink_users')
            .orderBy('xp', 'desc')
            .limit(10)
            .get();

        container.innerHTML = '';

        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center; padding:20px;">Ainda não há lendas nesta rede.</p>';
            return;
        }

        snapshot.docs.forEach((doc, index) => {
            const user = doc.data();
            const isMe = doc.id === currentUser.uid;
            const rank = index + 1;

            let rankBadge = '';
            if (rank === 1) rankBadge = '🥇';
            else if (rank === 2) rankBadge = '🥈';
            else if (rank === 3) rankBadge = '🥉';
            else rankBadge = `#${rank}`;

            const item = document.createElement('div');
            item.className = `leaderboard-item ${isMe ? 'is-me' : ''}`;
            item.style.cssText = `
                display: flex; 
                align-items: center; 
                gap: var(--spacing-4); 
                padding: var(--spacing-4); 
                background: ${isMe ? 'var(--gradient-subtle)' : 'var(--surface-secondary)'}; 
                border-radius: var(--radius-xl); 
                margin-bottom: var(--spacing-3);
                border: ${isMe ? '1px solid var(--primary-500)' : '1px solid var(--border-subtle)'};
                transition: transform var(--transition-base);
            `;

            item.innerHTML = `
                <div class="rank" style="font-weight: 800; font-size: 1.1rem; width: 40px; text-align: center;">${rankBadge}</div>
                <div class="avatar" style="width: 40px; height: 40px; border-radius: 50%; background-image: url(${user.avatar || ''}); background-size: cover; background-position: center; background-color: var(--surface-tertiary);"></div>
                <div class="info" style="flex: 1;">
                    <div style="font-weight: 600; font-size: var(--text-sm);">${escapeHtml(user.displayName)}</div>
                    <div style="font-size: var(--text-xs); color: var(--text-tertiary);">@${escapeHtml(user.username)}</div>
                </div>
                <div class="stats" style="text-align: right;">
                    <div style="font-weight: 700; color: var(--primary-400);">Lvl ${user.level || 1}</div>
                    <div style="font-size: var(--text-xs); color: var(--text-tertiary);">${user.xp || 0} XP</div>
                </div>
            `;

            item.onclick = () => {
                closeLeaderboard();
                switchView('profile', doc.id);
            };
            item.style.cursor = 'pointer';

            container.appendChild(item);
        });

    } catch (error) {
        console.error('Error loading leaderboard:', error);
        container.innerHTML = '<p class="text-error">Erro ao carregar ranking.</p>';
    }
}

function showLeaderboard() {
    document.getElementById('leaderboardModal').classList.add('active');
    loadLeaderboard();
}

function closeLeaderboard() {
    document.getElementById('leaderboardModal').classList.remove('active');
}

window.showLeaderboard = showLeaderboard;
window.closeLeaderboard = closeLeaderboard;

// ============================================
// VISUAL POLISH & ANIMATIONS
// ============================================

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function createParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'like-particle';
    const size = Math.random() * 8 + 4;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = `hsl(${Math.random() * 60 + 330}, 100%, 70%)`; // Pinkish/Indigo
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;

    const destinationX = x + (Math.random() - 0.5) * 200;
    const destinationY = y + (Math.random() - 0.5) * 200;

    document.body.appendChild(particle);

    const animation = particle.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${destinationX - x}px, ${destinationY - y}px) scale(0)`, opacity: 0 }
    ], {
        duration: 800 + Math.random() * 400,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    });

    animation.onfinish = () => particle.remove();
}

function burstParticles(e) {
    const rect = e.target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    for (let i = 0; i < 12; i++) {
        createParticle(x, y);
    }
}

window.burstParticles = burstParticles;

// Quick Emoji Helper
window.insertEmoji = (emoji) => {
    const input = document.getElementById('postContent');
    if (input) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        input.value = text.substring(0, start) + emoji + text.substring(end);
        input.focus();
        input.selectionStart = input.selectionEnd = start + emoji.length;
    }
};


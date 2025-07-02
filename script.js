document.addEventListener('DOMContentLoaded', () => {
    // ============== ZAROORI =================
    // Apni Firebase project ki configuration yahan paste karein.
    const firebaseConfig = {
      apiKey: "AIzaSyDox5At1sNhQXF27r_WU0RePiwxhihmKxo",
      authDomain: "student-discs.firebaseapp.com",
      projectId: "student-discs",
      storageBucket: "student-discs.appspot.com",
      messagingSenderId: "254221122813",
      appId: "1:254221122813:web:46f2fdff4a50ad3c1b9294"
    };
    // ==========================================

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();

    const ui = {
        loginContainer: document.getElementById('login-container'),
        mainApp: document.getElementById('main-app'),
        usernameInput: document.getElementById('username-input'),
        loginBtn: document.getElementById('login-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        clearHistoryBtn: document.getElementById('clear-history-btn'),
        sidebar: document.getElementById('sidebar'),
        sidebarNav: document.getElementById('sidebar-nav'),
        sidebarUsername: document.getElementById('sidebar-username'),
        sidebarLoginId: document.getElementById('sidebar-login-id'),
        profileAvatar: document.getElementById('profile-avatar'),
        profileEmoji: document.getElementById('profile-emoji'),
        headerProfileEmoji: document.getElementById('header-profile-emoji'),
        postCountEl: document.getElementById('post-count'),
        replyCountEl: document.getElementById('reply-count'),
        postsContainer: document.querySelector('.posts-container'),
        fabCreatePost: document.getElementById('fab-create-post'),
        createPostModal: document.getElementById('create-post-modal'),
        setNameModal: document.getElementById('set-name-modal'),
        setNameInput: document.getElementById('set-name-input'),
        setNameBtn: document.getElementById('set-name-btn'),
        newPostTitleInput: document.getElementById('new-post-title-input'),
        newPostContentInput: document.getElementById('new-post-content-input'),
        addPostBtn: document.getElementById('add-post-btn'),
    };
    
    let state = {
        currentUser: null,
        allPosts: [],
        profileCache: {},
        unsubscribePosts: null,
        currentView: 'discussions',
    };

    // --- Authentication & Profile Management ---
    auth.onAuthStateChanged(async user => {
        if (user) await handleUserLogin(user);
        else handleUserLogout();
    });

    const handleUserLogin = async (user) => {
        const profile = await fetchProfile(user.uid, user.email);
        state.currentUser = { uid: user.uid, ...profile };
        if (!state.currentUser.isNameSet) {
            ui.mainApp.classList.add('hidden');
            ui.setNameModal.classList.remove('hidden');
        } else {
            showMainApp();
        }
    };

    const handleUserLogout = () => {
        state.currentUser = null;
        if (state.unsubscribePosts) state.unsubscribePosts();
        ui.mainApp.classList.add('hidden');
        ui.setNameModal.classList.add('hidden');
        ui.loginContainer.classList.remove('hidden');
    };

    const login = async () => {
        const loginId = ui.usernameInput.value.trim();
        if (!/^Student@vh\d{8}$/.test(loginId)) return alert('Invalid ID format.');
        ui.loginBtn.disabled = true;
        ui.loginBtn.textContent = 'Accessing...';
        try {
            const email = `${loginId}@forum.app`;
            const password = `pass_${loginId}`;
            try {
                await auth.signInWithEmailAndPassword(email, password);
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    await auth.createUserWithEmailAndPassword(email, password);
                } else { throw error; }
            }
            localStorage.setItem('forumLoginId', loginId);
        } catch (error) {
            console.error("Login/Signup Error:", error);
            ui.loginBtn.disabled = false;
            ui.loginBtn.textContent = 'Access Forum';
        }
    };
    
    ui.setNameBtn.addEventListener('click', async () => {
        const newName = ui.setNameInput.value.trim();
        if (newName.length < 3) return alert('Name must be at least 3 characters.');
        await db.collection('profiles').doc(state.currentUser.uid).update({
            displayName: newName,
            isNameSet: true
        });
        state.currentUser.displayName = newName;
        state.currentUser.isNameSet = true;
        showMainApp();
    });

    // --- Data Fetching & Caching ---
    const fetchProfile = async (uid, loginId) => {
        if (state.profileCache[uid]) return state.profileCache[uid];
        const docRef = db.collection('profiles').doc(uid);
        let doc = await docRef.get();
        if (!doc.exists) {
            await docRef.set({ loginId: loginId.split('@')[0], displayName: 'New User', emoji: '👤', isNameSet: false });
            doc = await docRef.get();
        }
        state.profileCache[uid] = doc.data();
        return state.profileCache[uid];
    };

    const listenForPosts = () => {
        if (state.unsubscribePosts) state.unsubscribePosts();
        state.unsubscribePosts = db.collection('posts').orderBy('createdAt', 'desc')
            .onSnapshot(querySnapshot => {
                state.allPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                refreshCurrentView();
                updateSidebarStats();
            });
    };
    
    // --- UI Rendering ---
    const showMainApp = () => {
        ui.sidebarUsername.textContent = state.currentUser.displayName;
        ui.sidebarLoginId.textContent = state.currentUser.loginId;
        ui.profileEmoji.textContent = state.currentUser.emoji;
        ui.headerProfileEmoji.textContent = state.currentUser.emoji;
        ui.setNameModal.classList.add('hidden');
        ui.loginContainer.classList.add('hidden');
        ui.mainApp.classList.remove('hidden');
        listenForPosts();
    };

    const renderPosts = async (postsToRender) => {
        ui.postsContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Loading posts...</p>';
        if (!postsToRender || postsToRender.length === 0) {
            ui.postsContainer.innerHTML = `<p style="text-align:center; padding: 40px; color: var(--text-secondary);">No posts found for this view.</p>`;
            return;
        }
        const postsHtml = await Promise.all(postsToRender.map(createPostHTML));
        ui.postsContainer.innerHTML = postsHtml.join('');
    };

    const createReplyHTML = async (reply) => {
        const replierProfile = await fetchProfile(reply.authorId);
        return `
            <div class="reply-card" data-reply-id="${reply.id}">
                <div class="reply-avatar">${replierProfile.emoji}</div>
                <div class="reply-content">
                    <p class="reply-author">${replierProfile.displayName}</p>
                    <p>${reply.text}</p>
                    <div class="reply-actions">
                        <a href="#" data-action="toggle-nested-reply">Reply</a>
                    </div>
                    <div class="nested-replies hidden"></div>
                    <div class="reply-input-box hidden" data-action="nested-reply-box">
                        <input type="text" placeholder="Write a reply..." class="nested-reply-input">
                        <button data-action="add-nested-reply">Send</button>
                    </div>
                </div>
            </div>`;
    };

    const createPostHTML = async (post) => {
        const authorProfile = await fetchProfile(post.authorId);
        const replies = post.replies || [];
        const likes = post.likes || [];
        let repliesHtml = '';
        for (const reply of replies) repliesHtml += await createReplyHTML(reply);
        
        return `
            <div class="post-card" data-post-id="${post.id}">
                ${post.authorId === state.currentUser.uid ? `<button class="delete-post-btn" data-action="delete-post" title="Delete Post"><i class="fas fa-trash"></i></button>` : ''}
                <div class="post-header">
                    <div class="post-avatar">${authorProfile.emoji}</div>
                    <div><div class="post-author">${authorProfile.displayName}</div></div>
                    <div class="post-time">${post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : ''}</div>
                </div>
                <div class="post-body"><h3>${post.title}</h3><p>${post.content}</p></div>
                <div class="post-footer">
                    <button class="action-btn" data-action="like" ${!state.currentUser.isNameSet ? 'disabled' : ''}><i class="far fa-thumbs-up"></i><span>${likes.length}</span></button>
                </div>
                <div class="replies-section">${repliesHtml}<div class="reply-input-box"><input type="text" placeholder="Add a comment..." class="reply-input"><button data-action="add-reply" ${!state.currentUser.isNameSet ? 'disabled' : ''}>Reply</button></div></div>
            </div>`;
    };

    const updateSidebarStats = () => { /* ... same as before ... */ };
    const refreshCurrentView = () => { /* ... same as before ... */ };

    // --- Event Listeners & Interactivity ---
    ui.logoutBtn.addEventListener('click', () => auth.signOut());
    
    ui.clearHistoryBtn.addEventListener('click', () => {
        if(confirm('This will log you out and clear your login ID from this device. Your account will NOT be deleted. Continue?')) {
            localStorage.removeItem('forumLoginId');
            auth.signOut();
        }
    });

    ui.postsContainer.addEventListener('click', async e => {
        e.preventDefault();
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const postCard = e.target.closest('.post-card');
        const postId = postCard.dataset.postId;
        const postRef = db.collection('posts').doc(postId);

        switch (action) {
            case 'delete-post':
                if (confirm('Are you sure you want to delete this post?')) await postRef.delete();
                break;
            case 'like':
                // like/dislike logic here
                break;
            case 'add-reply':
                const replyInput = postCard.querySelector('.reply-input');
                const text = replyInput.value.trim();
                if (text) {
                    const newReply = { id: db.collection('posts').doc().id, authorId: state.currentUser.uid, text, replies: [] };
                    await postRef.update({ replies: firebase.firestore.FieldValue.arrayUnion(newReply) });
                }
                break;
            case 'toggle-nested-reply':
                target.closest('.reply-content').querySelector('[data-action="nested-reply-box"]').classList.toggle('hidden');
                break;
        }
    });

    document.getElementById('generate-btn').addEventListener('click', () => { usernameInput.value = `Student@vh${Math.floor(10000000 + Math.random() * 90000000)}`; loginBtn.disabled = false; });
    loginBtn.addEventListener('click', login);
    logoutBtn.addEventListener('click', logout);
    fabCreatePost.addEventListener('click', () => createPostModal.classList.remove('hidden'));
    closeModalBtn.addEventListener('click', () => createPostModal.classList.add('hidden'));
    const toggleSidebar = () => sidebar.classList.toggle('open');
    document.getElementById('menu-btn').addEventListener('click', toggleSidebar);
    document.getElementById('close-sidebar-btn').addEventListener('click', toggleSidebar);
    document.getElementById('user-profile-btn').addEventListener('click', toggleSidebar);
});

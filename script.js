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
        generateBtn: document.getElementById('generate-btn'),
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
        closeModalBtns: document.querySelectorAll('.close-btn'),
        menuBtn: document.getElementById('menu-btn'),
        closeSidebarBtn: document.getElementById('close-sidebar-btn'),
        userProfileBtn: document.getElementById('user-profile-btn')
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
        if (user) {
            await handleUserLogin(user);
        } else {
            handleUserLogout();
        }
    });

    const handleUserLogin = async (user) => {
        const profile = await fetchProfile(user.uid);
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
        const savedLoginId = localStorage.getItem('forumLoginId');
        if (savedLoginId) {
            ui.usernameInput.value = savedLoginId;
            ui.loginBtn.disabled = false;
        } else {
            ui.usernameInput.value = '';
            ui.loginBtn.disabled = true;
        }
    };

    const login = async () => {
        const loginId = ui.usernameInput.value.trim();
        if (!/^Student@vh\d{8}$/.test(loginId)) return alert('Invalid ID format.');
        ui.loginBtn.disabled = true;
        ui.loginBtn.textContent = 'Accessing...';
        
        try {
            // Check if user is already logged in, if not, sign in anonymously
            if (!auth.currentUser) {
                await auth.signInAnonymously();
            }
            // Now that we are sure user is logged in, we create their profile
            await fetchProfile(auth.currentUser.uid, loginId);

            localStorage.setItem('forumLoginId', loginId);
            // onAuthStateChanged will handle showing the app
        } catch (error) {
            console.error("Login Error:", error);
            alert(`Login Failed: ${error.message}`);
        } finally {
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
    const fetchProfile = async (uid, loginId = null) => {
        if (state.profileCache[uid]) return state.profileCache[uid];
        const docRef = db.collection('profiles').doc(uid);
        let doc = await docRef.get();
        if (!doc.exists && loginId) {
            await docRef.set({
                loginId: loginId,
                displayName: 'New User',
                emoji: '👤',
                isNameSet: false
            });
            doc = await docRef.get();
        } else if (!doc.exists) {
            return { displayName: 'Unknown', emoji: '?' };
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
            }, err => console.error("Error listening for posts:", err));
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
        for (const reply of replies) {
            repliesHtml += await createReplyHTML(reply);
        }
        
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

    const updateSidebarStats = () => {
        if (!state.currentUser) return;
        ui.postCountEl.textContent = state.allPosts.filter(p => p.authorId === state.currentUser.uid).length;
        ui.replyCountEl.textContent = state.allPosts.reduce((acc, p) => acc + (p.replies || []).filter(r => r.authorId === state.currentUser.uid).length, 0);
    };

    const refreshCurrentView = () => {
        const link = document.querySelector(`.sidebar-nav a[data-page="${state.currentView}"]`);
        if (link) link.click();
    };

    // --- Event Listeners & Interactivity ---
    ui.generateBtn.addEventListener('click', () => {
        ui.usernameInput.value = `Student@vh${Math.floor(10000000 + Math.random() * 90000000)}`;
        ui.loginBtn.disabled = false;
    });

    ui.usernameInput.addEventListener('input', () => {
        ui.loginBtn.disabled = !/^Student@vh\d{8}$/.test(ui.usernameInput.value);
    });

    ui.loginBtn.addEventListener('click', login);
    ui.logoutBtn.addEventListener('click', () => auth.signOut());
    
    ui.clearHistoryBtn.addEventListener('click', () => {
        if(confirm('This will log you out and clear your login ID from this device. Your account will NOT be deleted. Continue?')) {
            localStorage.removeItem('forumLoginId');
            auth.signOut();
        }
    });

    ui.profileAvatar.addEventListener('click', async () => {
        const newEmoji = prompt('Enter a single emoji for your profile:', ui.profileEmoji.textContent);
        if (newEmoji) {
            const emoji = newEmoji.slice(0, 2);
            ui.profileEmoji.textContent = emoji;
            ui.headerProfileEmoji.textContent = emoji;
            await db.collection('profiles').doc(state.currentUser.uid).update({ emoji });
            state.profileCache[state.currentUser.uid].emoji = emoji;
        }
    });

    ui.addPostBtn.addEventListener('click', async () => {
        const title = ui.newPostTitleInput.value.trim();
        const content = ui.newPostContentInput.value.trim();
        if (!title || !content) return;
        await db.collection('posts').add({
            title, content, authorId: state.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            likes: [], replies: []
        });
        ui.newPostTitleInput.value = '';
        ui.newPostContentInput.value = '';
        ui.createPostModal.classList.add('hidden');
    });

    ui.sidebarNav.addEventListener('click', (e) => {
        e.preventDefault();
        const link = e.target.closest('a');
        if (!link || link.id === 'logout-btn' || link.id === 'clear-history-btn') return;
        ui.sidebarNav.querySelectorAll('a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');
        state.currentView = link.dataset.page;
        switch (state.currentView) {
            case 'discussions': renderPosts(state.allPosts); break;
            case 'my-posts': renderPosts(state.allPosts.filter(p => p.authorId === state.currentUser.uid)); break;
            case 'my-replies': renderPosts(state.allPosts.filter(p => (p.replies || []).some(r => r.authorId === state.currentUser.uid))); break;
        }
        if (window.innerWidth <= 1024) ui.sidebar.classList.remove('open');
    });

    ui.postsContainer.addEventListener('click', async e => {
        e.preventDefault();
        const target = e.target.closest('[data-action]');
        if (!target || (target.tagName === 'BUTTON' && target.disabled)) return;

        const action = target.dataset.action;
        const postCard = e.target.closest('.post-card');
        const postId = postCard.dataset.postId;
        const postRef = db.collection('posts').doc(postId);

        switch (action) {
            case 'delete-post':
                if (confirm('Are you sure you want to delete this post?')) await postRef.delete();
                break;
            case 'like':
                postRef.update({ likes: firebase.firestore.FieldValue.arrayUnion(state.currentUser.uid) });
                break;
            case 'add-reply':
                const replyInput = postCard.querySelector('.reply-input');
                const text = replyInput.value.trim();
                if (text) {
                    const newReply = { id: db.collection('posts').doc().id, authorId: state.currentUser.uid, text };
                    await postRef.update({ replies: firebase.firestore.FieldValue.arrayUnion(newReply) });
                }
                break;
            case 'toggle-nested-reply':
                target.closest('.reply-content').querySelector('[data-action="nested-reply-box"]').classList.toggle('hidden');
                break;
        }
    });

    ui.fabCreatePost.addEventListener('click', () => {
        if (!state.currentUser.isNameSet) return alert('Please set your display name first to create a post.');
        ui.createPostModal.classList.remove('hidden');
    });
    ui.closeModalBtns.forEach(btn => btn.addEventListener('click', () => {
        ui.createPostModal.classList.add('hidden');
        ui.setNameModal.classList.add('hidden');
    }));
    
    const toggleSidebar = () => ui.sidebar.classList.toggle('open');
    ui.menuBtn.addEventListener('click', toggleSidebar);
    ui.closeSidebarBtn.addEventListener('click', toggleSidebar);
    ui.userProfileBtn.addEventListener('click', toggleSidebar);
});

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

    // Firebase Initialize
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();

    // DOM Selections
    const loginContainer = document.getElementById('login-container');
    const mainApp = document.getElementById('main-app');
    const usernameInput = document.getElementById('username-input');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarNav = document.getElementById('sidebar-nav');
    const sidebarUsername = document.getElementById('sidebar-username');
    const profileAvatar = document.getElementById('profile-avatar');
    const profileEmoji = document.getElementById('profile-emoji');
    const postCountEl = document.getElementById('post-count');
    const replyCountEl = document.getElementById('reply-count');
    const postsContainer = document.querySelector('.posts-container');
    const searchInput = document.getElementById('search-input');
    const searchSuggestionsContainer = document.getElementById('search-suggestions-container');
    const fabCreatePost = document.getElementById('fab-create-post');
    const createPostModal = document.getElementById('create-post-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addPostBtn = document.getElementById('add-post-btn');
    const newPostTitleInput = document.getElementById('new-post-title-input');
    const newPostContentInput = document.getElementById('new-post-content-input');
    
    // App State
    let currentUser = null;
    let allPosts = [];
    let profileCache = {};
    let unsubscribePosts = null;
    let currentView = 'discussions';

    // --- Authentication (FIXED & IMPROVED) ---
    auth.onAuthStateChanged(async user => {
        if (user && user.displayName) {
            currentUser = { uid: user.uid, displayName: user.displayName };
            await fetchProfile(currentUser.uid); // Cache profile
            showMainApp();
        } else {
            // No user or user has no displayName, show login
            currentUser = null;
            mainApp.classList.add('hidden');
            loginContainer.classList.remove('hidden');
            // Try to auto-fill username from localStorage
            const savedUsername = localStorage.getItem('forumUsername');
            if (savedUsername) {
                usernameInput.value = savedUsername;
                loginBtn.disabled = false;
            }
            if (unsubscribePosts) unsubscribePosts();
        }
    });

    const login = async () => {
        const username = usernameInput.value.trim();
        if (!/^Student@vh\d{8}$/.test(username)) return alert('Invalid username format.');
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        
        try {
            // Step 1: Sign in anonymously
            const userCredential = await auth.signInAnonymously();
            const user = userCredential.user;

            // Step 2: Update the profile with displayName
            await user.updateProfile({ displayName: username });
            
            // Step 3: Create the profile document in Firestore
            await db.collection('profiles').doc(user.uid).set({
                displayName: username,
                emoji: '👤'
            }, { merge: true });

            // Step 4: Save username for auto-login next time
            localStorage.setItem('forumUsername', username);
            // The onAuthStateChanged listener will automatically handle showing the app.
        } catch (error) {
            console.error("Login Error:", error);
            alert("Failed to login. Please check console for details.");
            loginBtn.disabled = false;
            loginBtn.textContent = 'Access Forum';
        }
    };
    
    const logout = async () => {
        const user = auth.currentUser;
        if(user){
            // Optional: Delete anonymous user to keep your auth list clean
            // Be careful with this in production if you want users to "recover" accounts
            await db.collection('profiles').doc(user.uid).delete();
            await user.delete();
        }
        localStorage.removeItem('forumUsername');
        // onAuthStateChanged will handle the UI update
    };

    // --- Data Fetching & Caching (IMPROVED) ---
    const fetchProfile = async (uid) => {
        if (profileCache[uid]) return profileCache[uid];
        try {
            const doc = await db.collection('profiles').doc(uid).get();
            if (doc.exists) {
                profileCache[uid] = doc.data();
                return profileCache[uid];
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
        return { displayName: 'Unknown', emoji: '?' }; // Fallback
    };
    
    // The rest of the functions (listenForPosts, showMainApp, renderPosts, etc.)
    // are the same as the previous version. They are included here for completeness.

    const showMainApp = () => {
        sidebarUsername.textContent = currentUser.displayName;
        profileEmoji.textContent = (profileCache[currentUser.uid] && profileCache[currentUser.uid].emoji) || '👤';
        loginContainer.classList.add('hidden');
        mainApp.classList.remove('hidden');
        listenForPosts();
    };

    const listenForPosts = () => {
        if (unsubscribePosts) unsubscribePosts();
        unsubscribePosts = db.collection('posts').orderBy('createdAt', 'desc')
            .onSnapshot(querySnapshot => {
                allPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                refreshCurrentView();
                updateSidebarStats();
            }, err => console.error("Error listening for posts:", err));
    };

    const renderPosts = async (postsToRender) => {
        postsContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Loading posts...</p>';
        if (!postsToRender || postsToRender.length === 0) {
            postsContainer.innerHTML = `<p style="text-align:center; padding: 40px; color: var(--text-secondary);">No posts found for this view.</p>`;
            return;
        }
        const postsHtml = await Promise.all(postsToRender.map(createPostHTML));
        postsContainer.innerHTML = postsHtml.join('');
    };

    const createPostHTML = async (post) => {
        const authorProfile = await fetchProfile(post.authorId);
        const replies = post.replies || [];
        const likes = post.likes || [];
        const dislikes = post.dislikes || [];
        
        let repliesHtml = '';
        for (const reply of replies) {
            const replierProfile = await fetchProfile(reply.authorId);
            repliesHtml += `<div class="reply-card"><div class="reply-avatar">${replierProfile.emoji}</div><div class="reply-content"><p class="reply-author">${replierProfile.displayName}</p><p>${reply.text}</p></div></div>`;
        }

        return `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-avatar">${authorProfile.emoji}</div>
                    <div><div class="post-author">${authorProfile.displayName}</div></div>
                    <div class="post-time">${post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString() : '...'}</div>
                </div>
                <div class="post-body"><h3>${post.title}</h3><p>${post.content}</p></div>
                <div class="post-footer">
                    <button class="action-btn ${likes.includes(currentUser.uid) ? 'active' : ''}" data-action="like"><i class="far fa-thumbs-up"></i><span>${likes.length}</span></button>
                    <button class="action-btn ${dislikes.includes(currentUser.uid) ? 'active' : ''}" data-action="dislike"><i class="far fa-thumbs-down"></i><span>${dislikes.length}</span></button>
                    <button class="action-btn" data-action="toggle-reply"><i class="far fa-comment-dots"></i><span>${replies.length} Replies</span></button>
                </div>
                <div class="replies-section hidden">${repliesHtml}<div class="reply-input-box"><input type="text" placeholder="Add a reply..." class="reply-input"><button class="add-reply-btn" data-action="add-reply">Reply</button></div></div>
            </div>`;
    };

    const updateSidebarStats = () => {
        if (!currentUser || allPosts.length === 0) return;
        postCountEl.textContent = allPosts.filter(p => p.authorId === currentUser.uid).length;
        replyCountEl.textContent = allPosts.reduce((acc, p) => acc + (p.replies || []).filter(r => r.authorId === currentUser.uid).length, 0);
    };

    const refreshCurrentView = () => {
        const link = document.querySelector(`.sidebar-nav a[data-page="${currentView}"]`);
        if (link) link.click();
    };

    profileAvatar.addEventListener('click', async () => {
        const newEmoji = prompt('Enter a single emoji for your profile:', profileEmoji.textContent);
        if (newEmoji) {
            const emoji = newEmoji.slice(0, 2);
            profileEmoji.textContent = emoji;
            await db.collection('profiles').doc(currentUser.uid).update({ emoji });
            profileCache[currentUser.uid].emoji = emoji;
        }
    });

    addPostBtn.addEventListener('click', async () => {
        const title = newPostTitleInput.value.trim();
        const content = newPostContentInput.value.trim();
        if (!title || !content) return;
        await db.collection('posts').add({
            title, content, authorId: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            likes: [], dislikes: [], replies: []
        });
        newPostTitleInput.value = '';
        newPostContentInput.value = '';
        createPostModal.classList.add('hidden');
    });

    sidebarNav.addEventListener('click', (e) => {
        e.preventDefault();
        const link = e.target.closest('a');
        if (!link || link.id === 'logout-btn') return;
        sidebarNav.querySelectorAll('a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');
        currentView = link.dataset.page;
        switch (currentView) {
            case 'discussions': renderPosts(allPosts); break;
            case 'my-posts': renderPosts(allPosts.filter(p => p.authorId === currentUser.uid)); break;
            case 'my-replies': renderPosts(allPosts.filter(p => (p.replies || []).some(r => r.authorId === currentUser.uid))); break;
        }
        if (window.innerWidth <= 1024) sidebar.classList.remove('open');
    });

    postsContainer.addEventListener('click', async e => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        const postCard = e.target.closest('.post-card');
        const postId = postCard.dataset.postId;
        const action = button.dataset.action;
        const postRef = db.collection('posts').doc(postId);

        switch (action) {
            case 'like': postRef.update({ likes: firebase.firestore.FieldValue.arrayUnion(currentUser.uid), dislikes: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) }); break;
            case 'dislike': postRef.update({ dislikes: firebase.firestore.FieldValue.arrayUnion(currentUser.uid), likes: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) }); break;
            case 'toggle-reply': postCard.querySelector('.replies-section').classList.toggle('hidden'); break;
            case 'add-reply':
                const replyInput = postCard.querySelector('.reply-input');
                const text = replyInput.value.trim();
                if (text) {
                    await postRef.update({ replies: firebase.firestore.FieldValue.arrayUnion({ authorId: currentUser.uid, text, createdAt: new Date() }) });
                    replyInput.value = '';
                }
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

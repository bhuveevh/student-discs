document.addEventListener('DOMContentLoaded', () => {
    // --- STEP 1: Paste your Firebase config here ---
    const firebaseConfig = {
        apiKey: "AIzaSyDox5At1sNhQXF27r_WU0RePiwxhihmKxo",
  authDomain: "student-discs.firebaseapp.com",
  projectId: "student-discs",
  storageBucket: "student-discs.firebasestorage.app",
  messagingSenderId: "254221122813",
  appId: "1:254221122813:web:46f2fdff4a50ad3c1b9294",
    };

    // --- Initialize Firebase ---
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();

    // --- DOM Selections (same as before) ---
    const loginContainer = document.getElementById('login-container');
    const mainApp = document.getElementById('main-app');
    const usernameInput = document.getElementById('username-input');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const sidebarUsername = document.getElementById('sidebar-username');
    const profileAvatar = document.getElementById('profile-avatar');
    const profileEmoji = document.getElementById('profile-emoji');
    const postsContainer = document.querySelector('.posts-container');
    const fabCreatePost = document.getElementById('fab-create-post');
    const createPostModal = document.getElementById('create-post-modal');
    // ... other selections
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addPostBtn = document.getElementById('add-post-btn');
    const newPostTitleInput = document.getElementById('new-post-title-input');
    const newPostContentInput = document.getElementById('new-post-content-input');
    const sidebarNav = document.getElementById('sidebar-nav');
    const postCountEl = document.getElementById('post-count');
    const replyCountEl = document.getElementById('reply-count');


    // --- App State (now managed by Firebase) ---
    let currentUser = null; // Will hold { uid, displayName }
    let allPosts = [];
    let unsubscribePosts = null; // To stop listening to post updates on logout

    // --- Authentication ---
    auth.onAuthStateChanged(user => {
        if (user && user.displayName) {
            // User is signed in.
            currentUser = { uid: user.uid, displayName: user.displayName };
            showMainApp();
        } else {
            // User is signed out.
            currentUser = null;
            mainApp.classList.add('hidden');
            loginContainer.classList.remove('hidden');
            if (unsubscribePosts) unsubscribePosts(); // Stop listening
        }
    });

    const login = async () => {
        const username = usernameInput.value.trim();
        if (!/^Student@vh\d{8}$/.test(username)) {
            alert('Invalid username format.');
            return;
        }
        try {
            await auth.signInAnonymously();
            await auth.currentUser.updateProfile({ displayName: username });
            // The onAuthStateChanged listener will handle showing the app
        } catch (error) {
            console.error("Login Error:", error);
            alert("Failed to login.");
        }
    };

    logoutBtn.addEventListener('click', () => auth.signOut());

    // --- Core UI & Data Fetching ---
    const showMainApp = () => {
        sidebarUsername.textContent = currentUser.displayName;
        loginContainer.classList.add('hidden');
        mainApp.classList.remove('hidden');
        fetchUserProfile();
        listenForPosts(); // Start listening for real-time post updates
    };

    const fetchUserProfile = async () => {
        const userDoc = await db.collection('profiles').doc(currentUser.uid).get();
        if (userDoc.exists) {
            profileEmoji.textContent = userDoc.data().emoji || '👤';
        } else {
            profileEmoji.textContent = '👤';
        }
    };
    
    // REAL-TIME POST LISTENER
    const listenForPosts = () => {
        unsubscribePosts = db.collection('posts').orderBy('createdAt', 'desc')
            .onSnapshot(querySnapshot => {
                allPosts = [];
                querySnapshot.forEach(doc => {
                    allPosts.push({ id: doc.id, ...doc.data() });
                });
                renderPosts(allPosts); // Render all posts initially
                updateSidebarStats();
            });
    };

    const renderPosts = (postsToRender) => {
        // This function is mostly the same, but it gets avatar from a helper
        if (!postsToRender || postsToRender.length === 0) {
            postsContainer.innerHTML = `<p style="text-align:center; padding: 40px; color: var(--text-secondary);">No posts here. Start a discussion!</p>`;
            return;
        }
        postsContainer.innerHTML = ''; // Clear previous
        postsToRender.forEach(async post => {
            const postCardHTML = await createPostHTML(post);
            postsContainer.innerHTML += postCardHTML;
        });
    };

    const createPostHTML = async (post) => {
        // Asynchronous because it needs to fetch profile data
        const postAuthorProfile = await getProfile(post.authorId);
        const postAuthorName = postAuthorProfile.displayName;
        const postAvatar = postAuthorProfile.emoji || postAuthorName.substring(0,2).toUpperCase();
        
        // This part is the same as before
        const isLiked = post.likes && post.likes.includes(currentUser.uid);
        const isDisliked = post.dislikes && post.dislikes.includes(currentUser.uid);
        const likesCount = post.likes ? post.likes.length : 0;
        const dislikesCount = post.dislikes ? post.dislikes.length : 0;

        return `<div class="post-card" data-post-id="${post.id}"><div class="post-header"><div class="post-avatar">${postAvatar}</div><div><div class="post-author">${postAuthorName}</div></div></div><div class="post-body"><h3>${post.title}</h3><p>${post.content}</p></div><div class="post-footer"><button class="action-btn ${isLiked ? 'active' : ''}" data-action="like"><i class="far fa-thumbs-up"></i><span>${likesCount}</span></button><button class="action-btn ${isDisliked ? 'active' : ''}" data-action="dislike"><i class="far fa-thumbs-down"></i><span>${dislikesCount}</span></button></div></div>`;
    };

    const getProfile = async (uid) => {
        // Helper to get user profile data on demand
        const doc = await db.collection('profiles').doc(uid).get();
        if (doc.exists) return doc.data();
        // Fallback if profile somehow doesn't exist
        const user = await auth.getUser(uid); // This needs admin SDK, simplified for client
        return { displayName: 'Unknown User', emoji: '?' };
    };

    const updateSidebarStats = () => {
        if (!currentUser) return;
        postCountEl.textContent = allPosts.filter(p => p.authorId === currentUser.uid).length;
        // Reply count is more complex with Firestore, simplified for now
        replyCountEl.textContent = '...';
    };


    // --- Interactivity (Likes, New Posts, etc.) ---
    profileAvatar.addEventListener('click', async () => {
        const newEmoji = prompt('Enter a single emoji for your profile:', profileEmoji.textContent);
        if (newEmoji) {
            profileEmoji.textContent = newEmoji.slice(0, 2);
            await db.collection('profiles').doc(currentUser.uid).set({
                emoji: newEmoji.slice(0, 2),
                displayName: currentUser.displayName
            }, { merge: true });
        }
    });

    addPostBtn.addEventListener('click', async () => {
        const title = newPostTitleInput.value.trim();
        const content = newPostContentInput.value.trim();
        if (!title || !content) return;

        try {
            await db.collection('posts').add({
                title: title,
                content: content,
                authorId: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                likes: [],
                dislikes: []
            });
            newPostTitleInput.value = '';
            newPostContentInput.value = '';
            createPostModal.classList.add('hidden');
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    });
    
    postsContainer.addEventListener('click', async (e) => {
        const button = e.target.closest('.action-btn');
        if (!button) return;
        const postCard = e.target.closest('.post-card');
        const postId = postCard.dataset.postId;
        const action = button.dataset.action;
        const postRef = db.collection('posts').doc(postId);

        if (action === 'like') {
            const doc = await postRef.get();
            const likes = doc.data().likes || [];
            if (likes.includes(currentUser.uid)) {
                await postRef.update({ likes: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
            } else {
                await postRef.update({ likes: firebase.firestore.FieldValue.arrayUnion(currentUser.uid), dislikes: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
            }
        }
        // Similar logic for dislike
    });

    // --- Boilerplate Listeners ---
    document.getElementById('generate-btn').addEventListener('click', () => { usernameInput.value = `Student@vh${Math.floor(10000000 + Math.random() * 90000000)}`; loginBtn.disabled = false; });
    loginBtn.addEventListener('click', login);
    fabCreatePost.addEventListener('click', () => createPostModal.classList.remove('hidden'));
    closeModalBtn.addEventListener('click', () => createPostModal.classList.add('hidden'));

});

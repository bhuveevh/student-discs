document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selections ---
    const loginContainer = document.getElementById('login-container');
    const mainApp = document.getElementById('main-app');
    const usernameInput = document.getElementById('username-input');
    const generateBtn = document.getElementById('generate-btn');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const resetDataBtn = document.getElementById('reset-data-btn');
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menu-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const userProfileBtn = document.getElementById('user-profile-btn');
    const sidebarUsername = document.getElementById('sidebar-username');
    const sidebarNav = document.getElementById('sidebar-nav');
    const postsContainer = document.querySelector('.posts-container');
    const newPostTitleInput = document.getElementById('new-post-title-input');
    const newPostContentInput = document.getElementById('new-post-content-input');
    const addPostBtn = document.getElementById('add-post-btn');
    const postCountEl = document.getElementById('post-count');
    const replyCountEl = document.getElementById('reply-count');
    
    // --- App State & Data Management ---
    let currentUser = null;
    let allPosts = [];
    let userActions = { likedPosts: [], dislikedPosts: [] };

    const samplePosts = [
        { id: 1, author: 'RiyaSharma', avatar: 'RS', time: '2 hours ago', title: 'Which programming language is best for a beginner in 2024?', content: 'I am new to coding...', replies: [], likes: 42, dislikes: 3 },
        { id: 2, author: 'AmitSingh', avatar: 'AS', time: '5 hours ago', title: 'Need help with my final year project idea!', content: 'I am in my final year...', replies: [], likes: 67, dislikes: 1 },
    ];
    
    // Function to load data from localStorage
    const loadData = () => {
        const savedPosts = localStorage.getItem('forumPosts');
        const savedActions = localStorage.getItem('forumUserActions');
        
        if (savedPosts) {
            allPosts = JSON.parse(savedPosts);
        } else {
            allPosts = samplePosts; // Load sample posts if nothing is saved
        }
        
        if (savedActions) {
            userActions = JSON.parse(savedActions);
        }
        saveData(); // Save initial data if it was empty
    };

    // Function to save data to localStorage
    const saveData = () => {
        localStorage.setItem('forumPosts', JSON.stringify(allPosts));
        localStorage.setItem('forumUserActions', JSON.stringify(userActions));
    };

    // --- User Authentication & Session ---
    const usernameRegex = /^Student@vh\d{8}$/;
    
    const login = (username) => {
        localStorage.setItem('forumUsername', username);
        currentUser = username;
        showMainApp(username);
    };
    
    const logout = () => {
        localStorage.removeItem('forumUsername');
        currentUser = null;
        mainApp.classList.add('hidden');
        loginContainer.classList.remove('hidden');
        usernameInput.value = '';
        loginBtn.disabled = true;
    };
    
    const checkLoginStatus = () => {
        loadData();
        const savedUsername = localStorage.getItem('forumUsername');
        if (savedUsername) {
            login(savedUsername);
        } else {
            mainApp.classList.add('hidden');
            loginContainer.classList.remove('hidden');
        }
    };
    
    // --- UI Rendering ---
    const showMainApp = (username) => {
        loginContainer.classList.add('hidden');
        mainApp.classList.remove('hidden');
        sidebarUsername.textContent = username;
        renderPosts(allPosts);
        updateSidebarStats();
    };

    const createReplyHTML = (reply) => {
        return `
            <div class="reply-card">
                <div class="reply-avatar">${reply.author.substring(0, 2).toUpperCase()}</div>
                <div class="reply-content">
                    <p class="reply-author">${reply.author}</p>
                    <p>${reply.text}</p>
                </div>
            </div>
        `;
    };

    const createPostHTML = (post) => {
        const isLiked = userActions.likedPosts.includes(post.id);
        const isDisliked = userActions.dislikedPosts.includes(post.id);
        const repliesHTML = post.replies.map(createReplyHTML).join('');

        return `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-avatar">${post.avatar}</div>
                    <div><div class="post-author">${post.author}</div></div>
                    <div class="post-time">${post.time}</div>
                </div>
                <div class="post-body"><h3>${post.title}</h3><p>${post.content}</p></div>
                <div class="post-footer">
                    <button class="action-btn ${isLiked ? 'active' : ''}" data-action="like"><i class="far fa-thumbs-up"></i><span>${post.likes}</span></button>
                    <button class="action-btn ${isDisliked ? 'active' : ''}" data-action="dislike"><i class="far fa-thumbs-down"></i><span>${post.dislikes}</span></button>
                    <button class="action-btn" data-action="toggle-reply"><i class="far fa-comment-dots"></i><span>${post.replies.length} Replies</span></button>
                </div>
                <div class="replies-section hidden">
                    ${repliesHTML}
                    <div class="reply-input-box">
                        <input type="text" placeholder="Add a reply..." class="reply-input">
                        <button class="add-reply-btn" data-action="add-reply">Reply</button>
                    </div>
                </div>
            </div>`;
    };

    const renderPosts = (postsToRender) => {
        if (!postsToRender || postsToRender.length === 0) {
            postsContainer.innerHTML = `<p style="text-align:center; color: var(--text-secondary);">No posts found. Start a new discussion!</p>`;
        } else {
            postsContainer.innerHTML = postsToRender.map(createPostHTML).join('');
        }
    };

    const updateSidebarStats = () => {
        const userPosts = allPosts.filter(p => p.author === currentUser);
        const userReplies = allPosts.reduce((acc, post) => {
            return acc + post.replies.filter(r => r.author === currentUser).length;
        }, 0);
        postCountEl.textContent = userPosts.length;
        replyCountEl.textContent = userReplies;
    };

    // --- Event Handlers & Interactivity ---
    
    // Add New Post
    addPostBtn.addEventListener('click', () => {
        const title = newPostTitleInput.value.trim();
        const content = newPostContentInput.value.trim();
        if (!title || !content) {
            alert('Please provide both a title and content for your post.');
            return;
        }

        const newPost = {
            id: Date.now(), // Unique ID based on timestamp
            author: currentUser,
            avatar: currentUser.substring(0, 2).toUpperCase(),
            time: 'Just now',
            title: title,
            content: content,
            replies: [],
            likes: 0,
            dislikes: 0,
        };
        allPosts.unshift(newPost); // Add to the beginning of the array
        saveData();
        renderPosts(allPosts);
        updateSidebarStats();
        newPostTitleInput.value = '';
        newPostContentInput.value = '';
    });

    // Handle clicks inside posts container (like, dislike, reply)
    postsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const action = button.dataset.action;
        const postCard = e.target.closest('.post-card');
        const postId = parseInt(postCard.dataset.postId);
        const post = allPosts.find(p => p.id === postId);

        switch(action) {
            case 'like':
                if(userActions.likedPosts.includes(postId)) { // Already liked, so unlike
                    post.likes--;
                    userActions.likedPosts = userActions.likedPosts.filter(id => id !== postId);
                } else { // Not liked, so like
                    post.likes++;
                    userActions.likedPosts.push(postId);
                    if(userActions.dislikedPosts.includes(postId)) { // Was disliked, so undislike
                        post.dislikes--;
                        userActions.dislikedPosts = userActions.dislikedPosts.filter(id => id !== postId);
                    }
                }
                break;
            case 'dislike':
                if(userActions.dislikedPosts.includes(postId)) { // Already disliked, so undislike
                    post.dislikes--;
                    userActions.dislikedPosts = userActions.dislikedPosts.filter(id => id !== postId);
                } else { // Not disliked, so dislike
                    post.dislikes++;
                    userActions.dislikedPosts.push(postId);
                    if(userActions.likedPosts.includes(postId)) { // Was liked, so unlike
                        post.likes--;
                        userActions.likedPosts = userActions.likedPosts.filter(id => id !== postId);
                    }
                }
                break;
            case 'toggle-reply':
                postCard.querySelector('.replies-section').classList.toggle('hidden');
                break;
            case 'add-reply':
                const replyInput = postCard.querySelector('.reply-input');
                const replyText = replyInput.value.trim();
                if(replyText) {
                    const newReply = { author: currentUser, text: replyText };
                    post.replies.push(newReply);
                    replyInput.value = '';
                }
                break;
        }
        saveData();
        renderPosts(allPosts); // Re-render to show changes
        updateSidebarStats();
    });
    
    // Sidebar Navigation
    sidebarNav.addEventListener('click', (e) => {
        e.preventDefault();
        const link = e.target.closest('a');
        if (!link || link.id === 'logout-btn' || link.id === 'reset-data-btn') return;

        sidebarNav.querySelectorAll('a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');

        const page = link.dataset.page;
        if (page === 'discussions') {
            renderPosts(allPosts);
        } else if (page === 'my-posts') {
            const myPosts = allPosts.filter(p => p.author === currentUser);
            renderPosts(myPosts);
        } else {
             postsContainer.innerHTML = `<h2 style="text-align:center; margin-top: 50px; color: var(--text-secondary);">This feature is under development.</h2>`;
        }
    });

    // Reset Data
    resetDataBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all data? This will delete all posts and replies.')) {
            localStorage.removeItem('forumPosts');
            localStorage.removeItem('forumUserActions');
            window.location.reload();
        }
    });
    
    // Initial setup and boilerplate event listeners
    generateBtn.addEventListener('click', () => {
        usernameInput.value = `Student@vh${Math.floor(10000000 + Math.random() * 90000000)}`;
        loginBtn.disabled = false;
    });
    usernameInput.addEventListener('input', () => loginBtn.disabled = !usernameRegex.test(usernameInput.value));
    loginBtn.addEventListener('click', () => login(usernameInput.value));
    logoutBtn.addEventListener('click', logout);
    const toggleSidebar = () => sidebar.classList.toggle('open');
    menuBtn.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('click', toggleSidebar);
    userProfileBtn.addEventListener('click', toggleSidebar);

    // --- Start the App ---
    checkLoginStatus();
});

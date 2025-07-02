document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selections ---
    const loginContainer = document.getElementById('login-container');
    const mainApp = document.getElementById('main-app');
    const usernameInput = document.getElementById('username-input');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const sidebarUsername = document.getElementById('sidebar-username');
    const profileAvatar = document.getElementById('profile-avatar');
    const profileEmoji = document.getElementById('profile-emoji');
    const postsContainer = document.querySelector('.posts-container');
    const searchInput = document.getElementById('search-input');
    const searchSuggestionsContainer = document.getElementById('search-suggestions-container');
    
    // Modal & FAB elements
    const fabCreatePost = document.getElementById('fab-create-post');
    const createPostModal = document.getElementById('create-post-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addPostBtn = document.getElementById('add-post-btn');
    const newPostTitleInput = document.getElementById('new-post-title-input');
    const newPostContentInput = document.getElementById('new-post-content-input');

    // --- App State & Data Management (using localStorage) ---
    let currentUser = null;
    let allPosts = [];
    let userProfiles = {}; // Stores user-specific data like emojis
    let userActions = { likedPosts: [], dislikedPosts: [] };

    // Function to load all data from localStorage
    const loadData = () => {
        allPosts = JSON.parse(localStorage.getItem('forumPosts_v2')) || [];
        userProfiles = JSON.parse(localStorage.getItem('forumUserProfiles_v2')) || {};
        userActions = JSON.parse(localStorage.getItem('forumUserActions_v2')) || { likedPosts: [], dislikedPosts: [] };
        
        // If no posts, load sample data
        if (allPosts.length === 0) {
            allPosts = [
                { id: 1, author: 'RiyaSharma', time: '2 hours ago', title: 'Which programming language is best for a beginner in 2024?', content: 'I am new to coding...', replies: [], likes: 42, dislikes: 3 },
                { id: 2, author: 'AmitSingh', time: '5 hours ago', title: 'Need help with my final year project idea!', content: 'I am in my final year...', replies: [], likes: 67, dislikes: 1 },
            ];
            saveData();
        }
    };

    // Function to save all data to localStorage
    const saveData = () => {
        localStorage.setItem('forumPosts_v2', JSON.stringify(allPosts));
        localStorage.setItem('forumUserProfiles_v2', JSON.stringify(userProfiles));
        localStorage.setItem('forumUserActions_v2', JSON.stringify(userActions));
    };

    // --- Core UI Rendering ---
    const getAvatar = (author) => {
        const profile = userProfiles[author];
        if (profile && profile.emoji) {
            return profile.emoji;
        }
        return author.substring(0, 2).toUpperCase();
    };

    const createPostHTML = (post) => {
        const avatar = getAvatar(post.author);
        const repliesHTML = post.replies.map(reply => `
            <div class="reply-card">
                <div class="reply-avatar">${getAvatar(reply.author)}</div>
                <div class="reply-content">
                    <p class="reply-author">${reply.author}</p>
                    <p>${reply.text}</p>
                </div>
            </div>`).join('');

        return `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-header"><div class="post-avatar">${avatar}</div><div><div class="post-author">${post.author}</div></div><div class="post-time">${post.time}</div></div>
                <div class="post-body"><h3>${post.title}</h3><p>${post.content}</p></div>
                <div class="post-footer">
                    <button class="action-btn ${userActions.likedPosts.includes(post.id) ? 'active' : ''}" data-action="like"><i class="far fa-thumbs-up"></i><span>${post.likes}</span></button>
                    <button class="action-btn ${userActions.dislikedPosts.includes(post.id) ? 'active' : ''}" data-action="dislike"><i class="far fa-thumbs-down"></i><span>${post.dislikes}</span></button>
                    <button class="action-btn" data-action="toggle-reply"><i class="far fa-comment-dots"></i><span>${post.replies.length} Replies</span></button>
                </div>
                <div class="replies-section hidden">${repliesHTML}<div class="reply-input-box"><input type="text" placeholder="Add a reply..." class="reply-input"><button class="add-reply-btn" data-action="add-reply">Reply</button></div></div>
            </div>`;
    };

    const renderPosts = (postsToRender) => {
        if (!postsToRender || postsToRender.length === 0) {
            postsContainer.innerHTML = `<p style="text-align:center; color: var(--text-secondary);">No posts found.</p>`;
        } else {
            postsContainer.innerHTML = postsToRender.map(createPostHTML).join('');
        }
    };
    
    // --- Login, Profile, and Session Management ---
    const showMainApp = (username) => {
        currentUser = username;
        if (!userProfiles[currentUser]) {
            userProfiles[currentUser] = { emoji: '👤' }; // Default emoji
            saveData();
        }
        sidebarUsername.textContent = username;
        profileEmoji.textContent = userProfiles[currentUser].emoji;
        loginContainer.classList.add('hidden');
        mainApp.classList.remove('hidden');
        renderPosts(allPosts);
    };

    profileAvatar.addEventListener('click', () => {
        const newEmoji = prompt('Enter a single emoji for your profile:', userProfiles[currentUser].emoji);
        if (newEmoji) { // Basic validation
            userProfiles[currentUser].emoji = newEmoji.slice(0, 2); // Keep it short
            saveData();
            profileEmoji.textContent = userProfiles[currentUser].emoji;
            renderPosts(allPosts); // Re-render to update all avatars
        }
    });

    // --- Post Creation (Modal Logic) ---
    fabCreatePost.addEventListener('click', () => createPostModal.classList.remove('hidden'));
    closeModalBtn.addEventListener('click', () => createPostModal.classList.add('hidden'));
    createPostModal.addEventListener('click', (e) => {
        if (e.target === createPostModal) createPostModal.classList.add('hidden');
    });

    addPostBtn.addEventListener('click', () => {
        const title = newPostTitleInput.value.trim();
        const content = newPostContentInput.value.trim();
        if (!title || !content) return alert('Please provide both title and content.');
        
        allPosts.unshift({ id: Date.now(), author: currentUser, time: 'Just now', title, content, replies: [], likes: 0, dislikes: 0 });
        saveData();
        renderPosts(allPosts);
        newPostTitleInput.value = '';
        newPostContentInput.value = '';
        createPostModal.classList.add('hidden');
    });

    // --- Advanced Search ---
    const renderSearchSuggestions = (query) => {
        if (!query) {
            searchSuggestionsContainer.classList.add('hidden');
            return;
        }
        const lowerQuery = query.toLowerCase();
        
        // Find matching topics
        const topicSuggestions = allPosts
            .filter(post => post.title.toLowerCase().includes(lowerQuery))
            .map(post => ({ type: 'topic', text: post.title }));

        // Find matching users (unique authors)
        const userSuggestions = [...new Set(allPosts.map(p => p.author))]
            .filter(author => author.toLowerCase().includes(lowerQuery))
            .map(author => ({ type: 'user', text: author }));

        const allSuggestions = [...topicSuggestions, ...userSuggestions];
        if (allSuggestions.length === 0) {
            searchSuggestionsContainer.classList.add('hidden');
            return;
        }

        searchSuggestionsContainer.innerHTML = allSuggestions.map(s => `
            <div class="suggestion-item" data-type="${s.type}" data-text="${s.text}">
                <span class="suggestion-type ${s.type}">${s.type}</span>${s.text}
            </div>`).join('');
        searchSuggestionsContainer.classList.remove('hidden');
    };

    searchInput.addEventListener('input', () => renderSearchSuggestions(searchInput.value));
    
    searchSuggestionsContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.suggestion-item');
        if (!item) return;

        const type = item.dataset.type;
        const text = item.dataset.text;
        searchInput.value = text;
        searchSuggestionsContainer.classList.add('hidden');

        if (type === 'topic') {
            renderPosts(allPosts.filter(p => p.title === text));
        } else if (type === 'user') {
            renderPosts(allPosts.filter(p => p.author === text));
        }
    });

    // --- Post Interactivity (Likes, Dislikes, Replies) ---
    postsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const postCard = e.target.closest('.post-card');
        const postId = parseInt(postCard.dataset.postId);
        const post = allPosts.find(p => p.id === postId);

        // This logic is from the previous version and works perfectly here.
        switch(button.dataset.action) {
            case 'like':
                if(userActions.likedPosts.includes(postId)) { post.likes--; userActions.likedPosts = userActions.likedPosts.filter(id => id !== postId); }
                else { post.likes++; userActions.likedPosts.push(postId); if(userActions.dislikedPosts.includes(postId)) { post.dislikes--; userActions.dislikedPosts = userActions.dislikedPosts.filter(id => id !== postId); } }
                break;
            case 'dislike':
                 if(userActions.dislikedPosts.includes(postId)) { post.dislikes--; userActions.dislikedPosts = userActions.dislikedPosts.filter(id => id !== postId); }
                 else { post.dislikes++; userActions.dislikedPosts.push(postId); if(userActions.likedPosts.includes(postId)) { post.likes--; userActions.likedPosts = userActions.likedPosts.filter(id => id !== postId); } }
                break;
            case 'toggle-reply': postCard.querySelector('.replies-section').classList.toggle('hidden'); break;
            case 'add-reply':
                const replyInput = postCard.querySelector('.reply-input');
                if (replyInput.value.trim()) { post.replies.push({ author: currentUser, text: replyInput.value.trim() }); replyInput.value = ''; }
                break;
        }
        saveData();
        renderPosts(allPosts); // Re-render to show all changes
    });

    // --- Initial Setup & Boilerplate Event Listeners ---
    document.getElementById('generate-btn').addEventListener('click', () => {
        usernameInput.value = `Student@vh${Math.floor(10000000 + Math.random() * 90000000)}`;
        loginBtn.disabled = false;
    });
    usernameInput.addEventListener('input', () => loginBtn.disabled = !/^Student@vh\d{8}$/.test(usernameInput.value));
    loginBtn.addEventListener('click', () => showMainApp(usernameInput.value));
    logoutBtn.addEventListener('click', () => window.location.reload()); // Simple reload for logout
    document.getElementById('reset-data-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all data?')) {
            localStorage.clear();
            window.location.reload();
        }
    });
    const toggleSidebar = () => document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('menu-btn').addEventListener('click', toggleSidebar);
    document.getElementById('close-sidebar-btn').addEventListener('click', toggleSidebar);
    document.getElementById('user-profile-btn').addEventListener('click', toggleSidebar);
    
    // Start the App
    loadData();
    checkLoginStatus();
    function checkLoginStatus() {
        const savedUsername = localStorage.getItem('forumUsername');
        if (savedUsername) {
            showMainApp(savedUsername);
        }
    }
    // Set username in login field if it exists
    const savedUsername = localStorage.getItem('forumUsername');
    if (savedUsername) {
        usernameInput.value = savedUsername;
        loginBtn.disabled = false;
    }
});

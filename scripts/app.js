const loginCard = document.getElementById("loginCard");
const menuCard = document.getElementById("menuCard");
const spoinderFeatureBtn = document.getElementById("spoinderFeatureBtn");
const shuffleFeatureBtn = document.getElementById("shuffleFeatureBtn");
const backToMenuBtn = document.getElementById("backToMenuBtn");
const playlistCard = document.getElementById("playlistCard");
const playlistList = document.getElementById("playlistList");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const selectionBar = document.getElementById("selectionBar");
const selectedCountEl = document.getElementById("selectedCount");
const submitSelectionBtn = document.getElementById("submitSelectionBtn");
const generateModal = document.getElementById("generateModal");
const generateInput = document.getElementById("generateInput");
const cancelGenerateBtn = document.getElementById("cancelGenerateBtn");
const confirmGenerateBtn = document.getElementById("confirmGenerateBtn");
const pageLoader = document.getElementById("pageLoader");

const selectedPlaylistIds = new Set();
let cachedTrackIds = [];
let cachedPlaylists = []; // 缓存获取到的歌单数据
let currentMode = null; // 'spoinder' | 'shuffle'

// 工具函数：切换按钮加载状态
const setBtnLoading = (btn, isLoading, text = "") => {
    if (isLoading) {
        btn.classList.add("btn-loading");
        if (text) btn.dataset.originalText = btn.textContent;
    } else {
        btn.classList.remove("btn-loading");
        if (text && btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
    }
};

// 工具函数：切换全屏加载
const setPageLoading = (isLoading) => {
    if (isLoading) {
        pageLoader.classList.add("active");
    } else {
        pageLoader.classList.remove("active");
    }
};

const renderPlaylists = (items) => {
    playlistList.innerHTML = "";
    selectedPlaylistIds.clear();
    items.forEach((item, idx) => {
        const playlistId = item.id || item.uri || `mock-${idx}`;
        const li = document.createElement("li");
        li.className = "playlist-item";
        li.dataset.id = playlistId;
        li.innerHTML = `
      <div>
        <h3 class="playlist-title">${item.title || item.name}</h3>
        <p class="playlist-meta">${item.tracks?.total || 0}首</p>
<!--        <p class="playlist-meta">${item.desc || item.description || ""}</p>-->
      </div>
    `;
        playlistList.appendChild(li);
    });
    attachCardListeners();
    updateSelectionUI();
};

const showLogin = () => {
    loginCard.classList.remove("hidden");
    loginCard.style.display = "flex";
    menuCard.classList.add("hidden");
    menuCard.style.display = "none";
    playlistCard.classList.add("hidden");
    selectionBar.classList.add("hidden");
    selectionBar.style.display = "none";
    backToMenuBtn.classList.add("hidden");
}

const showMenu = () => {
    loginCard.classList.add("hidden");
    loginCard.style.display = "none";
    playlistCard.classList.add("hidden");
    selectionBar.classList.add("hidden");
    selectionBar.style.display = "none";
    menuCard.classList.remove("hidden");
    menuCard.style.display = "flex";
    backToMenuBtn.classList.add("hidden");
}

const showPlaylist = (items) => {
    renderPlaylists(items);
    loginCard.classList.add("hidden");
    loginCard.style.display = "none";
    menuCard.classList.add("hidden");
    menuCard.style.display = "none";
    playlistCard.classList.remove("hidden");
    selectionBar.classList.remove("hidden");
    selectionBar.style.display = "flex";
    backToMenuBtn.classList.remove("hidden");
}

const attachCardListeners = () => {
    playlistList.querySelectorAll(".playlist-item").forEach((card) => {
        card.addEventListener("click", () => {
            const pid = card.dataset.id;
            if (!pid) return;
            const isSelected = card.classList.toggle("selected");
            if (isSelected) {
                selectedPlaylistIds.add(pid);
            } else {
                selectedPlaylistIds.delete(pid);
            }
            updateSelectionUI();
        });
    });
};

const updateSelectionUI = () => {
    const count = selectedPlaylistIds.size;
    selectedCountEl.textContent = `已选 ${count} 个歌单`;
    submitSelectionBtn.disabled = count === 0;
};

const openGenerateModal = () => {
    generateModal.classList.remove("hidden");
    generateInput.value = "";
    generateInput.focus();
};

const closeGenerateModal = () => {
    generateModal.classList.add("hidden");
};

const fetchTracksByPlaylists = async (ids) => {
    const res = await fetch("/playlistTracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.trackIds || [];
};

const handleSubmitSelection = async () => {
    if (selectedPlaylistIds.size === 0) return;

    if (currentMode === 'shuffle') {
        setBtnLoading(submitSelectionBtn, true);
        setPageLoading(true); // 洗牌可能较慢，使用全屏遮罩

        try {
            const res = await fetch("/shufflePlaylists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: [...selectedPlaylistIds] })
            });
            if (res.ok) {
                window.location.href = "./success.html?type=shuffle";
            } else {
                alert("洗牌失败，请重试");
                setBtnLoading(submitSelectionBtn, false);
                setPageLoading(false);
            }
        } catch (e) {
            console.error(e);
            alert("洗牌失败，请重试");
            setBtnLoading(submitSelectionBtn, false);
            setPageLoading(false);
        }
        return;
    }

    // Spoinder mode logic
    setBtnLoading(submitSelectionBtn, true);
    try {
        const trackIds = await fetchTracksByPlaylists([...selectedPlaylistIds]);
        cachedTrackIds = [...new Set(trackIds)];
        openGenerateModal();
    } catch (e) {
        console.error(e);
        alert("获取歌曲失败");
    } finally {
        setBtnLoading(submitSelectionBtn, false);
    }
};

const handleGenerateConfirm = () => {
    const num = Number(generateInput.value);
    if (!num || num <= 0 || cachedTrackIds.length < num ) {
        alert("请输入有效的数量，且不能超过可选歌曲总数");
        return;
    }

    setBtnLoading(confirmGenerateBtn, true);

    // 模拟一点延迟让动画显示，提升感知流畅度
    setTimeout(() => {
        sessionStorage.setItem("swipeTrackIds", JSON.stringify(cachedTrackIds));
        sessionStorage.setItem("swipeLimit", String(num));
        closeGenerateModal();
        window.location.href = "./swipe.html";
        setBtnLoading(confirmGenerateBtn, false);
    }, 300);
};

const fetchPlaylists = async () => {
    try {
        const res = await fetch("/playerList", {redirect: "manual"});
        // 被要求跳转授权时，直接让浏览器整页跳转
        if (res.type === "opaqueredirect" || res.status === 0 || res.redirected) {
            window.location.href = res.url || "/login";
            return null;
        }
        if (res.status === 401 || res.status === 403) {
            window.location.href = "/login";
            return null;
        }
        if (!res.ok) return null;
        const data = await res.json();
        return data.items || [];
    } catch {
        return null;
    }
};

const fetchAuthState = async () => {
    try {
        const res = await fetch("/authState");
        if (!res.ok) return {codeValid: false};
        return res.json();
    } catch {
        return {codeValid: false};
    }
};

const handleLogin = async () => {
    setBtnLoading(loginBtn, true);
    try {
        const items = await fetchPlaylists();
        if (items) {
            cachedPlaylists = items;
            showMenu();
        }
    } finally {
        setBtnLoading(loginBtn, false);
    }
};

const handleLogout = async () => {
    setBtnLoading(logoutBtn, true);
    try {
        await fetch("/logout", {method: "POST"});
        playlistList.innerHTML = "";
        loginBtn.classList.remove("hidden");
        selectionBar.classList.add("hidden");
        menuCard.classList.add("hidden");
        backToMenuBtn.classList.add("hidden");
        showLogin();
    } finally {
        setBtnLoading(logoutBtn, false);
    }
};

// 绑定事件
loginBtn.addEventListener("click", handleLogin);
spoinderFeatureBtn.addEventListener("click", () => {
    currentMode = 'spoinder';
    if (cachedPlaylists) {
        showPlaylist(cachedPlaylists);
    }
});
shuffleFeatureBtn.addEventListener("click", () => {
    currentMode = 'shuffle';
    if (cachedPlaylists) {
        showPlaylist(cachedPlaylists);
    }
});
backToMenuBtn.addEventListener("click", showMenu);
logoutBtn.addEventListener("click", handleLogout);
submitSelectionBtn.addEventListener("click", handleSubmitSelection);
cancelGenerateBtn.addEventListener("click", closeGenerateModal);
confirmGenerateBtn.addEventListener("click", handleGenerateConfirm);

document.addEventListener("click", (e) => {
    if (e.target === generateModal) closeGenerateModal();
});

window.addEventListener("DOMContentLoaded", async () => {
    const {codeValid} = await fetchAuthState();
    if (codeValid) {
        loginBtn.classList.add("hidden");
    }
    const items = await fetchPlaylists();
    if (items) {
        cachedPlaylists = items;
        showMenu();
    } else {
        showLogin();
    }
});

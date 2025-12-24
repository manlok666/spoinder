const swipeCard = document.getElementById("swipeCard");
const coverEl = document.getElementById("trackCover");
const titleEl = document.getElementById("trackTitle");
const artistEl = document.getElementById("trackArtist");
const emptyState = document.getElementById("emptyState");
const remainingTxt = document.getElementById("remainingTxt");
const likedTxt = document.getElementById("likedTxt");
const likeBtn = document.getElementById("likeBtn");
const dislikeBtn = document.getElementById("dislikeBtn");
const actionsEl = document.querySelector(".actions");
const metaEl = document.querySelector(".meta");

let pool = JSON.parse(sessionStorage.getItem("swipeTrackIds") || "[]");
let nextTrackTask = null; // { id, promise } 用于预加载

const history = []; // 存储操作历史 { id, likedIt }

const liked = [];
let currentId = null;
const limit = Number(sessionStorage.getItem("swipeLimit") || pool.length || 0);

const handlePlaylistCreation = async () => {
    if (window.isCreatingPlaylist) return;
    window.isCreatingPlaylist = true;

    emptyState.textContent = "正在创建歌单...";
    emptyState.classList.remove("hidden");
    swipeCard.classList.add("hidden");

    // 禁用按钮防止误触
    if(likeBtn) likeBtn.disabled = true;
    if(dislikeBtn) dislikeBtn.disabled = true;

    try {
        const res = await fetch('/createPlaylist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trackIds: liked })
        });
        if (res.ok) {
            window.location.href = './success.html';
        } else {
            alert('创建歌单失败');
            window.isCreatingPlaylist = false;
            if(likeBtn) likeBtn.disabled = false;
            if(dislikeBtn) dislikeBtn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert('创建歌单失败');
        window.isCreatingPlaylist = false;
        if(likeBtn) likeBtn.disabled = false;
        if(dislikeBtn) dislikeBtn.disabled = false;
    }
};

const updateMeta = () => {
  // 剩余数量 = 池中数量 + 缓存中的一张(如果有)
  const bufferCount = nextTrackTask ? 1 : 0;
  remainingTxt.textContent = `剩余 ${pool.length + bufferCount}`;
  likedTxt.textContent = `已喜欢 ${liked.length}${limit ? ` / ${limit}` : ""}`;

  if (limit && liked.length >= limit) {
      handlePlaylistCreation();
  }
};

const fetchTrack = async (id) => {
  const res = await fetch(`/tracks?ids=${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return (data.items && data.items[0]) || null;
};

const preloadNext = () => {
    if (!pool.length || nextTrackTask) return;

    const idx = Math.floor(Math.random() * pool.length);
    const [nextId] = pool.splice(idx, 1);

    nextTrackTask = {
        id: nextId,
        promise: fetchTrack(nextId)
    };
    updateMeta();
};

const resetTransforms = () => {
  const resetStyle = "translateX(0px) rotate(0deg)";
  swipeCard.style.transform = resetStyle;
  actionsEl.style.transform = resetStyle;
  metaEl.style.transform = resetStyle;
};

const renderTrack = async (id, info) => {
  // info 由外部传入，不再内部 fetch
  if (!info) return showEmpty();

  currentId = id;
  const { album, name, artists } = info;
  const artistName = artists.map(a => a.name).join(' / ');

  coverEl.src = album.images?.[0]?.url || '';
  titleEl.textContent = name;
  artistEl.textContent = artistName;

  swipeCard.classList.remove("hidden");
  emptyState.classList.add("hidden");

  resetTransforms();

  // 触发重绘以应用淡入动画
  swipeCard.classList.remove("fade-in");
  void swipeCard.offsetWidth;
  swipeCard.classList.add("fade-in");

  swipeCard.style.opacity = 1;
  updateMeta();
};

const showEmpty = () => {
  swipeCard.classList.add("hidden");
  emptyState.classList.remove("hidden");
  updateMeta();
};

const drawNext = async () => {
  if ((!pool.length && !nextTrackTask) || (limit && liked.length >= limit)) {
    showEmpty();

    if (liked.length > 0 && !window.isCreatingPlaylist) {
        handlePlaylistCreation();
    }
    return;
  }

  let task = nextTrackTask;
  nextTrackTask = null; // 消费缓存

  // 如果没有缓存（首次运行），则从池中取
  if (!task) {
      if (!pool.length) { showEmpty(); return; }
      const idx = Math.floor(Math.random() * pool.length);
      const [nextId] = pool.splice(idx, 1);
      task = { id: nextId, promise: fetchTrack(nextId) };
  }

  // 立即预加载下一张
  preloadNext();

  // 等待当前卡片数据
  const info = await task.promise;

  if (info) {
      renderTrack(task.id, info);
  } else {
      // 如果加载失败，尝试下一张
      drawNext();
  }
};

const applySwipe = (likedIt) => {
  if (currentId) {
      if (likedIt) liked.push(currentId);
      history.push({ id: currentId, likedIt });
  }
  currentId = null;
  resetTransforms();
  drawNext();
};

const handleUndo = async () => {
    if (history.length === 0) return;

    const lastAction = history.pop();

    if (lastAction.likedIt) {
        const index = liked.indexOf(lastAction.id);
        if (index > -1) liked.splice(index, 1);
    }

    if (currentId) {
        pool.push(currentId);
        updateMeta();
    }

    // 撤回时需要重新获取上一张卡片的信息
    const info = await fetchTrack(lastAction.id);
    renderTrack(lastAction.id, info);
};

const setupButtons = () => {
  likeBtn.addEventListener("click", () => applySwipe(true));
  dislikeBtn.addEventListener("click", () => applySwipe(false));
};

const setupKeyboard = () => {
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      applySwipe(false);
    } else if (e.key === "ArrowRight") {
      applySwipe(true);
    }
  });
};

const setupDrag = () => {
  let startX = 0;
  let dragging = false;

  const onTouchStart = (e) => {
    dragging = true;
    swipeCard.classList.add("grab", "swiping");

    // 暂时移除过渡以实现跟手
    swipeCard.style.transition = "none";
    actionsEl.style.transition = "none";
    metaEl.style.transition = "none";

    startX = e.touches[0].clientX;
  };

  const onTouchMove = (e) => {
    if (!dragging) return;
    const x = e.touches[0].clientX;
    const delta = x - startX;
    const rotate = delta / 20;

    const transformVal = `translateX(${delta}px) rotate(${rotate}deg)`;

    swipeCard.style.transform = transformVal;
    // 移除透明度变化，保持不透明
    swipeCard.style.opacity = 1;

    actionsEl.style.transform = transformVal;
    metaEl.style.transform = transformVal;
  };

  const onTouchEnd = (e) => {
    if (!dragging) return;
    dragging = false;
    swipeCard.classList.remove("grab", "swiping");

    // 恢复过渡
    swipeCard.style.transition = "";
    actionsEl.style.transition = "";
    metaEl.style.transition = "";

    const x = e.changedTouches[0].clientX;
    const delta = x - startX;
    const threshold = 90;
    if (delta > threshold) {
      applySwipe(true);
    } else if (delta < -threshold) {
      applySwipe(false);
    } else {
      resetTransforms();
    }
  };

  // 仅保留触摸事件，移除鼠标事件以禁用电脑端拖拽
  swipeCard.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });
  window.addEventListener("touchend", onTouchEnd);
};

const init = () => {
  if (!pool.length) {
    showEmpty();
    return;
  }
  setupButtons();
  setupDrag();
  setupKeyboard();
  drawNext();
};

init();

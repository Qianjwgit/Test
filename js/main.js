/* ============================================================
 * 反诈情景模拟 · 主逻辑
 * 视图切换 / 剧情渲染 / 打字机效果 / 计分 / 结局判定
 * ============================================================ */

(function () {
  "use strict";

  // ---------- DOM 引用 ----------
  const viewHome = document.getElementById("view-home");
  const viewChat = document.getElementById("view-chat");
  const viewEnd = document.getElementById("view-end");

  const sceneList = document.getElementById("scene-list");
  const chatBox = document.getElementById("chat-box");
  const choiceBox = document.getElementById("choice-box");
  const chatSceneName = document.getElementById("chat-scene-name");
  const scoreEl = document.getElementById("score");

  const endBadge = document.getElementById("end-badge");
  const endTitle = document.getElementById("end-title");
  const endText = document.getElementById("end-text");
  const endTip = document.getElementById("end-tip");

  const btnBack = document.getElementById("btn-back");
  const btnRetry = document.getElementById("btn-retry");
  const btnHome = document.getElementById("btn-home");

  // ---------- 运行状态 ----------
  const state = {
    scenario: null,
    nodeId: null,
    score: 0,
    typing: false
  };

  // ---------- 工具 ----------
  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function showView(name) {
    viewHome.classList.toggle("hidden", name !== "home");
    viewChat.classList.toggle("hidden", name !== "chat");
    viewEnd.classList.toggle("hidden", name !== "end");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- 首页：渲染剧本卡片 ----------
  function renderHome() {
    sceneList.innerHTML = "";
    SCENARIOS.forEach(function (sc) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "scene-card";

      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = sc.tag;

      const h3 = document.createElement("h3");
      h3.textContent = sc.title;

      const p = document.createElement("p");
      p.textContent = sc.desc;

      card.appendChild(tag);
      card.appendChild(h3);
      card.appendChild(p);
      card.addEventListener("click", function () { startScenario(sc.id); });
      sceneList.appendChild(card);
    });
  }

  // ---------- 开始一个剧本 ----------
  function startScenario(id) {
    const sc = SCENARIOS.find(function (item) { return item.id === id; });
    if (!sc) return;

    state.scenario = sc;
    state.nodeId = sc.start;
    state.score = 0;
    state.typing = false;

    chatBox.innerHTML = "";
    choiceBox.innerHTML = "";
    chatSceneName.textContent = sc.title;
    scoreEl.textContent = "0";

    showView("chat");
    renderNode(state.nodeId);
  }

  // ---------- 渲染当前节点 ----------
  async function renderNode(nodeId) {
    const node = state.scenario.nodes[nodeId];
    if (!node) return;

    choiceBox.innerHTML = "";
    state.typing = true;

    const msg = buildMessage(node.speaker, whoLabel(node.speaker), node.text);
    chatBox.appendChild(msg);
    scrollChat();

    // 打字机效果
    const body = msg.querySelector(".msg-body");
    body.classList.add("cursor");
    for (let i = 0; i < node.text.length; i++) {
      body.textContent += node.text[i];
      scrollChat();
      await sleep(28);
    }
    body.classList.remove("cursor");

    state.typing = false;

    // 渲染选项
    if (node.choices && node.choices.length) {
      node.choices.forEach(function (opt) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "choice-btn";
        btn.textContent = opt.text;
        btn.addEventListener("click", function () { chooseOption(opt, btn); });
        choiceBox.appendChild(btn);
      });
    }
  }

  function whoLabel(speaker) {
    if (speaker === "scam") return "对方（疑似诈骗）";
    if (speaker === "me") return "我的回应";
    return "系统提示";
  }

  function buildMessage(speaker, label, text) {
    const wrap = document.createElement("div");
    wrap.className = "msg msg-" + speaker;

    const who = document.createElement("span");
    who.className = "msg-who";
    who.textContent = label;

    const body = document.createElement("div");
    body.className = "msg-body";
    body.textContent = text;

    wrap.appendChild(who);
    wrap.appendChild(body);
    return wrap;
  }

  function scrollChat() {
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // ---------- 选择选项 ----------
  function chooseOption(opt, btn) {
    if (state.typing) return;

    // 禁用全部按钮，防止重复点击
    Array.prototype.forEach.call(choiceBox.children, function (b) {
      b.disabled = true;
    });

    // 记录我方回应气泡
    const mine = buildMessage("me", "我的回应", opt.text);
    chatBox.appendChild(mine);
    scrollChat();

    // 计分：正确应对加分
    if (opt.safe) {
      state.score += 10;
    } else {
      state.score = Math.max(0, state.score - 5);
    }
    scoreEl.textContent = String(state.score);

    // 判断是否走向结局
    if (/-good$/.test(opt.next)) {
      showEnd("good");
    } else if (/-bad$/.test(opt.next)) {
      showEnd("bad");
    } else {
      state.nodeId = opt.next;
      renderNode(state.nodeId);
    }
  }

  // ---------- 结局 ----------
  function showEnd(type) {
    const sc = state.scenario;
    const end = type === "good" ? sc.endGood : sc.endBad;

    endBadge.className = "end-badge " + type;
    endBadge.innerHTML = type === "good"
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>';

    endTitle.textContent = end.title;
    endText.textContent = end.text;

    endTip.innerHTML = "";
    const tipTitle = document.createElement("h3");
    tipTitle.textContent = "防范要点";
    const ul = document.createElement("ul");
    end.tips.forEach(function (t) {
      const li = document.createElement("li");
      li.textContent = t;
      ul.appendChild(li);
    });
    endTip.appendChild(tipTitle);
    endTip.appendChild(ul);

    showView("end");
  }

  // ---------- 事件绑定 ----------
  btnBack.addEventListener("click", function () { showView("home"); });
  btnHome.addEventListener("click", function () { showView("home"); });
  btnRetry.addEventListener("click", function () {
    startScenario(state.scenario.id);
  });

  // ---------- 初始化 ----------
  renderHome();
})();

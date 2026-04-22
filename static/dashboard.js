import { getDatabase, onValue, ref, set } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import {
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged,
    setPersistence,
    signInWithEmailAndPassword,
    signOut,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const initialData = structuredClone(window.initialDashboardData || {});
const marketplaceSummary = window.marketplaceSummary || {};
const app = window.freelanceFlowFirebase;
const database = app ? getDatabase(app) : null;
const auth = app ? getAuth(app) : null;

const defaultState = {
    projects: initialData.projects || [],
    clients: initialData.clients || [],
    bookmarks: initialData.bookmarks || [],
    companion_tips: initialData.companion_tips || [],
    productivity: initialData.productivity || {
        focus_score: 0,
        active_clients: 0,
        pending_followups: 0,
        weekly_goal: "",
    },
    integrations: {
        upwork: {
            connected: Boolean(marketplaceSummary.upwork && marketplaceSummary.upwork.connected),
            username: "",
            profileUrl: "",
        },
        fiverr: {
            connected: Boolean(marketplaceSummary.fiverr && marketplaceSummary.fiverr.connected),
            username: "",
            profileUrl: "",
        },
    },
};

const syncStatus = document.getElementById("sync-status");
const workspaceIdLabel = document.getElementById("workspace-id-label");
const authStatus = document.getElementById("auth-status");
const authEmailLabel = document.getElementById("auth-email-label");
const signOutButton = document.getElementById("sign-out-button");
const toast = document.getElementById("toast");

let state = structuredClone(defaultState);
let currentUser = null;
let unsubscribeWorkspace = null;

bindForms();
bindDeleteActions();
bindAuthControls();
initializeAuth();
render();

async function initializeAuth() {
    if (!auth) {
        setAuthUi(null);
        setSyncStatus("Firebase unavailable", "error");
        return;
    }

    try {
        await setPersistence(auth, browserLocalPersistence);
    } catch (error) {
        console.error(error);
    }

    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        setAuthUi(user);
        await startWorkspaceSync();
    });
}

function bindForms() {
    const projectForm = document.getElementById("project-form");
    const clientForm = document.getElementById("client-form");
    const bookmarkForm = document.getElementById("bookmark-form");
    const companionForm = document.getElementById("companion-form");
    const fiverrForm = document.getElementById("fiverr-form");
    const upworkForm = document.getElementById("upwork-form");
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");

    if (projectForm) {
        projectForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const formData = new FormData(projectForm);
            state.projects.unshift({
                name: formData.get("name").trim(),
                client: formData.get("client").trim(),
                status: formData.get("status"),
                deadline: formData.get("deadline"),
            });
            projectForm.reset();
            await saveState("Project added");
        });
    }

    if (clientForm) {
        clientForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const formData = new FormData(clientForm);
            state.clients.unshift({
                name: formData.get("name").trim(),
                contact: formData.get("contact").trim(),
                channel: formData.get("channel"),
                health: formData.get("health"),
            });
            clientForm.reset();
            await saveState("Client added");
        });
    }

    if (bookmarkForm) {
        bookmarkForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const formData = new FormData(bookmarkForm);
            state.bookmarks.unshift({
                label: formData.get("label").trim(),
                url: normalizeUrl(formData.get("url").trim()),
            });
            bookmarkForm.reset();
            await saveState("Bookmark saved");
        });
    }

    if (companionForm) {
        companionForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const formData = new FormData(companionForm);
            state.productivity.focus_score = Number(formData.get("focus_score"));
            state.productivity.pending_followups = Number(formData.get("pending_followups"));
            state.productivity.weekly_goal = formData.get("weekly_goal").trim();
            state.companion_tips = String(formData.get("tips"))
                .split("\n")
                .map((tip) => tip.trim())
                .filter(Boolean);
            await saveState("Companion updated");
        });
    }

    if (fiverrForm) {
        fiverrForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const formData = new FormData(fiverrForm);
            state.integrations.fiverr = {
                connected: true,
                username: formData.get("username").trim(),
                profileUrl: normalizeOptionalUrl(formData.get("profileUrl").trim()),
            };
            await saveState("Fiverr details saved");
        });
    }

    if (upworkForm) {
        upworkForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const formData = new FormData(upworkForm);
            state.integrations.upwork = {
                connected: true,
                username: formData.get("username").trim(),
                profileUrl: normalizeOptionalUrl(formData.get("profileUrl").trim()),
            };
            await saveState("Upwork details saved");
        });
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!auth) {
                showToast("Firebase auth unavailable");
                return;
            }

            const formData = new FormData(loginForm);
            try {
                await signInWithEmailAndPassword(
                    auth,
                    String(formData.get("email")).trim(),
                    String(formData.get("password"))
                );
                loginForm.reset();
                showToast("Logged in");
            } catch (error) {
                console.error(error);
                showToast(readableAuthError(error));
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!auth) {
                showToast("Firebase auth unavailable");
                return;
            }

            const formData = new FormData(signupForm);
            try {
                await createUserWithEmailAndPassword(
                    auth,
                    String(formData.get("email")).trim(),
                    String(formData.get("password"))
                );
                signupForm.reset();
                showToast("Account created");
            } catch (error) {
                console.error(error);
                showToast(readableAuthError(error));
            }
        });
    }
}

function bindDeleteActions() {
    document.addEventListener("click", async (event) => {
        const action = event.target.dataset.action;
        const index = Number(event.target.dataset.index);

        if (!action || Number.isNaN(index)) {
            return;
        }

        if (action === "delete-project") {
            state.projects.splice(index, 1);
            await saveState("Project removed");
        }

        if (action === "delete-client") {
            state.clients.splice(index, 1);
            await saveState("Client removed");
        }

        if (action === "delete-bookmark") {
            state.bookmarks.splice(index, 1);
            await saveState("Bookmark removed");
        }
    });
}

function bindAuthControls() {
    if (!signOutButton) {
        return;
    }

    signOutButton.addEventListener("click", async () => {
        if (!auth) {
            return;
        }

        try {
            await signOut(auth);
            showToast("Signed out");
        } catch (error) {
            console.error(error);
            showToast("Could not sign out");
        }
    });
}

async function startWorkspaceSync() {
    if (!database) {
        setSyncStatus("Firebase unavailable", "error");
        return;
    }

    if (unsubscribeWorkspace) {
        unsubscribeWorkspace();
    }

    const workspaceId = getActiveWorkspaceId();
    if (workspaceIdLabel) {
        workspaceIdLabel.textContent = workspaceId;
    }

    setSyncStatus("Syncing with Firebase");

    unsubscribeWorkspace = onValue(
        ref(database, workspacePath()),
        async (snapshot) => {
            const remoteState = snapshot.val();

            if (!remoteState) {
                state = structuredClone(defaultState);
                render();
                await persistToFirebase(state);
                setSyncStatus("Synced with Firebase", "ready");
                return;
            }

            state = mergeState(defaultState, remoteState);
            render();
            setSyncStatus("Synced with Firebase", "ready");
        },
        (error) => {
            console.error(error);
            setSyncStatus("Firebase sync failed", "error");
        }
    );
}

async function saveState(message) {
    try {
        await persistToFirebase(state);
        render();
        setSyncStatus("Synced with Firebase", "ready");
        showToast(message);
    } catch (error) {
        console.error(error);
        setSyncStatus("Firebase sync failed", "error");
        showToast("Could not save to Firebase");
    }
}

async function persistToFirebase(nextState) {
    if (!database) {
        throw new Error("Firebase database not initialized");
    }

    nextState.productivity.active_clients = nextState.clients.length;
    await set(ref(database, workspacePath()), nextState);
}

function render() {
    state.productivity.active_clients = state.clients.length;
    renderStats();
    renderProjects();
    renderClients();
    renderBookmarks();
    renderTips();
    renderIntegrationStatus();
    hydrateForms();
}

function renderStats() {
    const focusScore = document.getElementById("focus-score");
    const activeClients = document.getElementById("active-clients");
    const pendingFollowups = document.getElementById("pending-followups");
    const weeklyGoal = document.getElementById("weekly-goal");

    if (focusScore) {
        focusScore.textContent = `${state.productivity.focus_score}%`;
    }
    if (activeClients) {
        activeClients.textContent = String(state.productivity.active_clients);
    }
    if (pendingFollowups) {
        pendingFollowups.textContent = String(state.productivity.pending_followups);
    }
    if (weeklyGoal) {
        weeklyGoal.textContent = state.productivity.weekly_goal;
    }
}

function renderProjects() {
    const container = document.getElementById("projects-list");
    const count = document.getElementById("projects-count");
    if (!container || !count) {
        return;
    }
    count.textContent = `${state.projects.length} total`;
    if (!state.projects.length) {
        container.innerHTML = '<div class="empty-state">No projects yet. Add your first one from the form.</div>';
        return;
    }

    container.innerHTML = state.projects
        .map(
            (project, index) => `
                <article class="info-card">
                    <h4>${escapeHtml(project.name)}</h4>
                    <p><strong>Client:</strong> ${escapeHtml(project.client)}</p>
                    <p><strong>Status:</strong> ${escapeHtml(project.status)}</p>
                    <p><strong>Deadline:</strong> ${escapeHtml(project.deadline)}</p>
                    <div class="card-actions">
                        <button class="delete-button" data-action="delete-project" data-index="${index}">Delete</button>
                    </div>
                </article>
            `
        )
        .join("");
}

function renderClients() {
    const container = document.getElementById("clients-list");
    const count = document.getElementById("clients-count");
    if (!container || !count) {
        return;
    }
    count.textContent = `${state.clients.length} total`;
    if (!state.clients.length) {
        container.innerHTML = '<div class="empty-state">No clients yet. Add one to start tracking your relationships.</div>';
        return;
    }

    container.innerHTML = state.clients
        .map(
            (client, index) => `
                <article class="info-card">
                    <h4>${escapeHtml(client.name)}</h4>
                    <p><strong>Contact:</strong> ${escapeHtml(client.contact)}</p>
                    <p><strong>Channel:</strong> ${escapeHtml(client.channel)}</p>
                    <p><strong>Health:</strong> ${escapeHtml(client.health)}</p>
                    <div class="card-actions">
                        <button class="delete-button" data-action="delete-client" data-index="${index}">Delete</button>
                    </div>
                </article>
            `
        )
        .join("");
}

function renderBookmarks() {
    const container = document.getElementById("bookmarks-list");
    const count = document.getElementById("bookmarks-count");
    if (!container || !count) {
        return;
    }
    count.textContent = `${state.bookmarks.length} saved`;
    if (!state.bookmarks.length) {
        container.innerHTML = '<div class="empty-state">No bookmarks saved yet. Add the tools you use every day.</div>';
        return;
    }

    container.innerHTML = state.bookmarks
        .map(
            (bookmark, index) => `
                <div class="content-stack">
                    <a class="bookmark-card" href="${escapeAttribute(bookmark.url)}" target="_blank" rel="noreferrer">
                        ${escapeHtml(bookmark.label)}
                    </a>
                    <button class="delete-button" data-action="delete-bookmark" data-index="${index}">Remove</button>
                </div>
            `
        )
        .join("");
}

function renderTips() {
    const container = document.getElementById("companion-tips-list");
    if (!container) {
        return;
    }
    const tips = state.companion_tips.length
        ? state.companion_tips
        : ["Set your weekly goal and daily focus plan here."];
    container.innerHTML = tips.map((tip) => `<p class="tip-line">${escapeHtml(tip)}</p>`).join("");
}

function renderIntegrationStatus() {
    const container = document.getElementById("integration-status-list");
    if (!container) {
        return;
    }
    const upwork = state.integrations.upwork;
    const fiverr = state.integrations.fiverr;

    container.innerHTML = `
        <article class="info-card integration-card">
            <h4>Firebase</h4>
            <p class="connected">Configured</p>
            <p><strong>Project ID:</strong> ${escapeHtml(window.firebaseConfig.projectId)}</p>
            <p><strong>Workspace:</strong> ${escapeHtml(getActiveWorkspaceId())}</p>
        </article>
        <article class="info-card integration-card">
            <h4>Upwork</h4>
            <p class="${upwork.connected ? "connected" : "pending"}">${upwork.connected ? "Saved" : "Not Connected"}</p>
            <p><strong>Username:</strong> ${escapeHtml(upwork.username || "Not added yet")}</p>
            <p><strong>Profile:</strong> ${upwork.profileUrl ? `<a href="${escapeAttribute(upwork.profileUrl)}" target="_blank" rel="noreferrer">Open profile</a>` : "Not added yet"}</p>
        </article>
        <article class="info-card integration-card">
            <h4>Fiverr</h4>
            <p class="${fiverr.connected ? "connected" : "pending"}">${fiverr.connected ? "Saved" : "Not Connected"}</p>
            <p><strong>Username:</strong> ${escapeHtml(fiverr.username || "Not added yet")}</p>
            <p><strong>Profile:</strong> ${fiverr.profileUrl ? `<a href="${escapeAttribute(fiverr.profileUrl)}" target="_blank" rel="noreferrer">Open profile</a>` : "Not added yet"}</p>
        </article>
    `;
}

function hydrateForms() {
    const focusInput = document.getElementById("focus-input");
    const followupInput = document.getElementById("followup-input");
    const goalInput = document.getElementById("goal-input");
    const tipsInput = document.getElementById("tips-input");
    const fiverrUsername = document.getElementById("fiverr-username");
    const fiverrProfile = document.getElementById("fiverr-profile");
    const upworkUsername = document.getElementById("upwork-username");
    const upworkProfile = document.getElementById("upwork-profile");

    if (focusInput) {
        focusInput.value = state.productivity.focus_score;
    }
    if (followupInput) {
        followupInput.value = state.productivity.pending_followups;
    }
    if (goalInput) {
        goalInput.value = state.productivity.weekly_goal;
    }
    if (tipsInput) {
        tipsInput.value = state.companion_tips.join("\n");
    }
    if (fiverrUsername) {
        fiverrUsername.value = state.integrations.fiverr.username || "";
    }
    if (fiverrProfile) {
        fiverrProfile.value = state.integrations.fiverr.profileUrl || "";
    }
    if (upworkUsername) {
        upworkUsername.value = state.integrations.upwork.username || "";
    }
    if (upworkProfile) {
        upworkProfile.value = state.integrations.upwork.profileUrl || "";
    }
}

function setSyncStatus(text, statusClass = "") {
    if (!syncStatus) {
        return;
    }

    syncStatus.textContent = text;
    syncStatus.classList.remove("ready", "error");
    if (statusClass) {
        syncStatus.classList.add(statusClass);
    }
}

function setAuthUi(user) {
    if (!authStatus || !authEmailLabel || !signOutButton) {
        return;
    }

    authStatus.classList.remove("ready", "error");

    if (user) {
        authStatus.textContent = "Logged in";
        authStatus.classList.add("ready");
        authEmailLabel.textContent = user.email || "Signed in user";
        signOutButton.hidden = false;
        return;
    }

    authStatus.textContent = "Guest mode";
    authEmailLabel.textContent = "No account connected";
    signOutButton.hidden = true;
}

function showToast(message) {
    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => {
        toast.classList.remove("show");
    }, 1800);
}

function mergeState(base, override) {
    if (!override) {
        return structuredClone(base);
    }

    return {
        ...structuredClone(base),
        ...override,
        productivity: {
            ...base.productivity,
            ...(override.productivity || {}),
        },
        integrations: {
            upwork: {
                ...base.integrations.upwork,
                ...((override.integrations && override.integrations.upwork) || {}),
            },
            fiverr: {
                ...base.integrations.fiverr,
                ...((override.integrations && override.integrations.fiverr) || {}),
            },
        },
    };
}

function workspacePath() {
    return `workspaces/${getActiveWorkspaceId()}`;
}

function getActiveWorkspaceId() {
    if (currentUser && currentUser.uid) {
        return `user-${currentUser.uid}`;
    }

    const params = new URLSearchParams(window.location.search);
    const requested = params.get("workspace");
    const fallback = "workspace";
    const storedValue = window.localStorage.getItem("freelance-flow-workspace");
    const migratedStoredValue = storedValue === "shared-demo" ? fallback : storedValue;
    const rawValue = requested || migratedStoredValue || fallback;
    const cleaned = rawValue.toLowerCase().replace(/[^a-z0-9-_]/g, "-").slice(0, 40) || fallback;
    window.localStorage.setItem("freelance-flow-workspace", cleaned);
    return cleaned;
}

function normalizeUrl(url) {
    if (!/^https?:\/\//i.test(url)) {
        return `https://${url}`;
    }
    return url;
}

function normalizeOptionalUrl(url) {
    return url ? normalizeUrl(url) : "";
}

function readableAuthError(error) {
    const code = error && error.code ? error.code : "";
    if (code.includes("auth/email-already-in-use")) {
        return "That email is already in use";
    }
    if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password") || code.includes("auth/user-not-found")) {
        return "Email or password is incorrect";
    }
    if (code.includes("auth/invalid-email")) {
        return "Enter a valid email address";
    }
    if (code.includes("auth/weak-password")) {
        return "Password must be at least 6 characters";
    }
    if (code.includes("auth/operation-not-allowed")) {
        return "Enable Email/Password sign-in in Firebase Authentication";
    }
    return "Authentication failed";
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
    return escapeHtml(value);
}

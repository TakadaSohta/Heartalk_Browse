/************************************************
 * 1. Firebase初期化
 ************************************************/
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from 'firebase/auth';
import {
    getDatabase,
    ref as dbRef,
    set,
    get,
    onValue,
    update,
    serverTimestamp,
    off
} from 'firebase/database';
import {
    getStorage,
    ref as storageRef,
    uploadBytes,
    getDownloadURL
} from 'firebase/storage';
import {
    getMessaging,
    onMessage,
    getToken
} from 'firebase/messaging';
import Chart from 'chart.js/auto'; // Chart.jsをインポート

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
const messaging = getMessaging(app);

/************************************************
 * 2. HTML要素の取得
 ************************************************/
const userInfoDiv = document.querySelector('.user-info');
const userNameSpan = document.getElementById('user-name');
const userImage = document.getElementById('user-image');
const userHeartRate = document.getElementById('user-heart-rate');
const signOutBtn = document.getElementById('sign-out');

const editProfileBtn = document.getElementById('edit-profile');
const editProfileModal = document.getElementById('edit-profile-modal');
const closeModalBtn = document.querySelector('.close-button');
const editProfileForm = document.getElementById('edit-profile-form');
const editErrorMessageDiv = document.getElementById('edit-error-message');

// エラーメッセージ表示領域
const container = document.querySelector('.container');
const errorMessageDiv = document.createElement('div');
errorMessageDiv.id = 'error-message';
errorMessageDiv.style.color = 'red';
errorMessageDiv.style.position = 'fixed';
errorMessageDiv.style.top = '20px';
errorMessageDiv.style.left = '50%';
errorMessageDiv.style.transform = 'translateX(-50%)';
errorMessageDiv.style.backgroundColor = '#ffbaba';
errorMessageDiv.style.color = '#d8000c';
errorMessageDiv.style.padding = '10px 20px';
errorMessageDiv.style.borderRadius = '8px';
errorMessageDiv.style.display = 'none';
errorMessageDiv.style.zIndex = '1000';
if (container) {
    container.prepend(errorMessageDiv);
} else {
    console.error('container クラスの要素が見つかりません');
}

// フレンド情報セクション
const permittedUsersDiv = document.querySelector('.permitted-users');
const permittedUsersList = document.getElementById('permitted-users-list');

// その他
const loadingScreen = document.getElementById('loading-screen');

/************************************************
 * 3. 多言語対応（言語ファイルの読み込み）
 ************************************************/
let currentLanguage = 'ja'; // デフォルト言語
let languageData = {};

function loadLanguage(lang) {
    fetch(`lang/${lang}.json`)
        .then(response => response.json())
        .then(data => {
            languageData = data;
            applyLanguage();
        })
        .catch(error => {
            console.error('言語ファイルの読み込みエラー:', error);
        });
}

function applyLanguage() {
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) {
        headerTitle.textContent =
            languageData.header_title || "ユーザー情報とフレンド情報";
    }

    const userInfoHeader = document.querySelector('.user-info h2');
    if (userInfoHeader) {
        userInfoHeader.textContent =
            languageData.user_info_title || "自分のアカウント";
    }

    const editProfileButton = document.getElementById('edit-profile');
    if (editProfileButton) {
        editProfileButton.textContent =
            languageData.edit_profile || "プロフィール編集";
    }

    const signOutButton = document.getElementById('sign-out');
    if (signOutButton) {
        signOutButton.textContent =
            languageData.sign_out || "サインアウト";
    }
}

function setLanguage(lang) {
    currentLanguage = lang;
    loadLanguage(lang);
}

window.addEventListener('load', () => {
    loadLanguage(currentLanguage);
    if (auth.currentUser) {
        requestNotificationPermission();
    }
});

/************************************************
 * 4. エラー表示系のヘルパー関数
 ************************************************/
function showError(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.style.display = 'block';
    setTimeout(() => {
        errorMessageDiv.textContent = '';
        errorMessageDiv.style.display = 'none';
    }, 5000);
}

function showEditError(message) {
    if (editErrorMessageDiv) {
        editErrorMessageDiv.textContent = message;
        editErrorMessageDiv.style.display = 'block';
        setTimeout(() => {
            editErrorMessageDiv.textContent = '';
            editErrorMessageDiv.style.display = 'none';
        }, 5000);
    } else {
        console.error('edit-error-message が見つかりません');
    }
}

/************************************************
 * 5. モーダル制御（プロフィール編集）
 ************************************************/
function openModal() {
    if (editProfileModal) {
        editProfileModal.style.display = 'block';
        if (editProfileForm['edit-username']) {
            editProfileForm['edit-username'].value = userNameSpan.textContent;
        } else {
            console.error('edit-username フィールドが見つかりません');
        }
    } else {
        console.error('edit-profile-modal が見つかりません');
    }
}

function closeModal() {
    if (editProfileModal) {
        editProfileModal.style.display = 'none';
        showEditError('');
        // 画像編集関連をリセット
        cancelCrop();
    } else {
        console.error('edit-profile-modal が見つかりません');
    }
}

if (editProfileBtn) {
    editProfileBtn.addEventListener('click', openModal);
} else {
    console.error('edit-profile ボタンが見つかりません');
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
} else {
    console.error('close-button が見つかりません');
}

window.addEventListener('click', (event) => {
    if (editProfileModal && event.target == editProfileModal) {
        closeModal();
    }
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && editProfileModal && editProfileModal.style.display === 'block') {
        closeModal();
    }
});

/************************************************
 * 6. ローディング画面制御
 ************************************************/
function showLoading() {
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
    } else {
        console.error('loading-screen が見つかりません');
    }
}

function hideLoading() {
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    } else {
        console.error('loading-screen が見つかりません');
    }
}

/************************************************
 * 7. リスナー管理用の変数（▼ 追加）
 ************************************************/
let heartRateListener = null;

/************************************************
 * 8. ユーザー認証状態の監視
 ************************************************/
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('ユーザーがサインインしています:', user);
        if (userInfoDiv) {
            userInfoDiv.style.display = 'flex';
        }
        if (permittedUsersDiv) {
            permittedUsersDiv.style.display = 'block';
        }

        showLoading();

        // ユーザーデータ＆フレンドデータを取得
        Promise.all([
            fetchUserData(user.uid),
            fetchPermittedUsers(user.uid)
        ]).then(() => {
            // 心拍数履歴の取得とグラフ描画
            fetchHeartRateHistory(user.uid);
            hideLoading();
        }).catch((error) => {
            console.error('データロードエラー:', error);
            showError('データのロードに失敗しました。');
            hideLoading();
        });

    } else {
        console.log('ユーザーがサインアウトしています。');
        // ▼ リアルタイムリスナーのクリーンアップ
        cleanupResources(user?.uid);

        if (userInfoDiv) {
            userInfoDiv.style.display = 'none';
        }
        if (permittedUsersDiv) {
            permittedUsersDiv.style.display = 'none';
        }
        if (permittedUsersList) {
            permittedUsersList.innerHTML = '';
        }
        window.location.href = 'index.html'; // ログイン画面へ
    }
});

/************************************************
 * 9. ユーザー&心拍データ取得処理
 ************************************************/
/**
 * ユーザーデータ（名前・画像）を取得し、UIへ反映。
 * 取得後に心拍監視を初期化して、QRコードを生成。
 * @param {string} uid
 */
function fetchUserData(uid) {
    return new Promise((resolve, reject) => {
        const userRef = dbRef(database, `Username/${uid}`);
        get(userRef)
            .then((snapshot) => {
                const data = snapshot.val();
                userNameSpan.textContent = data?.UName || "名前未設定";
                userImage.src = data?.Uimage || "https://via.placeholder.com/100";

                // ▼ 新規の心拍数監視リスナーの初期化
                initializeHeartRateMonitoring(uid);

                // ▼ QRコード生成（1回だけ）
                generateQRCode(uid);

                resolve();
            })
            .catch((error) => {
                handleUserDataError(error);
                reject(error);
            });
    });
}

/**
 * ▼ 心拍数監視の初期化（追加）
 */
function initializeHeartRateMonitoring(uid) {
    // 既存のリスナーをクリーンアップ
    if (heartRateListener) {
        off(dbRef(database, `Userdata/${uid}/Heartbeat/Watch1`), heartRateListener);
    }

    const heartRateRef = dbRef(database, `Userdata/${uid}/Heartbeat/Watch1`);
    // リアルタイムリスナー設定
    heartRateListener = onValue(
        heartRateRef,
        (snapshot) => {
            const data = snapshot.val();
            updateHeartRateDisplay(data?.HeartRate);
            if (data?.HeartRate) {
                addHeartRateHistory(uid, data.HeartRate);
            }
        },
        (error) => {
            handleHeartRateError(error);
        }
    );
}

/**
 * ▼ ユーザー情報取得時のエラーハンドリング
 */
function handleUserDataError(error) {
    console.error('ユーザーデータ取得エラー:', error);
    showError('ユーザー情報の取得に失敗しました');
}

/**
 * ▼ 心拍数データ取得時のエラーハンドリング
 */
function handleHeartRateError(error) {
    console.error('心拍数データ取得エラー:', error);
    showError('心拍数データの取得に失敗しました');
}

/**
 * ▼ サインアウト時などにリスナーをクリーンアップ
 */
function cleanupResources(uid) {
    if (heartRateListener) {
        off(dbRef(database, `Userdata/${uid}/Heartbeat/Watch1`), heartRateListener);
        heartRateListener = null;
    }
}

/**
 * 心拍数を画面に表示
 */
function updateHeartRateDisplay(rate) {
    userHeartRate.textContent = rate || "-";
}

/**
 * 新しい心拍数を履歴へ保存
 */
function addHeartRateHistory(uid, rate) {
    const historyRef = dbRef(database, `Userdata/${uid}/HeartbeatHistory`);
    const newHistoryRef = dbRef(historyRef, pushId());
    set(newHistoryRef, {
        HeartRate: rate,
        timestamp: serverTimestamp()
    }).catch((error) => {
        console.error('心拍数履歴追加エラー:', error);
        showError('心拍数履歴の保存に失敗しました');
    });
}

/**
 * push用のユニークIDを生成
 */
function pushId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/************************************************
 * 10. 許可されたユーザー（フレンド）情報の取得・表示
 ************************************************/
function fetchPermittedUsers(uid) {
    return new Promise((resolve, reject) => {
        const permittedUsersRef = dbRef(database, `AcceptUser/${uid}/permittedUser`);
        get(permittedUsersRef)
            .then((snapshot) => {
                const permittedUsers = snapshot.val();
                if (permittedUsersList) {
                    permittedUsersList.innerHTML = '';
                }
                if (permittedUsers) {
                    const permittedUids = Object.keys(permittedUsers).filter(key => permittedUsers[key] === true);
                    if (permittedUids.length === 0) {
                        const noFriendsMsg = languageData.no_friends || "許可されたフレンドがいません。";
                        if (permittedUsersList) {
                            permittedUsersList.innerHTML = `<p>${noFriendsMsg}</p>`;
                        }
                        resolve();
                        return;
                    }
                    // 許可されたユーザーの情報を取得して表示
                    Promise.all(permittedUids.map(permittedUid => displayPermittedUser(permittedUid)))
                        .then(() => {
                            resolve();
                        })
                        .catch((error) => {
                            console.error('許可されたユーザー情報取得エラー:', error);
                            showError('許可されたユーザー情報の取得に失敗しました。');
                            reject(error);
                        });
                } else {
                    const noFriendsMsg = languageData.no_friends || "許可されたフレンドがいません。";
                    if (permittedUsersList) {
                        permittedUsersList.innerHTML = `<p>${noFriendsMsg}</p>`;
                    }
                    resolve();
                }
            })
            .catch((error) => {
                console.error('許可されたユーザーデータ取得エラー:', error);
                showError('許可されたユーザーデータの取得に失敗しました。');
                reject(error);
            });
    });
}

function displayPermittedUser(permittedUid) {
    return new Promise((resolve, reject) => {
        const usernameRef = dbRef(database, `Username/${permittedUid}`);
        const userdataRef = dbRef(database, `Userdata/${permittedUid}/Heartbeat/Watch1`);

        Promise.all([
            get(usernameRef),
            get(userdataRef)
        ]).then(([usernameSnapshot, userdataSnapshot]) => {
            const usernameData = usernameSnapshot.val();
            const userdata = userdataSnapshot.val();

            const userName = usernameData ? (usernameData.UName || "名前未設定") : "名前未設定";
            const userImageUrl = usernameData
                ? (usernameData.Uimage || "https://via.placeholder.com/90")
                : "https://via.placeholder.com/90";
            const heartRate = userdata && userdata.HeartRate ? userdata.HeartRate : "-";

            const userCard = document.createElement('div');
            userCard.className = 'user-card';

            const img = document.createElement('img');
            img.src = userImageUrl;
            img.alt = `${userName} の画像`;
            img.loading = 'lazy';

            const userInfo = document.createElement('div');
            userInfo.className = 'user-info';
            userInfo.innerHTML = `<p class="user-name">${userName}</p><p class="heart-rate">${heartRate}</p>`;

            userCard.appendChild(img);
            userCard.appendChild(userInfo);

            if (permittedUsersList) {
                permittedUsersList.appendChild(userCard);
            }

            resolve();
        }).catch((error) => {
            console.error('許可されたユーザー情報取得エラー:', error);
            showError('許可されたユーザー情報の取得に失敗しました。');
            reject(error);
        });
    });
}

/************************************************
 * 11. 心拍数履歴グラフの描画
 ************************************************/
const heartRateChartCtx = document.getElementById('heartRateChart').getContext('2d');
let heartRateChart = null;

function fetchHeartRateHistory(uid) {
    const heartRateHistoryRef = dbRef(database, `Userdata/${uid}/HeartbeatHistory`);
    onValue(heartRateHistoryRef, (snapshot) => {
        const heartRateData = snapshot.val();
        if (heartRateData) {
            const sortedData = Object.entries(heartRateData).sort((a, b) => a[1].timestamp - b[1].timestamp);
            const labels = sortedData.map(entry => new Date(entry[1].timestamp).toLocaleString());
            const data = sortedData.map(entry => entry[1].HeartRate);

            if (heartRateChart) {
                heartRateChart.data.labels = labels;
                heartRateChart.data.datasets[0].data = data;
                heartRateChart.update();
            } else {
                heartRateChart = new Chart(heartRateChartCtx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: '心拍数',
                            data: data,
                            borderColor: '#e74c3c',
                            backgroundColor: 'rgba(231, 76, 60, 0.2)',
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            x: {
                                display: true,
                                title: {
                                    display: true,
                                    text: '日時'
                                }
                            },
                            y: {
                                display: true,
                                title: {
                                    display: true,
                                    text: '心拍数'
                                },
                                suggestedMin: 60,
                                suggestedMax: 100
                            }
                        }
                    }
                });
            }
        }
    }, (error) => {
        console.error('心拍数履歴データ取得エラー:', error);
        showError('心拍数履歴データの取得に失敗しました。');
    });
}

/************************************************
 * 12. 通知の許可＆FCMトークン
 ************************************************/
function requestNotificationPermission() {
    getToken(messaging, { vapidKey: 'YOUR_PUBLIC_VAPID_KEY' })
        .then((currentToken) => {
            if (currentToken) {
                console.log('FCMトークン:', currentToken);
                const uid = auth.currentUser.uid;
                set(dbRef(database, `Users/${uid}/fcmToken`), currentToken)
                    .then(() => {
                        console.log('FCMトークンをデータベースに保存しました。');
                    })
                    .catch((error) => {
                        console.error('FCMトークンの保存エラー:', error);
                        showError('通知トークンの保存に失敗しました。');
                    });
            } else {
                console.warn('通知トークンが取得できませんでした。');
                showError('通知トークンの取得に失敗しました。');
            }
        })
        .catch((error) => {
            console.error('通知の許可が拒否されました:', error);
            showError('通知の許可が拒否されました。');
        });
}

onMessage(messaging, (payload) => {
    console.log('受信したメッセージ:', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon || 'https://via.placeholder.com/100'
    };

    if (Notification.permission === 'granted') {
        new Notification(notificationTitle, notificationOptions);
    }
});

/************************************************
 * 13. サインアウト処理
 ************************************************/
if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
        signOut(auth)
            .then(() => {
                console.log('サインアウト成功');
                window.location.href = 'index.html';
            })
            .catch((error) => {
                console.error('サインアウトエラー:', error);
                showError('サインアウトに失敗しました。');
            });
    });
} else {
    console.error('sign-out ボタンが見つかりません');
}

/************************************************
 * 14. フレンド検索機能（検索ボックス）
 ************************************************/
function filterFriends() {
    const friendSearchInput = document.getElementById('friend-search');
    if (!friendSearchInput) {
        console.error('friend-search 入力フィールドが見つかりません');
        return;
    }
    const input = friendSearchInput.value.toLowerCase();
    if (!permittedUsersList) {
        console.error('permitted-users-list が見つかりません');
        return;
    }
    const userCards = permittedUsersList.getElementsByClassName('user-card');

    for (let i = 0; i < userCards.length; i++) {
        const userInfo = userCards[i].getElementsByClassName('user-info')[0];
        if (!userInfo) {
            console.error('user-info セクションが見つかりません');
            continue;
        }
        const nameElement = userInfo.getElementsByTagName('p')[0];
        if (!nameElement) {
            console.error('user-name 要素が見つかりません');
            continue;
        }
        const name = nameElement.innerText.toLowerCase();
        if (name.includes(input)) {
            userCards[i].style.display = "";
        } else {
            userCards[i].style.display = "none";
        }
    }
}

const friendSearchInputElement = document.getElementById('friend-search');
if (friendSearchInputElement) {
    friendSearchInputElement.addEventListener('keyup', filterFriends);
} else {
    console.error('friend-search 入力フィールドが見つかりません');
}

/************************************************
 * 15. QRコード生成
 ************************************************/
function generateQRCode(uid) {
    const qrContainer = document.getElementById('qr-code');
    if (!qrContainer || !uid) {
        console.error('QRコード生成に必要な要素またはUIDがありません');
        return;
    }
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
        text: uid,
        width: 180,
        height: 180,
        colorDark: "#1d1d1f",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

/************************************************
 * 16. サイドメニューなどUI周り（例）
 ************************************************/
document.addEventListener('DOMContentLoaded', function () {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (menuToggle && sidebar && overlay) {
        function openMenu() {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        }
        function closeMenu() {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
        menuToggle.addEventListener('click', function () {
            if (sidebar.classList.contains('active')) {
                closeMenu();
            } else {
                openMenu();
            }
        });
        overlay.addEventListener('click', function () {
            closeMenu();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && sidebar.classList.contains('active')) {
                closeMenu();
            }
        });
    } else {
        console.error('サイドメニュー関連の要素が見つかりません');
    }
});

/************************************************
 * 17. 画像アップロード & クロップ機能
 ************************************************/
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('image-input');
const cropContainer = document.getElementById('crop-container');
const previewImage = document.querySelector('#image-preview img');

let cropper = null;
let currentImageFile = null;

function initImageUpload() {
    if (!dropZone || !fileInput) {
        console.error('ドロップゾーンまたはファイル入力が見つかりません');
        return;
    }

    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
}

function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
}
function handleDragLeave() {
    dropZone.classList.remove('dragover');
}
function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageFile(e.dataTransfer.files[0]);
    }
}
function handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
        handleImageFile(e.target.files[0]);
    }
}

function handleImageFile(file) {
    try {
        validateImageFile(file);
        currentImageFile = file;
        readFileAsDataURL(file).then((imageSrc) => {
            openCropEditor(imageSrc);
        }).catch((error) => {
            showEditError(error.message);
        });
    } catch (error) {
        showEditError(error.message);
    }
}

function validateImageFile(file) {
    const MAX_SIZE_MB = 5;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

    if (!file) throw new Error('ファイルが選択されていません');
    if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('JPEG/PNG/GIF形式の画像を選択してください');
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`ファイルサイズは${MAX_SIZE_MB}MB以下にしてください`);
    }
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
        reader.readAsDataURL(file);
    });
}

function openCropEditor(imageSrc) {
    if (!dropZone || !cropContainer || !previewImage) {
        console.error('クロップエディタ関連の要素が見つかりません');
        return;
    }

    dropZone.style.display = 'none';
    const cropEditor = document.querySelector('.crop-editor');
    if (cropEditor) {
        cropEditor.style.display = 'block';
    } else {
        console.error('crop-editor クラスの要素が見つかりません');
    }

    destroyCropper();
    initializeCropper(imageSrc);
}

function initializeCropper(imageSrc) {
    if (!cropContainer) {
        console.error('crop-container が見つかりません');
        return;
    }
    cropContainer.innerHTML = `<img src="${imageSrc}" alt="編集用画像">`;
    const imageElement = cropContainer.querySelector('img');

    if (!imageElement) {
        console.error('クロップ用の画像要素が見つかりません');
        return;
    }

    cropper = new Cropper(imageElement, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 0.8,
        responsive: true,
        preview: '#image-preview',
        guides: false
    });
}

function cancelCrop() {
    if (!dropZone || !cropContainer || !previewImage) {
        console.error('クロップキャンセル関連の要素が見つかりません');
        return;
    }

    dropZone.style.display = 'block';
    const cropEditor = document.querySelector('.crop-editor');
    if (cropEditor) {
        cropEditor.style.display = 'none';
    } else {
        console.error('crop-editor クラスの要素が見つかりません');
    }
    destroyCropper();
    currentImageFile = null;
    previewImage.src = '';
}

function destroyCropper() {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

async function getCroppedBlob() {
    if (!cropper) throw new Error('画像が選択されていません');
    const canvas = cropper.getCroppedCanvas({
        width: 512,
        height: 512,
        fillColor: '#fff',
        imageSmoothingQuality: 'high'
    });

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('クロップした画像の生成に失敗しました'));
            }
        }, 'image/jpeg', 0.95);
    });
}

async function applyCrop() {
    try {
        const blob = await getCroppedBlob();
        const previewUrl = URL.createObjectURL(blob);
        previewImage.src = previewUrl;

        const cropEditor = document.querySelector('.crop-editor');
        if (cropEditor) {
            cropEditor.style.display = 'none';
        }
        if (dropZone) {
            dropZone.style.display = 'block';
        }

        destroyCropper();
    } catch (error) {
        showEditError(error.message);
    }
}

const cropCancelBtn = document.querySelector('.crop-cancel-btn');
const cropConfirmBtn = document.querySelector('.crop-confirm-btn');

if (cropCancelBtn) {
    cropCancelBtn.addEventListener('click', cancelCrop);
} else {
    console.error('crop-cancel-btn が見つかりません');
}

if (cropConfirmBtn) {
    cropConfirmBtn.addEventListener('click', applyCrop);
} else {
    console.error('crop-confirm-btn が見つかりません');
}

/************************************************
 * 18. プロフィール更新（フォーム送信）
 ************************************************/
if (editProfileForm) {
    editProfileForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const newNameInput = editProfileForm['edit-username'];
        if (!newNameInput) {
            showEditError('edit-username フィールドが見つかりません');
            return;
        }
        const newName = newNameInput.value.trim();

        const uid = auth.currentUser ? auth.currentUser.uid : null;
        if (!uid) {
            showEditError('ユーザーが認証されていません');
            return;
        }
        if (!newName) {
            showEditError('名前を入力してください。');
            return;
        }

        try {
            showLoading();

            let imageUrl = userImage.src;
            if (currentImageFile && cropper) {
                const blob = await getCroppedBlob();
                imageUrl = await uploadCroppedImage(blob, uid);
            }

            await updateUserProfile(uid, newName, imageUrl);

            userNameSpan.textContent = newName;
            userImage.src = imageUrl;

            closeModal();
        } catch (error) {
            showEditError(`更新に失敗しました: ${error.message}`);
            console.error('更新エラー:', error);
        } finally {
            hideLoading();
        }
    });
} else {
    console.error('edit-profile-form が見つかりません');
}

async function uploadCroppedImage(blob, uid) {
    const filename = `profile_${Date.now()}.jpg`;
    const imageReference = storageRef(storage, `users/${uid}/images/${filename}`);
    const snapshot = await uploadBytes(imageReference, blob);
    return await getDownloadURL(snapshot.ref);
}

async function updateUserProfile(uid, name, imageUrl) {
    const updates = {
        UName: name,
        Uimage: imageUrl,
        lastUpdated: serverTimestamp()
    };
    const userReference = dbRef(database, `Username/${uid}`);
    await update(userReference, updates);
}

// 初期化処理（ページ読み込み時に呼び出し）
initImageUpload();

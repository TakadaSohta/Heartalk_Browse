/************************************************
 * 1. Firebase初期化
 ************************************************/
// dotenvを読み込む
require('dotenv').config();

// 環境変数からFirebase設定を取得
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Firebaseの初期化
firebase.initializeApp(firebaseConfig);

// Firebaseサービスの取得
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();       // ストレージ
const messaging = firebase.messaging();   // 通知

/************************************************
 * 2. HTML要素の取得
 ************************************************/
// （A）ユーザー情報セクション関連
const userInfoDiv = document.querySelector('.user-info');
const userNameSpan = document.getElementById('user-name');
const userImage = document.getElementById('user-image');
const userHeartRate = document.getElementById('user-heart-rate');
const signOutBtn = document.getElementById('sign-out');

// （B）プロフィール編集モーダル関連
const editProfileBtn = document.getElementById('edit-profile');
const editProfileModal = document.getElementById('edit-profile-modal');
const closeModalBtn = document.querySelector('.close-button');
const editProfileForm = document.getElementById('edit-profile-form');
const editErrorMessageDiv = document.getElementById('edit-error-message');

// （C）エラーメッセージ表示領域
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
container.prepend(errorMessageDiv);

// （D）フレンド情報セクション
const permittedUsersDiv = document.querySelector('.permitted-users');
const permittedUsersList = document.getElementById('permitted-users-list');

// （E）その他
const loadingScreen = document.getElementById('loading-screen');

/************************************************
 * 3. 多言語対応（言語ファイルの読み込み）
 ************************************************/
let currentLanguage = 'ja'; // デフォルト言語
let languageData = {};

// 言語ファイルを読み込む関数
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

// 言語を適用する関数
function applyLanguage() {
    // 例: ラベルやテキストの更新
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

    // 他の要素も必要に応じて更新
}

// 言語を設定する関数
function setLanguage(lang) {
    currentLanguage = lang;
    loadLanguage(lang);
}

// ページ読み込み時にデフォルト言語をロード
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
    editErrorMessageDiv.textContent = message;
    editErrorMessageDiv.style.display = 'block';
    setTimeout(() => {
        editErrorMessageDiv.textContent = '';
        editErrorMessageDiv.style.display = 'none';
    }, 5000);
}

/************************************************
 * 5. モーダル制御（プロフィール編集）
 ************************************************/
// モーダル表示
function openModal() {
    editProfileModal.style.display = 'block';
    // 現在のユーザー情報をフォームにセット（名称など）
    if (editProfileForm['edit-username']) {
        editProfileForm['edit-username'].value = userNameSpan.textContent;
    } else {
        console.error('edit-username フィールドが見つかりません');
    }
    // editProfileForm['edit-userimage'].value = userImage.src; // 削除
}

// モーダル非表示
function closeModal() {
    editProfileModal.style.display = 'none';
    editErrorMessageDiv.style.display = 'none';
    // 画像編集関連をリセット
    cancelCrop();
}

// イベントリスナーの追加（存在確認を含む）
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
    if (event.target == editProfileModal) {
        closeModal();
    }
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && editProfileModal.style.display === 'block') {
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
 * 7. ユーザー認証状態の監視
 ************************************************/
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('ユーザーがサインインしています:', user);
        if (userInfoDiv) {
            userInfoDiv.style.display = 'flex';
        }
        if (permittedUsersDiv) {
            permittedUsersDiv.style.display = 'block';
        }

        // ローディング画面を表示
        showLoading();

        // データ読み込み
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
        if (userInfoDiv) {
            userInfoDiv.style.display = 'none';
        }
        if (permittedUsersDiv) {
            permittedUsersDiv.style.display = 'none';
        }
        if (permittedUsersList) {
            permittedUsersList.innerHTML = '';
        }
        window.location.href = 'index.html'; // ログイン画面にリダイレクト
    }
});

/************************************************
 * 8. ユーザーデータの取得・表示
 ************************************************/
function fetchUserData(uid) {
    return new Promise((resolve, reject) => {
        const userRef = database.ref(`Username/${uid}`);
        userRef.once('value')
            .then((snapshot) => {
                const data = snapshot.val();
                if (data) {
                    userNameSpan.textContent = data.UName || "名前未設定";
                    userImage.src = data.Uimage || "https://via.placeholder.com/100";
                } else {
                    userNameSpan.textContent = "名前未設定";
                    userImage.src = "https://via.placeholder.com/100";
                }
                resolve();
            })
            .catch((error) => {
                console.error('ユーザーデータ取得エラー:', error);
                showError('ユーザーデータの取得に失敗しました。');
                reject(error);
            });

        // 最新の心拍数の取得
        const heartRateRef = database.ref(`Userdata/${uid}/Heartbeat/Watch1`);
        heartRateRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && data.HeartRate) {
                userHeartRate.textContent = data.HeartRate;
                // 心拍数履歴に追加（修正済み）
                const historyRef = database.ref(`Userdata/${uid}/HeartbeatHistory`).push();
                historyRef.set({
                    HeartRate: data.HeartRate,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                })
                    .then(() => {
                        console.log('心拍数履歴に追加しました。');
                    })
                    .catch((error) => {
                        console.error('心拍数履歴追加エラー:', error);
                        showError('心拍数履歴の追加に失敗しました。');
                    });
            } else {
                userHeartRate.textContent = "-";
            }

            // QRコード生成
            generateQRCode(uid);

            // 一度だけ読んだらリスナーをオフに
            heartRateRef.off('value');
            resolve();
        }, (error) => {
            console.error('心拍数データ取得エラー:', error);
            showError('心拍数データの取得に失敗しました。');
            reject(error);
        });
    });
}

/************************************************
 * 9. 許可されたユーザー（フレンド）情報の取得・表示
 ************************************************/
function fetchPermittedUsers(uid) {
    return new Promise((resolve, reject) => {
        const permittedUsersRef = database.ref(`AcceptUser/${uid}/permittedUser`);
        permittedUsersRef.once('value')
            .then((snapshot) => {
                const permittedUsers = snapshot.val();
                if (permittedUsersList) {
                    permittedUsersList.innerHTML = ''; // リストをクリア
                } else {
                    console.error('permitted-users-list が見つかりません');
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
        // ユーザー名と画像の取得
        const usernameRef = database.ref(`Username/${permittedUid}`);
        const userdataRef = database.ref(`Userdata/${permittedUid}/Heartbeat/Watch1`);

        Promise.all([
            usernameRef.once('value'),
            userdataRef.once('value')
        ]).then(([usernameSnapshot, userdataSnapshot]) => {
            const usernameData = usernameSnapshot.val();
            const userdata = userdataSnapshot.val();

            const userName = usernameData ? usernameData.UName || "名前未設定" : "名前未設定";
            const userImageUrl = usernameData ? (usernameData.Uimage || "https://via.placeholder.com/90") : "https://via.placeholder.com/90";
            const heartRate = userdata && userdata.HeartRate ? userdata.HeartRate : "-";

            // カード生成
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
 * 10. 心拍数履歴グラフの描画
 ************************************************/
const heartRateChartCtx = document.getElementById('heartRateChart').getContext('2d');
let heartRateChart = null;

function fetchHeartRateHistory(uid) {
    const heartRateHistoryRef = database.ref(`Userdata/${uid}/HeartbeatHistory`);
    heartRateHistoryRef.on('value', (snapshot) => {
        const heartRateData = snapshot.val();
        if (heartRateData) {
            // データを日時順にソート
            const sortedData = Object.entries(heartRateData).sort((a, b) => new Date(a[1].timestamp) - new Date(b[1].timestamp));
            const labels = sortedData.map(entry => new Date(entry[1].timestamp).toLocaleString()); // 修正：timestampを使用
            const data = sortedData.map(entry => entry[1].HeartRate);

            // グラフ更新
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
 * 11. 通知の許可＆FCMトークン
 ************************************************/
function requestNotificationPermission() {
    messaging.requestPermission()
        .then(() => {
            console.log('通知の許可が得られました。');
            return messaging.getToken();
        })
        .then((token) => {
            console.log('FCMトークン:', token);
            // トークンをデータベースに保存
            const uid = auth.currentUser.uid;
            database.ref(`Users/${uid}/fcmToken`).set(token);
        })
        .catch((error) => {
            console.error('通知の許可が拒否されました:', error);
            showError('通知の許可が拒否されました。');
        });
}

// 通知を受信した際の処理
messaging.onMessage((payload) => {
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
 * 12. サインアウト処理
 ************************************************/
if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
        auth.signOut()
            .then(() => {
                console.log('サインアウト成功');
                window.location.href = 'index.html'; // ログイン画面にリダイレクト
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
 * 13. フレンド検索機能（検索ボックス）
 ************************************************/
function filterFriends() {
    const friendSearchInput = document.getElementById('friend-search');
    if (!friendSearchInput) {
        console.error('friend-search 入力フィールドが見つかりません');
        return;
    }
    const input = friendSearchInput.value.toLowerCase();
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

// イベントリスナーの追加（存在確認を含む）
const friendSearchInput = document.getElementById('friend-search');
if (friendSearchInput) {
    friendSearchInput.addEventListener('keyup', filterFriends);
} else {
    console.error('friend-search 入力フィールドが見つかりません');
}

/************************************************
 * 14. QRコード生成
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
 * 15. サイドメニューなどUI周り（例）
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
 * 16. 画像アップロード & クロップ機能の統合
 ************************************************/
// DOM要素（アップロード関連）
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('image-input');
const cropContainer = document.getElementById('crop-container');
const previewImage = document.querySelector('#image-preview img'); // 修正済み

// 画像アップロード関連変数
let cropper = null;
let currentImageFile = null;

/**
 * アップロードの初期化
 */
function initImageUpload() {
    if (!dropZone || !fileInput) {
        console.error('ドロップゾーンまたはファイル入力が見つかりません');
        return;
    }

    // ドラッグ＆ドロップイベント
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    // クリックでファイル選択
    dropZone.addEventListener('click', () => fileInput.click());

    // ファイル選択イベント
    fileInput.addEventListener('change', handleFileSelect);
}

// イベントハンドラ
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

/**
 * 画像ファイルを処理してクロップ画面へ
 */
function handleImageFile(file) {
    try {
        validateImageFile(file);
        currentImageFile = file;

        // FileをDataURLに変換
        readFileAsDataURL(file).then((imageSrc) => {
            openCropEditor(imageSrc);
        }).catch((error) => {
            showEditError(error.message);
        });
    } catch (error) {
        showEditError(error.message);
    }
}

/**
 * 画像ファイルのバリデーション
 */
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

/**
 * FileオブジェクトをDataURL化
 */
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
        reader.readAsDataURL(file);
    });
}

/**
 * クロップエディタを起動
 */
function openCropEditor(imageSrc) {
    if (!dropZone || !cropContainer || !previewImage) {
        console.error('クロップエディタ関連の要素が見つかりません');
        return;
    }

    dropZone.style.display = 'none';                   // ドロップゾーンを隠す
    document.querySelector('.crop-editor').style.display = 'block'; // クロップ画面を表示

    destroyCropper();  // 既存Cropperの破棄
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
        preview: '#image-preview', // プレビューを設定
        guides: false
    });
}

/**
 * クロップをキャンセル
 */
function cancelCrop() {
    if (!dropZone || !cropContainer || !previewImage) {
        console.error('クロップキャンセル関連の要素が見つかりません');
        return;
    }

    dropZone.style.display = 'block';
    document.querySelector('.crop-editor').style.display = 'none';
    destroyCropper();
    currentImageFile = null;
    previewImage.src = '';
}

/**
 * Cropperインスタンスを破棄
 */
function destroyCropper() {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

/**
 * トリミングしてBlobを得る
 */
async function getCroppedBlob() {
    if (!cropper) throw new Error('画像が選択されていません');

    // 例として512x512で出力
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

/**
 * クロップを適用してプレビューを更新（必要なら）
 */
async function applyCrop() {
    try {
        const blob = await getCroppedBlob();
        const previewUrl = URL.createObjectURL(blob);
        previewImage.src = previewUrl;

        // クロップエディタを閉じて、再度ドロップゾーンを表示
        document.querySelector('.crop-editor').style.display = 'none';
        if (dropZone) {
            dropZone.style.display = 'block';
        }

        destroyCropper();
    } catch (error) {
        showEditError(error.message);
    }
}

// ボタンのイベントリスナー
const cropCancelBtn = document.querySelector('.crop-cancel-btn');
const cropConfirmBtn = document.querySelector('.crop-confirm-btn');



/************************************************
 * 17. プロフィール更新（フォーム送信）
 ************************************************/
if (editProfileForm) {
    editProfileForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        // 更新するユーザー名
        const newNameInput = editProfileForm['edit-username'];
        if (!newNameInput) {
            showEditError('edit-username フィールドが見つかりません');
            console.error('edit-username フィールドが見つかりません');
            return;
        }
        const newName = newNameInput.value.trim();

        // 現在認証中のユーザー
        const uid = auth.currentUser ? auth.currentUser.uid : null;

        if (!uid) {
            showEditError('ユーザーが認証されていません');
            console.error('ユーザーが認証されていません');
            return;
        }
        if (!newName) {
            showEditError('名前を入力してください。');
            console.error('名前が入力されていません');
            return;
        }

        try {
            showLoading();
            console.log('ローディング画面を表示');

            // デフォルトは既存のimageURL（現在のプロフィール画像）
            let imageUrl = userImage.src;
            console.log('既存の画像URL:', imageUrl);

            // 新しいファイルが選択されている場合はアップロード
            if (currentImageFile && cropper) {
                console.log('新しい画像ファイルが選択されています');
                // Cropped画像をBlobで取得
                const blob = await getCroppedBlob();
                console.log('Cropped Blob を取得:', blob);
                // Storageにアップロード
                imageUrl = await uploadCroppedImage(blob, uid);
                console.log('アップロード後の画像URL:', imageUrl);
            }

            // DB更新
            await updateUserProfile(uid, newName, imageUrl);
            console.log('Firebase Realtime Database を更新');

            // UI更新
            userNameSpan.textContent = newName;
            userImage.src = imageUrl;
            console.log('UIを更新');

            // モーダルを閉じる
            closeModal();
            console.log('モーダルを閉じる');

        } catch (error) {
            showEditError(`更新に失敗しました: ${error.message}`);
            console.error('更新エラー:', error);
        } finally {
            hideLoading();
            console.log('ローディング画面を非表示');
        }
    });
} else {
    console.error('edit-profile-form が見つかりません');
}

/**
 * クロップした画像をStorageにアップロードしてURLを返す
 */
async function uploadCroppedImage(blob, uid) {
    const filename = `profile_${Date.now()}.jpg`;
    const storageRef = storage.ref(`users/${uid}/images/${filename}`);
    const snapshot = await storageRef.put(blob);
    return await snapshot.ref.getDownloadURL();
}

/**
 * ユーザー情報をRealtime Databaseに更新
 */
async function updateUserProfile(uid, name, imageUrl) {
    const updates = {
        UName: name,
        Uimage: imageUrl,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP
    };
    await database.ref(`Username/${uid}`).update(updates);
}

/************************************************
 * 18. 初期化処理
 ************************************************/
document.addEventListener('DOMContentLoaded', () => {
    initImageUpload();
});

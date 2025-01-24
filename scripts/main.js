/************************************************
 * 1. Firebase初期化
 ************************************************/
// Firebaseの設定
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

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
const messaging = getMessaging(app);

/************************************************
 * 2. HTML要素の取得
 ************************************************/
// ユーザー情報セクション関連
const userInfoDiv = document.querySelector('.user-info');
const userNameSpan = document.getElementById('user-name');
const userImage = document.getElementById('user-image');
const userHeartRate = document.getElementById('user-heart-rate');
const signOutBtn = document.getElementById('sign-out');

// プロフィール編集モーダル関連
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
// モーダル表示
function openModal() {
    if (editProfileModal) {
        editProfileModal.style.display = 'block';
        // 現在のユーザー情報をフォームにセット
        if (editProfileForm['edit-username']) {
            editProfileForm['edit-username'].value = userNameSpan.textContent;
        } else {
            console.error('edit-username フィールドが見つかりません');
        }
    } else {
        console.error('edit-profile-modal が見つかりません');
    }
}

// モーダル非表示
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
 * 7. リスナー管理用の変数
 ************************************************/
// ▼ 自分の心拍監視リスナー
let heartRateListener = null;

// ▼ フレンド全員の心拍数監視リスナーを管理するオブジェクト
//   key: friendUid, value: リスナーの関数オブジェクト
let friendHeartRateListeners = {};

// ▼ フレンドの心拍数表示用DOM要素を保持するオブジェクト
//   key: friendUid, value: heartRateの表示先(HTML要素)
let friendHeartRateElements = {};

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

        // ローディング画面を表示
        showLoading();

        // データ読み込み
        Promise.all([
            fetchUserData(user.uid),       // 自分の基本情報・監視スタート
            fetchPermittedUsers(user.uid)  // フレンド一覧を取得して、フレンドの心拍監視もスタート
        ]).then(() => {
            // 心拍数履歴の取得とグラフ描画（自分の）
            fetchHeartRateHistory(user.uid);
            hideLoading();
        }).catch((error) => {
            console.error('データロードエラー:', error);
            showError('データのロードに失敗しました。');
            hideLoading();
        });

    } else {
        console.log('ユーザーがサインアウトしています。');
        // リスナーのクリーンアップ
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
        window.location.href = 'index.html'; // ログイン画面にリダイレクト
    }
});

/************************************************
 * 9. ユーザーデータの取得・表示（＋心拍監視）
 ************************************************/
/**
 * ユーザーデータを取得し、UIに反映した後、自分の心拍数監視を初期化 & QR生成
 */
function fetchUserData(uid) {
    return new Promise((resolve, reject) => {
        const userRef = dbRef(database, `Username/${uid}`);
        get(userRef)
            .then((snapshot) => {
                const data = snapshot.val();
                if (data) {
                    userNameSpan.textContent = data.UName || "名前未設定";
                    userImage.src = data.Uimage || "https://via.placeholder.com/100";
                } else {
                    userNameSpan.textContent = "名前未設定";
                    userImage.src = "https://via.placeholder.com/100";
                }

                // 自分の心拍数監視リスナーを初期化
                initializeHeartRateMonitoring(uid);
                // QRコード生成は一度だけ
                generateQRCode(uid);

                resolve();
            })
            .catch((error) => {
                console.error('ユーザーデータ取得エラー:', error);
                showError('ユーザーデータの取得に失敗しました。');
                reject(error);
            });
    });
}

/**
 * 自分の心拍数監視をセットアップ
 */
function initializeHeartRateMonitoring(uid) {
    // 既存のリスナーがあれば解除
    if (heartRateListener) {
        off(dbRef(database, `Userdata/${uid}/Heartbeat/Watch1`), heartRateListener);
    }

    const heartRateRef = dbRef(database, `Userdata/${uid}/Heartbeat/Watch1`);
    heartRateListener = onValue(heartRateRef, (snapshot) => {
        const data = snapshot.val();
        updateHeartRateDisplay(data?.HeartRate);
        if (data?.HeartRate) {
            addHeartRateHistory(uid, data.HeartRate);
        }
    }, (error) => {
        console.error('心拍数データ取得エラー:', error);
        showError('心拍数データの取得に失敗しました。');
    });
}

/**
 * 画面に最新の心拍数を表示
 */
function updateHeartRateDisplay(rate) {
    userHeartRate.textContent = rate || "-";
}

/**
 * 取得した心拍数を履歴へ保存
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
 * 10. フレンド情報の取得（＋心拍監視）
 ************************************************/
function fetchPermittedUsers(uid) {
    return new Promise((resolve, reject) => {
        const permittedUsersRef = dbRef(database, `AcceptUser/${uid}/permittedUser`);
        get(permittedUsersRef)
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

/**
 * フレンドユーザーを画面上にカードとして表示し、その後リアルタイムの心拍数を監視する
 */
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

            const nameElement = document.createElement('p');
            nameElement.className = 'user-name';
            nameElement.textContent = userName;

            const heartRateElement = document.createElement('p');
            heartRateElement.className = 'heart-rate';
            heartRateElement.textContent = heartRate;

            userInfo.appendChild(nameElement);
            userInfo.appendChild(heartRateElement);

            userCard.appendChild(img);
            userCard.appendChild(userInfo);

            if (permittedUsersList) {
                permittedUsersList.appendChild(userCard);
            }

            // このフレンドの心拍数表示用DOMを保持
            friendHeartRateElements[permittedUid] = heartRateElement;

            // フレンドの心拍数リスナーを開始
            startFriendHeartRateListener(permittedUid, heartRateElement);

            resolve();
        }).catch((error) => {
            console.error('許可されたユーザー情報取得エラー:', error);
            showError('許可されたユーザー情報の取得に失敗しました。');
            reject(error);
        });
    });
}

/************************************************
 * 10-2. フレンド1人の心拍数リアルタイム監視
 ************************************************/
/**
 * 特定フレンドの Watch1 をリアルタイム監視し、HTML表示を更新
 */
function startFriendHeartRateListener(friendUid, heartRateElement) {
    // 既にリスナーが存在する場合はオフにする
    if (friendHeartRateListeners[friendUid]) {
        off(dbRef(database, `Userdata/${friendUid}/Heartbeat/Watch1`), friendHeartRateListeners[friendUid]);
    }

    const friendHeartRateRef = dbRef(database, `Userdata/${friendUid}/Heartbeat/Watch1`);
    friendHeartRateListeners[friendUid] = onValue(friendHeartRateRef, (snapshot) => {
        const data = snapshot.val();
        const rate = data?.HeartRate || "-";
        heartRateElement.textContent = rate;
    }, (error) => {
        console.error(`フレンドUID:${friendUid} 心拍数リスナーエラー:`, error);
    });
}

/************************************************
 * 11. 心拍数履歴グラフの描画（自分の）
 ************************************************/
const heartRateChartCtx = document.getElementById('heartRateChart').getContext('2d');
let heartRateChart = null;

/**
 * 自分の心拍数履歴を取得し、Chart.jsでグラフ表示
 */
// main.jsのfetchHeartRateHistory関数を以下のように修正

function fetchHeartRateHistory(uid) {
    const heartRateHistoryRef = dbRef(database, `Userdata/${uid}/HeartbeatHistory`);
    
    // 既存のリスナーがあれば削除
    if (heartRateChart) {
        heartRateChart.destroy();
    }

    onValue(heartRateHistoryRef, (snapshot) => {
        const heartRateData = snapshot.val();
        if (heartRateData) {
            // データを時系列でソート
            const sortedData = Object.entries(heartRateData)
                .sort((a, b) => a[1].timestamp - b[1].timestamp)
                .slice(-30); // 直近30件のみ表示

            const labels = sortedData.map(entry => 
                new Date(entry[1].timestamp).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                })
            );

            const data = sortedData.map(entry => entry[1].HeartRate);

            // グラフの設定
            const gradient = heartRateChartCtx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(231, 76, 60, 0.8)');
            gradient.addColorStop(1, 'rgba(231, 76, 60, 0.1)');

            const config = {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '心拍数トレンド',
                        data: data,
                        borderColor: '#e74c3c',
                        borderWidth: 2,
                        backgroundColor: gradient,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#fff',
                        tension: 0.4,
                        cubicInterpolationMode: 'monotone'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            top: 20,
                            right: 20,
                            bottom: 20,
                            left: 20
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleFont: {
                                family: "'Montserrat', sans-serif",
                                size: 14
                            },
                            bodyFont: {
                                family: "'Roboto', sans-serif",
                                size: 14
                            },
                            callbacks: {
                                title: () => '',
                                label: (ctx) => `${ctx.raw} bpm`
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#95a5a6',
                                font: {
                                    family: "'Montserrat', sans-serif",
                                    size: 12
                                },
                                maxRotation: 0,
                                autoSkipPadding: 20
                            }
                        },
                        y: {
                            min: 60, // Y軸の最小値を固定
                            max: 120, // Y軸の最大値を固定
                            grid: {
                                color: '#ecf0f1'
                            },
                            ticks: {
                                color: '#95a5a6',
                                font: {
                                    family: "'Roboto', sans-serif",
                                    size: 12
                                },
                                callback: (value) => `${value} bpm`
                            }
                        }
                    },
                    animation: {
                        duration: 500, // アニメーションの長さを短くする
                        easing: 'easeOutQuart'
                    },
                    interaction: {
                        mode: 'nearest',
                        intersect: false
                    }
                }
            };

            // グラフを破棄して再作成
            if (heartRateChart) {
                heartRateChart.destroy();
            }
            heartRateChart = new Chart(heartRateChartCtx, config);
        }
    }, (error) => {
        console.error('心拍数履歴データ取得エラー:', error);
    });
}



/************************************************
 * 12. 通知の許可＆FCMトークン
 ************************************************/
function requestNotificationPermission() {
    getToken(messaging, { vapidKey: 'YOUR_PUBLIC_VAPID_KEY' }) // VAPIDキーを設定
        .then((currentToken) => {
            if (currentToken) {
                console.log('FCMトークン:', currentToken);
                // トークンをデータベースに保存
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

// 通知を受信した際の処理
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

// イベントリスナーの追加（存在確認を含む）
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
 * 17. 画像アップロード & クロップ機能の統合
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
    const cropEditor = document.querySelector('.crop-editor');
    if (cropEditor) {
        cropEditor.style.display = 'block'; // クロップ画面を表示
    } else {
        console.error('crop-editor クラスの要素が見つかりません');
    }

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
 * クロップを適用してプレビューを更新
 */
async function applyCrop() {
    try {
        const blob = await getCroppedBlob();
        const previewUrl = URL.createObjectURL(blob);
        previewImage.src = previewUrl;

        // クロップエディタを閉じて、再度ドロップゾーンを表示
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

// ボタンのイベントリスナー
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

        // 更新するユーザー名
        const newNameInput = editProfileForm['edit-username'];
        if (!newNameInput) {
            showEditError('edit-username フィールドが見つかりません');
            return;
        }
        const newName = newNameInput.value.trim();

        // 現在認証中のユーザー
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

            // デフォルトは既存のimageURL（現在のプロフィール画像）
            let imageUrl = userImage.src;

            // 新しいファイルが選択されている場合はアップロード
            if (currentImageFile && cropper) {
                // Cropped画像をBlobで取得
                const blob = await getCroppedBlob();
                // Storageにアップロード
                imageUrl = await uploadCroppedImage(blob, uid);
            }

            // DB更新
            await updateUserProfile(uid, newName, imageUrl);

            // UI更新
            userNameSpan.textContent = newName;
            userImage.src = imageUrl;

            // モーダルを閉じる
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

/**
 * クロップした画像をStorageにアップロードしてURLを返す
 */
async function uploadCroppedImage(blob, uid) {
    const filename = `profile_${Date.now()}.jpg`;
    const imageReference = storageRef(storage, `users/${uid}/images/${filename}`);
    const snapshot = await uploadBytes(imageReference, blob);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
}

/**
 * ユーザー情報をRealtime Databaseに更新
 */
async function updateUserProfile(uid, name, imageUrl) {
    const updates = {
        UName: name,
        Uimage: imageUrl,
        lastUpdated: serverTimestamp()
    };
    const userReference = dbRef(database, `Username/${uid}`);
    await update(userReference, updates);
}

/************************************************
 * 19. サインアウトやページ遷移時などのクリーンアップ
 ************************************************/
/**
 * サインアウト時など、リスナーをすべてオフにする
 */
function cleanupResources(uid) {
    // 自分の心拍数監視をオフ
    if (heartRateListener) {
        off(dbRef(database, `Userdata/${uid}/Heartbeat/Watch1`), heartRateListener);
        heartRateListener = null;
    }

    // フレンドの心拍数監視をすべてオフ
    for (const friendUid in friendHeartRateListeners) {
        off(dbRef(database, `Userdata/${friendUid}/Heartbeat/Watch1`), friendHeartRateListeners[friendUid]);
    }
    friendHeartRateListeners = {};
    friendHeartRateElements = {};
}

/************************************************
 * 20. ページ読み込み時、画像アップロード関連を初期化
 ************************************************/
initImageUpload();
